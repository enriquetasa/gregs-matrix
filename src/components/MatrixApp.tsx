"use client";

import type { DragEndEvent } from "@dnd-kit/core";
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { Quadrant } from "@prisma/client";
import { CSS } from "@dnd-kit/utilities";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import Link from "next/link";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { matrixExportHtml2CanvasOptions } from "@/lib/matrix-export-html2canvas";
import { QUADRANT_LABELS } from "@/lib/quadrants";

type TopicDto = {
  id: string;
  text: string;
  quadrant: Quadrant;
  sortOrder: number;
  updatedAt: string;
};

type MatrixDto = {
  slug: string;
  title: string | null;
  createdAt: string;
};

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      authorized: boolean;
      hasPassword: boolean;
      matrix: MatrixDto;
      topics: TopicDto[];
    };

const quadrantSurface: Record<Quadrant, string> = {
  DO_NOW: "bg-emerald-50/90 border-emerald-100",
  MAKE_EASY_THEN_DO: "bg-amber-50/90 border-amber-100",
  DO_WHEN_PASSING: "bg-slate-50/90 border-slate-200",
  IGNORE: "bg-stone-100/90 border-stone-200",
};

const gridQuadrants: Quadrant[][] = [
  ["DO_NOW", "MAKE_EASY_THEN_DO"],
  ["DO_WHEN_PASSING", "IGNORE"],
];

