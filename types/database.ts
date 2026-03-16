export type SplitStatus = "open" | "full" | "decanting" | "shipped" | "completed";
export type OrderStatus = "pending_payment" | "paid" | "pending" | "confirmed" | "decanting" | "shipped" | "completed" | "cancelled" | "rejected";
export type Concentration = "EDP" | "EDT" | "Parfum" | "EDC" | "Cologne";
export type ScentFamily = "Woody" | "Floral" | "Oriental" | "Fresh" | "Citrus" | "Aquatic" | "Gourmand" | "Aromatic" | "Chypre" | "Fougere";

export interface ShippingAddress {
  name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  village: string;
  postal_code: string;
  address: string; // detail address / patokan
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  bio: string | null;
  whatsapp: string | null;
  city: string | null;
  // default address
  address_name: string | null;
  address_phone: string | null;
  address_province: string | null;
  address_city: string | null;
  address_district: string | null;
  address_village: string | null;
  address_postal_code: string | null;
  address_detail: string | null;
  // store location
  store_province: string | null;
  store_city: string | null;
  store_city_id: number | null;
  // default address city ID for RajaOngkir
  address_city_id: number | null;
  // bank account (untuk info transfer)
  bank_name: string | null;
  bank_account_number: string | null;
  bank_account_name: string | null;
  created_at: string;
}

export interface Perfume {
  id: string;
  brand: string;
  name: string;
  variant: string | null;
  description: string | null;
  concentration: Concentration | null;
  top_notes: string[];
  middle_notes: string[];
  base_notes: string[];
  scent_family: string | null;
  brand_type: string | null;
  gender: string | null;
  scent_classification: string | null;
  created_at: string;
}

export interface SplitVariant {
  id: string;
  split_id: string;
  size_ml: number;
  price: number;
  stock: number;
  sold: number;
}

export interface Split {
  id: string;
  perfume_id: string;
  bottle_size_ml: number;
  split_size_ml: number;
  total_slots: number;
  filled_slots: number;
  price_per_slot: number;
  batch_code: string | null;
  bottle_photo_url: string | null;
  batch_code_photo_url: string | null;
  decant_video_url: string | null;
  status: SplitStatus;
  is_ready_stock: boolean;
  is_hidden: boolean;
  description: string | null;
  created_by: string;
  created_at: string;
  // joined
  perfume?: Perfume;
  creator?: User;
  variants?: SplitVariant[];
  avg_rating?: number | null;
  review_count?: number | null;
}

export interface SplitSlot {
  id: string;
  split_id: string;
  user_id: string;
  quantity: number;
  created_at: string;
}

export interface PlatformSettings {
  id: number;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_account_name: string | null;
  updated_at: string;
}

export interface Order {
  id: string;
  user_id: string;
  split_id: string;
  variant_id: string | null;
  size_ml: number | null;
  slots_purchased: number;
  total_price: number;
  status: OrderStatus;
  shipping_receipt: string | null;
  shipping_courier: string | null;
  shipping_service: string | null;
  shipping_cost: number;
  payment_proof_url: string | null;
  payment_deadline: string | null;
  shipping_deadline: string | null;
  // shipping address
  shipping_name: string | null;
  shipping_phone: string | null;
  shipping_province: string | null;
  shipping_city: string | null;
  shipping_district: string | null;
  shipping_village: string | null;
  shipping_postal_code: string | null;
  shipping_address: string | null;
  shipping_city_id: number | null;
  confirmed_at: string | null;
  shipped_at: string | null;
  completed_at: string | null;
  reject_reason: string | null;
  // escrow
  disbursement_status: string | null;
  disbursed_at: string | null;
  created_at: string;
  // joined
  split?: Split & { perfume?: Perfume };
  variant?: SplitVariant;
}

export interface Review {
  id: string;
  user_id: string;
  split_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  // joined
  user?: User;
}

export interface RajaOngkirCity {
  id: number;
  province_name: string;
  city_name: string;
  district_name: string;
  subdistrict_name: string;
  zip_code: string | null;
  label: string | null;
}

export interface PlatformFeature {
  feature: string;
  enabled: boolean;
  config: Record<string, unknown>;
}

export interface Wishlist {
  id: string;
  user_id: string;
  split_id: string;
  created_at: string;
  split?: Split & { perfume?: Perfume; variants?: SplitVariant[] };
}

// Tracking
export interface TrackingCache {
  id: string;
  awb: string;
  courier: string;
  result: TrackingResult;
  fetched_at: string;
}

export interface ApiUsage {
  month: string;
  api_type: string; // 'tracking' | 'ongkir'
  request_count: number;
}

export interface TrackingResult {
  summary: {
    awb: string;
    courier: string;
    service: string;
    status: string;
    date: string;
    desc: string;
    amount: string;
    weight: string;
  };
  detail: {
    origin: string;
    destination: string;
    shipper: string;
    receiver: string;
  };
  history: Array<{
    date: string;
    desc: string;
    location: string;
  }>;
}

// Seller Balance & Withdrawal
export type WithdrawalStatus = "pending" | "approved" | "rejected" | "completed";

export interface SellerBalance {
  user_id: string;
  balance: number;
  total_earned: number;
  total_withdrawn: number;
  updated_at: string;
}

export interface Withdrawal {
  id: string;
  user_id: string;
  amount: number;
  status: WithdrawalStatus;
  bank_name: string;
  bank_account_number: string;
  bank_account_name: string;
  admin_note: string | null;
  requested_at: string;
  processed_at: string | null;
  completed_at: string | null;
  // joined
  user?: User;
}
