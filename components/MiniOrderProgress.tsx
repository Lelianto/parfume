import type { OrderStatus } from "@/types/database";

const STEPS = [
  { key: "pending_payment", label: "Bayar" },
  { key: "paid", label: "Verifikasi" },
  { key: "confirmed", label: "Konfirmasi" },
  { key: "decanting", label: "Disiapkan" },
  { key: "shipped", label: "Kirim" },
  { key: "completed", label: "Selesai" },
] as const;


export function MiniOrderProgress({ status }: { status: OrderStatus }) {
  if (status === "cancelled" || status === "rejected") return null;

  const effectiveIdx = STEPS.findIndex((s) => s.key === status);

  return (
    <div className="flex items-center gap-0.5">
      {STEPS.map((step, i) => {
        const isDone = i < effectiveIdx;
        const isCurrent = status === step.key;

        return (
          <div key={step.key} className="flex items-center">
            <div
              className={`h-1.5 w-1.5 rounded-full transition-all ${
                isDone
                  ? "bg-emerald-400"
                  : isCurrent
                  ? "h-2 w-2 bg-gold-400"
                  : "bg-gold-900/30"
              }`}
            />
            {i < STEPS.length - 1 && (
              <div
                className={`mx-0.5 h-px w-3 sm:w-4 ${
                  isDone ? "bg-emerald-400/40" : "bg-gold-900/20"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
