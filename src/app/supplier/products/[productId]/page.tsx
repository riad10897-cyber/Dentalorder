import { notFound, redirect } from "next/navigation";
import { getVerifiedUserId } from "@/lib/supabase/auth";
import { getOwnProduct } from "@/lib/products/data";
import { productIdSchema } from "@/lib/validation/products";
import { PushedHeader } from "@/app/_components/settings/menu";
import { SupplierBottomNav } from "../../_components/bottom-nav";
import { ProductForm } from "../product-form";

export default async function EditProductPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  if (!productIdSchema.safeParse(productId).success) notFound();
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/sign-in");
  // RLS returns nothing for another seller's product, so it reads as not found.
  const product = await getOwnProduct(userId, productId);
  if (!product) notFound();

  return (
    <main className="mx-auto min-h-dvh max-w-md pb-28">
      <PushedHeader backHref="/supplier/products" backLabel="Back to products" title="Edit product" />
      <div className="mt-5 px-5">
        <ProductForm product={product} />
      </div>
      <SupplierBottomNav />
    </main>
  );
}
