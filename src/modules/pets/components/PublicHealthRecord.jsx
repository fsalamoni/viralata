/**
 * @fileoverview PublicHealthRecord — prontuário público read-only do pet (TASK-136).
 *
 * **Visível para**: qualquer visitante, autenticado ou não.
 *
 * Lê a subcoleção `pets/{petId}/health_records` (visão pública, paralela
 * à subcoleção `medical` interna) e renderiza APENAS os campos da
 * whitelist, ocultando tudo que é sensível (LGPD + tenant).
 *
 * **Campos VISÍVEIS ao público (whitelist):**
 *  - `name`, `type`, `date`, `vet_name`, `vet_clinic`, `product`, `dosage`
 *
 * **Campos OCULTOS ao público (blacklist — LGPD + abrigo):**
 *  - `clinical_notes`     (notas internas do abrigo)
 *  - `prescription`       (medicação controlada)
 *  - `internal_flags`     (flags internas do abrigo)
 *  - `vet_private_notes`  (anotações privadas do veterinário)
 *
 * **Categorias renderizadas (cards separados):**
 *  - `vaccines`       → Vacinas (name, date, vet_name, vet_clinic)
 *  - `dewormings`     → Vermifugação (product, date)
 *  - `ectoparasites`  → Antipulgas/carrapatos (product, date)
 *
 * **Empty state**: pet sem health records OU sem itens nas 3 categorias
 * públicas → mensagem "Histórico de saúde em construção".
 *
 * **Skeleton**: durante o load (3 linhas pulsando).
 *
 * **Datas**: formatadas em pt-BR (dd 'de' mês 'de' yyyy).
 *
 * @see docs/ROADMAP.md § Saúde Pública
 */

