import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const BRANDS = ["Aamodini","Abercrombie & Fitch","Afnan","Agent Provocateur","Ahmed Al Maghribi","Ajmal","Anna Sui","Annick Goutal","Antonio Banderas","Ariana Grande","Armaf","Asdaaf","Benetton","Bonjour","Burberry","Burgundy","Bvlgari","Cacharel","Calvin Klein","Carolina Herrera","Cartier","Chanel","Chloe","Christian Dior","Clinique","Coach","Creed","Davidoff","DKNY","Dolce & Gabbana","Elie Saab","Elite","Elizabeth Arden","Emper","Etienne Aigner","Fordive","Fragrance World","Georges Mezotti","Giorgio Armani","Gucci","Guess","Hermes","Hollister","Hot Ice","Hugo Boss","Issey Miyake","Jean Paul Gaultier","Jimmy Choo","Katy Perry","Kenzo","Khadlaj","La Rive","Lalique","Lancome","Lattafa","Lelido","Linn Young","Lolita Lempicka","Marc Jacobs","Masami Shouko","MCM","Mimo Chkoudra","Moncler","Moschino","Narciso Rodriguez","Omerta","Paco Rabanne","Parfums de Marly","Paris Corner","Pendora Scents","Perry Ellis","Prada","Ralph Lauren","Rasasi","Rayhaan","Real Time","Rhenza","Roberto Cavalli","Rue Broca","Salvatore Ferragamo","TAD Angel","Thierry Mugler","Tiffany & Co.","Tory Burch","Trussardi","Valentino","Vera Wang","Verbena","Versace","Victoria Secret","Viktor & Rolf","Yves Saint Laurent","Zara","Zimaya"];

const SCENT_CLASSIFICATIONS = ["Amber","Amber Floral","Amber Fougere","Amber Vanilla","Amber Vanilla Gourmand","Amber Woody","Aromatic","Aromatic Fougere","Aromatic Fruity","Aromatic Spicy","Chypre","Chypre Floral","Chypre Fruity","Citrus","Citrus / Fruity","Citrus Aromatic","Floral","Floral Aquatic","Floral Fruity","Floral Fruity Gourmand","Floral Green","Floral Woody Musk","Flowery","Fruity","Green","Musky","Oriental Floral","Oriental Fougere","Oriental Vanilla","Oriental Woody","Powdery","Rose","Sweet","Vanilla","Woody","Woody Aromatic","Woody Chypre","Woody Floral Musk"];

const BRAND_TYPES = ["Designer","Niche","Luxury","Indie","Celebrity"];

const GENDERS = ["Men","Women","Unisex"];

export async function POST() {
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

  const rows = [
    ...BRANDS.map((v) => ({ category: "brand", value: v })),
    ...SCENT_CLASSIFICATIONS.map((v) => ({ category: "scent_classification", value: v })),
    ...BRAND_TYPES.map((v) => ({ category: "brand_type", value: v })),
    ...GENDERS.map((v) => ({ category: "gender", value: v })),
  ];

  const { error } = await supabase
    .from("form_options")
    .upsert(rows, { onConflict: "category,value" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, count: rows.length });
}
