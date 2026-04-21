import JSZip from "jszip";
import { format } from "date-fns";
import type { Asset } from "../hooks/use-assets";
import type { Client } from "@/features/clients/hooks/use-clients";
import { getAssetSignedUrl } from "./asset-urls";

function escape(value: string): string {
  if (/[",\n;]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

const BASE_HEADERS = [
  "id", "name", "type", "client", "version", "file_size", "mime_type",
  "tags", "colors", "is_archived", "created_at", "updated_at", "storage_path",
] as const;

function rowFor(asset: Asset, clientName: string): string[] {
  return [
    asset.id,
    asset.name,
    asset.asset_type,
    clientName,
    String(asset.version ?? ""),
    asset.file_size != null ? String(asset.file_size) : "",
    asset.mime_type ?? "",
    (asset.tags ?? []).join("|"),
    (asset.dominant_colors ?? []).join("|"),
    asset.is_archived ? "true" : "false",
    asset.created_at,
    asset.updated_at,
    asset.file_path,
  ];
}

function clientName(asset: Asset, clientMap: Map<string, string>): string {
  if (!asset.client_id) return "";
  return clientMap.get(asset.client_id) ?? "";
}

export function buildAssetsCsv(assets: Asset[], clients: Client[]): string {
  const map = new Map(clients.map((c) => [c.id, c.name]));
  const header = BASE_HEADERS.join(",");
  const lines = assets.map((a) => rowFor(a, clientName(a, map)).map(escape).join(","));
  return [header, ...lines].join("\n");
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function safeName(name: string): string {
  return name.replace(/[/\\?%*:|"<>]/g, "_").replace(/\s+/g, "_").slice(0, 120) || "asset";
}

function extFromMime(mime?: string | null, fallbackPath?: string): string {
  if (fallbackPath) {
    const m = fallbackPath.match(/\.([a-zA-Z0-9]{1,8})$/);
    if (m) return m[1].toLowerCase();
  }
  if (!mime) return "bin";
  const map: Record<string, string> = {
    "image/png": "png", "image/jpeg": "jpg", "image/jpg": "jpg",
    "image/webp": "webp", "image/svg+xml": "svg", "image/gif": "gif",
    "application/pdf": "pdf", "application/zip": "zip",
  };
  return map[mime] ?? mime.split("/")[1] ?? "bin";
}

export async function downloadAssetsZip(
  assets: Asset[],
  clients: Client[],
  onProgress?: (done: number, total: number) => void,
): Promise<{ ok: number; failed: number }> {
  const zip = new JSZip();
  const map = new Map(clients.map((c) => [c.id, c.name]));
  const used = new Map<string, number>();
  const manifestRows: string[][] = [];
  let ok = 0;
  let failed = 0;

  for (let i = 0; i < assets.length; i++) {
    const asset = assets[i];
    const ext = extFromMime(asset.mime_type, asset.file_path);
    const base = safeName(asset.name).replace(/\.[a-zA-Z0-9]{1,8}$/, "");
    const folder = asset.asset_type;
    let candidate = `${folder}/${base}.${ext}`;
    const seen = used.get(candidate) ?? 0;
    if (seen > 0) candidate = `${folder}/${base}_${seen + 1}.${ext}`;
    used.set(candidate, 1);
    used.set(`${folder}/${base}.${ext}`, seen + 1);

    let status = "ok";
    try {
      const url = await getAssetSignedUrl(asset.file_path);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      zip.file(candidate, blob);
      ok++;
    } catch (e) {
      status = `error: ${e instanceof Error ? e.message : "unknown"}`;
      failed++;
    }

    manifestRows.push([...rowFor(asset, clientName(asset, map)), status, status === "ok" ? candidate : ""]);
    onProgress?.(i + 1, assets.length);
  }

  const header = [...BASE_HEADERS, "download_status", "zip_path"].join(",");
  const manifest = [header, ...manifestRows.map((r) => r.map(escape).join(","))].join("\n");
  zip.file("manifest.csv", `\ufeff${manifest}`);

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `dam-assets-${format(new Date(), "yyyyMMdd-HHmmss")}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return { ok, failed };
}
