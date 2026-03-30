const { createClient } = require("@supabase/supabase-js");
const s = createClient(
  "https://kkjiowbnzgcjnxocygsb.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtramlvd2Juemdjam54b2N5Z3NiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3OTE1MDksImV4cCI6MjA5MDM2NzUwOX0.asfu59Yy7LrEAOdD_KnC7r1jKmzx9Wr2pGYBAys44ZI"
);

(async () => {
  console.log("=== 1. Read current TBP024W01 ===");
  const { data: before } = await s.from("products").select("images,description").eq("id", "TBP024W01").single();
  console.log("Before:", JSON.stringify(before));

  console.log("\n=== 2. Update description ===");
  const { data: updated, error: uErr } = await s
    .from("products")
    .update({ description: "测试修改-" + Date.now(), images: ["/images/tbp024w01.jpg"] })
    .eq("id", "TBP024W01")
    .select();
  console.log("Update result:", uErr ? "FAIL: " + uErr.message : "OK");
  console.log("Updated data:", JSON.stringify(updated));

  console.log("\n=== 3. Read back to verify persistence ===");
  const { data: after } = await s.from("products").select("images,description").eq("id", "TBP024W01").single();
  console.log("After:", JSON.stringify(after));
  console.log("Persisted:", after.description.startsWith("测试修改") ? "YES ✓" : "NO ✗");

  console.log("\n=== 4. Revert description ===");
  await s.from("products").update({ description: "凉感化纤枕白色两件装（50×70 cm ×2）" }).eq("id", "TBP024W01");
  console.log("Reverted");

  console.log("\n=== 5. Check orders table group_id column ===");
  const { data: cols, error: cErr } = await s.rpc("", {}).catch(() => null) || {};
  const { data: testOrder, error: oErr } = await s
    .from("orders")
    .insert({ id: "TEST-001", product_id: "TBP024W01", quantity: 1, wechat: "test", customer_name: "test", address: "test", status: "pending", group_id: "TEST-GRP" })
    .select();
  if (oErr) {
    console.log("Order insert FAIL:", oErr.message);
    if (oErr.message.includes("group_id")) {
      console.log(">>> group_id column is MISSING! This is causing the sync issue.");
    }
  } else {
    console.log("Order insert OK:", JSON.stringify(testOrder));
    await s.from("orders").delete().eq("id", "TEST-001");
    console.log("Test order cleaned up");
  }
})();
