import { NextResponse } from "next/server";

const BASE_URL = "https://www.emsifa.com/api-wilayah-indonesia/api";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type"); // provinces, regencies, districts, villages
  const id = searchParams.get("id"); // parent id

  let url: string;

  switch (type) {
    case "provinces":
      url = `${BASE_URL}/provinces.json`;
      break;
    case "regencies":
      if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
      url = `${BASE_URL}/regencies/${id}.json`;
      break;
    case "districts":
      if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
      url = `${BASE_URL}/districts/${id}.json`;
      break;
    case "villages":
      if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
      url = `${BASE_URL}/villages/${id}.json`;
      break;
    default:
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  const res = await fetch(url, { next: { revalidate: 86400 } }); // cache 1 day
  if (!res.ok) {
    return NextResponse.json({ error: "Failed to fetch address data" }, { status: 502 });
  }

  const data = await res.json();
  return NextResponse.json(data);
}
