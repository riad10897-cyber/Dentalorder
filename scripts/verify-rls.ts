/**
 * RLS verification script.
 *
 * Signs in as each role against a REAL Supabase project and attempts the
 * forbidden reads/writes listed under "Verify the security rules" in
 * CLAUDE.md. Prints PASS/FAIL for every check and exits non-zero if any
 * forbidden operation actually succeeded.
 *
 * Usage:
 *   npm run verify:rls
 *
 * Requires .env.local with NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
 * and SUPABASE_SECRET_KEY. Creates and deletes its own throwaway test
 * users — safe to run against a project that already has real data, but do
 * not point it at production without knowing that.
 */
import { config } from "dotenv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

config({ path: ".env.local" });
import type { Database } from "../src/lib/supabase/types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceKey = process.env.SUPABASE_SECRET_KEY;

if (!url || !anonKey || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or SUPABASE_SECRET_KEY in .env.local",
  );
  process.exit(1);
}

const admin: SupabaseClient<Database> = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

type Result = { name: string; passed: boolean; detail: string };
const results: Result[] = [];

function record(name: string, passed: boolean, detail: string) {
  results.push({ name, passed, detail });
  console.log(`${passed ? "PASS" : "FAIL"}  ${name}\n      ${detail}`);
}

const RUN_ID = Date.now();
const password = "Test-Password-123!";
const createdUserIds: string[] = [];
const createdOrderIds: string[] = [];

async function createUser(
  email: string,
  metadata: Record<string, unknown>,
): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: metadata,
  });
  if (error || !data.user) {
    throw new Error(`could not create test user ${email}: ${error?.message}`);
  }
  createdUserIds.push(data.user.id);
  return data.user.id;
}

async function signInAs(email: string): Promise<SupabaseClient<Database>> {
  const client = createClient<Database>(url!, anonKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`could not sign in as ${email}: ${error.message}`);
  return client;
}

async function cleanup() {
  // Orders/order_items first (orders.student_id, .rep_id and .supplier_id
  // are all ON DELETE RESTRICT, so a leftover order blocks user deletion).
  // Delete by tracked id, and defensively by owning user too, in case a
  // check that was supposed to be denied wasn't (leaking an extra row).
  if (createdOrderIds.length > 0) {
    const { error } = await admin.from("orders").delete().in("id", createdOrderIds);
    if (error) console.error(`cleanup: could not delete test orders: ${error.message}`);
  }
  if (createdUserIds.length > 0) {
    for (const column of ["student_id", "rep_id", "supplier_id"] as const) {
      const { error } = await admin.from("orders").delete().in(column, createdUserIds);
      if (error) console.error(`cleanup: could not delete orders by ${column}: ${error.message}`);
    }
  }
  // Delete users in reverse creation order: students (whose student_reps
  // row is ON DELETE CASCADE) before the reps they point to (student_reps.rep_id
  // is ON DELETE RESTRICT, so a rep can't go while a student still references it).
  for (const id of [...createdUserIds].reverse()) {
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) console.error(`cleanup: could not delete user ${id}: ${error.message}`);
  }
}

