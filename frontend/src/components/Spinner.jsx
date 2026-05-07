export default function Spinner({ size = 28 }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <svg
        className="animate-spin"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        width={size}
        height={size}
        aria-label="Loading"
      >
        <circle
          className="opacity-20"
          cx="12" cy="12" r="10"
          stroke="#2563eb"
          strokeWidth="3"
        />
        <path
          fill="#2563eb"
          className="opacity-80"
          d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z"
        />
      </svg>
      <span className="text-xs text-blue-400 font-medium tracking-wide">Loading…</span>
    </div>
  );
}
