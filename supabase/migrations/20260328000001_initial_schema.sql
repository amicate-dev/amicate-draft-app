-- =============================================================================
-- 1. Extensions
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

-- =============================================================================
-- 2. ENUM types
-- =============================================================================
CREATE TYPE public.gender_type AS ENUM (
  'male',
  'female',
  'non_binary',
  'prefer_not_to_say'
);

CREATE TYPE public.message_type AS ENUM (
  'text',
  'image',
  'system'
);

CREATE TYPE public.connection_status AS ENUM (
  'pending',
  'accepted',
  'declined'
);

CREATE TYPE public.report_reason AS ENUM (
  'harassment',
  'fake_profile',
  'inappropriate_content',
  'spam',
  'underage',
  'other'
);

CREATE TYPE public.report_status AS ENUM (
  'open',
  'under_review',
  'actioned',
  'dismissed'
);

-- =============================================================================
-- 3. profiles
-- =============================================================================
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users (id) ON DELETE CASCADE,
  username varchar(30),
  full_name varchar(50),
  date_of_birth date,
  gender public.gender_type,
  bio varchar(300),
  matchmaking_question varchar(150),
  avatar_url text,
  location_lat numeric(9, 6),
  location_lng numeric(9, 6),
  location_point extensions.geography(point, 4326),
  location_city varchar(100),
  location_updated_at timestamptz,
  max_distance_km integer NOT NULL DEFAULT 25,
  is_profile_complete boolean NOT NULL DEFAULT false,
  is_visible boolean NOT NULL DEFAULT true,
  onboarding_step integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profiles_username_no_uppercase_or_spaces CHECK (
    username IS NULL
    OR (
      username = lower(username)
      AND username NOT LIKE '% %'
    )
  ),
  CONSTRAINT profiles_location_lat_range CHECK (
    location_lat IS NULL
    OR (location_lat >= -90 AND location_lat <= 90)
  ),
  CONSTRAINT profiles_location_lng_range CHECK (
    location_lng IS NULL
    OR (location_lng >= -180 AND location_lng <= 180)
  ),
  CONSTRAINT profiles_max_distance_km_range CHECK (
    max_distance_km >= 1
    AND max_distance_km <= 150
  ),
  CONSTRAINT profiles_onboarding_step_range CHECK (
    onboarding_step >= 1
    AND onboarding_step <= 6
  )
);

COMMENT ON COLUMN public.profiles.location_point IS
  'Synced from location_lat/location_lng via trigger; EPSG:4326 (WGS84).';

-- =============================================================================
-- 4. profile_photos
-- =============================================================================
CREATE TABLE public.profile_photos (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  display_order integer NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, display_order),
  CONSTRAINT profile_photos_display_order_range CHECK (
    display_order >= 1
    AND display_order <= 5
  )
);

-- =============================================================================
-- 5. user_interests
-- =============================================================================
CREATE TABLE public.user_interests (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  tag varchar(50) NOT NULL,
  added_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, tag)
);

-- =============================================================================
-- 6. matchmaking_answers
-- =============================================================================
CREATE TABLE public.matchmaking_answers (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  question_owner_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  answerer_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  answer_text varchar(500) NOT NULL,
  status public.connection_status NOT NULL DEFAULT 'pending',
  answered_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  conversation_id uuid,
  UNIQUE (question_owner_id, answerer_id),
  CONSTRAINT matchmaking_answers_distinct_users CHECK (question_owner_id <> answerer_id)
);

-- =============================================================================
-- 7. conversations (+ deferred FK from matchmaking_answers)
-- =============================================================================
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  participant_1_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  participant_2_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  matchmaking_answer_id uuid NOT NULL UNIQUE REFERENCES public.matchmaking_answers (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  UNIQUE (participant_1_id, participant_2_id),
  CONSTRAINT conversations_ordered_participants CHECK (participant_1_id < participant_2_id)
);

ALTER TABLE public.matchmaking_answers
  ADD CONSTRAINT matchmaking_answers_conversation_id_fkey
  FOREIGN KEY (conversation_id) REFERENCES public.conversations (id) ON DELETE SET NULL;

