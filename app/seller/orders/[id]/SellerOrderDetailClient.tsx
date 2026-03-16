"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { OrderStatusBadge } from "@/components/StatusBadge";
import type { Order, Split } from "@/types/database";
import {
  ArrowLeft,
  Droplets,
  CheckCircle2,
  Truck,
  FlaskConical,
  Clock,
  Package,
  Loader2,
  User as UserIcon,
  MapPin,
  XCircle,
  Banknote,
} from "lucide-react";
import { formatRupiah, formatDate } from "@/lib/utils";

interface SellerOrderDetailProps {
  order: Order & {
    split: Split;
    user?: {
      name: string;
      avatar_url: string | null;
      email: string;
      whatsapp: string | null;
      city: string | null;
    };
  };
}

// Steps in order flow (unified for all order types)
const ORDER_STEPS = [
  { status: "pending_payment", label: "Menunggu Bayar", icon: Clock },
  { status: "paid", label: "Sudah Bayar", icon: CheckCircle2 },
  { status: "confirmed", label: "Dikonfirmasi", icon: CheckCircle2 },
  { status: "decanting", label: "Disiapkan", icon: FlaskConical },
  { status: "shipped", label: "Dikirim", icon: Truck },
  { status: "completed", label: "Selesai", icon: Package },
] as const;

