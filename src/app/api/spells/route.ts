import { NextResponse } from "next/server";
import { loadSpells } from "@/lib/sheets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const force = url.searchParams.get("refresh") === "1";
  try {
    const snapshot = await loadSpells(force);
    return NextResponse.json(
      {
        spells: snapshot.spells,
        fetchedAt: snapshot.fetchedAt,
        source: snapshot.source,
        errors: snapshot.errors,
      },
      {
        headers: {
          "cache-control": "no-store",
          "x-spell-count": String(snapshot.spells.length),
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message, spells: [] },
      { status: 502 }
    );
  }
}
