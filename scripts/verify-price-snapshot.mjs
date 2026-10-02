// The rule CLAUDE.md puts above all the others: "A price change must never
// alter a past order's total."
//
// It lives in SQL — submit_tooth_order copies the supplier's price onto every
// line at insert, and a trigger blocks any later edit to the money fields.
// None of that is reachable from a unit test, so until now it was proven
// only by someone running a probe by hand. This runs in CI and fails the
// build if a past order ever moves.
//
//   node scripts/verify-price-snapshot.mjs
//
// Creates and deletes its own accounts. Touches no real ones.
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    if (!line.includes("=") || line.trim().startsWith("#")) continue;
    const i = line.indexOf("=");
    const key = line.slice(0, i).trim();
    if (!process.env[key]) process.env[key] = line.slice(i + 1).trim();
  }
}

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY;
const SECRET = process.env.SUPABASE_SECRET_KEY;
if (!URL_ || !ANON || !SECRET) {
  console.error("Missing Supabase credentials. Need the project URL, the publishable key and the secret key.");
  process.exit(1);
}

const admin = createClient(URL_, SECRET, { auth: { persistSession: false } });
const PW = "Snapshot-Verify-Pw-123!";
const RUN = Date.now();
const ids = [];
const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"} — ${name}${detail ? " — " + detail : ""}`);
};

async function mkUser(tag, metadata) {
  const email = `snapshot-${tag}-${RUN}@test.dentalorder.dev`;
  const { data, error } = await admin.auth.admin.createUser({
    email, password: PW, email_confirm: true, user_metadata: metadata,
  });
  if (error) throw new Error(`${email}: ${error.message}`);
  ids.push(data.user.id);
  return { id: data.user.id, email };
}

