"use client";

import { useState, useEffect, useCallback, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Upload, Loader2, Video, Plus, Trash2, X, Check } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { TagInput } from "@/components/TagInput";
import { ComboBox } from "@/components/ComboBox";
import type { Concentration } from "@/types/database";

interface VariantRow {
  size_ml: string;
  price: string;
  stock: string;
}

interface SplitDraft {
  step: number;
  brand: string;
  perfumeName: string;
  perfumeVariant: string[];
  description: string;
  concentration: string;
  brandType: string;
  gender: string;
  scentClassification: string;
  bottleSize: string;
  batchCode: string;
  isReadyStock: boolean;
  variants: VariantRow[];
  topNotes: string[];
  middleNotes: string[];
  baseNotes: string[];
  scentFamily: string;
  hadBottlePhoto: boolean;
  hadBatchCodePhoto: boolean;
  savedAt: string;
}

const DRAFT_KEY = "split_draft";
const CONCENTRATIONS: Concentration[] = ["EDP", "EDT", "Parfum", "EDC", "Cologne"];
const SCENT_FAMILIES = ["Woody", "Floral", "Oriental", "Fresh", "Citrus", "Aquatic", "Gourmand", "Aromatic", "Chypre", "Fougere"];

const STEPS = [
  { num: 1, label: "Informasi Parfum" },
  { num: 2, label: "Konfigurasi Split" },
  { num: 3, label: "Bukti Keaslian" },
  { num: 4, label: "Fragrance Notes" },
] as const;

