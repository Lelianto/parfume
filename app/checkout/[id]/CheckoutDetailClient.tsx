"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { OrderStatusBadge } from "@/components/StatusBadge";
import { OrderTimeline } from "@/components/OrderTimeline";
import { formatRupiah } from "@/lib/utils";
import type { Checkout, OrderGroup, PlatformSettings } from "@/types/database";
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
  Store,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface ShippingCostOption {
  code: string;
  name: string;
  service: string;
  type: string;
  price: number;
  estimated: string;
}

interface GroupShippingState {
  costs: ShippingCostOption[];
  loading: boolean;
  error: string;
  selected: ShippingCostOption | null;
  saving: boolean;
  expanded: boolean;
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

export function CheckoutDetailClient({
  checkout: initialCheckout,
  orderGroups: initialGroups,
  platformSettings,
}: {
  checkout: Checkout;
  orderGroups: (OrderGroup & { seller?: { id: string; name: string; avatar_url: string | null; city: string | null; store_city: string | null; whatsapp: string | null } })[];
  platformSettings?: PlatformSettings | null;
}) {
  const router = useRouter();
  const [checkout, setCheckout] = useState(initialCheckout);
  const [orderGroups, setOrderGroups] = useState(initialGroups);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  // Per-group shipping state
  const [groupShipping, setGroupShipping] = useState<Record<string, GroupShippingState>>(() => {
    const state: Record<string, GroupShippingState> = {};
    for (const g of initialGroups) {
      state[g.id] = {
        costs: [],
        loading: false,
        error: "",
        selected: null,
        saving: false,
        expanded: true,
      };
    }
    return state;
  });

  const { timeLeft, expired } = useCountdown(
    checkout.status === "pending_payment" ? checkout.payment_deadline : null
  );

  // Check if ALL groups have shipping selected
  const allShippingChosen = orderGroups.every(
    (g) => g.shipping_courier && g.shipping_cost > 0
  );

  const totalProductPrice = orderGroups.reduce((sum, g) => sum + g.total_product_price, 0);
  const totalShippingCost = orderGroups.reduce((sum, g) => sum + g.shipping_cost, 0);
  const totalSelectedShipping = orderGroups.reduce((sum, g) => {
    if (g.shipping_courier && g.shipping_cost > 0) return sum + g.shipping_cost;
    const gs = groupShipping[g.id];
    return sum + (gs?.selected?.price ?? 0);
  }, 0);
  const grandTotal = totalProductPrice + (allShippingChosen ? totalShippingCost : totalSelectedShipping);

  const refreshCheckout = useCallback(async () => {
    const supabase = createClient();
    const { data: co } = await supabase
      .from("checkouts")
      .select("*")
      .eq("id", checkout.id)
      .single();
    if (co) setCheckout(co as unknown as Checkout);

    const { data: rawGroups } = await supabase
      .from("order_groups")
      .select(`*, orders:orders(*, split:splits(*, perfume:perfumes(*)), variant:split_variants(*))`)
      .eq("checkout_id", checkout.id)
      .order("created_at", { ascending: true });

    if (rawGroups) {
      const sellerIds = [...new Set(rawGroups.map((g) => g.seller_id))];
      const sellersMap: Record<string, { id: string; name: string; avatar_url: string | null; city: string | null; store_city: string | null; whatsapp: string | null }> = {};
      if (sellerIds.length > 0) {
        const { data: sellers } = await supabase
          .from("users")
          .select("id, name, avatar_url, city, store_city, whatsapp")
          .in("id", sellerIds);
        for (const s of sellers ?? []) sellersMap[s.id] = s;
      }
      setOrderGroups(rawGroups.map((g) => ({ ...g, seller: sellersMap[g.seller_id] ?? null })) as unknown as typeof initialGroups);
    }
  }, [checkout.id]);

  function updateGroupState(groupId: string, update: Partial<GroupShippingState>) {
    setGroupShipping((prev) => ({
      ...prev,
      [groupId]: { ...prev[groupId], ...update },
    }));
  }

  async function handleFetchOngkir(groupId: string) {
    updateGroupState(groupId, { loading: true, error: "" });
    // Reuse existing shipping-cost API which works per order_group
    const costRes = await fetch(`/api/orders/group/${groupId}/shipping-cost`);
    const result = await costRes.json();

    if (!costRes.ok) {
      updateGroupState(groupId, { loading: false, error: result.error || "Gagal mengambil ongkir" });
      return;
    }
    updateGroupState(groupId, { loading: false, costs: result.costs ?? [] });
  }

  async function handleSaveShippingChoice(groupId: string) {
    const gs = groupShipping[groupId];
    if (!gs?.selected) return;
    updateGroupState(groupId, { saving: true });

    const costRes = await fetch(`/api/orders/group/${groupId}/shipping-choice`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shipping_courier: gs.selected.code,
        shipping_service: `${gs.selected.name} ${gs.selected.service}`,
        shipping_cost: gs.selected.price,
      }),
    });

    const result = await costRes.json();
    if (!costRes.ok) {
      updateGroupState(groupId, { saving: false, error: result.error || "Gagal simpan kurir" });
      return;
    }

    updateGroupState(groupId, { saving: false });

    // Update total shipping on checkout
    await refreshCheckout();

    // Recalculate checkout totals
    const supabase = createClient();
    const { data: groups } = await supabase
      .from("order_groups")
      .select("shipping_cost")
      .eq("checkout_id", checkout.id);
    const totalShip = groups?.reduce((s, g) => s + (g.shipping_cost || 0), 0) ?? 0;
    await supabase
      .from("checkouts")
      .update({
        total_shipping_cost: totalShip,
        grand_total: checkout.total_product_price + totalShip,
      })
      .eq("id", checkout.id);

    await refreshCheckout();
  }

  async function handleUploadPaymentProof(file: File) {
    setUploading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`/api/checkout/${checkout.id}/payment-proof`, {
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

  const allOrders = orderGroups.flatMap((g) => g.orders ?? []);

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
            Checkout
          </p>
          <h1 className="font-display text-xl font-bold text-gold-100">
            {orderGroups.length} toko · {allOrders.length} item
          </h1>
          <p className="mt-1 font-mono text-[11px] text-gold-200/20">
            #{checkout.id.slice(0, 8).toUpperCase()}
          </p>
        </div>
        <OrderStatusBadge status={checkout.status} />
      </div>

      {/* Timeline */}
      {checkout.status !== "cancelled" && checkout.status !== "rejected" && (
        <div className="my-6 rounded-2xl border border-gold-900/20 bg-surface-200/50 p-5">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-gold-200/30">
            Status Pesanan
          </p>
          <OrderTimeline status={checkout.status} />
        </div>
      )}

      {/* PENDING PAYMENT flow */}
      {checkout.status === "pending_payment" && (
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

          {/* Step 1: Shipping per seller */}
          <div className="rounded-xl border border-gold-900/20 bg-surface-200/80 p-5">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-gold-200/30">
              1. Pilih Kurir Pengiriman
            </p>

            <div className="space-y-3">
              {orderGroups.map((group) => {
                const orders = group.orders ?? [];
                const seller = group.seller;
                const gs = groupShipping[group.id];
                const shippingChosen = !!(group.shipping_courier && group.shipping_cost > 0);

                return (
                  <div key={group.id} className="rounded-xl border border-gold-900/15 bg-surface-300/30 overflow-hidden">
                    {/* Seller header with items preview */}
                    <button
                      onClick={() => updateGroupState(group.id, { expanded: !gs?.expanded })}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-300/50"
                    >
                      <Store size={14} className="flex-shrink-0 text-gold-400" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gold-100">{seller?.name || "Seller"}</p>
                        <p className="text-[11px] text-gold-200/30">
                          {orders.length} item · {formatRupiah(group.total_product_price)}
                        </p>
                      </div>
                      {shippingChosen ? (
                        <div className="flex items-center gap-2">
                          <Check size={14} className="text-emerald-400" />
                          <span className="text-xs font-medium text-emerald-400">{formatRupiah(group.shipping_cost)}</span>
                        </div>
                      ) : gs?.selected ? (
                        <span className="text-xs font-medium text-gold-400">{formatRupiah(gs.selected.price)}</span>
                      ) : null}
                      {gs?.expanded ? <ChevronUp size={14} className="text-gold-200/30" /> : <ChevronDown size={14} className="text-gold-200/30" />}
                    </button>

                    {gs?.expanded && (
                      <div className="border-t border-gold-900/10 px-4 py-3">
                        {/* Item previews */}
                        <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
                          {orders.slice(0, 4).map((order) => (
                            <div key={order.id} className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg border border-gold-900/10 bg-surface-300">
                              {order.split?.bottle_photo_url ? (
                                <Image src={order.split.bottle_photo_url} alt="" fill className="object-cover" />
                              ) : (
                                <div className="flex h-full items-center justify-center text-gold-800/30">
                                  <Droplets size={12} />
                                </div>
                              )}
                            </div>
                          ))}
                          {orders.length > 4 && (
                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-gold-900/10 bg-surface-300 text-[10px] text-gold-200/40">
                              +{orders.length - 4}
                            </div>
                          )}
                        </div>

                        {/* Shipping selection */}
                        {shippingChosen ? (
                          <div className="flex items-center justify-between rounded-lg bg-emerald-500/5 border border-emerald-500/15 px-3 py-2.5">
                            <div>
                              <p className="text-sm font-medium text-gold-100">{group.shipping_service}</p>
                              <p className="text-[11px] text-gold-200/40">Kurir sudah dipilih</p>
                            </div>
                            <p className="font-semibold text-emerald-400">{formatRupiah(group.shipping_cost)}</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {gs?.costs.length === 0 && !gs?.loading ? (
                              <button
                                onClick={() => handleFetchOngkir(group.id)}
                                disabled={expired}
                                className="flex w-full items-center justify-center gap-2 rounded-lg border border-gold-700/30 bg-gold-400/5 py-2.5 text-xs font-medium text-gold-400 transition-colors hover:bg-gold-400/10 disabled:opacity-50"
                              >
                                {gs?.loading ? <Loader2 size={14} className="animate-spin" /> : <Truck size={14} />}
                                Lihat Pilihan Kurir
                              </button>
                            ) : gs?.loading ? (
                              <div className="flex items-center justify-center gap-2 py-4 text-xs text-gold-200/40">
                                <Loader2 size={14} className="animate-spin" /> Memuat ongkir...
                              </div>
                            ) : (
                              <>
                                <div className="max-h-56 space-y-1.5 overflow-y-auto">
                                  {gs?.costs.map((cost, i) => {
                                    const isSelected = gs.selected?.code === cost.code && gs.selected?.service === cost.service;
                                    return (
                                      <button
                                        key={`${cost.code}-${cost.service}-${i}`}
                                        onClick={() => updateGroupState(group.id, { selected: cost })}
                                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-all ${isSelected
                                          ? "border border-gold-500/50 bg-gold-400/10 ring-1 ring-gold-400/30"
                                          : "border border-gold-900/15 bg-surface-300/50 hover:border-gold-700/30"
                                        }`}
                                      >
                                        <div>
                                          <p className={`text-xs font-medium ${isSelected ? "text-gold-100" : "text-gold-200/70"}`}>
                                            {cost.name} {cost.service}
                                          </p>
                                          <p className="text-[10px] text-gold-200/30">
                                            {cost.estimated} · {cost.type}
                                          </p>
                                        </div>
                                        <p className={`text-xs font-semibold ${isSelected ? "text-gold-400" : "text-gold-200/50"}`}>
                                          {formatRupiah(cost.price)}
                                        </p>
                                      </button>
                                    );
                                  })}
                                </div>
                                {gs?.selected && (
                                  <button
                                    onClick={() => handleSaveShippingChoice(group.id)}
                                    disabled={gs.saving}
                                    className="btn-gold flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold text-surface-400"
                                  >
                                    {gs.saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                                    {gs.saving ? "Menyimpan..." : `Pilih ${gs.selected.name} ${gs.selected.service}`}
                                  </button>
                                )}
                              </>
                            )}
                            {gs?.error && (
                              <p className="text-xs text-red-400">{gs.error}</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step 2: Transfer info */}
          {platformSettings?.bank_name ? (
            <div className={`rounded-xl border border-gold-900/20 bg-surface-200/80 p-5 transition-opacity ${!allShippingChosen ? "pointer-events-none opacity-40" : ""}`}>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-gold-200/30">
                {allShippingChosen ? "2. Transfer ke Rekening Wangiverse" : "2. Transfer (pilih semua kurir dulu)"}
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

                {/* Price breakdown per seller */}
                <div className="space-y-2 rounded-lg border border-gold-700/20 bg-gold-400/5 px-4 py-3">
                  {orderGroups.map((g) => (
                    <div key={g.id} className="flex items-center justify-between text-sm">
                      <span className="text-gold-200/40 truncate max-w-[60%]">
                        {g.seller?.name || "Seller"} ({(g.orders ?? []).length} item)
                      </span>
                      <span className="text-gold-200/60">{formatRupiah(g.total_product_price)}</span>
                    </div>
                  ))}
                  <div className="h-px bg-gold-700/15" />
                  {orderGroups.map((g) => {
                    if (!g.shipping_courier || !g.shipping_cost) return null;
                    return (
                      <div key={`ship-${g.id}`} className="flex items-center justify-between text-sm">
                        <span className="text-gold-200/40 truncate max-w-[60%]">
                          Ongkir {g.seller?.name} ({g.shipping_service})
                        </span>
                        <span className="text-gold-200/60">{formatRupiah(g.shipping_cost)}</span>
                      </div>
                    );
                  })}
                  <div className="h-px bg-gold-700/20" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gold-200/50">Total Transfer</span>
                    <span className="font-display text-xl font-bold text-gold-400">
                      {formatRupiah(grandTotal)}
                    </span>
                  </div>
                </div>
                <div className="flex justify-end">
                  <CopyButton text={String(grandTotal)} />
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-gold-900/20 bg-surface-200/80 p-5">
              <p className="text-sm text-gold-200/40">
                Admin belum mengatur rekening pembayaran.
              </p>
            </div>
          )}

          {/* Step 3: Upload */}
          {!expired && (
            <div className={!allShippingChosen ? "pointer-events-none opacity-40" : ""}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-gold-200/30">
                {allShippingChosen ? "3. Upload Bukti Transfer" : "3. Upload (pilih semua kurir dulu)"}
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
                  disabled={uploading || !allShippingChosen}
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
      {checkout.status === "paid" && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
            <Clock size={20} className="mt-0.5 flex-shrink-0 text-blue-400" />
            <div>
              <p className="text-sm font-semibold text-blue-300">Bukti bayar diterima</p>
              <p className="mt-0.5 text-xs text-gold-200/40">
                Admin sedang memverifikasi pembayaran kamu.
              </p>
            </div>
          </div>
          {checkout.payment_proof_url && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-gold-200/30">
                Bukti Pembayaran
              </p>
              <div className="relative aspect-[3/4] max-w-[180px] overflow-hidden rounded-xl border border-gold-900/15">
                <Image src={checkout.payment_proof_url} alt="Bukti Bayar" fill className="object-cover" />
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Order Groups Detail */}
      <div className="my-8 h-px bg-gradient-to-r from-transparent via-gold-700/15 to-transparent" />

      <p className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-gold-200/30">
        Detail Pesanan
      </p>

      <div className="space-y-4">
        {orderGroups.map((group) => {
          const orders = group.orders ?? [];
          const seller = group.seller;
          return (
            <div key={group.id} className="rounded-2xl border border-gold-900/20 bg-surface-200/50 overflow-hidden">
              {/* Seller header */}
              <div className="flex items-center gap-3 border-b border-gold-900/15 px-4 py-3">
                {seller?.avatar_url ? (
                  <Image src={seller.avatar_url} alt="" width={32} height={32} className="rounded-full ring-1 ring-gold-700/30" />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gold-400/10">
                    <Store size={14} className="text-gold-400" />
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium text-gold-100">{seller?.name || "Seller"}</p>
                  {(seller?.store_city || seller?.city) && (
                    <p className="text-[11px] text-gold-200/30">{seller?.store_city || seller?.city}</p>
                  )}
                </div>
                <Link href={`/order-group/${group.id}`} className="text-[11px] text-gold-200/30 hover:text-gold-400">
                  Detail →
                </Link>
              </div>

              {/* Orders */}
              <div className="divide-y divide-gold-900/10">
                {orders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/my-orders/${order.id}`}
                    className="flex gap-3 px-4 py-3 transition-colors hover:bg-surface-300/30"
                  >
                    <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg border border-gold-900/10 bg-surface-300">
                      {order.split?.bottle_photo_url ? (
                        <Image src={order.split.bottle_photo_url} alt="" fill className="object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-gold-800/30">
                          <Droplets size={14} />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gold-100">
                        {order.split?.perfume?.name}
                      </p>
                      <p className="text-xs text-gold-200/40">
                        {order.size_ml}ml × {order.slots_purchased}
                      </p>
                    </div>
                    <p className="flex-shrink-0 text-sm font-medium text-gold-400">
                      {formatRupiah(order.total_price)}
                    </p>
                  </Link>
                ))}
              </div>

              {/* Group subtotal + shipping */}
              <div className="border-t border-gold-900/15 bg-gold-400/3 px-4 py-2.5 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gold-200/40">Subtotal produk</span>
                  <span className="text-gold-200/60">{formatRupiah(group.total_product_price)}</span>
                </div>
                {group.shipping_courier && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gold-200/40">Ongkir ({group.shipping_service})</span>
                    <span className="text-gold-200/60">{formatRupiah(group.shipping_cost)}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Seller contact */}
      {orderGroups.some((g) => g.seller?.whatsapp) && (
        <>
          <div className="my-6 h-px bg-gradient-to-r from-transparent via-gold-700/15 to-transparent" />
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-gold-200/30">
            Hubungi Seller
          </p>
          <div className="space-y-2">
            {orderGroups.map((g) => {
              if (!g.seller?.whatsapp) return null;
              const waMessage = encodeURIComponent(
                `Halo kak, saya ingin menanyakan pesanan saya di Wangiverse.\n\nCheckout ID: ${checkout.id.slice(0, 8).toUpperCase()}`
              );
              const waUrl = `https://wa.me/${g.seller.whatsapp.replace(/\D/g, "")}?text=${waMessage}`;
              return (
                <a
                  key={g.id}
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-xl border border-emerald-500/15 bg-emerald-500/5 px-4 py-3 text-sm font-medium text-emerald-400 transition-colors hover:bg-emerald-500/10"
                >
                  <MessageCircle size={16} />
                  <span>{g.seller.name}</span>
                </a>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
