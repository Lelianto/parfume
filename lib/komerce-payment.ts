/**
 * Komerce Payment API utility (TOGGLE OFF by default)
 * VA, QRIS payment creation and status checking
 */

const BASE_URL = "https://api.collaborator.komerce.id";

function getApiKey(): string {
  const key = process.env.KOMERCE_PAYMENT_API_KEY;
  if (!key) throw new Error("KOMERCE_PAYMENT_API_KEY not configured");
  return key;
}

function headers() {
  return {
    "x-api-key": getApiKey(),
    "content-type": "application/json",
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function isPaymentEnabled(supabase: any): Promise<boolean> {
  const { data } = await supabase
    .from("platform_features")
    .select("enabled")
    .eq("feature", "payment_api")
    .single();
  return data?.enabled === true;
}

export type PaymentMethod =
  | "va_bca"
  | "va_bni"
  | "va_mandiri"
  | "va_bri"
  | "qris";

export interface CreatePaymentParams {
  orderId: string;
  amount: number;
  method: PaymentMethod;
  customerName: string;
  customerEmail: string;
}

export interface CreatePaymentResult {
  paymentId: string;
  vaNumber?: string;
  qrisUrl?: string;
  expiredAt: string;
}

export async function createPayment(
  params: CreatePaymentParams
): Promise<CreatePaymentResult> {
  const res = await fetch(`${BASE_URL}/v1/payment/create`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      order_id: params.orderId,
      amount: params.amount,
      method: params.method,
      customer_name: params.customerName,
      customer_email: params.customerEmail,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Komerce payment create failed: ${res.status} ${body}`);
  }

  const json = await res.json();
  return {
    paymentId: json.data?.payment_id ?? json.payment_id,
    vaNumber: json.data?.va_number ?? json.va_number,
    qrisUrl: json.data?.qris_url ?? json.qris_url,
    expiredAt: json.data?.expired_at ?? json.expired_at,
  };
}

export async function checkPaymentStatus(
  paymentId: string
): Promise<{ status: string; paidAt?: string }> {
  const res = await fetch(`${BASE_URL}/v1/payment/status/${paymentId}`, {
    headers: headers(),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Komerce payment status failed: ${res.status} ${body}`);
  }

  const json = await res.json();
  return {
    status: json.data?.status ?? json.status,
    paidAt: json.data?.paid_at ?? json.paid_at,
  };
}

export interface WebhookPayload {
  payment_id: string;
  order_id: string;
  status: string;
  amount: number;
  paid_at?: string;
}

export function parseWebhookPayload(body: unknown): WebhookPayload | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (!b.payment_id || !b.order_id || !b.status) return null;
  return {
    payment_id: String(b.payment_id),
    order_id: String(b.order_id),
    status: String(b.status),
    amount: Number(b.amount) || 0,
    paid_at: b.paid_at ? String(b.paid_at) : undefined,
  };
}
