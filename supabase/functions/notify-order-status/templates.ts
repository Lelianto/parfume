// HTML email templates for Wangiverse order notifications

const BRAND = "Wangiverse";
const BRAND_COLOR = "#B8860B"; // gold
const FOOTER = `
  <div style="margin-top:32px;padding-top:20px;border-top:1px solid #e5e5e5;text-align:center;color:#999;font-size:12px;">
    <p>${BRAND} — Komunitas Split Parfum Indonesia</p>
    <p>Email ini dikirim otomatis, tidak perlu dibalas.</p>
  </div>
`;

function layout(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9f9f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #eee;">
    <div style="background:${BRAND_COLOR};padding:20px 24px;text-align:center;">
      <h1 style="margin:0;color:#fff;font-size:22px;letter-spacing:1px;">${BRAND}</h1>
    </div>
    <div style="padding:28px 24px;">
      ${content}
    </div>
    ${FOOTER}
  </div>
</body>
</html>`;
}

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatDeadline(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Buyer Templates ───

export interface OrderEmailData {
  buyerName: string;
  buyerEmail: string;
  sellerName: string;
  sellerEmail: string;
  orderId: string;
  perfumeName: string;
  perfumeBrand: string;
  perfumeVariant: string | null;
  sizeMl: number | null;
  slotsPurchased: number;
  totalPrice: number;
  paymentDeadline: string | null;
  shippingReceipt: string | null;
}

/** Buyer: order created, pending payment */
export function buyerOrderCreated(data: OrderEmailData) {
  const variantText = data.perfumeVariant
    ? ` — ${data.perfumeVariant}`
    : "";
  const deadlineText = data.paymentDeadline
    ? `<p style="margin:16px 0;padding:12px 16px;background:#fff8e1;border-left:4px solid ${BRAND_COLOR};border-radius:4px;">
        <strong>Batas waktu bayar:</strong> ${formatDeadline(data.paymentDeadline)}
       </p>`
    : "";

  return {
    to: data.buyerEmail,
    subject: `[${BRAND}] Pesanan Dibuat — Segera Lakukan Pembayaran`,
    html: layout(`
      <p>Halo <strong>${data.buyerName}</strong>,</p>
      <p>Pesananmu berhasil dibuat! Berikut detailnya:</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px 0;color:#666;">Parfum</td><td style="padding:8px 0;font-weight:600;">${data.perfumeBrand} — ${data.perfumeName}${variantText}</td></tr>
        <tr><td style="padding:8px 0;color:#666;">Ukuran</td><td style="padding:8px 0;font-weight:600;">${data.sizeMl ?? "-"}ml × ${data.slotsPurchased}</td></tr>
        <tr><td style="padding:8px 0;color:#666;">Total</td><td style="padding:8px 0;font-weight:600;color:${BRAND_COLOR};">${formatRupiah(data.totalPrice)}</td></tr>
        <tr><td style="padding:8px 0;color:#666;">Seller</td><td style="padding:8px 0;font-weight:600;">${data.sellerName}</td></tr>
      </table>
      ${deadlineText}
      <p>Silakan upload bukti pembayaran melalui aplikasi ${BRAND}.</p>
    `),
  };
}

/** Buyer: payment confirmed by admin */
export function buyerPaymentConfirmed(data: OrderEmailData) {
  return {
    to: data.buyerEmail,
    subject: `[${BRAND}] Pembayaran Diterima ✓`,
    html: layout(`
      <p>Halo <strong>${data.buyerName}</strong>,</p>
      <div style="text-align:center;margin:20px 0;">
        <div style="display:inline-block;background:#e8f5e9;border-radius:50%;padding:16px;">
          <span style="font-size:32px;">✅</span>
        </div>
      </div>
      <p style="text-align:center;font-size:18px;font-weight:600;">Pembayaran kamu sudah dikonfirmasi!</p>
      <p>Pesanan <strong>${data.perfumeBrand} — ${data.perfumeName}</strong> (${data.sizeMl ?? "-"}ml × ${data.slotsPurchased}) senilai <strong>${formatRupiah(data.totalPrice)}</strong> sedang diproses oleh seller.</p>
      <p>Kamu akan mendapat notifikasi lagi saat pesanan dikirim.</p>
    `),
  };
}

/** Buyer: order shipped with receipt */
export function buyerOrderShipped(data: OrderEmailData) {
  const receiptText = data.shippingReceipt
    ? `<div style="margin:16px 0;padding:16px;background:#f0f4ff;border-radius:8px;text-align:center;">
        <p style="margin:0 0 4px;color:#666;font-size:13px;">Nomor Resi</p>
        <p style="margin:0;font-size:20px;font-weight:700;letter-spacing:1px;">${data.shippingReceipt}</p>
       </div>`
    : "";

  return {
    to: data.buyerEmail,
    subject: `[${BRAND}] Pesananmu Sudah Dikirim! 🚚`,
    html: layout(`
      <p>Halo <strong>${data.buyerName}</strong>,</p>
      <p>Kabar baik! Pesanan <strong>${data.perfumeBrand} — ${data.perfumeName}</strong> sudah dikirim oleh seller.</p>
      ${receiptText}
      <p>Silakan lacak pengirimanmu. Setelah barang diterima, jangan lupa konfirmasi penerimaan di aplikasi ${BRAND}.</p>
    `),
  };
}

/** Buyer: order completed, ask for review */
export function buyerOrderCompleted(data: OrderEmailData) {
  return {
    to: data.buyerEmail,
    subject: `[${BRAND}] Pesanan Selesai — Beri Review Yuk!`,
    html: layout(`
      <p>Halo <strong>${data.buyerName}</strong>,</p>
      <p>Pesanan <strong>${data.perfumeBrand} — ${data.perfumeName}</strong> sudah selesai!</p>
      <div style="margin:20px 0;text-align:center;">
        <p style="font-size:28px;">⭐⭐⭐⭐⭐</p>
        <p>Bagaimana pengalamanmu? Yuk beri review untuk membantu buyer lain.</p>
      </div>
      <p>Terima kasih sudah berbelanja di ${BRAND}!</p>
    `),
  };
}

// ─── Seller Templates ───

/** Seller: new order received */
export function sellerNewOrder(data: OrderEmailData) {
  const variantText = data.perfumeVariant
    ? ` (${data.perfumeVariant})`
    : "";

  return {
    to: data.sellerEmail,
    subject: `[${BRAND}] Order Baru Masuk!`,
    html: layout(`
      <p>Halo <strong>${data.sellerName}</strong>,</p>
      <div style="margin:16px 0;padding:16px;background:#fff8e1;border-radius:8px;">
        <p style="margin:0 0 8px;font-size:16px;font-weight:600;">🛒 Ada pesanan baru!</p>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:6px 0;color:#666;">Buyer</td><td style="padding:6px 0;font-weight:600;">${data.buyerName}</td></tr>
          <tr><td style="padding:6px 0;color:#666;">Parfum</td><td style="padding:6px 0;font-weight:600;">${data.perfumeName}${variantText}</td></tr>
          <tr><td style="padding:6px 0;color:#666;">Jumlah</td><td style="padding:6px 0;font-weight:600;">${data.sizeMl ?? "-"}ml × ${data.slotsPurchased}</td></tr>
          <tr><td style="padding:6px 0;color:#666;">Total</td><td style="padding:6px 0;font-weight:600;color:${BRAND_COLOR};">${formatRupiah(data.totalPrice)}</td></tr>
        </table>
      </div>
      <p>Buyer sedang dalam proses pembayaran. Kamu akan mendapat notifikasi setelah pembayaran diverifikasi.</p>
    `),
  };
}

/** Seller: buyer uploaded payment proof */
export function sellerPaymentUploaded(data: OrderEmailData) {
  return {
    to: data.sellerEmail,
    subject: `[${BRAND}] Bukti Bayar Diterima — Menunggu Verifikasi`,
    html: layout(`
      <p>Halo <strong>${data.sellerName}</strong>,</p>
      <p>Buyer <strong>${data.buyerName}</strong> sudah upload bukti pembayaran untuk pesanan:</p>
      <div style="margin:16px 0;padding:12px 16px;background:#f0f4ff;border-radius:8px;">
        <p style="margin:0;"><strong>${data.perfumeName}</strong> — ${data.sizeMl ?? "-"}ml × ${data.slotsPurchased} = <strong>${formatRupiah(data.totalPrice)}</strong></p>
      </div>
      <p>Admin akan segera memverifikasi pembayaran ini. Kamu akan mendapat notifikasi setelah dikonfirmasi.</p>
    `),
  };
}
