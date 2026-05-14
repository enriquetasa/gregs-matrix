"use client";

import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  defaultDropAnimationSideEffects,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { Quadrant } from "@prisma/client";
import { CSS } from "@dnd-kit/utilities";
import { toCanvas } from "html-to-image";
import { jsPDF } from "jspdf";
import Link from "next/link";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getMatrixExportImageOptions } from "@/lib/matrix-export-image";
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

const dropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: { opacity: "0.35" },
    },
  }),
};

const quadrantSurface: Record<Quadrant, string> = {
  DO_NOW:
    "bg-[color:var(--quad-do-now-bg)] border-[color:var(--quad-do-now-border)]",
  MAKE_EASY_THEN_DO:
    "bg-[color:var(--quad-make-easy-bg)] border-[color:var(--quad-make-easy-border)]",
  DO_WHEN_PASSING:
    "bg-[color:var(--quad-passing-bg)] border-[color:var(--quad-passing-border)]",
  IGNORE:
    "bg-[color:var(--quad-ignore-bg)] border-[color:var(--quad-ignore-border)]",
};

/** Rows top→bottom: Hard, Easy. Columns left→right: Important, Not important. Q1–Q4 clockwise from top-left. */
const gridQuadrants: Quadrant[][] = [
  ["MAKE_EASY_THEN_DO", "IGNORE"],
  ["DO_NOW", "DO_WHEN_PASSING"],
];

function DragTopicPreview({ text }: { text: string }) {
  return (
    <div className="w-fit max-w-[12rem] cursor-grabbing rounded-lg border-2 border-[color:var(--accent-strong)] bg-[color:var(--surface)] px-2 py-1.5 text-xs font-medium text-[color:var(--foreground)] shadow-xl ring-2 ring-[color:var(--accent-secondary)]/50">
      <p className="leading-snug">{text}</p>
    </div>
  );
}

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
    opacity: isDragging ? 0.35 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      data-topic
      className="group relative w-fit max-w-[11rem] shrink-0 cursor-grab touch-none rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-2 py-1.5 text-xs leading-snug text-[color:var(--foreground)] shadow-sm active:cursor-grabbing md:max-w-[12rem] md:px-2.5 md:py-2 md:text-sm md:shadow-md md:[transform:rotate(0.5deg)]"
    >
      <p className="pr-7 leading-snug">{topic.text}</p>
      {!disabled && (
        <button
          type="button"
          aria-label="Remove topic"
          className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] text-sm font-bold text-[color:var(--foreground)] shadow-sm hover:bg-[color:var(--danger)]/15 hover:text-[color:var(--danger)]"
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
  onQuadrantClick,
}: {
  id: Quadrant;
  label: string;
  disabled: boolean;
  children: ReactNode;
  onQuadrantClick: (q: Quadrant) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      data-quadrant={id}
      className={`relative flex h-full min-h-0 flex-col gap-2 border-2 p-3 transition-shadow ${quadrantSurface[id]} ${
        isOver ? "ring-2 ring-[color:color-mix(in_srgb,var(--coral-soho-lights)_55%,transparent)]" : ""
      }`}
      onClick={(e) => {
        if (disabled) return;
        if ((e.target as HTMLElement).closest("[data-topic]")) return;
        onQuadrantClick(id);
      }}
    >
      <div className="pointer-events-none select-none text-xs font-semibold uppercase tracking-wide text-[color:var(--accent-strong)]">
        {label}
      </div>
      <div className="flex min-h-0 flex-1 flex-wrap content-start gap-2 overflow-y-auto">{children}</div>
    </div>
  );
}

