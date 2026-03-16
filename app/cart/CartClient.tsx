"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  ShoppingCart,
  Trash2,
  Minus,
  Plus,
  Droplets,
  MapPin,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Pencil,
  Store,
} from "lucide-react";
import { formatRupiah } from "@/lib/utils";
import {
  getCartGroupedBySeller,
  removeFromCart,
  updateCartQuantity,
  clearCartForSeller,
  getCartCount,
} from "@/lib/cart";
import type { CartSellerGroup } from "@/lib/cart";
import type { ShippingAddress } from "@/types/database";

type CheckoutStep = "review" | "address" | "confirm";

interface AddressOption {
  id: string;
  name: string;
}

export function CartClient() {
  const router = useRouter();
  const [groups, setGroups] = useState<CartSellerGroup[]>([]);
  const [mounted, setMounted] = useState(false);

  // Checkout state
  const [checkoutSeller, setCheckoutSeller] = useState<CartSellerGroup | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>("review");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Address state
  const [address, setAddress] = useState<ShippingAddress>({
    name: "", phone: "", province: "", city: "",
    district: "", village: "", postal_code: "", address: "",
  });
  const [provinceId, setProvinceId] = useState("");
  const [cityId, setCityId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [provinces, setProvinces] = useState<AddressOption[]>([]);
  const [cities, setCities] = useState<AddressOption[]>([]);
  const [districts, setDistricts] = useState<AddressOption[]>([]);
  const [villages, setVillages] = useState<AddressOption[]>([]);
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [savedAddress, setSavedAddress] = useState<ShippingAddress | null>(null);
  const [useSavedAddress, setUseSavedAddress] = useState(true);
  const [editingAddress, setEditingAddress] = useState(false);

  useEffect(() => {
    setGroups(getCartGroupedBySeller());
    setMounted(true);
  }, []);

  function refreshCart() {
    setGroups(getCartGroupedBySeller());
  }

  function handleRemoveItem(splitId: string, variantId: string) {
    removeFromCart(splitId, variantId);
    refreshCart();
  }

  function handleUpdateQty(splitId: string, variantId: string, qty: number) {
    updateCartQuantity(splitId, variantId, qty);
    refreshCart();
  }

  // ── Address helpers ──
  useEffect(() => {
    async function loadSavedAddress() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("users")
        .select("address_name, address_phone, address_province, address_city, address_district, address_village, address_postal_code, address_detail")
        .eq("id", user.id)
        .single();

      if (data?.address_name) {
        const saved: ShippingAddress = {
          name: data.address_name || "",
          phone: data.address_phone || "",
          province: data.address_province || "",
          city: data.address_city || "",
          district: data.address_district || "",
          village: data.address_village || "",
          postal_code: data.address_postal_code || "",
          address: data.address_detail || "",
        };
        setSavedAddress(saved);
        setAddress(saved);
        setUseSavedAddress(true);
        setEditingAddress(false);
      } else {
        setUseSavedAddress(false);
        setEditingAddress(true);
      }
    }
    loadSavedAddress();
  }, []);

  useEffect(() => {
    if (checkoutStep === "address" && provinces.length === 0) {
      fetch("/api/address?type=provinces")
        .then((r) => r.json())
        .then((d) => setProvinces(d))
        .catch(() => {});
    }
  }, [checkoutStep, provinces.length]);

  const fetchCities = useCallback(async (provId: string) => {
    setCities([]); setDistricts([]); setVillages([]);
    setCityId(""); setDistrictId("");
    setAddress((a) => ({ ...a, city: "", district: "", village: "" }));
    if (!provId) return;
    setLoadingAddress(true);
    const res = await fetch(`/api/address?type=regencies&id=${provId}`);
    setCities(await res.json());
    setLoadingAddress(false);
  }, []);

  const fetchDistricts = useCallback(async (cId: string) => {
    setDistricts([]); setVillages([]);
    setDistrictId("");
    setAddress((a) => ({ ...a, district: "", village: "" }));
    if (!cId) return;
    setLoadingAddress(true);
    const res = await fetch(`/api/address?type=districts&id=${cId}`);
    setDistricts(await res.json());
    setLoadingAddress(false);
  }, []);

  const fetchVillages = useCallback(async (dId: string) => {
    setVillages([]);
    setAddress((a) => ({ ...a, village: "" }));
    if (!dId) return;
    setLoadingAddress(true);
    const res = await fetch(`/api/address?type=villages&id=${dId}`);
    setVillages(await res.json());
    setLoadingAddress(false);
  }, []);

  const activeAddress = useSavedAddress && savedAddress && !editingAddress ? savedAddress : address;

  function isAddressComplete() {
    return (
      activeAddress.name.trim() &&
      activeAddress.phone.trim() &&
      activeAddress.province.trim() &&
      activeAddress.city.trim() &&
      activeAddress.district.trim() &&
      activeAddress.village.trim() &&
      activeAddress.postal_code.trim() &&
      activeAddress.address.trim()
    );
  }

  function handleSwitchToNewAddress() {
    setUseSavedAddress(false);
    setEditingAddress(true);
    setAddress({ name: "", phone: "", province: "", city: "", district: "", village: "", postal_code: "", address: "" });
    setProvinceId(""); setCityId(""); setDistrictId("");
    setCities([]); setDistricts([]); setVillages([]);
  }

  function handleUseSavedAddress() {
    if (!savedAddress) return;
    setUseSavedAddress(true);
    setEditingAddress(false);
    setAddress(savedAddress);
  }

  // ── Checkout submit ──
  async function handleCheckout() {
    if (!checkoutSeller || !isAddressComplete()) return;
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Silakan login terlebih dahulu");
      setLoading(false);
      return;
    }

    // Call batch API
    const res = await fetch("/api/orders/group", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        seller_id: checkoutSeller.sellerId,
        items: checkoutSeller.items.map((i) => ({
          variant_id: i.variantId,
          quantity: i.quantity,
        })),
        address: activeAddress,
      }),
    });

    const result = await res.json();

    if (!res.ok) {
      setError(result.error || "Gagal membuat pesanan");
      setLoading(false);
      return;
    }

    // Save new address as default if applicable
    if (!useSavedAddress || !savedAddress) {
      await supabase
        .from("users")
        .update({
          address_name: activeAddress.name,
          address_phone: activeAddress.phone,
          address_province: activeAddress.province,
          address_city: activeAddress.city,
          address_district: activeAddress.district,
          address_village: activeAddress.village,
          address_postal_code: activeAddress.postal_code,
          address_detail: activeAddress.address,
        })
        .eq("id", user.id);
    }

    // Clear cart for this seller
    clearCartForSeller(checkoutSeller.sellerId);
    setLoading(false);
    router.push(`/order-group/${result.group_id}`);
  }

  const selectClass =
    "w-full rounded-xl border border-gold-900/30 bg-surface-400 px-3 py-2.5 text-sm text-gold-100 outline-none transition-colors focus:border-gold-700/50 focus:ring-1 focus:ring-gold-700/30 disabled:opacity-40";
  const inputClass = "input-dark mt-1 w-full";

  if (!mounted) return null;

  // ── Checkout Flow ──
  if (checkoutSeller) {
    return (
      <div className="mx-auto max-w-2xl px-4 pb-8 pt-20 sm:px-6 md:pt-8">
        <button
          onClick={() => {
            if (checkoutStep === "review") {
              setCheckoutSeller(null);
            } else if (checkoutStep === "address") {
              setCheckoutStep("review");
            } else {
              setCheckoutStep("address");
            }
            setError("");
          }}
          className="mb-6 flex items-center gap-1.5 text-sm text-gold-200/40 transition-colors hover:text-gold-400"
        >
          <ChevronLeft size={16} />
          {checkoutStep === "review" ? "Kembali ke Keranjang" : "Kembali"}
        </button>

        {/* Step indicator */}
        <div className="mb-6 flex items-center gap-2">
          {(["review", "address", "confirm"] as CheckoutStep[]).map((s, i) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                (["review", "address", "confirm"] as CheckoutStep[]).indexOf(checkoutStep) >= i
                  ? "bg-gold-400"
                  : "bg-gold-900/20"
              }`}
            />
          ))}
        </div>

        <h1 className="font-display text-2xl font-bold text-gold-100">
          {checkoutStep === "review" && "Review Pesanan"}
          {checkoutStep === "address" && "Alamat Pengiriman"}
          {checkoutStep === "confirm" && "Konfirmasi Checkout"}
        </h1>
        <p className="mt-1 text-sm text-gold-200/40">
          Seller: {checkoutSeller.sellerName}
        </p>

        {/* STEP: REVIEW */}
        {checkoutStep === "review" && (
          <div className="mt-6 space-y-3">
            {checkoutSeller.items.map((item) => (
              <div
                key={`${item.splitId}-${item.variantId}`}
                className="flex gap-3 rounded-xl border border-gold-900/20 bg-surface-200/80 p-3"
              >
                <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border border-gold-900/15 bg-surface-300">
                  {item.bottlePhotoUrl ? (
                    <Image src={item.bottlePhotoUrl} alt="" fill className="object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-gold-800/30">
                      <Droplets size={20} />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gold-400/60">
                    {item.perfumeBrand}
                  </p>
                  <p className="truncate text-sm font-medium text-gold-100">
                    {item.perfumeName}
                    {item.perfumeVariant && <span className="text-gold-200/50"> — {item.perfumeVariant}</span>}
                  </p>
                  <p className="text-xs text-gold-200/40">
                    {item.sizeMl}ml · {formatRupiah(item.price)} × {item.quantity}
                  </p>
                  <p className="text-sm font-semibold text-gold-400">
                    {formatRupiah(item.price * item.quantity)}
                  </p>
                </div>
              </div>
            ))}

            <div className="flex items-center justify-between rounded-xl border border-gold-700/20 bg-gold-400/5 p-4">
              <span className="text-sm font-medium text-gold-200/60">Total Produk</span>
              <span className="font-display text-2xl font-bold text-gold-400">
                {formatRupiah(checkoutSeller.totalPrice)}
              </span>
            </div>

            <button
              onClick={() => setCheckoutStep("address")}
              className="btn-gold flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold text-surface-400"
            >
              Lanjut ke Alamat <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* STEP: ADDRESS */}
        {checkoutStep === "address" && (
          <div className="mt-6 space-y-3">
            {savedAddress && !editingAddress && (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <MapPin size={16} className="mt-0.5 flex-shrink-0 text-emerald-400" />
                    <div className="text-sm">
                      <p className="font-medium text-gold-100">{savedAddress.name}</p>
                      <p className="text-gold-200/50">{savedAddress.phone}</p>
                      <p className="mt-1 text-xs text-gold-200/40">{savedAddress.address}</p>
                      <p className="text-xs text-gold-200/40">
                        {[savedAddress.village, savedAddress.district, savedAddress.city, savedAddress.province]
                          .filter(Boolean).join(", ")}
                      </p>
                      {savedAddress.postal_code && (
                        <p className="text-xs text-gold-200/30">{savedAddress.postal_code}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={handleSwitchToNewAddress}
                    className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-gold-400 transition-colors hover:bg-gold-400/10"
                  >
                    <Pencil size={11} /> Ganti
                  </button>
                </div>
              </div>
            )}

            {editingAddress && (
              <div className="space-y-3">
                {savedAddress && (
                  <button
                    onClick={handleUseSavedAddress}
                    className="flex w-full items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5 text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-500/10"
                  >
                    <MapPin size={13} /> Gunakan alamat tersimpan
                  </button>
                )}

                <div>
                  <label className="block text-sm font-medium text-gold-200/60">Nama Penerima *</label>
                  <input type="text" value={address.name} onChange={(e) => setAddress((a) => ({ ...a, name: e.target.value }))} placeholder="Nama lengkap penerima" className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gold-200/60">No. HP Penerima *</label>
                  <input type="tel" value={address.phone} onChange={(e) => setAddress((a) => ({ ...a, phone: e.target.value }))} placeholder="08xxxxxxxxxx" className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gold-200/60">Provinsi *</label>
                  <select value={provinceId} onChange={(e) => { setProvinceId(e.target.value); const p = provinces.find((x) => x.id === e.target.value); setAddress((a) => ({ ...a, province: p?.name || "" })); fetchCities(e.target.value); }} className={selectClass + " mt-1"}>
                    <option value="">Pilih Provinsi</option>
                    {provinces.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gold-200/60">Kota/Kabupaten *</label>
                  <select value={cityId} onChange={(e) => { setCityId(e.target.value); const c = cities.find((x) => x.id === e.target.value); setAddress((a) => ({ ...a, city: c?.name || "" })); fetchDistricts(e.target.value); }} disabled={!provinceId} className={selectClass + " mt-1"}>
                    <option value="">Pilih Kota/Kabupaten</option>
                    {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gold-200/60">Kecamatan *</label>
                  <select value={districtId} onChange={(e) => { setDistrictId(e.target.value); const d = districts.find((x) => x.id === e.target.value); setAddress((a) => ({ ...a, district: d?.name || "" })); fetchVillages(e.target.value); }} disabled={!cityId} className={selectClass + " mt-1"}>
                    <option value="">Pilih Kecamatan</option>
                    {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gold-200/60">Kelurahan/Desa *</label>
                  <select value={villages.find((v) => v.name === address.village)?.id || ""} onChange={(e) => { const v = villages.find((x) => x.id === e.target.value); setAddress((a) => ({ ...a, village: v?.name || "" })); }} disabled={!districtId} className={selectClass + " mt-1"}>
                    <option value="">Pilih Kelurahan/Desa</option>
                    {villages.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gold-200/60">Kode Pos *</label>
                  <input type="text" value={address.postal_code} onChange={(e) => setAddress((a) => ({ ...a, postal_code: e.target.value }))} placeholder="12345" maxLength={5} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gold-200/60">Alamat Lengkap & Patokan *</label>
                  <textarea value={address.address} onChange={(e) => setAddress((a) => ({ ...a, address: e.target.value }))} placeholder="Nama jalan, nomor rumah, RT/RW, patokan..." rows={3} className={inputClass + " resize-none"} />
                </div>
              </div>
            )}

            {loadingAddress && (
              <div className="flex items-center gap-2 text-xs text-gold-200/40">
                <Loader2 size={12} className="animate-spin" /> Memuat data wilayah...
              </div>
            )}

            <button
              onClick={() => setCheckoutStep("confirm")}
              disabled={!isAddressComplete()}
              className="btn-gold flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold text-surface-400 disabled:opacity-40"
            >
              Lanjut ke Konfirmasi <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* STEP: CONFIRM */}
        {checkoutStep === "confirm" && (
          <div className="mt-6 space-y-4">
            {/* Items summary */}
            <div className="rounded-xl border border-gold-900/20 bg-surface-200/80 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-gold-200/30">
                Item Pesanan
              </p>
              {checkoutSeller.items.map((item) => (
                <div key={`${item.splitId}-${item.variantId}`} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-gold-200/60">
                    {item.perfumeName} {item.sizeMl}ml × {item.quantity}
                  </span>
                  <span className="font-medium text-gold-100">
                    {formatRupiah(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            {/* Address summary */}
            <div className="rounded-xl border border-gold-900/20 bg-surface-200/80 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-gold-200/30">
                Alamat Pengiriman
              </p>
              <div className="text-sm">
                <p className="font-medium text-gold-100">{activeAddress.name}</p>
                <p className="text-gold-200/50">{activeAddress.phone}</p>
                <p className="mt-1 text-xs text-gold-200/40">{activeAddress.address}</p>
                <p className="text-xs text-gold-200/40">
                  {[activeAddress.village, activeAddress.district, activeAddress.city, activeAddress.province]
                    .filter(Boolean).join(", ")}
                </p>
              </div>
            </div>

            {/* Total */}
            <div className="flex items-center justify-between rounded-xl border border-gold-700/20 bg-gold-400/5 p-4">
              <div>
                <span className="text-sm font-medium text-gold-200/60">Total Produk</span>
                <p className="text-xs text-gold-200/30">Ongkir dihitung setelah checkout</p>
              </div>
              <span className="font-display text-2xl font-bold text-gold-400">
                {formatRupiah(checkoutSeller.totalPrice)}
              </span>
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <button
              onClick={handleCheckout}
              disabled={loading}
              className="btn-gold flex w-full items-center justify-center gap-2 rounded-xl py-4 text-sm font-semibold text-surface-400 disabled:opacity-50"
            >
              {loading ? (
                <><Loader2 size={16} className="animate-spin" /> Memproses...</>
              ) : (
                `Checkout — ${formatRupiah(checkoutSeller.totalPrice)}`
              )}
            </button>

            <p className="text-center text-xs text-gold-200/30">
              Dengan membeli, Anda setuju untuk menyelesaikan pembayaran dalam 1 jam.
            </p>
          </div>
        )}
      </div>
    );
  }

  // ── Cart View ──
  return (
    <div className="mx-auto max-w-3xl px-4 pb-8 pt-20 sm:px-6 md:pt-8">
      <div className="flex items-center gap-3">
        <ShoppingCart size={22} className="text-gold-400" />
        <h1 className="font-display text-2xl font-bold text-gold-100">Keranjang</h1>
        {groups.length > 0 && (
          <span className="text-sm text-gold-200/40">
            ({getCartCount()} item)
          </span>
        )}
      </div>

      {groups.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-dashed border-gold-900/30 py-16 text-center">
          <ShoppingCart size={48} className="mx-auto text-gold-800/30" />
          <p className="mt-4 text-gold-200/50">Keranjang kosong.</p>
          <Link
            href="/"
            className="btn-gold mt-4 inline-block rounded-lg px-6 py-2.5 text-sm font-medium text-surface-400"
          >
            Jelajahi Split
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {groups.map((group) => (
            <div
              key={group.sellerId}
              className="rounded-2xl border border-gold-900/20 bg-surface-200/50 p-5"
            >
              {/* Seller header */}
              <div className="mb-4 flex items-center gap-3 border-b border-gold-900/15 pb-3">
                <Store size={16} className="text-gold-400" />
                <div className="flex-1">
                  <Link href={`/seller/${group.sellerId}`} className="text-sm font-medium text-gold-100 hover:text-gold-400">
                    {group.sellerName}
                  </Link>
                  {group.sellerCity && (
                    <p className="flex items-center gap-1 text-[11px] text-gold-200/30">
                      <MapPin size={9} /> {group.sellerCity}
                    </p>
                  )}
                </div>
              </div>

              {/* Items */}
              <div className="space-y-3">
                {group.items.map((item) => {
                  const available = item.stock - item.sold;
                  return (
                    <div
                      key={`${item.splitId}-${item.variantId}`}
                      className="flex gap-3 rounded-xl border border-gold-900/15 bg-surface-300/50 p-3"
                    >
                      <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border border-gold-900/10 bg-surface-300">
                        {item.bottlePhotoUrl ? (
                          <Image src={item.bottlePhotoUrl} alt="" fill className="object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-gold-800/30">
                            <Droplets size={18} />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gold-400/60">
                          {item.perfumeBrand}
                        </p>
                        <p className="truncate text-sm font-medium text-gold-100">
                          {item.perfumeName}
                          {item.perfumeVariant && <span className="text-gold-200/50"> — {item.perfumeVariant}</span>}
                        </p>
                        <p className="text-xs text-gold-200/40">{item.sizeMl}ml · {formatRupiah(item.price)}</p>

                        <div className="mt-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleUpdateQty(item.splitId, item.variantId, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                              className="rounded-md border border-gold-900/30 p-1 text-gold-200/50 transition-colors hover:text-gold-400 disabled:opacity-30"
                            >
                              <Minus size={12} />
                            </button>
                            <span className="min-w-[1.5rem] text-center text-sm font-semibold text-gold-100">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => handleUpdateQty(item.splitId, item.variantId, item.quantity + 1)}
                              disabled={item.quantity >= available}
                              className="rounded-md border border-gold-900/30 p-1 text-gold-200/50 transition-colors hover:text-gold-400 disabled:opacity-30"
                            >
                              <Plus size={12} />
                            </button>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold text-gold-400">
                              {formatRupiah(item.price * item.quantity)}
                            </span>
                            <button
                              onClick={() => handleRemoveItem(item.splitId, item.variantId)}
                              className="rounded-md p-1.5 text-red-400/60 transition-colors hover:bg-red-500/10 hover:text-red-400"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Group total + checkout */}
              <div className="mt-4 flex items-center justify-between rounded-xl border border-gold-700/20 bg-gold-400/5 p-4">
                <span className="text-sm font-medium text-gold-200/60">
                  Subtotal ({group.items.length} item)
                </span>
                <span className="font-display text-xl font-bold text-gold-400">
                  {formatRupiah(group.totalPrice)}
                </span>
              </div>

              <button
                onClick={() => {
                  setCheckoutSeller(group);
                  setCheckoutStep("review");
                  setError("");
                }}
                className="btn-gold mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold text-surface-400"
              >
                Checkout — {formatRupiah(group.totalPrice)}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
