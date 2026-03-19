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
  CheckCircle2,
} from "lucide-react";
import { formatRupiah } from "@/lib/utils";
import {
  getCartGroupedBySeller,
  removeFromCart,
  updateCartQuantity,
  clearCartForSellers,
  getCartCount,
} from "@/lib/cart";
import type { CartSellerGroup } from "@/lib/cart";
import type { ShippingAddress } from "@/types/database";

type CheckoutStep = "cart" | "address" | "checkout";

interface AddressOption {
  id: string;
  name: string;
}

export function CartClient() {
  const router = useRouter();
  const [groups, setGroups] = useState<CartSellerGroup[]>([]);
  const [mounted, setMounted] = useState(false);

  // Checkout state
  const [step, setStep] = useState<CheckoutStep>("cart");
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
    if (step === "address" && provinces.length === 0) {
      fetch("/api/address?type=provinces")
        .then((r) => r.json())
        .then((d) => setProvinces(d))
        .catch(() => {});
    }
  }, [step, provinces.length]);

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
    if (!isAddressComplete() || groups.length === 0) return;
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Silakan login terlebih dahulu");
      setLoading(false);
      return;
    }

    const seller_groups = groups.map((g) => ({
      seller_id: g.sellerId,
      items: g.items.map((i) => ({
        variant_id: i.variantId,
        quantity: i.quantity,
      })),
    }));

    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        seller_groups,
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

    // Clear cart for all sellers in this checkout
    clearCartForSellers(groups.map((g) => g.sellerId));
    setLoading(false);
    router.push(`/checkout/${result.checkout_id}`);
  }

  const selectClass =
    "w-full rounded-xl border border-gold-900/30 bg-surface-400 px-3 py-2.5 text-sm text-gold-100 outline-none transition-colors focus:border-gold-700/50 focus:ring-1 focus:ring-gold-700/30 disabled:opacity-40";
  const inputClass = "input-dark mt-1 w-full";

  if (!mounted) return null;

  const totalItemCount = groups.reduce((sum, g) => sum + g.items.length, 0);
  const grandTotal = groups.reduce((sum, g) => sum + g.totalPrice, 0);

  // ── Step: Address ──
  if (step === "address") {
    return (
      <div className="mx-auto max-w-2xl px-4 pb-8 pt-20 sm:px-6 md:pt-8">
        <button
          onClick={() => { setStep("cart"); setError(""); }}
          className="mb-6 flex items-center gap-1.5 text-sm text-gold-200/40 transition-colors hover:text-gold-400"
        >
          <ChevronLeft size={16} /> Kembali ke Keranjang
        </button>

        {/* Step indicator */}
        <div className="mb-6 flex items-center gap-2">
          <div className="h-1 flex-1 rounded-full bg-gold-400" />
          <div className="h-1 flex-1 rounded-full bg-gold-400" />
          <div className="h-1 flex-1 rounded-full bg-gold-900/20" />
        </div>

        <h1 className="font-display text-2xl font-bold text-gold-100">
          Alamat Pengiriman
        </h1>
        <p className="mt-1 text-sm text-gold-200/40">
          Alamat ini digunakan untuk semua pesanan
        </p>

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
            onClick={() => setStep("checkout")}
            disabled={!isAddressComplete()}
            className="btn-gold flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold text-surface-400 disabled:opacity-40"
          >
            Lanjut ke Konfirmasi <ChevronRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  // ── Step: Checkout Confirmation (Shopee-style) ──
  if (step === "checkout") {
    return (
      <div className="mx-auto max-w-2xl px-4 pb-8 pt-20 sm:px-6 md:pt-8">
        <button
          onClick={() => { setStep("address"); setError(""); }}
          className="mb-6 flex items-center gap-1.5 text-sm text-gold-200/40 transition-colors hover:text-gold-400"
        >
          <ChevronLeft size={16} /> Kembali
        </button>

        {/* Step indicator */}
        <div className="mb-6 flex items-center gap-2">
          <div className="h-1 flex-1 rounded-full bg-gold-400" />
          <div className="h-1 flex-1 rounded-full bg-gold-400" />
          <div className="h-1 flex-1 rounded-full bg-gold-400" />
        </div>

        <h1 className="font-display text-2xl font-bold text-gold-100">
          Konfirmasi Pesanan
        </h1>
        <p className="mt-1 text-sm text-gold-200/40">
          {groups.length} toko · {totalItemCount} item
        </p>

        <div className="mt-6 space-y-4">
          {/* Shipping Address Summary */}
          <div className="rounded-xl border border-gold-900/20 bg-surface-200/80 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-gold-200/30">
                Alamat Pengiriman
              </p>
              <button
                onClick={() => setStep("address")}
                className="flex items-center gap-1 text-[11px] font-medium text-gold-400 transition-colors hover:text-gold-300"
              >
                <Pencil size={10} /> Ubah
              </button>
            </div>
            <div className="mt-2 flex items-start gap-2.5">
              <MapPin size={14} className="mt-0.5 flex-shrink-0 text-gold-400/50" />
              <div className="text-sm">
                <p className="font-medium text-gold-100">
                  {activeAddress.name}
                  <span className="ml-2 font-normal text-gold-200/40">{activeAddress.phone}</span>
                </p>
                <p className="mt-0.5 text-xs text-gold-200/40">
                  {activeAddress.address}, {[activeAddress.village, activeAddress.district, activeAddress.city, activeAddress.province].filter(Boolean).join(", ")} {activeAddress.postal_code}
                </p>
              </div>
            </div>
          </div>

          {/* Seller Groups */}
          {groups.map((group) => (
            <div
              key={group.sellerId}
              className="rounded-xl border border-gold-900/20 bg-surface-200/80 overflow-hidden"
            >
              {/* Seller header */}
              <div className="flex items-center gap-2.5 border-b border-gold-900/15 px-4 py-3">
                <Store size={14} className="text-gold-400" />
                <span className="text-sm font-medium text-gold-100">{group.sellerName}</span>
                {group.sellerCity && (
                  <span className="text-[11px] text-gold-200/30">· {group.sellerCity}</span>
                )}
              </div>

              {/* Items */}
              <div className="divide-y divide-gold-900/10 px-4">
                {group.items.map((item) => (
                  <div key={`${item.splitId}-${item.variantId}`} className="flex gap-3 py-3">
                    <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg border border-gold-900/10 bg-surface-300">
                      {item.bottlePhotoUrl ? (
                        <Image src={item.bottlePhotoUrl} alt="" fill className="object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-gold-800/30">
                          <Droplets size={16} />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gold-100">
                        {item.perfumeName}
                        {item.perfumeVariant && <span className="text-gold-200/50"> — {item.perfumeVariant}</span>}
                      </p>
                      <p className="text-xs text-gold-200/40">
                        {item.sizeMl}ml · {formatRupiah(item.price)} × {item.quantity}
                      </p>
                    </div>
                    <p className="flex-shrink-0 text-sm font-semibold text-gold-400">
                      {formatRupiah(item.price * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Subtotal */}
              <div className="flex items-center justify-between border-t border-gold-900/15 bg-gold-400/3 px-4 py-3">
                <span className="text-xs text-gold-200/40">
                  Subtotal ({group.items.length} item)
                </span>
                <span className="text-sm font-semibold text-gold-100">
                  {formatRupiah(group.totalPrice)}
                </span>
              </div>
            </div>
          ))}

          {/* Order Summary */}
          <div className="rounded-xl border border-gold-700/20 bg-gold-400/5 p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gold-200/40">Total Produk ({totalItemCount} item)</span>
              <span className="text-gold-200/60">{formatRupiah(grandTotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gold-200/40">Ongkir</span>
              <span className="text-xs text-gold-200/30">Dihitung setelah checkout</span>
            </div>
            <div className="h-px bg-gold-700/20" />
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gold-200/50">Total Pesanan</span>
              <span className="font-display text-2xl font-bold text-gold-400">
                {formatRupiah(grandTotal)}
              </span>
            </div>
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
              <>
                <CheckCircle2 size={16} />
                Buat Pesanan — {formatRupiah(grandTotal)}
              </>
            )}
          </button>

          <p className="text-center text-xs text-gold-200/30">
            Dengan membeli, Anda setuju untuk menyelesaikan pembayaran dalam 1 jam.
          </p>
        </div>
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

              {/* Group subtotal */}
              <div className="mt-4 flex items-center justify-between rounded-xl border border-gold-700/20 bg-gold-400/5 p-4">
                <span className="text-sm font-medium text-gold-200/60">
                  Subtotal ({group.items.length} item)
                </span>
                <span className="font-display text-xl font-bold text-gold-400">
                  {formatRupiah(group.totalPrice)}
                </span>
              </div>
            </div>
          ))}

          {/* Grand Total + Checkout All */}
          <div className="sticky bottom-0 -mx-4 border-t border-gold-900/20 bg-surface-400/95 px-4 pb-6 pt-4 backdrop-blur-xl sm:-mx-6 sm:px-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gold-200/60">
                  Total ({totalItemCount} item dari {groups.length} toko)
                </p>
                <p className="font-display text-2xl font-bold text-gold-400">
                  {formatRupiah(grandTotal)}
                </p>
              </div>
              <button
                onClick={() => {
                  setStep("address");
                  setError("");
                }}
                className="btn-gold flex items-center gap-2 rounded-xl px-8 py-3.5 text-sm font-semibold text-surface-400"
              >
                Checkout <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
