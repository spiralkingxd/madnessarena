import React from 'react';
import { TeamForm } from '../../../components/teams/TeamForm';
import { useNavigate } from 'react-router-dom';

const CreateTeamPage: React.FC = () => {
  const navigate = useNavigate();
  
  return (
    <div className="container mx-auto px-4 py-8">
      <TeamForm 
        onClose={() => navigate(-1)} 
        onSuccess={() => navigate('/dashboard/teams')} 
      />
    </div>
  );
};

export default CreateTeamPage;
