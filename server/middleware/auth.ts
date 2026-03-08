import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../lib/supabase';

// Extend Express Request to include user
declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      id: string;
      username: string;
      avatar: string;
      email: string;
      isAdmin?: boolean;
    };
  }
}

/**
 * Middleware de Autenticação
 * Segurança: Verifica se o token de sessão (cookie HttpOnly) é válido no Backend.
 * Previne que rotas protegidas sejam acessadas sem autenticação real.
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

    // Check admin status
    let isAdminUser = false;
    const adminId = process.env.NEXT_PUBLIC_ADMIN_DISCORD_ID || process.env.VITE_ADMIN_DISCORD_ID;
    
    if (adminId) {
      const discordId = user.user_metadata?.provider_id || user.user_metadata?.sub;
      if (discordId === adminId) {
        isAdminUser = true;
      }
    }

    if (!isAdminUser) {
      const { data: roleData } = await supabaseAdmin
        .from('admin_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      
      if (roleData && ['super_admin', 'admin', 'moderator'].includes(roleData.role)) {
        isAdminUser = true;
      }
    }

    req.user = {
      id: user.id,
      username: user.user_metadata?.preferred_username || user.user_metadata?.name || '',
      avatar: user.user_metadata?.avatar_url || '',
      email: user.email || '',
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
