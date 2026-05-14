"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { messageFromFailedResponse } from "@/lib/http-error-message";

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
        setError(await messageFromFailedResponse(res));
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
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center gap-8 px-4 py-12">
      <div className="text-center md:text-left">
        <p className="text-sm font-semibold uppercase tracking-wider text-[color:var(--accent-strong)]">
          Wall-ready priorities
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[color:var(--foreground)] md:text-4xl">
          Importance × Ease matrix
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[color:var(--muted)]">
          Spin up a four-quadrant board in seconds. Optional password, share the
          link, double-click to add notes, drag between quadrants.
        </p>
      </div>
      <form
        className="flex flex-col gap-5 rounded-2xl border-2 border-[color:var(--border)] bg-[color:var(--surface)] p-8 shadow-[0_12px_40px_rgba(24,0,72,0.08)]"
        onSubmit={(e) => void onSubmit(e)}
      >
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-semibold text-[color:var(--foreground)]">
            Title (optional)
          </span>
          <input
            className="rounded-xl border-2 border-[color:var(--border)] bg-[color:var(--surface-elevated)] px-3 py-2.5 text-[color:var(--foreground)] outline-none ring-[color:var(--accent-secondary)]/40 focus:ring-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            placeholder="e.g. Q2 priorities"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-semibold text-[color:var(--foreground)]">
            Password (optional)
          </span>
          <input
            type="password"
            className="rounded-xl border-2 border-[color:var(--border)] bg-[color:var(--surface-elevated)] px-3 py-2.5 text-[color:var(--foreground)] outline-none ring-[color:var(--accent-secondary)]/40 focus:ring-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={password ? 4 : 0}
            placeholder="Min 4 characters if set"
          />
        </label>
        {error && (
          <p className="text-sm text-[color:var(--danger)]" role="alert">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="rounded-full bg-[color:var(--accent-strong)] px-4 py-3 text-sm font-semibold text-white shadow-lg hover:opacity-90 disabled:opacity-50"
        >
          Create matrix
        </button>
      </form>
      <p className="text-center text-xs text-[color:var(--muted)]">
        Host on your own infrastructure; see README for DigitalOcean.
      </p>
    </div>
  );
}
