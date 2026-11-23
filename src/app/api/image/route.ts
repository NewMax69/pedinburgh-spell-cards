import { NextResponse } from "next/server";

export const runtime = "nodejs";

const ALLOWED = [
  /(^|\.)googleusercontent\.com$/i,
  /^drive\.google\.com$/i,
  /^docs\.google\.com$/i,
  /^lh3\.googleusercontent\.com$/i,
];

const MAX_BYTES = 12 * 1024 * 1024;

function driveId(url: URL): string | null {
  return (
    url.pathname.match(/\/file\/d\/([\w-]{10,})/)?.[1] ??
    url.searchParams.get("id") ??
    url.pathname.match(/\/d\/([\w-]{10,})/)?.[1] ??
    null
  );
}

async function fetchImage(target: string): Promise<NextResponse> {
  const upstream = await fetch(target, {
    headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)", accept: "image/*,*/*" },
    redirect: "follow",
    signal: AbortSignal.timeout(20_000),
  });
  if (!upstream.ok) {
    return NextResponse.json({ error: `upstream ${upstream.status}` }, { status: 502 });
  }
  const type = upstream.headers.get("content-type") ?? "application/octet-stream";
  if (!/^image\//i.test(type) && !/octet-stream/i.test(type)) {
    return NextResponse.json({ error: `not an image: ${type}` }, { status: 415 });
  }
  const buffer = await upstream.arrayBuffer();
  if (buffer.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: "image too large" }, { status: 413 });
  }
  return new NextResponse(buffer, {
    headers: {
      "content-type": type,
      "cache-control": "public, max-age=604800, immutable",
      "content-length": String(buffer.byteLength),
    },
  });
}

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("src");
  if (!raw) return NextResponse.json({ error: "src is required" }, { status: 400 });

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return NextResponse.json({ error: "bad url" }, { status: 400 });
  }
  if (url.protocol !== "https:") {
    return NextResponse.json({ error: "https only" }, { status: 400 });
  }
  if (!ALLOWED.some((re) => re.test(url.hostname))) {
    return NextResponse.json({ error: `host not allowed: ${url.hostname}` }, { status: 403 });
  }

  const id = /drive\.google\.com$/i.test(url.hostname) ? driveId(url) : null;
  const candidates: string[] = [];
  if (id) {
    candidates.push(`https://drive.google.com/thumbnail?id=${id}&sz=w1600`);
    candidates.push(`https://lh3.googleusercontent.com/d/${id}=w1600`);
    candidates.push(`https://drive.google.com/uc?export=view&id=${id}`);
  } else {
    candidates.push(url.toString());
  }

  const errors: string[] = [];
  for (const candidate of candidates) {
    try {
      const response = await fetchImage(candidate);
      if (response.ok) return response;
      errors.push(`${candidate.slice(0, 80)}: ${response.status}`);
    } catch (error) {
      errors.push(`${candidate.slice(0, 80)}: ${(error as Error).message}`);
    }
  }

  return NextResponse.json({ error: "не удалось загрузить изображение", details: errors }, { status: 502 });
}
