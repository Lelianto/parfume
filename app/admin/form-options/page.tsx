"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ShieldCheck, Plus, Trash2, Loader2, ArrowLeft, AlertTriangle } from "lucide-react";
import Link from "next/link";

interface FormOption {
  id: string;
  category: string;
  value: string;
}

const CATEGORIES = [
  { key: "brand", label: "Brand" },
  { key: "scent_classification", label: "Klasifikasi Aroma" },
  { key: "brand_type", label: "Tipe Brand" },
  { key: "gender", label: "Gender" },
];

export default function AdminFormOptionsPage() {
  const router = useRouter();
  const [options, setOptions] = useState<FormOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("brand");
  const [newValue, setNewValue] = useState("");
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    async function checkAdmin() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/admin/login"); return; }

      const { count } = await supabase
        .from("admin_users")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);

      if (!count || count === 0) { router.push("/admin/login"); return; }
    }
    checkAdmin();
  }, [router]);

  useEffect(() => {
    fetchOptions();
  }, []);

  async function fetchOptions() {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("form_options")
      .select("id, category, value")
      .order("value");
    setOptions(data ?? []);
    setLoading(false);
  }

  async function handleAdd() {
    if (!newValue.trim()) return;
    setAdding(true);
    setError("");

    const res = await fetch("/api/admin/form-options", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: activeCategory, value: newValue.trim() }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Gagal menambahkan");
    } else {
      setNewValue("");
      await fetchOptions();
    }
    setAdding(false);
  }

  async function handleConfirmDelete() {
    if (!pendingDeleteId) return;
    setDeleting(pendingDeleteId);
    setError("");

    const res = await fetch("/api/admin/form-options", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: pendingDeleteId }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Gagal menghapus");
    } else {
      await fetchOptions();
    }
    setDeleting(null);
    setPendingDeleteId(null);
  }

  async function handleSeed() {
    setSeeding(true);
    setError("");

    const res = await fetch("/api/admin/seed-form-options", { method: "POST" });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Gagal seed data");
    } else {
      await fetchOptions();
    }
    setSeeding(false);
  }

  const filtered = options.filter((o) => o.category === activeCategory);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-8">
      <Link
        href="/admin/dashboard"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-gold-200/40 transition-colors hover:text-gold-400"
      >
        <ArrowLeft size={16} /> Kembali ke Dashboard
      </Link>

      <div className="flex items-center gap-3">
        <ShieldCheck size={22} className="text-gold-400" />
        <h1 className="font-display text-2xl font-bold text-gold-100">Kelola Opsi Form</h1>
      </div>
      <p className="mt-1 text-sm text-gold-200/40">
        Kelola daftar brand, klasifikasi aroma, tipe brand, dan gender yang tersedia di form buat split.
      </p>

      {/* Seed button — only show if no options yet */}
      {!loading && options.length === 0 && (
        <div className="mt-4 rounded-xl border border-gold-700/30 bg-gold-400/5 p-4">
          <p className="text-sm text-gold-200/60">Belum ada data. Klik tombol di bawah untuk mengisi data awal.</p>
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="mt-3 flex items-center gap-2 rounded-lg bg-gold-400/15 px-4 py-2 text-xs font-semibold text-gold-400 transition-colors hover:bg-gold-400/25 disabled:opacity-50"
          >
            {seeding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            {seeding ? "Memuat..." : "Isi Data Awal"}
          </button>
        </div>
      )}

      {/* Category tabs */}
      <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map((cat) => {
          const count = options.filter((o) => o.category === cat.key).length;
          return (
            <button
              key={cat.key}
              onClick={() => { setActiveCategory(cat.key); setNewValue(""); setError(""); }}
              className={`ml-1 mt-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${activeCategory === cat.key
                  ? "bg-gold-400/20 text-gold-400 ring-1 ring-gold-400/40"
                  : "bg-surface-200 text-gold-200/50 ring-1 ring-gold-900/30 hover:ring-gold-700/40"
                }`}
            >
              {cat.label}
              <span className="ml-1.5 text-[10px] opacity-60">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Add new */}
      <div className="mt-4 flex gap-2">
        <input
          type="text"
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd(); } }}
          placeholder={`Tambah ${CATEGORIES.find((c) => c.key === activeCategory)?.label ?? "opsi"} baru...`}
          className="input-dark flex-1 text-sm"
        />
        <button
          onClick={handleAdd}
          disabled={adding || !newValue.trim()}
          className="flex items-center gap-1.5 rounded-xl bg-gold-400/15 px-4 py-2 text-xs font-semibold text-gold-400 transition-colors hover:bg-gold-400/25 disabled:opacity-50"
        >
          {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          Tambah
        </button>
      </div>

      {error && (
        <div className="mt-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Options list */}
      {loading ? (
        <div className="mt-8 flex justify-center">
          <Loader2 size={24} className="animate-spin text-gold-400" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="mt-8 text-center text-sm text-gold-200/30">Belum ada opsi untuk kategori ini.</p>
      ) : (
        <div className="mt-4 space-y-1">
          {filtered.map((opt) => (
            <div
              key={opt.id}
              className="flex items-center justify-between rounded-lg border border-gold-900/10 bg-surface-200/50 px-4 py-2.5"
            >
              <span className="text-sm text-gold-200/70">{opt.value}</span>
              <button
                onClick={() => setPendingDeleteId(opt.id)}
                disabled={!!deleting}
                className="rounded-lg p-1.5 text-gold-200/25 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
              >
                {deleting === opt.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation modal */}
      {pendingDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setPendingDeleteId(null)} />
          <div className="relative w-full max-w-sm rounded-2xl border border-gold-900/20 bg-surface-200 p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-500/15">
                <AlertTriangle size={20} className="text-red-400" />
              </div>
              <div className="flex-1">
                <p className="font-display text-sm font-semibold text-gold-100">Hapus Opsi</p>
                <p className="mt-1 text-sm text-gold-200/50">
                  Hapus &quot;{options.find((o) => o.id === pendingDeleteId)?.value}&quot;? Opsi ini tidak akan tersedia lagi di form buat split.
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setPendingDeleteId(null)}
                className="rounded-xl border border-gold-900/30 px-4 py-2 text-sm text-gold-200/50 transition-colors hover:bg-surface-300"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={!!deleting}
                className="flex items-center gap-1.5 rounded-xl bg-red-500/15 px-4 py-2 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/25 disabled:opacity-50"
              >
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
