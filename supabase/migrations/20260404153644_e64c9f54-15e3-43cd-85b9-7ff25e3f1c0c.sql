
-- Validation trigger for quantity > 0 (using trigger instead of CHECK for flexibility)
CREATE OR REPLACE FUNCTION public.validate_service_order()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quantity < 1 THEN
    RAISE EXCEPTION 'quantity must be >= 1';
  END IF;
  IF length(NEW.client_name) > 500 THEN
    RAISE EXCEPTION 'client_name exceeds max length (500)';
  END IF;
  IF length(NEW.product_name) > 500 THEN
    RAISE EXCEPTION 'product_name exceeds max length (500)';
  END IF;
  IF length(NEW.os_number) > 20 THEN
    RAISE EXCEPTION 'os_number exceeds max length (20)';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER validate_service_order_trigger
BEFORE INSERT OR UPDATE ON public.service_orders
FOR EACH ROW
EXECUTE FUNCTION public.validate_service_order();
