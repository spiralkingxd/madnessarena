import api from '../lib/api';

const API_URL = '/teams';

export interface Team {
  id: string;
  name: string;
  captain_id: string;
  created_at: string;
  updated_at: string;
  status: 'active' | 'banned';
  is_banned: boolean;
  logo_url?: string;
  members?: TeamMember[];
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  discord_id: string;
  gamertag: string;
  role: 'captain' | 'member';
  joined_at: string;
}

export interface CreateTeamData {
  name: string;
  gamertag: string;
  logo_url?: string;
}

export interface UpdateTeamData {
  name?: string;
  logo_url?: string;
}

export interface TeamInvitation {
  id: string;
  team_id: string;
  invited_by: string;
  discord_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  team?: {
    name: string;
    logo_url?: string;
  };
  inviter?: {
    username: string;
  };
}

export const teamService = {
  getMyTeams: async (): Promise<Team[]> => {
    const response = await api.get(API_URL);
    return response.data;
  },

  getInvitations: async (): Promise<TeamInvitation[]> => {
    const response = await api.get(`${API_URL}/invitations`);
    return response.data;
  },

  acceptInvitation: async (id: string): Promise<void> => {
    await api.post(`${API_URL}/invitations/${id}/accept`);
  },

  declineInvitation: async (id: string): Promise<void> => {
    await api.post(`${API_URL}/invitations/${id}/decline`);
  },

  getTeamDetails: async (id: string): Promise<Team> => {
    const response = await api.get(`${API_URL}/${id}`);
    return response.data;
  },

  createTeam: async (data: CreateTeamData): Promise<Team> => {
    const response = await api.post(API_URL, data);
    return response.data.team;
  },

  updateTeam: async (id: string, data: UpdateTeamData): Promise<Team> => {
    const response = await api.put(`${API_URL}/${id}`, data);
    return response.data.team;
  },

  deleteTeam: async (id: string): Promise<void> => {
    await api.delete(`${API_URL}/${id}`);
  },

  inviteMember: async (teamId: string, gamertag: string, discordId: string): Promise<void> => {
    await api.post(`${API_URL}/${teamId}/members`, { gamertag, discord_id: discordId });
  },

  removeMember: async (teamId: string, userId: string): Promise<void> => {
    await api.delete(`${API_URL}/${teamId}/members/${userId}`);
  },
};