-- =============================================================================
-- 8. messages
-- =============================================================================
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  conversation_id uuid NOT NULL REFERENCES public.conversations (id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  content text,
  message_type public.message_type NOT NULL DEFAULT 'text',
  media_url text,
  sent_at timestamptz(3) NOT NULL DEFAULT now(),
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  is_deleted_by_sender boolean NOT NULL DEFAULT false,
  CONSTRAINT messages_content_by_type CHECK (
    (
      message_type = 'text'
      AND content IS NOT NULL
    )
    OR (
      message_type = 'image'
      AND media_url IS NOT NULL
    )
    OR (message_type = 'system')
  )
);

-- =============================================================================
-- 9. blocks
-- =============================================================================
CREATE TABLE public.blocks (
  blocker_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CONSTRAINT blocks_distinct_users CHECK (blocker_id <> blocked_id)
);

-- =============================================================================
-- 10. reports
-- =============================================================================
CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  reporter_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  reported_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  reason public.report_reason NOT NULL,
  details varchar(1000),
  reported_message_id uuid REFERENCES public.messages (id) ON DELETE SET NULL,
  status public.report_status NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid,
  CONSTRAINT reports_distinct_users CHECK (reported_id IS DISTINCT FROM reporter_id)
);

-- =============================================================================
-- 11. push_tokens
-- =============================================================================
CREATE TABLE public.push_tokens (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  token text NOT NULL,
  platform varchar(10) NOT NULL,
  device_id varchar(255),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  CONSTRAINT push_tokens_platform_check CHECK (platform IN ('ios', 'android'))
);

-- =============================================================================
-- 12. Triggers
-- =============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.set_profiles_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, extensions
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_profiles_updated_at();

CREATE OR REPLACE FUNCTION public.sync_profile_location_point()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, extensions
AS $$
BEGIN
  IF NEW.location_lat IS NULL OR NEW.location_lng IS NULL THEN
    NEW.location_point := NULL;
  ELSE
    NEW.location_point := extensions.ST_SetSRID(
      extensions.ST_MakePoint(NEW.location_lng::double precision, NEW.location_lat::double precision),
      4326
    )::extensions.geography;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_sync_location_point
  BEFORE INSERT OR UPDATE OF location_lat, location_lng ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_location_point();

CREATE OR REPLACE FUNCTION public.profile_photos_enforce_single_primary()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_primary THEN
    UPDATE public.profile_photos
    SET is_primary = false
    WHERE user_id = NEW.user_id
      AND id IS DISTINCT FROM NEW.id
      AND is_primary = true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER profile_photos_enforce_single_primary
  BEFORE INSERT OR UPDATE OF is_primary ON public.profile_photos
  FOR EACH ROW
  WHEN (NEW.is_primary = true)
  EXECUTE FUNCTION public.profile_photos_enforce_single_primary();

CREATE OR REPLACE FUNCTION public.sync_profile_avatar_from_primary_photo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_url text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.is_primary THEN
      SELECT pp.photo_url INTO v_url
      FROM public.profile_photos pp
      WHERE pp.user_id = OLD.user_id
        AND pp.is_primary = true
      LIMIT 1;
      UPDATE public.profiles
      SET avatar_url = v_url
      WHERE user_id = OLD.user_id;
    END IF;
    RETURN OLD;
  END IF;

  IF NEW.is_primary THEN
    UPDATE public.profiles
    SET avatar_url = NEW.photo_url
    WHERE user_id = NEW.user_id;
  ELSIF TG_OP = 'UPDATE'
    AND OLD.is_primary = true
    AND NEW.is_primary = false
  THEN
    SELECT pp.photo_url INTO v_url
    FROM public.profile_photos pp
    WHERE pp.user_id = NEW.user_id
      AND pp.is_primary = true
    LIMIT 1;
    UPDATE public.profiles
    SET avatar_url = v_url
    WHERE user_id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER profile_photos_sync_avatar
  AFTER INSERT OR DELETE OR UPDATE OF is_primary, photo_url ON public.profile_photos
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_avatar_from_primary_photo();

CREATE OR REPLACE FUNCTION public.user_interests_preserve_identity_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.added_at IS DISTINCT FROM OLD.added_at THEN
    RAISE EXCEPTION 'user_interests_immutable: user_id and added_at cannot be changed';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER user_interests_preserve_identity
  BEFORE UPDATE ON public.user_interests
  FOR EACH ROW
  EXECUTE FUNCTION public.user_interests_preserve_identity_columns();

