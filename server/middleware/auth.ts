import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import NodeCache from 'node-cache';

// Cache para status de ban (TTL: 60 segundos)
const banCache = new NodeCache({ stdTTL: 60, checkperiod: 120 });

// Cache para status de admin (TTL: 300 segundos)
const adminCache = new NodeCache({ stdTTL: 300, checkperiod: 600 });

// Extend Express Request to include user
declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      id: string;
      username: string;
      avatar: string;
      email: string;
      discordId?: string;
      isAdmin?: boolean;
    };
  }
}

/**
 * Helper: Extrair Discord ID dos metadados do usuário
 */
function extractDiscordId(user: any): string {
  return user.user_metadata?.provider_id || user.user_metadata?.sub || '';
}

/**
 * Helper: Verificar se usuário está banido (com cache)
 */
async function checkBanStatus(userId: string): Promise<boolean> {
  // Tentar buscar do cache primeiro
  const cached = banCache.get<boolean>(`ban:${userId}`);
  if (cached !== undefined) {
    return cached;
  }

  // Cache miss: buscar do banco
  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('is_banned')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Erro ao verificar ban:', error);
    // Em caso de erro, assumir não banido para não bloquear usuários legítimos
    return false;
  }

  const isBanned = profile?.is_banned || false;
  banCache.set(`ban:${userId}`, isBanned);
  return isBanned;
}

/**
 * Helper: Verificar se usuário é admin (com cache)
 */
async function checkAdminStatus(userId: string, discordId: string): Promise<boolean> {
  // Tentar buscar do cache
  const cached = adminCache.get<boolean>(`admin:${userId}`);
  if (cached !== undefined) {
    return cached;
  }

  let isAdminUser = false;

  // Camada 1: Verificar variável de ambiente (super admin)
  const envAdminId = process.env.NEXT_PUBLIC_ADMIN_DISCORD_ID || process.env.VITE_ADMIN_DISCORD_ID;
  if (envAdminId && discordId === envAdminId) {
    isAdminUser = true;
  }

  // Camada 2: Verificar banco de dados (se não for super admin)
  if (!isAdminUser) {
    const { data: roleData } = await supabaseAdmin
      .from('admin_roles')
      .select('role')
      .eq('user_id', userId)
      .single();

    if (roleData && ['super_admin', 'admin', 'moderator'].includes(roleData.role)) {
      isAdminUser = true;
    }
  }

  adminCache.set(`admin:${userId}`, isAdminUser);
  return isAdminUser;
}

/**
 * Middleware de Autenticação
 * CORREÇÃO #5: Adiciona verificação de ban status
 * CORREÇÃO #25: Otimiza queries de admin com cache
 * 
 * Segurança: 
 * - Verifica se o token JWT é válido
 * - Valida se usuário não está banido
 * - Cacheia verificações para melhor performance
 */
export const isAuthenticated = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Não autorizado. Token ausente.' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Não autorizado. Token inválido.' });
    }

    // CORREÇÃO #5: Verificar se usuário está banido
    const isBanned = await checkBanStatus(user.id);
    if (isBanned) {
      // Log tentativa de acesso de usuário banido
      await supabaseAdmin.from('admin_logs').insert({
        action: 'banned_user_access_attempt',
        target_type: 'user',
        target_id: user.id,
        details: {
          ip: req.ip,
          user_agent: req.headers['user-agent'],
          endpoint: req.originalUrl,
          method: req.method,
          timestamp: new Date().toISOString()
        }
      }).catch(err => console.error('Erro ao logar acesso de banido:', err));

      return res.status(403).json({
        error: 'Acesso negado. Usuário banido.',
        banned: true
      });
    }

    // Extrair Discord ID
    const discordId = extractDiscordId(user);

    // Buscar dados do perfil para ter username atualizado
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('username, display_name, avatar_url')
      .eq('id', user.id)
      .single();

    // CORREÇÃO #25: Verificar admin status com cache
    const isAdminUser = await checkAdminStatus(user.id, discordId);

    req.user = {
      id: user.id,
      username: profile?.username || profile?.display_name || user.user_metadata?.preferred_username || '',
      avatar: profile?.avatar_url || user.user_metadata?.avatar_url || '',
      email: user.email || '',
      discordId: discordId,
      isAdmin: isAdminUser,
    };

    return next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Erro interno de autenticação.' });
  }
};

/**
 * Middleware de Autorização Admin
 * Segurança: A verificação do Admin ID ocorre no servidor, não apenas ocultando
 * botões no Frontend. O ID do Admin deve vir de uma variável de ambiente ou do banco de dados.
 */
export const isAdmin = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Não autorizado.' });
  }

  if (req.user.isAdmin) {
    return next();
  }

  // Segurança: Retorna 403 Forbidden. O usuário está logado, mas não tem permissão.
  return res.status(403).json({ error: 'Acesso negado. Privilégios insuficientes.' });
};

/**
 * Função para invalidar cache de ban (chamar ao banir/desbanir)
 */
export function invalidateBanCache(userId: string) {
  banCache.del(`ban:${userId}`);
}

/**
 * Função para invalidar cache de admin (chamar ao alterar roles)
 */
export function invalidateAdminCache(userId: string) {
  adminCache.del(`admin:${userId}`);
}
