import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET /api/admin/form-options — fetch all options (public)
export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("form_options")
    .select("id, category, value")
    .order("value");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Group by category
  const grouped: Record<string, string[]> = {};
  for (const row of data ?? []) {
    if (!grouped[row.category]) grouped[row.category] = [];
    grouped[row.category].push(row.value);
  }

  return NextResponse.json(grouped);
}

// POST /api/admin/form-options — add option (admin only)
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { count } = await supabase
    .from("admin_users")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (!count || count === 0) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { category, value } = await request.json();

  if (!category || !value?.trim()) {
    return NextResponse.json({ error: "category dan value wajib diisi" }, { status: 400 });
  }

  const { error } = await supabase
    .from("form_options")
    .insert({ category, value: value.trim() });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Opsi sudah ada" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// DELETE /api/admin/form-options — remove option (admin only)
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { count } = await supabase
    .from("admin_users")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (!count || count === 0) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { id } = await request.json();

  if (!id) {
    return NextResponse.json({ error: "id wajib diisi" }, { status: 400 });
  }

  const { error } = await supabase
    .from("form_options")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
