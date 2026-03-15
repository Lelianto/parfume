"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@/types/database";
import {
  User as UserIcon,
  MapPin,
  Save,
  Loader2,
  Check,
  Phone,
  Mail,
  ChevronDown,
  ChevronUp,
  Store,
  CreditCard,
} from "lucide-react";

interface AddressOption {
  id: string;
  name: string;
}

export function ProfileClient({ profile: initialProfile }: { profile: User }) {
  const [profile, setProfile] = useState(initialProfile);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [addressOpen, setAddressOpen] = useState(false);
  const router = useRouter();

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

  // Auto-open address section if no address saved
  useEffect(() => {
    if (!hasAddress) setAddressOpen(true);
  }, [hasAddress]);

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
    const res = await fetch(`/api/address?type=regencies&id=${provId}`);
    const data = await res.json();
    setCities(data);
    setLoadingAddress(false);
  }, []);

  const fetchDistricts = useCallback(async (cId: string) => {
    setDistricts([]);
    setVillages([]);
    setDistrictId("");
    setAddressDistrict("");
    setAddressVillage("");
    if (!cId) return;
    setLoadingAddress(true);
    const res = await fetch(`/api/address?type=districts&id=${cId}`);
    const data = await res.json();
    setDistricts(data);
    setLoadingAddress(false);
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
    const res = await fetch(`/api/address?type=villages&id=${dId}`);
    const data = await res.json();
    setVillages(data);
    setLoadingAddress(false);
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
    <div className="mx-auto max-w-2xl px-4 pb-8 pt-20 md:pt-8">
      <h1 className="font-display text-3xl font-bold text-gold-100">Profil Saya</h1>
      <p className="mt-1 text-sm text-gold-200/40">Kelola informasi profil dan alamat pengiriman</p>

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

      {/* Profile Info */}
      <div className="mt-6">
        <h2 className="text-sm font-semibold text-gold-200/60">Informasi Profil</h2>
        <div className="mt-3 space-y-4">
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
      </div>

      <div className="my-8 h-px bg-gradient-to-r from-transparent via-gold-700/15 to-transparent" />

      {/* Store Location */}
      <div>
        <div className="flex items-center gap-2">
          <Store size={16} className="text-gold-400" />
          <h2 className="text-sm font-semibold text-gold-200/60">Lokasi Toko</h2>
        </div>
        <p className="mt-1 text-xs text-gold-200/30">
          Ditampilkan di halaman split agar pembeli bisa memperkirakan ongkir
        </p>

        {/* Preview if saved and not editing */}
        {storeProvince && storeCity && (
          <div className="mt-3 rounded-xl border border-gold-900/15 bg-surface-200/40 p-4">
            <p className="flex items-center gap-1.5 text-sm text-gold-100">
              <MapPin size={14} className="text-gold-400" />
              {storeCity}, {storeProvince}
            </p>
          </div>
        )}

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
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

      <div className="my-8 h-px bg-gradient-to-r from-transparent via-gold-700/15 to-transparent" />

      {/* Shipping Address */}
      <div>
        <button
          onClick={() => setAddressOpen(!addressOpen)}
          className="flex w-full items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <MapPin size={16} className="text-gold-400" />
            <h2 className="text-sm font-semibold text-gold-200/60">Alamat Pengiriman Utama</h2>
          </div>
          {addressOpen ? (
            <ChevronUp size={16} className="text-gold-200/40" />
          ) : (
            <ChevronDown size={16} className="text-gold-200/40" />
          )}
        </button>

        {/* Current saved address preview */}
        {hasAddress && !addressOpen && (
          <div className="mt-3 rounded-xl border border-gold-900/15 bg-surface-200/40 p-4">
            <p className="text-sm font-medium text-gold-100">{profile.address_name}</p>
            <p className="text-xs text-gold-200/50">{profile.address_phone}</p>
            <p className="mt-1 text-xs text-gold-200/50">{profile.address_detail}</p>
            <p className="text-xs text-gold-200/50">
              {[profile.address_village, profile.address_district, profile.address_city, profile.address_province]
                .filter(Boolean)
                .join(", ")}
            </p>
            {profile.address_postal_code && (
              <p className="mt-0.5 font-mono text-xs text-gold-200/30">{profile.address_postal_code}</p>
            )}
          </div>
        )}

        {!hasAddress && !addressOpen && (
          <p className="mt-2 text-xs text-gold-200/30">Belum ada alamat tersimpan. Klik untuk menambahkan.</p>
        )}

        {addressOpen && (
          <div className="mt-4 space-y-3">
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
        )}
      </div>

      <div className="my-8 h-px bg-gradient-to-r from-transparent via-gold-700/15 to-transparent" />

      {/* Bank Account */}
      <div>
        <div className="flex items-center gap-2">
          <CreditCard size={16} className="text-gold-400" />
          <h2 className="text-sm font-semibold text-gold-200/60">Rekening Bank</h2>
        </div>
        <p className="mt-1 text-xs text-gold-200/30">
          Digunakan sebagai info transfer pembayaran kepada pembeli di split kamu
        </p>

        <div className="mt-3 space-y-3">
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

          {bankName && bankAccountNumber && bankAccountName && (
            <div className="rounded-xl border border-gold-900/15 bg-surface-200/40 p-4">
              <p className="mb-1 text-xs text-gold-200/30">Preview info rekening pembeli:</p>
              <p className="text-sm font-semibold text-gold-100">{bankName}</p>
              <p className="font-mono text-base font-bold text-gold-400">{bankAccountNumber}</p>
              <p className="text-xs text-gold-200/40">a.n. {bankAccountName}</p>
            </div>
          )}
        </div>
      </div>

      <div className="my-8 h-px bg-gradient-to-r from-transparent via-gold-700/15 to-transparent" />

      {/* Error / Success */
      {error && (
        <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {saved && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm text-emerald-400">
          <Check size={16} /> Profil berhasil disimpan
        </div>
      )}

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="btn-gold flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold text-surface-400 disabled:opacity-50"
      >
        {saving ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Save size={16} />
        )}
        {saving ? "Menyimpan..." : "Simpan Profil"}
      </button>
    </div>
  );
}
