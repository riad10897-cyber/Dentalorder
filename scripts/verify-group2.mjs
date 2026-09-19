// Proves the group-2 audit fixes against the live database.
// Before the migration it must fail; after it, pass.
//
//   node scripts/verify-group2.mjs
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
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SECRET = process.env.SUPABASE_SECRET_KEY;
const admin = createClient(URL_, SECRET, { auth: { persistSession: false } });

const PW = "Group2-Verify-Pw-123!";
const RUN = Date.now();
const ids = [];
const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"} — ${name}${detail ? " — " + detail : ""}`);
};

async function mkUser(tag, metadata) {
  const email = `g2-${tag}-${RUN}@test.dentalorder.dev`;
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
  if (error) throw new Error(error.message);
  return c;
}
const tokenOf = async (c) => (await c.auth.getSession()).data.session.access_token;
async function rest(method, pathAndQuery, token, body) {
  const res = await fetch(`${URL_}/rest/v1/${pathAndQuery}`, {
    method,
    headers: {
      apikey: ANON,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed; try { parsed = JSON.parse(text); } catch { parsed = text; }
  return { status: res.status, body: parsed };
}

try {
  const rep = await mkUser("rep", { role: "rep", full_name: "G2 Rep", university: "BAU", whish_number: "+961 70 999888" });
  const otherRep = await mkUser("rep2", { role: "rep", full_name: "G2 Other Rep", university: "LU", whish_number: "+961 71 111222" });
  const sup = await mkUser("sup", { role: "supplier", full_name: "G2 Sup", business_name: "G2Co", contact_phone: "0" });
  const mine = await mkUser("mine", { role: "student", full_name: "G2 My Student", university: "BAU", year_of_study: 2 });
  const theirs = await mkUser("theirs", { role: "student", full_name: "G2 Other Student", university: "BAU", year_of_study: 2 });
  await admin.from("student_reps").upsert({ student_id: mine.id, rep_id: rep.id });
  await admin.from("student_reps").upsert({ student_id: theirs.id, rep_id: otherRep.id });

  const cMine = await clientFor(mine.email);
  const cTheirs = await clientFor(theirs.email);
  const cRep = await clientFor(rep.email);
  const cSup = await clientFor(sup.email);

  console.log("── A2: the public list gives four columns and nothing else ──");
  {
    // No session at all — the shape sign-up uses.
    const anonRead = await rest("GET", `rep_directory?id=eq.${rep.id}&select=*`, null);
    const row = Array.isArray(anonRead.body) ? anonRead.body[0] : null;
    check(
      "the directory is readable with no session, as sign-up needs",
      anonRead.status === 200 && Boolean(row),
      `HTTP ${anonRead.status}, ${Array.isArray(anonRead.body) ? anonRead.body.length : 0} row(s)`,
    );
    check(
      "the directory exposes exactly id, display_name, university, section",
      row ? JSON.stringify(Object.keys(row).sort()) === JSON.stringify(["display_name", "id", "section", "university"]) : false,
      row ? `columns: ${Object.keys(row).sort().join(", ")}` : "no row",
    );
  }
  for (const [who, c] of [["another rep's student", cTheirs], ["a supplier", cSup]]) {
    const r = await rest("GET", `representatives?id=eq.${rep.id}&select=*`, await tokenOf(c));
    const leaked = Array.isArray(r.body) && r.body.length > 0;
    check(
      `${who} cannot read a rep's row on the base table`,
      !leaked,
      leaked ? `LEAKED whish_number=${r.body[0].whish_number}` : `HTTP ${r.status}, 0 rows`,
    );
  }
  {
    const r = await rest("GET", `representatives?id=eq.${rep.id}&select=*`, await tokenOf(cMine));
    const row = Array.isArray(r.body) ? r.body[0] : null;
    check(
      "a student can still read their OWN rep, prices included",
      Boolean(row) && row.frasaco_price !== undefined,
      row ? `prices ${row.frasaco_price}/${row.copy_a_price}` : "0 rows — getStudentContext would break",
    );
    const own = await rest("GET", `representatives?id=eq.${rep.id}&select=*`, await tokenOf(cRep));
    check(
      "a rep can still read their own row in full",
      Array.isArray(own.body) && own.body.length === 1 && own.body[0].whish_number !== undefined,
    );
  }

  {
    // The view is not security_invoker on purpose, so writes through it
    // would run as its owner and bypass RLS on representatives entirely.
    // Supabase's default privileges hand every new view in this schema
    // INSERT/UPDATE/DELETE to anon before any GRANT runs, so the view has
    // to be revoked, not merely granted SELECT.
    const NOBODY = "00000000-0000-0000-0000-000000000000";
    const patch = await rest("PATCH", `rep_directory?id=eq.${NOBODY}`, null, { display_name: "probe" });
    const del = await rest("DELETE", `rep_directory?id=eq.${NOBODY}`, null);
    check(
      "nobody can write through the rep directory view",
      patch.status === 403 && del.status === 403,
      `PATCH ${patch.status}, DELETE ${del.status} (204 means the privilege is there)`,
    );
    const { data: repsStillThere } = await admin.from("representatives").select("id");
    check("and the reps are all still present", (repsStillThere ?? []).length > 0, `${(repsStillThere ?? []).length} rep(s)`);
  }

  console.log("\n── M2 / D2: line count and duplicates ──");
  {
    const many = Array.from({ length: 65 }, (_, i) => ({
      tooth_number: 11 + (i % 8), tooth_type: i % 2 ? "frasaco" : "copy_a", quantity: 1,
    }));
    const { data, error } = await cMine.rpc("submit_tooth_order", { p_week_number: 3, p_items: many });
    check("an order of more than 64 lines is rejected", !data && Boolean(error), error?.message ?? `ACCEPTED, order ${data}`);
  }
  {
    const { data, error } = await cMine.rpc("submit_tooth_order", {
      p_week_number: 3,
      p_items: [
        { tooth_number: 11, tooth_type: "frasaco", quantity: 10 },
        { tooth_number: 11, tooth_type: "frasaco", quantity: 10 },
      ],
    });
    check("the same tooth and type twice in one order is rejected", !data && Boolean(error), error?.message ?? `ACCEPTED, order ${data}`);
  }
  {
    const { data, error } = await cMine.rpc("submit_tooth_order", {
      p_week_number: 4,
      p_items: [
        { tooth_number: 11, tooth_type: "frasaco", quantity: 2 },
        { tooth_number: 11, tooth_type: "copy_a", quantity: 1 },
      ],
    });
    check("the same tooth in BOTH types is still allowed", Boolean(data), error?.message ?? `order ${data}`);
    if (data) {
      const { data: items } = await admin.from("order_items").select("tooth_type").eq("order_id", data);
      check("and it is stored as two lines", items.length === 2, `${items.length} line(s)`);
    }
  }
  {
    // The index has to hold even against the secret key.
    const { data: anyOrder } = await admin.from("orders").select("id").eq("student_id", mine.id).limit(1).single();
    const { error } = await admin.from("order_items").insert({
      order_id: anyOrder.id, tooth_number: 11, tooth_type: "frasaco", quantity: 1, unit_price: 1, line_total: 1,
    });
    check("a duplicate line cannot be inserted directly either", Boolean(error), error ? "rejected by the index" : "ACCEPTED");
  }

  console.log("\n── D3: orders cannot hold negative money ──");
  for (const [name, row] of [
    ["subtotal", { order_type: "tooth", student_id: mine.id, rep_id: rep.id, week_number: 1, subtotal: -1, total_price: 0 }],
    ["total_price", { order_type: "tooth", student_id: mine.id, rep_id: rep.id, week_number: 1, subtotal: 0, total_price: -1 }],
  ]) {
    const { data, error } = await admin.from("orders").insert(row).select("id").single();
    check(`a negative ${name} is rejected`, Boolean(error), error ? "rejected by the constraint" : "ACCEPTED");
    if (data) await admin.from("orders").delete().eq("id", data.id);
  }

  console.log("\n── A3: a rep may write status and nothing else ──");
  {
    const { data: orderId } = await cMine.rpc("submit_tooth_order", {
      p_week_number: 7, p_items: [{ tooth_number: 21, tooth_type: "frasaco", quantity: 1 }],
    });
    for (const field of ["notes", "delivery_address"]) {
      const r = await rest("PATCH", `orders?id=eq.${orderId}`, await tokenOf(cRep), { [field]: "rep wrote this" });
      const { data: after } = await admin.from("orders").select(field).eq("id", orderId).single();
      check(`a rep cannot write orders.${field}`, after[field] === null, `HTTP ${r.status}, persisted ${JSON.stringify(after[field])}`);
    }
    const ok = await rest("PATCH", `orders?id=eq.${orderId}`, await tokenOf(cRep), { fulfillment_status: "fulfilled" });
    const { data: after } = await admin.from("orders").select("fulfillment_status").eq("id", orderId).single();
    check("a rep can still mark an order fulfilled", after.fulfillment_status === "fulfilled", `HTTP ${ok.status}, ${after.fulfillment_status}`);
    const pay = await rest("PATCH", `orders?id=eq.${orderId}`, await tokenOf(cRep), { payment_status: "paid" });
    const { data: paid } = await admin.from("orders").select("payment_status").eq("id", orderId).single();
    check("a rep can still mark an order paid", paid.payment_status === "paid", `HTTP ${pay.status}, ${paid.payment_status}`);
  }

  console.log("\n── D4: cancelled orders are not spend ──");
  {
    const { data: cancelId } = await cMine.rpc("submit_tooth_order", {
      p_week_number: 9, p_items: [{ tooth_number: 31, tooth_type: "frasaco", quantity: 4 }],
    });
    await admin.from("orders").update({ fulfillment_status: "cancelled" }).eq("id", cancelId);
    const { data: rows } = await admin
      .from("orders").select("total_price, fulfillment_status").eq("student_id", mine.id);
    const all = rows.reduce((s, r) => s + Number(r.total_price), 0);
    const counted = rows.filter((r) => r.fulfillment_status !== "cancelled").reduce((s, r) => s + Number(r.total_price), 0);
    check(
      "a cancelled order is real and is worth excluding",
      all > counted,
      `all orders $${all.toFixed(2)}, excluding cancelled $${counted.toFixed(2)} — the screens now show the second`,
    );
  }
} catch (err) {
  check("UNCAUGHT ERROR", false, err.message);
  console.log(err.stack);
} finally {
  const { data: orders } = await admin.from("orders").select("id").in("student_id", ids);
  for (const o of (orders ?? []).map((r) => r.id)) {
    await admin.from("order_items").delete().eq("order_id", o);
    await admin.from("orders").delete().eq("id", o);
  }
  await admin.from("student_reps").delete().in("student_id", ids);
  for (const id of [...ids].reverse()) await admin.auth.admin.deleteUser(id).catch(() => {});
  console.log("\ntest accounts cleaned up");
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length === 0 ? 0 : 1);
