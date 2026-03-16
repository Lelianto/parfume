"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { OrderStatusBadge } from "@/components/StatusBadge";
import type { SellerOrder } from "@/app/orders/page";
import {
  Package,
  Droplets,
  ClipboardList,
} from "lucide-react";
import { formatRupiah } from "@/lib/utils";

type StatusFilter = "all" | "active" | "pending_payment" | "paid" | "confirmed" | "decanting" | "shipped" | "completed" | "cancelled" | "rejected";

const FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Semua" },
  { value: "active", label: "Aktif" },
  { value: "pending_payment", label: "Menunggu Bayar" },
  { value: "paid", label: "Sudah Bayar" },
  { value: "confirmed", label: "Dikonfirmasi" },
  { value: "decanting", label: "Decanting" },
  { value: "shipped", label: "Dikirim" },
  { value: "completed", label: "Selesai" },
  { value: "cancelled", label: "Dibatalkan" },
  { value: "rejected", label: "Ditolak" },
];

export function SellerOrdersClient({ orders }: { orders: SellerOrder[] }) {
  const [filter, setFilter] = useState<StatusFilter>("active");

  const filtered = orders.filter((o) => {
    if (filter === "all") return true;
    if (filter === "active") return !["cancelled", "completed", "rejected"].includes(o.status);
    return o.status === filter;
  });

  const counts = {
    all: orders.length,
    active: orders.filter((o) => !["cancelled", "completed", "rejected"].includes(o.status)).length,
    pending_payment: orders.filter((o) => o.status === "pending_payment").length,
    paid: orders.filter((o) => o.status === "paid").length,
    confirmed: orders.filter((o) => o.status === "confirmed").length,
    decanting: orders.filter((o) => o.status === "decanting").length,
    shipped: orders.filter((o) => o.status === "shipped").length,
    completed: orders.filter((o) => o.status === "completed").length,
    cancelled: orders.filter((o) => o.status === "cancelled").length,
    rejected: orders.filter((o) => o.status === "rejected").length,
  };

  return (
    <div className="mx-auto max-w-5xl px-4 pb-8 pt-20 sm:px-8 md:pt-8">
      <div className="flex items-center gap-3">
        <ClipboardList size={22} className="text-gold-400" />
        <h1 className="font-display text-2xl font-bold text-gold-100">Kelola Pesanan</h1>
      </div>
      <p className="mt-1 text-sm text-gold-200/40">
        Kelola semua pesanan dari pembeli di split kamu.
      </p>

      {/* Filter tabs */}
      <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
        {FILTER_OPTIONS.map((opt) => {
          const count = counts[opt.value];
          if (opt.value !== "all" && opt.value !== "active" && count === 0) return null;
          return (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`ml-1 mt-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${filter === opt.value
                  ? "bg-gold-400/20 text-gold-400 ring-1 ring-gold-400/40"
                  : "bg-surface-200 text-gold-200/50 ring-1 ring-gold-900/30 hover:ring-gold-700/40"
                }`}
            >
              {opt.label}
              {count > 0 && (
                <span className="ml-1.5 text-[10px] opacity-60">({count})</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Orders list */}
      {filtered.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-dashed border-gold-900/30 py-16 text-center">
          <Package size={48} className="mx-auto text-gold-800/30" />
          <p className="mt-4 text-gold-200/50">
            {orders.length === 0
              ? "Belum ada pesanan masuk."
              : "Tidak ada pesanan dengan filter ini."}
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {filtered.map((order) => (
            <Link key={order.id} href={`/seller/orders/${order.id}`}>
              <div className="card-hover rounded-2xl border border-gold-900/20 bg-surface-200/80 p-4 transition-all">
                <div className="flex gap-4">
                  {/* Product image */}
                  <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border border-gold-900/15 bg-surface-300">
                    {order.split?.bottle_photo_url ? (
                      <Image
                        src={order.split.bottle_photo_url}
                        alt=""
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-gold-800/30">
                        <Droplets size={20} />
                      </div>
                    )}
                  </div>

                  {/* Order info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gold-400/60">
                          {order.split?.perfume?.brand}
                        </p>
                        <p className="truncate font-display text-sm font-semibold text-gold-100">
                          {order.split?.perfume?.name}
                          {order.split?.perfume?.variant && (
                            <span className="text-gold-200/50"> — {order.split.perfume.variant}</span>
                          )}
                        </p>
                      </div>
                      <OrderStatusBadge status={order.status} />
                    </div>

                    <div className="mt-1.5 flex flex-col gap-1 text-xs text-gold-200/40 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-1">
                      <span className="font-medium text-gold-200/60">
                        {order.user?.name || "User"}
                      </span>
                      <span>
                        {order.size_ml ? `${order.size_ml}ml` : `${order.slots_purchased} slot`}
                      </span>
                      <span className="font-medium text-gold-400">
                        {formatRupiah(order.total_price)}
                      </span>
                      <span>
                        {new Date(order.created_at).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    {/* Shipping receipt display */}
                    {order.shipping_receipt && (
                      <p className="mt-1.5 text-xs text-gold-200/50">
                        Resi: <span className="font-mono font-medium text-gold-200/70">{order.shipping_receipt}</span>
                      </p>
                    )}

                    {/* Quick action hint */}
                    <div className="mt-2 text-[11px] text-gold-200/30">
                      {order.status === "paid" && "→ Perlu konfirmasi pembayaran"}
                      {order.status === "confirmed" && order.split?.is_ready_stock && "→ Siap kirim, input resi"}
                      {order.status === "confirmed" && !order.split?.is_ready_stock && "→ Siap mulai decant"}
                      {order.status === "decanting" && "→ Siap kirim, input resi"}
                      {order.status === "shipped" && "→ Menunggu konfirmasi penerimaan"}
                      {order.status === "pending_payment" && "→ Menunggu pembayaran"}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
