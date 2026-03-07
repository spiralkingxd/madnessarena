import React, { useEffect, useState } from 'react';
import { Team, teamService } from '../../services/teams';
import { TeamCard } from './TeamCard';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';

export const TeamList: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const data = await teamService.getMyTeams();
        setTeams(data);
      } catch (err) {
        setError('Erro ao carregar equipes.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTeams();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-gray-800 border border-gray-700 rounded-lg p-6 animate-pulse h-40"></div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-800 text-red-300 p-4 rounded-lg">
        {error}
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-800/50 border border-gray-700 border-dashed rounded-lg">
        <h3 className="text-xl font-bold text-white mb-2">Você ainda não tem uma equipe</h3>
        <p className="text-gray-400 mb-6">Crie sua equipe para participar dos eventos do Madness Arena.</p>
        <Link
          to="/dashboard/teams/create"
          className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          Criar Nova Equipe
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Minhas Equipes</h2>
        <Link
          to="/dashboard/teams/create"
          className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nova Equipe
        </Link>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teams.map((team) => (
          <TeamCard key={team.id} team={team} />
        ))}
      </div>
    </div>
  );
};
