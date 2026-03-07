import { useState } from 'react';
import { UserCircle } from 'lucide-react';

interface AvatarProps {
  user: {
    id: string;
    avatar?: string;
    username: string;
  } | null;
  className?: string;
  size?: number;
}

export default function Avatar({ user, className = "w-6 h-6", size = 128 }: AvatarProps) {
  const [imageError, setImageError] = useState(false);

  if (!user) {
    return <UserCircle className={`${className} text-gold`} />;
  }

  // Se não tiver avatar ou der erro ao carregar, mostra a inicial ou ícone
  if (!user.avatar || imageError) {
    // Tenta extrair um tamanho aproximado da classe para ajustar o tamanho da fonte (heurística simples)
    const isLarge = className.includes('w-24') || className.includes('w-32') || className.includes('h-24');
    
    return (
      <div className={`${className} rounded-full border border-gold/20 bg-ocean-lighter flex items-center justify-center overflow-hidden shrink-0`}>
         {isLarge ? (
             <span className="font-serif text-gold font-bold text-3xl">
                {user.username.charAt(0).toUpperCase()}
             </span>
         ) : (
             <UserCircle className="w-full h-full p-0.5 text-gold" />
         )}
      </div>
    );
  }

  const avatarUrl = user.avatar.startsWith('http')
    ? user.avatar
    : `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=${size}`;

  return (
    <img
      src={avatarUrl}
      alt={user.username}
      className={`${className} rounded-full object-cover`}
      referrerPolicy="no-referrer"
      onError={() => setImageError(true)}
    />
  );
}
