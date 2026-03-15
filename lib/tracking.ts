// Mapping ekspedisi ke URL tracking mereka
const COURIER_TRACKING: Record<string, { name: string; url: (resi: string) => string }> = {
  jne: {
    name: "JNE",
    url: (resi) => `https://www.jne.co.id/id/tracking/trace?awb=${resi}`,
  },
  jnt: {
    name: "J&T Express",
    url: (resi) => `https://www.jet.co.id/track?awb=${resi}`,
  },
  sicepat: {
    name: "SiCepat",
    url: (resi) => `https://www.sicepat.com/checkAwb?awb=${resi}`,
  },
  anteraja: {
    name: "AnterAja",
    url: (resi) => `https://anteraja.id/tracking/${resi}`,
  },
  pos: {
    name: "Pos Indonesia",
    url: (resi) => `https://www.posindonesia.co.id/id/tracking?barcode=${resi}`,
  },
  tiki: {
    name: "TIKI",
    url: (resi) => `https://www.tiki.id/id/tracking?search=${resi}`,
  },
  ninja: {
    name: "Ninja Xpress",
    url: (resi) => `https://www.ninjaxpress.co/id-id/tracking?tracking_id=${resi}`,
  },
  sap: {
    name: "SAP Express",
    url: (resi) => `https://www.sap-express.id/cek-resi/?awb=${resi}`,
  },
};

// Deteksi otomatis ekspedisi dari format nomor resi
function detectCourier(resi: string): string | null {
  const r = resi.toUpperCase().trim();

  if (/^(JNE|JTR|MJL)/.test(r)) return "jne";
  if (/^(JP|JX|TP)\d/.test(r)) return "jnt";
  if (/^(SCP|SCPX)/.test(r)) return "sicepat";
  if (/^AJ/.test(r)) return "anteraja";
  if (/^(EE|EA|EM|EU|CP|RR)\d{9}ID$/.test(r)) return "pos";
  if (/^\d{11,12}$/.test(r)) return "tiki";
  if (/^(NXID|NNJA)/.test(r)) return "ninja";

  return null;
}

export function getTrackingUrl(resi: string): string | null {
  const courier = detectCourier(resi);
  if (!courier) return null;
  return COURIER_TRACKING[courier].url(resi);
}

export function getTrackingInfo(resi: string): {
  url: string;
  courierName: string;
} | null {
  const courier = detectCourier(resi);
  if (!courier) return null;
  return {
    url: COURIER_TRACKING[courier].url(resi),
    courierName: COURIER_TRACKING[courier].name,
  };
}