export default function CreateSplitPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState("");

  // Form options from DB
  const [formOptions, setFormOptions] = useState<Record<string, string[]>>({});

  // Perfume fields
  const [brand, setBrand] = useState("");
  const [perfumeName, setPerfumeName] = useState("");
  const [perfumeVariant, setPerfumeVariant] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [concentration, setConcentration] = useState<Concentration | "">("");
  const [brandType, setBrandType] = useState("");
  const [gender, setGender] = useState("");
  const [scentClassification, setScentClassification] = useState("");

  // Fragrance notes
  const [topNotes, setTopNotes] = useState<string[]>([]);
  const [middleNotes, setMiddleNotes] = useState<string[]>([]);
  const [baseNotes, setBaseNotes] = useState<string[]>([]);
  const [scentFamily, setScentFamily] = useState("");
  const [noteInput, setNoteInput] = useState({ top: "", middle: "", base: "" });

  // Split fields
  const [bottleSize, setBottleSize] = useState("");
  const [batchCode, setBatchCode] = useState("");
  const [isReadyStock, setIsReadyStock] = useState(false);

  // Variants
  const [variants, setVariants] = useState<VariantRow[]>([
    { size_ml: "", price: "", stock: "" },
  ]);

  // Images & Video
  const [bottlePhoto, setBottlePhoto] = useState<File | null>(null);
  const [bottlePhotoPreview, setBottlePhotoPreview] = useState("");
  const [batchCodePhoto, setBatchCodePhoto] = useState<File | null>(null);
  const [batchCodePhotoPreview, setBatchCodePhotoPreview] = useState("");
  const [decantVideo, setDecantVideo] = useState<File | null>(null);
  const [decantVideoName, setDecantVideoName] = useState("");

  const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
  const MAX_VIDEO_SIZE = 50 * 1024 * 1024;
  const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
  const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];

  const totalStock = variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
  const totalAllocatedMl = variants.reduce((sum, v) => sum + (Number(v.size_ml) || 0) * (Number(v.stock) || 0), 0);
  const bottleMl = Number(bottleSize) || 0;
  const isOverCapacity = bottleMl > 0 && totalAllocatedMl > bottleMl;

  // --- Draft helpers ---
  const saveDraft = useCallback(() => {
    const draft: SplitDraft = {
      step,
      brand,
      perfumeName,
      perfumeVariant,
      description,
      concentration,
      brandType,
      gender,
      scentClassification,
      bottleSize,
      batchCode,
      isReadyStock,
      variants,
      topNotes,
      middleNotes,
      baseNotes,
      scentFamily,
      hadBottlePhoto: !!bottlePhoto,
      hadBatchCodePhoto: !!batchCodePhoto,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [step, brand, perfumeName, perfumeVariant, description, concentration, brandType, gender, scentClassification, bottleSize, batchCode, isReadyStock, variants, topNotes, middleNotes, baseNotes, scentFamily, bottlePhoto, batchCodePhoto]);

  function restoreDraft(draft: SplitDraft) {
    setStep(draft.step);
    setBrand(draft.brand);
    setPerfumeName(draft.perfumeName);
    setPerfumeVariant(Array.isArray(draft.perfumeVariant) ? draft.perfumeVariant : draft.perfumeVariant ? [draft.perfumeVariant] : []);
    setDescription(draft.description);
    setConcentration(draft.concentration as Concentration | "");
    setBrandType(draft.brandType ?? "");
    setGender(draft.gender ?? "");
    setScentClassification(draft.scentClassification ?? "");
    setBottleSize(draft.bottleSize);
    setBatchCode(draft.batchCode);
    setIsReadyStock(draft.isReadyStock);
    setVariants(draft.variants.length > 0 ? draft.variants : [{ size_ml: "", price: "", stock: "" }]);
    setTopNotes(draft.topNotes);
    setMiddleNotes(draft.middleNotes);
    setBaseNotes(draft.baseNotes);
    setScentFamily(draft.scentFamily);

    // Rebuild completed steps based on restored data
    const completed = new Set<number>();
    if (draft.brand.trim() && draft.perfumeName.trim()) completed.add(1);
    const hasValidVariant = draft.variants.some(
      (v) => Number(v.size_ml) > 0 && Number(v.price) > 0 && Number(v.stock) > 0
    );
    if (Number(draft.bottleSize) > 0 && hasValidVariant) completed.add(2);
    if (draft.hadBottlePhoto && draft.hadBatchCodePhoto) completed.add(3);
    setCompletedSteps(completed);

    setShowDraftBanner(false);
  }

  function clearDraft() {
    localStorage.removeItem(DRAFT_KEY);
    setShowDraftBanner(false);
  }

  // Fetch form options on mount
  useEffect(() => {
    fetch("/api/admin/form-options")
      .then((r) => r.json())
      .then((data) => { if (!data.error) setFormOptions(data); })
      .catch(() => {});
  }, []);

  // Check for saved draft on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const draft: SplitDraft = JSON.parse(saved);
        setDraftSavedAt(draft.savedAt);
        setShowDraftBanner(true);
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  // Auto-save on step change
  useEffect(() => {
    if (brand || perfumeName || bottleSize || variants.some((v) => v.size_ml)) {
      saveDraft();
    }
  }, [step, saveDraft, brand, perfumeName, bottleSize, variants]);

  // --- Validation per step ---
  function isStepValid(s: number): boolean {
    switch (s) {
      case 1:
        return brand.trim().length > 0 && perfumeName.trim().length > 0;
      case 2: {
        const hasBottle = Number(bottleSize) > 0;
        const hasVariant = variants.some(
          (v) => Number(v.size_ml) > 0 && Number(v.price) > 0 && Number(v.stock) > 0
        );
        return hasBottle && hasVariant && !isOverCapacity;
      }
      case 3:
        return !!bottlePhoto && !!batchCodePhoto;
      case 4:
        return true; // all optional
      default:
        return false;
    }
  }

  function getStepError(s: number): string {
    switch (s) {
      case 1:
        if (!brand.trim()) return "Brand wajib diisi";
        if (!perfumeName.trim()) return "Nama parfum wajib diisi";
        return "";
      case 2:
        if (Number(bottleSize) <= 0) return "Ukuran botol wajib diisi";
        if (!variants.some((v) => Number(v.size_ml) > 0 && Number(v.price) > 0 && Number(v.stock) > 0))
          return "Minimal 1 varian lengkap (ml, harga, stok > 0)";
        if (isOverCapacity)
          return `Total alokasi (${totalAllocatedMl}ml) melebihi ukuran botol (${bottleMl}ml)`;
        return "";
      case 3:
        if (!bottlePhoto) return "Foto botol wajib diunggah";
        if (!batchCodePhoto) return "Foto batch code wajib diunggah";
        return "";
      default:
        return "";
    }
  }

  function handleNext() {
    setError("");
    if (!isStepValid(step)) {
      setError(getStepError(step));
      return;
    }
    setCompletedSteps((prev) => new Set(prev).add(step));
    setStep((s) => Math.min(s + 1, 4));
  }

  function handleBack() {
    setError("");
    setStep((s) => Math.max(s - 1, 1));
  }

  function handleStepClick(targetStep: number) {
    if (completedSteps.has(targetStep) || targetStep === step) {
      setError("");
      setStep(targetStep);
    }
  }

  // --- Existing helpers ---
  function addNote(type: "top" | "middle" | "base") {
    const value = noteInput[type].trim();
    if (!value) return;
    if (type === "top") setTopNotes((prev) => [...prev, value]);
    else if (type === "middle") setMiddleNotes((prev) => [...prev, value]);
    else setBaseNotes((prev) => [...prev, value]);
    setNoteInput((prev) => ({ ...prev, [type]: "" }));
  }

  function removeNote(type: "top" | "middle" | "base", index: number) {
    if (type === "top") setTopNotes((prev) => prev.filter((_, i) => i !== index));
    else if (type === "middle") setMiddleNotes((prev) => prev.filter((_, i) => i !== index));
    else setBaseNotes((prev) => prev.filter((_, i) => i !== index));
  }

  function updateVariant(index: number, field: keyof VariantRow, value: string) {
    setVariants((prev) =>
      prev.map((v, i) => (i === index ? { ...v, [field]: value } : v))
    );
  }

  function addVariant() {
    setVariants((prev) => [...prev, { size_ml: "", price: "", stock: "" }]);
  }

  function removeVariant(index: number) {
    if (variants.length <= 1) return;
    setVariants((prev) => prev.filter((_, i) => i !== index));
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }

  function handleImageChange(
    file: File | null,
    setFile: (f: File | null) => void,
    setPreview: (s: string) => void
  ) {
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setError("Format gambar harus JPG, PNG, atau WebP");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setError(`Ukuran gambar maksimal 5MB. File ini ${formatFileSize(file.size)}`);
      return;
    }
    setError("");
    setFile(file);
    setPreview(URL.createObjectURL(file));
  }

  function handleVideoChange(file: File | null) {
    if (!file) return;
    if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
      setError("Format video harus MP4, MOV, atau WebM");
      return;
    }
    if (file.size > MAX_VIDEO_SIZE) {
      setError(`Ukuran video maksimal 50MB. File ini ${formatFileSize(file.size)}`);
      return;
    }
    setError("");
    setDecantVideo(file);
    setDecantVideoName(file.name);
  }

  async function uploadImage(
    supabase: ReturnType<typeof createClient>,
    file: File,
    bucket: string,
    path: string
  ): Promise<string | null> {
    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, file, { upsert: true });
    if (error) return null;
    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(path);
    return publicUrl;
  }

  async function handleSubmit(e?: FormEvent, skipNotes = false) {
    if (e) e.preventDefault();
    setLoading(true);
    setError("");

    if (!bottlePhoto) {
      setError("Foto botol wajib diunggah");
      setLoading(false);
      return;
    }
    if (!batchCodePhoto) {
      setError("Foto batch code wajib diunggah");
      setLoading(false);
      return;
    }

    const validVariants = variants.filter(
      (v) => v.size_ml && v.price && v.stock
    );
    if (validVariants.length === 0) {
      setError("Minimal 1 varian ukuran harus diisi lengkap");
      setLoading(false);
      return;
    }

    for (const v of validVariants) {
      if (Number(v.size_ml) <= 0 || Number(v.price) <= 0 || Number(v.stock) <= 0) {
        setError("Semua nilai varian harus lebih dari 0");
        setLoading(false);
        return;
      }
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Silakan login terlebih dahulu");
      setLoading(false);
      return;
    }

    try {
      const timestamp = Date.now();
      const bottlePhotoUrl = await uploadImage(
        supabase,
        bottlePhoto,
        "perfume_images",
        `${user.id}/bottle_${timestamp}.${bottlePhoto.name.split(".").pop()}`
      );
      const batchCodePhotoUrl = await uploadImage(
        supabase,
        batchCodePhoto,
        "perfume_images",
        `${user.id}/batch_${timestamp}.${batchCodePhoto.name.split(".").pop()}`
      );

      if (!bottlePhotoUrl || !batchCodePhotoUrl) {
        setError("Gagal mengunggah gambar. Pastikan bucket storage sudah dibuat.");
        setLoading(false);
        return;
      }

      let decantVideoUrl: string | null = null;
      if (decantVideo) {
        decantVideoUrl = await uploadImage(
          supabase,
          decantVideo,
          "decant_videos",
          `${user.id}/decant_${timestamp}.${decantVideo.name.split(".").pop()}`
        );
      }

      const finalTopNotes = skipNotes ? [] : topNotes;
      const finalMiddleNotes = skipNotes ? [] : middleNotes;
      const finalBaseNotes = skipNotes ? [] : baseNotes;
      const finalScentFamily = skipNotes ? null : scentFamily || null;

      const { data: perfume, error: perfumeError } = await supabase
        .from("perfumes")
        .insert({
          brand,
          name: perfumeName,
          variant: perfumeVariant.length > 0 ? perfumeVariant.join(", ") : null,
          description: description || null,
          concentration: concentration || null,
          brand_type: brandType || null,
          gender: gender || null,
          scent_classification: scentClassification || null,
          top_notes: finalTopNotes,
          middle_notes: finalMiddleNotes,
          base_notes: finalBaseNotes,
          scent_family: finalScentFamily,
        })
        .select()
        .single();

      if (perfumeError) throw new Error(`[perfumes] ${perfumeError.message}`);

      const firstVariant = validVariants[0];
      const totalStockCalc = validVariants.reduce((s, v) => s + Number(v.stock), 0);

      const { data: split, error: splitError } = await supabase
        .from("splits")
        .insert({
          perfume_id: perfume.id,
          bottle_size_ml: Number(bottleSize),
          split_size_ml: Number(firstVariant.size_ml),
          total_slots: totalStockCalc,
          filled_slots: 0,
          price_per_slot: Number(firstVariant.price),
          batch_code: batchCode || null,
          bottle_photo_url: bottlePhotoUrl,
          batch_code_photo_url: batchCodePhotoUrl,
          decant_video_url: decantVideoUrl,
          status: "open",
          is_ready_stock: isReadyStock,
          description: description || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (splitError) throw new Error(`[splits] ${splitError.message}`);

      const variantInserts = validVariants.map((v) => ({
        split_id: split.id,
        size_ml: Number(v.size_ml),
        price: Number(v.price),
        stock: Number(v.stock),
        sold: 0,
      }));

      const { error: variantError } = await supabase
        .from("split_variants")
        .insert(variantInserts);

      if (variantError) throw new Error(`[variants] ${variantError.message}`);

      // Clear draft on success
      localStorage.removeItem(DRAFT_KEY);
      router.push("/");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  // --- Step Indicator ---
  function StepIndicator() {
    return (
      <div className="mb-8">
        <div className="flex w-full items-center">
          {STEPS.map((s, i) => {
            const isCompleted = completedSteps.has(s.num);
            const isCurrent = step === s.num;
            const isClickable = isCompleted || isCurrent;

            return (
              <div key={s.num} className={`flex items-center ${i < STEPS.length - 1 ? "flex-1" : ""}`}>
                {/* Circle */}
                <button
                  type="button"
                  onClick={() => handleStepClick(s.num)}
                  disabled={!isClickable}
                  className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-all ${
                    isCurrent
                      ? "bg-gold-400 text-surface-400 shadow-lg shadow-gold-400/20"
                      : isCompleted
                      ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30 hover:ring-emerald-400/50 cursor-pointer"
                      : "bg-surface-300 text-gold-200/30 ring-1 ring-gold-900/20"
                  }`}
                >
                  {isCompleted && !isCurrent ? <Check size={16} /> : s.num}
                </button>

                {/* Connector line */}
                {i < STEPS.length - 1 && (
                  <div
                    className={`mx-2 h-px flex-1 transition-colors ${
                      completedSteps.has(s.num) ? "bg-emerald-500/30" : "bg-gold-900/20"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Current step label */}
        <p className="mt-5 text-center text-sm font-medium text-gold-400">
          {STEPS[step - 1].label}
        </p>
      </div>
    );
  }

  // --- Draft Banner ---
  function DraftBanner() {
    if (!showDraftBanner) return null;

    const timeStr = draftSavedAt
      ? new Date(draftSavedAt).toLocaleString("id-ID", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";

    return (
      <div className="mb-6 rounded-xl border border-gold-700/30 bg-gold-400/5 p-4">
        <p className="text-sm text-gold-200">
          Draft tersimpan{timeStr ? ` — ${timeStr}` : ""}
        </p>
        <div className="mt-2 flex gap-3">
          <button
            type="button"
            onClick={() => {
              try {
                const saved = localStorage.getItem(DRAFT_KEY);
                if (saved) restoreDraft(JSON.parse(saved));
              } catch {
                clearDraft();
              }
            }}
            className="rounded-lg bg-gold-400/15 px-4 py-1.5 text-xs font-semibold text-gold-400 transition-colors hover:bg-gold-400/25"
          >
            Lanjutkan
          </button>
          <button
            type="button"
            onClick={clearDraft}
            className="rounded-lg px-4 py-1.5 text-xs text-gold-200/50 transition-colors hover:text-gold-200/70"
          >
            Hapus Draft
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pb-8 pt-20 md:pt-8">
      <Link
        href="/"
        className="mb-6 hidden items-center gap-1.5 text-sm text-gold-200/50 transition-colors hover:text-gold-400 md:inline-flex"
      >
        <ArrowLeft size={16} /> Kembali
      </Link>

      <h1 className="font-display text-3xl font-bold text-gold-100">Buat Split Baru</h1>
      <p className="mt-1 text-sm text-gold-200/40">
        Buat listing split parfum untuk dibeli bersama.
      </p>

      <div className="mt-8">
        <DraftBanner />
        <StepIndicator />

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Informasi Parfum */}
          {step === 1 && (
            <section>
              <h2 className="font-display text-lg font-semibold text-gold-100">Informasi Parfum</h2>
              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gold-200/60">Brand *</label>
                  <ComboBox
                    value={brand}
                    onChange={setBrand}
                    options={formOptions.brand ?? []}
                    placeholder="Cari atau ketik brand..."
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gold-200/60">Nama Parfum *</label>
                  <input
                    type="text"
                    value={perfumeName}
                    onChange={(e) => setPerfumeName(e.target.value)}
                    placeholder="contoh: Sauvage"
                    className="input-dark mt-1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gold-200/60">Varian</label>
                  <TagInput
                    tags={perfumeVariant}
                    onChange={setPerfumeVariant}
                    placeholder="Ketik lalu Enter atau koma — contoh: LILAC, CHROMA"
                    className="mt-1"
                  />
                  <p className="mt-1 text-[11px] text-gold-200/25">
                    Varian khusus brand, jika ada. Tekan Enter atau koma untuk menambah.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gold-200/60">Konsentrasi</label>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                    {CONCENTRATIONS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setConcentration(concentration === c ? "" : c)}
                        className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all ${
                          concentration === c
                            ? "bg-gold-400/20 text-gold-400 ring-1 ring-gold-400/40"
                            : "bg-surface-200 text-gold-200/50 ring-1 ring-gold-900/30 hover:ring-gold-700/40"
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gold-200/60">Tipe Brand</label>
                    <ComboBox
                      value={brandType}
                      onChange={setBrandType}
                      options={formOptions.brand_type ?? []}
                      placeholder="Designer, Niche, dll"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gold-200/60">Gender</label>
                    <ComboBox
                      value={gender}
                      onChange={setGender}
                      options={formOptions.gender ?? []}
                      placeholder="Men, Women, Unisex"
                      className="mt-1"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gold-200/60">Klasifikasi Aroma</label>
                  <ComboBox
                    value={scentClassification}
                    onChange={setScentClassification}
                    options={formOptions.scent_classification ?? []}
                    placeholder="Cari klasifikasi aroma..."
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gold-200/60">Deskripsi</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Deskripsi parfum"
                    rows={3}
                    className="input-dark mt-1"
                  />
                </div>
              </div>
            </section>
          )}

          {/* Step 2: Konfigurasi Split */}
          {step === 2 && (
            <section>
              <h2 className="font-display text-lg font-semibold text-gold-100">Konfigurasi Split</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gold-200/60">Ukuran Botol (ml) *</label>
                  <input
                    type="number"
                    min="1"
                    value={bottleSize}
                    onChange={(e) => setBottleSize(e.target.value)}
                    placeholder="100"
                    className="input-dark mt-1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gold-200/60">Batch Code</label>
                  <input
                    type="text"
                    value={batchCode}
                    onChange={(e) => setBatchCode(e.target.value)}
                    placeholder="Opsional"
                    className="input-dark mt-1"
                  />
                </div>
              </div>

              {/* Variant Rows */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gold-200/60">Varian Ukuran *</label>
                <p className="mt-0.5 text-[11px] text-gold-200/25">
                  Tambahkan ukuran decant yang tersedia beserta harga dan stok
                </p>
                <div className="mt-3 space-y-2">
                  {variants.map((variant, index) => (
                    <div key={index} className="flex flex-wrap items-center gap-2 rounded-lg border border-gold-900/10 p-2 sm:flex-nowrap sm:border-0 sm:p-0">
                      <div className="w-[calc(50%-4px)] sm:flex-1">
                        <input
                          type="number"
                          min="1"
                          value={variant.size_ml}
                          onChange={(e) => updateVariant(index, "size_ml", e.target.value)}
                          placeholder="ml"
                          className="input-dark !py-2.5 text-sm"
                        />
                      </div>
                      <div className="w-[calc(50%-4px)] sm:flex-1">
                        <input
                          type="number"
                          min="1000"
                          value={variant.price}
                          onChange={(e) => updateVariant(index, "price", e.target.value)}
                          placeholder="Harga (Rp)"
                          className="input-dark !py-2.5 text-sm"
                        />
                      </div>
                      <div className="w-[calc(50%-4px)] sm:w-20">
                        <input
                          type="number"
                          min="1"
                          value={variant.stock}
                          onChange={(e) => updateVariant(index, "stock", e.target.value)}
                          placeholder="Stok"
                          className="input-dark !py-2.5 text-sm"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeVariant(index)}
                        disabled={variants.length <= 1}
                        className="rounded-lg p-2 text-gold-200/30 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-20"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addVariant}
                  className="mt-2 flex items-center gap-1.5 rounded-lg border border-dashed border-gold-900/30 px-3.5 py-2 text-xs font-medium text-gold-200/50 transition-colors hover:border-gold-700/40 hover:text-gold-400"
                >
                  <Plus size={14} /> Tambah Ukuran
                </button>
              </div>

              {/* Ready Stock Toggle */}
              <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-xl border border-gold-900/20 bg-surface-200/50 p-4 transition-colors hover:bg-surface-200">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={isReadyStock}
                    onChange={(e) => setIsReadyStock(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="h-6 w-11 rounded-full bg-surface-400 transition-colors peer-checked:bg-gold-500" />
                  <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-gold-100 transition-transform peer-checked:translate-x-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gold-100">Ready Stock</p>
                  <p className="text-[11px] text-gold-200/40">Centang jika Anda sudah memiliki decant siap kirim</p>
                </div>
              </label>

              {/* Capacity indicator */}
              {(totalStock > 0 || totalAllocatedMl > 0) && (
                <div className={`mt-4 rounded-xl border p-4 ${
                  isOverCapacity
                    ? "border-red-500/30 bg-red-500/5"
                    : "border-gold-700/20 bg-gold-400/5"
                }`}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gold-300">
                      <span className="font-semibold text-gold-400">{totalStock} total stok</span> dari{" "}
                      {variants.filter((v) => v.size_ml).length} varian
                    </span>
                    <span className={`font-semibold ${isOverCapacity ? "text-red-400" : "text-gold-400"}`}>
                      {totalAllocatedMl}ml / {bottleMl || "?"}ml
                    </span>
                  </div>
                  {bottleMl > 0 && (
                    <div className="mt-2.5">
                      <div className="h-2 overflow-hidden rounded-full bg-surface-400">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isOverCapacity ? "bg-red-500" : "bg-gold-400"
                          }`}
                          style={{ width: `${Math.min((totalAllocatedMl / bottleMl) * 100, 100)}%` }}
                        />
                      </div>
                      {isOverCapacity && (
                        <p className="mt-1.5 text-xs text-red-400">
                          Melebihi kapasitas botol sebanyak {totalAllocatedMl - bottleMl}ml. Kurangi stok atau ukuran varian.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {/* Step 3: Bukti Keaslian */}
          {step === 3 && (
            <section>
              <h2 className="font-display text-lg font-semibold text-gold-100">Bukti Keaslian</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gold-200/60">Foto Botol *</label>
                  <label className="mt-1 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-gold-900/40 bg-surface-200/50 p-6 transition-colors hover:border-gold-700/50 hover:bg-surface-200">
                    {bottlePhotoPreview ? (
                      <Image
                        src={bottlePhotoPreview}
                        alt="Preview"
                        width={120}
                        height={120}
                        className="rounded-lg object-cover"
                      />
                    ) : (
                      <>
                        <Upload size={22} className="text-gold-200/30" />
                        <p className="mt-2 text-xs text-gold-200/40">Upload foto botol</p>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) =>
                        handleImageChange(
                          e.target.files?.[0] ?? null,
                          setBottlePhoto,
                          setBottlePhotoPreview
                        )
                      }
                    />
                  </label>
                  <p className="mt-1 text-[11px] text-gold-200/25">JPG, PNG, WebP. Maks 5MB</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gold-200/60">Foto Batch Code *</label>
                  <label className="mt-1 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-gold-900/40 bg-surface-200/50 p-6 transition-colors hover:border-gold-700/50 hover:bg-surface-200">
                    {batchCodePhotoPreview ? (
                      <Image
                        src={batchCodePhotoPreview}
                        alt="Preview"
                        width={120}
                        height={120}
                        className="rounded-lg object-cover"
                      />
                    ) : (
                      <>
                        <Upload size={22} className="text-gold-200/30" />
                        <p className="mt-2 text-xs text-gold-200/40">Upload batch code</p>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) =>
                        handleImageChange(
                          e.target.files?.[0] ?? null,
                          setBatchCodePhoto,
                          setBatchCodePhotoPreview
                        )
                      }
                    />
                  </label>
                  <p className="mt-1 text-[11px] text-gold-200/25">JPG, PNG, WebP. Maks 5MB</p>
                </div>
              </div>

              {/* Video Decant (optional) */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gold-200/60">Video Decant (opsional)</label>
                <label className="mt-1 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-gold-900/40 bg-surface-200/50 p-6 transition-colors hover:border-gold-700/50 hover:bg-surface-200">
                  {decantVideoName ? (
                    <div className="text-center">
                      <Video size={22} className="mx-auto text-gold-400" />
                      <p className="mt-2 text-sm font-medium text-gold-200">{decantVideoName}</p>
                      <p className="text-xs text-gold-200/30">{decantVideo && formatFileSize(decantVideo.size)}</p>
                    </div>
                  ) : (
                    <>
                      <Upload size={22} className="text-gold-200/30" />
                      <p className="mt-2 text-xs text-gold-200/40">Upload video bukti decant</p>
                    </>
                  )}
                  <input
                    type="file"
                    accept="video/mp4,video/quicktime,video/webm"
                    className="hidden"
                    onChange={(e) => handleVideoChange(e.target.files?.[0] ?? null)}
                  />
                </label>
                <p className="mt-1 text-[11px] text-gold-200/25">MP4, MOV, WebM. Maks 50MB</p>
              </div>
            </section>
          )}

          {/* Step 4: Fragrance Notes */}
          {step === 4 && (
            <section>
              <h2 className="font-display text-lg font-semibold text-gold-100">Fragrance Notes</h2>
              <p className="mt-1 text-xs text-gold-200/30">Opsional — bantu buyer mengenal profil aroma</p>

              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gold-200/60">Scent Family</label>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
                    {SCENT_FAMILIES.map((sf) => (
                      <button
                        key={sf}
                        type="button"
                        onClick={() => setScentFamily(scentFamily === sf ? "" : sf)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                          scentFamily === sf
                            ? "bg-gold-400/20 text-gold-400 ring-1 ring-gold-400/40"
                            : "bg-surface-200 text-gold-200/50 ring-1 ring-gold-900/30 hover:ring-gold-700/40"
                        }`}
                      >
                        {sf}
                      </button>
                    ))}
                  </div>
                </div>

                {(["top", "middle", "base"] as const).map((type) => {
                  const notes = type === "top" ? topNotes : type === "middle" ? middleNotes : baseNotes;
                  const label = type === "top" ? "Top Notes" : type === "middle" ? "Middle Notes" : "Base Notes";
                  const colors = type === "top" ? "bg-amber-500/15 text-amber-400 ring-amber-500/20" : type === "middle" ? "bg-rose-500/15 text-rose-400 ring-rose-500/20" : "bg-emerald-500/15 text-emerald-400 ring-emerald-500/20";
                  return (
                    <div key={type}>
                      <label className="block text-sm font-medium text-gold-200/60">{label}</label>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {notes.map((note, i) => (
                          <span key={i} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ${colors}`}>
                            {note}
                            <button type="button" onClick={() => removeNote(type, i)} className="hover:opacity-70">
                              <X size={10} />
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="mt-1.5 flex gap-2">
                        <input
                          type="text"
                          value={noteInput[type]}
                          onChange={(e) => setNoteInput((prev) => ({ ...prev, [type]: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addNote(type); } }}
                          placeholder={`Tambah ${label.toLowerCase()}...`}
                          className="input-dark flex-1 !py-2 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => addNote(type)}
                          className="rounded-lg bg-surface-200 px-3 text-xs text-gold-200/50 ring-1 ring-gold-900/30 hover:ring-gold-700/40"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center gap-3">
            {/* Left: Kembali */}
            {step > 1 && (
              <button
                type="button"
                onClick={handleBack}
                className="text-sm text-gold-200/50 transition-colors hover:text-gold-400"
              >
                Kembali
              </button>
            )}

            <div className="flex-1" />

            {/* Right side buttons */}
            {step < 4 && (
              <>
                <button
                  type="button"
                  onClick={saveDraft}
                  className="rounded-xl border border-gold-900/30 px-5 py-2.5 text-sm font-medium text-gold-200/60 transition-colors hover:border-gold-700/40 hover:text-gold-200"
                >
                  Simpan Draft
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="btn-gold rounded-xl px-6 py-2.5 text-sm font-semibold text-surface-400"
                >
                  Lanjut
                </button>
              </>
            )}

            {step === 4 && (
              <>
                <button
                  type="button"
                  onClick={() => handleSubmit(undefined, true)}
                  disabled={loading}
                  className="rounded-xl border border-gold-900/30 px-5 py-2.5 text-sm font-medium text-gold-200/60 transition-colors hover:border-gold-700/40 hover:text-gold-200 disabled:opacity-50"
                >
                  {loading ? "Membuat..." : "Lewati & Buat Split"}
                </button>
                <button
                  type="button"
                  onClick={() => handleSubmit(undefined, false)}
                  disabled={loading}
                  className="btn-gold flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-surface-400 disabled:opacity-50"
                >
                  {loading && <Loader2 size={16} className="animate-spin" />}
                  Buat Split
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
