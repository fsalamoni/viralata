/**
 * @fileoverview ClubVolunteersPublicTab — aba PÚBLICA "Voluntários" (TASK-263).
 *
 * Mostra:
 * - Contagem de voluntários ativos
 * - Chamada do abrigo: "Precisamos de voluntários para..."
 * - CTA "Quero ser voluntário" → leva ao VolunteerSignup (gated por auth)
 * - Lista dos voluntários (sem info sensível)
 *
 * Mobile-first + a11y:
 * - Botões touch >= 44px
 * - aria-live para mudanças de contagem
 * - focus trap no modal de signup (via Dialog shadcn)
 * - Empty state: "Seja o primeiro voluntário!"
 * - Loading: skeleton
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  HeartHandshake, Users, Sparkles, MapPin, Clock,
  CheckCircle2, Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogFooter,
  DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { listClubMembers } from '../services/clubService';
import { collection, query as fsQuery, where, limit, getDocs } from 'firebase/firestore';
import { db } from '@/core/config/firebase';

/** Filtra apenas voluntários ativos (não admins). */
function filterActiveVolunteers(members) {
  return (members || []).filter((m) => m.role === 'volunteer' && m.status !== 'inactive');
}

/** Busca as "vagas de voluntário" configuradas pelo abrigo. */
async function fetchVolunteerRoles(clubId) {
  if (!db || !clubId) return [];
  const q = fsQuery(
    collection(db, 'clubs', clubId, 'volunteer_roles'),
    where('active', '==', true),
    limit(20),
  );
  const snap = await getDocs(q).catch(() => ({ docs: [] }));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Modal de signup inline (campos leves + redireciona ao /voluntarios/seja?abrigo=ID) */
function VolunteerSignupInlineDialog({ open, onOpenChange, clubId, clubName, isAuthenticated }) {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Salva intent no localStorage para o VolunteerSignup capturar
      try {
        localStorage.setItem('viralata:volunteer_intent', JSON.stringify({
          clubId, clubName, name, email, message,
          submitted_at: new Date().toISOString(),
        }));
      } catch (e) { void e; }
      if (isAuthenticated) {
        navigate(`/voluntarios/seja?abrigo=${clubId}`);
      } else {
        navigate(`/login?from=${encodeURIComponent(`/abrigos/${clubId}`)}&reason=volunteer`);
      }
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Quero ser voluntário de {clubName || 'este abrigo'}</DialogTitle>
          <DialogDescription>
            Deixe seus dados e uma mensagem. Após o login, você será direcionado
            para a página de inscrição.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="vol-name">Seu nome</Label>
            <Input
              id="vol-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
            />
          </div>
          <div>
            <Label htmlFor="vol-email">E-mail</Label>
            <Input
              id="vol-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div>
            <Label htmlFor="vol-msg">Por que você quer ser voluntário?</Label>
            <Textarea
              id="vol-msg"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="Ex.: Tenho experiência com golden retrievers e quero ajudar nos finais de semana..."
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting} className="min-h-[44px]">
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...
                </>
              ) : (
                <>
                  <HeartHandshake className="mr-2 h-4 w-4" />
                  {isAuthenticated ? 'Continuar inscrição' : 'Entrar e continuar'}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function ClubVolunteersPublicTab({ clubId, club }) {
  // navigate/location removidos (signup é gerenciado internamente pelo Dialog)
  const { isAuthenticated } = useAuth();
  const [signupOpen, setSignupOpen] = useState(false);
  const [view, setView] = useState('about'); // 'about' | 'volunteers'

  // 1) Membros (voluntários)
  const { data: members = [], isLoading: isMembersLoading } = useQuery({
    queryKey: ['club-members-public', clubId],
    queryFn: () => listClubMembers(clubId),
    enabled: !!clubId,
  });

  const activeVolunteers = React.useMemo(() => filterActiveVolunteers(members), [members]);

  // 2) Vagas configuradas pelo abrigo
  const { data: roles = [], isLoading: isRolesLoading } = useQuery({
    queryKey: ['club-volunteer-roles', clubId],
    queryFn: () => fetchVolunteerRoles(clubId),
    enabled: !!clubId,
  });

  // Loading state
  if (isMembersLoading && isRolesLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  // Empty state (sem voluntários)
  if (activeVolunteers.length === 0 && roles.length === 0) {
    return (
      <div className="space-y-4">
        <EmptyState
          icon={HeartHandshake}
          title="Seja o primeiro voluntário!"
          description={`${club?.name || 'Este abrigo'} ainda não tem voluntários cadastrados. Que tal ser o primeiro a fazer a diferença?`}
          action={
            <Button onClick={() => setSignupOpen(true)} className="min-h-[44px]">
              <HeartHandshake className="mr-2 h-4 w-4" /> Quero ser voluntário
            </Button>
          }
        />
        <VolunteerSignupInlineDialog
          open={signupOpen}
          onOpenChange={setSignupOpen}
          clubId={clubId}
          clubName={club?.name}
          isAuthenticated={isAuthenticated}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats banner com contagem em aria-live */}
      <Card
        className="rounded-2xl border-primary/20 bg-primary/5"
        role="region"
        aria-label="Contagem de voluntários"
      >
        <CardContent className="flex flex-wrap items-center gap-4 p-5 sm:p-6">
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10"
            aria-hidden="true"
          >
            <Users className="h-6 w-6 text-primary" />
          </span>
          <div className="min-w-0 flex-1">
            <p
              className="font-['Sora'] text-2xl font-bold text-foreground"
              aria-live="polite"
            >
              {activeVolunteers.length}{' '}
              {activeVolunteers.length === 1 ? 'voluntário ativo' : 'voluntários ativos'}
            </p>
            <p className="text-sm text-muted-foreground">
              Ajudando a transformar a vida de pets todos os dias
            </p>
          </div>
          <Button
            size="lg"
            onClick={() => setSignupOpen(true)}
            className="min-h-[44px]"
            aria-label="Inscrever-se como voluntário deste abrigo"
          >
            <HeartHandshake className="mr-2 h-4 w-4" /> Quero ser voluntário
          </Button>
        </CardContent>
      </Card>

      {/* Vagas abertas (configurável pelo abrigo) */}
      {roles.length > 0 && (
        <section aria-labelledby="open-roles">
          <h2
            id="open-roles"
            className="mb-3 flex items-center gap-2 text-base font-semibold text-foreground"
          >
            <Sparkles className="h-4 w-4 text-amber-500" />
            Estamos precisando de voluntários para:
          </h2>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2" role="list">
            {roles.map((role) => (
              <li key={role.id}>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <span
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100"
                        aria-hidden="true"
                      >
                        <HeartHandshake className="h-5 w-5 text-amber-700" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-foreground">
                          {role.title || 'Vaga de voluntariado'}
                        </p>
                        {role.description && (
                          <p className="mt-1 text-sm text-muted-foreground">
                            {role.description}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                          {role.time_commitment && (
                            <Badge variant="secondary" className="gap-1">
                              <Clock className="h-3 w-3" />
                              {role.time_commitment}
                            </Badge>
                          )}
                          {role.location && (
                            <Badge variant="secondary" className="gap-1">
                              <MapPin className="h-3 w-3" />
                              {role.location}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Tabs: Sobre | Lista de voluntários */}
      <Tabs value={view} onValueChange={setView}>
        <TabsList className="grid w-full grid-cols-2" role="tablist">
          <TabsTrigger value="about" role="tab">
            <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Como ajudar
          </TabsTrigger>
          <TabsTrigger value="volunteers" role="tab">
            <Users className="mr-1.5 h-3.5 w-3.5" />
            Voluntários ({activeVolunteers.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="about" className="mt-4 space-y-4 outline-none">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Como você pode ajudar</CardTitle>
              <CardDescription>
                Existem muitas formas de contribuir com este abrigo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-foreground" role="list">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span><strong>Passeios:</strong> leve os dogs para passear nos finais de semana</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span><strong>Transporte:</strong> leve pets para consultas veterinárias</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span><strong>Eventos:</strong> ajude em feiras de adoção e eventos de arrecadação</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span><strong>Cuidados:</strong> ajude na limpeza, alimentação e socialização dos pets</span>
                </li>
              </ul>
              <div className="mt-4 flex justify-center">
                <Button onClick={() => setSignupOpen(true)} className="min-h-[44px]">
                  <HeartHandshake className="mr-2 h-4 w-4" />
                  Quero me inscrever
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="volunteers" className="mt-4 outline-none">
          {activeVolunteers.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Nenhum voluntário público ainda"
              description="A equipe do abrigo ainda não listou os voluntários publicamente."
            />
          ) : (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2" role="list">
              {activeVolunteers.slice(0, 12).map((m) => {
                const name = m.display_name || m.name || 'Voluntário';
                return (
                  <li key={m.id}>
                    <Card>
                      <CardContent className="flex items-center gap-3 p-4">
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary"
                          aria-hidden="true"
                        >
                          {name.slice(0, 1).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {name}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            Voluntário
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}
        </TabsContent>
      </Tabs>

      <VolunteerSignupInlineDialog
        open={signupOpen}
        onOpenChange={setSignupOpen}
        clubId={clubId}
        clubName={club?.name}
        isAuthenticated={isAuthenticated}
      />
    </div>
  );
}
