import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Mail, MessageCircle, Phone, Lock, Eye, EyeOff, Briefcase } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { listClubMembers } from '../services/clubService';
import { filterMemberForViewer, hiddenFields } from '../domain/privacy';
import { PRIVACY_LEVEL_LABELS } from '../domain/constants';
import ClubPublicChatDialog from './ClubPublicChatDialog';

/**
 * Visualização PÚBLICA da aba Equipe. Mostra cards dos membros da ONG
 * aplicando a privacidade individual de cada campo. A ONG pode configurar,
 * por membro, quais informações ficam visíveis para:
 *   - toda a plataforma (public)
 *   - seguidores / membros da ONG (followers)
 *   - apenas para a equipe (members)
 *   - apenas para o próprio membro (private)
 *
 * Visitantes não autenticados enxergam apenas o que estiver marcado como
 * `public`. Visitantes logados (não membros) também. Membros da ONG
 * enxergam o que é `public + followers + members`. O próprio membro
 * sempre vê tudo (campos `private` inclusive).
 */
export default function ClubTeamPublicTab({ clubId, club, viewerMembership }) {
  const { user } = useAuth();
  const [chatFor, setChatFor] = useState(null);

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['club-members-public', clubId],
    queryFn: () => listClubMembers(clubId),
    enabled: !!clubId,
  });

  const viewerContext = useMemo(() => ({
    uid: user?.uid,
    isMemberOfClub: Boolean(viewerMembership),
    isFollower: Boolean(viewerMembership), // todo membro é seguidor
  }), [user?.uid, viewerMembership]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-44 w-full rounded-2xl" />)}
      </div>
    );
  }

  const visible = members.filter((m) => {
    // Filtra quem tem TODOS os campos bloqueados para esse viewer
    const filtered = filterMemberForViewer(m, { viewer: viewerContext, club });
    if (!filtered) return false;
    const hidden = hiddenFields({ member: m, viewer: viewerContext, club });
    const nameField = filtered.user_name || m.user_name;
    return Boolean(nameField) || hidden.length < 8;
  });

  if (visible.length === 0) {
    return (
      <EmptyState
        icon={Briefcase}
        title="Equipe ainda não divulgada"
        description="Esta ONG ainda não disponibilizou informações de sua equipe para o público."
      />
    );
  }

  return (
    // space-y-5 dá mais respiro entre o aviso superior e a grade de
    // cards do que o space-y-3 antigo.
    <div className="space-y-5">
      <p className="text-xs text-muted-foreground">
        Cada membro pode escolher quais informações compartilhar. Apenas o que está liberado para você é exibido abaixo.
      </p>
      {/* gap-4 entre os cards (era gap-3) — coletivo, numa grade de
          2–3 colunas em desktop, faz diferença de respiro. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((m) => {
          const filtered = filterMemberForViewer(m, { viewer: viewerContext, club });
          return (
            <MemberCard
              key={m.id}
              member={filtered}
              viewerContext={viewerContext}
              onStartChat={() => setChatFor(m)}
            />
          );
        })}
      </div>
      {chatFor && (
        <ClubPublicChatDialog
          club={club}
          open={!!chatFor}
          onOpenChange={(o) => !o && setChatFor(null)}
        />
      )}
    </div>
  );
}

function MemberCard({ member, viewerContext, onStartChat }) {
  const hidden = hiddenFields({ member, viewer: viewerContext });
  const initials = (member.user_name || '?')
    .split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?';

  const hasVisibleField =
    member.user_name || member.title || member.bio || member.history
    || member.user_email || member.phone || member.whatsapp;

  if (!hasVisibleField) {
    return (
      <Card className="rounded-2xl">
        <CardContent className="p-7 text-center text-xs text-muted-foreground">
          <Lock className="mx-auto mb-2 h-4 w-4" />
          As informações deste membro estão restritas no momento.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl">
      {/* p-6 sm:p-7 com pt-6 garante que o nome do membro não
          encoste no topo do card. space-y-4 entre as seções internas
          do card (header / bio / ações). */}
      <CardContent className="space-y-4 p-6 pt-6 sm:p-7 sm:pt-7">
        <div className="flex items-start gap-3">
          {member.photo_url ? (
            <img src={member.photo_url} alt="" className="h-12 w-12 shrink-0 rounded-full border border-border object-cover" />
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              {initials}
            </div>
          )}
          <div className="min-w-0 flex-1">
            {member.user_name && <p className="truncate text-sm font-semibold">{member.user_name}</p>}
            {member.title && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                <Briefcase className="mr-1 inline h-3 w-3" /> {member.title}
              </p>
            )}
          </div>
        </div>

        {member.bio && (
          <p className="line-clamp-3 whitespace-pre-wrap text-xs leading-relaxed text-foreground/85">{member.bio}</p>
        )}
        {member.history && (
          <details className="text-[11px] text-muted-foreground">
            <summary className="cursor-pointer font-semibold">Histórico na ONG</summary>
            <p className="mt-1 whitespace-pre-wrap leading-5">{member.history}</p>
          </details>
        )}

        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {member.user_email && (
            <Button asChild size="icon" variant="outline" className="h-8 w-8" title={`E-mail: ${member.user_email}`}>
              <a href={`mailto:${member.user_email}`}><Mail className="h-3.5 w-3.5" /></a>
            </Button>
          )}
          {member.whatsapp && (
            <Button asChild size="icon" variant="outline" className="h-8 w-8" title={`WhatsApp: ${member.whatsapp}`}>
              <a
                href={`https://wa.me/55${String(member.whatsapp).replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
              >
                <Phone className="h-3.5 w-3.5 text-emerald-600" />
              </a>
            </Button>
          )}
          {member.phone && (
            <Button asChild size="icon" variant="outline" className="h-8 w-8" title={`Telefone: ${member.phone}`}>
              <a href={`tel:${String(member.phone).replace(/\D/g, '')}`}><Phone className="h-3.5 w-3.5" /></a>
            </Button>
          )}
          {viewerContext.uid && (
            <Button size="icon" variant="outline" className="h-8 w-8" aria-label="Iniciar chat" onClick={onStartChat}>
              <MessageCircle className="h-3.5 w-3.5 text-primary" />
            </Button>
          )}
        </div>

        {hidden.length > 0 && (
          <p className="inline-flex items-center gap-1 pt-1 text-[10px] text-muted-foreground">
            <EyeOff className="h-3 w-3" /> Algumas informações estão ocultas para você.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
