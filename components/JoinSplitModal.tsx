"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { X, Minus, Plus, ChevronRight, ChevronLeft, MapPin, Loader2 } from "lucide-react";
import type { Split, SplitVariant, ShippingAddress } from "@/types/database";
import { formatRupiah } from "@/lib/utils";

interface AddressOption {
  id: string;
  name: string;
}

interface JoinSplitModalProps {
  split: Split;
  variant: SplitVariant;
  onClose: () => void;
  onSuccess: () => void;
}

export function JoinSplitModal({ split, variant, onClose, onSuccess }: JoinSplitModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<"quantity" | "address">("quantity");
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Address state
  const [address, setAddress] = useState<ShippingAddress>({
    name: "",
    phone: "",
    province: "",
    city: "",
    district: "",
    village: "",
    postal_code: "",
    address: "",
  });
  const [provinceId, setProvinceId] = useState("");
  const [cityId, setCityId] = useState("");
  const [districtId, setDistrictId] = useState("");

  const [provinces, setProvinces] = useState<AddressOption[]>([]);
  const [cities, setCities] = useState<AddressOption[]>([]);
  const [districts, setDistricts] = useState<AddressOption[]>([]);
  const [villages, setVillages] = useState<AddressOption[]>([]);
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [savedAddressLoaded, setSavedAddressLoaded] = useState(false);

  const available = variant.stock - variant.sold;
  const totalPrice = quantity * variant.price;

  // Load saved address from user profile
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
        setAddress({
          name: data.address_name || "",
          phone: data.address_phone || "",
          province: data.address_province || "",
          city: data.address_city || "",
          district: data.address_district || "",
          village: data.address_village || "",
          postal_code: data.address_postal_code || "",
          address: data.address_detail || "",
        });
        setSavedAddressLoaded(true);
      }
    }
    loadSavedAddress();
  }, []);

  // Fetch provinces on mount
  useEffect(() => {
    fetch("/api/address?type=provinces")
      .then((r) => r.json())
      .then((d) => setProvinces(d))
      .catch(() => {});
  }, []);

  const fetchCities = useCallback(async (provId: string) => {
    setCities([]);
    setDistricts([]);
    setVillages([]);
    setCityId("");
    setDistrictId("");
    setAddress((a) => ({ ...a, city: "", district: "", village: "" }));
    if (!provId) return;
    setLoadingAddress(true);
    const res = await fetch(`/api/address?type=regencies&id=${provId}`);
    const data = await res.json();
    setCities(data);
    setLoadingAddress(false);
  }, []);

  const fetchDistricts = useCallback(async (cId: string) => {
    setDistricts([]);
    setVillages([]);
    setDistrictId("");
    setAddress((a) => ({ ...a, district: "", village: "" }));
    if (!cId) return;
    setLoadingAddress(true);
    const res = await fetch(`/api/address?type=districts&id=${cId}`);
    const data = await res.json();
    setDistricts(data);
    setLoadingAddress(false);
  }, []);

  const fetchVillages = useCallback(async (dId: string) => {
    setVillages([]);
    setAddress((a) => ({ ...a, village: "" }));
    if (!dId) return;
    setLoadingAddress(true);
    const res = await fetch(`/api/address?type=villages&id=${dId}`);
    const data = await res.json();
    setVillages(data);
    setLoadingAddress(false);
  }, []);

  function handleProvinceChange(provId: string) {
    setProvinceId(provId);
    const prov = provinces.find((p) => p.id === provId);
    setAddress((a) => ({ ...a, province: prov?.name || "" }));
    fetchCities(provId);
  }

  function handleCityChange(cId: string) {
    setCityId(cId);
    const c = cities.find((x) => x.id === cId);
    setAddress((a) => ({ ...a, city: c?.name || "" }));
    fetchDistricts(cId);
  }

  function handleDistrictChange(dId: string) {
    setDistrictId(dId);
    const d = districts.find((x) => x.id === dId);
    setAddress((a) => ({ ...a, district: d?.name || "" }));
    fetchVillages(dId);
  }

  function handleVillageChange(vId: string) {
    const v = villages.find((x) => x.id === vId);
    setAddress((a) => ({ ...a, village: v?.name || "" }));
  }

  function isAddressComplete() {
    return (
      address.name.trim() &&
      address.phone.trim() &&
      address.province.trim() &&
      address.city.trim() &&
      address.district.trim() &&
      address.village.trim() &&
      address.postal_code.trim() &&
      address.address.trim()
    );
  }

  async function handleJoin() {
    if (!isAddressComplete()) {
      setError("Semua field alamat wajib diisi");
      return;
    }

    setLoading(true);
    setError("");

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setError("Silakan login terlebih dahulu");
      setLoading(false);
      return;
    }

    // 1. Create order via RPC
    const { data: orderId, error: rpcError } = await supabase.rpc("join_split_v2", {
      p_variant_id: variant.id,
      p_user_id: user.id,
      p_quantity: quantity,
    });

    if (rpcError) {
      setError(rpcError.message);
      setLoading(false);
      return;
    }

    // 2. Save shipping address to order
    await supabase
      .from("orders")
      .update({
        shipping_name: address.name,
        shipping_phone: address.phone,
        shipping_province: address.province,
        shipping_city: address.city,
        shipping_district: address.district,
        shipping_village: address.village,
        shipping_postal_code: address.postal_code,
        shipping_address: address.address,
      })
      .eq("id", orderId);

    // 3. Save as default address if user doesn't have one
    if (!savedAddressLoaded) {
      await supabase
        .from("users")
        .update({
          address_name: address.name,
          address_phone: address.phone,
          address_province: address.province,
          address_city: address.city,
          address_district: address.district,
          address_village: address.village,
          address_postal_code: address.postal_code,
          address_detail: address.address,
        })
        .eq("id", user.id);
    }

    onSuccess();
    router.push(`/my-orders/${orderId}`);
  }

  const selectClass =
    "w-full rounded-xl border border-gold-900/30 bg-surface-400 px-3 py-2.5 text-sm text-gold-100 outline-none transition-colors focus:border-gold-700/50 focus:ring-1 focus:ring-gold-700/30 disabled:opacity-40";
  const inputClass =
    "input-dark mt-1 w-full";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-gold-900/30 bg-surface-300 p-6 sm:rounded-2xl">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl font-bold text-gold-100">
            {step === "quantity" ? "Gabung Split" : "Alamat Pengiriman"}
          </h3>
          <button onClick={onClose} className="rounded-lg p-1 text-gold-200/50 hover:bg-gold-900/30 hover:text-gold-400">
            <X size={20} />
          </button>
        </div>

        {/* Step indicator */}
        <div className="mt-3 flex items-center gap-2">
          <div className={`h-1 flex-1 rounded-full ${step === "quantity" ? "bg-gold-400" : "bg-gold-400/30"}`} />
          <div className={`h-1 flex-1 rounded-full ${step === "address" ? "bg-gold-400" : "bg-gold-900/20"}`} />
        </div>

        {step === "quantity" && (
          <>
            <div className="mt-4 rounded-xl border border-gold-900/20 bg-surface-400/80 p-4">
              <p className="text-sm font-medium text-gold-100">
                {split.perfume?.brand} - {split.perfume?.name}{split.perfume?.variant ? ` — ${split.perfume.variant}` : ""}
              </p>
              <p className="mt-1 text-sm text-gold-200/40">
                Ukuran: <span className="font-semibold text-gold-300">{variant.size_ml}ml</span>
              </p>
              <p className="mt-0.5 text-sm text-gold-200/40">
                Harga: <span className="font-semibold text-gold-300">{formatRupiah(variant.price)}</span> per botol
              </p>
              <p className="mt-0.5 text-sm text-gold-200/40">
                Tersedia {available} unit
              </p>
            </div>

            <div className="mt-4">
              <label className="text-sm font-medium text-gold-200/60">Jumlah</label>
              <div className="mt-2 flex items-center gap-4">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="rounded-lg border border-gold-900/40 bg-surface-200 p-2.5 text-gold-300 transition-colors hover:border-gold-700/40 disabled:opacity-30"
                  disabled={quantity <= 1}
                >
                  <Minus size={16} />
                </button>
                <span className="min-w-[3rem] text-center font-display text-2xl font-bold text-gold-100">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(Math.min(available, quantity + 1))}
                  className="rounded-lg border border-gold-900/40 bg-surface-200 p-2.5 text-gold-300 transition-colors hover:border-gold-700/40 disabled:opacity-30"
                  disabled={quantity >= available}
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-xl border border-gold-700/20 bg-gold-400/5 p-4">
              <span className="text-sm font-medium text-gold-200/60">Total Harga</span>
              <span className="font-display text-2xl font-bold text-gold-400">
                {formatRupiah(totalPrice)}
              </span>
            </div>

            <button
              onClick={() => setStep("address")}
              className="btn-gold mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold text-surface-400"
            >
              Lanjut ke Alamat <ChevronRight size={16} />
            </button>
          </>
        )}

        {step === "address" && (
          <>
            {/* Saved address indicator */}
            {savedAddressLoaded && (
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
                <MapPin size={14} className="text-emerald-400" />
                <p className="text-xs text-emerald-400">Alamat tersimpan dimuat otomatis</p>
              </div>
            )}

            <div className="mt-4 space-y-3">
              {/* Nama Penerima */}
              <div>
                <label className="block text-sm font-medium text-gold-200/60">Nama Penerima *</label>
                <input
                  type="text"
                  value={address.name}
                  onChange={(e) => setAddress((a) => ({ ...a, name: e.target.value }))}
                  placeholder="Nama lengkap penerima"
                  className={inputClass}
                />
              </div>

              {/* No HP */}
              <div>
                <label className="block text-sm font-medium text-gold-200/60">No. HP Penerima *</label>
                <input
                  type="tel"
                  value={address.phone}
                  onChange={(e) => setAddress((a) => ({ ...a, phone: e.target.value }))}
                  placeholder="08xxxxxxxxxx"
                  className={inputClass}
                />
              </div>

              {/* Provinsi */}
              <div>
                <label className="block text-sm font-medium text-gold-200/60">Provinsi *</label>
                <select
                  value={provinceId}
                  onChange={(e) => handleProvinceChange(e.target.value)}
                  className={selectClass + " mt-1"}
                >
                  <option value="">Pilih Provinsi</option>
                  {provinces.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Kota/Kabupaten */}
              <div>
                <label className="block text-sm font-medium text-gold-200/60">Kota/Kabupaten *</label>
                <select
                  value={cityId}
                  onChange={(e) => handleCityChange(e.target.value)}
                  disabled={!provinceId}
                  className={selectClass + " mt-1"}
                >
                  <option value="">Pilih Kota/Kabupaten</option>
                  {cities.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Kecamatan */}
              <div>
                <label className="block text-sm font-medium text-gold-200/60">Kecamatan *</label>
                <select
                  value={districtId}
                  onChange={(e) => handleDistrictChange(e.target.value)}
                  disabled={!cityId}
                  className={selectClass + " mt-1"}
                >
                  <option value="">Pilih Kecamatan</option>
                  {districts.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              {/* Kelurahan */}
              <div>
                <label className="block text-sm font-medium text-gold-200/60">Kelurahan/Desa *</label>
                <select
                  value={villages.find((v) => v.name === address.village)?.id || ""}
                  onChange={(e) => handleVillageChange(e.target.value)}
                  disabled={!districtId}
                  className={selectClass + " mt-1"}
                >
                  <option value="">Pilih Kelurahan/Desa</option>
                  {villages.map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>

              {/* Kode Pos */}
              <div>
                <label className="block text-sm font-medium text-gold-200/60">Kode Pos *</label>
                <input
                  type="text"
                  value={address.postal_code}
                  onChange={(e) => setAddress((a) => ({ ...a, postal_code: e.target.value }))}
                  placeholder="Contoh: 12345"
                  maxLength={5}
                  className={inputClass}
                />
              </div>

              {/* Alamat Lengkap / Patokan */}
              <div>
                <label className="block text-sm font-medium text-gold-200/60">Alamat Lengkap & Patokan *</label>
                <textarea
                  value={address.address}
                  onChange={(e) => setAddress((a) => ({ ...a, address: e.target.value }))}
                  placeholder="Nama jalan, nomor rumah, RT/RW, patokan..."
                  rows={3}
                  className={inputClass + " resize-none"}
                />
              </div>
            </div>

            {loadingAddress && (
              <div className="mt-2 flex items-center gap-2 text-xs text-gold-200/40">
                <Loader2 size={12} className="animate-spin" /> Memuat data wilayah...
              </div>
            )}

            {/* Summary */}
            <div className="mt-4 flex items-center justify-between rounded-xl border border-gold-700/20 bg-gold-400/5 p-4">
              <span className="text-sm font-medium text-gold-200/60">
                {variant.size_ml}ml x{quantity}
              </span>
              <span className="font-display text-xl font-bold text-gold-400">
                {formatRupiah(totalPrice)}
              </span>
            </div>

            {error && (
              <p className="mt-3 text-sm text-red-400">{error}</p>
            )}

            <div className="mt-4 flex gap-3">
              <button
                onClick={() => { setStep("quantity"); setError(""); }}
                className="flex items-center gap-1 rounded-xl border border-gold-900/30 px-4 py-3.5 text-sm font-medium text-gold-200/60 transition-colors hover:border-gold-700/40"
              >
                <ChevronLeft size={16} /> Kembali
              </button>
              <button
                onClick={handleJoin}
                disabled={loading || !isAddressComplete()}
                className="btn-gold flex flex-1 items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold text-surface-400 disabled:opacity-40"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Memproses...
                  </>
                ) : (
                  `Beli — ${formatRupiah(totalPrice)}`
                )}
              </button>
            </div>

            <p className="mt-3 text-center text-xs text-gold-200/30">
              Dengan membeli, Anda setuju untuk menyelesaikan pembayaran.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
