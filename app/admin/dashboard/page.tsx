import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminDashboardClient } from "./AdminDashboardClient";
import type { Order, Split } from "@/types/database";

export const revalidate = 0;

export interface AdminOrder extends Order {
  split: Split & { creator?: { name: string; email: string } };
  user?: { name: string; avatar_url: string | null; email: string };
}

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  // Verify admin
  const { count } = await supabase
    .from("admin_users")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (!count || count === 0) redirect("/admin/login?error=not_admin");

  // Fetch orders that need admin attention (paid = needs verification)
  // Also fetch all recent orders for overview
  const { data: orders } = await supabase
    .from("orders")
    .select("*, split:splits(*, perfume:perfumes(*), creator:users!splits_created_by_fkey(name, email)), user:users(name, avatar_url, email)")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <AdminDashboardClient
      orders={(orders ?? []) as unknown as AdminOrder[]}
    />
  );
}
