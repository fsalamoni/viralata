import { useMemo } from 'react';
import { Heart, Home as HomeIcon, Building2, ChevronRight, Calendar, Award } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/core/lib/utils';

/**
 * TASK-247: Cross-roster agregado no /perfil
 * Mostra AMBOS os papéis (Voluntário + Lar Temporário) em uma única seção,
 * consolidando contadores de abrigos vinculados, escalas abertas, animais em
 * LT e certificados disponíveis. Cross-sell: se o user é LT mas não voluntário,
 * oferecer entrar como voluntário do abrigo também.
 */
export function CrossRosterSection({ volunteerData, fosterData, shelterOptions = [], onJoinVolunteer }) {
  const isVolunteer = !!volunteerData?.shelterId;
  const isFoster = (fosterData?.activeFosters || []).length > 0;

  // Só mostra se user tem QUALQUER um dos papéis
  if (!isVolunteer && !isFoster) return null;

  // Contadores agregados
  const fosterCount = fosterData?.activeFosters?.length || 0;
  const shelterCount = useMemo(() => {
    const set = new Set();
    if (volunteerData?.shelterId) set.add(volunteerData.shelterId);
    fosterData?.activeFosters?.forEach((f) => f.shelterId && set.add(f.shelterId));
    return set.size;
  }, [volunteerData?.shelterId, fosterData?.activeFosters]);

  // Animais em LT agrupados por abrigo
  const fostersByShelter = useMemo(() => {
    const map = {};
    (fosterData?.activeFosters || []).forEach((f) => {
      if (!map[f.shelterId]) map[f.shelterId] = [];
      map[f.shelterId].push(f);
    });
    return map;
  }, [fosterData?.activeFosters]);

  return (
    <section className="rounded-[24px] p-6 lg:p-7" data-testid="cross-roster-section">
      <div className="arena-section-card-header">
        <h3 className="arena-section-card-title" className="flex items-center gap-2 text-base font-bold">
          <Building2 className="w-[19px] h-[19px] text-primary" />
          Sua atuação na rede
        </h3>
        <p className="arena-section-card-description">
          {isVolunteer && isFoster
            ? 'Voluntário e Lar Temporário — seu impacto consolidado.'
            : isVolunteer
            ? 'Voluntário — veja escalas abertas e certificados.'
            : 'Lar Temporário — cadastre-se como voluntário também.'}
        </p>
      </div>

      <div className="arena-section-card-body p-0 space-y-4">
        {/* Badges agregados */}
        <div className="flex flex-wrap gap-2">
          {isVolunteer && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[11.5px] font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
              <Heart className="w-3.5 h-3.5" /> Voluntário
            </span>
          )}
          {isFoster && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-[11.5px] font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
              <HomeIcon className="w-3.5 h-3.5" /> Lar Temporário
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-[11.5px] font-semibold text-blue-800 dark:bg-blue-950/40 dark:text-blue-200">
            <Building2 className="w-3.5 h-3.5" /> {shelterCount} abrigo{shelterCount !== 1 ? 's' : ''}
          </span>
          {isFoster && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-3 py-1 text-[11.5px] font-semibold text-purple-800 dark:bg-purple-950/40 dark:text-purple-200">
              {fosterCount} animal{fosterCount !== 1 ? 'is' : ''} em LT
            </span>
          )}
        </div>

        {/* Cross-sell: se é LT mas não voluntário */}
        {isFoster && !isVolunteer && onJoinVolunteer && (
          <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3 text-[12.5px]">
            <p className="text-foreground/90 mb-2">
              <strong>Quer se voluntariar também?</strong> Ajude o abrigo que confiou em você para o LT.
            </p>
            <button
              type="button"
              onClick={onJoinVolunteer}
              className="inline-flex items-center gap-1 text-primary font-semibold hover:underline"
            >
              Quero ser voluntário <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Lista de abrigos com papel em cada um */}
        {shelterOptions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-[12px] font-bold uppercase tracking-wide text-muted-foreground">
              Por abrigo
            </h4>
            <ul className="space-y-2">
              {shelterOptions.map((s) => {
                const fosters = fostersByShelter[s.id] || [];
                const isVolHere = volunteerData?.shelterId === s.id;
                return (
                  <li
                    key={s.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-card/50 p-2.5 text-[12.5px]"
                  >
                    <span className="font-medium">{s.name || s.id}</span>
                    <div className="flex items-center gap-1.5">
                      {isVolHere && (
                        <span className="inline-flex items-center gap-0.5 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
                          <Heart className="w-3 h-3" /> V
                        </span>
                      )}
                      {fosters.length > 0 && (
                        <span className="inline-flex items-center gap-0.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
                          <HomeIcon className="w-3 h-3" /> LT · {fosters.length}
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Links rápidos */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
          {isVolunteer && (
            <Link
              to="/perfil/voluntario"
              className="inline-flex items-center gap-1 text-[12px] font-semibold text-primary hover:underline"
            >
              <Calendar className="w-3.5 h-3.5" /> Escalas e certificado
            </Link>
          )}
          {isFoster && (
            <Link
              to="/perfil#lares-temporarios"
              className="inline-flex items-center gap-1 text-[12px] font-semibold text-primary hover:underline"
            >
              <Award className="w-3.5 h-3.5" /> Acompanhar LT
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

export default CrossRosterSection;
