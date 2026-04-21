import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAssets, type Asset, type AssetType } from "./use-assets";

export interface UploadOptions {
  organizationId: string;
  clientId?: string | null;
  assetType: AssetType;
  tags?: string[];
  name?: string;
  description?: string;
  parentAssetId?: string | null;
  /** When provided, upload becomes a new version of this asset. */
  parentAsset?: Asset | null;
}

interface ImageMeta {
  width: number;
  height: number;
  thumbnailBlob: Blob | null;
  dominantColors: string[];
}

async function processImage(file: File): Promise<ImageMeta | null> {
  if (!file.type.startsWith("image/")) return null;
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      // thumbnail
      const max = 256;
      const ratio = Math.min(max / width, max / height, 1);
      const tw = Math.max(1, Math.round(width * ratio));
      const th = Math.max(1, Math.round(height * ratio));
      const canvas = document.createElement("canvas");
      canvas.width = tw;
      canvas.height = th;
      const ctx = canvas.getContext("2d");
      let dominantColors: string[] = [];
      let thumbnailBlob: Blob | null = null;
      if (ctx) {
        ctx.drawImage(img, 0, 0, tw, th);
        // dominant colors via bucketed sampling
        try {
          const data = ctx.getImageData(0, 0, tw, th).data;
          const buckets = new Map<string, number>();
          for (let i = 0; i < data.length; i += 4 * 4) {
            const a = data[i + 3];
            if (a < 128) continue;
            const r = data[i] & 0xf0;
            const g = data[i + 1] & 0xf0;
            const b = data[i + 2] & 0xf0;
            const key = `${r},${g},${b}`;
            buckets.set(key, (buckets.get(key) ?? 0) + 1);
          }
          dominantColors = [...buckets.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([k]) => {
              const [r, g, b] = k.split(",").map(Number);
              return "#" + [r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("");
            });
        } catch {
          /* ignore CORS-tainted */
        }
        canvas.toBlob((blob) => {
          thumbnailBlob = blob;
          URL.revokeObjectURL(url);
          resolve({ width, height, thumbnailBlob, dominantColors });
        }, "image/jpeg", 0.8);
        return;
      }
      URL.revokeObjectURL(url);
      resolve({ width, height, thumbnailBlob, dominantColors });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

function sanitize(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function useAssetUpload(organizationId: string | null) {
  const { create } = useAssets(organizationId);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  async function uploadFile(file: File, options: UploadOptions) {
    setIsUploading(true);
    setProgress(10);
    try {
      const meta = await processImage(file);
      setProgress(35);
      const assetId = crypto.randomUUID();
      const folder = `${options.organizationId}/${options.clientId ?? "_org"}/${assetId}`;
      const filename = sanitize(file.name);
      const filePath = `${folder}/${filename}`;

      const { error: upErr } = await supabase.storage
        .from("assets")
        .upload(filePath, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;
      setProgress(65);

      let thumbnailPath: string | null = null;
      if (meta?.thumbnailBlob) {
        thumbnailPath = `${folder}/thumb_${filename.replace(/\.[^.]+$/, "")}.jpg`;
        const { error: thErr } = await supabase.storage
          .from("assets")
          .upload(thumbnailPath, meta.thumbnailBlob, { contentType: "image/jpeg", upsert: false });
        if (thErr) thumbnailPath = null;
      }
      setProgress(85);

      // Versioning: chain root = parent.parent_asset_id ?? parent.id
      const parent = options.parentAsset ?? null;
      const parentRootId = parent ? (parent.parent_asset_id ?? parent.id) : null;
      const nextVersion = parent ? parent.version + 1 : 1;
      const versionedName =
        options.name ??
        (parent ? `${parent.name.replace(/\s+v\d+$/, "")} v${nextVersion}` : file.name);

      const asset = await create.mutateAsync({
        organization_id: options.organizationId,
        client_id: options.clientId ?? parent?.client_id ?? null,
        name: versionedName,
        description: options.description ?? null,
        asset_type: options.assetType ?? parent?.asset_type ?? "other",
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type,
        width: meta?.width ?? null,
        height: meta?.height ?? null,
        dominant_colors: meta?.dominantColors ?? [],
        thumbnail_path: thumbnailPath,
        tags: options.tags ?? parent?.tags ?? [],
        parent_asset_id: parentRootId ?? options.parentAssetId ?? null,
        version: nextVersion,
      });
      setProgress(100);
      return asset;
    } finally {
      setIsUploading(false);
      setTimeout(() => setProgress(0), 600);
    }
  }

  return { uploadFile, isUploading, progress };
}