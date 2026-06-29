import React from 'react';

interface LogoProps {
  size?: number;
  className?: string;
  useImage?: boolean; // Usar imagen real en lugar de SVG
}

export const Logo: React.FC<LogoProps> = ({ size = 80, className = '', useImage = false }) => {
  // Si hay imagen real del logo, usarla con diseño circular
  if (useImage) {
    return (
      <div className="relative inline-block">
        {/* Contenedor con sombra y efecto */}
        <div
          className="relative rounded-full overflow-hidden bg-gradient-to-br from-indigo-100 to-purple-100 p-1 shadow-lg"
          style={{ width: size, height: size }}
        >
          <div className="w-full h-full rounded-full overflow-hidden bg-white flex items-center justify-center">
            <img
              src="/logo-iics-siglas.png"
              alt="Logo SDI-IICS"
              className="w-full h-full object-cover scale-110"
              onError={(e) => {
                // Si falla, mostrar un ícono por defecto
                const target = e.currentTarget;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent) {
                  parent.innerHTML = '<div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-600 to-purple-600"><span class="text-white text-3xl font-bold">IICS</span></div>';
                }
              }}
            />
          </div>
        </div>
        {/* Anillo decorativo */}
        <div
          className="absolute inset-0 rounded-full border-4 border-indigo-500/20"
          style={{ width: size, height: size }}
        ></div>
      </div>
    );
  }

  // SVG por defecto
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Círculo de fondo */}
      <circle cx="100" cy="100" r="95" fill="url(#gradient)" />

      {/* Gradiente */}
      <defs>
        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4F46E5" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
      </defs>

      {/* Escorpión estilizado minimalista */}
      <g transform="translate(100, 100)">
        {/* Cuerpo central */}
        <ellipse cx="0" cy="0" rx="20" ry="30" fill="white" opacity="0.95" />

        {/* Pinzas (forman la S de SGR) */}
        <path
          d="M -15 -20 Q -30 -30 -35 -15 Q -30 -5 -20 -10"
          stroke="white"
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M 15 -20 Q 30 -30 35 -15 Q 30 -5 20 -10"
          stroke="white"
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
        />

        {/* Cola (curva característica del escorpión) */}
        <path
          d="M 0 30 Q 5 45 15 50 Q 20 52 22 45"
          stroke="white"
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
        />

        {/* Aguijón */}
        <circle cx="22" cy="45" r="4" fill="white" />
        <path
          d="M 22 45 L 28 42"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </g>

      {/* Texto SDI */}
      <text
        x="100"
        y="170"
        fontSize="32"
        fontWeight="bold"
        fill="white"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
        letterSpacing="2"
      >
        SDI
      </text>
    </svg>
  );
};

export const LogoHorizontal: React.FC<{ size?: number }> = ({ size = 120 }) => {
  return (
    <div className="flex items-center gap-4">
      <Logo size={size} />
      <div className="text-left">
        <h1 className="text-2xl font-bold text-gray-900">SDI</h1>
        <p className="text-sm text-gray-600">Sistema de Desarrollo e Investigación</p>
        <p className="text-xs text-indigo-600 font-semibold">IICS - Ciencias Sociales</p>
      </div>
    </div>
  );
};
