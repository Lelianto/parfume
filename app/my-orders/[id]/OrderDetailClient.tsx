"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { OrderStatusBadge } from "@/components/StatusBadge";
import { OrderTimeline } from "@/components/OrderTimeline";
import { getTrackingInfo } from "@/lib/tracking";
import { formatRupiah } from "@/lib/utils";
import type { Order, Split, User, PlatformSettings } from "@/types/database";
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
  MessageCircle,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";

function useCountdown(deadline: string | null) {
  const [timeLeft, setTimeLeft] = useState("");
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!deadline) return;
    let interval: ReturnType<typeof setInterval> | null = null;

    function update() {
      const now = Date.now();
      const end = new Date(deadline!).getTime();
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft("00:00");
        setExpired(true);
        if (interval) clearInterval(interval);
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`);
    }

    update();
    interval = setInterval(update, 1000);
    return () => { if (interval) clearInterval(interval); };
  }, [deadline]);

  return { timeLeft, expired };
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available (e.g. non-secure context)
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-gold-200/40 transition-colors hover:bg-gold-400/10 hover:text-gold-400"
    >
      {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
      {copied ? "Tersalin" : "Salin"}
    </button>
  );
}

type OrderWithSplit = Order & {
  split: Split & {
    creator?: User;
  };
};

export function OrderDetailClient({
  order: initialOrder,
  platformSettings,
}: {
  order: OrderWithSplit;
  platformSettings?: PlatformSettings | null;
}) {
  const [order, setOrder] = useState(initialOrder);
  const [uploading, setUploading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const { timeLeft, expired } = useCountdown(
    order.status === "pending_payment" ? order.payment_deadline : null
  );

  const split = order.split!;
  const creator = split.creator;
  const trackingInfo = order.shipping_receipt
    ? getTrackingInfo(order.shipping_receipt)
    : null;

  const refreshOrder = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("orders")
      .select("*, split:splits(*, perfume:perfumes(*), creator:users!splits_created_by_fkey(*))")
      .eq("id", order.id)
      .single();
    if (data) setOrder(data as unknown as OrderWithSplit);
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

  // WhatsApp link ke seller dengan pesan otomatis
  const waMessage = encodeURIComponent(
    `Halo kak, saya ingin menanyakan pesanan saya di Wangiverse.\n\nOrder: ${split.perfume?.brand} - ${split.perfume?.name}\nID: ${order.id.slice(0, 8).toUpperCase()}`
  );
  const waUrl = creator?.whatsapp
    ? `https://wa.me/${creator.whatsapp.replace(/\D/g, "")}?text=${waMessage}`
    : null;

  return (
    <div className="mx-auto max-w-2xl px-4 pb-12 pt-20 md:pt-8">
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
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-gold-400/70">
            {split.perfume?.brand}
          </p>
          <p className="font-display text-xl font-bold text-gold-100 truncate">
            {split.perfume?.name}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            <OrderStatusBadge status={order.status} />
            <span className="text-sm text-gold-200/40">
              {order.size_ml ? `${order.size_ml}ml` : `${order.slots_purchased} slot`}
            </span>
            <span className="text-sm font-semibold text-gold-400">
              {formatRupiah(order.total_price)}
            </span>
          </div>
          <p className="mt-1 font-mono text-[11px] text-gold-200/20">
            #{order.id.slice(0, 8).toUpperCase()}
          </p>
        </div>
      </div>

      <div className="my-6 h-px bg-gradient-to-r from-transparent via-gold-700/15 to-transparent" />

      {/* ── Timeline ── */}
      {order.status !== "cancelled" && (
        <div className="mb-6 rounded-2xl border border-gold-900/20 bg-surface-200/50 p-5">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-gold-200/30">
            Status Pesanan
          </p>
          <OrderTimeline status={order.status} />
        </div>
      )}

      {/* ── Status-specific content ── */}

      {/* PENDING PAYMENT */}
      {order.status === "pending_payment" && (
        <div className="space-y-4">
          {/* Countdown */}
          <div className="flex items-center gap-4 rounded-xl border border-orange-500/20 bg-orange-500/5 p-4">
            <Clock size={24} className="flex-shrink-0 text-orange-400" />
            <div>
              <p className="text-sm font-medium text-orange-300">Batas waktu pembayaran</p>
              <p className={`font-mono text-3xl font-bold tracking-widest ${expired ? "text-red-400" : "text-orange-200"}`}>
                {timeLeft}
              </p>
              {expired && (
                <p className="mt-0.5 text-xs text-red-400">Waktu habis. Order akan segera dibatalkan.</p>
              )}
            </div>
          </div>

          {/* Bank Info — Transfer ke rekening Wangiverse (escrow) */}
          {platformSettings?.bank_name ? (
            <div className="rounded-xl border border-gold-900/20 bg-surface-200/80 p-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-gold-200/30">
                Transfer ke Rekening Wangiverse
              </p>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gold-200/40">Bank</p>
                    <p className="font-semibold text-gold-100">{platformSettings.bank_name}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-surface-300/60 px-4 py-3">
                  <div>
                    <p className="text-xs text-gold-200/40">Nomor Rekening</p>
                    <p className="font-mono text-lg font-bold text-gold-100">
                      {platformSettings.bank_account_number}
                    </p>
                    <p className="text-xs text-gold-200/40">a.n. {platformSettings.bank_account_name}</p>
                  </div>
                  <CopyButton text={platformSettings.bank_account_number ?? ""} />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-gold-700/20 bg-gold-400/5 px-4 py-3">
                  <div>
                    <p className="text-xs text-gold-200/40">Jumlah Transfer</p>
                    <p className="font-display text-xl font-bold text-gold-400">
                      {formatRupiah(order.total_price)}
                    </p>
                  </div>
                  <CopyButton text={String(order.total_price)} />
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-gold-900/20 bg-surface-200/80 p-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-gold-200/30">
                Info pembayaran
              </p>
              <p className="text-sm text-gold-200/40">
                Admin belum mengatur rekening pembayaran. Silakan hubungi admin atau seller.
              </p>
              {waUrl && (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-400 transition-colors hover:bg-emerald-500/15"
                >
                  <MessageCircle size={15} />
                  Tanya Seller via WhatsApp
                </a>
              )}
            </div>
          )}

          {/* Upload Bukti Bayar */}
          {!expired && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-gold-200/30">
                Upload Bukti Transfer
              </p>
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-gold-900/40 bg-surface-200/50 p-8 transition-colors hover:border-gold-700/50 hover:bg-surface-200">
                {uploading ? (
                  <>
                    <Loader2 size={24} className="animate-spin text-gold-400" />
                    <p className="mt-2 text-sm text-gold-200/50">Mengupload...</p>
                  </>
                ) : (
                  <>
                    <Upload size={24} className="text-gold-200/30" />
                    <p className="mt-2 text-sm font-medium text-gold-200/50">Tap untuk upload bukti transfer</p>
                    <p className="mt-1 text-xs text-gold-200/25">JPG, PNG, WebP · Maks 5MB</p>
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

      {/* PAID */}
      {order.status === "paid" && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
            <Clock size={20} className="mt-0.5 flex-shrink-0 text-blue-400" />
            <div>
              <p className="text-sm font-semibold text-blue-300">Bukti bayar diterima</p>
              <p className="mt-0.5 text-xs text-gold-200/40">
                Admin sedang memverifikasi pembayaran kamu. Biasanya selesai dalam 1×24 jam.
              </p>
            </div>
          </div>
          {/* Payment proof preview */}
          {order.payment_proof_url && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-gold-200/30">
                Bukti Pembayaran
              </p>
              <div className="relative aspect-[3/4] max-w-[180px] overflow-hidden rounded-xl border border-gold-900/15">
                <Image src={order.payment_proof_url} alt="Bukti Bayar" fill className="object-cover" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* CONFIRMED */}
      {order.status === "confirmed" && (
        <div className="flex items-start gap-3 rounded-xl border border-sky-500/20 bg-sky-500/5 p-4">
          <CheckCircle2 size={20} className="mt-0.5 flex-shrink-0 text-sky-400" />
          <div>
            <p className="text-sm font-semibold text-sky-300">Pembayaran dikonfirmasi</p>
            <p className="mt-0.5 text-xs text-gold-200/40">
              {split.is_ready_stock
                ? "Seller akan segera memproses dan mengirim pesanan kamu."
                : "Menunggu semua slot terisi, lalu seller akan mulai proses decant."}
            </p>
          </div>
        </div>
      )}

      {/* DECANTING */}
      {order.status === "decanting" && (
        <div className="flex items-start gap-3 rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4">
          <FlaskConical size={20} className="mt-0.5 flex-shrink-0 text-indigo-400" />
          <div>
            <p className="text-sm font-semibold text-indigo-300">Sedang proses decant</p>
            <p className="mt-0.5 text-xs text-gold-200/40">
              Seller sedang mem-filling parfum ke botol kecil. Pesanan akan segera dikirim setelah selesai.
            </p>
          </div>
        </div>
      )}

      {/* SHIPPED */}
      {order.status === "shipped" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
            <div className="flex items-center gap-2 text-violet-300">
              <Truck size={18} />
              <p className="text-sm font-semibold">Pesanan sedang dikirim</p>
            </div>
            {order.shipping_receipt && (
              <div className="mt-3 rounded-lg bg-surface-300/60 px-4 py-3">
                <p className="text-xs text-gold-200/40">Nomor Resi</p>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <p className="font-mono text-base font-bold text-gold-100">
                    {order.shipping_receipt}
                  </p>
                  <CopyButton text={order.shipping_receipt} />
                </div>
                {trackingInfo ? (
                  <a
                    href={trackingInfo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 flex items-center gap-1.5 text-xs font-medium text-gold-400 hover:underline"
                  >
                    <ExternalLink size={12} />
                    Lacak di {trackingInfo.courierName}
                  </a>
                ) : (
                  <a
                    href={`https://cekresi.com/?noresi=${order.shipping_receipt}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 flex items-center gap-1.5 text-xs font-medium text-gold-400 hover:underline"
                  >
                    <ExternalLink size={12} />
                    Lacak Pengiriman
                  </a>
                )}
              </div>
            )}
          </div>

          <button
            onClick={handleConfirmReceived}
            disabled={confirming}
            className="btn-gold flex w-full items-center justify-center gap-2 rounded-xl py-4 text-sm font-semibold text-surface-400"
          >
            {confirming ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Package size={16} />
            )}
            {confirming ? "Memproses..." : "Pesanan Sudah Diterima"}
          </button>
          <p className="text-center text-xs text-gold-200/25">
            Pesanan otomatis selesai 2 hari setelah dikirim jika tidak dikonfirmasi.
          </p>
        </div>
      )}

      {/* COMPLETED */}
      {order.status === "completed" && (
        <div className="space-y-3">
          <div className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <CheckCircle2 size={20} className="mt-0.5 flex-shrink-0 text-emerald-400" />
            <div>
              <p className="text-sm font-semibold text-emerald-300">Pesanan selesai</p>
              <p className="mt-0.5 text-xs text-gold-200/40">
                Terima kasih telah berbelanja di Wangiverse! Bagikan pengalamanmu dengan menulis review.
              </p>
            </div>
          </div>
          <Link
            href={`/split/${order.split_id}`}
            className="flex items-center justify-center gap-2 rounded-xl border border-gold-700/30 bg-gold-400/5 py-3.5 text-sm font-medium text-gold-400 transition-colors hover:bg-gold-400/10"
          >
            <Star size={15} /> Tulis Review
          </Link>
        </div>
      )}

      {/* CANCELLED */}
      {order.status === "cancelled" && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
          <XCircle size={20} className="mt-0.5 flex-shrink-0 text-red-400" />
          <div>
            <p className="text-sm font-semibold text-red-300">Pesanan dibatalkan</p>
            <p className="mt-0.5 text-xs text-gold-200/40">
              Order ini dibatalkan karena tidak melakukan pembayaran dalam batas waktu yang ditentukan.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* ── Divider ── */}
      <div className="my-8 h-px bg-gradient-to-r from-transparent via-gold-700/15 to-transparent" />

      {/* ── Seller Info & Contact ── */}
      {creator && (
        <div className="rounded-2xl border border-gold-900/20 bg-surface-200/50 p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-gold-200/30">
            Seller
          </p>
          <div className="flex items-center gap-3">
            {creator.avatar_url ? (
              <Image
                src={creator.avatar_url}
                alt=""
                width={40}
                height={40}
                className="rounded-full ring-1 ring-gold-700/30"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-400/10 text-gold-400">
                <Droplets size={18} />
              </div>
            )}
            <div className="flex-1">
              <p className="font-medium text-gold-100">{creator.name}</p>
              {creator.city && (
                <p className="text-xs text-gold-200/30">{creator.city}</p>
              )}
            </div>
            <Link
              href={`/seller/${split.created_by}`}
              className="text-xs text-gold-200/30 hover:text-gold-400"
            >
              Lihat Toko →
            </Link>
          </div>

          {waUrl && (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/8 py-3 text-sm font-medium text-emerald-400 transition-colors hover:bg-emerald-500/15"
            >
              <MessageCircle size={16} />
              Hubungi Seller via WhatsApp
            </a>
          )}
        </div>
      )}
    </div>
  );
}