import { useEffect, useState, useMemo } from 'react';
import {
  collection, getDocs, query, orderBy, limit,
} from 'firebase/firestore';
import {
  ShieldCheck, Stethoscope, Bug, Pill, Calendar, User, Building2,
  AlertCircle, FileText,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { db } from '@/core/config/firebase';
import { logger } from '@/core/lib/logger';

// ─── Whitelist / blacklist LGPD ────────────────────────────────────────

/**
 * Whitelist de campos que PODE ser exibido ao público.
 * Qualquer chave fora desta lista é removida antes do render.
 *
 * Por que whitelist (e não blacklist)?
 *  - Defense-in-depth: se um campo novo for adicionado ao doc sem
 *    revisar o LGPD, ele automaticamente NÃO vaza.
 *  - Auditoria: o conjunto de campos públicos fica centralizado.
 */
export const PUBLIC_FIELDS = Object.freeze([
  'id',
  'category',        // 'vaccine' | 'deworming' | 'ectoparasite'
  'type',            // 'vaccine' | 'deworming' | 'ectoparasite' (alias)
  'name',            // ex: 'V10', 'Antirrábica'
  'date',
  'vet_name',
  'vet_clinic',
  'product',         // vermífugo / antipulgas
  'dosage',          // dose aplicada
  'manufacturer',    // opcional — público
  'batch',           // opcional — público (lote)
  'next_dose_date',  // opcional — público (reforço)
]);

/**
 * Blacklist de campos SENSÍVEIS que JAMAIS devem vazar para o público.
 * Esta lista é redundante com a whitelist (filterPublicFields usa
 * whitelist), mas é exportada para que outros componentes possam
 * reusar — ex: ao construir payloads de export LGPD.
 */
export const SENSITIVE_FIELDS = Object.freeze([
  'clinical_notes',
  'prescription',
  'internal_flags',
  'vet_private_notes',
]);

/**
 * Filtra um registro de health_records mantendo APENAS os campos da
 * whitelist. Garante que dados sensíveis (LGPD) não cheguem ao DOM.
 *
 * Aceita tanto `category` quanto `type` como discriminador (alguns
 * docs usam um, outros o outro — o componente lida com os dois).
 *
 * @param {object} record - doc bruto de health_records
 * @returns {object} record sanitizado (somente whitelist)
 */
export function filterPublicFields(record) {
  if (!record || typeof record !== 'object') return null;
  const out = {};
  for (const key of PUBLIC_FIELDS) {
    if (record[key] !== undefined && record[key] !== null) {
      out[key] = record[key];
    }
  }
  // Garante que 'id' seja preservado
  if (record.id) out.id = record.id;
  // Normaliza: 'category' tem prioridade; se não existir, usa 'type'
  if (!out.category && out.type) {
    out.category = out.type;
  }
  return out;
}

// ─── Helpers de formatação PT-BR ───────────────────────────────────────

/**
 * Formata data em pt-BR. Aceita:
 *  - string ISO 8601 (ex: '2026-07-14')
 *  - Firestore Timestamp (com .toDate())
 *  - Date nativo do JS
 *  - undefined / null → retorna '—'
 */
function formatDateBR(value) {
  if (!value) return '—';
  let d = null;
  if (typeof value === 'string') {
    d = new Date(value);
  } else if (value instanceof Date) {
    d = value;
  } else if (typeof value === 'object' && typeof value.toDate === 'function') {
    d = value.toDate();
  } else if (typeof value === 'object' && value.seconds) {
    // Firestore Timestamp serializado
    d = new Date(value.seconds * 1000);
  }
  if (!d || Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

const CATEGORY_LABELS = Object.freeze({
  vaccine: 'Vacinas',
  deworming: 'Vermifugação',
  ectoparasite: 'Antipulgas e carrapatos',
});

const CATEGORY_ICONS = Object.freeze({
  vaccine: ShieldCheck,
  deworming: Pill,
  ectoparasite: Bug,
});

const CATEGORY_TONES = Object.freeze({
  vaccine: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  deworming: 'bg-amber-100 text-amber-800 border-amber-200',
  ectoparasite: 'bg-rose-100 text-rose-800 border-rose-200',
});

/**
 * Subcoleção health_records. Paralela à `medical` interna, mas otimizada
 * para visão pública: menos campos, sem prescription, sem clinical_notes.
 */
const HEALTH_RECORDS_SUBCOLLECTION = 'health_records';

// ─── Componente ────────────────────────────────────────────────────────

/**
 * Prontuário público do pet (read-only LGPD).
 *
 * @param {object} props
 * @param {string} props.petId - ID do pet (path: pets/{petId})
 * @param {string} [props.shelterClubId] - (opcional) só renderiza se pet
 *   pertence a um abrigo. Pets individuais (sem abrigo) também podem ter
 *   health_records — o componente renderiza normalmente.
 * @param {number} [props.maxResults=50] - limite de docs lidos
 */
export function PublicHealthRecord({ petId, shelterClubId, maxResults = 50 }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!petId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const ref = collection(db, 'pets', petId, HEALTH_RECORDS_SUBCOLLECTION);
        const q = query(ref, orderBy('date', 'desc'), limit(maxResults));
        const snap = await getDocs(q);
        if (cancelled) return;

        // Filtra via whitelist — defense-in-depth contra campos sensíveis
        // que possam ter escapado (ex: doc criado com schema antigo)
        const raw = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const filtered = raw
          .map(filterPublicFields)
          .filter((r) => r && (r.category || r.type));
        setRecords(filtered);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        logger.warn('PublicHealthRecord.load', { err: String(err?.message || err) });
        setError(err?.message || 'Não foi possível carregar o histórico de saúde.');
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [petId, maxResults, shelterClubId]);

  // Agrupa por categoria (vaccine / deworming / ectoparasite)
  const grouped = useMemo(() => {
    const groups = { vaccine: [], deworming: [], ectoparasite: [] };
    for (const r of records) {
      const cat = r.category || r.type;
      if (groups[cat]) {
        groups[cat].push(r);
      }
    }
    return groups;
  }, [records]);

  const totalPublic = grouped.vaccine.length + grouped.deworming.length + grouped.ectoparasite.length;

  if (!petId) return null;

  // ─── Skeleton ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <section data-testid="public-health-record-skeleton">
        <div className="arena-section-card-header">
          <h3 className="arena-section-card-title" className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-primary" />
            Saúde
          </h3>
        </div>
        <div className="arena-section-card-body space-y-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-2/3" />
        </div>
      </section>
    );
  }

  // ─── Erro ─────────────────────────────────────────────────────────
  if (error) {
    return (
      <section className="arena-section-card">
        <div className="arena-section-card-header">
          <h3 className="arena-section-card-title" className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-primary" />
            Saúde
          </h3>
        </div>
        <div className="arena-section-card-body">
          <EmptyState
            icon={AlertCircle}
            title="Não foi possível carregar o histórico"
            description={error}
          />
        </div>
      </section>
    );
  }

  // ─── Empty state ──────────────────────────────────────────────────
  if (totalPublic === 0) {
    return (
      <section data-testid="public-health-record-empty">
        <div className="arena-section-card-header">
          <h3 className="arena-section-card-title" className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-primary" />
            Saúde
          </h3>
        </div>
        <div className="arena-section-card-body">
          <EmptyState
            icon={FileText}
            title="Histórico de saúde em construção"
            description="Este pet ainda não tem registros de saúde públicos disponíveis. Quando o abrigo cadastrar vacinas, vermifugação ou antipulgas, eles aparecerão aqui."
          />
        </div>
      </section>
    );
  }

  // ─── Render com dados ─────────────────────────────────────────────
  return (
    <section data-testid="public-health-record">
      <div className="arena-section-card-header">
        <h3 className="arena-section-card-title" className="flex items-center gap-2">
          <Stethoscope className="h-5 w-5 text-primary" />
          Saúde
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          {totalPublic} registro(s) público(s) — apenas itens não sensíveis
          são exibidos (LGPD).
        </p>
      </div>
      <div className="arena-section-card-body space-y-5">
        {Object.entries(CATEGORY_LABELS).map(([cat, label]) => {
          const items = grouped[cat];
          if (!items || items.length === 0) return null;
          const Icon = CATEGORY_ICONS[cat];
          const tone = CATEGORY_TONES[cat];
          return (
            <section key={cat} aria-label={label}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`p-1.5 rounded-md border ${tone}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <h3 className="font-semibold text-sm">{label}</h3>
                <Badge variant="outline" className="text-xs">
                  {items.length}
                </Badge>
              </div>
              <ul className="space-y-2">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-lg border bg-card p-3"
                    data-category={cat}
                  >
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="font-medium text-sm">
                        {item.name || item.product || label}
                      </div>
                      <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDateBR(item.date)}
                      </span>
                    </div>
                    {cat === 'vaccine' && (
                      <div className="mt-1.5 text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
                        {item.vet_name && (
                          <span className="inline-flex items-center gap-1">
                            <User className="h-3 w-3" /> {item.vet_name}
                          </span>
                        )}
                        {item.vet_clinic && (
                          <span className="inline-flex items-center gap-1">
                            <Building2 className="h-3 w-3" /> {item.vet_clinic}
                          </span>
                        )}
                        {item.dosage && <span>Dose: {item.dosage}</span>}
                        {item.manufacturer && <span>· {item.manufacturer}</span>}
                      </div>
                    )}
                    {cat === 'deworming' && (
                      <div className="mt-1.5 text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
                        {item.dosage && <span>Dose: {item.dosage}</span>}
                        {item.manufacturer && <span>· {item.manufacturer}</span>}
                        {item.next_dose_date && (
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> Próxima: {formatDateBR(item.next_dose_date)}
                          </span>
                        )}
                      </div>
                    )}
                    {cat === 'ectoparasite' && (
                      <div className="mt-1.5 text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
                        {item.dosage && <span>Dose: {item.dosage}</span>}
                        {item.manufacturer && <span>· {item.manufacturer}</span>}
                        {item.next_dose_date && (
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> Próxima: {formatDateBR(item.next_dose_date)}
                          </span>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </section>
  );
}

export default PublicHealthRecord;
