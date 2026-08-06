/**
 * @fileoverview PetsOpsTable — tabela operacional de pets do abrigo.
 *
 * TASK-V3-PET-OPS-LOG (2026-07-22): tabela com 1 linha por pet, com:
 *  - Coluna 1: **ID do pet** (pet_seq, IMUTÁVEL) — clicável, leva ao
 *    painel admin do pet (/pets/<id>) que o usuário autorizado pode abrir
 *  - Colunas seguintes: **Histórico**, **Cuidados**, **Saúde**, **Timeline**,
 *    **Anotações** — cada uma é um atalho para a seção correspondente
 *    do painel admin do pet (via hash router).
 *
 * D-PET-OPS-TABLE-PRIMARY-NAVIGATION: cada linha da tabela é um ponto de
 * entrada para o painel admin do pet. O ID é o número imutável (pet_seq)
 * que identifica o pet permanentemente.
 *
 * D-PET-SEQ-IMMUTABLE-DISPLAY: o ID do pet é o `pet_seq` (number), NUNCA o
 * Firestore docId. Formato exibido: #000001 (com zeros à esquerda).
 */
import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ChevronUp, ChevronDown, ChevronsUpDown, History, Bath, Stethoscope, Clock, MessageSquare,
  Hash, PawPrint, Search, SlidersHorizontal, X,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/core/lib/utils';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import { daysInShelter, CURRENT_LOCATION_LABELS } from '@/modules/shelter/domain/core/animal';

const SPECIES_LABEL = { dog: 'Cachorro', cat: 'Gato', rabbit: 'Coelho', bird: 'Pássaro', other: 'Outro' };
const SIZE_LABEL = { mini: 'Mini', small: 'Pequeno', medium: 'Médio', large: 'Grande', giant: 'Gigante' };
const GENDER_LABEL = { male: 'Macho', female: 'Fêmea' };
const AGE_LABEL = { puppy: 'Filhote', adult: 'Adulto', senior: 'Idoso' };

/** Formata uma data (ISO ou 'YYYY-MM-DD' ou Firestore Timestamp) em pt-BR curto. */
function formatShortDate(value) {
  if (!value) return null;
  try {
    const d = value?.seconds ? new Date(value.seconds * 1000) : new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString('pt-BR');
  } catch {
    return null;
  }
}

const STATUS_BADGE = {
  available: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  in_process: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  adopted: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  unavailable: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400',
};

const STATUS_LABEL = {
  available: 'Disponível',
  in_process: 'Em processo',
  adopted: 'Adotado',
  unavailable: 'Indisponível',
};

const NEUTERED_LABEL = { true: 'Sim', false: 'Não' };

/** Converte um mapa {valor: rótulo} em [{value, label}] para os <select>. */
function toOptions(map) {
  return Object.entries(map).map(([value, label]) => ({ value, label }));
}

/**
 * Formata pet_seq como #000001 (com zeros à esquerda, 6 dígitos).
 * Se pet_seq for null (pet antigo), usa 0 com fallback.
 */
function formatPetSeq(pet) {
  const seq = pet?.pet_seq;
  if (typeof seq === 'number' && Number.isFinite(seq) && seq > 0) {
    return `#${String(seq).padStart(6, '0')}`;
  }
  // Fallback para pets antigos: usa pet_code (VLT-000123) ou docId
  return pet?.pet_code || `#${(pet?.id || '').slice(0, 6)}`;
}

/**
 * Coleta recursivamente TODOS os valores primitivos de um objeto pet num
 * array de strings, para a busca global "por qualquer informação". Trata
 * Timestamps do Firestore como data formatada e limita a profundidade para
 * evitar estruturas cíclicas/pesadas.
 */
function collectValues(value, acc, depth = 0) {
  if (value == null || depth > 5) return;
  const t = typeof value;
  if (t === 'string' || t === 'number' || t === 'boolean') {
    acc.push(String(value));
    return;
  }
  if (t !== 'object') return;
  if (typeof value.seconds === 'number') {
    const d = formatShortDate(value);
    if (d) acc.push(d);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((v) => collectValues(v, acc, depth + 1));
    return;
  }
  Object.values(value).forEach((v) => collectValues(v, acc, depth + 1));
}

/**
 * Monta o "palheiro" de busca de um pet: os valores brutos (deep) MAIS os
 * rótulos legíveis (Cachorro, Disponível, Castrado…) e datas, para que a
 * busca funcione tanto pelo valor quanto pelo texto que o usuário vê.
 */
