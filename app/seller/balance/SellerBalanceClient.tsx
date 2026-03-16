"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { SellerBalance, Withdrawal, WithdrawalStatus } from "@/types/database";
import { formatRupiah } from "@/lib/utils";
import {
  Wallet,
  TrendingUp,
  ArrowDownToLine,
  Loader2,
  Clock,
  AlertTriangle,
  ArrowLeft,
  Banknote,
} from "lucide-react";

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

export function SellerBalanceClient({
  balance,
  withdrawals,
  bankInfo,
}: {
  balance: SellerBalance;
  withdrawals: Withdrawal[];
  bankInfo: { bank_name: string | null; bank_account_number: string | null; bank_account_name: string | null } | null;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const hasBankInfo = bankInfo?.bank_name && bankInfo?.bank_account_number && bankInfo?.bank_account_name;
  const hasPendingWithdrawal = withdrawals.some((w) => w.status === "pending" || w.status === "approved");

  async function handleWithdraw() {
    setError("");
    setSuccess("");
    const numAmount = Number(amount);

    if (!numAmount || numAmount <= 0) {
      setError("Masukkan jumlah yang valid");
      return;
    }

    if (numAmount > balance.balance) {
      setError("Jumlah melebihi saldo");
      return;
    }

    setLoading(true);
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
      setError(errMsg);
      setLoading(false);
      return;
    }

    setSuccess("Penarikan berhasil diajukan! Admin akan memprosesnya.");
    setAmount("");
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pb-8 pt-20 sm:px-8 md:pt-8">
      <Link
        href="/seller/orders"
        className="mb-6 hidden items-center gap-1.5 text-sm text-gold-200/40 transition-colors hover:text-gold-400 md:inline-flex"
      >
        <ArrowLeft size={16} /> Kembali ke Kelola Pesanan
      </Link>

      <div className="flex items-center gap-3">
        <Wallet size={22} className="text-gold-400" />
        <h1 className="font-display text-2xl font-bold text-gold-100">Saldo Saya</h1>
      </div>
      <p className="mt-1 text-sm text-gold-200/40">
        Kelola saldo dan ajukan penarikan dana.
      </p>

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
                <Link href="/profile" className="text-gold-400 underline">halaman profil</Link>
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
            {/* Bank info preview */}
            <div className="rounded-lg bg-surface-300/60 p-3 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-gold-200/40">Bank</span>
                <span className="font-medium text-gold-100">{bankInfo.bank_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gold-200/40">No. Rekening</span>
                <span className="font-mono font-medium text-gold-100">{bankInfo.bank_account_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gold-200/40">Atas Nama</span>
                <span className="font-medium text-gold-100">{bankInfo.bank_account_name}</span>
              </div>
            </div>

            {/* Amount input */}
            <div>
              <label className="block text-xs text-gold-200/40 mb-1.5">Jumlah Penarikan</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gold-200/40 pointer-events-none">Rp</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
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
                  onClick={() => setAmount(String(balance.balance))}
                  className="text-[11px] font-medium text-gold-400 hover:underline"
                >
                  Tarik Semua
                </button>
              </div>
            </div>

            <button
              onClick={handleWithdraw}
              disabled={loading}
              className="btn-gold flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold text-surface-400"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowDownToLine size={16} />}
              Ajukan Penarikan
            </button>
          </div>
        )}

        {error && (
          <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
            {error}
          </div>
        )}
        {success && (
          <div className="mt-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-400">
            {success}
          </div>
        )}
      </div>

      {/* Withdrawal History */}
      <div className="mt-6">
        <h2 className="mb-4 text-sm font-semibold text-gold-200/60">Riwayat Penarikan</h2>
        {withdrawals.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gold-900/30 py-12 text-center">
            <ArrowDownToLine size={36} className="mx-auto text-gold-800/30" />
            <p className="mt-3 text-sm text-gold-200/40">Belum ada riwayat penarikan</p>
          </div>
        ) : (
          <div className="space-y-3">
            {withdrawals.map((w) => (
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
    </div>
  );
}
