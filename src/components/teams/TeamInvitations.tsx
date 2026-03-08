import React, { useEffect, useState } from 'react';
import { teamService, TeamInvitation } from '../../services/teams';
import { Check, X, Mail } from 'lucide-react';

export const TeamInvitations: React.FC = () => {
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvitations();
  }, []);

  const fetchInvitations = async () => {
    try {
      const data = await teamService.getInvitations();
      setInvitations(data);
    } catch (error) {
      console.error('Erro ao buscar convites:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (id: string) => {
    try {
      await teamService.acceptInvitation(id);
      // Refresh page to show new team
      window.location.reload();
    } catch (error) {
      alert('Erro ao aceitar convite.');
    }
  };

  const handleDecline = async (id: string) => {
    if (!confirm('Recusar convite?')) return;
    try {
      await teamService.declineInvitation(id);
      fetchInvitations();
    } catch (error) {
      alert('Erro ao recusar convite.');
    }
  };

  if (loading) return null;
  if (invitations.length === 0) return null;

  return (
    <div className="mb-8 bg-ocean-lighter border border-gold/20 rounded-2xl p-6">
      <h3 className="text-xl font-serif font-bold text-gold mb-4 flex items-center uppercase tracking-wider">
        <Mail className="w-5 h-5 mr-2" />
        Convites Pendentes
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {invitations.map((invitation) => (
          <div key={invitation.id} className="bg-ocean-light border border-gold/30 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
                {invitation.team?.logo_url && (
                    <img src={invitation.team.logo_url} alt="Logo" className="w-10 h-10 rounded-full object-cover" />
                )}
                <div>
                <p className="text-parchment font-bold">{invitation.team?.name || 'Equipe Desconhecida'}</p>
                <p className="text-parchment-muted text-sm">Convidado por: {invitation.inviter?.username || 'Alguém'}</p>
                </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleAccept(invitation.id)}
                className="p-2 bg-green-900/50 text-green-400 hover:bg-green-900 hover:text-green-300 rounded-lg transition-colors"
                title="Aceitar"
              >
                <Check className="w-5 h-5" />
              </button>
              <button
                onClick={() => handleDecline(invitation.id)}
                className="p-2 bg-red-900/50 text-red-400 hover:bg-red-900 hover:text-red-300 rounded-lg transition-colors"
                title="Recusar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
