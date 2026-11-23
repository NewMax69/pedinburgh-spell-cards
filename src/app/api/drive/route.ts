import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_FILES = 4000;
const MAX_FOLDERS = 200;
const IMAGE_RE = /\.(jpe?g|png|webp|avif)$/i;

function folderId(input: string): string | null {
  const trimmed = input.trim();
  if (/^[\w-]{10,}$/.test(trimmed) && !trimmed.includes("/")) return trimmed;
  return (
    trimmed.match(/\/folders\/([\w-]{10,})/)?.[1] ??
    trimmed.match(/[?&]id=([\w-]{10,})/)?.[1] ??
    null
  );
}

interface DriveFile {
  id: string;
  name: string;
  path: string;
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

interface DriveEntry {
  id: string;
  name: string;
  isFolder: boolean;
}

async function listPublicFolder(id: string): Promise<DriveEntry[]> {
  const res = await fetch(`https://drive.google.com/embeddedfolderview?id=${id}#list`, {
    headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`embeddedfolderview ${res.status}`);
  const html = await res.text();
  const entries: DriveEntry[] = [];
  const re = /<div class="flip-entry"[\s\S]*?id="entry-([\w-]{10,})"([\s\S]*?)(?=<div class="flip-entry"|$)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    const entryId = match[1];
    const block = match[2];
    const name = decodeEntities(
      block.match(/flip-entry-title">([^<]+)</)?.[1]?.trim() ?? ""
    );
    if (!name) continue;
    const isFolder = /drive\.google\.com\/drive\/folders\//.test(block) || /class="[^"]*folder/.test(block);
    entries.push({ id: entryId, name, isFolder });
  }
  if (!entries.length) {
    // запасной разбор без блоков
    const simple = /id="entry-([\w-]{10,})"[\s\S]{0,4000}?flip-entry-title">([^<]+)</g;
    let m: RegExpExecArray | null;
    while ((m = simple.exec(html))) {
      entries.push({ id: m[1], name: decodeEntities(m[2].trim()), isFolder: false });
    }
  }
  return entries;
}

async function listApiFolder(id: string, key: string): Promise<DriveEntry[]> {
  const entries: DriveEntry[] = [];
  let pageToken: string | undefined;
  do {
    const params = new URLSearchParams({
      q: `'${id}' in parents and trashed = false`,
      key,
      fields: "nextPageToken,files(id,name,mimeType)",
      pageSize: "1000",
      supportsAllDrives: "true",
      includeItemsFromAllDrives: "true",
    });
    if (pageToken) params.set("pageToken", pageToken);
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) throw new Error(`Drive API ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = (await res.json()) as {
      files?: { id: string; name: string; mimeType: string }[];
      nextPageToken?: string;
    };
    for (const file of data.files ?? []) {
      entries.push({
        id: file.id,
        name: file.name,
        isFolder: file.mimeType === "application/vnd.google-apps.folder",
      });
    }
    pageToken = data.nextPageToken;
  } while (pageToken);
  return entries;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const input = url.searchParams.get("folder");
  if (!input) return NextResponse.json({ error: "folder is required" }, { status: 400 });

  const rootId = folderId(input);
  if (!rootId) return NextResponse.json({ error: "не удалось распознать ID папки" }, { status: 400 });

  const key = process.env.GOOGLE_API_KEY;
  const list = key
    ? (id: string) => listApiFolder(id, key)
    : (id: string) => listPublicFolder(id);

  const files: DriveFile[] = [];
  let foldersVisited = 0;
  let foldersTotal = 0;
  let truncated = false;
  const errors: string[] = [];

  const queue: { id: string; path: string; depth: number }[] = [{ id: rootId, path: "", depth: 0 }];
  const seen = new Set<string>([rootId]);

  while (queue.length) {
    const current = queue.shift()!;
    if (current.depth > 6 || foldersVisited >= MAX_FOLDERS) {
      truncated = true;
      break;
    }
    foldersVisited += 1;
    let entries: DriveEntry[] = [];
    try {
      entries = await list(current.id);
    } catch (error) {
      errors.push(`${current.path || "корень"}: ${(error as Error).message}`);
      continue;
    }
    for (const entry of entries) {
      const path = current.path ? `${current.path}/${entry.name}` : entry.name;
      if (entry.isFolder) {
        if (!seen.has(entry.id)) {
          seen.add(entry.id);
          foldersTotal += 1;
          queue.push({ id: entry.id, path, depth: current.depth + 1 });
        }
        continue;
      }
      if (!IMAGE_RE.test(entry.name)) continue;
      files.push({ id: entry.id, name: entry.name, path });
      if (files.length >= MAX_FILES) {
        truncated = true;
        break;
      }
    }
    if (files.length >= MAX_FILES) break;
  }

  if (!files.length && errors.length) {
    return NextResponse.json(
      {
        error: errors[0],
        hint: key
          ? "Проверьте GOOGLE_API_KEY и доступ к папке."
          : "Папка должна быть открыта по ссылке. Либо задайте GOOGLE_API_KEY в .env.local.",
      },
      { status: 502 }
    );
  }

  return NextResponse.json({
    folderId: rootId,
    mode: key ? "api" : "public",
    folders: foldersTotal,
    truncated,
    errors,
    count: files.length,
    files: files.map((file) => ({
      id: file.id,
      name: file.name,
      path: file.path,
      url: `/api/image?src=${encodeURIComponent(`https://drive.google.com/thumbnail?id=${file.id}&sz=w1600`)}`,
    })),
  });
}
