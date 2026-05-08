import { notFound } from "next/navigation";
import { getServerCaller } from "@/server/caller";
import { ProductDetailClient } from "./project-detail-client";

interface PageProps {
  params: { slug: string };
}

export default async function ProductDetailPage({ params }: PageProps) {
  // QUIRK: dynamic route params are objects (vinext app router) — no await
  // needed when reading. canonical.md Topic 8.
  const { slug } = params;
  const caller = await getServerCaller();
  const data = await caller.products.getBySlug({ slug }).catch(() => null);
  if (!data || !data.product) {
    notFound();
  }
  return <ProductDetailClient slug={slug} initialData={data} />;
}
