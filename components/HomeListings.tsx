"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { SearchFilter } from "./SearchFilter";
import { SplitGrid } from "./SplitGrid";
import type { Split } from "@/types/database";

export interface FilterState {
  q: string;
  brand: string;
  concentration: string;
  scent: string;
  sort: string;
  price_min: string;
  price_max: string;
}

interface HomeListingsProps {
  initialSplits: Split[];
  brands: string[];
  isLoggedIn: boolean;
  wishlistedIds: string[];
}

export function HomeListings({
  initialSplits,
  brands,
  isLoggedIn,
  wishlistedIds,
}: HomeListingsProps) {
  const [splits, setSplits] = useState<Split[]>(initialSplits);
  const [loading, setLoading] = useState(false);
  const isFirstRender = useRef(true);

  const [filters, setFilters] = useState<FilterState>({
    q: "",
    brand: "",
    concentration: "",
    scent: "",
    sort: "newest",
    price_min: "",
    price_max: "",
  });

  const fetchSplits = useCallback(async (f: FilterState) => {
    setLoading(true);
    try {
      const supabase = createClient();
      let query = supabase
        .from("splits")
        .select("*, perfume:perfumes(*), variants:split_variants(*), reviews:reviews(rating)");

      // Search
      if (f.q) {
        const safeQ = f.q.replace(/[%_,.()"'\\]/g, "");
        if (safeQ) {
          query = query.or(
            `brand.ilike.%${safeQ}%,name.ilike.%${safeQ}%`,
            { referencedTable: "perfumes" }
          );
        }
      }

      // Price filter
      const priceMin = Number(f.price_min);
      if (f.price_min && !isNaN(priceMin)) {
        query = query.gte("price_per_slot", priceMin);
      }
      const priceMax = Number(f.price_max);
      if (f.price_max && !isNaN(priceMax)) {
        query = query.lte("price_per_slot", priceMax);
      }

      // Sort
      if (f.sort === "price_asc") {
        query = query.order("price_per_slot", { ascending: true });
      } else if (f.sort === "price_desc") {
        query = query.order("price_per_slot", { ascending: false });
      } else {
        query = query.order("created_at", { ascending: false });
      }

      const { data } = await query;

      // Client-side filters (brand, concentration, scent, hidden)
      const active = ((data ?? []) as unknown as Split[]).filter(
        (s) =>
          s.perfume &&
          !s.is_hidden &&
          (!f.brand || s.perfume.brand === f.brand) &&
          (!f.concentration || s.perfume.concentration === f.concentration) &&
          (!f.scent || s.perfume.scent_family === f.scent)
      );

      // Compute avg_rating
      const withRating = active.map((s) => {
        const reviews: { rating: number }[] =
          (s as Split & { reviews?: { rating: number }[] }).reviews ?? [];
        const avg =
          reviews.length > 0
            ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
            : null;
        return { ...s, avg_rating: avg, review_count: reviews.length || null };
      });

      setSplits(withRating);
    } catch {
      // Keep current splits on error
    } finally {
      setLoading(false);
    }
  }, []);

  // When filters change, update URL (no navigation) and fetch
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    fetchSplits(filters);
  }, [filters, fetchSplits]);

  const handleFilterChange = useCallback((updates: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleClearAll = useCallback(() => {
    setFilters({
      q: "",
      brand: "",
      concentration: "",
      scent: "",
      sort: "newest",
      price_min: "",
      price_max: "",
    });
  }, []);

  return (
    <>
      <div className="mt-4 sm:mt-6">
        <SearchFilter
          brands={brands}
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearAll={handleClearAll}
        />
      </div>
      <SplitGrid
        splits={splits}
        isLoggedIn={isLoggedIn}
        wishlistedIds={wishlistedIds}
        loading={loading}
      />
    </>
  );
}
