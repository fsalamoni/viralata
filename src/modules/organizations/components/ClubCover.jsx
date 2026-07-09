import React from 'react';
import { Calendar, Users, PawPrint, MapPin, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * Capa da ONG — banner laranja full-width com marca d'água de pata,
 * logo da ONG sobreposto no canto inferior esquerdo, nome e localização
 * sobre o banner, e chips de informações rápidas logo abaixo.
 *
 * Inspirado no padrão visual "ONG/abrigo" de plataformas de adoção
 * (Viralata inclui): caloroso, confiável, com motivo visual orgânico
 * (pata). Não é dashboard, não é dark — é uma página de "perfil de
 * organização" com cara de história, com o calor do laranja.
 */
export default function ClubCover({ club, stats, isAdmin }) {
  if (!club) return null;

  const location = [club.city, club.state].filter(Boolean).join(' / ');
  const founded = stats?.founded || (club.created_at?.toDate
    ? club.created_at.toDate().getFullYear()
    : null);
  const followers = stats?.followers ?? club.member_count ?? 0;
  const animals = stats?.animals ?? 0;

  return (
    <header className="relative -mx-4 sm:-mx-6 lg:-mx-8">
      {/* BANNER LARANJA COM MARCA D'ÁGUA */}
      <div className="relative h-44 overflow-hidden bg-gradient-to-br from-orange-500 via-orange-500 to-rose-500 sm:h-52">
        {/* Marca d'água: patas em opacidade baixa */}
        <PawWatermark />

        {/* Botão "Painel Administrativo" — canto superior direito */}
        {isAdmin && (
          <div className="absolute right-3 top-3 z-20 sm:right-6 sm:top-4">
            <Link
              to={`/organizacoes/${club.id}/admin`}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/25"
            >
              <Settings className="h-3.5 w-3.5" />
              Painel Administrativo
            </Link>
          </div>
        )}

        {/* Tag "ONG" no canto direito — sutil, decorativa */}
        <div className="absolute right-4 bottom-3 z-10 sm:right-6 sm:bottom-4">
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/60">ONG</span>
        </div>
      </div>

      {/* ÁREA DE IDENTIDADE — sobreposta ao banner, alinhada à esquerda */}
      <div className="relative z-10 mx-auto -mt-14 max-w-5xl px-4 pb-4 sm:-mt-16 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:gap-5">
          {/* Logo da ONG — quadrado arredondado, sobreposto ao banner */}
          <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-background bg-gradient-to-br from-orange-400 to-rose-500 shadow-lg sm:h-32 sm:w-32">
            {club.logo_url ? (
              <img src={club.logo_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-3xl font-extrabold text-white">
                {(club.name || 'O').slice(0, 1).toUpperCase()}
              </span>
            )}
          </div>

          {/* Nome + localização + chips */}
          <div className="min-w-0 flex-1 pb-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {club.name}
            </h1>
            {location && (
              <p className="mt-0.5 inline-flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" /> {location}
              </p>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              {founded && (
                <InfoChip icon={Calendar} label={`Fundada em ${founded}`} />
              )}
              <InfoChip icon={Users} label={`${followers} seguidores`} />
              <InfoChip icon={PawPrint} label={`${animals} ${animals === 1 ? 'animal' : 'animais'}`} />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function InfoChip({ icon: Icon, label }) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-3 py-1.5 text-xs font-medium text-foreground/80 shadow-sm">
      <Icon className="h-3.5 w-3.5 text-primary" />
      {label}
    </div>
  );
}

/** Marca d'água com patas — duas patas grandes em opacidade baixa. */
function PawWatermark() {
  return (
    <svg
      className="absolute inset-0 h-full w-full text-white/15"
      viewBox="0 0 800 220"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      {/* Pata esquerda */}
      <g transform="translate(80 70) rotate(-15)">
        <PawIcon size={180} />
      </g>
      {/* Pata direita */}
      <g transform="translate(620 30) rotate(20)">
        <PawIcon size={160} />
      </g>
    </svg>
  );
}

function PawIcon({ size = 100 }) {
  return (
    <g fill="currentColor">
      {/* Almofada central */}
      <ellipse cx={size / 2} cy={size * 0.62} rx={size * 0.32} ry={size * 0.26} />
      {/* 4 dedos */}
      <ellipse cx={size * 0.18} cy={size * 0.32} rx={size * 0.1} ry={size * 0.14} />
      <ellipse cx={size * 0.36} cy={size * 0.16} rx={size * 0.1} ry={size * 0.14} />
      <ellipse cx={size * 0.62} cy={size * 0.14} rx={size * 0.1} ry={size * 0.14} />
      <ellipse cx={size * 0.82} cy={size * 0.3} rx={size * 0.1} ry={size * 0.14} />
    </g>
  );
}