export function SellerOrderDetailClient({ order: initialOrder }: SellerOrderDetailProps) {
  const [order, setOrder] = useState(initialOrder);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [shippingReceipt, setShippingReceipt] = useState(order.shipping_receipt || "");
  const [error, setError] = useState("");
  const router = useRouter();

  const split = order.split!;
  const buyer = order.user;
  const isReadyStock = split.is_ready_stock;
  const steps = ORDER_STEPS;

  const refreshOrder = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("orders")
      .select("*, split:splits(*, perfume:perfumes(*)), user:users(name, avatar_url, email, whatsapp, city)")
      .eq("id", order.id)
      .single();
    if (data) setOrder(data as unknown as typeof initialOrder);
  }, [order.id]);

  async function handleAction(newStatus: string) {
    setActionLoading(newStatus);
    setError("");

    const body: Record<string, string> = { status: newStatus };
    if (newStatus === "shipped") {
      if (!shippingReceipt.trim()) {
        setError("Nomor resi wajib diisi sebelum mengirim");
        setActionLoading(null);
        return;
      }
      body.shipping_receipt = shippingReceipt.trim();
    }

    const res = await fetch(`/api/orders/${order.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      let errMsg = "Gagal update status";
      try {
        const data = await res.json();
        errMsg = data.error || errMsg;
      } catch {
        errMsg = `Server error (${res.status})`;
      }
      setError(errMsg);
      setActionLoading(null);
      return;
    }

    setActionLoading(null);
    await refreshOrder();
    router.refresh();
  }

  // Determine current step index
  const statusOrder = steps.map((s) => s.status);
  const currentIdx = (order.status === "cancelled" || order.status === "rejected")
    ? -1
    : statusOrder.indexOf(order.status as typeof statusOrder[number]);

  return (
    <div className="mx-auto max-w-3xl px-4 pb-8 pt-20 sm:px-8 md:pt-8">
      <Link
        href="/seller/orders"
        className="mb-6 hidden items-center gap-1.5 text-sm text-gold-200/40 transition-colors hover:text-gold-400 md:inline-flex"
      >
        <ArrowLeft size={16} /> Kembali ke Kelola Pesanan
      </Link>

      {/* Order Header */}
      <div className="flex gap-4">
        <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border border-gold-900/15 bg-surface-300">
          {split.bottle_photo_url ? (
            <Image src={split.bottle_photo_url} alt="" fill className="object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-gold-800/30">
              <Droplets size={24} />
            </div>
          )}
        </div>
        <div className="flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-gold-400/70">
            {split.perfume?.brand}
          </p>
          <p className="font-display text-xl font-bold text-gold-100">
            {split.perfume?.name}
            {split.perfume?.variant && (
              <span className="text-gold-200/50"> — {split.perfume.variant}</span>
            )}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-3">
            <OrderStatusBadge status={order.status} />
            <span className="text-sm text-gold-200/40">
              {order.size_ml ? `${order.size_ml}ml` : `${order.slots_purchased} slot`}
            </span>
            <span className="text-sm font-medium text-gold-400">
              {formatRupiah(order.total_price)}
            </span>
          </div>
        </div>
      </div>

      <div className="my-6 h-px bg-gradient-to-r from-transparent via-gold-700/15 to-transparent" />

      {/* Order Timeline */}
      {order.status !== "cancelled" && order.status !== "rejected" && (
        <div className="mb-8">
          <h2 className="mb-4 text-sm font-semibold text-gold-200/60">Status Pesanan</h2>
          <div className="flex items-center overflow-x-auto pb-2">
            {steps.map((s, i) => {
              const Icon = s.icon;
              const isDone = i <= currentIdx;
              const isCurrent = i === currentIdx;
              return (
                <div key={s.status} className={`flex items-center ${i < steps.length - 1 ? "flex-1" : ""}`}>
                  <div className="flex flex-col items-center">
                    <div
                      className={`mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all sm:h-8 sm:w-8 ${isCurrent
                          ? "bg-gold-400 text-surface-400 shadow-lg shadow-gold-400/20"
                          : isDone
                            ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30"
                            : "bg-surface-300 text-gold-200/20 ring-1 ring-gold-900/20"
                        }`}
                    >
                      <Icon size={12} className="sm:hidden" />
                      <Icon size={14} className="hidden sm:block" />
                    </div>
                    <p className={`mt-1.5 whitespace-nowrap text-[9px] font-medium sm:text-[10px] ${isCurrent ? "text-gold-400" : isDone ? "text-emerald-400/60" : "text-gold-200/20"
                      }`}>
                      {s.label}
                    </p>
                  </div>
                  {i < steps.length - 1 && (
                    <div
                      className={`mx-1 mb-5 h-px min-w-[16px] flex-1 sm:mx-1.5 ${i < currentIdx ? "bg-emerald-500/30" : "bg-gold-900/15"
                        }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {order.status === "rejected" && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
          <XCircle size={20} className="flex-shrink-0 text-rose-400" />
          <div>
            <p className="text-sm font-medium text-rose-400">Pembayaran Ditolak</p>
            <p className="text-xs text-gold-200/40">Pembayaran ditolak oleh admin.{order.reject_reason ? ` Alasan: ${order.reject_reason}` : ""}</p>
          </div>
        </div>
      )}

      {order.status === "cancelled" && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
          <XCircle size={20} className="flex-shrink-0 text-red-400" />
          <div>
            <p className="text-sm font-medium text-red-400">Pesanan Dibatalkan</p>
            <p className="text-xs text-gold-200/40">Pembeli tidak melakukan pembayaran.</p>
          </div>
        </div>
      )}

      {/* Buyer Info — only name shown */}
      <div className="rounded-2xl border border-gold-900/20 bg-surface-200/60 p-5">
        <h2 className="mb-3 text-sm font-semibold text-gold-200/60">Info Pembeli</h2>
        <div className="flex items-center gap-3">
          {buyer?.avatar_url ? (
            <Image
              src={buyer.avatar_url}
              alt=""
              width={40}
              height={40}
              className="rounded-full ring-1 ring-gold-700/30"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-300 ring-1 ring-gold-900/20">
              <UserIcon size={18} className="text-gold-200/30" />
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-gold-100">{buyer?.name || "User"}</p>
            {buyer?.city && (
              <p className="flex items-center gap-1 text-xs text-gold-200/40">
                <MapPin size={10} /> {buyer.city}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Shipping Address */}
      {order.shipping_name && (
        <>
          <div className="my-6 h-px bg-gradient-to-r from-transparent via-gold-700/15 to-transparent" />
          <div className="rounded-2xl border border-gold-900/20 bg-surface-200/60 p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gold-200/60">
              <MapPin size={14} /> Alamat Pengiriman
            </h2>
            <div className="space-y-1 text-sm">
              <p className="font-medium text-gold-100">{order.shipping_name}</p>
              <p className="text-gold-200/50">{order.shipping_phone}</p>
              <p className="text-gold-200/50">{order.shipping_address}</p>
              <p className="text-gold-200/50">
                {[order.shipping_village, order.shipping_district, order.shipping_city, order.shipping_province]
                  .filter(Boolean)
                  .join(", ")}
              </p>
              {order.shipping_postal_code && (
                <p className="font-mono text-xs text-gold-200/40">{order.shipping_postal_code}</p>
              )}
            </div>
          </div>
        </>
      )}

      <div className="my-6 h-px bg-gradient-to-r from-transparent via-gold-700/15 to-transparent" />

      {/* Order Details */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-gold-200/60">Detail Pesanan</h2>
        <div className="rounded-xl border border-gold-900/15 bg-surface-200/40">
          {[
            { label: "Ukuran", value: order.size_ml ? `${order.size_ml}ml` : `${order.slots_purchased} slot` },
            { label: "Jumlah", value: `${order.slots_purchased}` },
            { label: "Total", value: formatRupiah(order.total_price) },
            { label: "Tipe Stok", value: isReadyStock ? "Ready Stock" : "Non-Ready Stock" },
            { label: "Tanggal Order", value: formatDate(order.created_at) },
            ...(order.confirmed_at ? [{ label: "Dikonfirmasi", value: formatDate(order.confirmed_at) }] : []),
            ...(order.shipped_at ? [{ label: "Dikirim", value: formatDate(order.shipped_at) }] : []),
            ...(order.completed_at ? [{ label: "Selesai", value: formatDate(order.completed_at) }] : []),
            ...(order.shipping_receipt ? [{ label: "Nomor Resi", value: order.shipping_receipt, mono: true }] : []),
          ].map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between border-b border-gold-900/10 px-4 py-3 text-sm last:border-b-0"
            >
              <span className="text-gold-200/35">{row.label}</span>
              <span className={`font-medium text-gold-100 ${"mono" in row ? "font-mono text-[13px]" : ""}`}>
                {row.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Payment confirmation info (payment proof hidden from seller) */}
      {order.payment_proof_url && ["confirmed", "decanting", "shipped", "completed"].includes(order.status) && (
        <div className="mt-6 flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <CheckCircle2 size={20} className="flex-shrink-0 text-emerald-400" />
          <div>
            <p className="text-sm font-medium text-emerald-400">Pembayaran telah dikonfirmasi</p>
            <p className="text-xs text-gold-200/40">
              Pembayaran untuk pesanan ini sudah diverifikasi oleh pihak Wangiverse.
            </p>
          </div>
        </div>
      )}

      <div className="my-6 h-px bg-gradient-to-r from-transparent via-gold-700/15 to-transparent" />

      {/* Actions */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-gold-200/60">Aksi</h2>

        {/* Pending payment — nothing to do */}
        {order.status === "pending_payment" && (
          <div className="flex items-center gap-3 rounded-xl border border-orange-500/20 bg-orange-500/5 p-4">
            <Clock size={20} className="flex-shrink-0 text-orange-400" />
            <div>
              <p className="text-sm font-medium text-orange-400">Menunggu pembayaran dari pembeli</p>
              <p className="text-xs text-gold-200/40">
                Batas waktu: {order.payment_deadline ? formatDate(order.payment_deadline) : "-"}
              </p>
            </div>
          </div>
        )}

        {/* Paid — waiting admin verification */}
        {order.status === "paid" && (
          <div className="flex items-center gap-3 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
            <Clock size={20} className="flex-shrink-0 text-blue-400" />
            <div>
              <p className="text-sm font-medium text-blue-400">Menunggu verifikasi admin</p>
              <p className="text-xs text-gold-200/40">
                Pembeli sudah upload bukti bayar. Admin Wangiverse akan memverifikasi pembayaran ini.
              </p>
            </div>
          </div>
        )}

        {/* Confirmed — seller must prepare order first */}
        {order.status === "confirmed" && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4">
              <FlaskConical size={20} className="flex-shrink-0 text-indigo-400" />
              <div>
                <p className="text-sm font-medium text-indigo-400">Siapkan pesanan</p>
                <p className="text-xs text-gold-200/40">
                  Klik tombol di bawah untuk menandai pesanan sedang disiapkan. Setelah itu kamu bisa input resi dan kirim.
                </p>
              </div>
            </div>
            <button
              onClick={() => handleAction("decanting")}
              disabled={!!actionLoading}
              className="btn-gold flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold text-surface-400"
            >
              {actionLoading === "decanting" ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <FlaskConical size={16} />
              )}
              Siapkan Pesanan
            </button>
          </div>
        )}

        {/* Decanting (Sedang Disiapkan) — input resi & ship */}
        {order.status === "decanting" && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
              <Truck size={20} className="flex-shrink-0 text-violet-400" />
              <div>
                <p className="text-sm font-medium text-violet-400">Pesanan siap? Kirim sekarang</p>
                <p className="text-xs text-gold-200/40">
                  Masukkan nomor resi pengiriman lalu klik kirim.
                </p>
              </div>
            </div>
            {/* Show buyer's chosen courier */}
            {order.shipping_courier && order.shipping_service && (
              <div className="rounded-lg bg-surface-300/60 px-4 py-3">
                <p className="text-xs text-gold-200/40">Kurir dipilih pembeli</p>
                <p className="mt-0.5 text-sm font-medium text-gold-100">{order.shipping_service}</p>
                {order.shipping_cost > 0 && (
                  <p className="text-xs text-gold-200/40">Ongkir: {formatRupiah(order.shipping_cost)}</p>
                )}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gold-200/60">Nomor Resi Pengiriman *</label>
              <input
                type="text"
                value={shippingReceipt}
                onChange={(e) => setShippingReceipt(e.target.value)}
                placeholder="Contoh: JNE1234567890"
                className="input-dark mt-1"
              />
            </div>
            <button
              onClick={() => handleAction("shipped")}
              disabled={!!actionLoading}
              className="btn-gold flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold text-surface-400"
            >
              {actionLoading === "shipped" ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Truck size={16} />
              )}
              Kirim Pesanan
            </button>
          </div>
        )}

        {/* Shipped — waiting */}
        {order.status === "shipped" && (
          <div className="flex items-center gap-3 rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
            <Truck size={20} className="flex-shrink-0 text-violet-400" />
            <div>
              <p className="text-sm font-medium text-violet-400">Pesanan sedang dikirim</p>
              <p className="text-xs text-gold-200/40">
                Menunggu pembeli konfirmasi penerimaan. Otomatis selesai dalam 2 hari.
              </p>
            </div>
          </div>
        )}

        {/* Completed */}
        {order.status === "completed" && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <Package size={20} className="flex-shrink-0 text-emerald-400" />
              <div>
                <p className="text-sm font-medium text-emerald-400">Pesanan selesai</p>
                <p className="text-xs text-gold-200/40">Transaksi telah selesai.</p>
              </div>
            </div>

            {/* Balance credit status */}
            {(order.disbursement_status === "credited" || order.disbursement_status === "pending") && (
              <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                <Banknote size={20} className="flex-shrink-0 text-emerald-400" />
                <div>
                  <p className="text-sm font-medium text-emerald-400">Dana masuk ke saldo</p>
                  <p className="text-xs text-gold-200/40">
                    {formatRupiah(order.total_price)} telah ditambahkan ke saldo kamu.{" "}
                    <Link href="/seller/balance" className="text-gold-400 underline">
                      Lihat saldo & tarik dana →
                    </Link>
                  </p>
                </div>
              </div>
            )}

            {order.disbursement_status === "disbursed" && (
              <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                <Banknote size={20} className="flex-shrink-0 text-emerald-400" />
                <div>
                  <p className="text-sm font-medium text-emerald-400">Dana sudah dicairkan</p>
                  <p className="text-xs text-gold-200/40">
                    {order.disbursed_at
                      ? `Dicairkan pada ${formatDate(order.disbursed_at)}`
                      : "Dana telah ditransfer ke rekening kamu."}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Link to split */}
      <div className="mt-8">
        <Link
          href={`/split/${order.split_id}`}
          className="flex items-center justify-center gap-2 rounded-xl border border-gold-700/30 bg-gold-400/5 py-3 text-sm font-medium text-gold-400 transition-colors hover:bg-gold-400/10"
        >
          Lihat Detail Split →
        </Link>
      </div>
    </div>
  );
}