function petHaystack(pet) {
  const acc = [];
  collectValues(pet, acc);
  acc.push(
    SPECIES_LABEL[pet.species] || '',
    SIZE_LABEL[pet.size] || '',
    GENDER_LABEL[pet.gender] || '',
    AGE_LABEL[pet.age_group] || '',
    STATUS_LABEL[pet.status] || '',
    CURRENT_LOCATION_LABELS[pet.current_location] || '',
    pet.neutered ? 'castrado sim' : 'não castrado',
    formatPetSeq(pet),
  );
  return acc.join(' ').toLowerCase();
}

/** Valor de ordenação por coluna (número para colunas numéricas; texto senão). */
function sortValue(pet, key) {
  switch (key) {
    case 'pet_seq': return pet.pet_seq || 0;
    case 'name': return (pet.name || pet.title || '').toLowerCase();
    case 'species': return (SPECIES_LABEL[pet.species] || pet.species || '').toLowerCase();
    case 'size': return (SIZE_LABEL[pet.size] || pet.size || '').toLowerCase();
    case 'gender': return (GENDER_LABEL[pet.gender] || '').toLowerCase();
    case 'age_group': return (AGE_LABEL[pet.age_group] || '').toLowerCase();
    case 'neutered': return pet.neutered ? 1 : 0;
    case 'rescue': return (pet.rescue_number || '').toLowerCase();
    case 'days': {
      const d = daysInShelter(pet);
      return typeof d === 'number' ? d : -1;
    }
    case 'current_location': return (CURRENT_LOCATION_LABELS[pet.current_location] || '').toLowerCase();
    case 'status': return (STATUS_LABEL[pet.status] || '').toLowerCase();
    case 'created_at': return pet.created_at?.seconds || 0;
    default: return '';
  }
}

/** Aplica os filtros por coluna a um pet. Retorna true se passa em todos. */
function matchesFilters(pet, filters) {
  for (const [key, raw] of Object.entries(filters)) {
    if (!raw) continue;
    const val = String(raw);
    if (key === 'neutered') {
      if (String(!!pet.neutered) !== val) return false;
    } else if (key === 'pet_seq') {
      const seq = `${formatPetSeq(pet)} ${pet.pet_seq || ''} ${pet.pet_code || ''}`.toLowerCase();
      if (!seq.includes(val.toLowerCase())) return false;
    } else if (key === 'name') {
      if (!(pet.name || pet.title || '').toLowerCase().includes(val.toLowerCase())) return false;
    } else if (key === 'rescue') {
      if (!(pet.rescue_number || '').toLowerCase().includes(val.toLowerCase())) return false;
    } else if ((pet[key] || '') !== val) {
      // Colunas enum: match exato do valor bruto.
      return false;
    }
  }
  return true;
}

