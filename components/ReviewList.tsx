"use client";

import { useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Star } from "lucide-react";
import type { Review } from "@/types/database";

function StarRating({
  rating,
  interactive = false,
  onChange,
}: {
  rating: number;
  interactive?: boolean;
  onChange?: (r: number) => void;
}) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          disabled={!interactive}
          onClick={() => onChange?.(i)}
          className={interactive ? "cursor-pointer" : "cursor-default"}
        >
          <Star
            size={15}
            className={
              i <= rating
                ? "fill-gold-400 text-gold-400"
                : "text-gold-800/40"
            }
          />
        </button>
      ))}
    </div>
  );
}

export function ReviewList({
  reviews,
  splitId,
  canReview,
  onNewReview,
}: {
  reviews: Review[];
  splitId: string;
  canReview: boolean;
  onNewReview?: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("reviews").insert({
      user_id: user.id,
      split_id: splitId,
      rating,
      comment: comment || null,
    });

    setShowForm(false);
    setComment("");
    setRating(5);
    setLoading(false);
    onNewReview?.();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="font-display text-xl font-bold text-gold-100">Ulasan</h3>
        {canReview && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="text-sm font-medium text-gold-400 transition-colors hover:text-gold-300"
          >
            Tulis Ulasan
          </button>
        )}
      </div>

      {showForm && (
        <div className="mt-4 rounded-xl border border-gold-900/30 bg-surface-200/80 p-5">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gold-200/60">Rating:</span>
            <StarRating rating={rating} interactive onChange={setRating} />
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Tulis komentar (opsional)..."
            className="input-dark mt-3"
            rows={3}
          />
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="btn-gold rounded-lg px-5 py-2.5 text-sm font-medium text-surface-400 disabled:opacity-50"
            >
              {loading ? "Mengirim..." : "Kirim Ulasan"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gold-200/50 transition-colors hover:bg-gold-900/20 hover:text-gold-200"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {reviews.length === 0 ? (
        <p className="mt-4 text-sm text-gold-200/30">Belum ada ulasan.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {reviews.map((review) => (
            <div key={review.id} className="rounded-xl border border-gold-900/20 bg-surface-200/60 p-4">
              <div className="flex items-center gap-3">
                {review.user?.avatar_url && (
                  <Image
                    src={review.user.avatar_url}
                    alt=""
                    width={28}
                    height={28}
                    className="rounded-full ring-1 ring-gold-700/40"
                  />
                )}
                <div>
                  <p className="text-sm font-medium text-gold-100">
                    {review.user?.name || "Anonim"}
                  </p>
                  <StarRating rating={review.rating} />
                </div>
              </div>
              {review.comment && (
                <p className="mt-2 text-sm leading-relaxed text-gold-200/50">{review.comment}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
