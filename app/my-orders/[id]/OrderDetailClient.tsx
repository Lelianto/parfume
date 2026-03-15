"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { OrderStatusBadge } from "@/components/StatusBadge";
import type { Order, Split } from "@/types/database";
import {
  ArrowLeft,
  Upload,
  Clock,
  CheckCircle2,
  Truck,
  Package,
  XCircle,
  Loader2,
  Droplets,
  Star,
  FlaskConical,
  MapPin,
} from "lucide-react";
import { formatRupiah } from "@/lib/utils";

function useCountdown(deadline: string | null) {
  const [timeLeft, setTimeLeft] = useState("");
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!deadline) return;

    function update() {
      const now = Date.now();
      const end = new Date(deadline!).getTime();
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft("00:00");
        setExpired(true);
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`);
    }

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  return { timeLeft, expired };
}

export function OrderDetailClient({
  order: initialOrder,
}: {
  order: Order & { split: Split };
}) {
  const [order, setOrder] = useState(initialOrder);
  const [uploading, setUploading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const { timeLeft, expired } = useCountdown(
    order.status === "pending_payment" ? order.payment_deadline : null
  );

  const split = order.split!;

  const refreshOrder = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("orders")
      .select("*, split:splits(*, perfume:perfumes(*), creator:users!splits_created_by_fkey(*))")
      .eq("id", order.id)
      .single();
    if (data) setOrder(data as unknown as Order & { split: Split });
  }, [order.id]);

  async function handleUploadPaymentProof(file: File) {
    setUploading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`/api/orders/${order.id}/payment-proof`, {
      method: "POST",
      body: formData,
    });

    const result = await res.json();

    if (!res.ok) {
      setError(result.error || "Gagal upload bukti bayar");
      setUploading(false);
      return;
    }

    setUploading(false);
    await refreshOrder();
  }

  async function handleConfirmReceived() {
    setConfirming(true);
    setError("");

    const res = await fetch(`/api/orders/${order.id}/confirm-received`, {
      method: "POST",
    });

    const result = await res.json();

    if (!res.ok) {
      setError(result.error || "Gagal konfirmasi pesanan");
      setConfirming(false);
      return;
    }

    setConfirming(false);
    await refreshOrder();
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pb-8 pt-20 md:pt-8">
      <Link
        href="/my-orders"
        className="mb-6 hidden items-center gap-1.5 text-sm text-gold-200/40 transition-colors hover:text-gold-400 md:inline-flex"
      >
        <ArrowLeft size={16} /> Kembali ke Pesanan
      </Link>

      {/* Order Header */}
      <div className="flex items-start gap-4">
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
          <div className="mt-1.5 flex items-center gap-3">
            <OrderStatusBadge status={order.status} />
            <span className="text-sm text-gold-200/40">
              {order.size_ml ? `${order.size_ml}ml` : `${order.slots_purchased} slot`}
              {order.slots_purchased > 1 && order.size_ml ? ` × ${order.slots_purchased}` : ""}
            </span>
            <span className="text-sm font-medium text-gold-400">{formatRupiah(order.total_price)}</span>
          </div>
        </div>
      </div>

      {/* Shipping Address */}
      {order.shipping_name && (
        <div className="mt-6 rounded-2xl border border-gold-900/20 bg-surface-200/60 p-5">
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
      )}

      <div className="my-6 h-px bg-gradient-to-r from-transparent via-gold-700/15 to-transparent" />

      {/* Status-specific content */}
      {order.status === "pending_payment" && (
        <div className="space-y-4">
          {/* Countdown */}
          <div className="flex items-center gap-3 rounded-xl border border-orange-500/20 bg-orange-500/5 p-4">
            <Clock size={20} className="flex-shrink-0 text-orange-400" />
            <div>
              <p className="text-sm font-medium text-orange-400">
                Batas waktu pembayaran
              </p>
              <p className={`font-mono text-2xl font-bold ${expired ? "text-red-400" : "text-orange-300"}`}>
                {timeLeft}
              </p>
              {expired && (
                <p className="text-xs text-red-400">Waktu habis. Order akan otomatis dibatalkan.</p>
              )}
            </div>
          </div>

          {/* Bank Info */}
          <div className="rounded-xl border border-gold-900/20 bg-surface-200/80 p-4">
            <p className="text-sm font-medium text-gold-200/60">Transfer ke rekening:</p>
            <div className="mt-2 space-y-1">
              <p className="font-mono text-lg font-bold text-gold-100">BCA - 1234567890</p>
              <p className="text-sm text-gold-200/40">a.n. Wangiverse Platform</p>
              <p className="mt-2 text-sm text-gold-200/60">
                Jumlah: <span className="font-semibold text-gold-400">{formatRupiah(order.total_price)}</span>
              </p>
            </div>
          </div>

          {/* Upload Payment Proof */}
          {!expired && (
            <div>
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-gold-900/40 bg-surface-200/50 p-6 transition-colors hover:border-gold-700/50 hover:bg-surface-200">
                {uploading ? (
                  <Loader2 size={22} className="animate-spin text-gold-400" />
                ) : (
                  <>
                    <Upload size={22} className="text-gold-200/30" />
                    <p className="mt-2 text-sm font-medium text-gold-200/50">Upload Bukti Bayar</p>
                    <p className="mt-1 text-[11px] text-gold-200/25">JPG, PNG, WebP. Maks 5MB</p>
                  </>
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadPaymentProof(file);
                  }}
                />
              </label>
            </div>
          )}
        </div>
      )}

      {order.status === "paid" && (
        <div className="flex items-center gap-3 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
          <Clock size={20} className="flex-shrink-0 text-blue-400" />
          <div>
            <p className="text-sm font-medium text-blue-400">Menunggu verifikasi pembayaran</p>
            <p className="text-xs text-gold-200/40">Seller akan mengkonfirmasi pembayaran Anda.</p>
          </div>
        </div>
      )}

      {order.status === "confirmed" && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-xl border border-sky-500/20 bg-sky-500/5 p-4">
            <CheckCircle2 size={20} className="flex-shrink-0 text-sky-400" />
            <div>
              <p className="text-sm font-medium text-sky-400">Pembayaran dikonfirmasi</p>
              {!split.is_ready_stock && (
                <p className="text-xs text-gold-200/40">
                  Menunggu semua slot terisi sebelum seller mulai proses decant.
                </p>
              )}
              {split.is_ready_stock && (
                <p className="text-xs text-gold-200/40">
                  Seller akan segera mengirim pesanan Anda.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {order.status === "decanting" && (
        <div className="flex items-center gap-3 rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4">
          <FlaskConical size={20} className="flex-shrink-0 text-indigo-400" />
          <div>
            <p className="text-sm font-medium text-indigo-400">Seller sedang proses decant</p>
            <p className="text-xs text-gold-200/40">
              Parfum sedang di-decant ke botol kecil. Harap tunggu.
            </p>
          </div>
        </div>
      )}

      {order.status === "shipped" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
            <Truck size={20} className="flex-shrink-0 text-violet-400" />
            <div>
              <p className="text-sm font-medium text-violet-400">Pesanan sedang dikirim</p>
              {order.shipping_receipt && (
                <p className="mt-1 font-mono text-sm text-gold-200/60">
                  Resi: {order.shipping_receipt}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={handleConfirmReceived}
            disabled={confirming}
            className="btn-gold flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold text-surface-400"
          >
            {confirming ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Package size={16} />
            )}
            {confirming ? "Memproses..." : "Pesanan Diterima"}
          </button>
          <p className="text-center text-xs text-gold-200/30">
            Pesanan akan otomatis selesai 2 hari setelah dikirim.
          </p>
        </div>
      )}

      {order.status === "completed" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <CheckCircle2 size={20} className="flex-shrink-0 text-emerald-400" />
            <div>
              <p className="text-sm font-medium text-emerald-400">Pesanan selesai</p>
              <p className="text-xs text-gold-200/40">
                Terima kasih telah berbelanja di Wangiverse!
              </p>
            </div>
          </div>

          <Link
            href={`/split/${order.split_id}`}
            className="flex items-center justify-center gap-2 rounded-xl border border-gold-700/30 bg-gold-400/5 py-3 text-sm font-medium text-gold-400 transition-colors hover:bg-gold-400/10"
          >
            <Star size={16} /> Tulis Review
          </Link>
        </div>
      )}

      {order.status === "cancelled" && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
          <XCircle size={20} className="flex-shrink-0 text-red-400" />
          <div>
            <p className="text-sm font-medium text-red-400">Order dibatalkan</p>
            <p className="text-xs text-gold-200/40">
              Order dibatalkan karena tidak melakukan pembayaran dalam 1 jam.
            </p>
          </div>
        </div>
      )}

      {/* Payment Proof Preview */}
      {order.payment_proof_url && (
        <div className="mt-6">
          <p className="mb-2 text-sm font-medium text-gold-200/60">Bukti Pembayaran</p>
          <div className="relative aspect-[3/4] max-w-[200px] overflow-hidden rounded-xl border border-gold-900/15">
            <Image src={order.payment_proof_url} alt="Bukti Bayar" fill className="object-cover" />
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}
    </div>
  );
}
