// Proves the group-1 audit fixes against whatever database the env points
// at. Run it before the migration and it must FAIL; run it after and it
// must pass. A check that cannot fail proves nothing.
//
//   node scripts/verify-group1.mjs
//
// Creates and deletes its own accounts. Never writes to a real one.
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
if (!URL_ || !ANON || !SECRET) {
  console.error("Need NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and SUPABASE_SECRET_KEY.");
  process.exit(1);
}

const admin = createClient(URL_, SECRET, { auth: { persistSession: false } });
const PW = "Group1-Verify-Pw-123!";
const RUN = Date.now();
const ids = [];
const results = [];

function check(name, ok, detail = "") {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"} — ${name}${detail ? " — " + detail : ""}`);
}

// Straight at the Auth endpoint with only the publishable key. This is the
// path the app's Zod union never sees.
async function rawSignup(tag, data) {
  const email = `g1-${tag}-${RUN}@test.dentalorder.dev`;
  const res = await fetch(`${URL_}/auth/v1/signup`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: PW, data }),
  });
  const body = await res.json();
  const id = body.user?.id ?? body.id;
  if (id) ids.push(id);
  return { id, email, status: res.status, body };
}

async function roleOf(id) {
  const { data } = await admin.from("profiles").select("role").eq("id", id).single();
  return data?.role ?? null;
}