export default function PetsOpsTable({ pets = [], isLoading = false, canManage = true, search = '' }) {
  const navigate = useNavigate();
  const [sortKey, setSortKey] = useState('pet_seq');
  const [sortDir, setSortDir] = useState('desc');
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({});

  // Busca global "por qualquer informação": termo do prop (externo) + o
  // digitado na própria tabela; casa em qualquer valor dos dados do pet.
  const searchTerm = `${search || ''} ${query || ''}`.toLowerCase().trim();

  const activeFilterCount = useMemo(
    () => Object.values(filters).filter(Boolean).length,
    [filters],
  );

  // Filtra por busca global + filtros por coluna.
  const filtered = useMemo(() => {
    const terms = searchTerm.split(/\s+/).filter(Boolean);
    return pets.filter((p) => {
      if (activeFilterCount > 0 && !matchesFilters(p, filters)) return false;
      if (terms.length === 0) return true;
      const hay = petHaystack(p);
      return terms.every((t) => hay.includes(t));
    });
  }, [pets, searchTerm, filters, activeFilterCount]);

  // Ordena por qualquer coluna de dados.
  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const av = sortValue(a, sortKey);
      const bv = sortValue(b, sortKey);
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  function setColFilter(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function clearAll() {
    setQuery('');
    setFilters({});
  }

  function SortHeader({ k, children, className }) {
    const active = sortKey === k;
    return (
      <button
        type="button"
        onClick={() => handleSort(k)}
        className={cn(
          'inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider transition-colors',
          active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
          className,
        )}
        title="Ordenar por esta coluna"
      >
        {children}
        {active
          ? (sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)
          : <ChevronsUpDown className="h-3 w-3 opacity-40" />}
      </button>
    );
  }

  if (isLoading) {
    return (
      <div className="overflow-x-auto rounded-2xl border border-white bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/60">
              {['ID', 'Nome', 'Espécie', 'Porte', 'Sexo', 'Idade', 'Castrado', 'Resgate', 'Dias', 'Localização', 'Status', 'Histórico', 'Cuidados', 'Saúde', 'Timeline', 'Anotações'].map((h) => (
                <TableHead key={h} className="px-3 py-3">{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 4 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 16 }).map((__, j) => (
                  <TableCell key={j} className="px-3 py-2.5">
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  const hasQueryOrFilters = Boolean(searchTerm) || activeFilterCount > 0;

  // Barra de ferramentas: busca global + toggle de filtros + contagem.
  const toolbar = (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por qualquer informação…"
            className="h-9 pl-8"
            aria-label="Buscar animais por qualquer informação"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Limpar busca"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button
          type="button"
          variant={showFilters || activeFilterCount > 0 ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowFilters((s) => !s)}
          className="h-9"
        >
          <SlidersHorizontal className="mr-1.5 h-4 w-4" />
          Filtros
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-1.5 h-5 min-w-5 justify-center rounded-full px-1 text-[11px]">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
        {hasQueryOrFilters && (
          <Button type="button" variant="ghost" size="sm" onClick={clearAll} className="h-9">
            <X className="mr-1 h-4 w-4" /> Limpar
          </Button>
        )}
      </div>
      <p className="shrink-0 text-xs text-muted-foreground">
        {hasQueryOrFilters
          ? `${sorted.length} de ${pets.length}`
          : `${pets.length} ${pets.length === 1 ? 'animal' : 'animais'}`}
      </p>
    </div>
  );

  if (sorted.length === 0) {
    return (
      <div className="space-y-3">
        {toolbar}
        <EmptyState
          icon={PawPrint}
          title={hasQueryOrFilters ? 'Nenhum resultado' : 'Nenhum animal cadastrado'}
          description={hasQueryOrFilters
            ? 'Nenhum pet corresponde à busca/filtros atuais. Ajuste os critérios ou limpe.'
            : 'Adicione uma linha ou importe uma planilha.'}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {toolbar}
      <div className="overflow-x-auto rounded-2xl border border-white bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/60">
              <TableHead className="w-28 px-3 py-3">
                <SortHeader k="pet_seq">ID</SortHeader>
              </TableHead>
              <TableHead className="px-3 py-3">
                <SortHeader k="name">Nome</SortHeader>
              </TableHead>
              <TableHead className="px-3 py-3"><SortHeader k="species">Espécie</SortHeader></TableHead>
              <TableHead className="px-3 py-3"><SortHeader k="size">Porte</SortHeader></TableHead>
              <TableHead className="px-3 py-3"><SortHeader k="gender">Sexo</SortHeader></TableHead>
              <TableHead className="px-3 py-3"><SortHeader k="age_group">Idade</SortHeader></TableHead>
              <TableHead className="px-3 py-3"><SortHeader k="neutered">Castrado</SortHeader></TableHead>
              <TableHead className="px-3 py-3"><SortHeader k="rescue">Resgate</SortHeader></TableHead>
              <TableHead className="px-3 py-3 text-center"><SortHeader k="days">Dias</SortHeader></TableHead>
              <TableHead className="px-3 py-3"><SortHeader k="current_location">Localização</SortHeader></TableHead>
              <TableHead className="px-3 py-3"><SortHeader k="status">Status</SortHeader></TableHead>
              <TableHead className="px-3 py-3 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Histórico
              </TableHead>
              <TableHead className="px-3 py-3 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Cuidados
              </TableHead>
              <TableHead className="px-3 py-3 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Saúde
              </TableHead>
              <TableHead className="px-3 py-3 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Timeline
              </TableHead>
              <TableHead className="px-3 py-3 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Anotações
              </TableHead>
            </TableRow>
            {showFilters && (
              <TableRow className="bg-secondary/30 hover:bg-secondary/30">
                <TableHead className="px-2 py-2">
                  <ColTextFilter value={filters.pet_seq} onChange={(v) => setColFilter('pet_seq', v)} placeholder="ID" />
                </TableHead>
                <TableHead className="px-2 py-2">
                  <ColTextFilter value={filters.name} onChange={(v) => setColFilter('name', v)} placeholder="Nome" />
                </TableHead>
                <TableHead className="px-2 py-2">
                  <ColSelectFilter value={filters.species} onChange={(v) => setColFilter('species', v)} options={toOptions(SPECIES_LABEL)} />
                </TableHead>
                <TableHead className="px-2 py-2">
                  <ColSelectFilter value={filters.size} onChange={(v) => setColFilter('size', v)} options={toOptions(SIZE_LABEL)} />
                </TableHead>
                <TableHead className="px-2 py-2">
                  <ColSelectFilter value={filters.gender} onChange={(v) => setColFilter('gender', v)} options={toOptions(GENDER_LABEL)} />
                </TableHead>
                <TableHead className="px-2 py-2">
                  <ColSelectFilter value={filters.age_group} onChange={(v) => setColFilter('age_group', v)} options={toOptions(AGE_LABEL)} />
                </TableHead>
                <TableHead className="px-2 py-2">
                  <ColSelectFilter value={filters.neutered} onChange={(v) => setColFilter('neutered', v)} options={toOptions(NEUTERED_LABEL)} />
                </TableHead>
                <TableHead className="px-2 py-2">
                  <ColTextFilter value={filters.rescue} onChange={(v) => setColFilter('rescue', v)} placeholder="Nº" />
                </TableHead>
                <TableHead className="px-2 py-2" />
                <TableHead className="px-2 py-2">
                  <ColSelectFilter value={filters.current_location} onChange={(v) => setColFilter('current_location', v)} options={toOptions(CURRENT_LOCATION_LABELS)} />
                </TableHead>
                <TableHead className="px-2 py-2">
                  <ColSelectFilter value={filters.status} onChange={(v) => setColFilter('status', v)} options={toOptions(STATUS_LABEL)} />
                </TableHead>
                <TableHead className="px-2 py-2" colSpan={5} />
              </TableRow>
            )}
          </TableHeader>
        <TableBody>
          {sorted.map((pet) => {
            const seqLabel = formatPetSeq(pet);
            return (
              <TableRow
                key={pet.id}
                className="cursor-pointer transition-colors hover:bg-secondary/40"
                onClick={() => {
                  if (canManage) navigate(`/pets/${pet.id}`);
                }}
              >
                {/* ID — IMUTÁVEL, clicável */}
                <TableCell className="px-3 py-2.5">
                  {canManage ? (
                    <Link
                      to={`/pets/${pet.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 font-mono text-sm font-bold text-primary transition-colors hover:bg-primary/20"
                      title={`Painel administrativo do pet ${seqLabel}`}
                      data-testid={`pets-ops-id-${pet.id}`}
                    >
                      <Hash className="h-3 w-3" />
                      {seqLabel}
                    </Link>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-mono text-sm font-semibold text-muted-foreground">
                      <Hash className="h-3 w-3" />
                      {seqLabel}
                    </span>
                  )}
                </TableCell>
                {/* Nome */}
                <TableCell className="px-3 py-2.5 font-semibold">
                  {pet.name || pet.title || '—'}
                </TableCell>
                {/* Espécie */}
                <TableCell className="px-3 py-2.5 text-sm text-muted-foreground">
                  {SPECIES_LABEL[pet.species] || pet.species || '—'}
                </TableCell>
                {/* Porte */}
                <TableCell className="px-3 py-2.5 text-sm text-muted-foreground">
                  {SIZE_LABEL[pet.size] || pet.size || '—'}
                </TableCell>
                {/* Sexo */}
                <TableCell className="px-3 py-2.5 text-sm text-muted-foreground">
                  {GENDER_LABEL[pet.gender] || '—'}
                </TableCell>
                {/* Idade */}
                <TableCell className="px-3 py-2.5 text-sm text-muted-foreground">
                  {AGE_LABEL[pet.age_group] || '—'}
                </TableCell>
                {/* Castrado */}
                <TableCell className="px-3 py-2.5 text-sm text-muted-foreground">
                  {pet.neutered ? 'Sim' : 'Não'}
                </TableCell>
                {/* Resgate: número + data */}
                <TableCell className="px-3 py-2.5 text-sm">
                  {pet.rescue_number ? (
                    <span className="font-mono font-semibold text-foreground">{pet.rescue_number}</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                  {formatShortDate(pet.rescue_date) && (
                    <span className="block text-xs text-muted-foreground">{formatShortDate(pet.rescue_date)}</span>
                  )}
                </TableCell>
                {/* Dias no abrigo */}
                <TableCell className="px-3 py-2.5 text-center text-sm text-muted-foreground">
                  {daysInShelter(pet) ?? '—'}
                </TableCell>
                {/* Localização atual */}
                <TableCell className="px-3 py-2.5 text-sm text-muted-foreground">
                  {CURRENT_LOCATION_LABELS[pet.current_location] || '—'}
                  {pet.current_location_notes && (
                    <span className="block text-xs text-muted-foreground/80 truncate max-w-[160px]">
                      {pet.current_location_notes}
                    </span>
                  )}
                </TableCell>
                {/* Status + data do status */}
                <TableCell className="px-3 py-2.5">
                  <span className={cn(
                    'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold',
                    STATUS_BADGE[pet.status] || STATUS_BADGE.available,
                  )}>
                    {STATUS_LABEL[pet.status] || '—'}
                  </span>
                  {formatShortDate(pet.status_changed_at) && (
                    <span className="block text-xs text-muted-foreground mt-0.5">{formatShortDate(pet.status_changed_at)}</span>
                  )}
                </TableCell>
                {/* Colunas funcionais: cada uma leva a uma seção do painel admin */}
                <TableCell className="px-3 py-2.5 text-center">
                  <SectionLink petId={pet.id} hash="history" icon={History} color="sky" canManage={canManage} />
                </TableCell>
                <TableCell className="px-3 py-2.5 text-center">
                  <SectionLink petId={pet.id} hash="care" icon={Bath} color="sky" canManage={canManage} />
                </TableCell>
                <TableCell className="px-3 py-2.5 text-center">
                  <SectionLink petId={pet.id} hash="health" icon={Stethoscope} color="emerald" canManage={canManage} />
                </TableCell>
                <TableCell className="px-3 py-2.5 text-center">
                  <SectionLink petId={pet.id} hash="timeline" icon={Clock} color="primary" canManage={canManage} />
                </TableCell>
                <TableCell className="px-3 py-2.5 text-center">
                  <SectionLink petId={pet.id} hash="notes" icon={MessageSquare} color="sky" canManage={canManage} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
        </Table>
      </div>
    </div>
  );
}

/** Filtro de coluna: campo de texto compacto. */
function ColTextFilter({ value = '', onChange, placeholder }) {
  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-8 text-xs"
      onClick={(e) => e.stopPropagation()}
    />
  );
}

/** Filtro de coluna: seletor de valores (enum) com opção "Todos". */
function ColSelectFilter({ value = '', onChange, options }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 w-full rounded-md border border-input bg-background px-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      aria-label="Filtrar coluna"
    >
      <option value="">Todos</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

function SectionLink({ petId, hash, icon: Icon, color = 'primary', canManage }) {
  if (!canManage) {
    return (
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground/40">
        <Icon className="h-3.5 w-3.5" />
      </span>
    );
  }
  const colorClass = {
    primary: 'hover:bg-primary/10 hover:text-primary text-muted-foreground',
    emerald: 'hover:bg-emerald-100 hover:text-emerald-700 text-muted-foreground dark:hover:bg-emerald-900/30 dark:hover:text-emerald-400',
    sky: 'hover:bg-sky-100 hover:text-sky-700 text-muted-foreground dark:hover:bg-sky-900/30 dark:hover:text-sky-400',
    rose: 'hover:bg-rose-100 hover:text-rose-700 text-muted-foreground dark:hover:bg-rose-900/30 dark:hover:text-rose-400',
    amber: 'hover:bg-amber-100 hover:text-amber-700 text-muted-foreground dark:hover:bg-amber-900/30 dark:hover:text-amber-400',
  }[color] || 'hover:bg-primary/10 hover:text-primary text-muted-foreground';

  return (
    <Link
      to={`/pets/${petId}#${hash}`}
      onClick={(e) => e.stopPropagation()}
      className={cn(
        'inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors',
        colorClass,
      )}
      title={`Ir para ${hash}`}
      data-testid={`pets-ops-${hash}-${petId}`}
    >
      <Icon className="h-3.5 w-3.5" />
    </Link>
  );
}
