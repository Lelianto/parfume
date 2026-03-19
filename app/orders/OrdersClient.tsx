"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { OrderStatusBadge } from "@/components/StatusBadge";
import { MiniOrderProgress } from "@/components/MiniOrderProgress";
import { formatRupiah } from "@/lib/utils";
import type { BuyerOrder, SellerOrder } from "./page";
import type { OrderStatus } from "@/types/database";
import {
  Package,
  Droplets,
  Clock,
  ClipboardList,
  ShoppingBag,
  Store,
  RefreshCw,
} from "lucide-react";

type MainTab = "purchases" | "sales";
type StatusFilter = "all" | "active" | "pending_payment" | "paid" | "confirmed" | "decanting" | "shipped" | "completed" | "cancelled" | "rejected";

const STATUS_TABS: { value: StatusFilter; label: string; emoji?: string }[] = [
  { value: "all", label: "Semua" },
  { value: "active", label: "Aktif" },
  { value: "pending_payment", label: "Menunggu Bayar" },
  { value: "paid", label: "Dibayar" },
  { value: "confirmed", label: "Dikonfirmasi" },
  { value: "decanting", label: "Proses Decant" },
  { value: "shipped", label: "Dikirim" },
  { value: "completed", label: "Selesai" },
  { value: "cancelled", label: "Dibatalkan" },
  { value: "rejected", label: "Ditolak" },
];

function filterOrders<T extends { status: string }>(orders: T[], filter: StatusFilter): T[] {
  if (filter === "all") return orders;
  if (filter === "active") return orders.filter((o) => !["cancelled", "completed", "rejected"].includes(o.status));
  return orders.filter((o) => o.status === filter);
}

function countByStatus<T extends { status: string }>(orders: T[]): Record<StatusFilter, number> {
  const counts: Record<string, number> = {
    all: orders.length,
    active: 0, pending_payment: 0, paid: 0, confirmed: 0, decanting: 0, shipped: 0, completed: 0, cancelled: 0, rejected: 0,
  };
  for (const o of orders) {
    if (counts[o.status] !== undefined) counts[o.status]++;
    if (!["cancelled", "completed", "rejected"].includes(o.status)) counts.active++;
  }
  return counts as Record<StatusFilter, number>;
}

function getOrderLink(order: BuyerOrder): string {
  if (order.checkout_id) return `/checkout/${order.checkout_id}`;
  if (order.order_group_id) return `/order-group/${order.order_group_id}`;
  return `/my-orders/${order.id}`;
}

function StatusHint({ status, isReadyStock }: { status: string; isReadyStock?: boolean }) {
  const hints: Record<string, string> = {
    pending_payment: "Menunggu pembayaran kamu",
    paid: "Seller sedang memverifikasi",
    confirmed: isReadyStock ? "Seller menyiapkan pengiriman" : "Seller mulai proses decant",
    decanting: "Seller sedang proses decant",
    shipped: "Paket sedang dalam perjalanan",
    completed: "Pesanan selesai",
    cancelled: "Pesanan dibatalkan",
    rejected: "Pesanan ditolak",
  };
  if (!hints[status]) return null;
  return <p className="text-[11px] text-gold-200/30">{hints[status]}</p>;
}

