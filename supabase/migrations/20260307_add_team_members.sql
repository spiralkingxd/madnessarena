-- Team Members Table
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  gamertag TEXT,
  discord_id TEXT,
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  UNIQUE(team_id, user_id)
);

-- Team Invitations Table
CREATE TABLE IF NOT EXISTS public.team_invitations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  invited_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  discord_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for team_members
CREATE POLICY "Qualquer um pode ler membros de equipes" ON public.team_members FOR SELECT USING (true);
CREATE POLICY "Capitão pode gerenciar membros" ON public.team_members FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.teams
    WHERE id = team_id AND captain_id = auth.uid()
  )
);
CREATE POLICY "Usuários podem sair da equipe" ON public.team_members FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for team_invitations
CREATE POLICY "Usuários podem ver seus convites" ON public.team_invitations FOR SELECT USING (
  discord_id = (SELECT discord_id FROM public.profiles WHERE id = auth.uid())
);
CREATE POLICY "Capitão pode criar convites" ON public.team_invitations FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.teams
    WHERE id = team_id AND captain_id = auth.uid()
  )
);
CREATE POLICY "Capitão pode ver convites da sua equipe" ON public.team_invitations FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.teams
    WHERE id = team_id AND captain_id = auth.uid()
  )
);
CREATE POLICY "Capitão pode deletar convites" ON public.team_invitations FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.teams
    WHERE id = team_id AND captain_id = auth.uid()
  )
);
