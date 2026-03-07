import React from 'react';
import { AdminTeamTable } from '../../../components/admin/AdminTeamTable';

const AdminTeamsPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-white mb-8">Gerenciamento de Equipes (Admin)</h1>
      <AdminTeamTable />
    </div>
  );
};

export default AdminTeamsPage;
