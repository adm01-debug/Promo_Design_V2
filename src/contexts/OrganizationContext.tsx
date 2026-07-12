import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

const STORAGE_KEY = "promo.currentOrgId";

export type AppRole = "owner" | "admin" | "designer" | "approver" | "viewer";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  created_by: string;
  created_at: string;
}

export interface OrgMembership {
  id: string;
  organization_id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
  organizations?: Organization | null;
}

interface OrganizationContextType {
  memberships: OrgMembership[];
  organizations: Organization[];
  currentOrgId: string | null;
  currentMembership: OrgMembership | null;
  currentRole: AppRole | null;
  isLoading: boolean;
  switchOrg: (orgId: string) => void;
  createOrg: ReturnType<typeof useMutation<Organization, Error, { name: string }>>;
  can: (roles: AppRole[]) => boolean;
  hasNoOrg: boolean;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40) || `org-${Date.now().toString(36)}`;
}

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(
    () => (typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null),
  );

  const membershipsQuery = useQuery({
    queryKey: ["org-memberships", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<OrgMembership[]> => {
      const { data, error } = await supabase
        .from("organization_members")
        .select("id, organization_id, user_id, role, created_at, organizations(*)")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []) as unknown as OrgMembership[];
    },
  });

  // Auto-select first org if none chosen
  useEffect(() => {
    const list = membershipsQuery.data;
    if (!list || list.length === 0) return;
    if (!currentOrgId || !list.some((m) => m.organization_id === currentOrgId)) {
      const next = list[0].organization_id;
      setCurrentOrgId(next);
      try { localStorage.setItem(STORAGE_KEY, next); } catch { /* ignore */ }
    }
  }, [membershipsQuery.data, currentOrgId]);

  const switchOrg = useCallback((orgId: string) => {
    setCurrentOrgId(orgId);
    try { localStorage.setItem(STORAGE_KEY, orgId); } catch { /* ignore */ }
  }, []);

  const currentMembership = membershipsQuery.data?.find((m) => m.organization_id === currentOrgId) ?? null;
  const currentRole: AppRole | null = currentMembership?.role ?? null;

  const createOrg = useMutation({
    mutationFn: async (name: string) => {
      if (!user) throw new Error("Não autenticado");
      const slug = `${slugify(name)}-${Math.random().toString(36).slice(2, 6)}`;
      const { data, error } = await supabase
        .from("organizations")
        .insert({ name, slug, created_by: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as Organization;
    },
    onSuccess: (org) => {
      qc.invalidateQueries({ queryKey: ["org-memberships"] });
      switchOrg(org.id);
    },
  });

  const can = useCallback((roles: AppRole[]) => {
    if (!currentRole) return false;
    return roles.includes(currentRole);
  }, [currentRole]);

  const value = {
    memberships: membershipsQuery.data ?? [],
    organizations: (membershipsQuery.data ?? []).map((m) => m.organizations).filter(Boolean) as Organization[],
    currentOrgId,
    currentMembership,
    currentRole,
    isLoading: membershipsQuery.isLoading,
    switchOrg,
    createOrg,
    can,
    hasNoOrg: membershipsQuery.isSuccess && (membershipsQuery.data?.length === 0),
  };

  return <OrganizationContext.Provider value={value}>{children}</OrganizationContext.Provider>;
}

export function useOrganizationContext() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error("useOrganizationContext must be used within an OrganizationProvider");
  }
  return context;
}
