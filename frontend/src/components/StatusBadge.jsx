const styles = {
  unpaid:  { dot: '#ef4444', bg: '#fef2f2', text: '#b91c1c', label: 'Unpaid'  },
  partial: { dot: '#f59e0b', bg: '#fffbeb', text: '#b45309', label: 'Partial' },
  paid:    { dot: '#10b981', bg: '#ecfdf5', text: '#065f46', label: 'Paid'    },
};

export default function StatusBadge({ status }) {
  const s = styles[status] ?? { dot: '#94a3b8', bg: '#f8fafc', text: '#475569', label: status };
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ background: s.bg, color: s.text }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ background: s.dot }}
      />
      {s.label}
    </span>
  );
}
