-- See migration 20260328100016_active_0016_database_functions.sql.
-- Atomic get-or-insert conversation for an accepted match (participant order enforced by CHECK).

CREATE OR REPLACE FUNCTION public.get_or_create_conversation(
  p_user_a uuid,
  p_user_b uuid,
  p_matchmaking_answer_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lo uuid;
  v_hi uuid;
  v_id uuid;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_a AND auth.uid() IS DISTINCT FROM p_user_b THEN
    RAISE EXCEPTION 'get_or_create_conversation: caller must be one of the participants';
  END IF;

  v_lo := LEAST(p_user_a, p_user_b);
  v_hi := GREATEST(p_user_a, p_user_b);

  SELECT c.id INTO v_id
  FROM public.conversations c
  WHERE c.participant_1_id = v_lo
    AND c.participant_2_id = v_hi;

  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  BEGIN
    INSERT INTO public.conversations (participant_1_id, participant_2_id, matchmaking_answer_id)
    VALUES (v_lo, v_hi, p_matchmaking_answer_id)
    RETURNING id INTO v_id;
    RETURN v_id;
  EXCEPTION
    WHEN unique_violation THEN
      SELECT c.id INTO v_id
      FROM public.conversations c
      WHERE c.participant_1_id = v_lo
        AND c.participant_2_id = v_hi;
      IF v_id IS NULL THEN
        RAISE;
      END IF;
      RETURN v_id;
  END;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_create_conversation(uuid, uuid, uuid) TO authenticated;
