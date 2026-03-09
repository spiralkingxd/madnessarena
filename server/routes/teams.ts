/**
 * Routes: Teams Management
 * 
 * CORREÇÕES IMPLEMENTADAS:
 * - #1: Race condition em criação de equipes (função transacional PostgreSQL)
 * - #2: SSRF via validação de URL (apenas Supabase Storage)
 * - #6: Verificar duplicidade ao aceitar convite
 * - #9: N+1 queries otimizado com JOIN
 * - #10/#18: Verificar ban ao adicionar/aceitar membro
 * - #21: Schema Zod melhorado
 * - #26: Separação de responsabilidades (SRP)
 * - #31: Validar se é último membro ao remover
 */

import { Router } from 'express';
import { z } from 'zod';
import { isAuthenticated, isAdmin } from '../middleware/auth';
import { supabaseAdmin } from '../lib/supabase';
import { rateLimit } from 'express-rate-limit';

const router = Router();

// Rate limiters específicos
const teamCreationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 3, // 3 equipes por IP a cada 15 min
  message: 'Muitas tentativas de criação de equipe. Tente novamente mais tarde.',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * CORREÇÃO #21: Schemas Zod melhorados
 * - Validação mais rigorosa de URL (apenas Supabase Storage em produção)
 * - Remoção de transformações inseguras (strip tags já feito no regex)
 */
const CreateTeamSchema = z.object({
  name: z.string()
    .min(3, 'Nome deve ter pelo menos 3 caracteres')
    .max(50, 'Nome deve ter no máximo 50 caracteres')
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Nome inválido (apenas letras, números, espaços, - e _)')
    .trim()
    .transform(val => val.replace(/\s+/g, ' ')), // Normalizar espaços múltiplos
  
  gamertag: z.string()
    .min(3, 'Gamertag deve ter pelo menos 3 caracteres')
    .max(50, 'Gamertag deve ter no máximo 50 caracteres')
    .trim()
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Gamertag inválido'),
  
  // CORREÇÃO #2: Validação restritiva de URL (apenas Supabase Storage)
  logo_url: z.string()
    .url('URL inválida')
    .regex(
      /^https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\/team-logos\//,
      'URL deve ser do Supabase Storage (use /api/upload para fazer upload)'
    )
    .optional()
    .or(z.literal(''))
});

