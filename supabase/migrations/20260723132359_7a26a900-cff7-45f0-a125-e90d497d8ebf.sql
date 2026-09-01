-- Trigger function: debounced auto-recompute of client design patterns.
-- Never blocks the original write; on any failure emits a WARNING.
CREATE OR REPLACE FUNCTION public.tg_recompute_design_patterns_on_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org  uuid;
  v_last timestamptz;
BEGIN
  v_org := COALESCE(NEW.organization_id, OLD.organization_id);
  IF v_org IS NULL THEN
    RETURN NEW;
  END IF;

  -- Debounce: skip recompute if we ran it in the last 5 minutes for this org.
  SELECT last_computed_at INTO v_last
    FROM public.client_design_patterns
   WHERE organization_id = v_org AND client_id IS NULL
   LIMIT 1;

  IF v_last IS NOT NULL AND v_last > now() - interval '5 minutes' THEN
    RETURN NEW;
  END IF;

  BEGIN
    PERFORM public.recompute_client_design_patterns(v_org, NULL);
  EXCEPTION WHEN OTHERS THEN
    -- Recompute is best-effort — never break the underlying write.
    RAISE WARNING 'tg_recompute_design_patterns_on_change failed for org %: %', v_org, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.tg_recompute_design_patterns_on_change() FROM PUBLIC;

-- Fires when a mockup draft is created or its editor_state is edited.
DROP TRIGGER IF EXISTS trg_mockup_drafts_recompute_patterns ON public.mockup_drafts;
CREATE TRIGGER trg_mockup_drafts_recompute_patterns
AFTER INSERT OR UPDATE OF editor_state ON public.mockup_drafts
FOR EACH ROW
WHEN (NEW.editor_state IS NOT NULL AND NEW.organization_id IS NOT NULL)
EXECUTE FUNCTION public.tg_recompute_design_patterns_on_change();

-- Fires when a magic-up result is favorited (approval signal) or inserted already favorited.
DROP TRIGGER IF EXISTS trg_magicup_history_recompute_patterns ON public.magicup_history;
CREATE TRIGGER trg_magicup_history_recompute_patterns
AFTER INSERT OR UPDATE OF favorite ON public.magicup_history
FOR EACH ROW
WHEN (NEW.favorite = true AND NEW.organization_id IS NOT NULL)
EXECUTE FUNCTION public.tg_recompute_design_patterns_on_change();