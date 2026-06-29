import React from 'react';

interface User {
  id?: string;
  fullName: string;
  avatarUrl?: string;
  role?: string;
}

interface AvatarGroupProps {
  users: User[];
  limit?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * AvatarGroup - Componente Táctico de ACS
 * Muestra un equipo de usuarios con fotos apiladas y efectos de profundidad.
 */
export const AvatarGroup: React.FC<AvatarGroupProps> = ({ 
  users, 
  limit = 7, 
  size = 'sm',
  className = ''
}) => {
  if (!users || users.length === 0) return null;

  const displayUsers = users.slice(0, limit);
  const remaining = users.length - limit;

  const sizeClasses = {
    xs: 'w-6 h-6 text-[8px]',
    sm: 'w-8 h-8 text-[10px]',
    md: 'w-10 h-10 text-xs',
    lg: 'w-12 h-12 text-sm',
  };

  const currentSize = sizeClasses[size];

  return (
    <div className={`flex items-center -space-x-3 ${className}`}>
      {displayUsers.map((user, i) => (
        <div
          key={user.id || i}
          title={user.fullName}
          style={{ zIndex: 10 - i }}
          className={`
            ${currentSize} 
            relative
            rounded-full 
            bg-[#111] 
            border-2 
            border-black 
            flex 
            items-center 
            justify-center 
            overflow-hidden 
            hover:z-30 
            hover:scale-110 
            transition-all 
            duration-300
            cursor-help 
            ring-1 
            ring-white/10
            shadow-[0_0_10px_rgba(0,0,0,0.5)]
            group
          `}
        >
          {user.avatarUrl ? (
            <img 
              src={user.avatarUrl} 
              alt={user.fullName} 
              className="w-full h-full object-cover group-hover:brightness-125 transition-all" 
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                (e.target as HTMLImageElement).parentElement!.innerHTML = `<span class="font-bold text-exec-blue">${user.fullName.charAt(0).toUpperCase()}</span>`;
              }}
            />
          ) : (
            <span className="font-black text-exec-blue uppercase tracking-tighter">
              {user.fullName.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </span>
          )}
          
          {/* Subtle overlay reflection */}
          <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/10 pointer-events-none"></div>
        </div>
      ))}
      
      {remaining > 0 && (
        <div 
          style={{ zIndex: 0 }}
          className={`
            ${currentSize} 
            rounded-full 
            bg-[#1A1A1A] 
            border-2 
            border-black 
            flex 
            items-center 
            justify-center 
            backdrop-blur-md
            ring-1
            ring-exec-blue/20
          `}
        >
          <span className="font-bold text-exec-blue text-[10px]">+{remaining}</span>
        </div>
      )}
    </div>
  );
};
