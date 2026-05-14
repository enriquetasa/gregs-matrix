"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function HomePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const body: Record<string, string> = {};
      if (title.trim()) body.title = title.trim();
      if (password) body.password = password;
      const res = await fetch("/api/matrices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setError("Could not create matrix.");
        return;
      }
      const data: unknown = await res.json();
      const slug =
        typeof data === "object" &&
        data !== null &&
        "slug" in data &&
        typeof (data as { slug?: unknown }).slug === "string"
          ? (data as { slug: string }).slug
          : null;
      if (!slug) {
        setError("Invalid response.");
        return;
      }
      router.push(`/m/${slug}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center gap-6 px-4 py-12">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
          Ease × Importance matrix
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-stone-600">
          Create a wall-friendly board with four quadrants. Optional password;
          share the link with your team. Double-click a quadrant to add notes and
          drag them between areas.
        </p>
      </div>
      <form className="flex flex-col gap-4 rounded-lg border border-stone-200 bg-white p-6 shadow-sm" onSubmit={(e) => void onSubmit(e)}>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-stone-800">Title (optional)</span>
          <input
            className="rounded-md border border-stone-300 px-3 py-2 text-stone-900"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            placeholder="e.g. Q2 priorities"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-stone-800">Password (optional)</span>
          <input
            type="password"
            className="rounded-md border border-stone-300 px-3 py-2 text-stone-900"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={password ? 4 : 0}
            placeholder="Min 4 characters if set"
          />
        </label>
        {error && (
          <p className="text-sm text-red-700" role="alert">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-stone-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50"
        >
          Create matrix
        </button>
      </form>
      <p className="text-center text-xs text-stone-500">
        Host on your own infrastructure; see README for DigitalOcean.
      </p>
    </div>
  );
}
