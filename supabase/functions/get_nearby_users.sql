-- See migration 20260328100016_active_0016_database_functions.sql (applied to the database).
-- RPC: discovery feed candidates near the requester, with block and matchmaking exclusions.

CREATE OR REPLACE FUNCTION public.get_nearby_users(
  p_requester_id uuid,
  p_lat double precision,
  p_lng double precision,
  p_max_km integer
)
RETURNS TABLE (
  profile_id uuid,
  display_name text,
  age_years integer,
  distance_km double precision,
  avatar_url text,
  city text,
  interest_tags text[]
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  req_point geography;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_requester_id THEN
    RAISE EXCEPTION 'get_nearby_users: caller must be the requester';
  END IF;

  req_point := ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography;

  RETURN QUERY
  SELECT
    p.id,
    p.full_name::text,
    (DATE_PART('year', AGE(CURRENT_DATE, p.date_of_birth)))::integer,
    (ST_Distance(p.location_point, req_point) / 1000.0)::double precision,
    p.avatar_url::text,
    p.location_city::text,
    COALESCE(
      (
        SELECT ARRAY_AGG(ui.tag ORDER BY ui.added_at)
        FROM public.user_interests ui
        WHERE ui.user_id = p.user_id
      ),
      ARRAY[]::text[]
    )
  FROM public.profiles p
  WHERE p.user_id <> p_requester_id
    AND p.is_visible
    AND p.is_profile_complete
    AND p.date_of_birth IS NOT NULL
    AND p.location_point IS NOT NULL
    AND ST_DWithin(p.location_point, req_point, p_max_km::double precision * 1000.0)
    AND NOT EXISTS (
      SELECT 1
      FROM public.blocks b
      WHERE (b.blocker_id = p_requester_id AND b.blocked_id = p.user_id)
         OR (b.blocker_id = p.user_id AND b.blocked_id = p_requester_id)
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.matchmaking_answers ma
      WHERE ma.answerer_id = p_requester_id
        AND ma.question_owner_id = p.user_id
    )
  ORDER BY ST_Distance(p.location_point, req_point);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_nearby_users(uuid, double precision, double precision, integer) TO authenticated;
