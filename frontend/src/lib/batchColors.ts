// ── 5 slot colors per batch (slot 1–5, reusable across batches) ──────────────
// Each denomination/slot within a batch gets a distinct color.
// Colors repeat across batches (Batch 1 slot 1 = same color as Batch 2 slot 1).

export const SLOT_COLORS = [
  { bg: "bg-blue-100",   text: "text-blue-700",   border: "border-blue-300",   card: "bg-blue-50 border-blue-200",   header: "bg-blue-600 text-white"   },
  { bg: "bg-emerald-100",text: "text-emerald-700", border: "border-emerald-300",card: "bg-emerald-50 border-emerald-200", header: "bg-emerald-600 text-white" },
  { bg: "bg-violet-100", text: "text-violet-700",  border: "border-violet-300", card: "bg-violet-50 border-violet-200",  header: "bg-violet-600 text-white"  },
  { bg: "bg-amber-100",  text: "text-amber-700",   border: "border-amber-300",  card: "bg-amber-50 border-amber-200",   header: "bg-amber-600 text-white"   },
  { bg: "bg-rose-100",   text: "text-rose-700",    border: "border-rose-300",   card: "bg-rose-50 border-rose-200",     header: "bg-rose-600 text-white"    },
] as const;

// Given a batch number and the position of a transaction within that batch (0-indexed),
// returns the slot color for that position.
export const slotColor = (slotIndex: number) => SLOT_COLORS[slotIndex % 5];

// For batch cards/badges — color is based on batch number cycling through 5 slots
export const batchColor = (batchNumber: number) => {
  const s = SLOT_COLORS[(batchNumber - 1) % 5];
  return `${s.bg} ${s.text} ${s.border}`;
};

// For inline badge use (compact)
export const batchBadge = (batchNumber: number) => {
  const s = SLOT_COLORS[(batchNumber - 1) % 5];
  return `${s.bg} ${s.text}`;
};

// ── Account colors ────────────────────────────────────────────────────────────
export const ACCOUNT_COLORS: Record<string, { bg: string; text: string; border: string; header: string; dot: string }> = {
  Babilyn: {
    bg:     "bg-sky-50",
    text:   "text-sky-800",
    border: "border-sky-300",
    header: "bg-sky-700 text-white",
    dot:    "bg-sky-500",
  },
  Kristine: {
    bg:     "bg-fuchsia-50",
    text:   "text-fuchsia-800",
    border: "border-fuchsia-300",
    header: "bg-fuchsia-700 text-white",
    dot:    "bg-fuchsia-500",
  },
  Nixie: {
    bg:     "bg-teal-50",
    text:   "text-teal-800",
    border: "border-teal-300",
    header: "bg-teal-700 text-white",
    dot:    "bg-teal-500",
  },
};

export const accountColor = (account: string | null) =>
  ACCOUNT_COLORS[account ?? ""] ?? {
    bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200",
    header: "bg-slate-700 text-white", dot: "bg-slate-400",
  };
