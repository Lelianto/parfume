interface ProgressBarProps {
  filled: number;
  total: number;
  size?: "sm" | "md";
}

export function ProgressBar({ filled, total, size = "md" }: ProgressBarProps) {
  const percentage = Math.round((filled / total) * 100);
  const height = size === "sm" ? "h-1.5" : "h-2";

  return (
    <div>
      <div className={`w-full overflow-hidden rounded-full bg-gold-900/30 ${height}`}>
        <div
          className={`${height} rounded-full transition-all duration-500`}
          style={{
            width: `${percentage}%`,
            background:
              percentage === 100
                ? "linear-gradient(90deg, #22c55e, #16a34a)"
                : percentage >= 70
                ? "linear-gradient(90deg, #c9a96e, #e8d5b5)"
                : "linear-gradient(90deg, #a07d3a, #c9a96e)",
          }}
        />
      </div>
      <p className="mt-1.5 text-xs text-gold-200/40">
        {filled} / {total} slot terisi ({percentage}%)
      </p>
    </div>
  );
}
