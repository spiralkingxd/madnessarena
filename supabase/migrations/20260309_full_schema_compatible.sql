-- Unified schema migration for Madness Arena
-- Date: 2026-03-09
-- Purpose: single migration compatible with current backend and frontend usage.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------
-- Utility functions
-- -----------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
	NEW.updated_at = timezone('utc'::text, now());
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_ban_timestamp()
RETURNS trigger AS $$
BEGIN
	IF OLD.is_banned IS DISTINCT FROM NEW.is_banned THEN
		NEW.ban_updated_at := timezone('utc'::text, now());
	END IF;
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.profiles_search_trigger()
RETURNS trigger AS $$
BEGIN
	NEW.search_vector :=
		setweight(to_tsvector('english', COALESCE(NEW.username, '')), 'A') ||
		setweight(to_tsvector('english', COALESCE(NEW.display_name, '')), 'B') ||
		setweight(to_tsvector('english', COALESCE(NEW.email, '')), 'C') ||
		setweight(to_tsvector('english', COALESCE(NEW.xbox_gamertag, '')), 'D');
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.sync_team_ban_fields()
RETURNS trigger AS $$
BEGIN
	IF NEW.status = 'banned' THEN
		NEW.is_banned := true;
	ELSIF NEW.status = 'active' THEN
		NEW.is_banned := false;
	END IF;
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.sync_event_date_fields()
RETURNS trigger AS $$
BEGIN
	IF NEW.start_date IS NULL AND NEW.date IS NOT NULL THEN
		NEW.start_date := NEW.date;
	END IF;
	IF NEW.date IS NULL AND NEW.start_date IS NOT NULL THEN
		NEW.date := NEW.start_date;
	END IF;
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------
-- Core tables
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS public.profiles (
	id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
	full_name text,
	display_name text,
	username text,
	avatar_url text,
	email text UNIQUE,
	discord_id text UNIQUE,
	xbox_gamertag text,
	xbox_linked boolean NOT NULL DEFAULT false,
	is_banned boolean NOT NULL DEFAULT false,
	ban_updated_at timestamptz,
	search_vector tsvector,
	registered_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
	created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
	updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.admin_roles (
	user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
	role text NOT NULL DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin', 'moderator')),
	created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
	updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.teams (
	id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	name text NOT NULL,
	logo_url text,
	captain_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
	status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'banned')),
	is_banned boolean NOT NULL DEFAULT false,
	created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
	updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.team_members (
	id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
	user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
	gamertag text NOT NULL,
	discord_id text,
	role text NOT NULL DEFAULT 'member' CHECK (role IN ('captain', 'member')),
	joined_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
	created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
	updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
	UNIQUE(team_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.team_invitations (
	id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
	invited_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
	discord_id text NOT NULL,
	status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
	created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
	updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.events (
	id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	title text NOT NULL,
	description text,
	date timestamptz,
	start_date timestamptz,
	end_date timestamptz,
	location text,
	type text,
	prize text,
	prize_pool text,
	max_teams integer NOT NULL DEFAULT 16 CHECK (max_teams > 1),
	rules text,
	banner_url text,
	created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
	status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'upcoming', 'ongoing', 'completed', 'cancelled')),
	created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
	updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.matches (
	id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
	round_name text,
	team_a_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
	team_b_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
	winner_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
	score_a integer NOT NULL DEFAULT 0 CHECK (score_a >= 0),
	score_b integer NOT NULL DEFAULT 0 CHECK (score_b >= 0),
	status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'completed', 'cancelled')),
	start_time timestamptz,
	created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
	updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.reports (
	id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	reporter_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
	reported_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
	reported_team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
	reason text NOT NULL,
	status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'resolved', 'rejected')),
	resolution_notes text,
	resolved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
	created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
	updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.admin_logs (
	id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	admin_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
	action text NOT NULL,
	target_type text NOT NULL,
	target_id uuid,
	details jsonb NOT NULL DEFAULT '{}'::jsonb,
	created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.system_settings (
	key text PRIMARY KEY,
	value jsonb NOT NULL,
	description text,
	updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
	created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
	updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE OR REPLACE FUNCTION public.is_admin_user(p_user_id uuid)
RETURNS boolean AS $$
BEGIN
	RETURN EXISTS (
		SELECT 1
		FROM public.admin_roles ar
		WHERE ar.user_id = p_user_id
			AND ar.role IN ('super_admin', 'admin', 'moderator')
	);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------
-- Indexes
-- -----------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_profiles_discord_id ON public.profiles(discord_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_xbox_linked ON public.profiles(xbox_linked);
CREATE INDEX IF NOT EXISTS idx_profiles_ban_status ON public.profiles(id, is_banned, ban_updated_at);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_search ON public.profiles USING GIN(search_vector);

CREATE INDEX IF NOT EXISTS idx_admin_roles_role ON public.admin_roles(role);

CREATE INDEX IF NOT EXISTS idx_teams_captain_id ON public.teams(captain_id);
CREATE INDEX IF NOT EXISTS idx_teams_status ON public.teams(status);
CREATE INDEX IF NOT EXISTS idx_teams_created_at ON public.teams(created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_teams_name_active_ci
	ON public.teams ((lower(name)))
	WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON public.team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_discord_id ON public.team_members(discord_id);

CREATE INDEX IF NOT EXISTS idx_team_invitations_discord ON public.team_invitations(discord_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_status ON public.team_invitations(status);
CREATE INDEX IF NOT EXISTS idx_team_invitations_team ON public.team_invitations(team_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_team_invitation_pending
	ON public.team_invitations(team_id, discord_id)
	WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_events_status ON public.events(status);
CREATE INDEX IF NOT EXISTS idx_events_start_date ON public.events(start_date);
CREATE INDEX IF NOT EXISTS idx_events_date ON public.events(date);

CREATE INDEX IF NOT EXISTS idx_matches_event_id ON public.matches(event_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON public.matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_start_time ON public.matches(start_time);

CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON public.reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON public.reports(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id ON public.admin_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_action ON public.admin_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON public.admin_logs(created_at DESC);

-- -----------------------------------------------------
-- Triggers
-- -----------------------------------------------------

DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
CREATE TRIGGER profiles_set_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS profiles_ban_update ON public.profiles;
CREATE TRIGGER profiles_ban_update
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_ban_timestamp();

DROP TRIGGER IF EXISTS profiles_search_update ON public.profiles;
CREATE TRIGGER profiles_search_update
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.profiles_search_trigger();

DROP TRIGGER IF EXISTS admin_roles_set_updated_at ON public.admin_roles;
CREATE TRIGGER admin_roles_set_updated_at
BEFORE UPDATE ON public.admin_roles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS teams_set_updated_at ON public.teams;
CREATE TRIGGER teams_set_updated_at
BEFORE UPDATE ON public.teams
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS teams_sync_ban_fields ON public.teams;
CREATE TRIGGER teams_sync_ban_fields
BEFORE INSERT OR UPDATE ON public.teams
FOR EACH ROW EXECUTE FUNCTION public.sync_team_ban_fields();

DROP TRIGGER IF EXISTS team_members_set_updated_at ON public.team_members;
CREATE TRIGGER team_members_set_updated_at
BEFORE UPDATE ON public.team_members
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS team_invitations_set_updated_at ON public.team_invitations;
CREATE TRIGGER team_invitations_set_updated_at
BEFORE UPDATE ON public.team_invitations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS events_set_updated_at ON public.events;
CREATE TRIGGER events_set_updated_at
BEFORE UPDATE ON public.events
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS events_sync_date_fields ON public.events;
CREATE TRIGGER events_sync_date_fields
BEFORE INSERT OR UPDATE ON public.events
FOR EACH ROW EXECUTE FUNCTION public.sync_event_date_fields();

DROP TRIGGER IF EXISTS matches_set_updated_at ON public.matches;
CREATE TRIGGER matches_set_updated_at
BEFORE UPDATE ON public.matches
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS reports_set_updated_at ON public.reports;
CREATE TRIGGER reports_set_updated_at
BEFORE UPDATE ON public.reports
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS system_settings_set_updated_at ON public.system_settings;
CREATE TRIGGER system_settings_set_updated_at
BEFORE UPDATE ON public.system_settings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------
-- Auth profile bootstrap
-- -----------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
	INSERT INTO public.profiles (
		id,
		full_name,
		display_name,
		username,
		email,
		avatar_url,
		discord_id,
		registered_at,
		created_at,
		updated_at
	)
	VALUES (
		NEW.id,
		NEW.raw_user_meta_data->>'full_name',
		COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
		COALESCE(NEW.raw_user_meta_data->>'preferred_username', NEW.raw_user_meta_data->>'name'),
		NEW.email,
		NEW.raw_user_meta_data->>'avatar_url',
		COALESCE(NEW.raw_user_meta_data->>'provider_id', NEW.raw_user_meta_data->>'sub'),
		timezone('utc'::text, now()),
		timezone('utc'::text, now()),
		timezone('utc'::text, now())
	)
	ON CONFLICT (id) DO NOTHING;

	RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- -----------------------------------------------------
-- Transactional team creation function (critical fix)
-- -----------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_team_with_captain(
	p_team_name text,
	p_captain_id uuid,
	p_logo_url text,
	p_gamertag text,
	p_discord_id text
)
RETURNS TABLE(
	team_id uuid,
	team_name text,
	team_logo_url text,
	created_at timestamptz
) AS $$
DECLARE
	v_team_id uuid;
	v_created_at timestamptz;
	v_profile_banned boolean;
BEGIN
	SELECT is_banned INTO v_profile_banned
	FROM public.profiles
	WHERE id = p_captain_id;

	IF NOT FOUND THEN
		RAISE EXCEPTION 'Usuario nao encontrado';
	END IF;

	IF v_profile_banned THEN
		RAISE EXCEPTION 'Usuario banido nao pode criar equipes';
	END IF;

	IF EXISTS (
		SELECT 1
		FROM public.teams t
		WHERE lower(t.name) = lower(p_team_name)
			AND t.status = 'active'
	) THEN
		RAISE EXCEPTION 'Ja existe uma equipe com este nome';
	END IF;

	IF EXISTS (
		SELECT 1
		FROM public.team_members tm
		JOIN public.teams t ON t.id = tm.team_id
		WHERE lower(tm.gamertag) = lower(p_gamertag)
			AND t.status = 'active'
	) THEN
		RAISE EXCEPTION 'Este gamertag ja esta em uso em outra equipe';
	END IF;

	INSERT INTO public.teams (
		name,
		logo_url,
		captain_id,
		status,
		is_banned,
		created_at,
		updated_at
	)
	VALUES (
		p_team_name,
		p_logo_url,
		p_captain_id,
		'active',
		false,
		timezone('utc'::text, now()),
		timezone('utc'::text, now())
	)
	RETURNING id, created_at INTO v_team_id, v_created_at;

	INSERT INTO public.team_members (
		team_id,
		user_id,
		gamertag,
		discord_id,
		role,
		joined_at,
		created_at,
		updated_at
	)
	VALUES (
		v_team_id,
		p_captain_id,
		p_gamertag,
		p_discord_id,
		'captain',
		timezone('utc'::text, now()),
		timezone('utc'::text, now()),
		timezone('utc'::text, now())
	);

	INSERT INTO public.admin_logs (
		admin_id,
		action,
		target_type,
		target_id,
		details,
		created_at
	) VALUES (
		p_captain_id,
		'team_created',
		'team',
		v_team_id,
		jsonb_build_object(
			'team_name', p_team_name,
			'captain_id', p_captain_id,
			'captain_gamertag', p_gamertag
		),
		timezone('utc'::text, now())
	);

	RETURN QUERY
	SELECT v_team_id, p_team_name, p_logo_url, v_created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION public.create_team_with_captain(text, uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_team_with_captain(text, uuid, text, text, text) TO authenticated;

COMMENT ON FUNCTION public.create_team_with_captain(text, uuid, text, text, text) IS
'Creates team and captain member atomically with validation for bans, team name, and gamertag uniqueness.';

COMMENT ON COLUMN public.profiles.search_vector IS
'Full-text search vector for profile search performance.';

-- -----------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;
CREATE POLICY "profiles_select_own_or_admin"
ON public.profiles FOR SELECT
USING (auth.uid() = id OR public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "profiles_update_own_or_admin" ON public.profiles;
CREATE POLICY "profiles_update_own_or_admin"
ON public.profiles FOR UPDATE
USING (auth.uid() = id OR public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "admin_roles_select_own_or_admin" ON public.admin_roles;
CREATE POLICY "admin_roles_select_own_or_admin"
ON public.admin_roles FOR SELECT
USING (auth.uid() = user_id OR public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "teams_select_all" ON public.teams;
CREATE POLICY "teams_select_all"
ON public.teams FOR SELECT
USING (true);

DROP POLICY IF EXISTS "teams_insert_captain" ON public.teams;
CREATE POLICY "teams_insert_captain"
ON public.teams FOR INSERT
WITH CHECK (auth.uid() = captain_id);

DROP POLICY IF EXISTS "teams_update_captain_or_admin" ON public.teams;
CREATE POLICY "teams_update_captain_or_admin"
ON public.teams FOR UPDATE
USING (auth.uid() = captain_id OR public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "teams_delete_captain_or_admin" ON public.teams;
CREATE POLICY "teams_delete_captain_or_admin"
ON public.teams FOR DELETE
USING (auth.uid() = captain_id OR public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "team_members_select_all" ON public.team_members;
CREATE POLICY "team_members_select_all"
ON public.team_members FOR SELECT
USING (true);

DROP POLICY IF EXISTS "team_members_insert_captain_or_admin" ON public.team_members;
CREATE POLICY "team_members_insert_captain_or_admin"
ON public.team_members FOR INSERT
WITH CHECK (
	public.is_admin_user(auth.uid())
	OR EXISTS (
		SELECT 1 FROM public.teams t
		WHERE t.id = team_id
			AND t.captain_id = auth.uid()
	)
);

DROP POLICY IF EXISTS "team_members_update_captain_or_admin" ON public.team_members;
CREATE POLICY "team_members_update_captain_or_admin"
ON public.team_members FOR UPDATE
USING (
	public.is_admin_user(auth.uid())
	OR EXISTS (
		SELECT 1 FROM public.teams t
		WHERE t.id = team_id
			AND t.captain_id = auth.uid()
	)
);

DROP POLICY IF EXISTS "team_members_delete_self_or_captain_or_admin" ON public.team_members;
CREATE POLICY "team_members_delete_self_or_captain_or_admin"
ON public.team_members FOR DELETE
USING (
	auth.uid() = user_id
	OR public.is_admin_user(auth.uid())
	OR EXISTS (
		SELECT 1 FROM public.teams t
		WHERE t.id = team_id
			AND t.captain_id = auth.uid()
	)
);

DROP POLICY IF EXISTS "team_invitations_select_own_or_captain_or_admin" ON public.team_invitations;
CREATE POLICY "team_invitations_select_own_or_captain_or_admin"
ON public.team_invitations FOR SELECT
USING (
	public.is_admin_user(auth.uid())
	OR discord_id = (SELECT p.discord_id FROM public.profiles p WHERE p.id = auth.uid())
	OR EXISTS (
		SELECT 1 FROM public.teams t
		WHERE t.id = team_id
			AND t.captain_id = auth.uid()
	)
);

DROP POLICY IF EXISTS "team_invitations_insert_captain_or_admin" ON public.team_invitations;
CREATE POLICY "team_invitations_insert_captain_or_admin"
ON public.team_invitations FOR INSERT
WITH CHECK (
	public.is_admin_user(auth.uid())
	OR EXISTS (
		SELECT 1 FROM public.teams t
		WHERE t.id = team_id
			AND t.captain_id = auth.uid()
	)
);

DROP POLICY IF EXISTS "team_invitations_update_target_or_admin" ON public.team_invitations;
CREATE POLICY "team_invitations_update_target_or_admin"
ON public.team_invitations FOR UPDATE
USING (
	public.is_admin_user(auth.uid())
	OR discord_id = (SELECT p.discord_id FROM public.profiles p WHERE p.id = auth.uid())
);

DROP POLICY IF EXISTS "team_invitations_delete_captain_or_admin" ON public.team_invitations;
CREATE POLICY "team_invitations_delete_captain_or_admin"
ON public.team_invitations FOR DELETE
USING (
	public.is_admin_user(auth.uid())
	OR EXISTS (
		SELECT 1 FROM public.teams t
		WHERE t.id = team_id
			AND t.captain_id = auth.uid()
	)
);

DROP POLICY IF EXISTS "events_select_all" ON public.events;
CREATE POLICY "events_select_all"
ON public.events FOR SELECT
USING (true);

DROP POLICY IF EXISTS "matches_select_all" ON public.matches;
CREATE POLICY "matches_select_all"
ON public.matches FOR SELECT
USING (true);

DROP POLICY IF EXISTS "reports_insert_own" ON public.reports;
CREATE POLICY "reports_insert_own"
ON public.reports FOR INSERT
WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "reports_select_own_or_admin" ON public.reports;
CREATE POLICY "reports_select_own_or_admin"
ON public.reports FOR SELECT
USING (auth.uid() = reporter_id OR public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "admin_logs_select_admin_only" ON public.admin_logs;
CREATE POLICY "admin_logs_select_admin_only"
ON public.admin_logs FOR SELECT
USING (public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "system_settings_select_all" ON public.system_settings;
CREATE POLICY "system_settings_select_all"
ON public.system_settings FOR SELECT
USING (true);

-- Keep one basic default setting to avoid empty settings page in fresh DB.
INSERT INTO public.system_settings (key, value, description)
VALUES ('maintenance_mode', '{"enabled": false}', 'Global maintenance mode')
ON CONFLICT (key) DO NOTHING;