// ─── Order Item Card (shared for both buyer & seller) ───
function OrderItemCard({
  photo,
  brand,
  name,
  variant,
  concentration,
  status,
  sizeMl,
  qty,
  price,
  date,
  sellerName,
  buyerName,
  shippingReceipt,
  paymentDeadline,
  splitId,
  isReadyStock,
  href,
  showReorder,
}: {
  photo: string | null;
  brand: string;
  name: string;
  variant?: string | null;
  concentration?: string | null;
  status: string;
  sizeMl?: number | null;
  qty: number;
  price: number;
  date: string;
  sellerName?: string | null;
  buyerName?: string | null;
  shippingReceipt?: string | null;
  paymentDeadline?: string | null;
  splitId?: string;
  isReadyStock?: boolean;
  href: string;
  showReorder?: boolean;
}) {
  return (
    <div className="card-hover rounded-2xl border border-gold-900/20 bg-surface-200/80 transition-all">
      <Link href={href} className="flex gap-3 p-4 sm:gap-4">
        {/* Thumbnail */}
        <div className="relative h-20 w-16 flex-shrink-0 overflow-hidden rounded-xl border border-gold-900/15 bg-surface-300 sm:h-24 sm:w-20">
          {photo ? (
            <Image src={photo} alt="" fill className="object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-gold-800/30">
              <Droplets size={20} />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-gold-400/60">
                {brand}
              </p>
              <p className="truncate font-display text-sm font-semibold text-gold-100 sm:text-base">
                {name}
                {variant && <span className="text-gold-200/50"> — {variant}</span>}
              </p>
            </div>
            <OrderStatusBadge status={status as OrderStatus} />
          </div>

          {/* Meta row */}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gold-200/40">
            {concentration && (
              <span className="rounded-full bg-gold-400/10 px-1.5 py-0.5 text-[10px] font-medium text-gold-400/80">
                {concentration}
              </span>
            )}
            <span>{sizeMl ? `${sizeMl}ml` : `${qty} slot`}{qty > 1 && sizeMl ? ` × ${qty}` : ""}</span>
            <span className="font-semibold text-gold-400">{formatRupiah(price)}</span>
          </div>

          {/* Seller / buyer name */}
          {sellerName && (
            <div className="mt-1.5 flex items-center gap-1 text-[11px] text-gold-200/35">
              <Store size={10} /> {sellerName}
            </div>
          )}
          {buyerName && (
            <div className="mt-1.5 flex items-center gap-1 text-[11px] text-gold-200/35">
              Pembeli: <span className="font-medium text-gold-200/60">{buyerName}</span>
            </div>
          )}

          {/* Progress + hints */}
          <div className="mt-2">
            <MiniOrderProgress status={status as OrderStatus} />
          </div>
          <StatusHint status={status} isReadyStock={isReadyStock} />

          {/* Deadline */}
          {status === "pending_payment" && paymentDeadline && (
            <div className="mt-1 flex items-center gap-1 text-[11px] text-orange-400">
              <Clock size={10} />
              Bayar sebelum {new Date(paymentDeadline).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
            </div>
          )}

          {/* Resi */}
          {shippingReceipt && (
            <p className="mt-1 text-[11px] text-gold-200/30">
              Resi: <span className="font-mono font-medium text-gold-200/60">{shippingReceipt}</span>
            </p>
          )}

          {/* Date */}
          <p className="mt-1 text-[10px] text-gold-200/20">
            {new Date(date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
      </Link>

      {/* Reorder button */}
      {showReorder && splitId && ["completed", "cancelled", "rejected"].includes(status) && (
        <div className="border-t border-gold-900/10 px-4 py-2.5">
          <Link
            href={`/split/${splitId}`}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-gold-400/10 px-3 py-2 text-xs font-medium text-gold-400 transition-colors hover:bg-gold-400/20"
          >
            <RefreshCw size={12} /> Pesan Ulang
          </Link>
        </div>
      )}
    </div>
  );
}

// ─── Filter Bar ───
function FilterBar({ filter, counts, onChange }: { filter: StatusFilter; counts: Record<StatusFilter, number>; onChange: (v: StatusFilter) => void }) {
  return (
    <div className="mt-5 flex gap-1.5 overflow-x-auto pb-2">
      {STATUS_TABS.map((tab) => {
        const count = counts[tab.value];
        if (!["all", "active"].includes(tab.value) && count === 0) return null;
        return (
          <button
            key={tab.value}
            onClick={() => onChange(tab.value)}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              filter === tab.value
                ? "bg-gold-400/20 text-gold-400 ring-1 ring-gold-400/40"
                : "bg-surface-200 text-gold-200/50 ring-1 ring-gold-900/30 hover:ring-gold-700/40"
            }`}
          >
            {tab.label}
            {count > 0 && <span className="ml-1 text-[10px] opacity-60">({count})</span>}
          </button>
        );
      })}
    </div>
  );
}

// ─── Main Component ───
export function OrdersClient({
  buyerOrders,
  sellerOrders,
  hasSplits,
}: {
  buyerOrders: BuyerOrder[];
  sellerOrders: SellerOrder[];
  hasSplits: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "sales" ? "sales" : "purchases";
  const [tab, setTab] = useState<MainTab>(initialTab);
  const [buyerFilter, setBuyerFilter] = useState<StatusFilter>("active");
  const [sellerFilter, setSellerFilter] = useState<StatusFilter>("active");

  function handleTabChange(newTab: MainTab) {
    setTab(newTab);
    router.replace(`/orders?tab=${newTab}`, { scroll: false });
  }

  const filteredBuyer = filterOrders(buyerOrders, buyerFilter);
  const filteredSeller = filterOrders(sellerOrders, sellerFilter);
  const buyerCounts = countByStatus(buyerOrders);
  const sellerCounts = countByStatus(sellerOrders);

  return (
    <div className="mx-auto max-w-3xl px-4 pb-8 pt-20 sm:px-6 md:pt-8">
      <div className="flex items-center gap-3">
        <Package size={22} className="text-gold-400" />
        <h1 className="font-display text-2xl font-bold text-gold-100">Pesanan</h1>
      </div>

      {/* Main Tabs */}
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
          {buyerOrders.length > 0 && <span className="text-xs opacity-60">({buyerOrders.length})</span>}
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
            {sellerOrders.length > 0 && <span className="text-xs opacity-60">({sellerOrders.length})</span>}
          </button>
        )}
      </div>

      {/* ═══ Purchases Tab ═══ */}
      {tab === "purchases" && (
        <>
          <FilterBar filter={buyerFilter} counts={buyerCounts} onChange={setBuyerFilter} />

          {filteredBuyer.length === 0 ? (
            <div className="mt-12 rounded-2xl border border-dashed border-gold-900/30 py-16 text-center">
              <Droplets size={48} className="mx-auto text-gold-800/30" />
              <p className="mt-4 text-gold-200/50">
                {buyerOrders.length === 0 ? "Belum ada pesanan." : "Tidak ada pesanan dengan filter ini."}
              </p>
              {buyerOrders.length === 0 && (
                <Link href="/" className="btn-gold mt-4 inline-block rounded-lg px-6 py-2.5 text-sm font-medium text-surface-400">
                  Jelajahi Produk
                </Link>
              )}
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {filteredBuyer.map((order) => (
                <OrderItemCard
                  key={order.id}
                  photo={order.split?.bottle_photo_url ?? null}
                  brand={order.split?.perfume?.brand ?? ""}
                  name={order.split?.perfume?.name ?? ""}
                  variant={order.split?.perfume?.variant}
                  concentration={order.split?.perfume?.concentration}
                  status={order.status}
                  sizeMl={order.size_ml}
                  qty={order.slots_purchased}
                  price={order.total_price}
                  date={order.created_at}
                  sellerName={order.seller?.name}
                  shippingReceipt={order.shipping_receipt}
                  paymentDeadline={order.payment_deadline}
                  splitId={order.split_id}
                  isReadyStock={order.split?.is_ready_stock}
                  href={getOrderLink(order)}
                  showReorder
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ═══ Sales Tab ═══ */}
      {tab === "sales" && (
        <>
          <FilterBar filter={sellerFilter} counts={sellerCounts} onChange={setSellerFilter} />

          {filteredSeller.length === 0 ? (
            <div className="mt-12 rounded-2xl border border-dashed border-gold-900/30 py-16 text-center">
              <Package size={48} className="mx-auto text-gold-800/30" />
              <p className="mt-4 text-gold-200/50">
                {sellerOrders.length === 0 ? "Belum ada pesanan masuk." : "Tidak ada pesanan dengan filter ini."}
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {filteredSeller.map((order) => (
                <OrderItemCard
                  key={order.id}
                  photo={order.split?.bottle_photo_url ?? null}
                  brand={order.split?.perfume?.brand ?? ""}
                  name={order.split?.perfume?.name ?? ""}
                  variant={order.split?.perfume?.variant}
                  concentration={order.split?.perfume?.concentration}
                  status={order.status}
                  sizeMl={order.size_ml}
                  qty={order.slots_purchased}
                  price={order.total_price}
                  date={order.created_at}
                  buyerName={order.user?.name}
                  shippingReceipt={order.shipping_receipt}
                  paymentDeadline={order.payment_deadline}
                  splitId={order.split_id}
                  isReadyStock={order.split?.is_ready_stock}
                  href={`/seller/orders/${order.id}`}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
