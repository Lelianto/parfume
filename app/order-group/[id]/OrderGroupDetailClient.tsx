"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { OrderStatusBadge } from "@/components/StatusBadge";
import { OrderTimeline } from "@/components/OrderTimeline";
import { formatRupiah } from "@/lib/utils";
import type { OrderGroup, PlatformSettings } from "@/types/database";
import {
  ArrowLeft,
  Upload,
  Clock,
  Truck,
  Loader2,
  Droplets,
  MessageCircle,
  Copy,
  Check,
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
    } catch { /* clipboard not available */ }
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

export function OrderGroupDetailClient({
  group: initialGroup,
  platformSettings,
}: {
  group: OrderGroup;
  platformSettings?: PlatformSettings | null;
}) {
  const router = useRouter();
  const [group, setGroup] = useState(initialGroup);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  // Ongkir state
  const [shippingCosts, setShippingCosts] = useState<ShippingCostOption[]>([]);
  const [ongkirLoading, setOngkirLoading] = useState(false);
  const [ongkirError, setOngkirError] = useState("");
  const [selectedShipping, setSelectedShipping] = useState<ShippingCostOption | null>(null);
  const [savingShipping, setSavingShipping] = useState(false);

  const shippingChosen = !!(group.shipping_courier && group.shipping_cost > 0);
  const totalToPay = group.total_product_price + (shippingChosen ? group.shipping_cost : (selectedShipping?.price ?? 0));
  const { timeLeft, expired } = useCountdown(
    group.status === "pending_payment" ? group.payment_deadline : null
  );

  const seller = group.seller;
  const orders = group.orders ?? [];

  const waMessage = encodeURIComponent(
    `Halo kak, saya ingin menanyakan pesanan grup saya di Wangiverse.\n\nGroup ID: ${group.id.slice(0, 8).toUpperCase()}`
  );
  const waUrl = seller?.whatsapp
    ? `https://wa.me/${seller.whatsapp.replace(/\D/g, "")}?text=${waMessage}`
    : null;

  const refreshGroup = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("order_groups")
      .select(
        `*, orders:orders(*, split:splits(*, perfume:perfumes(*)), variant:split_variants(*))`
      )
      .eq("id", group.id)
      .single();
    if (data) {
      const { data: seller } = await supabase
        .from("users")
        .select("*")
        .eq("id", data.seller_id)
        .single();
      setGroup({ ...data, seller } as unknown as OrderGroup);
    }
  }, [group.id]);

  async function handleFetchOngkir() {
    setOngkirLoading(true);
    setOngkirError("");
    const res = await fetch(`/api/orders/group/${group.id}/shipping-cost`);
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

    const res = await fetch(`/api/orders/group/${group.id}/shipping-choice`, {
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
    await refreshGroup();
  }

  async function handleUploadPaymentProof(file: File) {
    setUploading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`/api/orders/group/${group.id}/payment-proof`, {
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
    router.push("/orders");
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pb-12 pt-20 sm:px-6 md:pt-8">
      <Link
        href="/orders"
        className="mb-6 hidden items-center gap-1.5 text-sm text-gold-200/40 transition-colors hover:text-gold-400 md:inline-flex"
      >
        <ArrowLeft size={16} /> Kembali ke Pesanan
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-gold-400/70">
            Pesanan Grup
          </p>
          <h1 className="font-display text-xl font-bold text-gold-100">
            {orders.length} item dari {seller?.name || "Seller"}
          </h1>
          <p className="mt-1 font-mono text-[11px] text-gold-200/20">
            #{group.id.slice(0, 8).toUpperCase()}
          </p>
        </div>
        <OrderStatusBadge status={group.status} />
      </div>

      {/* Items list */}
      <div className="mt-6 space-y-2">
        {orders.map((order) => (
          <Link
            key={order.id}
            href={`/my-orders/${order.id}`}
            className="flex gap-3 rounded-xl border border-gold-900/15 bg-surface-200/60 p-3 transition-colors hover:border-gold-700/30"
          >
            <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg border border-gold-900/10 bg-surface-300">
              {order.split?.bottle_photo_url ? (
                <Image src={order.split.bottle_photo_url} alt="" fill className="object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-gold-800/30">
                  <Droplets size={18} />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gold-400/60">
                {order.split?.perfume?.brand}
              </p>
              <p className="truncate text-sm font-medium text-gold-100">
                {order.split?.perfume?.name}
              </p>
              <div className="mt-1 flex items-center gap-3 text-xs text-gold-200/40">
                <span>{order.size_ml}ml × {order.slots_purchased}</span>
                <span className="font-medium text-gold-400">{formatRupiah(order.total_price)}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="my-6 h-px bg-gradient-to-r from-transparent via-gold-700/15 to-transparent" />

      {/* Timeline */}
      {group.status !== "cancelled" && group.status !== "rejected" && (
        <div className="mb-6 rounded-2xl border border-gold-900/20 bg-surface-200/50 p-5">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-gold-200/30">
            Status Pesanan
          </p>
          <OrderTimeline status={group.status} />
        </div>
      )}

      {/* PENDING PAYMENT flow */}
      {group.status === "pending_payment" && (
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

          {/* Step 1: Pilih Kurir */}
          <div className="rounded-xl border border-gold-900/20 bg-surface-200/80 p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-gold-200/30">
              {shippingChosen ? "Kurir Dipilih" : "1. Pilih Kurir Pengiriman"}
            </p>

            {shippingChosen ? (
              <div className="flex items-center justify-between rounded-lg bg-surface-300/60 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gold-100">{group.shipping_service}</p>
                  <p className="text-xs text-gold-200/40">Ongkir sudah dikunci</p>
                </div>
                <p className="font-semibold text-gold-400">{formatRupiah(group.shipping_cost)}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {shippingCosts.length === 0 ? (
                  <button
                    onClick={handleFetchOngkir}
                    disabled={ongkirLoading || expired}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-gold-700/30 bg-gold-400/5 py-3.5 text-sm font-medium text-gold-400 transition-colors hover:bg-gold-400/10 disabled:opacity-50"
                  >
                    {ongkirLoading ? <Loader2 size={16} className="animate-spin" /> : <Truck size={16} />}
                    {ongkirLoading ? "Memuat ongkir..." : "Lihat Pilihan Kurir & Ongkir"}
                  </button>
                ) : (
                  <>
                    <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                      {shippingCosts.map((cost, i) => {
                        const isSelected = selectedShipping?.code === cost.code && selectedShipping?.service === cost.service;
                        return (
                          <button
                            key={`${cost.code}-${cost.service}-${i}`}
                            onClick={() => setSelectedShipping(cost)}
                            className={`flex w-full items-center justify-between rounded-lg px-4 py-3 text-left transition-all ${isSelected
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
                        {savingShipping ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
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

          {/* Step 2: Transfer info */}
          {platformSettings?.bank_name ? (
            <div className={`rounded-xl border border-gold-900/20 bg-surface-200/80 p-5 ${!shippingChosen ? "pointer-events-none opacity-50" : ""}`}>
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
                    <span className="text-gold-200/40">Harga produk ({orders.length} item)</span>
                    <span className="text-gold-200/60">{formatRupiah(group.total_product_price)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gold-200/40">Ongkir ({group.shipping_service || "-"})</span>
                    <span className="text-gold-200/60">{formatRupiah(group.shipping_cost)}</span>
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
              <p className="text-sm text-gold-200/40">
                Admin belum mengatur rekening pembayaran.
              </p>
              {waUrl && (
                <a href={waUrl} target="_blank" rel="noopener noreferrer"
                  className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-400 transition-colors hover:bg-emerald-500/15">
                  <MessageCircle size={15} /> Tanya Seller via WhatsApp
                </a>
              )}
            </div>
          )}

          {/* Step 3: Upload */}
          {!expired && (
            <div className={!shippingChosen ? "pointer-events-none opacity-50" : ""}>
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
                    <p className="mt-1 text-xs text-gold-200/25">JPG, PNG, WebP - Maks 5MB</p>
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
      {group.status === "paid" && (
        <div className="flex items-start gap-3 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
          <Clock size={20} className="mt-0.5 flex-shrink-0 text-blue-400" />
          <div>
            <p className="text-sm font-semibold text-blue-300">Bukti bayar diterima</p>
            <p className="mt-0.5 text-xs text-gold-200/40">
              Admin sedang memverifikasi pembayaran kamu.
            </p>
          </div>
        </div>
      )}

      {group.payment_proof_url && group.status === "paid" && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-gold-200/30">
            Bukti Pembayaran
          </p>
          <div className="relative aspect-[3/4] max-w-[180px] overflow-hidden rounded-xl border border-gold-900/15">
            <Image src={group.payment_proof_url} alt="Bukti Bayar" fill className="object-cover" />
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Seller Info */}
      <div className="my-8 h-px bg-gradient-to-r from-transparent via-gold-700/15 to-transparent" />

      {seller && (
        <div className="rounded-2xl border border-gold-900/20 bg-surface-200/50 p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-gold-200/30">
            Seller
          </p>
          <div className="flex items-center gap-3">
            {seller.avatar_url ? (
              <Image src={seller.avatar_url} alt="" width={40} height={40} className="rounded-full ring-1 ring-gold-700/30" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-400/10 text-gold-400">
                <Droplets size={18} />
              </div>
            )}
            <div className="flex-1">
              <p className="font-medium text-gold-100">{seller.name}</p>
              {seller.city && <p className="text-xs text-gold-200/30">{seller.city}</p>}
            </div>
            <Link href={`/seller/${group.seller_id}`} className="text-xs text-gold-200/30 hover:text-gold-400">
              Lihat Toko →
            </Link>
          </div>
          {waUrl && (
            <a href={waUrl} target="_blank" rel="noopener noreferrer"
              className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/8 py-3 text-sm font-medium text-emerald-400 transition-colors hover:bg-emerald-500/15">
              <MessageCircle size={16} /> Hubungi Seller via WhatsApp
            </a>
          )}
        </div>
      )}
    </div>
  );
}
