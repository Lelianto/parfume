import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// PATCH /api/splits/[id] — update split fields or toggle visibility
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify ownership
    const { data: split } = await supabase
      .from("splits")
      .select("id, created_by, perfume_id")
      .eq("id", id)
      .single();

    if (!split) {
      return NextResponse.json({ error: "Split tidak ditemukan" }, { status: 404 });
    }

    if (split.created_by !== user.id) {
      return NextResponse.json({ error: "Bukan pemilik split ini" }, { status: 403 });
    }

    const body = await request.json();

    // Toggle visibility
    if (typeof body.is_hidden === "boolean" && Object.keys(body).length === 1) {
      const { error } = await supabase
        .from("splits")
        .update({ is_hidden: body.is_hidden })
        .eq("id", id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    // Full edit
    const {
      brand,
      perfumeName,
      perfumeVariant,
      description,
      concentration,
      bottleSize,
      batchCode,
      isReadyStock,
      variants,
      topNotes,
      middleNotes,
      baseNotes,
      scentFamily,
      brandType,
      gender,
      scentClassification,
      bottlePhotoUrl,
      batchCodePhotoUrl,
      decantVideoUrl,
    } = body;

    // Update perfume
    if (brand !== undefined) {
      const { error: perfumeError } = await supabase
        .from("perfumes")
        .update({
          brand,
          name: perfumeName,
          variant: perfumeVariant !== undefined ? (perfumeVariant || null) : undefined,
          description: description || null,
          concentration: concentration || null,
          top_notes: topNotes ?? [],
          middle_notes: middleNotes ?? [],
          base_notes: baseNotes ?? [],
          scent_family: scentFamily || null,
          brand_type: brandType || null,
          gender: gender || null,
          scent_classification: scentClassification || null,
        })
        .eq("id", split.perfume_id);

      if (perfumeError) {
        return NextResponse.json({ error: `[perfumes] ${perfumeError.message}` }, { status: 500 });
      }
    }

    // Update split
    const splitUpdate: Record<string, unknown> = {};
    if (bottleSize !== undefined) splitUpdate.bottle_size_ml = Number(bottleSize);
    if (batchCode !== undefined) splitUpdate.batch_code = batchCode || null;
    if (typeof isReadyStock === "boolean") splitUpdate.is_ready_stock = isReadyStock;
    if (description !== undefined) splitUpdate.description = description || null;
    if (bottlePhotoUrl !== undefined) splitUpdate.bottle_photo_url = bottlePhotoUrl || null;
    if (batchCodePhotoUrl !== undefined) splitUpdate.batch_code_photo_url = batchCodePhotoUrl || null;
    if (decantVideoUrl !== undefined) splitUpdate.decant_video_url = decantVideoUrl || null;

    // Update backward-compat fields from first variant
    if (variants?.length > 0) {
      const validVariants = variants.filter(
        (v: { size_ml: number; price: number; stock: number }) =>
          v.size_ml > 0 && v.price > 0 && v.stock > 0
      );
      if (validVariants.length > 0) {
        splitUpdate.split_size_ml = validVariants[0].size_ml;
        splitUpdate.price_per_slot = validVariants[0].price;
        splitUpdate.total_slots = validVariants.reduce(
          (s: number, v: { stock: number }) => s + v.stock,
          0
        );
      }
    }

    if (Object.keys(splitUpdate).length > 0) {
      const { error: splitError } = await supabase
        .from("splits")
        .update(splitUpdate)
        .eq("id", id);

      if (splitError) {
        return NextResponse.json({ error: `[splits] ${splitError.message}` }, { status: 500 });
      }
    }

    // Update variants — upsert existing, remove stale
    if (variants?.length > 0) {
      const validVariants = variants.filter(
        (v: { size_ml: number; price: number; stock: number }) =>
          v.size_ml > 0 && v.price > 0 && v.stock > 0
      );

      // Get existing variants
      const { data: existingVariants } = await supabase
        .from("split_variants")
        .select("id, size_ml, sold")
        .eq("split_id", id);

      const existingMap = new Map(
        (existingVariants ?? []).map((v) => [v.size_ml, v])
      );
      const newSizes = new Set(validVariants.map((v: { size_ml: number }) => v.size_ml));

      // Delete variants that are no longer in the list (only if no sold orders)
      for (const existing of existingVariants ?? []) {
        if (!newSizes.has(existing.size_ml) && existing.sold === 0) {
          await supabase.from("split_variants").delete().eq("id", existing.id);
        }
      }

      // Upsert each variant
      for (const v of validVariants as { size_ml: number; price: number; stock: number }[]) {
        const existing = existingMap.get(v.size_ml);
        if (existing) {
          // Update existing — preserve sold count
          await supabase
            .from("split_variants")
            .update({ price: v.price, stock: v.stock })
            .eq("id", existing.id);
        } else {
          // Insert new
          const { error: insertErr } = await supabase
            .from("split_variants")
            .insert({
              split_id: id,
              size_ml: v.size_ml,
              price: v.price,
              stock: v.stock,
              sold: 0,
            });

          if (insertErr) {
            return NextResponse.json({ error: `[variants] ${insertErr.message}` }, { status: 500 });
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan server";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/splits/[id] — delete split (only if no active orders)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify ownership
  const { data: split } = await supabase
    .from("splits")
    .select("id, created_by, perfume_id")
    .eq("id", id)
    .single();

  if (!split) {
    return NextResponse.json({ error: "Split tidak ditemukan" }, { status: 404 });
  }

  if (split.created_by !== user.id) {
    return NextResponse.json({ error: "Bukan pemilik split ini" }, { status: 403 });
  }

  // Check for active orders
  const { count } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("split_id", id)
    .not("status", "in", '("cancelled","completed","rejected")');

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: "Tidak bisa menghapus split yang masih memiliki pesanan aktif" },
      { status: 400 }
    );
  }

  // Delete in order: reviews → orders → variants → split → perfume
  await supabase.from("reviews").delete().eq("split_id", id);
  await supabase.from("orders").delete().eq("split_id", id);
  await supabase.from("split_variants").delete().eq("split_id", id);

  const { error: splitError } = await supabase.from("splits").delete().eq("id", id);
  if (splitError) {
    return NextResponse.json({ error: splitError.message }, { status: 500 });
  }

  // Delete orphaned perfume
  await supabase.from("perfumes").delete().eq("id", split.perfume_id);

  return NextResponse.json({ success: true });
}
