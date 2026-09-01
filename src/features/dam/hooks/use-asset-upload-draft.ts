import { useState, useEffect, useMemo } from "react";
import type { AssetType } from "./use-assets";
import { validateTags } from "../components/TagChipsInput";

const DRAFT_PREFIX = "asset-upload-draft:";
const MAX_TAGS = 20;

export interface UploadDraft {
  tags: string[];
  tagError: string | null;
  assetType: AssetType;
  clientId: string | null;
}

function draftKey(orgId: string, clientId: string | null, parentAssetId: string | null): string | null {
  if (!orgId) return null;
  if (parentAssetId) return `${DRAFT_PREFIX}${orgId}:parent:${parentAssetId}`;
  if (clientId) return `${DRAFT_PREFIX}${orgId}:client:${clientId}`;
  return `${DRAFT_PREFIX}${orgId}:org`;
}

function readDraft(key: string | null): UploadDraft | null {
  if (!key || typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<UploadDraft>;
    if (!parsed || typeof parsed !== "object") return null;
    return {
      tags: Array.isArray(parsed.tags) ? parsed.tags.filter((t): t is string => typeof t === "string") : [],
      tagError: typeof parsed.tagError === "string" ? parsed.tagError : null,
      assetType: (typeof parsed.assetType === "string" ? parsed.assetType : "art") as AssetType,
      clientId: typeof parsed.clientId === "string" ? parsed.clientId : null,
    };
  } catch {
    return null;
  }
}

function writeDraft(key: string | null, draft: UploadDraft) {
  if (!key || typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(draft));
  } catch { /* ignore */ }
}

export function clearDraft(key: string | null) {
  if (!key || typeof window === "undefined") return;
  try {
    localStorage.removeItem(key);
  } catch { /* ignore */ }
}

export function useAssetUploadDraft(
  organizationId: string,
  initialClientId: string | null,
  initialAssetType: AssetType,
  initialTags: string[],
  parentAssetId: string | null,
  enabled: boolean
) {
  const [clientId, setClientId] = useState<string | null>(initialClientId);
  const [assetType, setAssetType] = useState<AssetType>(initialAssetType);
  const [tags, setTags] = useState<string[]>(initialTags);
  const [tagError, setTagError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const persistKey = useMemo(
    () => draftKey(organizationId, clientId, parentAssetId),
    [organizationId, clientId, parentAssetId]
  );

  // Initial hydration
  useEffect(() => {
    if (!enabled) {
      setHydrated(false);
      return;
    }
    
    const key = draftKey(organizationId, parentAssetId ? null : initialClientId, parentAssetId);
    const draft = readDraft(key);
    
    if (draft) {
      setClientId(parentAssetId ? initialClientId : (draft.clientId ?? initialClientId));
      setAssetType(draft.assetType ?? initialAssetType);
      setTags(draft.tags ?? initialTags);
      setTagError(validateTags(draft.tags ?? initialTags, MAX_TAGS));
    } else {
      setClientId(initialClientId);
      setAssetType(initialAssetType);
      setTags(initialTags);
      setTagError(validateTags(initialTags, MAX_TAGS));
    }
    setHydrated(true);
  }, [enabled, organizationId, initialClientId, initialAssetType, initialTags, parentAssetId]);

  // Persist on change
  useEffect(() => {
    if (!enabled || !hydrated) return;
    writeDraft(persistKey, { tags, tagError, assetType, clientId });
  }, [enabled, hydrated, persistKey, tags, tagError, assetType, clientId]);

  // Re-validate on asset type change
  useEffect(() => {
    if (hydrated) {
      setTagError(validateTags(tags, MAX_TAGS));
    }
  }, [assetType, hydrated, tags]);

  return {
    clientId,
    setClientId,
    assetType,
    setAssetType,
    tags,
    setTags,
    tagError,
    setTagError,
    persistKey,
    hydrated
  };
}
