import React from 'react';
import { Calendar, Users, MapPin, Settings, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { parseTimestamp } from '@/core/utils/timestamp';

/**
 * Card da COMUNIDADE exibido no topo da página pública (logo abaixo da
 * barra superior). Espelha o padrão visual do `<ClubCover>` da ONG,
 * respeitando o que a comunidade tem no banco (sem `logo_url`, sem
 * `theme`) — o avatar é gerado pelas iniciais do nome e o banner é o
 * `cover_url` com fallback gradiente.
 *
 * Estrutura visual (idêntica ao `ClubCover`, com a tag "Comunidade"
 * no canto):
 *  [ BANNER GRADIENTE — full-width, max-h, marca d'água de pessoas ]
 *  [ PAINEL DE IDENTIDADE — sobreposto, abaixo do banner ]
 *      [ AVATAR ]  [ NOME ]
 *                  [ cidade ] [ chips: fundada em · membros ]
 *
 * Diferenças do `ClubCover` (intencionais):
 *  - Tag "Comunidade" no canto (em vez de "ONG")
 *  - Logo = iniciais dentro do gradiente (em vez de `club.logo_url`)
 *  - Sem personalização por `theme` (comunidades não têm tema no banco)
 */
export default function CommunityCover({ community, stats, isAdmin }) {
  if (!community) return null;

  const location = [community.city, community.state].filter(Boolean).join(' / ');
  const founded = stats?.founded || (parseTimestamp(community.created_at)?.getFullYear() ?? null);
  const members = stats?.members ?? community.member_count ?? 1;

  return (
    <header className="relative isolate w-full overflow-hidden">
      {/* BANNER FULL-WIDTH com cover image ou fallback gradiente.
          max-h impede que o card cresça infinitamente em telas grandes. */}
      <div
        className="relative h-44 max-h-[260px] w-full overflow-hidden sm:h-52"
        style={{
          background:
            'var(--cover-gradient, linear-gradient(135deg, hsl(20 90% 50%) 0%, hsl(350 80% 55%) 100%))',
        }}
      >
        {community.cover_url ? (
          <img
            src={community.cover_url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-70"
          />
        ) : (
          <PeopleWatermark />
        )}

        {/* Link "Painel Administrativo" — canto superior direito, só
            para quem tem poder de gestão. */}
        {isAdmin && (
          <div className="absolute right-3 top-3 z-20 sm:right-6 sm:top-4">
            <Link
              to={`/comunidade/${community.id}/admin`}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/25"
            >
              <Settings className="h-3.5 w-3.5" />
              Painel Administrativo
              <ExternalLink className="h-3 w-3 opacity-70" />
            </Link>
          </div>
        )}

        {/* Tag "Comunidade" discreta no canto inferior direito */}
        <div className="absolute bottom-3 right-4 z-10 sm:bottom-4 sm:right-6">
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/60">
            Comunidade
          </span>
        </div>
      </div>

      {/* ÁREA DE IDENTIDADE — sobreposta, alinhada à esquerda, restrita
          ao conteúdo útil (max-w + padding do app). Mesmo `pb-6` da ONG
          pra dar "respiro" entre o card de identidade e a próxima seção. */}
      <div className="relative z-10 mx-auto -mt-14 max-w-5xl px-4 pb-6 sm:-mt-16 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-start sm:gap-6">
          {/* Logo / avatar da comunidade — quadrado arredondado, sobreposto
              ao banner. Sem `logo_url` no banco, usamos o gradiente + letra
              inicial (consistente com o fallback do `ClubCover`). */}
          <div
            className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-background shadow-lg sm:h-32 sm:w-32"
            style={{
              background:
                'var(--cover-gradient, linear-gradient(135deg, hsl(28 88% 60%) 0%, hsl(348 78% 60%) 100%))',
            }}
          >
            <span className="text-3xl font-extrabold text-white">
              {(community.name || 'C').slice(0, 1).toUpperCase()}
            </span>
          </div>

          {/* Coluna do nome + cidade + chips. Espelha a posição da ONG. */}
          <div className="min-w-0 flex-1 pt-1 sm:pt-2">
            <h1
              className="text-2xl font-bold tracking-tight drop-shadow sm:text-3xl"
              style={{ color: 'hsl(var(--cover-name, 0 0% 100%))' }}
            >
              {community.name}
            </h1>

            {location && (
              <p className="mt-10 inline-flex items-center gap-1 text-sm text-muted-foreground sm:mt-12">
                <MapPin className="h-3.5 w-3.5" /> {location}
              </p>
            )}

            <div className="mt-6 flex flex-wrap gap-2 sm:mt-7">
              {founded && (
                <InfoChip icon={Calendar} label={`Fundada em ${founded}`} />
              )}
              <InfoChip
                icon={Users}
                label={`${members} ${members === 1 ? 'membro' : 'membros'}`}
              />
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

/** Marca d'água com silhuetas de pessoas — duas silhuetas grandes em
    opacidade baixa (espelha o `PawWatermark` da ONG, com ícone coerente
    com o domínio de comunidades). */
function PeopleWatermark() {
  return (
    <svg
      className="absolute inset-0 h-full w-full text-white/15"
      viewBox="0 0 800 220"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      {/* Pessoa esquerda */}
      <g transform="translate(80 40) rotate(-8)" fill="currentColor">
        <PersonIcon size={170} />
      </g>
      {/* Pessoa direita */}
      <g transform="translate(580 30) rotate(12)" fill="currentColor">
        <PersonIcon size={150} />
      </g>
    </svg>
  );
}

function PersonIcon({ size = 100 }) {
  // Silhueta minimalista: cabeça + ombros/torso arredondados, em silhueta.
  return (
    <g>
      {/* Cabeça */}
      <circle cx={size / 2} cy={size * 0.32} r={size * 0.18} />
      {/* Tronco / ombros */}
      <path
        d={`M ${size * 0.18} ${size * 0.92}
            C ${size * 0.18} ${size * 0.6}, ${size * 0.32} ${size * 0.5}, ${size / 2} ${size * 0.5}
            C ${size * 0.68} ${size * 0.5}, ${size * 0.82} ${size * 0.6}, ${size * 0.82} ${size * 0.92} Z`}
      />
    </g>
  );
}
