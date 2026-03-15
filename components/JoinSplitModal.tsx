"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { X, Minus, Plus } from "lucide-react";
import type { Split, SplitVariant } from "@/types/database";

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

interface JoinSplitModalProps {
  split: Split;
  variant: SplitVariant;
  onClose: () => void;
  onSuccess: () => void;
}

export function JoinSplitModal({ split, variant, onClose, onSuccess }: JoinSplitModalProps) {
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const available = variant.stock - variant.sold;
  const totalPrice = quantity * variant.price;

  async function handleJoin() {
    setLoading(true);
    setError("");

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Silakan login terlebih dahulu");
      setLoading(false);
      return;
    }

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

    onSuccess();
    router.push(`/my-orders/${orderId}`);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-md rounded-t-2xl border border-gold-900/30 bg-surface-300 p-6 sm:rounded-2xl">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl font-bold text-gold-100">Gabung Split</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-gold-200/50 hover:bg-gold-900/30 hover:text-gold-400">
            <X size={20} />
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-gold-900/20 bg-surface-400/80 p-4">
          <p className="text-sm font-medium text-gold-100">
            {split.perfume?.brand} - {split.perfume?.name}
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

        {error && (
          <p className="mt-3 text-sm text-red-400">{error}</p>
        )}

        <button
          onClick={handleJoin}
          disabled={loading}
          className="btn-gold mt-4 w-full rounded-xl py-3.5 text-sm font-semibold text-surface-400"
        >
          {loading ? "Memproses..." : `Beli ${variant.size_ml}ml — ${formatRupiah(totalPrice)}`}
        </button>

        <p className="mt-3 text-center text-xs text-gold-200/30">
          Dengan bergabung, Anda setuju untuk menyelesaikan pembayaran.
        </p>
      </div>
    </div>
  );
}
