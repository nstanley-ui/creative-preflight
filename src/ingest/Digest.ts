import JSZip from "jszip";
import * as XLSX from "xlsx";

export type IngestType = "creative_image" | "creative_video" | "tag_sheet" | "other";

export type IngestItem = {
  id: string;
  type: IngestType;
  name: string;
  size?: number;
  source: "standalone" | "zip" | "url" | "mojo";
  meta?: Record<string, any>;
  raw?: ArrayBuffer;
};

export type ParsedSheet = {
  name: string;
  rows: any[][];
};

export type DigestResult = {
  items: IngestItem[];
  sheets: ParsedSheet[];
};

function uid(prefix = "it"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now()}`;
}

function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}

function classify(name: string): IngestType {
  const ext = extOf(name);
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return "creative_image";
  if (["mp4", "mov", "webm", "m4v"].includes(ext)) return "creative_video";
  if (["xlsx", "xls", "csv"].includes(ext)) return "tag_sheet";
  return "other";
}

async function detectImageMeta(buf: ArrayBuffer): Promise<{ width: number; height: number }> {
  const blob = new Blob([buf]);
  const bmp = await createImageBitmap(blob);
  return { width: bmp.width, height: bmp.height };
}

async function detectVideoMeta(buf: ArrayBuffer): Promise<{ width: number; height: number; duration: number }> {
  return await new Promise((resolve, reject) => {
    const blob = new Blob([buf]);
    const url = URL.createObjectURL(blob);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.src = url;

    video.onloadedmetadata = () => {
      const meta = { width: video.videoWidth, height: video.videoHeight, duration: video.duration };
      URL.revokeObjectURL(url);
      resolve(meta);
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read video metadata"));
    };
  });
}

function parseWorkbook(buf: ArrayBuffer, name: string): ParsedSheet[] {
  const ext = extOf(name);

  if (ext === "csv") {
    const text = new TextDecoder("utf-8").decode(buf);
    const rows = text
      .split(/\r?\n/)
      .filter((l) => l.trim().length > 0)
      .map((l) => l.split(","));
    return [{ name: "CSV", rows }];
  }

  const wb = XLSX.read(buf, { type: "array" });
  const sheets: ParsedSheet[] = [];

  for (const sName of wb.SheetNames) {
    const ws = wb.Sheets[sName];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false }) as any[][];
    sheets.push({ name: sName, rows });
  }
  return sheets;
}

function gsheetToCsvUrl(url: string): string | null {
  const m = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!m) return null;
  const id = m[1];
  const gidMatch = url.match(/[?&#]gid=([0-9]+)/);
  const gid = gidMatch?.[1] ?? "0";
  return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`;
}

export async function digestInputs(files: FileList | File[], gsheetUrl?: string): Promise<DigestResult> {
  const items: IngestItem[] = [];
  const sheets: ParsedSheet[] = [];

  const arr = Array.isArray(files) ? files : Array.from(files);

  for (const f of arr) {
    const name = f.name;
    const ext = extOf(name);
    const buf = await f.arrayBuffer();

    if (ext === "zip") {
      const zip = await JSZip.loadAsync(buf);
      const entries = Object.values(zip.files).filter((z) => !z.dir);

      for (const entry of entries) {
        const entryName = entry.name.split("/").pop() || entry.name;
        const entryBuf = await entry.async("arraybuffer");
        const type = classify(entryName);

        const it: IngestItem = {
          id: uid("zip"),
          type,
          name: entryName,
          size: entryBuf.byteLength,
          source: "zip",
          raw: entryBuf,
          meta: {},
        };

        if (type === "creative_image") {
          try { it.meta = { ...(it.meta ?? {}), ...(await detectImageMeta(entryBuf)) }; } catch {}
        } else if (type === "creative_video") {
          try { it.meta = { ...(it.meta ?? {}), ...(await detectVideoMeta(entryBuf)) }; } catch {}
        } else if (type === "tag_sheet") {
          try { sheets.push(...parseWorkbook(entryBuf, entryName)); } catch {}
        }

        items.push(it);
      }
      continue;
    }

    const type = classify(name);
    const it: IngestItem = {
      id: uid("f"),
      type,
      name,
      size: f.size,
      source: "standalone",
      raw: buf,
      meta: {},
    };

    if (type === "creative_image") {
      try { it.meta = { ...(it.meta ?? {}), ...(await detectImageMeta(buf)) }; } catch {}
    } else if (type === "creative_video") {
      try { it.meta = { ...(it.meta ?? {}), ...(await detectVideoMeta(buf)) }; } catch {}
    } else if (type === "tag_sheet") {
      try { sheets.push(...parseWorkbook(buf, name)); } catch {}
    }

    items.push(it);
  }

  if (gsheetUrl) {
    const csvUrl = gsheetToCsvUrl(gsheetUrl);
    if (!csvUrl) throw new Error("Could not parse Google Sheet URL (use docs.google.com/spreadsheets/d/<id>).");

    const resp = await fetch(csvUrl);
    if (!resp.ok) throw new Error("Could not fetch Google Sheet (must be public/no-login).");

    const text = await resp.text();
    const buf = new TextEncoder().encode(text).buffer;

    sheets.push(...parseWorkbook(buf, "sheet.csv"));
    items.push({
      id: uid("url"),
      type: "tag_sheet",
      name: "Google Sheet (CSV export)",
      size: text.length,
      source: "url",
      raw: buf,
      meta: { url: gsheetUrl, csvUrl },
    });
  }

  return { items, sheets };
}
