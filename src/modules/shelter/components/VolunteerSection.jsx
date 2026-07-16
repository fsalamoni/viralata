/**
 * @fileoverview VolunteerSection — seção consolidada "Voluntário" no
 * Profile.jsx (TASK-265). Mostra status, habilidades, abrigos e CTAs.
 *
 * Substitui os 3 cards dispersos (VolunteerMetricsCard, VolunteerProfileForm,
 * Minhas voluntariadas) por um único Card com seções colapsáveis,
 * melhorando densidade e escaneabilidade.
 *
 * Gated por SHELTER_VOLUNTEER_PROFILE_V1.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Heart, Building2, CheckCircle2, Sparkles, MapPin, Calendar,
  ChevronRight, ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import {
  useVolunteerProfile,
  useUserVolunteerRosters,
} from '@/modules/shelter/hooks/useVolunteerProfile';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { VolunteerProfileForm } from '@/modules/shelter/components/VolunteerProfileForm';
import { VolunteerMetricsCard } from '@/modules/shelter/components/VolunteerMetricsCard';
import { VolunteerShiftsBrowse } from '@/modules/shelter/components/VolunteerShiftsBrowse';
import { VolunteerAuditTrail } from '@/modules/shelter/components/VolunteerAuditTrail';
import { cn } from '@/core/lib/utils';
import { logger } from '@/core/lib/logger';

const SKILL_LABELS = {
  dogs: 'Cães',
  cats: 'Gatos',
  transit: 'Transporte',
  photo: 'Fotografia',
  social: 'Redes sociais',
  vet: 'Veterinária',
  admin: 'Administrativo',
  events: 'Eventos',
};

function VolunteerStatusBadge({ profile }) {
  if (!profile) {
    return (
      <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground">
        <Sparkles className="h-3 w-3 mr-1" /> Você ainda não é voluntário
      </Badge>
    );
  }
  return (
    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">
      <CheckCircle2 className="h-3 w-3 mr-1" /> Sou voluntário
    </Badge>
  );
}

function SkillsList({ skills = [] }) {
  if (skills.length === 0) {
    return <p className="text-xs text-muted-foreground">Nenhuma habilidade cadastrada</p>;
  }
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Habilidades de voluntário">
      {skills.map((s) => (
        <li key={s}>
          <Badge variant="secondary" className="text-xs">
            {SKILL_LABELS[s] || s}
          </Badge>
        </li>
      ))}
    </ul>
  );
}

function RostersList({ rosters = [] }) {
  if (rosters.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Você ainda não participa de nenhum abrigo. Encontre um abrigo para se voluntariar.
      </p>
    );
  }
  return (
    <ul className="space-y-1.5" aria-label="Abrigos onde você é voluntário">
      {rosters.map((r) => (
        <li
          key={r.id}
          className="flex items-center justify-between gap-2 rounded-md border border-border/50 p-2 text-sm"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="truncate font-medium">{r.shelter_name || r.club_id}</span>
            {r.role && (
              <Badge variant="outline" className="text-[10px]">
                {r.role}
              </Badge>
            )}
          </div>
          <span
            className={cn(
              'text-[10px] uppercase font-semibold tracking-wide',
              r.status === 'active' ? 'text-emerald-700' : 'text-muted-foreground',
            )}
          >
            {r.status || 'ativo'}
          </span>
        </li>
      ))}
    </ul>
  );
}

function SectionHeader({ icon: Icon, title, count }) {
  return (
    <h3 className="flex items-center gap-1.5 text-[12.5px] font-bold uppercase tracking-wide text-muted-foreground">
      <Icon className="icon-sm" aria-hidden="true" />
      {title}
      {count !== undefined && <span className="text-muted-foreground/60">({count})</span>}
    </h3>
  );
}

export function VolunteerSection() {
  const { user } = useAuth();
  const { data: profile, isLoading: profileLoading } = useVolunteerProfile();
  const { data: rosters = [], isLoading: rostersLoading } = useUserVolunteerRosters();
  const [expanded, setExpanded] = useState(false);

  if (!user?.uid) return null;

  const isVolunteer = Boolean(profile);
  const hasRosters = rosters.length > 0;

  return (
    <section className="rounded-[24px] border-primary/20" data-testid="volunteer-section">
      <div className="arena-section-card-header">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary" aria-hidden="true" />
            <h3 className="arena-section-card-title">Voluntariado</h3>
          </div>
          <VolunteerStatusBadge profile={profile} />
        </div>
        <p className="arena-section-card-description">
          {isVolunteer
            ? 'Continue ajudando os abrigos. Veja abaixo seu impacto, habilidades e abrigos onde atua.'
            : 'Torne-se voluntário e ajude animais a encontrar um lar.'}
        </p>
      </div>

      <div className="arena-section-card-body p-6 pt-0 space-y-5">
        {/* Resumo rápido (sempre visível) */}
        {profileLoading || rostersLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-lg border border-border/40 p-3 space-y-1.5">
              <SectionHeader icon={Sparkles} title="Habilidades" count={profile?.skills?.length} />
              <SkillsList skills={profile?.skills} />
            </div>
            <div className="rounded-lg border border-border/40 p-3 space-y-1.5">
              <SectionHeader icon={MapPin} title="Disponibilidade" />
              <p className="text-sm text-foreground">
                {profile?.availability || 'Não informada'}
              </p>
            </div>
            <div className="rounded-lg border border-border/40 p-3 space-y-1.5 sm:col-span-2">
              <SectionHeader icon={Building2} title="Abrigos onde atuo" count={rosters.length} />
              <RostersList rosters={rosters} />
            </div>
          </div>
        )}

        {/* CTAs principais */}
        <div className="flex flex-wrap gap-2">
          {!isVolunteer && (
            <Button asChild size="sm">
              <Link to="/voluntarios">
                <Sparkles className="h-4 w-4 mr-1" /> Conhecer o programa
              </Link>
            </Button>
          )}
          {isVolunteer && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              data-testid="volunteer-section-toggle"
            >
              {expanded ? 'Ocultar' : 'Editar'} perfil
              <ChevronRight
                className={cn(
                  'h-4 w-4 ml-1 transition-transform',
                  expanded && 'rotate-90',
                )}
              />
            </Button>
          )}
          {isVolunteer && (
            <Button asChild variant="ghost" size="sm">
              <Link to="/perfil/voluntario">
                Página dedicada <ExternalLink className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          )}
        </div>

        {/* Métricas (sempre visíveis se for voluntário) */}
        {isVolunteer && (
          <div className="border-t pt-4">
            <VolunteerMetricsCard uid={user.uid} />
          </div>
        )}

        {/* Escalas abertas (sempre visíveis) */}
        {isVolunteer && (
          <div className="border-t pt-4">
            <VolunteerShiftsBrowse
              actor={{ uid: user.uid, displayName: user.displayName, email: user.email }}
            />
          </div>
        )}

        {/* Auditoria (voluntário vê seu próprio histórico) */}
        {isVolunteer && (
          <div className="border-t pt-4">
            <SectionHeader icon={Calendar} title="Histórico" />
            <div className="mt-2">
              <VolunteerAuditTrail volunteerUid={user.uid} />
            </div>
          </div>
        )}

        {/* Form de edição (expansível) */}
        {isVolunteer && expanded && (
          <div className="border-t pt-4" data-testid="volunteer-section-form">
            <SectionHeader icon={Heart} title="Editar perfil" />
            <div className="mt-3">
              <VolunteerProfileForm
                uid={user.uid}
                actor={{ uid: user.uid, email: user.email }}
                existing={profile}
                readOnly={false}
              />
            </div>
          </div>
        )}

        {/* Empty state (não é voluntário) */}
        {!isVolunteer && !profileLoading && (
          <EmptyState
            icon={Heart}
            title="Comece a ajudar hoje"
            description="Inscreva-se em um abrigo e participe de ações, eventos e cuidados com os animais."
            action={
              <Button asChild>
                <Link to="/voluntarios/seja">Quero ser voluntário</Link>
              </Button>
            }
          />
        )}
      </div>
    </section>
  );
}

export default VolunteerSection;
