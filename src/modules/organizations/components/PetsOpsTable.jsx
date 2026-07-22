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
  ChevronUp, ChevronDown, History, Bath, Stethoscope, Clock, MessageSquare,
  ExternalLink, Hash, PawPrint,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/core/lib/utils';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';

const SPECIES_LABEL = { dog: 'Cachorro', cat: 'Gato', rabbit: 'Coelho', bird: 'Pássaro', other: 'Outro' };
const SIZE_LABEL = { mini: 'Mini', small: 'Pequeno', medium: 'Médio', large: 'Grande', giant: 'Gigante' };

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

const SORT_OPTIONS = [
  { key: 'pet_seq', label: 'ID' },
  { key: 'name', label: 'Nome' },
  { key: 'created_at', label: 'Data de cadastro' },
];

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

export default function PetsOpsTable({ pets = [], isLoading = false, canManage = true, search = '' }) {
  const navigate = useNavigate();
  const [sortKey, setSortKey] = useState('pet_seq');
  const [sortDir, setSortDir] = useState('desc');

  // Filtra por busca (nome, raça, cidade, ID)
  const filtered = useMemo(() => {
    const q = (search || '').toLowerCase().trim();
    if (!q) return pets;
    return pets.filter((p) => {
      const hay = [
        p.name, p.title, p.breed, p.city, p.pet_code,
        String(p.pet_seq || ''), formatPetSeq(p),
      ].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [pets, search]);

  // Ordena
  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let av = a[sortKey];
      let bv = b[sortKey];
      if (sortKey === 'pet_seq') {
        av = a.pet_seq || 0;
        bv = b.pet_seq || 0;
      } else if (sortKey === 'created_at') {
        av = (a.created_at?.seconds || 0);
        bv = (b.created_at?.seconds || 0);
      } else {
        av = String(av || '').toLowerCase();
        bv = String(bv || '').toLowerCase();
      }
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

  function SortHeader({ k, children }) {
    const active = sortKey === k;
    return (
      <button
        type="button"
        onClick={() => handleSort(k)}
        className={cn(
          'inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider transition-colors',
          active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
        )}
      >
        {children}
        {active ? (
          sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
        ) : null}
      </button>
    );
  }

  if (isLoading) {
    return (
      <div className="overflow-x-auto rounded-2xl border border-white bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/60">
              <TableHead className="w-28 px-3 py-3">ID</TableHead>
              <TableHead className="px-3 py-3">Nome</TableHead>
              <TableHead className="px-3 py-3">Espécie</TableHead>
              <TableHead className="px-3 py-3">Status</TableHead>
              <TableHead className="px-3 py-3 text-center">Histórico</TableHead>
              <TableHead className="px-3 py-3 text-center">Cuidados</TableHead>
              <TableHead className="px-3 py-3 text-center">Saúde</TableHead>
              <TableHead className="px-3 py-3 text-center">Timeline</TableHead>
              <TableHead className="px-3 py-3 text-center">Anotações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 4 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 9 }).map((__, j) => (
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

  if (sorted.length === 0) {
    return (
      <EmptyState
        icon={PawPrint}
        title={search ? 'Nenhum resultado' : 'Nenhum animal cadastrado'}
        description={search ? `Nenhum pet encontrado para "${search}".` : 'Adicione uma linha ou importe uma planilha.'}
      />
    );
  }

  return (
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
            <TableHead className="px-3 py-3">Espécie</TableHead>
            <TableHead className="px-3 py-3">Porte</TableHead>
            <TableHead className="px-3 py-3">Status</TableHead>
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
                {/* Status */}
                <TableCell className="px-3 py-2.5">
                  <span className={cn(
                    'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold',
                    STATUS_BADGE[pet.status] || STATUS_BADGE.available,
                  )}>
                    {STATUS_LABEL[pet.status] || '—'}
                  </span>
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
