/**
 * Komerce Delivery API utility (TOGGLE OFF by default)
 * Auto-create shipment, request pickup, print label
 */

const BASE_URL = "https://api.collaborator.komerce.id";

function getApiKey(): string {
  const key = process.env.KOMERCE_DELIVERY_API_KEY;
  if (!key) throw new Error("KOMERCE_DELIVERY_API_KEY not configured");
  return key;
}

function headers() {
  return {
    "x-api-key": getApiKey(),
    "content-type": "application/json",
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function isDeliveryEnabled(supabase: any): Promise<boolean> {
  const { data } = await supabase
    .from("platform_features")
    .select("enabled")
    .eq("feature", "delivery_api")
    .single();
  return data?.enabled === true;
}

export interface CreateShipmentParams {
  senderName: string;
  senderPhone: string;
  senderAddress: string;
  senderCity: string;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  recipientCity: string;
  courier: string;
  service: string;
  weight: number;
  productName: string;
  productPrice: number;
}

export async function createShipmentOrder(params: CreateShipmentParams) {
  const res = await fetch(`${BASE_URL}/v1/order/create`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      sender_name: params.senderName,
      sender_phone: params.senderPhone,
      sender_address: params.senderAddress,
      sender_city: params.senderCity,
      recipient_name: params.recipientName,
      recipient_phone: params.recipientPhone,
      recipient_address: params.recipientAddress,
      recipient_city: params.recipientCity,
      courier: params.courier,
      service: params.service,
      weight: params.weight,
      product_name: params.productName,
      product_price: params.productPrice,
      payment_method: "prepaid",
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Komerce create order failed: ${res.status} ${body}`);
  }

  return res.json();
}

export async function requestPickup(orderNo: string) {
  const res = await fetch(`${BASE_URL}/v1/order/pickup`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ order_no: orderNo }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Komerce pickup failed: ${res.status} ${body}`);
  }

  return res.json();
}

export async function cancelOrder(orderNo: string) {
  const res = await fetch(`${BASE_URL}/v1/order/cancel`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ order_no: orderNo }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Komerce cancel failed: ${res.status} ${body}`);
  }

  return res.json();
}

export async function getOrderDetail(orderNo: string) {
  const res = await fetch(`${BASE_URL}/v1/order/detail/${orderNo}`, {
    headers: headers(),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Komerce detail failed: ${res.status} ${body}`);
  }

  return res.json();
}

export async function printLabel(orderNo: string) {
  const res = await fetch(`${BASE_URL}/v1/order/label/${orderNo}`, {
    headers: headers(),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Komerce label failed: ${res.status} ${body}`);
  }

  return res.json();
}