CREATE OR REPLACE FUNCTION public.enforce_user_interests_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  c integer;
BEGIN
  SELECT count(*) INTO c FROM public.user_interests WHERE user_id = NEW.user_id;
  IF c >= 5 THEN
    RAISE EXCEPTION 'Maximum of 5 interests allowed per user.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER user_interests_enforce_limit
  BEFORE INSERT ON public.user_interests
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_user_interests_limit();

CREATE OR REPLACE FUNCTION public.conversations_set_last_message_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  UPDATE public.conversations
  SET last_message_at = NEW.sent_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER messages_set_conversation_last_message_at
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.conversations_set_last_message_at();

CREATE OR REPLACE FUNCTION public.enforce_single_pending_matchmaking_answer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_lo uuid;
  v_hi uuid;
BEGIN
  v_lo := LEAST(NEW.question_owner_id, NEW.answerer_id);
  v_hi := GREATEST(NEW.question_owner_id, NEW.answerer_id);
  IF EXISTS (
    SELECT 1
    FROM public.matchmaking_answers ma
    WHERE ma.status = 'pending'
      AND LEAST(ma.question_owner_id, ma.answerer_id) = v_lo
      AND GREATEST(ma.question_owner_id, ma.answerer_id) = v_hi
  ) THEN
    RAISE EXCEPTION
      'matchmaking_pending_pair_exists: a pending answer already exists between these two users';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER matchmaking_answers_enforce_single_pending
  BEFORE INSERT ON public.matchmaking_answers
  FOR EACH ROW
  WHEN (NEW.status = 'pending'::public.connection_status)
  EXECUTE FUNCTION public.enforce_single_pending_matchmaking_answer();

-- When a block is created, two outcomes matter:
-- (1) Shared chat: deactivate the conversation (handled here).
-- (2) Discovery: the blocked user must not appear in the blocker's feed — NOT handled
--     here. Do not update profiles.is_visible for that purpose.
--
-- NOTE: Block trigger intentionally does NOT modify profiles.is_visible.
-- is_visible is a user-controlled visibility toggle (hide from everyone).
-- Mutual discovery exclusion on block is handled entirely by the RLS
-- SELECT policy on profiles, which filters blocked user IDs at query time.
-- No trigger modification to profiles is required or correct here.

CREATE OR REPLACE FUNCTION public.deactivate_conversation_on_block()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_lo uuid;
  v_hi uuid;
BEGIN
  v_lo := LEAST(NEW.blocker_id, NEW.blocked_id);
  v_hi := GREATEST(NEW.blocker_id, NEW.blocked_id);
  UPDATE public.conversations
  SET is_active = false
  WHERE participant_1_id = v_lo
    AND participant_2_id = v_hi;
  RETURN NEW;
END;
$$;

CREATE TRIGGER blocks_deactivate_conversation
  AFTER INSERT ON public.blocks
  FOR EACH ROW
  EXECUTE FUNCTION public.deactivate_conversation_on_block();

-- =============================================================================
-- 13. Row level security (active + inactive)
-- =============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_interests ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.matchmaking_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select_discovery
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR (
      is_visible
      AND is_profile_complete
      AND NOT EXISTS (
        SELECT 1
        FROM public.blocks b
        WHERE (b.blocker_id = auth.uid() AND b.blocked_id = profiles.user_id)
           OR (b.blocker_id = profiles.user_id AND b.blocked_id = auth.uid())
      )
    )
  );

CREATE POLICY profiles_insert_own
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY profiles_update_own
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY profile_photos_select_discovery
  ON public.profile_photos
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR (
      EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.user_id = profile_photos.user_id
          AND p.is_visible
          AND p.is_profile_complete
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.blocks b
        WHERE (b.blocker_id = auth.uid() AND b.blocked_id = profile_photos.user_id)
           OR (b.blocker_id = profile_photos.user_id AND b.blocked_id = auth.uid())
      )
    )
  );

CREATE POLICY profile_photos_insert_own_within_limit
  ON public.profile_photos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      SELECT COUNT(*)::integer
      FROM public.profile_photos pp
      WHERE pp.user_id = profile_photos.user_id
    ) <= 5
  );

