import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const splitId = request.nextUrl.searchParams.get("split_id");
  if (!splitId) return NextResponse.json({ wishlisted: false });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ wishlisted: false });

  const { count } = await supabase
    .from("wishlists")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("split_id", splitId);

  return NextResponse.json({ wishlisted: (count ?? 0) > 0 });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { split_id } = await request.json();
  if (!split_id) return NextResponse.json({ error: "split_id diperlukan" }, { status: 400 });

  const { data, error } = await supabase
    .from("wishlists")
    .insert({ user_id: user.id, split_id })
    .select();

  console.log("[wishlist POST]", { user_id: user.id, split_id, data, error });

  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "Sudah ada di wishlist" }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, inserted: data });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { split_id } = await request.json();
  if (!split_id) return NextResponse.json({ error: "split_id diperlukan" }, { status: 400 });

  const { error } = await supabase
    .from("wishlists")
    .delete()
    .eq("user_id", user.id)
    .eq("split_id", split_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
