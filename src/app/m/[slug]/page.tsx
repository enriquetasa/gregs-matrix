import { notFound } from "next/navigation";
import { Suspense } from "react";
import { MatrixApp } from "@/components/MatrixApp";
import { isValidMatrixSlug } from "@/lib/slug";

export default async function MatrixPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!isValidMatrixSlug(slug)) notFound();
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex min-h-svh max-w-6xl items-center justify-center px-6 text-sm text-[color:var(--muted)]">
          Loading matrix…
        </div>
      }
    >
      <MatrixApp slug={slug} />
    </Suspense>
  );
}