type HistoryFrame = {
  undo: () => Promise<void>;
  redo: () => Promise<void>;
};

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
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [inlineStatus, setInlineStatus] = useState<string | null>(null);
  const undoPastRef = useRef<HistoryFrame[]>([]);
  const undoFutureRef = useRef<HistoryFrame[]>([]);
  const [historyTick, setHistoryTick] = useState(0);

  const bumpHistory = useCallback(() => {
    setHistoryTick((n) => n + 1);
  }, []);

  const pushHistory = useCallback(
    (frame: HistoryFrame) => {
      undoFutureRef.current = [];
      undoPastRef.current = [...undoPastRef.current, frame];
      bumpHistory();
    },
    [bumpHistory],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const activeDragTopic = useMemo(() => {
    if (!activeDragId || state.status !== "ready") return null;
    return state.topics.find((t) => t.id === activeDragId) ?? null;
  }, [activeDragId, state]);

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
    undoPastRef.current = [];
    undoFutureRef.current = [];
    bumpHistory();
  }, [slug, bumpHistory]);

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

  void historyTick;
  const canUndo = undoPastRef.current.length > 0;
  const canRedo = undoFutureRef.current.length > 0;

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2400);
  }, []);

  const runUndo = useCallback(async () => {
    const past = undoPastRef.current;
    const frame = past[past.length - 1];
    if (!frame) return;
    setBusy(true);
    setInlineStatus("Undoing…");
    try {
      await frame.undo();
      await load();
      undoPastRef.current = past.slice(0, -1);
      undoFutureRef.current = [frame, ...undoFutureRef.current];
      bumpHistory();
    } catch {
      showToast("Undo failed.");
    } finally {
      setBusy(false);
      setInlineStatus(null);
    }
  }, [load, showToast, bumpHistory]);

  const runRedo = useCallback(async () => {
    const future = undoFutureRef.current;
    const frame = future[0];
    if (!frame) return;
    setBusy(true);
    setInlineStatus("Redoing…");
    try {
      await frame.redo();
      await load();
      undoFutureRef.current = future.slice(1);
      undoPastRef.current = [...undoPastRef.current, frame];
      bumpHistory();
    } catch {
      showToast("Redo failed.");
    } finally {
      setBusy(false);
      setInlineStatus(null);
    }
  }, [load, showToast, bumpHistory]);

  const onUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setUnlockError(null);
    setInlineStatus("Unlocking…");
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
      setInlineStatus(null);
    }
  };

  const onDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  };

  const onDragCancel = () => {
    setActiveDragId(null);
  };

  const onDragEnd = async (event: DragEndEvent) => {
    try {
      if (state.status !== "ready" || !state.authorized) return;
      const { active, over } = event;
      if (!over) return;
      const topicId = String(active.id);
      const nextQuadrant = over.id as Quadrant;
      const topic = state.topics.find((t) => t.id === topicId);
      if (!topic || topic.quadrant === nextQuadrant) return;
      const prevTopics = state.topics;
      setState((s) => {
        if (s.status !== "ready") return s;
        return {
          ...s,
          topics: s.topics.map((t) =>
            t.id === topicId ? { ...t, quadrant: nextQuadrant } : t,
          ),
        };
      });
      setInlineStatus("Moving note…");
      setBusy(true);
      const res = await fetch(`/api/matrices/${slug}/topics/${topicId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ quadrant: nextQuadrant }),
      });
      if (!res.ok) {
        setState((s) => (s.status === "ready" ? { ...s, topics: prevTopics } : s));
        showToast("Could not move note.");
        return;
      }
      await load();
      const oldQ = topic.quadrant;
      const newQ = nextQuadrant;
      const id = topicId;
      pushHistory({
        undo: async () => {
          await fetch(`/api/matrices/${slug}/topics/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ quadrant: oldQ }),
          });
        },
        redo: async () => {
          await fetch(`/api/matrices/${slug}/topics/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ quadrant: newQ }),
          });
        },
      });
    } finally {
      setBusy(false);
      setInlineStatus(null);
      setActiveDragId(null);
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
    setInlineStatus("Adding note…");
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
      const dto = (await res.json()) as TopicDto;
      setAddOpen(false);
      setAddText("");
      setAddQuadrant(null);
      await load();
      pushHistory({
        undo: async () => {
          await fetch(`/api/matrices/${slug}/topics/${dto.id}`, {
            method: "DELETE",
            credentials: "include",
          });
        },
        redo: async () => {
          await fetch(`/api/matrices/${slug}/topics`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ text: dto.text, quadrant: dto.quadrant }),
          });
        },
      });
    } finally {
      setBusy(false);
      setInlineStatus(null);
    }
  };

  const deleteTopic = async (topicId: string) => {
    if (state.status !== "ready" || !state.authorized) return;
    const snap = state.topics.find((t) => t.id === topicId);
    if (!snap) return;
    let restoredId: string | null = null;
    setInlineStatus("Deleting note…");
    setBusy(true);
    try {
      await fetch(`/api/matrices/${slug}/topics/${topicId}`, {
        method: "DELETE",
        credentials: "include",
      });
      await load();
      pushHistory({
        undo: async () => {
          const r = await fetch(`/api/matrices/${slug}/topics`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ text: snap.text, quadrant: snap.quadrant }),
          });
          if (r.ok) {
            const j = (await r.json()) as TopicDto;
            restoredId = j.id;
          }
        },
        redo: async () => {
          if (!restoredId) return;
          await fetch(`/api/matrices/${slug}/topics/${restoredId}`, {
            method: "DELETE",
            credentials: "include",
          });
        },
      });
    } finally {
      setBusy(false);
      setInlineStatus(null);
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
    setInlineStatus("Generating PNG…");
    setBusy(true);
    try {
      await document.fonts.ready;
      const canvas = await toCanvas(node, getMatrixExportImageOptions());
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
      setInlineStatus(null);
    }
  };

  const exportPdf = async () => {
    const node = document.getElementById("matrix-export-root");
    if (!node) return;
    setInlineStatus("Generating PDF…");
    setBusy(true);
    try {
      await document.fonts.ready;
      const canvas = await toCanvas(node, getMatrixExportImageOptions());
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
      setInlineStatus(null);
    }
  };

  const submitSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state.status !== "ready" || !state.authorized) return;
    setSettingsError(null);
    setInlineStatus("Saving password…");
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
        setInlineStatus(null);
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
      setInlineStatus(null);
    }
  };

  if (state.status === "loading") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-[color:var(--muted)]">
        Loading…
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="mx-auto max-w-md p-8 text-center text-[color:var(--foreground)]">
        <p className="mb-4">{state.message}</p>
        <Link
          className="font-medium text-[color:var(--accent-strong)] underline decoration-2 underline-offset-2 hover:text-[color:var(--accent)]"
          href="/"
        >
          Back home
        </Link>
      </div>
    );
  }

  if (!state.authorized && state.hasPassword) {
    return (
      <div className="mx-auto flex max-w-md flex-col gap-5 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-8 shadow-lg">
        <h1 className="text-xl font-bold text-[color:var(--foreground)]">Enter password</h1>
        <p className="text-sm leading-relaxed text-[color:var(--muted)]">
          This matrix is protected. Ask the owner for the password.
        </p>
        <form className="flex flex-col gap-3" onSubmit={onUnlock}>
          <input
            type="password"
            autoComplete="current-password"
            className="rounded-xl border-2 border-[color:var(--border)] bg-[color:var(--surface-elevated)] px-3 py-2.5 text-[color:var(--foreground)] outline-none ring-[color:var(--accent-secondary)]/40 focus:ring-2"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            placeholder="Password"
          />
          {unlockError && (
            <p className="text-sm text-[color:var(--danger)]" role="alert">
              {unlockError}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="rounded-full bg-[color:var(--accent-strong)] px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:opacity-90 disabled:opacity-50"
          >
            Unlock
          </button>
        </form>
        <Link
          className="text-center text-sm font-medium text-[color:var(--accent-strong)] underline decoration-2 underline-offset-2"
          href="/"
        >
          Create a new matrix
        </Link>
      </div>
    );
  }

  const disabled = !state.authorized || busy;

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-6xl flex-col gap-4 px-4 py-4 md:gap-6 md:px-6 md:py-6">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[color:var(--foreground)] md:text-2xl">
            {state.matrix.title?.trim() || "Importance × Ease"}
          </h1>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            Tap a quadrant to add a note.
          </p>
          {inlineStatus ? (
            <p
              className="mt-2 text-xs font-medium text-[color:var(--accent-strong)]"
              aria-live="polite"
            >
              {inlineStatus}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="rounded-full border-2 border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-2 text-sm font-medium text-[color:var(--foreground)] shadow-sm hover:bg-[color:var(--surface-elevated)] disabled:opacity-40"
            disabled={busy || !canUndo}
            title="Undo last change"
            aria-label="Undo"
            onClick={() => void runUndo()}
          >
            Undo
          </button>
          <button
            type="button"
            className="rounded-full border-2 border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-2 text-sm font-medium text-[color:var(--foreground)] shadow-sm hover:bg-[color:var(--surface-elevated)] disabled:opacity-40"
            disabled={busy || !canRedo}
            title="Redo"
            aria-label="Redo"
            onClick={() => void runRedo()}
          >
            Redo
          </button>
          <button
            type="button"
            className="rounded-full border-2 border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-2 text-sm font-medium text-[color:var(--foreground)] shadow-sm hover:bg-[color:var(--surface-elevated)]"
            onClick={() => void copyShareLink()}
          >
            Copy link
          </button>
          <button
            type="button"
            className="rounded-full border-2 border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-2 text-sm font-medium text-[color:var(--foreground)] shadow-sm hover:bg-[color:var(--surface-elevated)] disabled:opacity-50"
            onClick={() => void exportImage()}
            disabled={busy}
          >
            Export PNG
          </button>
          <button
            type="button"
            className="rounded-full border-2 border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-2 text-sm font-medium text-[color:var(--foreground)] shadow-sm hover:bg-[color:var(--surface-elevated)] disabled:opacity-50"
            onClick={() => void exportPdf()}
            disabled={busy}
          >
            Export PDF
          </button>
          <button
            type="button"
            className="rounded-full border-2 border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-2 text-sm font-medium text-[color:var(--foreground)] shadow-sm hover:bg-[color:var(--surface-elevated)]"
            onClick={() => {
              setSettingsError(null);
              setSettingsOpen(true);
            }}
          >
            Matrix password…
          </button>
          <Link
            className="rounded-full px-4 py-2 text-sm font-medium text-[color:var(--accent-strong)] underline decoration-2 underline-offset-2 hover:text-[color:var(--accent)]"
            href="/"
          >
            New matrix
          </Link>
        </div>
      </header>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-[color:var(--foreground)] px-5 py-2.5 text-sm font-medium text-[color:var(--coral-ice)] shadow-lg">
          {toast}
        </div>
      )}

      <div className="flex min-h-0 w-full flex-1 flex-col">
        <DndContext
          sensors={sensors}
          onDragStart={onDragStart}
          onDragCancel={onDragCancel}
          onDragEnd={(e) => void onDragEnd(e)}
        >
          <div
            id="matrix-export-root"
            className="mx-auto box-border flex min-h-[75dvh] w-[min(100%,max(75dvw,16rem))] max-w-full flex-1 flex-col rounded-2xl border-2 border-[color:var(--border)] bg-[color:var(--surface-elevated)] p-3 shadow-[0_12px_40px_rgba(24,0,72,0.1)] sm:p-5"
          >
            <div className="relative grid h-full min-h-0 w-full min-w-0 flex-1 grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)_minmax(0,1fr)] gap-1 md:gap-2">
            <div />
            <div className="pb-1 text-center text-xs font-semibold text-[color:var(--muted)]">
              Important
            </div>
            <div className="pb-1 text-center text-xs font-semibold text-[color:var(--muted)]">
              Not important
            </div>

            <div className="flex items-center justify-end pr-2 text-xs font-semibold text-[color:var(--muted)] [writing-mode:vertical-rl] rotate-180">
              Hard
            </div>
            <DroppableQuadrant
              id="MAKE_EASY_THEN_DO"
              label={QUADRANT_LABELS.MAKE_EASY_THEN_DO}
              disabled={disabled}
              onQuadrantClick={(q) => {
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
            <DroppableQuadrant
              id="IGNORE"
              label={QUADRANT_LABELS.IGNORE}
              disabled={disabled}
              onQuadrantClick={(q) => {
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

            <div className="flex items-center justify-end pr-2 text-xs font-semibold text-[color:var(--muted)] [writing-mode:vertical-rl] rotate-180">
              Easy
            </div>
            <DroppableQuadrant
              id="DO_NOW"
              label={QUADRANT_LABELS.DO_NOW}
              disabled={disabled}
              onQuadrantClick={(q) => {
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
              id="DO_WHEN_PASSING"
              label={QUADRANT_LABELS.DO_WHEN_PASSING}
              disabled={disabled}
              onQuadrantClick={(q) => {
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

          </div>
        </div>
        <DragOverlay dropAnimation={dropAnimation}>
          {activeDragTopic ? (
            <DragTopicPreview text={activeDragTopic.text} />
          ) : null}
        </DragOverlay>
      </DndContext>
      </div>

      {addOpen && addQuadrant && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-[color:color-mix(in_srgb,var(--coral-siphon)_55%,transparent)] p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal
        >
          <form
            className="w-full max-w-md rounded-2xl border-2 border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-2xl"
            onSubmit={(e) => void submitAdd(e)}
          >
            <h2 className="mb-2 text-lg font-bold text-[color:var(--foreground)]">
              New note — {QUADRANT_LABELS[addQuadrant]}
            </h2>
            <textarea
              className="mb-3 w-full rounded-xl border-2 border-[color:var(--border)] bg-[color:var(--surface-elevated)] px-3 py-2 text-sm text-[color:var(--foreground)] outline-none ring-[color:var(--accent-secondary)]/40 focus:ring-2"
              rows={3}
              maxLength={120}
              value={addText}
              onChange={(e) => setAddText(e.target.value)}
              placeholder="Short sentence…"
              autoFocus
            />
            {addError && (
              <p className="mb-2 text-sm text-[color:var(--danger)]" role="alert">
                {addError}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="rounded-full px-4 py-2 text-sm font-medium text-[color:var(--muted)] hover:bg-[color:var(--surface-elevated)]"
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
                className="rounded-full bg-[color:var(--accent-strong)] px-4 py-2 text-sm font-semibold text-white shadow-md hover:opacity-90 disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </form>
        </div>
      )}

      {settingsOpen && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-[color:color-mix(in_srgb,var(--coral-siphon)_55%,transparent)] p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal
        >
          <form
            className="w-full max-w-md rounded-2xl border-2 border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-2xl"
            onSubmit={(e) => void submitSettings(e)}
          >
            <h2 className="mb-2 text-lg font-bold text-[color:var(--foreground)]">
              Matrix password
            </h2>
            <p className="mb-3 text-sm leading-relaxed text-[color:var(--muted)]">
              {state.hasPassword
                ? "Enter your current password, then a new password (min 4 characters)."
                : "Set a password visitors must enter (min 4 characters)."}
            </p>
            {state.hasPassword && (
              <input
                type="password"
                className="mb-2 w-full rounded-xl border-2 border-[color:var(--border)] bg-[color:var(--surface-elevated)] px-3 py-2 text-sm text-[color:var(--foreground)] outline-none ring-[color:var(--accent-secondary)]/40 focus:ring-2"
                placeholder="Current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            )}
            <input
              type="password"
              className="mb-3 w-full rounded-xl border-2 border-[color:var(--border)] bg-[color:var(--surface-elevated)] px-3 py-2 text-sm text-[color:var(--foreground)] outline-none ring-[color:var(--accent-secondary)]/40 focus:ring-2"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            {settingsError && (
              <p className="mb-2 text-sm text-[color:var(--danger)]" role="alert">
                {settingsError}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="rounded-full px-4 py-2 text-sm font-medium text-[color:var(--muted)] hover:bg-[color:var(--surface-elevated)]"
                onClick={() => setSettingsOpen(false)}
              >
                Close
              </button>
              <button
                type="submit"
                disabled={busy}
                className="rounded-full bg-[color:var(--accent-strong)] px-4 py-2 text-sm font-semibold text-white shadow-md hover:opacity-90 disabled:opacity-50"
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
