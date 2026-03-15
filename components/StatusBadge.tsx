import type { SplitStatus, OrderStatus } from "@/types/database";

const splitStatusConfig: Record<SplitStatus, { label: string; className: string }> = {
  open: { label: "Tersedia", className: "bg-emerald-500/15 text-emerald-400 ring-emerald-500/20" },
  full: { label: "Penuh", className: "bg-amber-500/15 text-amber-400 ring-amber-500/20" },
  decanting: { label: "Sedang Disiapkan", className: "bg-sky-500/15 text-sky-400 ring-sky-500/20" },
  shipped: { label: "Dikirim", className: "bg-violet-500/15 text-violet-400 ring-violet-500/20" },
  completed: { label: "Selesai", className: "bg-gold-400/10 text-gold-400 ring-gold-400/20" },
};

const orderStatusConfig: Record<OrderStatus, { label: string; className: string }> = {
  pending_payment: { label: "Menunggu Pembayaran", className: "bg-orange-500/15 text-orange-400 ring-orange-500/20" },
  paid: { label: "Sudah Bayar", className: "bg-blue-500/15 text-blue-400 ring-blue-500/20" },
  pending: { label: "Menunggu", className: "bg-amber-500/15 text-amber-400 ring-amber-500/20" },
  confirmed: { label: "Dikonfirmasi", className: "bg-sky-500/15 text-sky-400 ring-sky-500/20" },
  decanting: { label: "Sedang Disiapkan", className: "bg-indigo-500/15 text-indigo-400 ring-indigo-500/20" },
  shipped: { label: "Dikirim", className: "bg-violet-500/15 text-violet-400 ring-violet-500/20" },
  completed: { label: "Selesai", className: "bg-emerald-500/15 text-emerald-400 ring-emerald-500/20" },
  cancelled: { label: "Dibatalkan", className: "bg-red-500/15 text-red-400 ring-red-500/20" },
};

export function SplitStatusBadge({ status }: { status: SplitStatus }) {
  const config = splitStatusConfig[status];
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ${config.className}`}>
      {config.label}
    </span>
  );
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const config = orderStatusConfig[status];
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ${config.className}`}>
      {config.label}
    </span>
  );
}
