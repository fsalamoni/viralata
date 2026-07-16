/**
 * @fileoverview VolunteerProfile — página dedicada /perfil/voluntario
 * (TASK-266). Mostra perfil + abrigo + auditoria + escalas em tela cheia.
 *
 * É uma extensão de VolunteerSection, mas com layout de página (não de
 * Card) para foco total do voluntário.
 *
 * Gated por SHELTER_VOLUNTEER_PROFILE_V1.
 * Redireciona para /login se anônimo.
 */

import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, Heart, BookOpen, Calendar, MapPin, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import PageHero from '@/components/PageHero';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { SHELTER_FEATURE_FLAG } from '@/modules/shelter/domain/constants';
import {
  useVolunteerProfile,
  useUserVolunteerRosters,
} from '@/modules/shelter/hooks/useVolunteerProfile';
import { VolunteerProfileForm } from '@/modules/shelter/components/VolunteerProfileForm';
import { VolunteerMetricsCard } from '@/modules/shelter/components/VolunteerMetricsCard';
import { VolunteerShiftsBrowse } from '@/modules/shelter/components/VolunteerShiftsBrowse';
import { VolunteerAuditTrail } from '@/modules/shelter/components/VolunteerAuditTrail';
import { useArenaPageClasses } from '@/core/lib/useArenaPageClasses';
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

