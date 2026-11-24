-- Fix: log_generic_change() writes columns that do not exist on public.audit_log
-- (entity_type, entity_id, old_data, new_data). Any INSERT/UPDATE/DELETE on a table
-- carrying a trigger from that function failed with
--   ERROR: column "entity_type" of relation "audit_log" does not exist
-- which made creating a service order and inviting a user impossible.
--
-- audit_trigger_func() already writes the real columns
-- (table_name, record_id, action, old_values, new_values) and is the function used by
-- every other audited table. Replace the two remaining broken triggers with it,
-- following the same pattern as 20260711194549 (which fixed assets, clients,
-- brand_guidelines and catalog_products). Both replacement triggers were validated
-- against Postgres 16 on the full 156-migration chain.

-- service_orders: had two audit triggers; the log_generic_change one aborted every write.
DROP TRIGGER IF EXISTS trigger_service_orders_audit_log ON public.service_orders;

-- organization_invites: the only audit trigger was the broken one.
DROP TRIGGER IF EXISTS trigger_org_invites_audit_log ON public.organization_invites;
DROP TRIGGER IF EXISTS audit_organization_invites_trigger ON public.organization_invites;
CREATE TRIGGER audit_organization_invites_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.organization_invites
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- No trigger references log_generic_change anymore. Drop it so it cannot be wired
-- back in by accident and reintroduce the failure.
DROP FUNCTION IF EXISTS public.log_generic_change();

-- log_asset_change() had the same wrong column names and no trigger left, but it is
-- still callable. Drop it for the same reason.
DROP FUNCTION IF EXISTS public.log_asset_change();