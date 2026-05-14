import { notFound } from "next/navigation";
import { MatrixApp } from "@/components/MatrixApp";
import { isValidMatrixSlug } from "@/lib/slug";

export default async function MatrixPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!isValidMatrixSlug(slug)) notFound();
  return <MatrixApp slug={slug} />;
}
