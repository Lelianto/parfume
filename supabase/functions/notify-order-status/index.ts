import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  buyerOrderCreated,
  buyerPaymentConfirmed,
  buyerOrderShipped,
  buyerOrderCompleted,
  sellerNewOrder,
  sellerPaymentUploaded,
  type OrderEmailData,
} from "./templates.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FROM_EMAIL = "Wangiverse <onboarding@resend.dev>";

interface WebhookPayload {
  type: "UPDATE" | "INSERT";
  table: string;
  schema: string;
  record: Record<string, unknown>;
  old_record: Record<string, unknown>;
}

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`Resend error: ${res.status} ${err}`);
  }
  return res.ok;
}

async function fetchOrderData(
  supabase: ReturnType<typeof createClient>,
  orderId: string
): Promise<OrderEmailData | null> {
  // Fetch order with split + perfume + variant
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select(
      `
      id, user_id, split_id, variant_id, size_ml, slots_purchased,
      total_price, status, shipping_receipt, payment_deadline,
      split:splits!inner(
        id, created_by,
        perfume:perfumes!inner(name, brand, variant)
      ),
      variant:split_variants(size_ml)
    `
    )
    .eq("id", orderId)
    .single();

  if (orderErr || !order) {
    console.error("Failed to fetch order:", orderErr);
    return null;
  }

  const split = order.split as unknown as {
    id: string;
    created_by: string;
    perfume: { name: string; brand: string; variant: string | null };
  };

  // Fetch buyer profile
  const { data: buyer } = await supabase
    .from("users")
    .select("name, email")
    .eq("id", order.user_id)
    .single();

  // Fetch seller profile
  const { data: seller } = await supabase
    .from("users")
    .select("name, email")
    .eq("id", split.created_by)
    .single();

  if (!buyer || !seller) {
    console.error("Failed to fetch buyer/seller profiles");
    return null;
  }

  const sizeMl =
    order.size_ml ??
    (order.variant as { size_ml: number } | null)?.size_ml ??
    null;

  return {
    buyerName: buyer.name,
    buyerEmail: buyer.email,
    sellerName: seller.name,
    sellerEmail: seller.email,
    orderId: order.id as string,
    perfumeName: split.perfume.name,
    perfumeBrand: split.perfume.brand,
    perfumeVariant: split.perfume.variant,
    sizeMl,
    slotsPurchased: order.slots_purchased as number,
    totalPrice: order.total_price as number,
    paymentDeadline: order.payment_deadline as string | null,
    shippingReceipt: order.shipping_receipt as string | null,
  };
}

serve(async (req) => {
  // Verify request method
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const payload: WebhookPayload = await req.json();
    const { type, record, old_record } = payload;

    const orderId = record.id as string;
    const newStatus = record.status as string;
    const oldStatus = old_record?.status as string | undefined;

    // Skip if status didn't change (for UPDATE) or if not a relevant event
    if (type === "UPDATE" && newStatus === oldStatus) {
      return new Response(JSON.stringify({ skipped: true }), { status: 200 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const data = await fetchOrderData(supabase, orderId);

    if (!data) {
      return new Response(JSON.stringify({ error: "Order data not found" }), {
        status: 404,
      });
    }

    const emails: { to: string; subject: string; html: string }[] = [];

    if (type === "INSERT" && newStatus === "pending_payment") {
      // New order: notify buyer (order details + deadline) and seller (new order)
      emails.push(buyerOrderCreated(data));
      emails.push(sellerNewOrder(data));
    }

    if (type === "UPDATE") {
      switch (newStatus) {
        case "paid":
          // Buyer uploaded proof → notify seller
          emails.push(sellerPaymentUploaded(data));
          break;

        case "confirmed":
          // Admin confirmed payment → notify buyer
          emails.push(buyerPaymentConfirmed(data));
          break;

        case "shipped":
          // Seller shipped → notify buyer with receipt
          emails.push(buyerOrderShipped(data));
          break;

        case "completed":
          // Order completed → ask buyer for review
          emails.push(buyerOrderCompleted(data));
          break;
      }
    }

    // Send all emails
    const results = await Promise.allSettled(
      emails.map((e) => sendEmail(e.to, e.subject, e.html))
    );

    const summary = results.map((r, i) => ({
      to: emails[i].to,
      subject: emails[i].subject,
      success: r.status === "fulfilled" && r.value === true,
    }));

    console.log("Email results:", JSON.stringify(summary));

    return new Response(JSON.stringify({ sent: summary }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500 }
    );
  }
});