async function main() {
  console.log(`\nDentalOrder RLS verification — run ${RUN_ID}\n`);

  // ── Fixtures ──
  const repAEmail = `rls-rep-a-${RUN_ID}@test.dentalorder.dev`;
  const repBEmail = `rls-rep-b-${RUN_ID}@test.dentalorder.dev`;
  const supplierAEmail = `rls-supplier-a-${RUN_ID}@test.dentalorder.dev`;
  const studentAEmail = `rls-student-a-${RUN_ID}@test.dentalorder.dev`;
  const studentBEmail = `rls-student-b-${RUN_ID}@test.dentalorder.dev`;

  const repAId = await createUser(repAEmail, {
    role: "rep",
    full_name: "RLS Rep A",
    university: "BAU",
  });
  await createUser(repBEmail, {
    role: "rep",
    full_name: "RLS Rep B",
    university: "BAU",
  });
  const supplierAId = await createUser(supplierAEmail, {
    role: "supplier",
    full_name: "RLS Supplier A",
    business_name: "RLS Test Supplier",
    contact_phone: "00000000",
  });
  const studentAId = await createUser(studentAEmail, {
    role: "student",
    full_name: "RLS Student A",
    university: "BAU",
    rep_id: repAId,
  });
  await createUser(studentBEmail, {
    role: "student",
    full_name: "RLS Student B",
    university: "BAU",
    rep_id: repAId,
  });

  // Seed a tooth order (student A -> rep A) and a store order (student A -> supplier A)
  // directly with the service-role client, bypassing RLS, so we have real rows to attack.
  const { data: toothOrder, error: toothOrderErr } = await admin
    .from("orders")
    .insert({
      order_type: "tooth",
      student_id: studentAId,
      rep_id: repAId,
      week_number: 1,
      subtotal: "10.00",
      total_price: "10.00",
    })
    .select()
    .single();
  if (toothOrderErr || !toothOrder) {
    throw new Error(`fixture setup failed (tooth order): ${toothOrderErr?.message}`);
  }
  createdOrderIds.push(toothOrder.id);

  const { data: toothItem, error: toothItemErr } = await admin
    .from("order_items")
    .insert({
      order_id: toothOrder.id,
      tooth_number: 11,
      tooth_type: "frasaco",
      quantity: 4,
      unit_price: "2.50",
      line_total: "10.00",
    })
    .select()
    .single();
  if (toothItemErr || !toothItem) {
    throw new Error(`fixture setup failed (order item): ${toothItemErr?.message}`);
  }

  await admin.from("suppliers").update({ status: "active" }).eq("id", supplierAId);

  const { data: storeOrder, error: storeOrderErr } = await admin
    .from("orders")
    .insert({
      order_type: "store",
      student_id: studentAId,
      supplier_id: supplierAId,
      subtotal: "20.00",
      commission_rate: "10.00",
      commission_amount: "2.00",
      total_price: "20.00",
    })
    .select()
    .single();
  if (storeOrderErr || !storeOrder) {
    throw new Error(`fixture setup failed (store order): ${storeOrderErr?.message}`);
  }
  createdOrderIds.push(storeOrder.id);

  // ── Sign in as each role ──
  const repA = await signInAs(repAEmail);
  const repB = await signInAs(repBEmail);
  const supplierA = await signInAs(supplierAEmail);
  const studentA = await signInAs(studentAEmail);
  const studentB = await signInAs(studentBEmail);

  // Sanity check: the rightful owner CAN see their own order.
  {
    const { data } = await repA.from("orders").select("id").eq("id", toothOrder.id);
    record(
      "sanity: rep A can read their own tooth order",
      (data?.length ?? 0) === 1,
      `expected 1 row, got ${data?.length ?? 0}`,
    );
  }
  {
    const { data } = await studentA.from("orders").select("id").eq("id", toothOrder.id);
    record(
      "sanity: student A can read their own tooth order",
      (data?.length ?? 0) === 1,
      `expected 1 row, got ${data?.length ?? 0}`,
    );
  }

  // 1. A rep cannot read another rep's orders through the API.
  {
    const { data } = await repB.from("orders").select("id").eq("id", toothOrder.id);
    record(
      "rep B cannot read rep A's tooth order",
      (data?.length ?? 0) === 0,
      `expected 0 rows, got ${data?.length ?? 0}`,
    );
  }

  // 2. A supplier cannot read tooth orders.
  {
    const { data } = await supplierA.from("orders").select("id").eq("id", toothOrder.id);
    record(
      "supplier A cannot read a tooth order (even though it's on the same student)",
      (data?.length ?? 0) === 0,
      `expected 0 rows, got ${data?.length ?? 0}`,
    );
  }
  {
    const { data } = await supplierA
      .from("order_items")
      .select("id")
      .eq("id", toothItem.id);
    record(
      "supplier A cannot read a tooth order's line items",
      (data?.length ?? 0) === 0,
      `expected 0 rows, got ${data?.length ?? 0}`,
    );
  }

  // 3. A student cannot read another student's orders.
  {
    const { data } = await studentB.from("orders").select("id").eq("id", toothOrder.id);
    record(
      "student B cannot read student A's tooth order",
      (data?.length ?? 0) === 0,
      `expected 0 rows, got ${data?.length ?? 0}`,
    );
  }
  {
    const { data } = await studentB.from("orders").select("id").eq("id", storeOrder.id);
    record(
      "student B cannot read student A's store order",
      (data?.length ?? 0) === 0,
      `expected 0 rows, got ${data?.length ?? 0}`,
    );
  }

  // 4. A crafted request cannot change a price or total on an existing order.
  //
  // Two different denial mechanisms are in play, and a client sees them
  // differently: the protective trigger raises a real Postgres exception
  // (surfaces as `error`), while an RLS policy that simply has no UPDATE
  // grant for these rows just matches zero rows — no error, nothing
  // changes. So the only reliable check is the row's actual state
  // afterwards, read back with the service-role client.
  {
    const { error } = await repA
      .from("orders")
      .update({ total_price: "999.00" })
      .eq("id", toothOrder.id);
    const { data: recheck } = await admin
      .from("orders")
      .select("total_price")
      .eq("id", toothOrder.id)
      .single();
    const blocked = error !== null || recheck?.total_price === toothOrder.total_price;
    record(
      "rep A (order owner) cannot change total_price on an existing tooth order",
      blocked,
      error
        ? `blocked: ${error.message}`
        : `total_price is still ${recheck?.total_price} (unchanged: ${blocked})`,
    );
  }
  {
    const { error } = await admin
      .from("orders")
      .update({ subtotal: "999.00" })
      .eq("id", toothOrder.id);
    const { data: recheck } = await admin
      .from("orders")
      .select("subtotal")
      .eq("id", toothOrder.id)
      .single();
    const blocked = error !== null || recheck?.subtotal === toothOrder.subtotal;
    record(
      "even the service-role client cannot change subtotal on an existing order (trigger, not just RLS)",
      blocked,
      error
        ? `blocked: ${error.message}`
        : `subtotal is still ${recheck?.subtotal} (unchanged: ${blocked})`,
    );
  }
  {
    const { error } = await repA
      .from("order_items")
      .update({ unit_price: "0.01" })
      .eq("id", toothItem.id);
    const { data: recheck } = await admin
      .from("order_items")
      .select("unit_price")
      .eq("id", toothItem.id)
      .single();
    const blocked = error !== null || recheck?.unit_price === toothItem.unit_price;
    record(
      "rep A cannot change unit_price on an existing order item",
      blocked,
      error
        ? `blocked: ${error.message}`
        : `unit_price is still ${recheck?.unit_price} (unchanged: ${blocked})`,
    );
  }

  // Bonus: a supplier still pending approval cannot list products.
  {
    const pendingSupplierEmail = `rls-supplier-pending-${RUN_ID}@test.dentalorder.dev`;
    const pendingSupplierId = await createUser(pendingSupplierEmail, {
      role: "supplier",
      full_name: "RLS Pending Supplier",
      business_name: "Pending Co",
      contact_phone: "00000000",
    });
    const pendingSupplier = await signInAs(pendingSupplierEmail);
    const { error } = await pendingSupplier.from("products").insert({
      supplier_id: pendingSupplierId,
      name: "Test gloves",
      price: "5.00",
    });
    record(
      "a pending_approval supplier cannot list products",
      error !== null,
      error ? `blocked: ${error.message}` : "insert succeeded — NOT blocked",
    );
  }

  // Bonus: a student cannot place an order on another student's behalf.
  {
    const { error } = await studentB.from("orders").insert({
      order_type: "tooth",
      student_id: studentAId,
      rep_id: repAId,
      week_number: 2,
      subtotal: "5.00",
      total_price: "5.00",
    });
    record(
      "student B cannot insert an order with student A as the owner",
      error !== null,
      error ? `blocked: ${error.message}` : "insert succeeded — NOT blocked",
    );
  }

  console.log("\n──────────────────────────────────────────");
  const failed = results.filter((r) => !r.passed);
  console.log(`${results.length - failed.length}/${results.length} checks passed.`);
  if (failed.length > 0) {
    console.log("\nFAILED:");
    for (const f of failed) console.log(`  - ${f.name}`);
  }
  console.log("──────────────────────────────────────────\n");

  await cleanup();
  process.exit(failed.length > 0 ? 1 : 0);
}

main().catch(async (err) => {
  console.error("\nRLS verification script crashed:", err);
  await cleanup();
  process.exit(1);
});
