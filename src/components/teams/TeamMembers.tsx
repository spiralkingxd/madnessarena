import React, { useState } from 'react';
import { Team, TeamMember, teamService } from '../../services/teams';
import { Trash2, Shield, User } from 'lucide-react';

interface TeamMembersProps {
  team: Team;
  currentUser: any; // Replace with proper User type
  onUpdate: () => void;
}

export const TeamMembers: React.FC<TeamMembersProps> = ({ team, currentUser, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [inviteGamertag, setInviteGamertag] = useState('');
  const [inviteDiscordId, setInviteDiscordId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const isCaptain = team.captain_id === currentUser.id;
  const isAdmin = currentUser.id === (import.meta.env.VITE_ADMIN_DISCORD_ID || ''); // Or check role
  const canManage = isCaptain || isAdmin;

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteGamertag || !inviteDiscordId) return;

    setLoading(true);
    setError(null);
    try {
      await teamService.inviteMember(team.id, inviteGamertag, inviteDiscordId);
      setInviteGamertag('');
      setInviteDiscordId('');
      onUpdate();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao convidar membro.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (userId: string) => {
    if (!confirm('Tem certeza que deseja remover este membro?')) return;
    
    setLoading(true);
    try {
      await teamService.removeMember(team.id, userId);
      onUpdate();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao remover membro.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <h3 className="text-xl font-serif font-bold text-gold mb-4 flex items-center uppercase tracking-wider">
        <User className="w-5 h-5 mr-2" />
        Membros ({team.members?.length || 0}/10)
      </h3>

      <div className="space-y-4 mb-8">
        {team.members?.map((member) => (
          <div key={member.id} className="flex items-center justify-between bg-ocean-light p-4 rounded-xl border border-ocean-lighter">
            <div className="flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 ${
                member.role === 'captain' ? 'bg-gold/20 text-gold' : 'bg-ocean-lighter text-parchment-muted'
              }`}>
                {member.role === 'captain' ? <Shield className="w-5 h-5" /> : <User className="w-5 h-5" />}
              </div>
              <div>
                <p className="text-parchment font-medium">{member.gamertag}</p>
                <p className="text-parchment-muted text-xs font-mono">ID: {member.discord_id}</p>
              </div>
            </div>
            
            {canManage && member.role !== 'captain' && (
              <button
                onClick={() => handleRemove(member.user_id)}
                className="text-red-400 hover:text-red-300 p-2 hover:bg-red-900/20 rounded-lg transition-colors"
                title="Remover membro"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {canManage && (team.members?.length || 0) < 10 ? (
        <div className="border-t border-ocean-lighter pt-6">
          <h4 className="text-lg font-serif font-bold text-parchment mb-4 uppercase tracking-wider">Adicionar Membro</h4>
          {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
          
          <form onSubmit={handleInvite} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              value={inviteGamertag}
              onChange={(e) => setInviteGamertag(e.target.value)}
              placeholder="Gamertag"
              className="bg-ocean-light border border-ocean-lighter rounded-lg px-4 py-2 text-parchment text-sm focus:outline-none focus:ring-2 focus:ring-gold/50"
              required
            />
            <input
              type="text"
              value={inviteDiscordId}
              onChange={(e) => setInviteDiscordId(e.target.value)}
              placeholder="Discord ID"
              className="bg-ocean-light border border-ocean-lighter rounded-lg px-4 py-2 text-parchment text-sm focus:outline-none focus:ring-2 focus:ring-gold/50"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-gold hover:bg-gold-light text-ocean rounded-lg px-4 py-2 text-sm font-bold transition-colors disabled:opacity-50"
            >
              {loading ? 'Adicionando...' : 'Adicionar'}
            </button>
          </form>
        </div>
      ) : (
        (team.members?.length || 0) >= 10 && (
          <p className="text-red-400 text-sm mt-4 text-center">Limite de 10 membros atingido.</p>
        )
      )}
    </div>
  );
};
