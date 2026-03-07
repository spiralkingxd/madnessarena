import React from 'react';
import { TeamList } from '../../../components/teams/TeamList';

const TeamsPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <TeamList />
    </div>
  );
};

export default TeamsPage;
