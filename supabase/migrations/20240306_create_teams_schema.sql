-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- TEAMS TABLE
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) NOT NULL UNIQUE,
  ship_name VARCHAR(50) NOT NULL UNIQUE,
  captain_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'banned')),
  is_banned BOOLEAN DEFAULT FALSE,
  logo_url TEXT
);

-- TEAM MEMBERS TABLE
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  discord_id VARCHAR(50),
  gamertag VARCHAR(50) NOT NULL,
  role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('captain', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_id, user_id),
  UNIQUE(team_id, gamertag)
);

-- TEAM INVITATIONS TABLE
CREATE TABLE IF NOT EXISTS team_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  invited_user_id UUID REFERENCES auth.users(id), -- Can be null if inviting by external ID initially
  discord_id VARCHAR(50), -- To invite by Discord ID
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days')
);

-- TEAM AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS team_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id),
  action VARCHAR(50) NOT NULL,
  old_data JSONB,
  new_data JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_teams_captain_id ON teams(captain_id);
CREATE INDEX IF NOT EXISTS idx_teams_name ON teams(name);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_team_id ON team_invitations(team_id);

-- RLS POLICIES

-- Enable RLS
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_audit_logs ENABLE ROW LEVEL SECURITY;

-- TEAMS POLICIES
CREATE POLICY "Teams are viewable by everyone" 
  ON teams FOR SELECT 
  USING (true);

CREATE POLICY "Authenticated users can create teams" 
  ON teams FOR INSERT 
  WITH CHECK (auth.uid() = captain_id);

CREATE POLICY "Captains can update their own team" 
  ON teams FOR UPDATE 
  USING (auth.uid() = captain_id);

CREATE POLICY "Captains can delete their own team" 
  ON teams FOR DELETE 
  USING (auth.uid() = captain_id);

-- TEAM MEMBERS POLICIES
CREATE POLICY "Team members are viewable by everyone" 
  ON team_members FOR SELECT 
  USING (true);

CREATE POLICY "Captains can manage members" 
  ON team_members FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM teams 
      WHERE teams.id = team_members.team_id 
      AND teams.captain_id = auth.uid()
    )
  );

CREATE POLICY "Users can leave teams (delete self)" 
  ON team_members FOR DELETE 
  USING (auth.uid() = user_id);

-- TEAM INVITATIONS POLICIES
CREATE POLICY "Team members can view invitations" 
  ON team_invitations FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_members.team_id = team_invitations.team_id 
      AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Captains can create invitations" 
  ON team_invitations FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teams 
      WHERE teams.id = team_invitations.team_id 
      AND teams.captain_id = auth.uid()
    )
  );

-- AUDIT LOGS POLICIES
-- Only admins (service role) or specific logic should access this usually, 
-- but for now we'll allow captains to see logs of their own team
CREATE POLICY "Captains can view audit logs" 
  ON team_audit_logs FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM teams 
      WHERE teams.id = team_audit_logs.team_id 
      AND teams.captain_id = auth.uid()
    )
  );

-- FUNCTIONS AND TRIGGERS

-- Function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_teams_updated_at
    BEFORE UPDATE ON teams
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to check member limit before insert
CREATE OR REPLACE FUNCTION check_team_member_limit()
RETURNS TRIGGER AS $$
DECLARE
    member_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO member_count FROM team_members WHERE team_id = NEW.team_id;
    IF member_count >= 4 THEN
        RAISE EXCEPTION 'Team is full (max 4 members)';
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER check_member_limit_trigger
    BEFORE INSERT ON team_members
    FOR EACH ROW
    EXECUTE FUNCTION check_team_member_limit();

-- Function to ensure user is in only one team
CREATE OR REPLACE FUNCTION check_user_single_team()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM team_members WHERE user_id = NEW.user_id) THEN
        RAISE EXCEPTION 'User is already in a team';
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER check_user_single_team_trigger
    BEFORE INSERT ON team_members
    FOR EACH ROW
    EXECUTE FUNCTION check_user_single_team();

-- Function to log audit events
CREATE OR REPLACE FUNCTION log_team_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'UPDATE') THEN
        INSERT INTO team_audit_logs (team_id, user_id, action, old_data, new_data)
        VALUES (NEW.id, auth.uid(), 'UPDATE', row_to_json(OLD), row_to_json(NEW));
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO team_audit_logs (team_id, user_id, action, old_data)
        VALUES (OLD.id, auth.uid(), 'DELETE', row_to_json(OLD));
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER log_team_changes_trigger
    AFTER UPDATE OR DELETE ON teams
    FOR EACH ROW
    EXECUTE FUNCTION log_team_changes();