function StatusBanner({ profile }) {
  if (profile) {
    return (
      <div className="rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 flex items-start gap-2">
        <Heart className="h-5 w-5 mt-0.5 shrink-0" aria-hidden="true" />
        <div>
          <p className="font-semibold">Você é voluntário!</p>
          <p className="text-emerald-700 text-[12.5px]">
            Termo aceito v{profile.terms_accepted_version || '—'}. Cadastrado em{' '}
            {profile.created_at?.toDate?.()?.toLocaleDateString?.('pt-BR') || '—'}.
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 flex items-start gap-2">
      <BookOpen className="h-5 w-5 mt-0.5 shrink-0" aria-hidden="true" />
      <div>
        <p className="font-semibold">Você ainda não é voluntário</p>
        <p className="text-amber-800 text-[12.5px]">
          Cadastre-se no programa de voluntariado para participar de ações nos abrigos.
        </p>
        <Button asChild size="sm" className="mt-2">
          <Link to="/voluntarios/seja">Quero me cadastrar</Link>
        </Button>
      </div>
    </div>
  );
}

function QuickInfoCard({ title, icon: Icon, children }) {
  return (
    <section className="arena-section-card">
      <div className="arena-section-card-header">
        <h3 className="arena-section-card-title flex items-center gap-1.5 text-sm font-semibold">
          <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          {title}
        </h3>
      </div>
      <div className="arena-section-card-body p-4 pt-0">
        {children}
      </div>
    </section>
  );
}

export default function VolunteerProfile() {
  const { user, isLoading: authLoading } = useAuth();
  const enabled = useFeatureFlag(SHELTER_FEATURE_FLAG.SHELTER_VOLUNTEER_PROFILE_V1);
  const navigate = useNavigate();
  const classes = useArenaPageClasses('voluntario');

  const { data: profile, isLoading: profileLoading } = useVolunteerProfile();
  const { data: rosters = [], isLoading: rostersLoading } = useUserVolunteerRosters();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login?from=/perfil/voluntario', { replace: true });
    }
  }, [user, authLoading, navigate]);

  if (authLoading || !user) {
    return (
      <main className="container py-8 max-w-4xl">
        <Skeleton className="h-12 w-3/4 mb-4" />
        <Skeleton className="h-32 w-full mb-2" />
        <Skeleton className="h-48 w-full" />
      </main>
    );
  }

  if (!enabled) {
    return (
      <main className="container py-8 max-w-4xl" data-testid="volunteer-profile-disabled">
        <PageHero
          icon={Heart}
          title="Perfil de Voluntário"
          subtitle="O programa de voluntariado está temporariamente indisponível."
        />
        <EmptyState
          icon={Heart}
          title="Feature em breve"
          description="O programa de voluntários está em rollout gradual. Volte em alguns dias."
          action={
            <Button asChild variant="outline">
              <Link to="/perfil">Voltar para o perfil</Link>
            </Button>
          }
        />
      </main>
    );
  }

  const activeRosters = rosters.filter((r) => r.status !== 'inactive' && r.status !== 'left');
  const isLoading = profileLoading || rostersLoading;

  return (
    <main className={classes} data-testid="volunteer-profile-page">
      <div className="container py-6 max-w-4xl space-y-6">
        {/* Header */}
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
            <Link to="/perfil">
              <ChevronLeft className="h-4 w-4 mr-1" /> Voltar para o perfil
            </Link>
          </Button>
          <PageHero
            icon={Heart}
            title="Meu perfil de voluntário"
            subtitle="Edite suas habilidades, acompanhe seu impacto e gerencie sua presença nos abrigos."
          />
        </div>

        {/* Status banner */}
        {isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : (
          <StatusBanner profile={profile} />
        )}

        {/* Resumo rápido (cards) */}
        {!isLoading && profile && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <QuickInfoCard title="Habilidades" icon={Heart}>
              {profile.skills?.length > 0 ? (
                <ul className="flex flex-wrap gap-1">
                  {profile.skills.map((s) => (
                    <li key={s} className="text-[11px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                      {SKILL_LABELS[s] || s}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">Nenhuma cadastrada</p>
              )}
            </QuickInfoCard>
            <QuickInfoCard title="Disponibilidade" icon={Calendar}>
              <p className="text-sm">{profile.availability || 'Não informada'}</p>
            </QuickInfoCard>
            <QuickInfoCard title="Raio de ação" icon={MapPin}>
              <p className="text-sm">{profile.radius_km ? `${profile.radius_km} km` : 'Não informado'}</p>
            </QuickInfoCard>
          </div>
        )}

        {/* Métricas */}
        {profile && (
          <section aria-label="Métricas de voluntariado">
            <h2 className="text-base font-semibold mb-2">Impacto</h2>
            <VolunteerMetricsCard uid={user.uid} />
          </section>
        )}

        {/* Form de edição */}
        {profile && (
          <section aria-label="Editar perfil">
            <h2 className="text-base font-semibold mb-2">Editar perfil</h2>
            <VolunteerProfileForm
              uid={user.uid}
              actor={{ uid: user.uid, email: user.email }}
              existing={profile}
              readOnly={false}
            />
          </section>
        )}

        {/* Lista de abrigos (links para o abrigo) */}
        {!isLoading && activeRosters.length > 0 && (
          <section aria-label="Abrigos onde atuo">
            <h2 className="text-base font-semibold mb-2">Abrigos onde atuo ({activeRosters.length})</h2>
            <ul className="space-y-2">
              {activeRosters.map((r) => (
                <li key={r.id}>
                  <section className="arena-section-card">
                    <div className="arena-section-card-body p-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium truncate">
                          {r.shelter_name || r.club_id}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {r.role || 'voluntário'} · {r.status || 'ativo'}
                        </p>
                      </div>
                      <Button asChild size="sm" variant="outline">
                        <Link to={`/organizacoes/${r.club_id}`}>
                          Ver abrigo <ExternalLink className="h-3 w-3 ml-1" />
                        </Link>
                      </Button>
                    </div>
                  </section>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Escalas abertas */}
        {profile && (
          <section aria-label="Escalas abertas">
            <h2 className="text-base font-semibold mb-2">Oportunidades de escalas</h2>
            <VolunteerShiftsBrowse
              actor={{ uid: user.uid, displayName: user.displayName, email: user.email }}
            />
          </section>
        )}

        {/* Auditoria */}
        <section aria-label="Histórico">
          <h2 className="text-base font-semibold mb-2">Histórico de auditoria</h2>
          <VolunteerAuditTrail volunteerUid={user.uid} />
        </section>
      </div>
    </main>
  );
}