CREATE POLICY profile_photos_update_own
  ON public.profile_photos
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY profile_photos_delete_own
  ON public.profile_photos
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY user_interests_select_discovery
  ON public.user_interests
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR (
      EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.user_id = user_interests.user_id
          AND p.is_visible
          AND p.is_profile_complete
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.blocks b
        WHERE (b.blocker_id = auth.uid() AND b.blocked_id = user_interests.user_id)
           OR (b.blocker_id = user_interests.user_id AND b.blocked_id = auth.uid())
      )
    )
  );

CREATE POLICY user_interests_insert_own
  ON public.user_interests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_interests_update_own
  ON public.user_interests
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_interests_delete_own
  ON public.user_interests
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

REVOKE DELETE ON public.profiles FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_photos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_interests TO authenticated;

-- =============================================================================
-- 14. Indexes (active + inactive)
-- =============================================================================
CREATE UNIQUE INDEX profiles_username_unique_not_null
  ON public.profiles (username)
  WHERE username IS NOT NULL;

CREATE INDEX profiles_location_point_gix
  ON public.profiles
  USING gist (location_point)
  WHERE location_point IS NOT NULL;

CREATE INDEX profiles_discovery_visibility_idx
  ON public.profiles (is_visible, is_profile_complete)
  WHERE is_visible
    AND is_profile_complete;

CREATE UNIQUE INDEX profile_photos_one_primary_per_user
  ON public.profile_photos (user_id)
  WHERE is_primary;

CREATE INDEX profile_photos_user_id_idx ON public.profile_photos (user_id);

CREATE INDEX profile_photos_user_display_order_idx
  ON public.profile_photos (user_id, display_order);

CREATE INDEX user_interests_user_id_idx ON public.user_interests (user_id);

CREATE INDEX user_interests_tag_idx ON public.user_interests (tag);

CREATE INDEX matchmaking_answers_question_owner_id_idx
  ON public.matchmaking_answers (question_owner_id);

CREATE INDEX matchmaking_answers_answerer_id_idx
  ON public.matchmaking_answers (answerer_id);

CREATE INDEX matchmaking_answers_owner_status_idx
  ON public.matchmaking_answers (question_owner_id, status);

CREATE INDEX conversations_participant_1_id_idx ON public.conversations (participant_1_id);
CREATE INDEX conversations_participant_2_id_idx ON public.conversations (participant_2_id);
CREATE INDEX conversations_matchmaking_answer_id_idx ON public.conversations (matchmaking_answer_id);

CREATE INDEX conversations_last_message_at_desc_idx
  ON public.conversations (last_message_at DESC NULLS LAST);

CREATE INDEX messages_conversation_id_sent_at_idx
  ON public.messages (conversation_id, sent_at);

CREATE INDEX messages_sender_id_idx ON public.messages (sender_id);

CREATE INDEX messages_conversation_read_sender_idx
  ON public.messages (conversation_id, is_read, sender_id);

CREATE INDEX blocks_blocked_id_idx ON public.blocks (blocked_id);

CREATE INDEX reports_reporter_id_idx ON public.reports (reporter_id);
CREATE INDEX reports_reported_id_idx ON public.reports (reported_id);
CREATE INDEX reports_status_idx ON public.reports (status);

CREATE UNIQUE INDEX push_tokens_user_id_device_id_unique
  ON public.push_tokens (user_id, device_id)
  WHERE device_id IS NOT NULL;

CREATE INDEX push_tokens_user_id_idx ON public.push_tokens (user_id);

-- =============================================================================
-- 15. Database functions
-- =============================================================================
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
  req_point extensions.geography;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_requester_id THEN
    RAISE EXCEPTION 'get_nearby_users: caller must be the requester';
  END IF;

  req_point := extensions.ST_SetSRID(
    extensions.ST_MakePoint(p_lng, p_lat),
    4326
  )::extensions.geography;

  RETURN QUERY
  SELECT
    p.id,
    p.full_name::text,
    (DATE_PART('year', AGE(CURRENT_DATE, p.date_of_birth)))::integer,
    (extensions.ST_Distance(p.location_point, req_point) / 1000.0)::double precision,
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
    AND extensions.ST_DWithin(p.location_point, req_point, p_max_km::double precision * 1000.0)
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
  ORDER BY extensions.ST_Distance(p.location_point, req_point);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_nearby_users(uuid, double precision, double precision, integer) TO authenticated;

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
