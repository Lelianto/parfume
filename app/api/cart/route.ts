import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET: fetch all cart items for current user (with split/variant/perfume/creator data)
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("cart_items")
    .select(
      `id, split_id, variant_id, quantity, created_at,
       split:splits(id, bottle_photo_url, created_by, perfume:perfumes(brand, name, variant), creator:users!splits_created_by_fkey(name, avatar_url, city, store_city)),
       variant:split_variants(id, size_ml, price, stock, sold)`
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ items: data ?? [] });
}

// POST: add item to cart (upsert — if exists, increment quantity)
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { split_id, variant_id, quantity } = body;

  if (!split_id || !variant_id || !quantity || quantity < 1) {
    return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
  }

  // Check if already in cart
  const { data: existing } = await supabase
    .from("cart_items")
    .select("id, quantity")
    .eq("user_id", user.id)
    .eq("split_id", split_id)
    .eq("variant_id", variant_id)
    .maybeSingle();

  if (existing) {
    // Update quantity
    const { error } = await supabase
      .from("cart_items")
      .update({ quantity: existing.quantity + quantity })
      .eq("id", existing.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else {
    // Insert new
    const { error } = await supabase.from("cart_items").insert({
      user_id: user.id,
      split_id,
      variant_id,
      quantity,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}

// PATCH: update quantity for a specific cart item
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { split_id, variant_id, quantity } = body;

  if (!split_id || !variant_id || quantity == null) {
    return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
  }

  if (quantity < 1) {
    // If quantity < 1, delete it
    await supabase
      .from("cart_items")
      .delete()
      .eq("user_id", user.id)
      .eq("split_id", split_id)
      .eq("variant_id", variant_id);
  } else {
    await supabase
      .from("cart_items")
      .update({ quantity })
      .eq("user_id", user.id)
      .eq("split_id", split_id)
      .eq("variant_id", variant_id);
  }

  return NextResponse.json({ success: true });
}

// DELETE: remove item(s) from cart
export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const splitId = searchParams.get("split_id");
  const variantId = searchParams.get("variant_id");
  const sellerId = searchParams.get("seller_id");

  if (sellerId) {
    // Delete all items from a specific seller
    // Need to join through splits to get created_by
    const { data: sellerSplits } = await supabase
      .from("splits")
      .select("id")
      .eq("created_by", sellerId);

    if (sellerSplits && sellerSplits.length > 0) {
      await supabase
        .from("cart_items")
        .delete()
        .eq("user_id", user.id)
        .in(
          "split_id",
          sellerSplits.map((s) => s.id)
        );
    }
  } else if (splitId && variantId) {
    // Delete specific item
    await supabase
      .from("cart_items")
      .delete()
      .eq("user_id", user.id)
      .eq("split_id", splitId)
      .eq("variant_id", variantId);
  } else {
    // Clear all
    await supabase.from("cart_items").delete().eq("user_id", user.id);
  }

  return NextResponse.json({ success: true });
}
