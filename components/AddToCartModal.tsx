"use client";

import { useState } from "react";
import { X, Minus, Plus, ShoppingCart, Check } from "lucide-react";
import type { Split, SplitVariant, Perfume, User } from "@/types/database";
import { formatRupiah } from "@/lib/utils";
import { addToCart } from "@/lib/cart";

interface AddToCartModalProps {
  split: Split & { perfume?: Perfume; creator?: User };
  variant: SplitVariant;
  onClose: () => void;
}

export function AddToCartModal({ split, variant, onClose }: AddToCartModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const available = variant.stock - variant.sold;
  const totalPrice = quantity * variant.price;

  function handleAdd() {
    addToCart(split, variant, quantity);
    setAdded(true);
    setTimeout(() => onClose(), 1200);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-gold-900/30 bg-surface-300 p-6 sm:rounded-2xl">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl font-bold text-gold-100">
            Tambah ke Keranjang
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gold-200/50 hover:bg-gold-900/30 hover:text-gold-400"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-gold-900/20 bg-surface-400/80 p-4">
          <p className="text-sm font-medium text-gold-100">
            {split.perfume?.brand} - {split.perfume?.name}
            {split.perfume?.variant ? ` — ${split.perfume.variant}` : ""}
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

        {added ? (
          <div className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500/15 py-3.5 text-sm font-semibold text-emerald-400">
            <Check size={16} /> Ditambahkan ke Keranjang!
          </div>
        ) : (
          <button
            onClick={handleAdd}
            className="btn-gold mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold text-surface-400"
          >
            <ShoppingCart size={16} /> Tambah ke Keranjang
          </button>
        )}
      </div>
    </div>
  );
}