async function patchAs(email, table, query, body) {
  const c = createClient(URL_, ANON, { auth: { persistSession: false } });
  const { data: session, error } = await c.auth.signInWithPassword({ email, password: PW });
  if (error) throw new Error(`${email}: ${error.message}`);
  const res = await fetch(`${URL_}/rest/v1/${table}?${query}`, {
    method: "PATCH",
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${session.session.access_token}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.text() };
}

try {
  console.log("── A1: role is not self-assignable ──");

  const asAdmin = await rawSignup("admin", { role: "admin", full_name: "Should Be Student", university: "BAU" });
  check(
    'a direct signup asking for role "admin" becomes a student',
    asAdmin.id ? (await roleOf(asAdmin.id)) === "student" : false,
    asAdmin.id ? `persisted role = ${await roleOf(asAdmin.id)}` : `signup failed: ${JSON.stringify(asAdmin.body).slice(0, 120)}`,
  );

  const asJunk = await rawSignup("junk", { role: "sudo", full_name: "Junk Role", university: "BAU" });
  check(
    "a signup with a role that is not a role at all still succeeds, as a student",
    asJunk.id ? (await roleOf(asJunk.id)) === "student" : false,
    asJunk.id ? `persisted role = ${await roleOf(asJunk.id)}` : `signup rejected outright: ${JSON.stringify(asJunk.body).slice(0, 120)}`,
  );

  const asRep = await rawSignup("rep", { role: "rep", full_name: "Real Rep", university: "BAU" });
  const repRow = asRep.id ? (await admin.from("representatives").select("id").eq("id", asRep.id).maybeSingle()).data : null;
  check(
    "rep sign-up still works and still creates the representatives row",
    (await roleOf(asRep.id)) === "rep" && Boolean(repRow),
    `role=${await roleOf(asRep.id)}, representatives row ${repRow ? "created" : "MISSING"}`,
  );

  const asSupplier = await rawSignup("sup", {
    role: "supplier", full_name: "Real Supplier", business_name: "VerifyCo", contact_phone: "000",
  });
  const supRow = asSupplier.id ? (await admin.from("suppliers").select("id, status").eq("id", asSupplier.id).maybeSingle()).data : null;
  check(
    "supplier sign-up still works, still lands in pending_approval",
    (await roleOf(asSupplier.id)) === "supplier" && supRow?.status === "pending_approval",
    `role=${await roleOf(asSupplier.id)}, status=${supRow?.status}`,
  );

  const asStudent = await rawSignup("stu", { role: "student", full_name: "Real Student", university: "BAU", year_of_study: 3 });
  check("student sign-up still works", (await roleOf(asStudent.id)) === "student");

  // The post-hoc route was already closed; re-checked because this migration
  // rewrites the function that assigns every role.
  if (asStudent.id) {
    const r = await patchAs(asStudent.email, "profiles", `id=eq.${asStudent.id}`, { role: "admin" });
    check(
      "a signed-in student still cannot UPDATE their own role to admin",
      (await roleOf(asStudent.id)) === "student",
      `HTTP ${r.status}, persisted role = ${await roleOf(asStudent.id)}`,
    );
  }

  const { data: liveAdmins } = await admin.from("profiles").select("id").eq("role", "admin");
  check(
    "no admin account exists that this project did not create by hand",
    (liveAdmins ?? []).length === 0,
    `${(liveAdmins ?? []).length} admin account(s) in profiles`,
  );

  console.log("\n── M1: a rep's prices cannot go to zero or below ──");

  if (asRep.id) {
    for (const [label, body] of [
      ["negative", { frasaco_price: -5 }],
      ["zero", { frasaco_price: 0 }],
      ["negative copy_a", { copy_a_price: -0.01 }],
      ["above the ceiling", { frasaco_price: 1000.01 }],
    ]) {
      const before = (await admin.from("representatives").select("frasaco_price, copy_a_price").eq("id", asRep.id).single()).data;
      const r = await patchAs(asRep.email, "representatives", `id=eq.${asRep.id}`, body);
      const after = (await admin.from("representatives").select("frasaco_price, copy_a_price").eq("id", asRep.id).single()).data;
      const unchanged = before.frasaco_price === after.frasaco_price && before.copy_a_price === after.copy_a_price;
      check(
        `a rep cannot PATCH their price ${label}`,
        unchanged,
        `HTTP ${r.status}, persisted ${after.frasaco_price}/${after.copy_a_price}`,
      );
    }

    const ok = await patchAs(asRep.email, "representatives", `id=eq.${asRep.id}`, { frasaco_price: 3.25, copy_a_price: 1.5 });
    const after = (await admin.from("representatives").select("frasaco_price, copy_a_price").eq("id", asRep.id).single()).data;
    check(
      "a rep can still set a sensible price",
      Number(after.frasaco_price) === 3.25 && Number(after.copy_a_price) === 1.5,
      `HTTP ${ok.status}, persisted ${after.frasaco_price}/${after.copy_a_price}`,
    );

    // The constraint has to hold against the secret key too, or it is only
    // a client-side rule wearing a database costume.
    const { error: adminErr } = await admin.from("representatives").update({ frasaco_price: 0 }).eq("id", asRep.id);
    check("even the secret key cannot write a zero price", Boolean(adminErr), adminErr ? "rejected by the constraint" : "ACCEPTED");
  }

  console.log("\n── A4: a status update that changes nothing is a failure ──");
  if (asRep.id && asStudent.id) {
    await admin.from("student_reps").upsert({ student_id: asStudent.id, rep_id: asRep.id });
    const sc = createClient(URL_, ANON, { auth: { persistSession: false } });
    await sc.auth.signInWithPassword({ email: asStudent.email, password: PW });
    const { data: orderId } = await sc.rpc("submit_tooth_order", {
      p_week_number: 2, p_items: [{ tooth_number: 11, tooth_type: "frasaco", quantity: 1 }],
    });

    // This is the shape the server action now relies on: RLS filters the
    // row, PostgREST says 200 with no error, and the returned set is empty.
    const { data: rows, error } = await sc
      .from("orders").update({ fulfillment_status: "fulfilled" }).eq("id", orderId).select("id");
    check(
      "a write RLS filtered returns no error but an empty set, which is what the action now checks",
      !error && (rows ?? []).length === 0,
      `error=${error?.message ?? "none"}, rows=${(rows ?? []).length}`,
    );

    const rc = createClient(URL_, ANON, { auth: { persistSession: false } });
    await rc.auth.signInWithPassword({ email: asRep.email, password: PW });
    const { data: repRows } = await rc
      .from("orders").update({ fulfillment_status: "fulfilled" }).eq("id", orderId).select("id");
    check("the owning rep's update returns the row, so the action reports success", (repRows ?? []).length === 1);
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