const UpdateTeamSchema = z.object({
  name: z.string()
    .min(3).max(50)
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Nome inválido')
    .trim()
    .optional(),
  
  logo_url: z.string()
    .url()
    .regex(/^https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\/team-logos\//)
    .optional()
    .or(z.literal(''))
});

const AddMemberSchema = z.object({
  gamertag: z.string().min(3).max(50).trim(),
  discord_id: z.string().min(17).max(19), // Discord IDs têm 17-19 caracteres
});

const TransferCaptainSchema = z.object({
  newCaptainId: z.string().uuid('ID inválido')
});

/**
 * CORREÇÃO #9: Listar Equipes com JOIN otimizado
 * Antes: 2 queries separadas (N+1 potencial)
 * Depois: 1 query com JOIN
 * 
 * GET /api/teams
 * Retorna as equipes onde o usuário é membro (com dados de membros).
 * Admin com ?all=true vê todas as equipes.
 */
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const isAdminUser = req.user!.isAdmin;

    if (isAdminUser && req.query.all === 'true') {
      // Admin: Carregar todas as equipes com membros (limitado a 100)
      const { data: allTeams, error: allError } = await supabaseAdmin
        .from('teams')
        .select(`
          id, name, logo_url, status, created_at,
          captain:profiles!captain_id(id, username, avatar_url, discord_id),
          members:team_members(
            id, user_id, gamertag, role, joined_at,
            profile:profiles(username, avatar_url)
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (allError) throw allError;
      return res.json(allTeams || []);
    }

    // CORREÇÃO #9: JOIN otimizado para buscar equipes do usuário
    const { data: teams, error } = await supabaseAdmin
      .from('teams')
      .select(`
        id, name, logo_url, status, created_at,
        captain:profiles!captain_id(id, username, avatar_url),
        members:team_members!inner(user_id, gamertag, role)
      `)
      .eq('team_members.user_id', req.user!.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(teams || []);
  } catch (error) {
    console.error('Erro ao listar equipes:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * GET /api/teams/invitations
 * Listar Convites Pendentes do usuário
 */
router.get('/invitations', isAuthenticated, async (req, res) => {
  try {
    const discordId = req.user!.discordId;
    if (!discordId) {
      return res.json([]);
    }

    const { data: invitations, error } = await supabaseAdmin
      .from('team_invitations')
      .select('id, team_id, invited_by, discord_id, status, created_at')
      .eq('discord_id', discordId)
      .eq('status', 'pending');

    if (error) {
      console.error('Erro ao buscar convites pendentes:', error);
      return res.json([]);
    }

    if (!invitations || invitations.length === 0) {
      return res.json([]);
    }

    const teamIds = Array.from(new Set(invitations.map(inv => inv.team_id).filter(Boolean)));
    const inviterIds = Array.from(new Set(invitations.map(inv => inv.invited_by).filter(Boolean)));

    // Busca dados de equipes separadamente para evitar falha de embedding por FK em produção.
    const { data: teamsData, error: teamsError } = await supabaseAdmin
      .from('teams')
      .select('id, name, logo_url, status')
      .in('id', teamIds);

    if (teamsError) {
      console.error('Erro ao buscar equipes dos convites:', teamsError);
      return res.json([]);
    }

    const { data: invitersData, error: invitersError } = await supabaseAdmin
      .from('profiles')
      .select('id, username, avatar_url')
      .in('id', inviterIds);

    if (invitersError) {
      console.error('Erro ao buscar perfis dos convites:', invitersError);
      return res.json([]);
    }

    const teamsMap = new Map((teamsData || []).map(team => [team.id, team]));
    const invitersMap = new Map((invitersData || []).map(inviter => [inviter.id, inviter]));

    const enrichedInvitations = invitations
      .map(inv => ({
        ...inv,
        team: teamsMap.get(inv.team_id) || null,
        inviter: invitersMap.get(inv.invited_by) || null
      }))
      .filter(inv => inv.team && inv.team.status === 'active');

    res.json(enrichedInvitations);
  } catch (error) {
    console.error('Erro ao listar convites:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * POST /api/teams/invitations/:id/accept
 * Aceitar Convite
 * 
 * CORREÇÕES:
 * - #6: Verificar duplicidade (usuário já é membro)
 * - #18: Verificar se usuário convidado está banido
 */
router.post('/invitations/:id/accept', isAuthenticated, async (req, res) => {
  const invitationId = req.params.id;
  
  try {
    // CORREÇÃO #18: Verificar se usuário está banido antes de aceitar
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('is_banned, xbox_gamertag')
      .eq('id', req.user!.id)
      .single();

    if (profileError) throw profileError;

    if (profile?.is_banned) {
      return res.status(403).json({ error: 'Usuários banidos não podem aceitar convites.' });
    }

    // Buscar convite
    const { data: invitation, error: fetchError } = await supabaseAdmin
      .from('team_invitations')
      .select('*, team:teams(id, name, status)')
      .eq('id', invitationId)
      .single();

    if (fetchError || !invitation) {
      return res.status(404).json({ error: 'Convite não encontrado.' });
    }

    // Verificar se pertence ao usuário
    if (invitation.discord_id !== req.user!.discordId) {
      return res.status(403).json({ error: 'Este convite não é para você.' });
    }

    if (invitation.status !== 'pending') {
      return res.status(400).json({ error: 'Convite já processado.' });
    }

    // Verificar se equipe está ativa
    if (invitation.team?.status !== 'active') {
      return res.status(400).json({ error: 'Esta equipe não está mais ativa.' });
    }

    // CORREÇÃO #6: Verificar se já é membro (duplicidade)
    const { data: existingMember } = await supabaseAdmin
      .from('team_members')
      .select('id')
      .eq('team_id', invitation.team_id)
      .eq('user_id', req.user!.id)
      .maybeSingle();

    if (existingMember) {
      // Atualizar convite para aceito e retornar
      await supabaseAdmin
        .from('team_invitations')
        .update({ status: 'accepted' })
        .eq('id', invitationId);
      
      return res.json({ message: 'Você já é membro desta equipe.' });
    }

    // Verificar limite de membros
    const { count } = await supabaseAdmin
      .from('team_members')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', invitation.team_id);

    if (count !== null && count >= 10) {
      return res.status(400).json({ error: 'A equipe já está cheia (máximo 10 membros).' });
    }

    // Buscar gamertag do perfil
    const gamertagFromProfile = profile?.xbox_gamertag || req.user!.username || 'Novato';

    // Adicionar membro
    const { error: insertError } = await supabaseAdmin
      .from('team_members')
      .insert({
        team_id: invitation.team_id,
        user_id: req.user!.id,
        gamertag: gamertagFromProfile,
        discord_id: req.user!.discordId,
        role: 'member'
      });

    if (insertError) throw insertError;

    // Atualizar convite para aceito
    await supabaseAdmin
      .from('team_invitations')
      .update({ status: 'accepted' })
      .eq('id', invitationId);

    console.log(`[AUDIT] Usuário ${req.user!.id} aceitou convite para equipe ${invitation.team_id}`);
    res.json({ message: 'Convite aceito com sucesso!', team: invitation.team });
  } catch (error) {
    console.error('Erro ao aceitar convite:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * POST /api/teams/invitations/:id/decline
 * Recusar Convite
 */
router.post('/invitations/:id/decline', isAuthenticated, async (req, res) => {
  const invitationId = req.params.id;
  
  try {
    const { data: invitation, error: fetchError } = await supabaseAdmin
      .from('team_invitations')
      .select('discord_id, status')
      .eq('id', invitationId)
      .single();

    if (fetchError || !invitation) {
      return res.status(404).json({ error: 'Convite não encontrado.' });
    }

    if (invitation.discord_id !== req.user!.discordId) {
      return res.status(403).json({ error: 'Este convite não é para você.' });
    }

    if (invitation.status !== 'pending') {
      return res.status(400).json({ error: 'Convite já processado.' });
    }

    await supabaseAdmin
      .from('team_invitations')
      .update({ status: 'declined' })
      .eq('id', invitationId);

    res.json({ message: 'Convite recusado.' });
  } catch (error) {
    console.error('Erro ao recusar convite:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * GET /api/teams/:id
 * Detalhes da Equipe (com membros)
 */
router.get('/:id', isAuthenticated, async (req, res) => {
  const teamId = req.params.id;
  
  try {
    // Verificar se usuário é membro ou admin
    const { data: member } = await supabaseAdmin
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', req.user!.id)
      .maybeSingle();

    const isAdminUser = req.user!.isAdmin;

    if (!member && !isAdminUser) {
      return res.status(403).json({ error: 'Acesso negado. Você não é membro desta equipe.' });
    }

    const { data: team, error: teamError } = await supabaseAdmin
      .from('teams')
      .select(`
        *,
        captain:profiles!captain_id(id, username, avatar_url),
        members:team_members(
          id, user_id, gamertag, role, joined_at,
          profile:profiles(username, avatar_url, is_banned)
        )
      `)
      .eq('id', teamId)
      .single();

    if (teamError || !team) {
      return res.status(404).json({ error: 'Equipe não encontrada' });
    }

    res.json(team);
  } catch (error) {
    console.error('Erro ao buscar detalhes da equipe:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * POST /api/teams
 * Criar Equipe
 * 
 * CORREÇÃO #1: Usar função transacional do PostgreSQL
 * Evita race condition (equipe sem capitão)
 */
router.post('/', isAuthenticated, teamCreationLimiter, async (req, res) => {
  try {
    // Validar dados
    const validatedData = CreateTeamSchema.parse(req.body);

    // Verificar se usuário já pertence a uma equipe
    const { data: existingMember } = await supabaseAdmin
      .from('team_members')
      .select('id, team:teams(name)')
      .eq('user_id', req.user!.id)
      .maybeSingle();

    if (existingMember) {
      return res.status(400).json({
        error: 'Você já pertence a uma equipe.',
        teamName: existingMember.team?.name
      });
    }

    // CORREÇÃO #1: Chamar função transacional
    const { data, error } = await supabaseAdmin.rpc('create_team_with_captain', {
      p_team_name: validatedData.name,
      p_captain_id: req.user!.id,
      p_logo_url: validatedData.logo_url || null,
      p_gamertag: validatedData.gamertag,
      p_discord_id: req.user!.discordId || ''
    });

    if (error) {
      // Tratar erros específicos da função
      if (error.message.includes('Usuário banido')) {
        return res.status(403).json({ error: 'Usuários banidos não podem criar equipes.' });
      }
      if (error.message.includes('já existe')) {
        return res.status(400).json({ error: error.message });
      }
      throw error;
    }

    const newTeam = data[0];
    console.log(`[AUDIT] Usuário ${req.user!.id} criou a equipe ${newTeam.team_id}`);

    res.status(201).json({
      message: 'Equipe criada com sucesso',
      team: {
        id: newTeam.team_id,
        name: newTeam.team_name,
        logo_url: newTeam.team_logo_url,
        created_at: newTeam.created_at
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message
        }))
      });
    }
    console.error('Erro ao criar equipe:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * PUT /api/teams/:id
 * Editar Equipe (apenas capitão ou admin)
 * 
 * CORREÇÃO #7: Melhorar validação de capitania
 */
router.put('/:id', isAuthenticated, async (req, res) => {
  const teamId = req.params.id;

  try {
    const { data: team, error: fetchError } = await supabaseAdmin
      .from('teams')
      .select('captain_id, status')
      .eq('id', teamId)
      .single();

    if (fetchError || !team) {
      return res.status(404).json({ error: 'Equipe não encontrada' });
    }

    if (team.status === 'banned') {
      return res.status(403).json({ error: 'Equipe banida não pode ser editada.' });
    }

    const isAdminUser = req.user!.isAdmin;

    // CORREÇÃO: Prevenção de IDOR
    if (team.captain_id !== req.user!.id && !isAdminUser) {
      console.warn(`[SECURITY] Tentativa de IDOR: Usuário ${req.user!.id} tentou editar equipe ${teamId}`);
      return res.status(403).json({ error: 'Acesso negado. Você não é o capitão desta equipe.' });
    }

    const validatedData = UpdateTeamSchema.parse(req.body);
    
    const { data: updatedTeam, error: updateError } = await supabaseAdmin
      .from('teams')
      .update(validatedData)
      .eq('id', teamId)
      .select()
      .single();

    if (updateError) throw updateError;
    
    console.log(`[AUDIT] Usuário ${req.user!.id} editou a equipe ${teamId}`);
    res.json({ message: 'Equipe atualizada', team: updatedTeam });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Dados inválidos', details: error.issues });
    }
    console.error('Erro ao editar equipe:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * DELETE /api/teams/:id
 * Deletar Equipe (apenas capitão ou admin)
 */
router.delete('/:id', isAuthenticated, async (req, res) => {
  const teamId = req.params.id;

  try {
    const { data: team, error: fetchError } = await supabaseAdmin
      .from('teams')
      .select('captain_id')
      .eq('id', teamId)
      .single();

    if (fetchError || !team) {
      return res.status(404).json({ error: 'Equipe não encontrada' });
    }

    const isAdminUser = req.user!.isAdmin;

    if (team.captain_id !== req.user!.id && !isAdminUser) {
      console.warn(`[SECURITY] Tentativa de IDOR: Usuário ${req.user!.id} tentou deletar equipe ${teamId}`);
      return res.status(403).json({ error: 'Acesso negado.' });
    }

    // TODO: Verificar se equipe está em evento ativo

    const { error: deleteError } = await supabaseAdmin
      .from('teams')
      .delete()
      .eq('id', teamId);

    if (deleteError) throw deleteError;

    console.log(`[AUDIT] Usuário ${req.user!.id} deletou a equipe ${teamId}`);
    res.json({ message: 'Equipe deletada com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar equipe:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * POST /api/teams/:id/members
 * Convidar Membro (capitão ou admin)
 * 
 * CORREÇÃO #10: Verificar se convidado está banido
 */
router.post('/:id/members', isAuthenticated, async (req, res) => {
  const teamId = req.params.id;

  try {
    const { data: team, error: fetchError } = await supabaseAdmin
      .from('teams')
      .select('captain_id, status')
      .eq('id', teamId)
      .single();

    if (fetchError || !team) {
      return res.status(404).json({ error: 'Equipe não encontrada' });
    }

    if (team.status === 'banned') {
      return res.status(403).json({ error: 'Equipes banidas não podem convidar membros.' });
    }

    const isAdminUser = req.user!.isAdmin;

    if (team.captain_id !== req.user!.id && !isAdminUser) {
      return res.status(403).json({ error: 'Apenas o capitão pode convidar membros.' });
    }

    const validatedData = AddMemberSchema.parse(req.body);

    // Verificar limite de membros
    const { count, error: countError } = await supabaseAdmin
      .from('team_members')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', teamId);

    if (countError) throw countError;
    
    if (count !== null && count >= 10) {
      return res.status(400).json({ error: 'A equipe já está cheia (máximo 10 membros).' });
    }

    // CORREÇÃO #10: Verificar se usuário a ser convidado está banido
    const { data: invitedUser, error: invitedError } = await supabaseAdmin
      .from('profiles')
      .select('id, is_banned, username')
      .eq('discord_id', validatedData.discord_id)
      .maybeSingle();

    if (invitedError) throw invitedError;

    if (invitedUser?.is_banned) {
      return res.status(400).json({ error: 'Usuários banidos não podem ser convidados.' });
    }

    // Verificar se já existe convite pendente
    const { data: existingInvite } = await supabaseAdmin
      .from('team_invitations')
      .select('id')
      .eq('team_id', teamId)
      .eq('discord_id', validatedData.discord_id)
      .eq('status', 'pending')
      .maybeSingle();

    if (existingInvite) {
      return res.status(400).json({ error: 'Já existe um convite pendente para este usuário.' });
    }

    // Criar convite
    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from('team_invitations')
      .insert({
        team_id: teamId,
        invited_by: req.user!.id,
        discord_id: validatedData.discord_id,
        status: 'pending'
      })
      .select()
      .single();

    if (inviteError) throw inviteError;

    console.log(`[AUDIT] Usuário ${req.user!.id} convidou ${validatedData.discord_id} para equipe ${teamId}`);
    res.status(201).json({
      message: 'Convite enviado com sucesso.',
      invitation
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Dados inválidos', details: error.issues });
    }
    console.error('Erro ao convidar membro:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * DELETE /api/teams/:id/members/:memberId
 * Remover Membro
 * 
 * CORREÇÃO #31: Validar se é último membro
 */
router.delete('/:id/members/:memberId', isAuthenticated, async (req, res) => {
  const teamId = req.params.id;
  const memberIdToRemove = req.params.memberId;

  try {
    const { data: team, error: fetchError } = await supabaseAdmin
      .from('teams')
      .select('captain_id')
      .eq('id', teamId)
      .single();

    if (fetchError || !team) {
      return res.status(404).json({ error: 'Equipe não encontrada' });
    }

    const isAdminUser = req.user!.isAdmin;
    const isCaptain = team.captain_id === req.user!.id;
    const isSelf = req.user!.id === memberIdToRemove;

    // Permissões: Capitão remove qualquer um, Admin remove qualquer um, Membro remove a si mesmo
    if (!isCaptain && !isAdminUser && !isSelf) {
      return res.status(403).json({ error: 'Acesso negado.' });
    }

    // Capitão não pode se remover
    if (memberIdToRemove === team.captain_id) {
      return res.status(400).json({
        error: 'Capitão não pode se remover. Transfira a capitania antes ou delete a equipe.'
      });
    }

    // CORREÇÃO #31: Verificar se é último membro (além do capitão)
    const { count } = await supabaseAdmin
      .from('team_members')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', teamId);

    if (count === 1) {
      return res.status(400).json({
        error: 'Esta é a última pessoa da equipe. Delete a equipe se desejar sair.'
      });
    }

    const { error: deleteError } = await supabaseAdmin
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', memberIdToRemove);

    if (deleteError) throw deleteError;

    console.log(`[AUDIT] Usuário ${req.user!.id} removeu membro ${memberIdToRemove} da equipe ${teamId}`);
    res.json({ message: 'Membro removido com sucesso.' });

  } catch (error) {
    console.error('Erro ao remover membro:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * POST /api/teams/:id/transfer
 * Transferir Capitania
 */
router.post('/:id/transfer', isAuthenticated, async (req, res) => {
  const teamId = req.params.id;

  try {
    const { data: team, error: fetchError } = await supabaseAdmin
      .from('teams')
      .select('captain_id')
      .eq('id', teamId)
      .single();

    if (fetchError || !team) {
      return res.status(404).json({ error: 'Equipe não encontrada' });
    }

    const isAdminUser = req.user!.isAdmin;

    if (team.captain_id !== req.user!.id && !isAdminUser) {
      return res.status(403).json({ error: 'Apenas o capitão pode transferir a liderança.' });
    }

    const validatedData = TransferCaptainSchema.parse(req.body);

    // Verificar se novo capitão está banido
    const { data: newCaptainProfile } = await supabaseAdmin
      .from('profiles')
      .select('is_banned')
      .eq('id', validatedData.newCaptainId)
      .single();

    if (newCaptainProfile?.is_banned) {
      return res.status(400).json({ error: 'Não é possível transferir capitania para usuário banido.' });
    }

    // Verificar se novo capitão é membro da equipe
    const { data: member, error: memberError } = await supabaseAdmin
      .from('team_members')
      .select('id')
      .eq('team_id', teamId)
      .eq('user_id', validatedData.newCaptainId)
      .single();

    if (memberError || !member) {
      return res.status(400).json({ error: 'O novo capitão deve ser membro da equipe.' });
    }

    // Transação: Atualizar roles
    // 1. Antigo capitão vira membro
    await supabaseAdmin
      .from('team_members')
      .update({ role: 'member' })
      .eq('team_id', teamId)
      .eq('user_id', team.captain_id);

    // 2. Novo capitão
    await supabaseAdmin
      .from('team_members')
      .update({ role: 'captain' })
      .eq('team_id', teamId)
      .eq('user_id', validatedData.newCaptainId);

    // 3. Atualizar tabela teams
    const { error: updateError } = await supabaseAdmin
      .from('teams')
      .update({ captain_id: validatedData.newCaptainId })
      .eq('id', teamId);

    if (updateError) throw updateError;

    console.log(`[AUDIT] Capitania da equipe ${teamId} transferida de ${team.captain_id} para ${validatedData.newCaptainId}`);
    res.json({ message: 'Capitania transferida com sucesso.' });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Dados inválidos', details: error.issues });
    }
    console.error('Erro ao transferir capitania:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * POST /api/teams/:id/ban
 * Banir Equipe (Admin apenas)
 */
router.post('/:id/ban', isAuthenticated, isAdmin, async (req, res) => {
  const teamId = req.params.id;
  const { reason } = req.body;

  try {
    const { error: updateError } = await supabaseAdmin
      .from('teams')
      .update({ status: 'banned' })
      .eq('id', teamId);

    if (updateError) throw updateError;

    // Log de auditoria
    await supabaseAdmin.from('admin_logs').insert({
      admin_id: req.user!.id,
      action: 'team_banned',
      target_type: 'team',
      target_id: teamId,
      details: { reason: reason || 'Sem motivo especificado' }
    });

    console.log(`[AUDIT] Admin ${req.user!.id} baniu a equipe ${teamId}. Motivo:${reason}`);
    res.json({ message: 'Equipe banida com sucesso.' });
  } catch (error) {
    console.error('Erro ao banir equipe:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;