-- ==============================================================
-- SISTEMA DE NOTIFICAÇÕES - MADNESS ARENA
-- Execute este script no SQL Editor do Supabase
-- ==============================================================

-- 1. Criar Tabela de Notificações
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'team_invite', 'join_request', 'system', 'match_update'
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}'::jsonb,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Criar Index para buscas mais rápidas
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);

-- 3. Habilitar Realtime (Para o Sino atualizar instantaneamente)
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- 4. Criar Políticas RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver suas próprias notificações"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas próprias notificações (marcar como lido)"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar suas próprias notificações"
ON public.notifications FOR DELETE
USING (auth.uid() = user_id);

-- Opcional: Apenas admins/sistema podem criar notificações
CREATE POLICY "Admins/Sistema podem inserir notificações"
ON public.notifications FOR INSERT
WITH CHECK (true); -- Normalmente, inserções virão do Supabase Server Client, que ignora RLS.

