import React from 'react';
import { Calendar, Users, PawPrint, MapPin, Settings, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { parseTimestamp } from '@/core/utils/timestamp';

/**
 * Card da ONG exibido no topo da página pública (logo abaixo da barra
 * superior). Ocupa toda a largura do viewport (edge-to-edge) e tem
 * altura limitada via `max-h-*` — em telas grandes o card NÃO cresce
 * infinitamente; o conteúdo interno se acomoda.
 *
 * Cores personalizáveis por ONG (via `club.theme`):
 *  - `--cover-from` + `--cover-to` definem o gradiente do banner
 *  - `--cover-name` define a cor do nome da ONG (com fallback branco)
 *  - `--cover-gradient` é a string montada para uso direto em CSS
 *    (`background: var(--cover-gradient)`).
 *
 * Aplicação: o `ClubThemedScope` que envolve esta página aplica as CSS
 * variables no escopo — esta capa, portanto, reage automaticamente à
 * personalização salva pelo admin (no painel > Configurações).
 *
 * Estrutura visual:
 *  [ BANNER GRADIENTE — full-width, max-h, marca d'água de patas ]
 *  [ PAINEL DE IDENTIDADE — sobreposto, abaixo do banner ]
 *      [ LOGO ]  [ NOME (mantido no lugar) ]
 *                 [ localização + chips — movidos 1 ponto abaixo ]
 */
export default function ClubCover({ club, stats, isAdmin }) {
  if (!club) return null;

  const location = [club.city, club.state].filter(Boolean).join(' / ');
  const founded = stats?.founded || (parseTimestamp(club.created_at)?.getFullYear() ?? null);
  const followers = stats?.followers ?? club.member_count ?? 0;
  const animals = stats?.animals ?? 0;

  return (
    <header className="relative isolate w-full overflow-hidden">
      {/* BANNER FULL-WIDTH com gradiente personalizado. max-h impede
          que em telas grandes o card cresça demais. */}
      <div
        className="relative h-44 max-h-[260px] w-full overflow-hidden sm:h-52"
        style={{ background: 'var(--cover-gradient, linear-gradient(135deg, hsl(20 90% 50%) 0%, hsl(350 80% 55%) 100%))' }}
      >

        <PawWatermark />

        {/* Link "Painel Administrativo" — canto superior direito, só
            para quem tem poder de gestão. */}
        {isAdmin && (
          <div className="absolute right-3 top-3 z-20 sm:right-6 sm:top-4">
            <Link
              to={`/organizacoes/${club.id}/admin`}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/25"
            >
              <Settings className="h-3.5 w-3.5" />
              Painel Administrativo
              <ExternalLink className="h-3 w-3 opacity-70" />
            </Link>
          </div>
        )}

        {/* Tag "ONG" discreta no canto inferior direito */}
        <div className="absolute bottom-3 right-4 z-10 sm:bottom-4 sm:right-6">
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/60">ONG</span>
        </div>
      </div>

      {/* ÁREA DE IDENTIDADE — sobreposta, alinhada à esquerda, restrita
          ao conteúdo útil (max-w + padding do app). Usa pb generoso
          pra dar "respiro" entre o card e a próxima seção (Voltar + tabs). */}
      <div className="relative z-10 mx-auto -mt-14 max-w-5xl px-4 pb-6 sm:-mt-16 sm:px-6 lg:px-8">
        {/* Alinhamento TOPO (items-start): nome alinhado pelo topo com o
            topo da imagem/logo, não pelo fundo como antes. A cidade
            fica no "meio" entre o fim do banner colorido e o início
            do card dos chips (Fundada em / seguidores / animais). Os
            chips ficam logo abaixo do nome + cidade. */}
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-start sm:gap-6">
          {/* Logo da ONG — quadrado arredondado, sobreposto ao banner.
              Quando a ONG não tem logo enviado, usamos o gradiente do
              card como fundo (consistência visual com a personalização). */}
          <div
            className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-background shadow-lg sm:h-32 sm:w-32"
            style={{ background: 'var(--cover-gradient, linear-gradient(135deg, hsl(28 88% 60%) 0%, hsl(348 78% 60%) 100%))' }}
          >
            {club.logo_url ? (
              <img src={club.logo_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-3xl font-extrabold text-white">
                {(club.name || 'O').slice(0, 1).toUpperCase()}
              </span>
            )}
          </div>

          {/* Coluna do nome + cidade + chips. `pt-1 sm:pt-2` deixa o nome
              respirar logo abaixo do limite superior do logo. A cidade
              fica em `mt-10 sm:mt-12` (40–48px), colocado aproximadamente
              no meio entre o fundo do banner (sm:h-52 ≈ 208px / overlap)
              e o início dos chips. Os chips vêm em `mt-6 sm:mt-7`,
              empurrados pra dar mais respiração final. */}
          <div className="min-w-0 flex-1 pt-1 sm:pt-2">
            <h1
              className="text-2xl font-bold tracking-tight drop-shadow sm:text-3xl"
              style={{ color: 'hsl(var(--cover-name, 0 0% 100%))' }}
            >
              {club.name}
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
