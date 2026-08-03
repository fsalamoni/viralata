/**
 * @fileoverview DonorDashboard — home da persona Doador (V4).
 *
 * Mostra:
 *  - Stats dos pets do doador (total, adotados, em processo, disponíveis)
 *  - Lista de pets com status
 *  - CTA para cadastrar novo pet
 *  - Card "Seu perfil de doador" (link para edição)
 *
 * @see docs/PLAN_PERSONAS_V4.md v1.1
 * @see docs/AI_GUIDE/13-DECISIONS.md §16
 */

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PawPrint, Plus, Heart, ClipboardCheck, Eye, Edit, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PageHero from '@/components/PageHero';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { useMyPets } from '@/modules/pets/hooks/usePets';
import { useActivePersona } from '@/core/hooks/useActivePersona';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { FEATURE_FLAG } from '@/core/featureFlags';
import { PERSONA_TYPE } from '@/core/domain/personas';

const STATUS_LABELS = {
  available: 'Disponível',
  in_process: 'Em processo',
  adopted: 'Adotado',
  unavailable: 'Indisponível',
};

const STATUS_COLORS = {
  available: 'bg-emerald-100 text-emerald-800',
  in_process: 'bg-amber-100 text-amber-800',
  adopted: 'bg-sky-100 text-sky-800',
  unavailable: 'bg-rose-100 text-rose-800',
};

export function DonorDashboard() {
  const v4Enabled = useFeatureFlag(FEATURE_FLAG.V4_PERSONA_DONOR);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { active } = useActivePersona();
  const { data: pets = [], isLoading } = useMyPets(user?.uid);

  if (!v4Enabled) {
    navigate('/meus-pets', { replace: true });
    return null;
  }

  if (active && active.type !== PERSONA_TYPE.DONOR) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-12 text-center">
        <p className="text-muted-foreground">
          Esta página é exclusiva da persona "Doador".
        </p>
        <Button onClick={() => navigate('/acesso')} className="mt-4">
          Trocar de persona
        </Button>
      </div>
    );
  }

  // Stats
  const total = pets.length;
  const adopted = pets.filter((p) => p.status === 'adopted').length;
  const inProcess = pets.filter((p) => p.status === 'in_process').length;
  const available = pets.filter((p) => p.status === 'available').length;

  return (
    <div className="mx-auto max-w-4xl px-5 py-6 sm:py-8" data-testid="donor-dashboard">
      <PageHero
        title="Meus pets para adoção"
        subtitle="Gerencie os pets que você colocou para adoção."
        icon={PawPrint}
      />

      {/* Stats */}
      <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Estatísticas">
        <StatCard label="Total" value={total} icon={PawPrint} color="bg-card" />
        <StatCard label="Disponíveis" value={available} icon={Heart} color="bg-emerald-50" />
        <StatCard label="Em processo" value={inProcess} icon={ClipboardCheck} color="bg-amber-50" />
        <StatCard label="Adotados" value={adopted} icon={Heart} color="bg-sky-50" />
      </section>

      {/* Ações */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button asChild>
          <Link to="/pets/new">
            <Plus className="mr-2 h-4 w-4" />
            Cadastrar novo pet
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/meus-pets">
            Ver todos os pets
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      {/* Lista resumida */}
      <section className="mt-8" aria-label="Pets recentes">
        <h2 className="mb-3 text-lg font-bold text-foreground">Pets recentes</h2>
        {isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : pets.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-border bg-card p-8 text-center">
            <PawPrint className="mx-auto h-12 w-12 text-muted-foreground" aria-hidden="true" />
            <h3 className="mt-4 text-lg font-bold">Você ainda não cadastrou nenhum pet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Comece cadastrando um pet para adoção.
            </p>
            <Button asChild className="mt-4">
              <Link to="/pets/new">
                <Plus className="mr-2 h-4 w-4" />
                Cadastrar primeiro pet
              </Link>
            </Button>
          </div>
        ) : (
          <ul className="space-y-2" data-testid="donor-dashboard-pet-list">
            {pets.slice(0, 5).map((pet) => (
              <li
                key={pet.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
              >
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {pet.photo_url ? (
                    <img src={pet.photo_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <PawPrint className="h-full w-full p-2 text-muted-foreground" aria-hidden="true" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate font-semibold">{pet.title || pet.name || 'Sem nome'}</p>
                  <p className="text-xs text-muted-foreground">
                    #{pet.pet_code || pet.pet_seq} · {pet.species || '—'}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[pet.status] || 'bg-gray-100 text-gray-800'}`}
                >
                  {STATUS_LABELS[pet.status] || pet.status}
                </span>
                <div className="flex shrink-0 items-center gap-1">
                  <Button asChild size="icon" variant="ghost">
                    <Link to={`/pet/${pet.id}`} aria-label="Ver">
                      <Eye className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild size="icon" variant="ghost">
                    <Link to={`/pets/${pet.id}/edit`} aria-label="Editar">
                      <Edit className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className={`rounded-xl ${color} p-4`}>
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" aria-hidden="true" />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}

export default DonorDashboard;
