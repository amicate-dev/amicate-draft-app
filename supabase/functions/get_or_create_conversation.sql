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
  -- prevent self-conversations with a friendly error
  IF p_user_a = p_user_b THEN
    RAISE EXCEPTION 'get_or_create_conversation: participants must be different users.';
  END IF;

  -- Verify the caller is one of the participants
  IF auth.uid() IS DISTINCT FROM p_user_a AND auth.uid() IS DISTINCT FROM p_user_b THEN
    RAISE EXCEPTION 'get_or_create_conversation: caller must be one of the participants';
  END IF;

  -- Verify the matchmaking answer
  IF NOT EXISTS (
    SELECT 1 FROM public.matchmaking_answers ma
    WHERE ma.id = p_matchmaking_answer_id
      AND ma.status = 'accepted'
      AND ((ma.question_owner_id = p_user_a AND ma.answerer_id = p_user_b)
        OR (ma.question_owner_id = p_user_b AND ma.answerer_id = p_user_a))
  ) THEN 
    RAISE EXCEPTION 'get_or_create_conversation: answer does not link these two users or is not accepted';
  END IF;

  v_lo := LEAST(p_user_a, p_user_b);
  v_hi := GREATEST(p_user_a, p_user_b);

  -- check for an existing conversation
  SELECT c.id INTO v_id
  FROM public.conversations c
  WHERE c.participant_1_id = v_lo
    AND c.participant_2_id = v_hi;

  -- insert if not found, handling race conditions
  IF v_id IS NULL THEN
    BEGIN
      INSERT INTO public.conversations (participant_1_id, participant_2_id, matchmaking_answer_id)
      VALUES (v_lo, v_hi, p_matchmaking_answer_id)
      RETURNING id INTO v_id;
    EXCEPTION
      WHEN unique_violation THEN
        SELECT c.id INTO v_id
        FROM public.conversations c
        WHERE c.participant_1_id = v_lo
          AND c.participant_2_id = v_hi;
        IF v_id IS NULL THEN
          RAISE;
        END IF;
    END;
  END IF;
  
  -- Write back the conversation ID to the matchmaking answer
  -- We add a IS DISTINCT FROM to avoid unnecessary database writes if its already set
  UPDATE public.matchmaking_answers
  SET conversation_id = v_id
  WHERE id = p_matchmaking_answer_id
    AND conversation_id IS DISTINCT FROM v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_create_conversation(uuid, uuid, uuid) TO authenticated;
