"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ProgressBar } from "@/components/ProgressBar";
import { SplitStatusBadge } from "@/components/StatusBadge";
import { JoinSplitModal } from "@/components/JoinSplitModal";
import { ReviewList } from "@/components/ReviewList";
import { FragranceNotes } from "@/components/FragranceNotes";
import type { Split, SplitVariant, Order, Review } from "@/types/database";
import {
  Droplets,
  ShieldCheck,
  Camera,
  Video,
  ArrowLeft,
  CheckCircle2,
  Truck,
  FlaskConical,
  Loader2,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  MapPin,
} from "lucide-react";
import Link from "next/link";
import { formatRupiah } from "@/lib/utils";

export function SplitDetailClient({
  split,
  reviews,
  isLoggedIn,
  hasOrder,
  canReview,
  isCreator,
  orders,
}: {
  split: Split;
  reviews: Review[];
  isLoggedIn: boolean;
  hasOrder: boolean;
  canReview: boolean;
  isCreator: boolean;
  orders: (Order & { user?: { name: string; avatar_url: string | null } })[];
}) {
  const variants = split.variants ?? [];
  const sortedVariants = [...variants].sort((a, b) => a.size_ml - b.size_ml);

  const [selectedVariant, setSelectedVariant] = useState<SplitVariant | null>(
    sortedVariants[0] ?? null
  );
  const [showModal, setShowModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [shippingReceipt, setShippingReceipt] = useState<Record<string, string>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isHidden, setIsHidden] = useState(split.is_hidden ?? false);
  const router = useRouter();

  // Calculate totals from variants
  const totalSold = variants.reduce((s, v) => s + v.sold, 0);
  const totalStock = variants.reduce((s, v) => s + v.stock, 0);

  async function handleSellerAction(orderId: string, newStatus: string) {
    setActionLoading(orderId + newStatus);
    const body: Record<string, string> = { status: newStatus };
    if (newStatus === "shipped") {
      body.shipping_receipt = shippingReceipt[orderId] || "";
      if (!body.shipping_receipt) {
        alert("Nomor resi wajib diisi");
        setActionLoading(null);
        return;
      }
    }

    const res = await fetch(`/api/orders/${orderId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json();
      alert(data.error || "Gagal update status");
    }

    setActionLoading(null);
    router.refresh();
  }

  const activeOrders = orders.filter((o) => o.status !== "cancelled");
  const allConfirmed = activeOrders.length > 0 && activeOrders.every((o) => o.status === "confirmed");
  const hasActiveOrders = activeOrders.some((o) => !["cancelled", "completed"].includes(o.status));

  async function handleToggleVisibility() {
    setActionLoading("visibility");
    const res = await fetch(`/api/splits/${split.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_hidden: !isHidden }),
    });
    if (res.ok) {
      setIsHidden(!isHidden);
    } else {
      const data = await res.json();
      alert(data.error || "Gagal mengubah visibilitas");
    }
    setActionLoading(null);
  }

  async function handleDelete() {
    setActionLoading("delete");
    const res = await fetch(`/api/splits/${split.id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/");
    } else {
      const data = await res.json();
      alert(data.error || "Gagal menghapus split");
      setShowDeleteConfirm(false);
    }
    setActionLoading(null);
  }

  const perfume = split.perfume;
  const hasNotes = perfume && (
    (perfume.top_notes?.length ?? 0) > 0 ||
    (perfume.middle_notes?.length ?? 0) > 0 ||
    (perfume.base_notes?.length ?? 0) > 0
  );

  return (
    <div className="mx-auto max-w-5xl px-4 pb-8 pt-20 sm:px-8 md:pt-8">
      <Link
        href="/"
        className="mb-8 hidden items-center gap-1.5 text-sm text-gold-200/40 transition-colors hover:text-gold-400 md:inline-flex"
      >
        <ArrowLeft size={16} /> Kembali
      </Link>

      <div className="grid gap-10 md:grid-cols-2">
        {/* Images */}
        <div className="space-y-4">
          <div className="relative aspect-[4/5] overflow-hidden rounded-[1.25rem] border border-gold-900/15 bg-surface-300">
            {split.bottle_photo_url ? (
              <Image
                src={split.bottle_photo_url}
                alt="Foto Botol"
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-gold-800/20">
                <Droplets size={64} />
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {split.batch_code_photo_url && (
              <div className="relative aspect-square overflow-hidden rounded-xl border border-gold-900/15 bg-surface-300">
                <Image
                  src={split.batch_code_photo_url}
                  alt="Batch Code"
                  fill
                  className="object-cover"
                />
                <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1 rounded-lg bg-black/60 px-2.5 py-1 text-[11px] text-gold-200/80">
                  <Camera size={11} /> Batch Code
                </div>
              </div>
            )}
            {split.decant_video_url && (
              <a
                href={split.decant_video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex aspect-square items-center justify-center rounded-xl border border-gold-900/15 bg-surface-300 text-gold-200/30 transition-colors hover:border-gold-700/30 hover:text-gold-400"
              >
                <div className="text-center">
                  <Video size={28} className="mx-auto" />
                  <p className="mt-2 text-xs">Lihat Video Decant</p>
                </div>
              </a>
            )}
          </div>
        </div>

        {/* Details */}
        <div>
          <div className="flex items-center justify-between">
            <SplitStatusBadge status={split.status} />
            {isCreator && (
              <div className="flex items-center gap-2">
                <Link
                  href={`/edit-split/${split.id}`}
                  className="flex items-center gap-1.5 rounded-lg border border-gold-900/30 px-3 py-1.5 text-xs font-medium text-gold-200/60 transition-colors hover:border-gold-700/40 hover:text-gold-200"
                >
                  <Pencil size={12} /> Edit
                </Link>
                <button
                  onClick={handleToggleVisibility}
                  disabled={actionLoading === "visibility"}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    isHidden
                      ? "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                      : "border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
                  }`}
                >
                  {actionLoading === "visibility" ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : isHidden ? (
                    <Eye size={12} />
                  ) : (
                    <EyeOff size={12} />
                  )}
                  {isHidden ? "Tampilkan" : "Sembunyikan"}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={hasActiveOrders}
                  title={hasActiveOrders ? "Tidak bisa hapus — masih ada pesanan aktif" : "Hapus split"}
                  className="flex items-center gap-1.5 rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <Trash2 size={12} /> Hapus
                </button>
              </div>
            )}
          </div>

          {/* Hidden banner */}
          {isCreator && isHidden && (
            <div className="mt-3 rounded-lg border border-orange-500/20 bg-orange-500/5 px-4 py-2.5 text-xs text-orange-400">
              Listing ini disembunyikan dan tidak tampil di halaman utama.
            </div>
          )}

          <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-400/60">
            {perfume?.brand}
          </p>
          <h1 className="mt-1.5 font-display text-3xl font-bold tracking-[-0.02em] text-gold-100 sm:text-4xl">
            {perfume?.name}
            {perfume?.variant && (
              <span className="text-gold-200/50"> — {perfume.variant}</span>
            )}
          </h1>

          {/* Concentration badge */}
          {perfume?.concentration && (
            <span className="mt-2 inline-block rounded-full bg-gold-400/10 px-3 py-0.5 text-[11px] font-semibold text-gold-400">
              {perfume.concentration}
            </span>
          )}

          {/* Scent family badge */}
          {perfume?.scent_family && (
            <span className="ml-2 mt-2 inline-block rounded-full bg-surface-200 px-3 py-0.5 text-[11px] font-medium text-gold-200/60 ring-1 ring-gold-900/20">
              {perfume.scent_family}
            </span>
          )}

          <div className="mt-6 space-y-0">
            {[
              { label: "Ukuran Botol", value: `${split.bottle_size_ml}ml` },
              ...(split.batch_code
                ? [{ label: "Batch Code", value: split.batch_code, mono: true }]
                : []),
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between border-b border-gold-900/10 py-3.5 text-sm"
              >
                <span className="text-gold-200/35">{row.label}</span>
                <span className={`font-medium text-gold-100 ${'mono' in row ? 'font-mono text-[13px]' : ''}`}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>

          {/* Size Selector Pills */}
          {sortedVariants.length > 0 && (
            <div className="mt-6">
              <p className="mb-2.5 text-xs font-medium text-gold-200/40">Pilih Ukuran</p>
              <div className="flex flex-wrap gap-2">
                {sortedVariants.map((v) => {
                  const available = v.stock - v.sold;
                  const isSelected = selectedVariant?.id === v.id;
                  const isSoldOut = available <= 0;
                  return (
                    <button
                      key={v.id}
                      onClick={() => !isSoldOut && setSelectedVariant(v)}
                      disabled={isSoldOut}
                      className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                        isSoldOut
                          ? "cursor-not-allowed bg-surface-200/50 text-gold-200/20 line-through ring-1 ring-gold-900/10"
                          : isSelected
                          ? "bg-gold-400/20 text-gold-400 ring-2 ring-gold-400/50"
                          : "bg-surface-200 text-gold-200/70 ring-1 ring-gold-900/30 hover:ring-gold-700/40 hover:text-gold-100"
                      }`}
                    >
                      {v.size_ml} ML
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Selected variant price & stock */}
          {selectedVariant && (
            <div className="mt-4 flex items-center justify-between rounded-xl border border-gold-700/20 bg-gold-400/5 p-4">
              <div>
                <p className="text-xs text-gold-200/40">Harga {selectedVariant.size_ml}ml</p>
                <p className="font-display text-2xl font-bold text-gold-400">
                  {formatRupiah(selectedVariant.price)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gold-200/40">Stok tersedia</p>
                <p className="text-lg font-semibold text-gold-100">
                  {selectedVariant.stock - selectedVariant.sold}
                </p>
              </div>
            </div>
          )}

          {/* Fallback if no variants */}
          {sortedVariants.length === 0 && (
            <div className="mt-4 flex items-center justify-between py-4">
              <span className="text-sm text-gold-200/35">Harga per Slot</span>
              <span className="font-display text-2xl font-bold text-gold-400">
                {formatRupiah(split.price_per_slot)}
              </span>
            </div>
          )}

          <div className="mt-4">
            <ProgressBar
              filled={totalStock > 0 ? totalSold : split.filled_slots}
              total={totalStock > 0 ? totalStock : split.total_slots}
            />
          </div>

          {split.description && (
            <p className="mt-6 text-sm leading-relaxed text-gold-200/40">{split.description}</p>
          )}

          {/* Trust indicators */}
          <div className="mt-6 flex flex-wrap gap-2">
            {split.bottle_photo_url && (
              <div className="flex items-center gap-1.5 rounded-lg border border-emerald-500/15 bg-emerald-500/[0.07] px-3 py-1.5 text-[11px] font-medium text-emerald-400">
                <ShieldCheck size={13} /> Foto Botol
              </div>
            )}
            {split.batch_code_photo_url && (
              <div className="flex items-center gap-1.5 rounded-lg border border-emerald-500/15 bg-emerald-500/[0.07] px-3 py-1.5 text-[11px] font-medium text-emerald-400">
                <ShieldCheck size={13} /> Batch Code
              </div>
            )}
            {split.decant_video_url && (
              <div className="flex items-center gap-1.5 rounded-lg border border-emerald-500/15 bg-emerald-500/[0.07] px-3 py-1.5 text-[11px] font-medium text-emerald-400">
                <ShieldCheck size={13} /> Video Decant
              </div>
            )}
          </div>

          {/* CTA */}
          {split.status === "open" && (
            <div className="mt-8">
              {isLoggedIn ? (
                hasOrder ? (
                  <p className="text-sm font-medium text-emerald-400">
                    Kamu sudah bergabung di split ini.
                  </p>
                ) : (
                  <button
                    onClick={() => setShowModal(true)}
                    disabled={!selectedVariant || (selectedVariant.stock - selectedVariant.sold) <= 0}
                    className="btn-gold w-full rounded-xl py-4 text-sm font-semibold text-surface-400 disabled:opacity-40"
                  >
                    {selectedVariant ? `Beli ${selectedVariant.size_ml}ml — ${formatRupiah(selectedVariant.price)}` : "Pilih ukuran terlebih dahulu"}
                  </button>
                )
              ) : (
                <Link
                  href={`/login?redirectTo=/split/${split.id}`}
                  className="btn-gold block w-full rounded-xl py-4 text-center text-sm font-semibold text-surface-400"
                >
                  Masuk untuk Gabung
                </Link>
              )}
            </div>
          )}

          {/* Creator */}
          {split.creator && (
            <Link
              href={`/seller/${split.created_by}`}
              className="mt-8 flex items-center gap-3.5 rounded-xl border border-gold-900/15 bg-surface-200/50 p-4 transition-colors hover:border-gold-700/30"
            >
              {split.creator.avatar_url && (
                <Image
                  src={split.creator.avatar_url}
                  alt=""
                  width={40}
                  height={40}
                  className="rounded-full ring-1 ring-gold-700/30"
                />
              )}
              <div className="flex-1">
                <p className="text-[11px] uppercase tracking-[0.15em] text-gold-200/25">Seller</p>
                <p className="text-sm font-medium text-gold-100">
                  {split.creator.name}
                </p>
                {(split.creator.store_city || split.creator.city) && (
                  <p className="flex items-center gap-1 text-[11px] text-gold-200/30">
                    <MapPin size={10} />
                    {split.creator.store_city
                      ? `${split.creator.store_city}${split.creator.store_province ? `, ${split.creator.store_province}` : ""}`
                      : split.creator.city}
                  </p>
                )}
              </div>
              <span className="text-xs text-gold-200/30">Lihat Toko →</span>
            </Link>
          )}
        </div>
      </div>

      {/* Fragrance Notes */}
      {hasNotes && perfume && (
        <>
          <div className="my-14 h-px bg-gradient-to-r from-transparent via-gold-700/15 to-transparent" />
          <FragranceNotes
            topNotes={perfume.top_notes ?? []}
            middleNotes={perfume.middle_notes ?? []}
            baseNotes={perfume.base_notes ?? []}
            scentFamily={perfume.scent_family}
          />
        </>
      )}

      {/* Seller Panel */}
      {isCreator && activeOrders.length > 0 && (
        <>
          <div className="my-14 h-px bg-gradient-to-r from-transparent via-gold-700/15 to-transparent" />
          <div>
            <h2 className="font-display text-xl font-bold text-gold-100">Kelola Pesanan</h2>
            <p className="mt-1 text-sm text-gold-200/40">
              {split.is_ready_stock ? "Ready stock — kirim per order setelah konfirmasi bayar" : "Non-ready stock — kirim langsung per order atau mulai bulk decant"}
            </p>

            {/* Bulk decant button for non-ready stock */}
            {!split.is_ready_stock && split.status !== "decanting" && allConfirmed && (
              <div className="mt-4">
                <button
                  onClick={() => handleSellerAction(activeOrders[0].id, "decanting")}
                  disabled={!!actionLoading}
                  className="flex items-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-5 py-3 text-sm font-semibold text-indigo-400 transition-colors hover:bg-indigo-500/20"
                >
                  {actionLoading?.includes("decanting") ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <FlaskConical size={16} />
                  )}
                  Mulai Decant (Semua Order)
                </button>
                <p className="mt-1.5 text-xs text-gold-200/30">
                  Ini akan menutup split dari pembelian baru.
                </p>
              </div>
            )}

            <div className="mt-4 space-y-3">
              {activeOrders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-xl border border-gold-900/20 bg-surface-200/80 p-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gold-100">
                        {order.user?.name || "User"}
                      </p>
                      <p className="text-xs text-gold-200/40">
                        {order.size_ml ? `${order.size_ml}ml` : `${order.slots_purchased} slot`}
                        {" · "}
                        {formatRupiah(order.total_price)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Status-specific actions */}
                      {order.status === "paid" && (
                        <button
                          onClick={() => handleSellerAction(order.id, "confirmed")}
                          disabled={!!actionLoading}
                          className="flex items-center gap-1.5 rounded-lg bg-sky-500/15 px-3 py-1.5 text-xs font-medium text-sky-400 transition-colors hover:bg-sky-500/25"
                        >
                          {actionLoading === order.id + "confirmed" ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <CheckCircle2 size={12} />
                          )}
                          Konfirmasi Bayar
                        </button>
                      )}

                      {(order.status === "confirmed" ||
                        order.status === "decanting") && (
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <input
                            type="text"
                            placeholder="Nomor resi"
                            value={shippingReceipt[order.id] || ""}
                            onChange={(e) =>
                              setShippingReceipt((prev) => ({
                                ...prev,
                                [order.id]: e.target.value,
                              }))
                            }
                            className="input-dark w-full rounded-lg px-3 py-1.5 text-xs sm:w-40"
                          />
                          <button
                            onClick={() => handleSellerAction(order.id, "shipped")}
                            disabled={!!actionLoading}
                            className="flex items-center justify-center gap-1.5 rounded-lg bg-violet-500/15 px-3 py-1.5 text-xs font-medium text-violet-400 transition-colors hover:bg-violet-500/25"
                          >
                            {actionLoading === order.id + "shipped" ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Truck size={12} />
                            )}
                            Kirim
                          </button>
                        </div>
                      )}

                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ${
                        order.status === "pending_payment" ? "bg-orange-500/15 text-orange-400 ring-orange-500/20" :
                        order.status === "paid" ? "bg-blue-500/15 text-blue-400 ring-blue-500/20" :
                        order.status === "confirmed" ? "bg-sky-500/15 text-sky-400 ring-sky-500/20" :
                        order.status === "decanting" ? "bg-indigo-500/15 text-indigo-400 ring-indigo-500/20" :
                        order.status === "shipped" ? "bg-violet-500/15 text-violet-400 ring-violet-500/20" :
                        order.status === "completed" ? "bg-emerald-500/15 text-emerald-400 ring-emerald-500/20" :
                        "bg-red-500/15 text-red-400 ring-red-500/20"
                      }`}>
                        {order.status === "pending_payment" ? "Menunggu Bayar" :
                         order.status === "paid" ? "Sudah Bayar" :
                         order.status === "confirmed" ? "Dikonfirmasi" :
                         order.status === "decanting" ? "Decanting" :
                         order.status === "shipped" ? "Dikirim" :
                         order.status === "completed" ? "Selesai" : "Dibatalkan"}
                      </span>
                    </div>
                  </div>
                  {order.payment_proof_url && (
                    <a
                      href={order.payment_proof_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block text-xs text-blue-400 underline"
                    >
                      Lihat Bukti Bayar
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Divider */}
      <div className="my-14 h-px bg-gradient-to-r from-transparent via-gold-700/15 to-transparent" />

      {/* Reviews */}
      <ReviewList
        reviews={reviews}
        splitId={split.id}
        canReview={canReview}
        onNewReview={() => router.refresh()}
      />

      {showModal && selectedVariant && (
        <JoinSplitModal
          split={split}
          variant={selectedVariant}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            router.refresh();
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-gold-900/20 bg-surface-300 p-6">
            <h3 className="font-display text-lg font-bold text-gold-100">Hapus Split?</h3>
            <p className="mt-2 text-sm text-gold-200/50">
              Split &quot;{perfume?.name}&quot; akan dihapus permanen beserta semua data terkait. Tindakan ini tidak bisa dibatalkan.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 rounded-xl border border-gold-900/30 py-2.5 text-sm font-medium text-gold-200/60 transition-colors hover:border-gold-700/40"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={actionLoading === "delete"}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-500/15 py-2.5 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/25 disabled:opacity-50"
              >
                {actionLoading === "delete" && <Loader2 size={14} className="animate-spin" />}
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
