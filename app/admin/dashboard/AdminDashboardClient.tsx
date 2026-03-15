"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { OrderStatusBadge } from "@/components/StatusBadge";
import type { AdminOrder } from "./page";
import type { PlatformSettings } from "@/types/database";
import {
  ShieldCheck,
  Package,
  Droplets,
  CheckCircle2,
  Loader2,
  Eye,
  XCircle,
  Clock,
  Banknote,
  AlertTriangle,
  Settings,
  Save,
} from "lucide-react";
import { formatRupiah } from "@/lib/utils";

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type Filter = "needs_verification" | "needs_disbursement" | "all" | "confirmed" | "shipped" | "completed" | "cancelled";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "needs_verification", label: "Perlu Verifikasi" },
  { value: "needs_disbursement", label: "Perlu Dicairkan" },
  { value: "all", label: "Semua" },
  { value: "confirmed", label: "Dikonfirmasi" },
  { value: "shipped", label: "Dikirim" },
  { value: "completed", label: "Selesai" },
  { value: "cancelled", label: "Dibatalkan" },
];

export function AdminDashboardClient({
  orders,
  platformSettings: initialSettings,
}: {
  orders: AdminOrder[];
  platformSettings?: PlatformSettings | null;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("needs_verification");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  // Platform settings form
  const [bankName, setBankName] = useState(initialSettings?.bank_name ?? "");
  const [bankAccountNumber, setBankAccountNumber] = useState(initialSettings?.bank_account_number ?? "");
  const [bankAccountName, setBankAccountName] = useState(initialSettings?.bank_account_name ?? "");
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState("");

  const filtered = orders.filter((o) => {
    if (filter === "needs_verification") return o.status === "paid";
    if (filter === "needs_disbursement") return o.status === "completed" && o.disbursement_status === "pending";
    if (filter === "all") return true;
    return o.status === filter;
  });

  const needsVerification = orders.filter((o) => o.status === "paid").length;
  const needsDisbursement = orders.filter((o) => o.status === "completed" && o.disbursement_status === "pending").length;

  async function handleVerify(orderId: string) {
    setActionLoading(orderId + "confirm");

    const res = await fetch(`/api/admin/orders/${orderId}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "confirm" }),
    });

    if (!res.ok) {
      let errMsg = "Gagal verifikasi";
      try {
        const data = await res.json();
        errMsg = data.error || errMsg;
      } catch {
        errMsg = `Server error (${res.status})`;
      }
      alert(errMsg);
    }

    setActionLoading(null);
    router.refresh();
  }

  async function handleReject(orderId: string) {
    if (!confirm("Tolak pembayaran ini? Order akan dibatalkan.")) return;
    setActionLoading(orderId + "reject");

    const res = await fetch(`/api/admin/orders/${orderId}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reject" }),
    });

    if (!res.ok) {
      let errMsg = "Gagal menolak";
      try {
        const data = await res.json();
        errMsg = data.error || errMsg;
      } catch {
        errMsg = `Server error (${res.status})`;
      }
      alert(errMsg);
    }

    setActionLoading(null);
    router.refresh();
  }

  async function handleDisburse(orderId: string) {
    if (!confirm("Tandai dana sudah dicairkan ke rekening seller?")) return;
    setActionLoading(orderId + "disburse");

    const res = await fetch(`/api/admin/orders/${orderId}/disburse`, {
      method: "POST",
    });

    if (!res.ok) {
      let errMsg = "Gagal mencairkan";
      try {
        const data = await res.json();
        errMsg = data.error || errMsg;
      } catch {
        errMsg = `Server error (${res.status})`;
      }
      alert(errMsg);
    }

    setActionLoading(null);
    router.refresh();
  }

  async function handleSaveSettings() {
    setSettingsLoading(true);
    setSettingsMsg("");

    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bank_name: bankName,
        bank_account_number: bankAccountNumber,
        bank_account_name: bankAccountName,
      }),
    });

    if (!res.ok) {
      let errMsg = "Gagal menyimpan";
      try {
        const data = await res.json();
        errMsg = data.error || errMsg;
      } catch {
        errMsg = `Server error (${res.status})`;
      }
      setSettingsMsg(errMsg);
    } else {
      setSettingsMsg("Tersimpan!");
      setTimeout(() => setSettingsMsg(""), 3000);
    }

    setSettingsLoading(false);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
      <div className="flex items-center gap-3">
        <ShieldCheck size={22} className="text-gold-400" />
        <h1 className="font-display text-2xl font-bold text-gold-100">Admin Dashboard</h1>
      </div>
      <p className="mt-1 text-sm text-gold-200/40">
        Verifikasi pembayaran dan kelola pesanan platform.
      </p>

      {/* Stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-gold-900/20 bg-surface-200/60 p-4">
          <p className="text-xs text-gold-200/40">Perlu Verifikasi</p>
          <p className="mt-1 font-display text-2xl font-bold text-orange-400">{needsVerification}</p>
        </div>
        <div className="rounded-xl border border-gold-900/20 bg-surface-200/60 p-4">
          <p className="text-xs text-gold-200/40">Perlu Dicairkan</p>
          <p className="mt-1 font-display text-2xl font-bold text-violet-400">{needsDisbursement}</p>
        </div>
        <div className="rounded-xl border border-gold-900/20 bg-surface-200/60 p-4">
          <p className="text-xs text-gold-200/40">Total Pesanan</p>
          <p className="mt-1 font-display text-2xl font-bold text-gold-100">{orders.length}</p>
        </div>
        <div className="rounded-xl border border-gold-900/20 bg-surface-200/60 p-4">
          <p className="text-xs text-gold-200/40">Selesai</p>
          <p className="mt-1 font-display text-2xl font-bold text-emerald-400">
            {orders.filter((o) => o.status === "completed").length}
          </p>
        </div>
      </div>

      {/* Platform Settings */}
      <div className="mt-6 rounded-2xl border border-gold-900/20 bg-surface-200/60 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Settings size={16} className="text-gold-400" />
          <h2 className="text-sm font-semibold text-gold-200/60">Rekening Platform (Escrow)</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="block text-xs text-gold-200/40 mb-1">Bank</label>
            <input
              type="text"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="BCA, Mandiri, dll"
              className="input-dark w-full"
            />
          </div>
          <div>
            <label className="block text-xs text-gold-200/40 mb-1">Nomor Rekening</label>
            <input
              type="text"
              value={bankAccountNumber}
              onChange={(e) => setBankAccountNumber(e.target.value)}
              placeholder="1234567890"
              className="input-dark w-full"
            />
          </div>
          <div>
            <label className="block text-xs text-gold-200/40 mb-1">Nama Pemilik</label>
            <input
              type="text"
              value={bankAccountName}
              onChange={(e) => setBankAccountName(e.target.value)}
              placeholder="PT Wangiverse"
              className="input-dark w-full"
            />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={handleSaveSettings}
            disabled={settingsLoading}
            className="flex items-center gap-2 rounded-lg bg-gold-400/15 px-4 py-2 text-xs font-semibold text-gold-400 transition-colors hover:bg-gold-400/25 disabled:opacity-50"
          >
            {settingsLoading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Simpan
          </button>
          {settingsMsg && (
            <span className={`text-xs ${settingsMsg === "Tersimpan!" ? "text-emerald-400" : "text-red-400"}`}>
              {settingsMsg}
            </span>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              filter === f.value
                ? "bg-gold-400/20 text-gold-400 ring-1 ring-gold-400/40"
                : "bg-surface-200 text-gold-200/50 ring-1 ring-gold-900/30 hover:ring-gold-700/40"
            }`}
          >
            {f.label}
            {f.value === "needs_verification" && needsVerification > 0 && (
              <span className="ml-1.5 rounded-full bg-orange-500/20 px-1.5 text-[10px] font-semibold text-orange-400">
                {needsVerification}
              </span>
            )}
            {f.value === "needs_disbursement" && needsDisbursement > 0 && (
              <span className="ml-1.5 rounded-full bg-violet-500/20 px-1.5 text-[10px] font-semibold text-violet-400">
                {needsDisbursement}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Orders */}
      {filtered.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-dashed border-gold-900/30 py-16 text-center">
          <Package size={48} className="mx-auto text-gold-800/30" />
          <p className="mt-4 text-gold-200/50">
            {filter === "needs_verification"
              ? "Tidak ada pembayaran yang perlu diverifikasi."
              : filter === "needs_disbursement"
              ? "Tidak ada dana yang perlu dicairkan."
              : "Tidak ada pesanan."}
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {filtered.map((order) => {
            const isExpanded = expandedOrder === order.id;
            return (
              <div
                key={order.id}
                className="rounded-2xl border border-gold-900/20 bg-surface-200/80 p-4"
              >
                <div
                  className="flex cursor-pointer gap-4"
                  onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                >
                  <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl border border-gold-900/15 bg-surface-300">
                    {order.split?.bottle_photo_url ? (
                      <Image src={order.split.bottle_photo_url} alt="" fill className="object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-gold-800/30">
                        <Droplets size={18} />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-display text-sm font-semibold text-gold-100">
                          {order.split?.perfume?.brand} — {order.split?.perfume?.name}{order.split?.perfume?.variant ? ` (${order.split.perfume.variant})` : ""}
                        </p>
                        <div className="mt-1 flex flex-col gap-1 text-xs text-gold-200/40 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 sm:gap-y-1">
                          <span>Pembeli: <span className="text-gold-200/60">{order.user?.name}</span></span>
                          <span>Seller: <span className="text-gold-200/60">{order.split?.creator?.name}</span></span>
                          <span>{order.size_ml ? `${order.size_ml}ml` : `${order.slots_purchased} slot`}</span>
                          <span className="font-medium text-gold-400">{formatRupiah(order.total_price)}</span>
                          <span>{formatDate(order.created_at)}</span>
                        </div>
                      </div>
                      <OrderStatusBadge status={order.status} />
                    </div>
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="mt-4 border-t border-gold-900/15 pt-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      {/* Payment proof */}
                      <div>
                        <p className="mb-2 text-xs font-semibold text-gold-200/50">Bukti Pembayaran</p>
                        {order.payment_proof_url ? (
                          <a
                            href={order.payment_proof_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group relative inline-block"
                          >
                            <div className="relative aspect-[3/4] w-[160px] overflow-hidden rounded-xl border border-gold-900/15 transition-all group-hover:border-gold-700/30">
                              <Image src={order.payment_proof_url} alt="Bukti Bayar" fill className="object-cover" />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
                                <Eye size={20} className="text-white opacity-0 transition-opacity group-hover:opacity-100" />
                              </div>
                            </div>
                          </a>
                        ) : (
                          <div className="flex h-32 w-[160px] items-center justify-center rounded-xl border border-dashed border-gold-900/30 text-xs text-gold-200/30">
                            Belum upload
                          </div>
                        )}
                      </div>

                      {/* Order info */}
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gold-200/40">Order ID</span>
                          <span className="font-mono text-gold-200/60">{order.id.slice(0, 8)}...</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gold-200/40">Pembeli</span>
                          <span className="text-gold-200/60">{order.user?.name} ({order.user?.email})</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gold-200/40">Seller</span>
                          <span className="text-gold-200/60">{order.split?.creator?.name} ({order.split?.creator?.email})</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gold-200/40">Total</span>
                          <span className="font-medium text-gold-400">{formatRupiah(order.total_price)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gold-200/40">Tanggal</span>
                          <span className="text-gold-200/60">{formatDate(order.created_at)}</span>
                        </div>
                        {order.payment_deadline && (
                          <div className="flex justify-between">
                            <span className="text-gold-200/40">Batas Bayar</span>
                            <span className="text-gold-200/60">{formatDate(order.payment_deadline)}</span>
                          </div>
                        )}
                        {order.shipping_receipt && (
                          <div className="flex justify-between">
                            <span className="text-gold-200/40">Resi</span>
                            <span className="font-mono text-gold-200/60">{order.shipping_receipt}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Admin actions for paid orders */}
                    {order.status === "paid" && (
                      <div className="mt-4 flex gap-3">
                        <button
                          onClick={() => handleVerify(order.id)}
                          disabled={!!actionLoading}
                          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500/15 py-3 text-sm font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/25 disabled:opacity-50"
                        >
                          {actionLoading === order.id + "confirm" ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <CheckCircle2 size={16} />
                          )}
                          Verifikasi Pembayaran
                        </button>
                        <button
                          onClick={() => handleReject(order.id)}
                          disabled={!!actionLoading}
                          className="flex items-center justify-center gap-2 rounded-xl border border-red-500/30 px-6 py-3 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50"
                        >
                          {actionLoading === order.id + "reject" ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <XCircle size={14} />
                          )}
                          Tolak
                        </button>
                      </div>
                    )}

                    {order.status === "pending_payment" && (
                      <div className="mt-4 flex items-center gap-2 text-xs text-orange-400">
                        <Clock size={12} /> Menunggu pembeli upload bukti bayar
                      </div>
                    )}

                    {/* Disbursement section for completed orders */}
                    {order.status === "completed" && order.disbursement_status === "pending" && (
                      <div className="mt-4 space-y-3 border-t border-gold-900/15 pt-4">
                        <div className="flex items-center gap-2 text-xs font-semibold text-violet-400">
                          <Banknote size={14} /> Pencairan Dana ke Seller
                        </div>
                        {order.split?.creator?.bank_name ? (
                          <div className="rounded-lg bg-surface-300/60 p-3 text-xs space-y-1.5">
                            <div className="flex justify-between">
                              <span className="text-gold-200/40">Bank Seller</span>
                              <span className="font-medium text-gold-100">{order.split.creator.bank_name}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gold-200/40">No. Rekening</span>
                              <span className="font-mono font-medium text-gold-100">{order.split.creator.bank_account_number}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gold-200/40">Atas Nama</span>
                              <span className="font-medium text-gold-100">{order.split.creator.bank_account_name}</span>
                            </div>
                            <div className="flex justify-between border-t border-gold-900/10 pt-1.5">
                              <span className="text-gold-200/40">Jumlah Transfer</span>
                              <span className="font-semibold text-gold-400">{formatRupiah(order.total_price)}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 rounded-lg bg-orange-500/10 p-3 text-xs text-orange-400">
                            <AlertTriangle size={14} />
                            Seller belum mengisi rekening bank di profil.
                          </div>
                        )}
                        <button
                          onClick={() => handleDisburse(order.id)}
                          disabled={!!actionLoading}
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-500/15 py-3 text-sm font-semibold text-violet-400 transition-colors hover:bg-violet-500/25 disabled:opacity-50"
                        >
                          {actionLoading === order.id + "disburse" ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <Banknote size={16} />
                          )}
                          Tandai Sudah Dicairkan
                        </button>
                      </div>
                    )}

                    {order.status === "completed" && order.disbursement_status === "disbursed" && (
                      <div className="mt-4 flex items-center gap-2 text-xs text-emerald-400">
                        <CheckCircle2 size={12} /> Dana sudah dicairkan
                        {order.disbursed_at && ` — ${formatDate(order.disbursed_at)}`}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
