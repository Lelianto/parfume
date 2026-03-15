import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { OrderStatusBadge } from "@/components/StatusBadge";
import { Package, Droplets, Clock } from "lucide-react";
import type { Order } from "@/types/database";

export const revalidate = 0;

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

export default async function MyOrdersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirectTo=/my-orders");

  const { data: orders } = await supabase
    .from("orders")
    .select("*, split:splits(*, perfume:perfumes(*))")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const myOrders = (orders ?? []) as unknown as Order[];

  return (
    <div className="mx-auto max-w-4xl px-4 pb-8 pt-20 md:pt-8">
      <div className="flex items-center gap-3">
        <Package size={22} className="text-gold-400" />
        <h1 className="font-display text-2xl font-bold text-gold-100">Pesanan Saya</h1>
      </div>

      {myOrders.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-dashed border-gold-900/30 py-16 text-center">
          <Droplets size={48} className="mx-auto text-gold-800/30" />
          <p className="mt-4 text-gold-200/50">Belum ada pesanan.</p>
          <Link
            href="/"
            className="btn-gold mt-4 inline-block rounded-lg px-6 py-2.5 text-sm font-medium text-surface-400"
          >
            Jelajahi Split
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {myOrders.map((order) => (
            <Link key={order.id} href={`/my-orders/${order.id}`}>
              <div className="card-glow flex gap-4 rounded-2xl border border-gold-900/20 bg-surface-200/80 p-4 transition-all">
                <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border border-gold-900/15 bg-surface-300">
                  {order.split?.bottle_photo_url ? (
                    <Image
                      src={order.split.bottle_photo_url}
                      alt=""
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-gold-800/30">
                      <Droplets size={24} />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-gold-400/70">
                        {order.split?.perfume?.brand}
                      </p>
                      <p className="font-display font-semibold text-gold-100">
                        {order.split?.perfume?.name}
                      </p>
                    </div>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <div className="mt-2 flex items-center gap-4 text-sm text-gold-200/40">
                    <span>
                      {order.size_ml ? `${order.size_ml}ml` : `${order.slots_purchased} slot`}
                      {order.slots_purchased > 1 && order.size_ml ? ` × ${order.slots_purchased}` : ""}
                    </span>
                    <span className="font-medium text-gold-400">{formatRupiah(order.total_price)}</span>
                  </div>
                  {order.status === "pending_payment" && order.payment_deadline && (
                    <div className="mt-1 flex items-center gap-1 text-xs text-orange-400">
                      <Clock size={11} />
                      <span>Bayar sebelum {new Date(order.payment_deadline).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  )}
                  {order.shipping_receipt && (
                    <p className="mt-1 text-xs text-gold-200/30">
                      Resi: {order.shipping_receipt}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