function DraggableTopic({
  topic,
  disabled,
  onDelete,
}: {
  topic: TopicDto;
  disabled: boolean;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: topic.id,
      disabled,
    });
  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.85 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      data-topic
      className="group relative cursor-grab touch-none rounded-md border border-stone-200/80 bg-[#fffef7] px-3 py-2 text-sm text-stone-800 shadow-sm active:cursor-grabbing"
    >
      <p className="pr-6 leading-snug">{topic.text}</p>
      {!disabled && (
        <button
          type="button"
          aria-label="Remove topic"
          className="absolute right-1 top-1 rounded px-1 text-xs text-stone-400 opacity-0 transition hover:bg-stone-100 hover:text-stone-700 group-hover:opacity-100"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(topic.id);
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}

function DroppableQuadrant({
  id,
  label,
  disabled,
  children,
  onBackgroundDoubleClick,
}: {
  id: Quadrant;
  label: string;
  disabled: boolean;
  children: ReactNode;
  onBackgroundDoubleClick: (q: Quadrant) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      data-quadrant={id}
      className={`relative flex min-h-[140px] flex-col gap-2 border p-3 transition-colors md:min-h-[180px] ${quadrantSurface[id]} ${
        isOver ? "ring-2 ring-stone-400/50" : ""
      }`}
      onDoubleClick={(e) => {
        if (disabled) return;
        if ((e.target as HTMLElement).closest("[data-topic]")) return;
        onBackgroundDoubleClick(id);
      }}
    >
      <div className="pointer-events-none select-none text-xs font-semibold uppercase tracking-wide text-stone-600">
        {label}
      </div>
      <div className="flex flex-1 flex-col gap-2">{children}</div>
    </div>
  );
}

export function MatrixApp({ slug }: { slug: string }) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [passwordInput, setPasswordInput] = useState("");
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addQuadrant, setAddQuadrant] = useState<Quadrant | null>(null);
  const [addText, setAddText] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [settingsError, setSettingsError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/matrices/${slug}`, { credentials: "include" });
      if (res.status === 404) {
        setState({ status: "error", message: "Matrix not found." });
        return;
      }
      if (!res.ok) {
        setState({ status: "error", message: "Could not load matrix." });
        return;
      }
      const data: unknown = await res.json();
      if (
        typeof data !== "object" ||
        data === null ||
        !("matrix" in data) ||
        !("authorized" in data) ||
        !("hasPassword" in data) ||
        !("topics" in data)
      ) {
        setState({ status: "error", message: "Unexpected response." });
        return;
      }
      const payload = data as {
        authorized: boolean;
        hasPassword: boolean;
        matrix: MatrixDto;
        topics: TopicDto[];
      };
      setState({
        status: "ready",
        authorized: payload.authorized,
        hasPassword: payload.hasPassword,
        matrix: payload.matrix,
        topics: payload.topics,
      });
    } catch {
      setState({ status: "error", message: "Network error." });
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (state.status !== "ready" || !state.authorized) return;
    const id = window.setInterval(() => void load(), 15_000);
    return () => window.clearInterval(id);
  }, [load, state]);

  const topicsByQuadrant = useMemo(() => {
    if (state.status !== "ready") return new Map<Quadrant, TopicDto[]>();
    const map = new Map<Quadrant, TopicDto[]>();
    for (const q of gridQuadrants.flat()) map.set(q, []);
    for (const t of state.topics) {
      const list = map.get(t.quadrant) ?? [];
      list.push(t);
      map.set(t.quadrant, list);
    }
    return map;
  }, [state]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2400);
  }, []);

  const onUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setUnlockError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/matrices/${slug}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password: passwordInput }),
      });
      if (!res.ok) {
        const body: unknown = await res.json().catch(() => ({}));
        const msg =
          typeof body === "object" &&
          body !== null &&
          "error" in body &&
          typeof (body as { error?: unknown }).error === "string"
            ? (body as { error: string }).error
            : "Unlock failed.";
        setUnlockError(msg);
        return;
      }
      setPasswordInput("");
      await load();
    } finally {
      setBusy(false);
    }
  };

  const onDragEnd = async (event: DragEndEvent) => {
    if (state.status !== "ready" || !state.authorized) return;
    const { active, over } = event;
    if (!over) return;
    const topicId = String(active.id);
    const nextQuadrant = over.id as Quadrant;
    const topic = state.topics.find((t) => t.id === topicId);
    if (!topic || topic.quadrant === nextQuadrant) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/matrices/${slug}/topics/${topicId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ quadrant: nextQuadrant }),
      });
      if (!res.ok) return;
      await load();
    } finally {
      setBusy(false);
    }
  };

  const submitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addQuadrant) return;
    setAddError(null);
    const text = addText.trim();
    if (text.length < 1 || text.length > 120) {
      setAddError("Use 1–120 characters.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/matrices/${slug}/topics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text, quadrant: addQuadrant }),
      });
      if (!res.ok) {
        setAddError("Could not add topic.");
        return;
      }
      setAddOpen(false);
      setAddText("");
      setAddQuadrant(null);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const deleteTopic = async (topicId: string) => {
    if (state.status !== "ready" || !state.authorized) return;
    setBusy(true);
    try {
      await fetch(`/api/matrices/${slug}/topics/${topicId}`, {
        method: "DELETE",
        credentials: "include",
      });
      await load();
    } finally {
      setBusy(false);
    }
  };

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast("Link copied");
    } catch {
      showToast("Copy failed");
    }
  };

  const exportImage = async () => {
    const node = document.getElementById("matrix-export-root");
    if (!node) return;
    setBusy(true);
    try {
      const canvas = await html2canvas(node, matrixExportHtml2CanvasOptions);
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `matrix-${slug}.png`;
      a.rel = "noopener";
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      a.remove();
      showToast("Image downloaded");
    } catch (err) {
      console.error("Image export failed", err);
      showToast("Image export failed");
    } finally {
      setBusy(false);
    }
  };

  const exportPdf = async () => {
    const node = document.getElementById("matrix-export-root");
    if (!node) return;
    setBusy(true);
    try {
      const canvas = await html2canvas(node, matrixExportHtml2CanvasOptions);
      const img = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 36;
      const maxW = pageW - margin * 2;
      const maxH = pageH - margin * 2;
      const ratio = Math.min(maxW / canvas.width, maxH / canvas.height);
      const w = canvas.width * ratio;
      const h = canvas.height * ratio;
      const x = (pageW - w) / 2;
      const y = (pageH - h) / 2;
      pdf.addImage(img, "PNG", x, y, w, h);
      pdf.save(`matrix-${slug}.pdf`);
      showToast("PDF downloaded");
    } catch (err) {
      console.error("PDF export failed", err);
      showToast("PDF export failed");
    } finally {
      setBusy(false);
    }
  };

  const submitSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state.status !== "ready" || !state.authorized) return;
    setSettingsError(null);
    setBusy(true);
    try {
      const body: Record<string, unknown> = {};
      if (newPassword) {
        body.password = newPassword;
        if (state.hasPassword) body.currentPassword = currentPassword;
      }
      if (Object.keys(body).length === 0) {
        setSettingsError("Enter a new password or cancel.");
        setBusy(false);
        return;
      }
      const res = await fetch(`/api/matrices/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err: unknown = await res.json().catch(() => ({}));
        const msg =
          typeof err === "object" &&
          err !== null &&
          "error" in err &&
          typeof (err as { error?: unknown }).error === "string"
            ? (err as { error: string }).error
            : "Update failed.";
        setSettingsError(msg);
        return;
      }
      setSettingsOpen(false);
      setNewPassword("");
      setCurrentPassword("");
      await load();
      showToast("Password updated");
    } finally {
      setBusy(false);
    }
  };

  if (state.status === "loading") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-stone-600">
        Loading…
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="mx-auto max-w-md p-8 text-center text-stone-700">
        <p className="mb-4">{state.message}</p>
        <Link className="text-emerald-700 underline" href="/">
          Back home
        </Link>
      </div>
    );
  }

  if (!state.authorized && state.hasPassword) {
    return (
      <div className="mx-auto flex max-w-md flex-col gap-4 p-8">
        <h1 className="text-xl font-semibold text-stone-900">Enter password</h1>
        <p className="text-sm text-stone-600">
          This matrix is protected. Ask the owner for the password.
        </p>
        <form className="flex flex-col gap-3" onSubmit={onUnlock}>
          <input
            type="password"
            autoComplete="current-password"
            className="rounded-md border border-stone-300 px-3 py-2 text-stone-900"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            placeholder="Password"
          />
          {unlockError && (
            <p className="text-sm text-red-700" role="alert">
              {unlockError}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Unlock
          </button>
        </form>
        <Link className="text-sm text-emerald-800 underline" href="/">
          Create a new matrix
        </Link>
      </div>
    );
  }

  const disabled = !state.authorized || busy;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 md:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-stone-900 md:text-xl">
            {state.matrix.title?.trim() || "Ease × Importance"}
          </h1>
          <p className="text-xs text-stone-500">Double-click a quadrant to add a note.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-800 hover:bg-stone-50"
            onClick={() => void copyShareLink()}
          >
            Copy link
          </button>
          <button
            type="button"
            className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-800 hover:bg-stone-50"
            onClick={() => void exportImage()}
            disabled={busy}
          >
            Export PNG
          </button>
          <button
            type="button"
            className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-800 hover:bg-stone-50"
            onClick={() => void exportPdf()}
            disabled={busy}
          >
            Export PDF
          </button>
          <button
            type="button"
            className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-800 hover:bg-stone-50"
            onClick={() => {
              setSettingsError(null);
              setSettingsOpen(true);
            }}
          >
            Matrix password…
          </button>
          <Link
            className="rounded-md px-3 py-1.5 text-sm text-stone-600 underline"
            href="/"
          >
            New matrix
          </Link>
        </div>
      </header>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-md bg-stone-900 px-4 py-2 text-sm text-white shadow">
          {toast}
        </div>
      )}

      <DndContext sensors={sensors} onDragEnd={(e) => void onDragEnd(e)}>
        <div
          id="matrix-export-root"
          className="rounded-lg border border-stone-200 bg-stone-50/80 p-4 shadow-sm"
        >
          <div className="relative grid grid-cols-[auto_1fr_1fr] grid-rows-[auto_1fr_1fr_auto] gap-1 md:gap-2">
            <div />
            <div className="pb-1 text-center text-xs font-medium text-stone-500">
              Easy
            </div>
            <div className="pb-1 text-center text-xs font-medium text-stone-500">
              Hard
            </div>

            <div className="flex items-center justify-end pr-2 text-xs font-medium text-stone-500 [writing-mode:vertical-rl] rotate-180">
              Important
            </div>
            <DroppableQuadrant
              id="DO_NOW"
              label={QUADRANT_LABELS.DO_NOW}
              disabled={disabled}
              onBackgroundDoubleClick={(q) => {
                setAddQuadrant(q);
                setAddText("");
                setAddError(null);
                setAddOpen(true);
              }}
            >
              {(topicsByQuadrant.get("DO_NOW") ?? []).map((t) => (
                <DraggableTopic
                  key={t.id}
                  topic={t}
                  disabled={disabled}
                  onDelete={(id) => void deleteTopic(id)}
                />
              ))}
            </DroppableQuadrant>
            <DroppableQuadrant
              id="MAKE_EASY_THEN_DO"
              label={QUADRANT_LABELS.MAKE_EASY_THEN_DO}
              disabled={disabled}
              onBackgroundDoubleClick={(q) => {
                setAddQuadrant(q);
                setAddText("");
                setAddError(null);
                setAddOpen(true);
              }}
            >
              {(topicsByQuadrant.get("MAKE_EASY_THEN_DO") ?? []).map((t) => (
                <DraggableTopic
                  key={t.id}
                  topic={t}
                  disabled={disabled}
                  onDelete={(id) => void deleteTopic(id)}
                />
              ))}
            </DroppableQuadrant>

            <div className="flex items-center justify-end pr-2 text-xs font-medium text-stone-500 [writing-mode:vertical-rl] rotate-180">
              Not important
            </div>
            <DroppableQuadrant
              id="DO_WHEN_PASSING"
              label={QUADRANT_LABELS.DO_WHEN_PASSING}
              disabled={disabled}
              onBackgroundDoubleClick={(q) => {
                setAddQuadrant(q);
                setAddText("");
                setAddError(null);
                setAddOpen(true);
              }}
            >
              {(topicsByQuadrant.get("DO_WHEN_PASSING") ?? []).map((t) => (
                <DraggableTopic
                  key={t.id}
                  topic={t}
                  disabled={disabled}
                  onDelete={(id) => void deleteTopic(id)}
                />
              ))}
            </DroppableQuadrant>
            <DroppableQuadrant
              id="IGNORE"
              label={QUADRANT_LABELS.IGNORE}
              disabled={disabled}
              onBackgroundDoubleClick={(q) => {
                setAddQuadrant(q);
                setAddText("");
                setAddError(null);
                setAddOpen(true);
              }}
            >
              {(topicsByQuadrant.get("IGNORE") ?? []).map((t) => (
                <DraggableTopic
                  key={t.id}
                  topic={t}
                  disabled={disabled}
                  onDelete={(id) => void deleteTopic(id)}
                />
              ))}
            </DroppableQuadrant>

            <div />
            <div className="col-span-2 pt-1 text-center text-xs text-stone-500">
              Ease increases left → right · Importance increases bottom → top
            </div>
          </div>
        </div>
      </DndContext>

      {addOpen && addQuadrant && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4"
          role="dialog"
          aria-modal
        >
          <form
            className="w-full max-w-md rounded-lg bg-white p-5 shadow-lg"
            onSubmit={(e) => void submitAdd(e)}
          >
            <h2 className="mb-2 text-base font-semibold text-stone-900">
              New note — {QUADRANT_LABELS[addQuadrant]}
            </h2>
            <textarea
              className="mb-3 w-full rounded-md border border-stone-300 px-3 py-2 text-sm text-stone-900"
              rows={3}
              maxLength={120}
              value={addText}
              onChange={(e) => setAddText(e.target.value)}
              placeholder="Short sentence…"
              autoFocus
            />
            {addError && (
              <p className="mb-2 text-sm text-red-700" role="alert">
                {addError}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="rounded-md px-3 py-1.5 text-sm text-stone-700 hover:bg-stone-100"
                onClick={() => {
                  setAddOpen(false);
                  setAddQuadrant(null);
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="rounded-md bg-stone-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </form>
        </div>
      )}

      {settingsOpen && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4"
          role="dialog"
          aria-modal
        >
          <form
            className="w-full max-w-md rounded-lg bg-white p-5 shadow-lg"
            onSubmit={(e) => void submitSettings(e)}
          >
            <h2 className="mb-2 text-base font-semibold text-stone-900">
              Matrix password
            </h2>
            <p className="mb-3 text-sm text-stone-600">
              {state.hasPassword
                ? "Enter your current password, then a new password (min 4 characters)."
                : "Set a password visitors must enter (min 4 characters)."}
            </p>
            {state.hasPassword && (
              <input
                type="password"
                className="mb-2 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
                placeholder="Current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            )}
            <input
              type="password"
              className="mb-3 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            {settingsError && (
              <p className="mb-2 text-sm text-red-700" role="alert">
                {settingsError}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="rounded-md px-3 py-1.5 text-sm text-stone-700 hover:bg-stone-100"
                onClick={() => setSettingsOpen(false)}
              >
                Close
              </button>
              <button
                type="submit"
                disabled={busy}
                className="rounded-md bg-stone-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
