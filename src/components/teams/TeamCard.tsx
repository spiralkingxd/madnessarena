import React from 'react';
import { Link } from 'react-router-dom';
import { Team } from '../../services/teams';
import { Users, Anchor } from 'lucide-react';

interface TeamCardProps {
  team: Team;
}

export const TeamCard: React.FC<TeamCardProps> = ({ team }) => {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 hover:border-blue-500 transition-colors">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold text-white mb-1">{team.name}</h3>
          <div className="flex items-center text-gray-400 text-sm">
            <Anchor className="w-4 h-4 mr-1" />
            <span>{team.ship_name}</span>
          </div>
        </div>
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          team.status === 'active' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
        }`}>
          {team.status === 'active' ? 'Ativa' : 'Banida'}
        </span>
      </div>
      
      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center text-gray-400 text-sm">
          <Users className="w-4 h-4 mr-1" />
          <span>{team.members?.length || 0}/4 Membros</span>
        </div>
        
        <Link 
          to={`/dashboard/teams/${team.id}`}
          className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
        >
          Gerenciar &rarr;
        </Link>
      </div>
    </div>
  );
};
