import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getDocs, collection, query, where } from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { ArrowLeft, Heart, MapPin, Trash2, CheckCircle2, XCircle,
  Hourglass, CalendarCheck, MessageCircle, BadgeCheck } from 'lucide-react';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { useInterestsByUser, useDeleteInterest } from '../hooks/usePets';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from 'sonner';

/**
 * Página "Meus Interesses" — lista os pets nos quais o usuário demonstrou
 * interesse (curtiu). Mostra o status do interesse E o estado do pet
 * (ainda disponível, em processo, adotado por você, adotado por outro,
 * interesse rejeitado). Mesmo quando o usuário "não foi selecionado", o
 * card continua exibindo o pet (em tons de cinza) para preservar o
 * histórico afetivo e permitir revisitar — pode ser útil reativar conversa
 * se algo mudar, ou simplesmente reencontrar o animal.
 */
export default function MyInterests() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: interests = [], isLoading } = useInterestsByUser(user?.uid);
  const [confirmRemove, setConfirmRemove] = useState(null);
  const [removing, setRemoving] = useState(false);
  const deleteInterest = useDeleteInterest();

  // Enriquece cada interesse com o doc do pet (para status, foto, dados).
  // Uma única query Firestore `where('__name__', 'in', [...pet_ids])` para
  // manter as regras de hooks e evitar N chamadas.
  const { data: petsById = {}, isLoading: petsLoading } = usePetsById(interests.map((i) => i.pet_id));

  const items = useMemo(() => interests.map((it) => {
    const pet = petsById[it.pet_id] || null;
    return { interest: it, pet, petLoading: petsLoading && !pet };
  }), [interests, petsById, petsLoading]);

  const handleRemove = async () => {
    if (!confirmRemove) return;
    setRemoving(true);
    try {
      await deleteInterest.mutateAsync(confirmRemove.petId);
      toast.success('Interesse removido. O pet continua aparecendo para você no feed.');
    } catch (e) {
      toast.error(e?.message || 'Não foi possível remover o interesse.');
    } finally {
      setRemoving(false);
      setConfirmRemove(null);
    }
  };

  if (isLoading) {
    return (
      <div className="arena-page mx-auto max-w-4xl px-5 py-6 pb-12 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-44 rounded-[1.75rem]" />
        <Skeleton className="h-44 rounded-[1.75rem]" />
      </div>
    );
  }

  if (interests.length === 0) {
    return (
      <div className="arena-page mx-auto max-w-2xl px-5 py-6 pb-12 text-center space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
        <Card className="rounded-[1.75rem] border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Heart className="h-12 w-12 text-muted-foreground/40" />
            <h2 className="text-lg font-semibold">Você ainda não demonstrou interesse em nenhum pet</h2>
            <p className="text-sm text-muted-foreground max-w-md">
              Quando você clicar em <strong>&quot;Tenho interesse&quot;</strong> na página de um pet,
              ele aparecerá aqui para acompanhar conversas, saber se foi aprovado,
              e remover o interesse se mudar de ideia.
            </p>
            <Button asChild className="mt-2">
              <Link to="/feed">Explorar pets no feed</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="arena-page mx-auto max-w-4xl px-5 py-6 pb-12 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Button>
          <h1 className="font-['Sora'] text-[26px] font-extrabold mt-1">Meus Interesses</h1>
          <p className="text-sm text-muted-foreground">
            Pets que você curtiu. Acompanhe o status, converse e remova quando quiser.
          </p>
        </div>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2">
        {items.map(({ interest, pet, petLoading }) => (
          <li key={interest.id}>
            <InterestCard
              interest={interest}
              pet={pet}
              petLoading={petLoading}
              onOpen={() => navigate(`/pets/${interest.pet_id}`)}
              onRemove={() => setConfirmRemove({ petId: interest.pet_id, title: pet?.title || pet?.name || 'este pet' })}
            />
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={Boolean(confirmRemove)}
        onOpenChange={(v) => !v && setConfirmRemove(null)}
        title="Remover interesse?"
        description={`Tem certeza que deseja remover seu interesse em ${confirmRemove?.title || 'este pet'}? O pet continua aparecendo para você no feed — só removemos o registro da sua lista.`}
        confirmLabel="Remover"
        cancelLabel="Cancelar"
        destructive
        loading={removing}
        onConfirm={handleRemove}
      />
    </div>
  );
}

/**
 * Carrega todos os pets referenciados pelos interesses do usuário em
 * UMA única query Firestore (where('__name__', 'in', [...])), depois
 * devolve um mapa `id -> petDoc`. Trata a lista vazia (zero interesses)
 * sem disparar query.
 */
function usePetsById(petIds) {
  const stableKey = useMemo(() => [...petIds].sort().join(','), [petIds]);
  return useQuery({
    queryKey: ['my_interests', 'pets', stableKey],
    queryFn: async () => {
      if (!db || petIds.length === 0) return {};
      // Firestore `in` aceita até 30 — bem acima do uso típico.
      const q = query(collection(db, 'pets'), where('__name__', 'in', petIds.slice(0, 30)));
      const snap = await getDocs(q);
      const map = {};
      snap.docs.forEach((d) => {
        const data = d.data();
        map[d.id] = { id: d.id, ...data };
      });
      // Para IDs sem retorno (pets apagados), marca como null explicitamente
      petIds.forEach((id) => { if (!(id in map)) map[id] = null; });
      return map;
    },
    enabled: petIds.length > 0,
    staleTime: 1000 * 60,
  });
}

/**
 * Card de um interesse. Mostra:
 * - Foto do pet (em tons de cinza quando "perdido" — rejeitado ou adotado por outro)
 * - Nome + cidade/UF
 * - Badge de status:
 *     - Adotado por VOCÊ: verde, feliz
 *     - Adotado por outro: cinza com aviso "Não foi dessa vez"
 *     - Rejeitado: cinza com aviso
 *     - Em conversa: amarelo
 *     - Aguardando: neutro
 *     - Pet removido: cinza "Pet removido"
 * - Botão "Ver pet" (vai pra página do pet, mesmo se cinza)
 * - Lixeira pra remover o interesse (apaga do Meus Interesses, NÃO remove o pet)
 */
function InterestCard({ interest, pet, petLoading, onOpen, onRemove }) {
  const petDeleted = !petLoading && !pet;

  const status = interest.status;
  const normalized = !petDeleted
    ? computeBadge({
        interestStatus: status,
        petStatus: pet?.status,
        adoptedBy: pet?.adopted_by,
        currentUid: interest.user_id,
      })
    : { tone: 'muted', icon: 'trash', label: 'Pet removido', sub: 'O responsável apagou este pet.' };

  const grayscale = normalized.tone === 'archived';
  const photoUrl = pet?.photos?.[0]?.url || pet?.photos?.[0] || null;

  return (
    <Card className={`overflow-hidden rounded-[1.75rem] border-border/60 ${grayscale ? 'bg-muted/40' : ''}`}>
      <button
        type="button"
        onClick={onOpen}
        className="block w-full text-left transition-opacity hover:opacity-95"
        aria-label={`Ver pet ${pet?.title || pet?.name || ''}`}
      >
        <div className="relative aspect-[4/3] w-full bg-secondary/40 overflow-hidden">
          {petLoading ? (
            <Skeleton className="absolute inset-0" />
          ) : photoUrl ? (
            <img
              src={photoUrl}
              alt=""
              className={`absolute inset-0 h-full w-full object-cover ${grayscale ? 'grayscale opacity-70' : ''}`}
              loading="lazy"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              <Heart className="h-12 w-12 opacity-30" />
            </div>
          )}
          <div className={`absolute top-3 left-3 right-3 flex items-start gap-2 ${grayscale ? 'opacity-90' : ''}`}>
            <StatusBadge {...normalized} />
          </div>
        </div>
      </button>

      <CardContent className="space-y-3 p-4">
        <div>
          <h3 className={`text-base font-bold leading-tight ${grayscale ? 'text-muted-foreground' : 'text-foreground'}`}>
            {pet?.title || pet?.name || (petLoading ? 'Carregando...' : 'Pet')}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {pet?.species ? `${speciesLabel(pet.species)} · ${sizeLabel(pet.size) || 'porte não informado'}` : null}
          </p>
        </div>

        {pet?.city && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            {pet.city}{pet.state ? `, ${pet.state}` : ''}
          </div>
        )}

        {normalized.sub && (
          <p className="text-[13px] text-muted-foreground leading-snug">{normalized.sub}</p>
        )}

        <div className="flex items-center gap-2 pt-1">
          <Button size="sm" variant="outline" onClick={onOpen} className="flex-1">
            Ver pet
          </Button>
          {!petDeleted && (
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:bg-destructive/10"
              onClick={onRemove}
              aria-label="Remover interesse"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ tone, icon, label }) {
  const tones = {
    positive: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
    warning: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
    muted: 'bg-secondary text-secondary-foreground border-border',
    archived: 'bg-muted text-muted-foreground border-border',
    negative: 'bg-destructive/10 text-destructive border-destructive/30',
  };
  const cls = tones[tone] || tones.muted;

  const Icon = {
    check: CheckCircle2,
    hourglass: Hourglass,
    chat: MessageCircle,
    calendar: CalendarCheck,
    badge: BadgeCheck,
    x: XCircle,
    trash: Trash2,
  }[icon] || Heart;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold shadow-sm ${cls}`}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

function computeBadge({ interestStatus, petStatus, adoptedBy, currentUid }) {
  // Adotado por VOCÊ: status positivo. Foto colorida.
  if (petStatus === 'adopted' && adoptedBy && adoptedBy === currentUid) {
    return { tone: 'positive', icon: 'badge', label: 'Adotado por você! \u{1F389}', sub: 'Você levou este pet para casa. Parabéns!' };
  }
  // Adotado por OUTRO: archived, pet visível em cinza.
  if (petStatus === 'adopted') {
    return { tone: 'archived', icon: 'x', label: 'Adotado por outra pessoa', sub: 'Não foi dessa vez, mas o pet apareceu por um motivo. Você ainda pode visitar o perfil dele.' };
  }
  // Rejeitado.
  if (interestStatus === 'rejected') {
    return { tone: 'archived', icon: 'x', label: 'Interesse não selecionado', sub: 'O responsável optou por outro candidato. Continue procurando — tem muito pet querendo um lar.' };
  }
  // Em conversa.
  if (interestStatus === 'chat_opened') {
    return { tone: 'warning', icon: 'chat', label: 'Conversa aberta', sub: petStatus === 'in_process' ? 'Você está conversando com o responsável sobre este pet.' : 'A conversa está em aberto.' };
  }
  // Pet em processo de adoção (alguém foi selecionado).
  if (petStatus === 'in_process') {
    return { tone: 'warning', icon: 'hourglass', label: 'Em adoção', sub: 'O pet está em processo de adoção. Aguarde novas atualizações.' };
  }
  // Pendente padrão.
  if (interestStatus === 'pending') {
    return { tone: 'muted', icon: 'hourglass', label: 'Aguardando responsável', sub: 'O responsável ainda não respondeu. Você será notificado quando houver novidade.' };
  }
  // Fallback razoável.
  return { tone: 'muted', icon: 'heart', label: 'Tenho interesse', sub: null };
}

function speciesLabel(s) {
  const map = { dog: 'Cachorro', cat: 'Gato', other: 'Outro' };
  return map[s] || s;
}

function sizeLabel(s) {
  const map = { small: 'Pequeno', medium: 'Médio', large: 'Grande' };
  return map[s] || null;
}
