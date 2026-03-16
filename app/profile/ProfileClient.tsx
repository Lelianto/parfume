"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import type { User, SellerBalance, Withdrawal, WithdrawalStatus } from "@/types/database";
import { formatRupiah } from "@/lib/utils";
import {
  User as UserIcon,
  MapPin,
  Save,
  Loader2,
  Check,
  Phone,
  Mail,
  ChevronDown,
  Store,
  CreditCard,
  Wallet,
  TrendingUp,
  ArrowDownToLine,
  Clock,
  AlertTriangle,
  Banknote,
} from "lucide-react";

type ProfileTab = "profile" | "balance";

interface AddressOption {
  id: string;
  name: string;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function WithdrawalStatusBadge({ status }: { status: WithdrawalStatus }) {
  const config: Record<WithdrawalStatus, { label: string; color: string }> = {
    pending: { label: "Menunggu", color: "bg-yellow-500/15 text-yellow-400 ring-yellow-500/30" },
    approved: { label: "Disetujui", color: "bg-blue-500/15 text-blue-400 ring-blue-500/30" },
    completed: { label: "Selesai", color: "bg-emerald-500/15 text-emerald-400 ring-emerald-500/30" },
    rejected: { label: "Ditolak", color: "bg-red-500/15 text-red-400 ring-red-500/30" },
  };
  const c = config[status];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${c.color}`}>
      {c.label}
    </span>
  );
}

export function ProfileClient({
  profile: initialProfile,
  balance,
  withdrawals: initialWithdrawals,
  hasSplits,
}: {
  profile: User;
  balance: SellerBalance;
  withdrawals: Withdrawal[];
  hasSplits: boolean;
}) {
  const [profile, setProfile] = useState(initialProfile);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [profileInfoOpen, setProfileInfoOpen] = useState(false);
  const [storeOpen, setStoreOpen] = useState(false);
  const [addressOpen, setAddressOpen] = useState(false);
  const [bankOpen, setBankOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "balance" ? "balance" : "profile";
  const [activeTab, setActiveTab] = useState<ProfileTab>(initialTab);

  // Balance state
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawError, setWithdrawError] = useState("");
  const [withdrawSuccess, setWithdrawSuccess] = useState("");

  const hasBankInfo = profile.bank_name && profile.bank_account_number && profile.bank_account_name;
  const hasPendingWithdrawal = initialWithdrawals.some((w) => w.status === "pending" || w.status === "approved");

  function handleTabChange(newTab: ProfileTab) {
    setActiveTab(newTab);
    router.replace(`/profile${newTab === "balance" ? "?tab=balance" : ""}`, { scroll: false });
  }

  async function handleWithdraw() {
    setWithdrawError("");
    setWithdrawSuccess("");
    const numAmount = Number(withdrawAmount);

    if (!numAmount || numAmount <= 0) {
      setWithdrawError("Masukkan jumlah yang valid");
      return;
    }

    if (numAmount > balance.balance) {
      setWithdrawError("Jumlah melebihi saldo");
      return;
    }

    setWithdrawLoading(true);
    const res = await fetch("/api/seller/withdrawals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: numAmount }),
    });

    if (!res.ok) {
      let errMsg = "Gagal mengajukan penarikan";
      try {
        const data = await res.json();
        errMsg = data.error || errMsg;
      } catch {
        errMsg = `Server error (${res.status})`;
      }
      setWithdrawError(errMsg);
      setWithdrawLoading(false);
      return;
    }

    setWithdrawSuccess("Penarikan berhasil diajukan! Admin akan memprosesnya.");
    setWithdrawAmount("");
    setWithdrawLoading(false);
    router.refresh();
  }

  // Profile fields
  const [name, setName] = useState(profile.name || "");
  const [bio, setBio] = useState(profile.bio || "");
  const [whatsapp, setWhatsapp] = useState(profile.whatsapp || "");
  const [city, setCity] = useState(profile.city || "");

  // Store location
  const [storeProvince, setStoreProvince] = useState(profile.store_province || "");
  const [storeCity, setStoreCity] = useState(profile.store_city || "");
  const [storeProvinceId, setStoreProvinceId] = useState("");
  const [storeCities, setStoreCities] = useState<AddressOption[]>([]);
  const [storeCityId, setStoreCityId] = useState("");
  // RajaOngkir city IDs (resolved on save)
  const [storeCityRajaId, setStoreCityRajaId] = useState<number | null>(profile.store_city_id ?? null);
  const [addressCityRajaId, setAddressCityRajaId] = useState<number | null>(profile.address_city_id ?? null);

  // Bank account (untuk info pembayaran split)
  const [bankName, setBankName] = useState(profile.bank_name || "");
  const [bankAccountNumber, setBankAccountNumber] = useState(profile.bank_account_number || "");
  const [bankAccountName, setBankAccountName] = useState(profile.bank_account_name || "");

  // Address fields
  const [addressName, setAddressName] = useState(profile.address_name || "");
  const [addressPhone, setAddressPhone] = useState(profile.address_phone || "");
  const [addressProvince, setAddressProvince] = useState(profile.address_province || "");
  const [addressCity, setAddressCity] = useState(profile.address_city || "");
  const [addressDistrict, setAddressDistrict] = useState(profile.address_district || "");
  const [addressVillage, setAddressVillage] = useState(profile.address_village || "");
  const [addressPostalCode, setAddressPostalCode] = useState(profile.address_postal_code || "");
  const [addressDetail, setAddressDetail] = useState(profile.address_detail || "");

  // Dropdown data
  const [provinceId, setProvinceId] = useState("");
  const [cityId, setCityId] = useState("");
  const [districtId, setDistrictId] = useState("");

  const [provinces, setProvinces] = useState<AddressOption[]>([]);
  const [cities, setCities] = useState<AddressOption[]>([]);
  const [districts, setDistricts] = useState<AddressOption[]>([]);
  const [villages, setVillages] = useState<AddressOption[]>([]);
  const [loadingAddress, setLoadingAddress] = useState(false);

  const hasAddress = !!(profile.address_name && profile.address_province);

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
    setAddressCity("");
    setAddressDistrict("");
    setAddressVillage("");
    if (!provId) return;
    setLoadingAddress(true);
    try {
      const res = await fetch(`/api/address?type=regencies&id=${provId}`);
      const data = await res.json();
      setCities(data);
    } finally {
      setLoadingAddress(false);
    }
  }, []);

  const fetchDistricts = useCallback(async (cId: string) => {
    setDistricts([]);
    setVillages([]);
    setDistrictId("");
    setAddressDistrict("");
    setAddressVillage("");
    if (!cId) return;
    setLoadingAddress(true);
    try {
      const res = await fetch(`/api/address?type=districts&id=${cId}`);
      const data = await res.json();
      setDistricts(data);
    } finally {
      setLoadingAddress(false);
    }
  }, []);

  const fetchStoreCities = useCallback(async (provId: string) => {
    setStoreCities([]);
    setStoreCityId("");
    setStoreCity("");
    if (!provId) return;
    const res = await fetch(`/api/address?type=regencies&id=${provId}`);
    const data = await res.json();
    setStoreCities(data);
  }, []);

  function handleStoreProvinceChange(provId: string) {
    setStoreProvinceId(provId);
    const prov = provinces.find((p) => p.id === provId);
    setStoreProvince(prov?.name || "");
    fetchStoreCities(provId);
  }

  function handleStoreCityChange(cId: string) {
    setStoreCityId(cId);
    const c = storeCities.find((x) => x.id === cId);
    setStoreCity(c?.name || "");
  }

  const fetchVillages = useCallback(async (dId: string) => {
    setVillages([]);
    setAddressVillage("");
    if (!dId) return;
    setLoadingAddress(true);
    try {
      const res = await fetch(`/api/address?type=villages&id=${dId}`);
      const data = await res.json();
      setVillages(data);
    } finally {
      setLoadingAddress(false);
    }
  }, []);

  function handleProvinceChange(provId: string) {
    setProvinceId(provId);
    const prov = provinces.find((p) => p.id === provId);
    setAddressProvince(prov?.name || "");
    fetchCities(provId);
  }

  function handleCityChange(cId: string) {
    setCityId(cId);
    const c = cities.find((x) => x.id === cId);
    setAddressCity(c?.name || "");
    fetchDistricts(cId);
  }

  function handleDistrictChange(dId: string) {
    setDistrictId(dId);
    const d = districts.find((x) => x.id === dId);
    setAddressDistrict(d?.name || "");
    fetchVillages(dId);
  }

  function handleVillageChange(vId: string) {
    const v = villages.find((x) => x.id === vId);
    setAddressVillage(v?.name || "");
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setSaved(false);

    const supabase = createClient();

    // Resolve RajaOngkir destination IDs from cache table (subdistrict-level)
    let newStoreCityId = storeCityRajaId;
    let newAddressCityId = addressCityRajaId;

    if (storeCity) {
      const cityNorm = storeCity.replace(/^(kota|kabupaten|kab\.?)\s+/i, "").toUpperCase();
      const { data: match } = await supabase
        .from("rajaongkir_cities")
        .select("id")
        .ilike("city_name", `%${cityNorm}%`)
        .limit(1)
        .maybeSingle();
      newStoreCityId = match?.id ?? null;
      setStoreCityRajaId(newStoreCityId);
    }

    if (addressVillage && addressCity) {
      const villageNorm = addressVillage.toUpperCase();
      const cityNorm = addressCity.replace(/^(kota|kabupaten|kab\.?)\s+/i, "").toUpperCase();
      const { data: match } = await supabase
        .from("rajaongkir_cities")
        .select("id")
        .ilike("subdistrict_name", villageNorm)
        .ilike("city_name", `%${cityNorm}%`)
        .limit(1)
        .maybeSingle();
      newAddressCityId = match?.id ?? null;
      setAddressCityRajaId(newAddressCityId);
    } else if (addressCity) {
      const cityNorm = addressCity.replace(/^(kota|kabupaten|kab\.?)\s+/i, "").toUpperCase();
      const { data: match } = await supabase
        .from("rajaongkir_cities")
        .select("id")
        .ilike("city_name", `%${cityNorm}%`)
        .limit(1)
        .maybeSingle();
      newAddressCityId = match?.id ?? null;
      setAddressCityRajaId(newAddressCityId);
    }

    const { error: updateError } = await supabase
      .from("users")
      .update({
        name: name.trim() || profile.name,
        bio: bio.trim() || null,
        whatsapp: whatsapp.trim() || null,
        city: city.trim() || null,
        address_name: addressName.trim() || null,
        address_phone: addressPhone.trim() || null,
        address_province: addressProvince || null,
        address_city: addressCity || null,
        address_district: addressDistrict || null,
        address_village: addressVillage || null,
        address_postal_code: addressPostalCode.trim() || null,
        address_detail: addressDetail.trim() || null,
        store_province: storeProvince || null,
        store_city: storeCity || null,
        store_city_id: newStoreCityId,
        address_city_id: newAddressCityId,
        bank_name: bankName.trim() || null,
        bank_account_number: bankAccountNumber.trim() || null,
        bank_account_name: bankAccountName.trim() || null,
      })
      .eq("id", profile.id);

    if (updateError) {
      setError(updateError.message);
    } else {
      setSaved(true);
      setProfile((p) => ({
        ...p,
        name: name.trim() || p.name,
        bio: bio.trim() || null,
        whatsapp: whatsapp.trim() || null,
        city: city.trim() || null,
        address_name: addressName.trim() || null,
        address_phone: addressPhone.trim() || null,
        address_province: addressProvince || null,
        address_city: addressCity || null,
        address_district: addressDistrict || null,
        address_village: addressVillage || null,
        address_postal_code: addressPostalCode.trim() || null,
        address_detail: addressDetail.trim() || null,
        store_province: storeProvince || null,
        store_city: storeCity || null,
        bank_name: bankName.trim() || null,
        bank_account_number: bankAccountNumber.trim() || null,
        bank_account_name: bankAccountName.trim() || null,
      }));
      setTimeout(() => setSaved(false), 3000);
      router.refresh();
    }

    setSaving(false);
  }

  const selectClass =
    "w-full rounded-xl border border-gold-900/30 bg-surface-400 px-3 py-2.5 text-sm text-gold-100 outline-none transition-colors focus:border-gold-700/50 focus:ring-1 focus:ring-gold-700/30 disabled:opacity-40";

  return (
    <div className="mx-auto max-w-3xl px-4 pb-8 pt-20 sm:px-6 md:pt-8">
      <h1 className="font-display text-3xl font-bold text-gold-100">Profil Saya</h1>
      <p className="mt-1 text-sm text-gold-200/40">Kelola informasi profil dan alamat pengiriman</p>

      {/* Tabs */}
      {hasSplits && (
        <div className="mt-6 flex gap-1 rounded-xl bg-surface-200/60 p-1">
          <button
            onClick={() => handleTabChange("profile")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
              activeTab === "profile"
                ? "bg-gold-400/20 text-gold-400 shadow-sm"
                : "text-gold-200/50 hover:text-gold-200/70"
            }`}
          >
            <UserIcon size={16} />
            Profil
          </button>
          <button
            onClick={() => handleTabChange("balance")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
              activeTab === "balance"
                ? "bg-gold-400/20 text-gold-400 shadow-sm"
                : "text-gold-200/50 hover:text-gold-200/70"
            }`}
          >
            <Wallet size={16} />
            Saldo & Penarikan
          </button>
        </div>
      )}

      {/* Balance Tab */}
      {activeTab === "balance" && hasSplits && (
        <>
          {/* Balance Cards */}
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-gold-900/20 bg-surface-200/60 p-5">
              <div className="flex items-center gap-2 text-xs text-gold-200/40">
                <Wallet size={14} /> Saldo Tersedia
              </div>
              <p className="mt-2 font-display text-2xl font-bold text-gold-400">
                {formatRupiah(balance.balance)}
              </p>
            </div>
            <div className="rounded-2xl border border-gold-900/20 bg-surface-200/60 p-5">
              <div className="flex items-center gap-2 text-xs text-gold-200/40">
                <TrendingUp size={14} /> Total Pendapatan
              </div>
              <p className="mt-2 font-display text-2xl font-bold text-emerald-400">
                {formatRupiah(balance.total_earned)}
              </p>
            </div>
            <div className="rounded-2xl border border-gold-900/20 bg-surface-200/60 p-5">
              <div className="flex items-center gap-2 text-xs text-gold-200/40">
                <ArrowDownToLine size={14} /> Total Ditarik
              </div>
              <p className="mt-2 font-display text-2xl font-bold text-gold-100">
                {formatRupiah(balance.total_withdrawn)}
              </p>
            </div>
          </div>

          {/* Withdraw Form */}
          <div className="mt-6 rounded-2xl border border-gold-900/20 bg-surface-200/60 p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-gold-200/60">
              <Banknote size={16} /> Tarik Dana
            </h2>

            {!hasBankInfo ? (
              <div className="mt-4 flex items-center gap-3 rounded-xl border border-orange-500/20 bg-orange-500/5 p-4">
                <AlertTriangle size={20} className="flex-shrink-0 text-orange-400" />
                <div>
                  <p className="text-sm font-medium text-orange-400">Rekening bank belum diisi</p>
                  <p className="text-xs text-gold-200/40">
                    Lengkapi info rekening bank di{" "}
                    <button onClick={() => handleTabChange("profile")} className="text-gold-400 underline">tab Profil</button>
                    {" "}untuk bisa menarik dana.
                  </p>
                </div>
              </div>
            ) : hasPendingWithdrawal ? (
              <div className="mt-4 flex items-center gap-3 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
                <Clock size={20} className="flex-shrink-0 text-blue-400" />
                <div>
                  <p className="text-sm font-medium text-blue-400">Penarikan sedang diproses</p>
                  <p className="text-xs text-gold-200/40">
                    Kamu masih memiliki penarikan yang sedang diproses. Tunggu hingga selesai untuk mengajukan penarikan baru.
                  </p>
                </div>
              </div>
            ) : balance.balance <= 0 ? (
              <div className="mt-4 flex items-center gap-3 rounded-xl border border-gold-900/20 bg-surface-300/40 p-4">
                <Wallet size={20} className="flex-shrink-0 text-gold-200/30" />
                <div>
                  <p className="text-sm font-medium text-gold-200/50">Saldo kosong</p>
                  <p className="text-xs text-gold-200/40">
                    Saldo akan bertambah otomatis saat pesanan selesai.
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <div className="rounded-lg bg-surface-300/60 p-3 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-gold-200/40">Bank</span>
                    <span className="font-medium text-gold-100">{profile.bank_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gold-200/40">No. Rekening</span>
                    <span className="font-mono font-medium text-gold-100">{profile.bank_account_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gold-200/40">Atas Nama</span>
                    <span className="font-medium text-gold-100">{profile.bank_account_name}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gold-200/40 mb-1.5">Jumlah Penarikan</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gold-200/40 pointer-events-none">Rp</span>
                    <input
                      type="number"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      placeholder="0"
                      min="1"
                      max={balance.balance}
                      className="input-dark w-full !pl-8"
                    />
                  </div>
                  <div className="mt-1.5 flex items-center justify-between">
                    <span className="text-[11px] text-gold-200/30">
                      Maks: {formatRupiah(balance.balance)}
                    </span>
                    <button
                      onClick={() => setWithdrawAmount(String(balance.balance))}
                      className="text-[11px] font-medium text-gold-400 hover:underline"
                    >
                      Tarik Semua
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleWithdraw}
                  disabled={withdrawLoading}
                  className="btn-gold flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold text-surface-400"
                >
                  {withdrawLoading ? <Loader2 size={16} className="animate-spin" /> : <ArrowDownToLine size={16} />}
                  Ajukan Penarikan
                </button>
              </div>
            )}

            {withdrawError && (
              <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
                {withdrawError}
              </div>
            )}
            {withdrawSuccess && (
              <div className="mt-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-400">
                {withdrawSuccess}
              </div>
            )}
          </div>

          {/* Withdrawal History */}
          <div className="mt-6">
            <h2 className="mb-4 text-sm font-semibold text-gold-200/60">Riwayat Penarikan</h2>
            {initialWithdrawals.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gold-900/30 py-12 text-center">
                <ArrowDownToLine size={36} className="mx-auto text-gold-800/30" />
                <p className="mt-3 text-sm text-gold-200/40">Belum ada riwayat penarikan</p>
              </div>
            ) : (
              <div className="space-y-3">
                {initialWithdrawals.map((w) => (
                  <div
                    key={w.id}
                    className="rounded-xl border border-gold-900/20 bg-surface-200/60 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-display text-lg font-bold text-gold-100">
                          {formatRupiah(w.amount)}
                        </p>
                        <p className="mt-0.5 text-xs text-gold-200/40">
                          {w.bank_name} • {w.bank_account_number}
                        </p>
                        <p className="text-xs text-gold-200/30">{formatDate(w.requested_at)}</p>
                      </div>
                      <WithdrawalStatusBadge status={w.status} />
                    </div>
                    {w.admin_note && (
                      <div className="mt-2 rounded-lg bg-red-500/5 p-2 text-xs text-red-400">
                        Catatan admin: {w.admin_note}
                      </div>
                    )}
                    {w.completed_at && (
                      <p className="mt-1 text-[11px] text-emerald-400/60">
                        Ditransfer: {formatDate(w.completed_at)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Profile Tab */}
      {activeTab === "profile" && <>

      {/* Avatar & Email */}
      <div className="mt-8 flex items-center gap-4 rounded-2xl border border-gold-900/20 bg-surface-200/60 p-5">
        {profile.avatar_url ? (
          <Image
            src={profile.avatar_url}
            alt=""
            width={56}
            height={56}
            className="rounded-full ring-2 ring-gold-700/30"
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-300 ring-2 ring-gold-900/20">
            <UserIcon size={24} className="text-gold-200/30" />
          </div>
        )}
        <div>
          <p className="font-display text-lg font-bold text-gold-100">{profile.name}</p>
          <p className="flex items-center gap-1.5 text-sm text-gold-200/40">
            <Mail size={12} /> {profile.email}
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-3">

      {/* --- Informasi Profil --- */}
      <div className="overflow-hidden rounded-2xl border border-gold-900/20 bg-surface-200/60">
        <button
          onClick={() => setProfileInfoOpen(!profileInfoOpen)}
          className="flex w-full items-center justify-between p-5"
        >
          <div className="flex items-center gap-2">
            <UserIcon size={16} className="text-gold-400" />
            <h2 className="text-sm font-semibold text-gold-200/60">Informasi Profil</h2>
          </div>
          <motion.div animate={{ rotate: profileInfoOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown size={16} className="text-gold-200/40" />
          </motion.div>
        </button>

        <AnimatePresence initial={false} mode="wait">
          {!profileInfoOpen ? (
            <motion.div
              key="preview"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
            >
              <div className="border-t border-gold-900/10 px-5 py-3">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gold-200/50">
                  {name && <span>{name}</span>}
                  {whatsapp && <span className="flex items-center gap-1"><Phone size={10} />{whatsapp}</span>}
                  {city && <span className="flex items-center gap-1"><MapPin size={10} />{city}</span>}
                  {!name && !whatsapp && !city && <span className="text-gold-200/30">Belum diisi</span>}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
            >
              <div className="border-t border-gold-900/10 p-5 pt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gold-200/60">Nama</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input-dark mt-1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gold-200/60">Bio</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tentang kamu..."
                    rows={2}
                    className="input-dark mt-1 resize-none"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="flex items-center gap-1.5 text-sm font-medium text-gold-200/60">
                      <Phone size={12} /> WhatsApp
                    </label>
                    <input
                      type="tel"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      placeholder="08xxxxxxxxxx"
                      className="input-dark mt-1"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-1.5 text-sm font-medium text-gold-200/60">
                      <MapPin size={12} /> Kota
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Kota domisili"
                      className="input-dark mt-1"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* --- Lokasi Toko --- */}
      <div className="overflow-hidden rounded-2xl border border-gold-900/20 bg-surface-200/60">
        <button
          onClick={() => setStoreOpen(!storeOpen)}
          className="flex w-full items-center justify-between p-5"
        >
          <div className="flex items-center gap-2">
            <Store size={16} className="text-gold-400" />
            <h2 className="text-sm font-semibold text-gold-200/60">Lokasi Toko</h2>
          </div>
          <motion.div animate={{ rotate: storeOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown size={16} className="text-gold-200/40" />
          </motion.div>
        </button>

        <AnimatePresence initial={false} mode="wait">
          {!storeOpen ? (
            <motion.div
              key="preview"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
            >
              <div className="border-t border-gold-900/10 px-5 py-3">
                {storeProvince && storeCity ? (
                  <p className="flex items-center gap-1.5 text-xs text-gold-200/50">
                    <MapPin size={10} className="text-gold-400" />
                    {storeCity}, {storeProvince}
                  </p>
                ) : (
                  <p className="text-xs text-gold-200/30">Belum diisi</p>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
            >
              <div className="border-t border-gold-900/10 p-5 pt-4 space-y-3">
                <p className="text-xs text-gold-200/30">
                  Ditampilkan di halaman split agar pembeli bisa memperkirakan ongkir
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gold-200/60">Provinsi</label>
                    <select
                      value={storeProvinceId}
                      onChange={(e) => handleStoreProvinceChange(e.target.value)}
                      className={selectClass + " mt-1"}
                    >
                      <option value="">{storeProvince || "Pilih Provinsi"}</option>
                      {provinces.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gold-200/60">Kota/Kabupaten</label>
                    <select
                      value={storeCityId}
                      onChange={(e) => handleStoreCityChange(e.target.value)}
                      disabled={!storeProvinceId && !storeCity}
                      className={selectClass + " mt-1"}
                    >
                      <option value="">{storeCity || "Pilih Kota/Kabupaten"}</option>
                      {storeCities.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* --- Alamat Pengiriman --- */}
      <div className="overflow-hidden rounded-2xl border border-gold-900/20 bg-surface-200/60">
        <button
          onClick={() => setAddressOpen(!addressOpen)}
          className="flex w-full items-center justify-between p-5"
        >
          <div className="flex items-center gap-2">
            <MapPin size={16} className="text-gold-400" />
            <h2 className="text-sm font-semibold text-gold-200/60">Alamat Pengiriman Utama</h2>
          </div>
          <motion.div animate={{ rotate: addressOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown size={16} className="text-gold-200/40" />
          </motion.div>
        </button>

        <AnimatePresence initial={false} mode="wait">
          {!addressOpen ? (
            <motion.div
              key="preview"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
            >
              <div className="border-t border-gold-900/10 px-5 py-3">
                {hasAddress ? (
                  <div className="text-xs text-gold-200/50 space-y-0.5">
                    <p className="font-medium text-gold-100">{profile.address_name}</p>
                    <p>{profile.address_phone}</p>
                    <p>
                      {[profile.address_village, profile.address_district, profile.address_city, profile.address_province]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-gold-200/30">Belum ada alamat tersimpan</p>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
            >
              <div className="border-t border-gold-900/10 p-5 pt-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gold-200/60">Nama Penerima</label>
                <input
                  type="text"
                  value={addressName}
                  onChange={(e) => setAddressName(e.target.value)}
                  placeholder="Nama lengkap penerima"
                  className="input-dark mt-1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gold-200/60">No. HP Penerima</label>
                <input
                  type="tel"
                  value={addressPhone}
                  onChange={(e) => setAddressPhone(e.target.value)}
                  placeholder="08xxxxxxxxxx"
                  className="input-dark mt-1"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gold-200/60">Provinsi</label>
              <select
                value={provinceId}
                onChange={(e) => handleProvinceChange(e.target.value)}
                className={selectClass + " mt-1"}
              >
                <option value="">{addressProvince || "Pilih Provinsi"}</option>
                {provinces.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gold-200/60">Kota/Kabupaten</label>
              <select
                value={cityId}
                onChange={(e) => handleCityChange(e.target.value)}
                disabled={!provinceId && !addressCity}
                className={selectClass + " mt-1"}
              >
                <option value="">{addressCity || "Pilih Kota/Kabupaten"}</option>
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gold-200/60">Kecamatan</label>
              <select
                value={districtId}
                onChange={(e) => handleDistrictChange(e.target.value)}
                disabled={!cityId && !addressDistrict}
                className={selectClass + " mt-1"}
              >
                <option value="">{addressDistrict || "Pilih Kecamatan"}</option>
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gold-200/60">Kelurahan/Desa</label>
              <select
                value={villages.find((v) => v.name === addressVillage)?.id || ""}
                onChange={(e) => handleVillageChange(e.target.value)}
                disabled={!districtId && !addressVillage}
                className={selectClass + " mt-1"}
              >
                <option value="">{addressVillage || "Pilih Kelurahan/Desa"}</option>
                {villages.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gold-200/60">Kode Pos</label>
              <input
                type="text"
                value={addressPostalCode}
                onChange={(e) => setAddressPostalCode(e.target.value)}
                placeholder="Contoh: 12345"
                maxLength={5}
                className="input-dark mt-1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gold-200/60">Alamat Lengkap & Patokan</label>
              <textarea
                value={addressDetail}
                onChange={(e) => setAddressDetail(e.target.value)}
                placeholder="Nama jalan, nomor rumah, RT/RW, patokan..."
                rows={3}
                className="input-dark mt-1 resize-none"
              />
            </div>

            {loadingAddress && (
              <div className="flex items-center gap-2 text-xs text-gold-200/40">
                <Loader2 size={12} className="animate-spin" /> Memuat data wilayah...
              </div>
            )}
          </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* --- Rekening Bank --- */}
      <div className="overflow-hidden rounded-2xl border border-gold-900/20 bg-surface-200/60">
        <button
          onClick={() => setBankOpen(!bankOpen)}
          className="flex w-full items-center justify-between p-5"
        >
          <div className="flex items-center gap-2">
            <CreditCard size={16} className="text-gold-400" />
            <h2 className="text-sm font-semibold text-gold-200/60">Rekening Bank</h2>
          </div>
          <motion.div animate={{ rotate: bankOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown size={16} className="text-gold-200/40" />
          </motion.div>
        </button>

        <AnimatePresence initial={false} mode="wait">
          {!bankOpen ? (
            <motion.div
              key="preview"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
            >
              <div className="border-t border-gold-900/10 px-5 py-3">
                {bankName && bankAccountNumber ? (
                  <p className="text-xs text-gold-200/50">
                    {bankName} • {bankAccountNumber.slice(0, 4)}****{bankAccountNumber.slice(-2)} • a.n. {bankAccountName}
                  </p>
                ) : (
                  <p className="text-xs text-gold-200/30">Belum diisi</p>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
            >
              <div className="border-t border-gold-900/10 p-5 pt-4 space-y-3">
                <p className="text-xs text-gold-200/30">
                  Untuk keperluan penarikan dana saldo
                </p>
                <div>
                  <label className="block text-sm font-medium text-gold-200/60">Nama Bank</label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="Contoh: BCA, BNI, BRI, Mandiri, SeaBank"
                    className="input-dark mt-1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gold-200/60">Nomor Rekening</label>
                  <input
                    type="text"
                    value={bankAccountNumber}
                    onChange={(e) => setBankAccountNumber(e.target.value)}
                    placeholder="Contoh: 1234567890"
                    className="input-dark mt-1 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gold-200/60">Nama Pemilik Rekening</label>
                  <input
                    type="text"
                    value={bankAccountName}
                    onChange={(e) => setBankAccountName(e.target.value)}
                    placeholder="Nama sesuai buku tabungan"
                    className="input-dark mt-1"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      </div>{/* end accordion space-y */}

      {/* Error / Success */}
      {error && (
        <div className="mt-6 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {saved && (
        <div className="mt-6 flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm text-emerald-400">
          <Check size={16} /> Profil berhasil disimpan
        </div>
      )}

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="btn-gold mt-6 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold text-surface-400 disabled:opacity-50"
      >
        {saving ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Save size={16} />
        )}
        {saving ? "Menyimpan..." : "Simpan Profil"}
      </button>

      </>}
    </div>
  );
}
