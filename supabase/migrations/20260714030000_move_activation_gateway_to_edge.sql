-- The custom-authenticated Edge Function now owns application access. Remove
-- the temporary public-schema gateway functions so no SECURITY DEFINER
-- analytics function remains executable through the public Data API.

REVOKE ALL ON FUNCTION public.pathforge_record_product_event_from_app(
  TEXT, UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, SMALLINT
) FROM PUBLIC, anon, authenticated, service_role;
DROP FUNCTION public.pathforge_record_product_event_from_app(
  TEXT, UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, SMALLINT
);

REVOKE ALL ON FUNCTION public.pathforge_activation_dashboard_for_admin(INTEGER, TEXT)
  FROM PUBLIC, anon, authenticated, service_role;
DROP FUNCTION public.pathforge_activation_dashboard_for_admin(INTEGER, TEXT);

NOTIFY pgrst, 'reload schema';
