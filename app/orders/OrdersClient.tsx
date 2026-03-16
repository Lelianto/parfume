"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { OrderStatusBadge } from "@/components/StatusBadge";
import { MiniOrderProgress } from "@/components/MiniOrderProgress";
import { formatRupiah } from "@/lib/utils";
import type { Order, OrderGroup } from "@/types/database";
import type { SellerOrder } from "./page";
import {
  Package,
  Droplets,
  Clock,
  ClipboardList,
  ShoppingBag,
  Layers,
} from "lucide-react";

type Tab = "purchases" | "sales";

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

export function OrdersClient({
  buyerOrders,
  orderGroups = [],
  sellerOrders,
  hasSplits,
}: {
  buyerOrders: Order[];
  orderGroups?: OrderGroup[];
  sellerOrders: SellerOrder[];
  hasSplits: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "sales" ? "sales" : "purchases";
  const [tab, setTab] = useState<Tab>(initialTab);
  const [sellerFilter, setSellerFilter] = useState<StatusFilter>("active");

  function handleTabChange(newTab: Tab) {
    setTab(newTab);
    router.replace(`/orders?tab=${newTab}`, { scroll: false });
  }

  // Seller filter logic
  const filteredSeller = sellerOrders.filter((o) => {
    if (sellerFilter === "all") return true;
    if (sellerFilter === "active") return !["cancelled", "completed", "rejected"].includes(o.status);
    return o.status === sellerFilter;
  });

  const sellerCounts = {
    all: sellerOrders.length,
    active: sellerOrders.filter((o) => !["cancelled", "completed", "rejected"].includes(o.status)).length,
    pending_payment: sellerOrders.filter((o) => o.status === "pending_payment").length,
    paid: sellerOrders.filter((o) => o.status === "paid").length,
    confirmed: sellerOrders.filter((o) => o.status === "confirmed").length,
    decanting: sellerOrders.filter((o) => o.status === "decanting").length,
    shipped: sellerOrders.filter((o) => o.status === "shipped").length,
    completed: sellerOrders.filter((o) => o.status === "completed").length,
    cancelled: sellerOrders.filter((o) => o.status === "cancelled").length,
    rejected: sellerOrders.filter((o) => o.status === "rejected").length,
  };

  return (
    <div className="mx-auto max-w-5xl px-4 pb-8 pt-20 sm:px-6 md:pt-8">
      <div className="flex items-center gap-3">
        <Package size={22} className="text-gold-400" />
        <h1 className="font-display text-2xl font-bold text-gold-100">Pesanan</h1>
      </div>

      {/* Tabs */}
      <div className="mt-6 flex gap-1 rounded-xl bg-surface-200/60 p-1">
        <button
          onClick={() => handleTabChange("purchases")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
            tab === "purchases"
              ? "bg-gold-400/20 text-gold-400 shadow-sm"
              : "text-gold-200/50 hover:text-gold-200/70"
          }`}
        >
          <ShoppingBag size={16} />
          Pembelian
          {buyerOrders.length > 0 && (
            <span className="text-xs opacity-60">({buyerOrders.length})</span>
          )}
        </button>
        {hasSplits && (
          <button
            onClick={() => handleTabChange("sales")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
              tab === "sales"
                ? "bg-gold-400/20 text-gold-400 shadow-sm"
                : "text-gold-200/50 hover:text-gold-200/70"
            }`}
          >
            <ClipboardList size={16} />
            Penjualan
            {sellerOrders.length > 0 && (
              <span className="text-xs opacity-60">({sellerOrders.length})</span>
            )}
          </button>
        )}
      </div>

      {/* Purchases Tab */}
      {tab === "purchases" && (
        <>
          {buyerOrders.length === 0 && orderGroups.length === 0 ? (
            <div className="mt-12 rounded-2xl border border-dashed border-gold-900/30 py-16 text-center">
              <Droplets size={48} className="mx-auto text-gold-800/30" />
              <p className="mt-4 text-gold-200/50">Belum ada pesanan.</p>
              <Link
                href="/"
                className="btn-gold mt-4 inline-block rounded-lg px-6 py-2.5 text-sm font-medium text-surface-400"
              >
                Jelajahi Split
              </Link>
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {/* Order Groups */}
              {orderGroups.map((group) => {
                const groupOrders = group.orders ?? [];
                return (
                  <Link key={group.id} href={`/order-group/${group.id}`}>
                    <div className="card-glow rounded-2xl border border-gold-900/20 bg-surface-200/80 p-4 transition-all">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-400/10">
                            <Layers size={18} className="text-gold-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gold-100">
                              Pesanan Group · {groupOrders.length} item
                            </p>
                            <p className="text-xs text-gold-200/40">
                              {group.seller?.name || "Seller"}
                            </p>
                          </div>
                        </div>
                        <OrderStatusBadge status={group.status} />
                      </div>
                      {/* Show first 2 items as preview */}
                      <div className="mt-3 flex gap-2">
                        {groupOrders.slice(0, 3).map((order) => (
                          <div key={order.id} className="relative h-12 w-12 overflow-hidden rounded-lg border border-gold-900/10 bg-surface-300">
                            {order.split?.bottle_photo_url ? (
                              <Image src={order.split.bottle_photo_url} alt="" fill className="object-cover" />
                            ) : (
                              <div className="flex h-full items-center justify-center text-gold-800/30">
                                <Droplets size={14} />
                              </div>
                            )}
                          </div>
                        ))}
                        {groupOrders.length > 3 && (
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-gold-900/10 bg-surface-300 text-xs text-gold-200/40">
                            +{groupOrders.length - 3}
                          </div>
                        )}
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-sm font-semibold text-gold-400">
                          {formatRupiah(group.total_product_price + group.shipping_cost)}
                        </span>
                        {group.status === "pending_payment" && group.payment_deadline && (
                          <div className="flex items-center gap-1 text-xs text-orange-400">
                            <Clock size={11} />
                            <span>Bayar sebelum {new Date(group.payment_deadline).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}

              {/* Individual Orders (non-grouped) */}
              {buyerOrders.map((order) => (
                <Link key={order.id} href={`/my-orders/${order.id}`}>
                  <div className="card-glow flex gap-4 rounded-2xl border border-gold-900/20 bg-surface-200/80 p-4 transition-all">
                    <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border border-gold-900/15 bg-surface-300">
                      {order.split?.bottle_photo_url ? (
                        <Image
                          src={order.split.bottle_photo_url}
                          alt=""
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-gold-800/30">
                          <Droplets size={24} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-gold-400/70">
                            {order.split?.perfume?.brand}
                          </p>
                          <p className="font-display font-semibold text-gold-100">
                            {order.split?.perfume?.name}
                            {order.split?.perfume?.variant && (
                              <span className="text-gold-200/50"> — {order.split.perfume.variant}</span>
                            )}
                          </p>
                        </div>
                        <OrderStatusBadge status={order.status} />
                      </div>
                      <div className="mt-2 flex items-center gap-4 text-sm text-gold-200/40">
                        <span>
                          {order.size_ml ? `${order.size_ml}ml` : `${order.slots_purchased} slot`}
                          {order.slots_purchased > 1 && order.size_ml ? ` × ${order.slots_purchased}` : ""}
                        </span>
                        <span className="font-medium text-gold-400">{formatRupiah(order.total_price)}</span>
                      </div>
                      <div className="mt-2">
                        <MiniOrderProgress status={order.status} />
                      </div>
                      {order.status === "pending_payment" && order.payment_deadline && (
                        <div className="mt-1 flex items-center gap-1 text-xs text-orange-400">
                          <Clock size={11} />
                          <span>Bayar sebelum {new Date(order.payment_deadline).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                      )}
                      {order.shipping_receipt && (
                        <p className="mt-1 text-xs text-gold-200/30">
                          Resi: {order.shipping_receipt}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      {/* Sales Tab */}
      {tab === "sales" && (
        <>
          {/* Filter tabs */}
          <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
            {FILTER_OPTIONS.map((opt) => {
              const count = sellerCounts[opt.value];
              if (opt.value !== "all" && opt.value !== "active" && count === 0) return null;
              return (
                <button
                  key={opt.value}
                  onClick={() => setSellerFilter(opt.value)}
                  className={`ml-1 mt-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                    sellerFilter === opt.value
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
          {filteredSeller.length === 0 ? (
            <div className="mt-12 rounded-2xl border border-dashed border-gold-900/30 py-16 text-center">
              <Package size={48} className="mx-auto text-gold-800/30" />
              <p className="mt-4 text-gold-200/50">
                {sellerOrders.length === 0
                  ? "Belum ada pesanan masuk."
                  : "Tidak ada pesanan dengan filter ini."}
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {filteredSeller.map((order) => (
                <Link key={order.id} href={`/seller/orders/${order.id}`}>
                  <div className="card-hover rounded-2xl border border-gold-900/20 bg-surface-200/80 p-4 transition-all">
                    <div className="flex gap-4">
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
                      <div className="min-w-0 flex-1">
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
                        {order.shipping_receipt && (
                          <p className="mt-1.5 text-xs text-gold-200/50">
                            Resi: <span className="font-mono font-medium text-gold-200/70">{order.shipping_receipt}</span>
                          </p>
                        )}
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
        </>
      )}
    </div>
  );
}
