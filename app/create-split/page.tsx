"use client";

import { useState, useEffect, useCallback, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft,
  Loader2,
  Video,
  Plus,
  Trash2,
  X,
  Check,
  Camera,
  Tag,
  Sparkles,
  Eye,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { TagInput } from "@/components/TagInput";
import { ComboBox } from "@/components/ComboBox";
import RichTextEditor from "@/components/RichTextEditor";
import { formatRupiah } from "@/lib/utils";
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
  productPhotoCount: number;
  hadBatchCodePhoto: boolean;
  savedAt: string;
}

const DRAFT_KEY = "split_draft";
const CONCENTRATIONS: Concentration[] = ["EDP", "EDT", "Parfum", "EDC", "Cologne"];

const STEPS = [
  { num: 1, label: "Produk & Foto", icon: Camera },
  { num: 2, label: "Harga & Stok", icon: Tag },
  { num: 3, label: "Detail Tambahan", icon: Sparkles },
] as const;

export default function CreateSplitPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState("");
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftToast, setDraftToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

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

  // Product photos (up to 4)
  const MAX_PRODUCT_PHOTOS = 4;
  const [productPhotos, setProductPhotos] = useState<(File | null)[]>([]);
  const [productPhotoPreviews, setProductPhotoPreviews] = useState<string[]>([]);

  // Batch code photo (1)
  const [batchCodePhoto, setBatchCodePhoto] = useState<File | null>(null);
  const [batchCodePhotoPreview, setBatchCodePhotoPreview] = useState("");

  // Video
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
      productPhotoCount: productPhotos.filter(Boolean).length,
      hadBatchCodePhoto: !!batchCodePhoto,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [step, brand, perfumeName, perfumeVariant, description, concentration, brandType, gender, scentClassification, bottleSize, batchCode, isReadyStock, variants, topNotes, middleNotes, baseNotes, scentFamily, productPhotos, batchCodePhoto]);

  const handleSaveDraft = useCallback(async () => {
    setSavingDraft(true);
    setDraftToast(null);
    try {
      saveDraft();
      setDraftSavedAt(new Date().toISOString());
      setDraftToast({ type: "success", message: "Draft berhasil disimpan" });
    } catch {
      setDraftToast({ type: "error", message: "Gagal menyimpan draft" });
    } finally {
      setSavingDraft(false);
      setTimeout(() => setDraftToast(null), 3000);
    }
  }, [saveDraft]);

  function restoreDraft(draft: SplitDraft) {
    // Map old 4-step draft to new 3-step
    const mappedStep = draft.step <= 2 ? draft.step : draft.step === 3 ? 1 : 3;
    setStep(Math.min(mappedStep, 3));
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

    const completed = new Set<number>();
    if (draft.brand.trim() && draft.perfumeName.trim() && (draft.productPhotoCount ?? 0) > 0 && draft.hadBatchCodePhoto) completed.add(1);
    const hasValidVariant = draft.variants.some(
      (v) => Number(v.size_ml) > 0 && Number(v.price) > 0 && Number(v.stock) > 0
    );
    if (Number(draft.bottleSize) > 0 && hasValidVariant) completed.add(2);
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
        return brand.trim().length > 0 && perfumeName.trim().length > 0 && productPhotos.filter(Boolean).length > 0 && !!batchCodePhoto;
      case 2: {
        const hasBottle = Number(bottleSize) > 0;
        const hasVariant = variants.some(
          (v) => Number(v.size_ml) > 0 && Number(v.price) > 0 && Number(v.stock) > 0
        );
        return hasBottle && hasVariant && !isOverCapacity;
      }
      case 3:
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
        if (productPhotos.filter(Boolean).length === 0) return "Minimal 1 foto produk wajib diunggah";
        if (!batchCodePhoto) return "Foto batch code wajib diunggah";
        return "";
      case 2:
        if (Number(bottleSize) <= 0) return "Ukuran botol wajib diisi";
        if (!variants.some((v) => Number(v.size_ml) > 0 && Number(v.price) > 0 && Number(v.stock) > 0))
          return "Minimal 1 varian lengkap (ukuran, harga, stok > 0)";
        if (isOverCapacity)
          return `Total alokasi (${totalAllocatedMl}ml) melebihi ukuran botol (${bottleMl}ml)`;
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
    setStep((s) => Math.min(s + 1, 3));
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

  // --- Helpers ---
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

  async function handleSubmit(e?: FormEvent, skipOptional = false) {
    if (e) e.preventDefault();
    setLoading(true);
    setError("");

    const validProductPhotos = productPhotos.filter((f): f is File => f !== null);
    if (validProductPhotos.length === 0) {
      setError("Minimal 1 foto produk wajib diunggah");
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

      // Upload product photos (up to 4)
      const photoUrls: string[] = [];
      for (let i = 0; i < validProductPhotos.length; i++) {
        const photo = validProductPhotos[i];
        const url = await uploadImage(
          supabase,
          photo,
          "perfume_images",
          `${user.id}/product_${timestamp}_${i}.${photo.name.split(".").pop()}`
        );
        if (!url) {
          setError(`Gagal mengunggah foto produk ${i + 1}`);
          setLoading(false);
          return;
        }
        photoUrls.push(url);
      }

      const batchCodePhotoUrl = await uploadImage(
        supabase,
        batchCodePhoto,
        "perfume_images",
        `${user.id}/batch_${timestamp}.${batchCodePhoto.name.split(".").pop()}`
      );

      if (!batchCodePhotoUrl) {
        setError("Gagal mengunggah foto batch code. Pastikan bucket storage sudah dibuat.");
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

      const finalTopNotes = skipOptional ? [] : topNotes;
      const finalMiddleNotes = skipOptional ? [] : middleNotes;
      const finalBaseNotes = skipOptional ? [] : baseNotes;
      const finalScentFamily = skipOptional ? null : scentFamily || null;

      const { data: perfume, error: perfumeError } = await supabase
        .from("perfumes")
        .insert({
          brand,
          name: perfumeName,
          variant: perfumeVariant.length > 0 ? perfumeVariant.join(", ") : null,
          description: description || null,
          concentration: concentration || null,
          brand_type: skipOptional ? null : brandType || null,
          gender: skipOptional ? null : gender || null,
          scent_classification: skipOptional ? null : scentClassification || null,
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
          bottle_photo_url: photoUrls[0],
          photo_urls: photoUrls,
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

      localStorage.removeItem(DRAFT_KEY);
      router.push(`/split/${split.id}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  // --- Computed ---
  const validVariants = variants.filter((v) => Number(v.size_ml) > 0 && Number(v.price) > 0 && Number(v.stock) > 0);
  const minPrice = validVariants.length > 0 ? Math.min(...validVariants.map((v) => Number(v.price))) : 0;
  const maxPrice = validVariants.length > 0 ? Math.max(...validVariants.map((v) => Number(v.price))) : 0;

  // --- Step Indicator ---
  function StepIndicator() {
    return (
      <div className="mb-8">
        <div className="flex w-full items-center">
          {STEPS.map((s, i) => {
            const isCompleted = completedSteps.has(s.num);
            const isCurrent = step === s.num;
            const isClickable = isCompleted || isCurrent;
            const Icon = s.icon;

            return (
              <div key={s.num} className={`flex items-center ${i < STEPS.length - 1 ? "flex-1" : ""}`}>
                <button
                  type="button"
                  onClick={() => handleStepClick(s.num)}
                  disabled={!isClickable}
                  className={`group relative flex shrink-0 flex-col items-center gap-1.5 ${isClickable ? "cursor-pointer" : ""}`}
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition-all ${
                    isCurrent
                      ? "bg-gold-400 text-surface-400 shadow-lg shadow-gold-400/20"
                      : isCompleted
                      ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30 group-hover:ring-emerald-400/50"
                      : "bg-surface-300 text-gold-200/30 ring-1 ring-gold-900/20"
                  }`}>
                    {isCompleted && !isCurrent ? <Check size={16} /> : <Icon size={16} />}
                  </div>
                  <span className={`hidden text-[10px] font-medium sm:block ${
                    isCurrent ? "text-gold-400" : isCompleted ? "text-emerald-400/70" : "text-gold-200/25"
                  }`}>
                    {s.label}
                  </span>
                </button>

                {i < STEPS.length - 1 && (
                  <div className={`mx-3 mb-5 h-px flex-1 transition-colors sm:mb-6 ${
                    completedSteps.has(s.num) ? "bg-emerald-500/30" : "bg-gold-900/20"
                  }`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Mobile step label */}
        <p className="mt-4 text-center text-sm font-medium text-gold-400 sm:hidden">
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

  const inputClass = "input-dark mt-1";
  const selectClass =
    "w-full rounded-xl border border-gold-900/30 bg-surface-400 px-3 py-2.5 text-sm text-gold-100 outline-none transition-colors focus:border-gold-700/50 focus:ring-1 focus:ring-gold-700/30 disabled:opacity-40";

  return (
    <div className="mx-auto max-w-3xl px-4 pb-8 pt-20 sm:px-6 md:pt-8">
      {/* Draft Toast */}
      {draftToast && (
        <div className="fixed left-1/2 top-6 z-50 -translate-x-1/2 animate-[fadeSlideDown_0.3s_ease-out]">
          <div
            className={`flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-medium shadow-lg backdrop-blur-sm ${
              draftToast.type === "success"
                ? "border border-emerald-500/30 bg-emerald-500/15 text-emerald-300"
                : "border border-red-500/30 bg-red-500/15 text-red-300"
            }`}
          >
            {draftToast.type === "success" ? (
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            {draftToast.message}
          </div>
        </div>
      )}

      <Link
        href="/"
        className="mb-6 hidden items-center gap-1.5 text-sm text-gold-200/50 transition-colors hover:text-gold-400 md:inline-flex"
      >
        <ArrowLeft size={16} /> Kembali
      </Link>

      <h1 className="font-display text-3xl font-bold text-gold-100">Jual Decant Baru</h1>
      <p className="mt-1 text-sm text-gold-200/40">
        Buat listing parfum decant untuk dijual di Wangiverse
      </p>

      <div className="mt-8">
        <DraftBanner />
        <StepIndicator />

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* ═══ STEP 1: Produk & Foto ═══ */}
          {step === 1 && (
            <section className="space-y-6">
              {/* Essential info */}
              <div>
                <h2 className="font-display text-lg font-semibold text-gold-100">Informasi Produk</h2>
                <p className="mt-0.5 text-xs text-gold-200/30">Data utama yang akan dilihat pembeli</p>
              </div>

              <div className="space-y-4">
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
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gold-200/60">Konsentrasi</label>
                  <div className="mt-2 flex flex-wrap gap-2">
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
                <div>
                  <label className="block text-sm font-medium text-gold-200/60">Deskripsi Produk</label>
                  <p className="mb-1 text-[11px] text-gold-200/25">Jelaskan kenapa pembeli harus beli dari kamu</p>
                  <RichTextEditor
                    value={description}
                    onChange={setDescription}
                    placeholder="Contoh: Decant asli dari botol original, diambil dengan syringe steril..."
                  />
                </div>
              </div>

              {/* Product Photos */}
              <div className="pt-2">
                <h2 className="font-display text-lg font-semibold text-gold-100">Foto Produk & Bukti Keaslian</h2>
                <p className="mt-0.5 text-xs text-gold-200/30">Foto yang jelas meningkatkan kepercayaan pembeli</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gold-200/60">Foto Produk * <span className="font-normal text-gold-200/30">({productPhotos.filter(Boolean).length}/{MAX_PRODUCT_PHOTOS})</span></label>
                <p className="mt-0.5 text-[11px] text-gold-200/25">Upload 1–4 foto produk. Foto pertama akan jadi cover utama.</p>
                <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {Array.from({ length: MAX_PRODUCT_PHOTOS }).map((_, idx) => {
                    const preview = productPhotoPreviews[idx];
                    return (
                      <div key={idx} className="relative">
                        <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-gold-900/40 bg-surface-200/50 transition-colors hover:border-gold-700/50 hover:bg-surface-200 overflow-hidden aspect-[4/5]">
                          {preview ? (
                            <div className="relative h-full w-full">
                              <Image src={preview} alt={`Foto ${idx + 1}`} fill className="object-cover" />
                              <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/60 to-transparent pb-2">
                                <span className="text-[10px] font-medium text-white/80">{idx === 0 ? "Cover" : `Foto ${idx + 1}`}</span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-1.5 p-4">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-400/10">
                                <Camera size={16} className="text-gold-400/50" />
                              </div>
                              <p className="text-[10px] font-medium text-gold-200/50">{idx === 0 ? "Cover *" : `Foto ${idx + 1}`}</p>
                            </div>
                          )}
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0] ?? null;
                              if (!file) return;
                              if (!ALLOWED_IMAGE_TYPES.includes(file.type)) { setError("Format gambar harus JPG, PNG, atau WebP"); return; }
                              if (file.size > MAX_IMAGE_SIZE) { setError(`Ukuran gambar maksimal 5MB. File ini ${formatFileSize(file.size)}`); return; }
                              setError("");
                              setProductPhotos(prev => { const next = [...prev]; next[idx] = file; return next; });
                              setProductPhotoPreviews(prev => { const next = [...prev]; next[idx] = URL.createObjectURL(file); return next; });
                            }}
                          />
                        </label>
                        {preview && (
                          <button
                            type="button"
                            onClick={() => {
                              setProductPhotos(prev => { const next = [...prev]; next.splice(idx, 1); return next; });
                              setProductPhotoPreviews(prev => { const next = [...prev]; next.splice(idx, 1); return next; });
                            }}
                            className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-red-500/90 text-white shadow-lg transition-colors hover:bg-red-600"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gold-200/60">Foto Batch Code *</label>
                <label className="mt-1 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-gold-900/40 bg-surface-200/50 transition-colors hover:border-gold-700/50 hover:bg-surface-200 overflow-hidden aspect-[3/2] max-w-xs">
                  {batchCodePhotoPreview ? (
                    <div className="relative h-full w-full">
                      <Image src={batchCodePhotoPreview} alt="Batch Code" fill className="object-cover" />
                      <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/60 to-transparent pb-2">
                        <span className="text-[10px] font-medium text-white/80">Klik untuk ganti</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1.5 p-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-400/10">
                        <Camera size={16} className="text-gold-400/50" />
                      </div>
                      <p className="text-[10px] font-medium text-gold-200/50">Upload batch code</p>
                      <p className="text-[9px] text-gold-200/25">JPG, PNG, WebP · Maks 5MB</p>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) =>
                      handleImageChange(e.target.files?.[0] ?? null, setBatchCodePhoto, setBatchCodePhotoPreview)
                    }
                  />
                </label>
              </div>

              {/* Video Decant (optional) */}
              <div>
                <label className="block text-sm font-medium text-gold-200/60">Video Decant (opsional)</label>
                <label className="mt-1 flex cursor-pointer items-center justify-center gap-3 rounded-xl border border-dashed border-gold-900/40 bg-surface-200/50 p-4 transition-colors hover:border-gold-700/50 hover:bg-surface-200">
                  {decantVideoName ? (
                    <div className="flex items-center gap-3">
                      <Video size={18} className="text-gold-400" />
                      <div>
                        <p className="text-sm font-medium text-gold-200">{decantVideoName}</p>
                        <p className="text-xs text-gold-200/30">{decantVideo && formatFileSize(decantVideo.size)}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <Video size={18} className="text-gold-200/30" />
                      <div>
                        <p className="text-xs font-medium text-gold-200/50">Upload video proses decant</p>
                        <p className="text-[10px] text-gold-200/25">MP4, MOV, WebM · Maks 50MB</p>
                      </div>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="video/mp4,video/quicktime,video/webm"
                    className="hidden"
                    onChange={(e) => handleVideoChange(e.target.files?.[0] ?? null)}
                  />
                </label>
              </div>
            </section>
          )}

          {/* ═══ STEP 2: Harga & Stok ═══ */}
          {step === 2 && (
            <section className="space-y-6">
              <div>
                <h2 className="font-display text-lg font-semibold text-gold-100">Harga & Stok</h2>
                <p className="mt-0.5 text-xs text-gold-200/30">Atur ukuran botol, varian decant, dan ketersediaan</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gold-200/60">Ukuran Botol (ml) *</label>
                  <input
                    type="number"
                    min="1"
                    value={bottleSize}
                    onChange={(e) => setBottleSize(e.target.value)}
                    placeholder="contoh: 100"
                    className={inputClass}
                  />
                  <p className="mt-1 text-[11px] text-gold-200/25">Total isi botol full</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gold-200/60">Batch Code</label>
                  <input
                    type="text"
                    value={batchCode}
                    onChange={(e) => setBatchCode(e.target.value)}
                    placeholder="Opsional, contoh: 3A01"
                    className={inputClass}
                  />
                  <p className="mt-1 text-[11px] text-gold-200/25">Nomor batch produksi botol</p>
                </div>
              </div>

              {/* Variant Rows */}
              <div>
                <label className="block text-sm font-medium text-gold-200/60">Ukuran Decant yang Dijual *</label>
                <p className="mt-0.5 text-[11px] text-gold-200/25">
                  Tambahkan ukuran decant, harga per botol, dan jumlah stok
                </p>

                {/* Header labels for desktop */}
                <div className="mt-3 hidden items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-gold-200/30 sm:flex">
                  <span className="flex-1">Ukuran (ml)</span>
                  <span className="flex-1">Harga (Rp)</span>
                  <span className="w-20">Stok</span>
                  <span className="w-9" />
                </div>

                <div className="mt-2 space-y-2 sm:mt-1">
                  {variants.map((variant, index) => (
                    <div key={index} className="flex flex-wrap items-center gap-2 rounded-xl border border-gold-900/10 bg-surface-200/30 p-2.5 sm:flex-nowrap sm:rounded-lg sm:border-0 sm:bg-transparent sm:p-0">
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
                          placeholder="Harga"
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

              {/* Price preview */}
              {validVariants.length > 0 && (
                <div className="rounded-xl border border-gold-700/20 bg-gold-400/5 p-4">
                  <p className="text-xs font-medium text-gold-200/30 uppercase tracking-wider">Preview Harga</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {validVariants.map((v, i) => (
                      <span key={i} className="rounded-lg bg-surface-300/60 px-3 py-1.5 text-xs text-gold-100">
                        {v.size_ml}ml — <span className="font-semibold text-gold-400">{formatRupiah(Number(v.price))}</span>
                        <span className="text-gold-200/30"> (×{v.stock})</span>
                      </span>
                    ))}
                  </div>
                  {minPrice !== maxPrice && (
                    <p className="mt-2 text-xs text-gold-200/40">
                      Range: {formatRupiah(minPrice)} — {formatRupiah(maxPrice)}
                    </p>
                  )}
                </div>
              )}

              {/* Capacity indicator */}
              {(totalStock > 0 || totalAllocatedMl > 0) && (
                <div className={`rounded-xl border p-4 ${
                  isOverCapacity
                    ? "border-red-500/30 bg-red-500/5"
                    : "border-gold-700/20 bg-gold-400/5"
                }`}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gold-300">
                      <span className="font-semibold text-gold-400">{totalStock} stok</span> dari{" "}
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
                          Melebihi kapasitas botol sebanyak {totalAllocatedMl - bottleMl}ml
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Ready Stock Toggle */}
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gold-900/20 bg-surface-200/50 p-4 transition-colors hover:bg-surface-200">
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
                  <p className="text-[11px] text-gold-200/40">Decant sudah jadi, siap langsung kirim ke pembeli</p>
                </div>
              </label>
            </section>
          )}

          {/* ═══ STEP 3: Detail Tambahan (Optional) ═══ */}
          {step === 3 && (
            <section className="space-y-6">
              <div>
                <h2 className="font-display text-lg font-semibold text-gold-100">Detail Tambahan</h2>
                <p className="mt-0.5 text-xs text-gold-200/30">
                  Opsional — informasi ini membantu pembeli menemukan dan memilih produk kamu
                </p>
              </div>

              {/* Variant names */}
              <div>
                <label className="block text-sm font-medium text-gold-200/60">Varian Parfum</label>
                <TagInput
                  tags={perfumeVariant}
                  onChange={setPerfumeVariant}
                  placeholder="Contoh: LILAC, CHROMA — tekan Enter"
                  className="mt-1"
                />
                <p className="mt-1 text-[11px] text-gold-200/25">
                  Jika parfum ini punya beberapa varian (misal warna/edisi)
                </p>
              </div>

              {/* Categorization */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-gold-200/60">Gender</label>
                  <ComboBox
                    value={gender}
                    onChange={setGender}
                    options={formOptions.gender ?? []}
                    placeholder="Pilih..."
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gold-200/60">Tipe Brand</label>
                  <ComboBox
                    value={brandType}
                    onChange={setBrandType}
                    options={formOptions.brand_type ?? []}
                    placeholder="Pilih..."
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gold-200/60">Klasifikasi Aroma</label>
                  <ComboBox
                    value={scentClassification}
                    onChange={setScentClassification}
                    options={formOptions.scent_classification ?? []}
                    placeholder="Pilih..."
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Fragrance Notes */}
              <div className="rounded-xl border border-gold-900/20 bg-surface-200/30 p-5">
                <h3 className="text-sm font-medium text-gold-100">Fragrance Notes</h3>
                <p className="mt-0.5 text-[11px] text-gold-200/30">
                  Bantu pembeli mengenal profil aroma parfum ini
                </p>

                <div className="mt-4 space-y-4">
                  {(["top", "middle", "base"] as const).map((type) => {
                    const notes = type === "top" ? topNotes : type === "middle" ? middleNotes : baseNotes;
                    const label = type === "top" ? "Top Notes" : type === "middle" ? "Middle Notes" : "Base Notes";
                    const hint = type === "top" ? "Aroma pertama (15-30 menit)" : type === "middle" ? "Aroma utama (2-4 jam)" : "Aroma terakhir (4-8+ jam)";
                    const colors = type === "top" ? "bg-amber-500/15 text-amber-400 ring-amber-500/20" : type === "middle" ? "bg-rose-500/15 text-rose-400 ring-rose-500/20" : "bg-emerald-500/15 text-emerald-400 ring-emerald-500/20";
                    return (
                      <div key={type}>
                        <div className="flex items-baseline justify-between">
                          <label className="text-sm font-medium text-gold-200/60">{label}</label>
                          <span className="text-[10px] text-gold-200/20">{hint}</span>
                        </div>
                        {notes.length > 0 && (
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
                        )}
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

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gold-200/60">Scent Family</label>
                  <input
                    type="text"
                    value={scentFamily}
                    onChange={(e) => setScentFamily(e.target.value)}
                    placeholder="contoh: Woody, Floral, Oriental..."
                    className="input-dark mt-1 !py-2 text-xs"
                  />
                </div>
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

            {step < 3 && (
              <>
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={savingDraft}
                  className="flex items-center gap-2 rounded-xl border border-gold-900/30 px-5 py-2.5 text-sm font-medium text-gold-200/60 transition-colors hover:border-gold-700/40 hover:text-gold-200 disabled:opacity-50"
                >
                  {savingDraft && (
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                  {savingDraft ? "Menyimpan..." : "Simpan Draft"}
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

            {step === 3 && (
              <>
                <button
                  type="button"
                  onClick={() => handleSubmit(undefined, true)}
                  disabled={loading}
                  className="rounded-xl border border-gold-900/30 px-5 py-2.5 text-sm font-medium text-gold-200/60 transition-colors hover:border-gold-700/40 hover:text-gold-200 disabled:opacity-50"
                >
                  {loading ? "Membuat..." : "Lewati & Publish"}
                </button>
                <button
                  type="button"
                  onClick={() => handleSubmit(undefined, false)}
                  disabled={loading}
                  className="btn-gold flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-surface-400 disabled:opacity-50"
                >
                  {loading && <Loader2 size={16} className="animate-spin" />}
                  <Eye size={16} />
                  Publish Listing
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