async function clientFor(email) {
  const c = createClient(URL_, ANON, { auth: { persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email, password: PW });
  if (error) throw new Error(`${email}: ${error.message}`);
  return c;
}

const money = (v) => Number(v).toFixed(2);

try {
  // Sign-up only ever makes students, so a supplier is a student account
  // plus a suppliers row — exactly how the owner makes one by hand.
  const supplier = await mkUser("supplier", {
    role: "student", full_name: "Snapshot Supplier", university: "BAU",
  });
  {
    const { error } = await admin.from("suppliers").insert({
      id: supplier.id, kind: "student_supplier", display_name: "Snapshot Supplier", university: "BAU",
    });
    if (error) throw new Error(`could not make the test supplier: ${error.message}`);
  }
  const student = await mkUser("student", {
    role: "student", full_name: "Snapshot Student", university: "BAU", year_of_study: 3,
  });
  // A supplier is only orderable once approved, and there is no binding
  // table any more — the student names the supplier on the order itself.
  await admin
    .from("suppliers")
    .update({ frasaco_price: 2.5, copy_a_price: 1.2, status: "active" })
    .eq("id", supplier.id);

  const sc = await clientFor(student.email);
  const supplierClient = await clientFor(supplier.email);

  // 2 x Frasaco @2.50 + 1 x Copy A @1.20 + 3 x Frasaco @2.50 = 13.70.
  // Both types on tooth 11 on purpose: the line that has broken twice.
  const { data: orderId, error: rpcError } = await sc.rpc("submit_tooth_order", {
    p_supplier_id: supplier.id,
    p_week_number: 5,
    p_items: [
      { tooth_number: 11, tooth_type: "frasaco", quantity: 2 },
      { tooth_number: 11, tooth_type: "copy_a", quantity: 1 },
      { tooth_number: 46, tooth_type: "frasaco", quantity: 3 },
    ],
  });
  if (rpcError) throw new Error(`could not place the order: ${rpcError.message}`);

  const readOrder = async () => {
    const { data } = await admin
      .from("orders")
      .select("subtotal, total_price, order_items(tooth_number, tooth_type, quantity, unit_price, line_total)")
      .eq("id", orderId)
      .single();
    return data;
  };

  const before = await readOrder();
  check(
    "the order totals what the supplier's prices said at the time",
    money(before.subtotal) === "13.70" && money(before.total_price) === "13.70",
    `subtotal ${money(before.subtotal)}, total ${money(before.total_price)}`,
  );
  check(
    "both tooth types on the same tooth number survive as separate lines",
    before.order_items.length === 3,
    `${before.order_items.length} line(s)`,
  );

  // The event the rule exists for.
  const { error: priceError } = await supplierClient
    .from("suppliers")
    .update({ frasaco_price: 9.99, copy_a_price: 7.77 })
    .eq("id", supplier.id);
  if (priceError) throw new Error(`the supplier could not change their prices: ${priceError.message}`);
  const { data: repNow } = await admin
    .from("suppliers").select("frasaco_price, copy_a_price").eq("id", supplier.id).single();
  check(
    "the supplier's new prices really did take effect",
    money(repNow.frasaco_price) === "9.99" && money(repNow.copy_a_price) === "7.77",
    `now ${money(repNow.frasaco_price)} / ${money(repNow.copy_a_price)}`,
    // If this ever fails the test below proves nothing, so it is checked first.
  );

  const after = await readOrder();
  check(
    "the past order's total did not move",
    money(after.subtotal) === "13.70" && money(after.total_price) === "13.70",
    `subtotal ${money(after.subtotal)}, total ${money(after.total_price)}`,
  );
  check(
    "every line still carries the price it was bought at",
    after.order_items.every((i) =>
      money(i.unit_price) === (i.tooth_type === "frasaco" ? "2.50" : "1.20"),
    ),
    after.order_items.map((i) => `${i.tooth_number}/${i.tooth_type} @${money(i.unit_price)}`).sort().join(", "),
  );
  check(
    "every line total still matches quantity x the price it was bought at",
    after.order_items.every((i) => money(i.line_total) === money(Number(i.unit_price) * i.quantity)),
  );

  // A new order at the new prices, to show the snapshot is a snapshot and
  // not the prices being frozen everywhere.
  const { data: laterId } = await sc.rpc("submit_tooth_order", {
    p_supplier_id: supplier.id, p_week_number: 6, p_items: [{ tooth_number: 11, tooth_type: "frasaco", quantity: 2 }],
  });
  const { data: later } = await admin.from("orders").select("subtotal").eq("id", laterId).single();
  check(
    "a new order does charge the new price",
    money(later.subtotal) === "19.98",
    `subtotal ${money(later.subtotal)} (2 x 9.99)`,
  );

  // Nothing may rewrite the money on an order after the fact — not the
  // student, not the supplier who owns it, not the secret key.
  const { error: studentEdit } = await sc.from("orders").update({ total_price: 0.01 }).eq("id", orderId);
  const { error: repEdit } = await supplierClient.from("orders").update({ total_price: 0.01 }).eq("id", orderId);
  const { error: adminEdit } = await admin.from("orders").update({ total_price: 0.01 }).eq("id", orderId);
  const final = await readOrder();
  check(
    "no role can rewrite the total on an existing order",
    money(final.total_price) === "13.70",
    `student ${studentEdit ? "blocked" : "no error"}, supplier ${repEdit ? "blocked" : "no error"}, ` +
      `secret key ${adminEdit ? "blocked" : "no error"}; persisted ${money(final.total_price)}`,
  );

  const itemId = final.order_items[0] ? (await admin.from("order_items").select("id").eq("order_id", orderId).limit(1).single()).data.id : null;
  if (itemId) {
    await admin.from("order_items").update({ unit_price: 0.01, line_total: 0.01 }).eq("id", itemId);
    const { data: item } = await admin.from("order_items").select("unit_price").eq("id", itemId).single();
    check(
      "a line's snapshotted unit price cannot be rewritten either",
      money(item.unit_price) !== "0.01",
      `persisted ${money(item.unit_price)}`,
    );
  }

  // ── Extras: products on the weekly order ───────────────────────────────
  // The same rule, for products: the database prices every line, a later
  // price change never moves a past order, and only this seller's
  // switched-on, in-stock products can be ordered from them.
  const catId = async (slug) => {
    const { data, error } = await admin.from("product_categories").select("id").eq("slug", slug).single();
    if (error || !data) throw new Error(`category '${slug}' missing — has the extras migration been applied to this project?`);
    return data.id;
  };
  const sellerB = await mkUser("sellerb", { role: "student", full_name: "Snapshot Seller B" });
  {
    const { error } = await admin.from("suppliers").insert({
      id: sellerB.id, kind: "student_supplier", display_name: "Snapshot Seller B", status: "active",
    });
    if (error) throw new Error(`could not make seller B: ${error.message}`);
  }
  // Seller A lists through RLS, as themselves — the way the app does.
  const listAs = async (client, sellerId, fields) => {
    const { data, error } = await client.from("products")
      .insert({ supplier_id: sellerId, ...fields }).select("id").single();
    if (error) throw new Error(`could not list ${fields.name}: ${error.message}`);
    return data.id;
  };
  const gloves = await listAs(supplierClient, supplier.id, { category_id: await catId("gloves-masks"), name: "Snapshot gloves", unit: "box of 100", price: 6.5 });
  const bur = await listAs(supplierClient, supplier.id, { category_id: await catId("burs"), name: "Snapshot bur", unit: "pack of 5", price: 3.1 });
  const off = await listAs(supplierClient, supplier.id, { category_id: await catId("materials"), name: "Snapshot old composite", price: 9, is_active: false });
  const oos = await listAs(supplierClient, supplier.id, { category_id: await catId("instruments"), name: "Snapshot mirror", price: 4, in_stock: false });
  const sellerBClient = await clientFor(sellerB.email);
  const bLamp = await listAs(sellerBClient, sellerB.id, { category_id: await catId("equipment"), name: "Snapshot B lamp", price: 20 });

  const readLines = async (id) => (await admin.from("orders")
    .select("total_price, order_items(product_id, product_name, product_unit, tooth_number, quantity, unit_price, line_total)")
    .eq("id", id).single()).data;

  // Mixed: 2 Frasaco 11 at today's 9.99 (19.98) + 2 gloves (13.00) + 1 bur (3.10) = 36.08
  const { data: mixedId, error: mixedErr } = await sc.rpc("submit_tooth_order", {
    p_supplier_id: supplier.id, p_week_number: 8,
    p_items: [
      { tooth_number: 11, tooth_type: "frasaco", quantity: 2 },
      { product_id: gloves, quantity: 2 },
      { product_id: bur, quantity: 1 },
    ],
    p_expected_total: 36.08,
  });
  if (mixedErr) throw new Error(`could not place the mixed order: ${mixedErr.message}`);
  const mixed = await readLines(mixedId);
  const glovesLine = mixed.order_items.find((i) => i.product_id === gloves);
  check(
    "a product line total equals quantity × the seller's price at submit",
    money(glovesLine.unit_price) === "6.50" && money(glovesLine.line_total) === "13.00",
    `2 × ${money(glovesLine.unit_price)} = ${money(glovesLine.line_total)}`,
  );
  check(
    "mixed orders (teeth + extras) total correctly",
    money(mixed.total_price) === "36.08" &&
      money(mixed.order_items.reduce((n, i) => n + Number(i.line_total), 0)) === "36.08",
    `total ${money(mixed.total_price)} across ${mixed.order_items.length} lines`,
  );

  // A crafted request: a price, a name and a line total sent with the item.
  const { data: craftedId, error: craftedErr } = await sc.rpc("submit_tooth_order", {
    p_supplier_id: supplier.id, p_week_number: 9,
    p_items: [{ product_id: gloves, quantity: 3, unit_price: 0.01, price: 0.01, line_total: 0.03, product_name: "Free gloves" }],
  });
  if (craftedErr) throw new Error(`crafted order errored instead of being priced: ${craftedErr.message}`);
  const crafted = await readLines(craftedId);
  check(
    "a crafted request with a fake price is ignored — the price comes from the database",
    money(crafted.total_price) === "19.50" &&
      money(crafted.order_items[0].unit_price) === "6.50" &&
      crafted.order_items[0].product_name === "Snapshot gloves",
    `charged ${money(crafted.total_price)} at ${money(crafted.order_items[0].unit_price)}, named "${crafted.order_items[0].product_name}"`,
  );

  // Refusals: assert nothing was written, not just that an error came back.
  const countOrders = async () =>
    (await admin.from("orders").select("*", { count: "exact", head: true }).eq("student_id", student.id)).count;
  const ordersBefore = await countOrders();
  const refusals = [];
  for (const [label, productId] of [["another seller's product", bLamp], ["a switched-off product", off], ["an out-of-stock product", oos]]) {
    const { error } = await sc.rpc("submit_tooth_order", {
      p_supplier_id: supplier.id, p_week_number: 10, p_items: [{ product_id: productId, quantity: 1 }],
    });
    refusals.push(`${label}: ${error ? error.code : "ACCEPTED"}`);
  }
  check(
    "ordering another seller's product, a switched-off product, or an out-of-stock product fails",
    (await countOrders()) === ordersBefore && refusals.every((r) => r.endsWith("DT003")),
    refusals.join("; "),
  );

  // The seller changes the price, the name and the unit.
  await supplierClient.from("products").update({ price: 99, name: "Renamed gloves", unit: "box of 50" }).eq("id", gloves);
  const { data: glovesNow } = await admin.from("products").select("price").eq("id", gloves).single();
  const mixedAfter = await readLines(mixedId);
  const glovesAfter = mixedAfter.order_items.find((i) => i.product_id === gloves);
  check(
    "changing a product's price does not change past orders",
    money(glovesNow.price) === "99.00" &&
      money(mixedAfter.total_price) === "36.08" &&
      money(glovesAfter.unit_price) === "6.50" &&
      glovesAfter.product_name === "Snapshot gloves" &&
      glovesAfter.product_unit === "box of 100",
    `product now ${money(glovesNow.price)}; past order ${money(mixedAfter.total_price)}, line ${money(glovesAfter.unit_price)} "${glovesAfter.product_name}" (${glovesAfter.product_unit})`,
  );

  // Seller B against seller A's products: read the hidden ones, edit any.
  const { data: bSees } = await sellerBClient.from("products").select("id").in("id", [off, oos]);
  await sellerBClient.from("products").update({ price: 0.01 }).eq("id", bur);
  await sellerBClient.from("products").update({ is_active: true }).eq("id", off);
  // The mirror has never been ordered, so nothing but the access rule can
  // stop this delete. (The bur is on an order; the database would refuse
  // deleting it for that reason alone, which would prove nothing here.)
  await sellerBClient.from("products").delete().eq("id", oos);
  const { data: burNow } = await admin.from("products").select("price").eq("id", bur).maybeSingle();
  const { data: offNow } = await admin.from("products").select("is_active").eq("id", off).single();
  const { data: oosNow } = await admin.from("products").select("id").eq("id", oos).maybeSingle();
  check(
    "a seller cannot read or edit another seller's products",
    bSees.length === 0 && burNow && money(burNow.price) === "3.10" && offNow.is_active === false && oosNow !== null,
    `seller B read ${bSees.length} of A's hidden products; A's bur ${burNow ? money(burNow.price) : "DELETED"}; ` +
      `A's switched-off product is_active=${offNow.is_active}; A's never-ordered product ${oosNow ? "still there" : "DELETED"}`,
  );
} catch (err) {
  check("UNCAUGHT ERROR", false, err.message);
  console.log(err.stack);
} finally {
  const { data: orders } = await admin.from("orders").select("id").in("student_id", ids);
  for (const o of (orders ?? []).map((r) => r.id)) {
    await admin.from("order_items").delete().eq("order_id", o);
    await admin.from("orders").delete().eq("id", o);
  }
  // Products before their sellers; sellers before their accounts.
  await admin.from("products").delete().in("supplier_id", ids);
  await admin.from("suppliers").delete().in("id", ids);
  for (const id of [...ids].reverse()) await admin.auth.admin.deleteUser(id).catch(() => {});
  console.log("\ntest accounts cleaned up");
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (failed.length > 0) {
  console.log("\nA past order's total changed, or something that should be immutable was not.");
  console.log("This is the rule the whole pricing design rests on. Do not merge past this.");
}
process.exit(failed.length === 0 ? 0 : 1);
