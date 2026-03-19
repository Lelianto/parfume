"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { OrderStatusBadge } from "@/components/StatusBadge";
import { OrderTimeline } from "@/components/OrderTimeline";
import { getTrackingInfo, isInAppTrackingAvailable, detectCourier } from "@/lib/tracking";
import { formatRupiah } from "@/lib/utils";
import type { Order, Split, User, PlatformSettings, TrackingResult } from "@/types/database";
import { TrackingTimeline } from "@/components/TrackingTimeline";
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
  RefreshCw,
} from "lucide-react";

interface ShippingCostOption {
  code: string;
  name: string;
  service: string;
  type: string;
  price: number;
  estimated: string;
}

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
  const router = useRouter();
  const [order, setOrder] = useState(initialOrder);
  const [uploading, setUploading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [trackingData, setTrackingData] = useState<{ data: TrackingResult; cached: boolean; fetched_at: string } | null>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState("");
  // Ongkir state
  const [shippingCosts, setShippingCosts] = useState<ShippingCostOption[]>([]);
  const [ongkirLoading, setOngkirLoading] = useState(false);
  const [ongkirError, setOngkirError] = useState("");
  const [selectedShipping, setSelectedShipping] = useState<ShippingCostOption | null>(null);
  const [savingShipping, setSavingShipping] = useState(false);
  // If order already has shipping_courier chosen, it's locked in
  const shippingChosen = !!(order.shipping_courier && order.shipping_cost > 0);
  const totalToPay = order.total_price + (shippingChosen ? order.shipping_cost : (selectedShipping?.price ?? 0));
  const { timeLeft, expired } = useCountdown(
    order.status === "pending_payment" ? order.payment_deadline : null
  );

  const split = order.split!;
  const creator = split.creator;
  const trackingInfo = order.shipping_receipt
    ? getTrackingInfo(order.shipping_receipt)
    : null;

  // Determine courier for in-app tracking
  const courierCode = order.shipping_courier || (order.shipping_receipt ? detectCourier(order.shipping_receipt) : null);
  const canTrackInApp = isInAppTrackingAvailable(courierCode);

  // Auto-fetch tracking when shipped
  useEffect(() => {
    if ((order.status === "shipped" || order.status === "completed") && canTrackInApp && order.shipping_receipt && !trackingData) {
      handleCekResi();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.status, order.shipping_receipt]);

  async function handleCekResi() {
    if (!order.shipping_receipt) return;
    setTrackingLoading(true);
    setTrackingError("");

    const courierQuery = courierCode ? `?courier=${courierCode}` : "";
    const res = await fetch(`/api/tracking/${encodeURIComponent(order.shipping_receipt)}${courierQuery}`);
    const result = await res.json();

    if (!res.ok) {
      setTrackingError(result.error || "Gagal mengambil data tracking");
      setTrackingLoading(false);
      return;
    }

    setTrackingData(result);
    setTrackingLoading(false);
  }

  async function handleFetchOngkir() {
    setOngkirLoading(true);
    setOngkirError("");

    const res = await fetch(`/api/orders/${order.id}/shipping-cost`);
    const result = await res.json();

    if (!res.ok) {
      setOngkirError(result.error || "Gagal mengambil data ongkir");
      setOngkirLoading(false);
      return;
    }

    setShippingCosts(result.costs ?? []);
    setOngkirLoading(false);
  }

  async function handleSaveShippingChoice() {
    if (!selectedShipping) return;
    setSavingShipping(true);
    setError("");

    const res = await fetch(`/api/orders/${order.id}/shipping-choice`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shipping_courier: selectedShipping.code,
        shipping_service: `${selectedShipping.name} ${selectedShipping.service}`,
        shipping_cost: selectedShipping.price,
      }),
    });

    const result = await res.json();

    if (!res.ok) {
      setError(result.error || "Gagal menyimpan pilihan kurir");
      setSavingShipping(false);
      return;
    }

    setSavingShipping(false);
    await refreshOrder();
  }

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
    router.push("/my-orders");
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
    router.push("/my-orders");
  }

  // WhatsApp link ke seller dengan pesan otomatis
  const waMessage = encodeURIComponent(
    `Halo kak, saya ingin menanyakan pesanan saya di Wangiverse.\n\nOrder: ${split.perfume?.brand} - ${split.perfume?.name}\nID: ${order.id.slice(0, 8).toUpperCase()}`
  );
  const waUrl = creator?.whatsapp
    ? `https://wa.me/${creator.whatsapp.replace(/\D/g, "")}?text=${waMessage}`
    : null;

  return (
    <div className="mx-auto max-w-3xl px-4 pb-12 pt-20 sm:px-6 md:pt-8">
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
      {order.status !== "cancelled" && order.status !== "rejected" && (
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

          {/* ── Step 1: Pilih Kurir & Ongkir ── */}
          <div className="rounded-xl border border-gold-900/20 bg-surface-200/80 p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-gold-200/30">
              {shippingChosen ? "Kurir Dipilih" : "1. Pilih Kurir Pengiriman"}
            </p>

            {shippingChosen ? (
              /* Already chosen — show summary */
              <div className="flex items-center justify-between rounded-lg bg-surface-300/60 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gold-100">{order.shipping_service}</p>
                  <p className="text-xs text-gold-200/40">Ongkir sudah dikunci</p>
                </div>
                <p className="font-semibold text-gold-400">{formatRupiah(order.shipping_cost)}</p>
              </div>
            ) : (
              /* Not chosen yet */
              <div className="space-y-3">
                {shippingCosts.length === 0 ? (
                  /* Fetch button */
                  <button
                    onClick={handleFetchOngkir}
                    disabled={ongkirLoading || expired}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-gold-700/30 bg-gold-400/5 py-3.5 text-sm font-medium text-gold-400 transition-colors hover:bg-gold-400/10 disabled:opacity-50"
                  >
                    {ongkirLoading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Truck size={16} />
                    )}
                    {ongkirLoading ? "Memuat ongkir..." : "Lihat Pilihan Kurir & Ongkir"}
                  </button>
                ) : (
                  /* Courier options list */
                  <>
                    <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                      {shippingCosts.map((cost, i) => {
                        const isSelected = selectedShipping?.code === cost.code && selectedShipping?.service === cost.service;
                        return (
                          <button
                            key={`${cost.code}-${cost.service}-${i}`}
                            onClick={() => setSelectedShipping(cost)}
                            className={`flex w-full items-center justify-between rounded-lg px-4 py-3 text-left transition-all ${
                              isSelected
                                ? "border border-gold-500/50 bg-gold-400/10 ring-1 ring-gold-400/30"
                                : "border border-gold-900/15 bg-surface-300/50 hover:border-gold-700/30"
                            }`}
                          >
                            <div>
                              <p className={`text-sm font-medium ${isSelected ? "text-gold-100" : "text-gold-200/70"}`}>
                                {cost.name} {cost.service}
                              </p>
                              <p className="text-[11px] text-gold-200/30">
                                {cost.estimated} &middot; {cost.type}
                              </p>
                            </div>
                            <p className={`text-sm font-semibold ${isSelected ? "text-gold-400" : "text-gold-200/50"}`}>
                              {formatRupiah(cost.price)}
                            </p>
                          </button>
                        );
                      })}
                    </div>

                    {selectedShipping && (
                      <button
                        onClick={handleSaveShippingChoice}
                        disabled={savingShipping}
                        className="btn-gold flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold text-surface-400"
                      >
                        {savingShipping ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Check size={16} />
                        )}
                        {savingShipping ? "Menyimpan..." : `Pilih ${selectedShipping.name} ${selectedShipping.service}`}
                      </button>
                    )}
                  </>
                )}

                {ongkirError && (
                  <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
                    {ongkirError}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Step 2: Bank Info — Transfer ke rekening Wangiverse (escrow) ── */}
          {platformSettings?.bank_name ? (
            <div className={`rounded-xl border border-gold-900/20 bg-surface-200/80 p-5 ${!shippingChosen ? "opacity-50 pointer-events-none" : ""}`}>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-gold-200/30">
                {shippingChosen ? "2. Transfer ke Rekening Wangiverse" : "2. Transfer (pilih kurir dulu)"}
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

                {/* Price breakdown */}
                <div className="space-y-2 rounded-lg border border-gold-700/20 bg-gold-400/5 px-4 py-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gold-200/40">Harga produk</span>
                    <span className="text-gold-200/60">{formatRupiah(order.total_price)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gold-200/40">Ongkir ({order.shipping_service || "-"})</span>
                    <span className="text-gold-200/60">{formatRupiah(order.shipping_cost)}</span>
                  </div>
                  <div className="h-px bg-gold-700/20" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gold-200/50">Total Transfer</span>
                    <span className="font-display text-xl font-bold text-gold-400">
                      {formatRupiah(totalToPay)}
                    </span>
                  </div>
                </div>
                <div className="flex justify-end">
                  <CopyButton text={String(totalToPay)} />
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

          {/* ── Step 3: Upload Bukti Bayar ── */}
          {!expired && (
            <div className={!shippingChosen ? "opacity-50 pointer-events-none" : ""}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-gold-200/30">
                {shippingChosen ? "3. Upload Bukti Transfer" : "3. Upload (pilih kurir dulu)"}
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
                  disabled={uploading || !shippingChosen}
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
              Menunggu seller menyiapkan pesanan kamu.
            </p>
          </div>
        </div>
      )}

      {/* DECANTING */}
      {order.status === "decanting" && (
        <div className="flex items-start gap-3 rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4">
          <FlaskConical size={20} className="mt-0.5 flex-shrink-0 text-indigo-400" />
          <div>
            <p className="text-sm font-semibold text-indigo-300">Sedang Disiapkan</p>
            <p className="mt-0.5 text-xs text-gold-200/40">
              Seller sedang menyiapkan pesanan kamu. Pesanan akan segera dikirim setelah selesai.
            </p>
          </div>
        </div>
      )}

      {/* SHIPPED */}
      {order.status === "shipped" && (
        <div className="space-y-4">
          {/* ── Shipping Info Card (Shopee-style) ── */}
          <div className="rounded-2xl border border-emerald-500/15 bg-gradient-to-b from-emerald-500/5 to-transparent overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-emerald-500/10 px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/15">
                  <Truck size={16} className="text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-300">Sedang Dikirim</p>
                  {order.shipping_service && (
                    <p className="text-[11px] text-gold-200/35">{order.shipping_service}</p>
                  )}
                </div>
              </div>
              {order.shipped_at && (
                <p className="text-[10px] text-gold-200/25">
                  {new Date(order.shipped_at).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              )}
            </div>

            {/* AWB / Resi */}
            {order.shipping_receipt && (
              <div className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-gold-200/30">No. Resi</p>
                    <p className="mt-0.5 font-mono text-base font-bold tracking-wider text-gold-100">
                      {order.shipping_receipt}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CopyButton text={order.shipping_receipt} />
                    {trackingInfo ? (
                      <a
                        href={trackingInfo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-gold-400 transition-colors hover:bg-gold-400/10"
                      >
                        <ExternalLink size={12} />
                      </a>
                    ) : (
                      <a
                        href={`https://cekresi.com/?noresi=${order.shipping_receipt}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-gold-400 transition-colors hover:bg-gold-400/10"
                      >
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── In-app Tracking (auto-loaded) ── */}
          {canTrackInApp && order.shipping_receipt && (
            <div className="space-y-3">
              {trackingLoading && !trackingData && (
                <div className="flex items-center justify-center gap-2 rounded-2xl border border-gold-900/15 bg-surface-200/50 py-8 text-sm text-gold-200/40">
                  <Loader2 size={16} className="animate-spin text-gold-400" />
                  Memuat info pengiriman...
                </div>
              )}
              {trackingError && (
                <div className="space-y-2">
                  <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
                    {trackingError}
                  </div>
                  <button
                    onClick={handleCekResi}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-gold-700/30 bg-gold-400/5 py-2.5 text-xs font-medium text-gold-400 transition-colors hover:bg-gold-400/10"
                  >
                    <RefreshCw size={12} /> Coba Lagi
                  </button>
                </div>
              )}
              {trackingData && (
                <div className="rounded-2xl border border-gold-900/15 bg-surface-200/50 p-5">
                  <TrackingTimeline
                    result={trackingData.data}
                    fetchedAt={trackingData.fetched_at}
                    cached={trackingData.cached}
                  />
                  {/* Refresh button */}
                  <button
                    onClick={handleCekResi}
                    disabled={trackingLoading}
                    className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-gold-400/5 py-2 text-[11px] font-medium text-gold-400/60 transition-colors hover:bg-gold-400/10"
                  >
                    {trackingLoading ? (
                      <Loader2 size={11} className="animate-spin" />
                    ) : (
                      <RefreshCw size={11} />
                    )}
                    Perbarui Status
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Not trackable in-app — show external link */}
          {!canTrackInApp && order.shipping_receipt && (
            <a
              href={trackingInfo?.url || `https://cekresi.com/?noresi=${order.shipping_receipt}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl border border-gold-700/30 bg-gold-400/5 py-3.5 text-sm font-medium text-gold-400 transition-colors hover:bg-gold-400/10"
            >
              <ExternalLink size={16} />
              Lacak di {trackingInfo?.courierName || "Website Kurir"}
            </a>
          )}

          {/* Confirm received */}
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

          {/* In-app tracking for completed orders (auto-loaded) */}
          {canTrackInApp && order.shipping_receipt && (
            <div className="space-y-2">
              {trackingLoading && !trackingData && (
                <div className="flex items-center justify-center gap-2 rounded-2xl border border-gold-900/15 bg-surface-200/50 py-6 text-sm text-gold-200/40">
                  <Loader2 size={14} className="animate-spin text-gold-400" />
                  Memuat info pengiriman...
                </div>
              )}
              {trackingError && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
                  {trackingError}
                </div>
              )}
              {trackingData && (
                <div className="rounded-2xl border border-gold-900/15 bg-surface-200/50 p-5">
                  <TrackingTimeline
                    result={trackingData.data}
                    fetchedAt={trackingData.fetched_at}
                    cached={trackingData.cached}
                  />
                </div>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            <Link
              href={`/split/${order.split_id}`}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gold-700/30 bg-gold-400/5 py-3.5 text-sm font-medium text-gold-400 transition-colors hover:bg-gold-400/10"
            >
              <Star size={15} /> Tulis Review
            </Link>
            <Link
              href={`/split/${order.split_id}`}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 py-3.5 text-sm font-medium text-emerald-400 transition-colors hover:bg-emerald-500/10"
            >
              <RefreshCw size={15} /> Pesan Lagi
            </Link>
          </div>
        </div>
      )}

      {/* REJECTED (by admin) */}
      {order.status === "rejected" && (
        <div className="space-y-3">
          <div className="flex items-start gap-3 rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
            <XCircle size={20} className="mt-0.5 flex-shrink-0 text-rose-400" />
            <div>
              <p className="text-sm font-semibold text-rose-300">Pembayaran Ditolak</p>
              <p className="mt-0.5 text-xs text-gold-200/40">
                Pembayaran kamu ditolak oleh admin. Silakan periksa alasan di bawah ini.
              </p>
            </div>
          </div>
          {order.reject_reason && (
            <div className="rounded-xl border border-rose-500/15 bg-rose-500/5 p-4">
              <p className="text-xs font-semibold text-rose-400/70 mb-1">Alasan Penolakan</p>
              <p className="text-sm text-rose-300">{order.reject_reason}</p>
            </div>
          )}
        </div>
      )}

      {/* CANCELLED (by buyer/seller/expired) */}
      {order.status === "cancelled" && (
        <div className="space-y-3">
          <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
            <XCircle size={20} className="mt-0.5 flex-shrink-0 text-red-400" />
            <div>
              <p className="text-sm font-semibold text-red-300">Pesanan Dibatalkan</p>
              <p className="mt-0.5 text-xs text-gold-200/40">
                Order ini dibatalkan karena tidak melakukan pembayaran dalam batas waktu yang ditentukan.
              </p>
            </div>
          </div>
          <Link
            href={`/split/${order.split_id}`}
            className="flex items-center justify-center gap-2 rounded-xl border border-gold-700/30 bg-gold-400/5 py-3.5 text-sm font-medium text-gold-400 transition-colors hover:bg-gold-400/10"
          >
            <RefreshCw size={15} /> Pesan Ulang
          </Link>
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
