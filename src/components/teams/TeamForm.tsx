import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { teamService } from '../../services/teams';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const teamSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres').max(50, 'Nome deve ter no máximo 50 caracteres'),
  ship_name: z.string().min(3, 'Nome do navio deve ter no mínimo 3 caracteres').max(50, 'Nome do navio deve ter no máximo 50 caracteres'),
  gamertag: z.string().min(3, 'Gamertag deve ter no mínimo 3 caracteres').max(50, 'Gamertag deve ter no máximo 50 caracteres'),
});

type TeamFormData = z.infer<typeof teamSchema>;

export const TeamForm: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TeamFormData>({
    resolver: zodResolver(teamSchema),
  });

  const onSubmit = async (data: TeamFormData) => {
    setLoading(true);
    setError(null);
    try {
      await teamService.createTeam(data);
      navigate('/dashboard/teams');
    } catch (err: any) {
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError('Erro ao criar equipe. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-gray-800 border border-gray-700 rounded-lg p-8">
      <h2 className="text-2xl font-bold text-white mb-6">Criar Nova Equipe</h2>
      
      {error && (
        <div className="bg-red-900/20 border border-red-800 text-red-300 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
            Nome da Equipe
          </label>
          <input
            id="name"
            type="text"
            {...register('name')}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ex: The Salty Dogs"
          />
          {errors.name && (
            <p className="text-red-400 text-sm mt-1">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="ship_name" className="block text-sm font-medium text-gray-300 mb-2">
            Nome do Navio
          </label>
          <input
            id="ship_name"
            type="text"
            {...register('ship_name')}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ex: The Black Pearl"
          />
          {errors.ship_name && (
            <p className="text-red-400 text-sm mt-1">{errors.ship_name.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="gamertag" className="block text-sm font-medium text-gray-300 mb-2">
            Sua Gamertag (Capitão)
          </label>
          <input
            id="gamertag"
            type="text"
            {...register('gamertag')}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ex: CaptainJack"
          />
          {errors.gamertag && (
            <p className="text-red-400 text-sm mt-1">{errors.gamertag.message}</p>
          )}
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="button"
            onClick={() => navigate('/dashboard/teams')}
            className="px-4 py-2 text-gray-400 hover:text-white mr-4 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Criar Equipe
          </button>
        </div>
      </form>
    </div>
  );
};
