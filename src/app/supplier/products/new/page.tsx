import { redirect } from "next/navigation";
import { getVerifiedUserId } from "@/lib/supabase/auth";
import { getSupplierContext } from "@/lib/supplier/data";
import { PushedHeader } from "@/app/_components/settings/menu";
import { SupplierBottomNav } from "../../_components/bottom-nav";
import { ProductForm } from "../product-form";

export default async function NewProductPage() {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/sign-in");
  const supplier = await getSupplierContext(userId);
  if (!supplier) redirect("/student");
  // Only an active seller can list products; the database refuses anyone else.
  if (supplier.status !== "active") redirect("/supplier/products");

  return (
    <main className="mx-auto min-h-dvh max-w-md pb-28">
      <PushedHeader backHref="/supplier/products" backLabel="Back to products" title="New product" />
      <div className="mt-5 px-5">
        <ProductForm />
      </div>
      <SupplierBottomNav />
    </main>
  );
}
