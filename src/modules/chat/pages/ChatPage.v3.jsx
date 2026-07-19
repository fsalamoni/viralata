/**
 * @fileoverview ChatPage V3 — redesign completo no padrão DS-V2.
 *
 * TASK-V3-CHAT: implementação do zero, sem aproveitar o JSX do V1.
 *
 * Funcionalidades:
 *  - Hero com gradient (sky-500→indigo-600→violet-600)
 *  - 3 stat cards (Total, Não lidas, Online)
 *  - Tabs de filtro (Todas / Diretas / Grupos / Não lidas)
 *  - Busca avançada com clear
 *  - Conversations list (grid 1/2 colunas) com avatar + última msg + unread badge
 *  - Empty state rico
 *  - Error state com retry
 *  - Loading com skeleton
 *  - SEO + JSON-LD
 *  - Dark mode com tokens DS-V2
 *  - Mobile-first
 *  - A11y WCAG AA
 *  - Real-time updates via useConversations
 *
 * Rota: /chat
 *
 * @see docs/REGENCY_CHAT_V3.md
 */
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  MessageCircle, Plus, Search, Users, User as UserIcon,
  AlertCircle, RefreshCw, Hash, Sparkles, MessageSquare,
  ChevronRight, X, ArrowRight, CheckCheck, Check,
  Pin, ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { UserAvatar } from '@/components/ui/user-avatar';
import Seo from '@/components/Seo';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/core/lib/utils';
import { parseTimestamp } from '@/core/utils/timestamp';
import { useConversations, useChatActions } from '@/modules/chat/hooks/useChat';
import { conversationTitle } from '@/modules/chat/domain/conversations';
import ConversationList from '@/modules/chat/components/ConversationList';
import ChatWindow from '@/modules/chat/components/ChatWindow';
import NewChatDialog from '@/modules/chat/components/NewChatDialog';

const ANIM = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const stagger = { show: { transition: { staggerChildren: 0.08 } } };

// ============================================================================
// CONSTANTS
// ============================================================================

const FILTER_TABS = [
  { id: 'all', label: 'Todas', icon: MessageSquare },
  { id: 'direct', label: 'Diretas', icon: UserIcon },
  { id: 'group', label: 'Grupos', icon: Users },
  { id: 'unread', label: 'Não lidas', icon: Sparkles },
];

// ============================================================================
// UTILS
// ============================================================================

function formatRelative(iso) {
  const d = parseTimestamp(iso);
  if (!d) return '';
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return 'agora';
  if (diff < 3600) return `${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function StatCard({ icon: Icon, value, label, accent }) {
  const colorMap = {
    primary: 'text-primary',
    rose: 'text-rose-600',
    amber: 'text-amber-600',
    sky: 'text-sky-600',
    emerald: 'text-emerald-600',
  };
  return (
    <motion.div
      variants={ANIM}
      className="rounded-2xl border border-border bg-card p-3 transition-shadow hover:shadow-sm sm:p-4"
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:h-10 sm:w-10',
          accent === 'primary' && 'bg-primary/10',
          accent === 'rose' && 'bg-rose-100 dark:bg-rose-900/30',
          accent === 'amber' && 'bg-amber-100 dark:bg-amber-900/30',
          accent === 'sky' && 'bg-sky-100 dark:bg-sky-900/30',
          accent === 'emerald' && 'bg-emerald-100 dark:bg-emerald-900/30',
        )}>
          <Icon className={cn('h-4 w-4 sm:h-5 sm:w-5', colorMap[accent])} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className={cn('text-xl font-extrabold sm:text-2xl', colorMap[accent])}>{value}</p>
        </div>
      </div>
    </motion.div>
  );
}

function FilterTab({ id, label, icon: Icon, count, active, onClick }) {
  return (
    <button
      type="button"
      onClick={() => onClick(id)}
      aria-pressed={active}
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
        active
          ? 'border-primary bg-primary text-primary-foreground shadow'
          : 'border-border bg-card text-muted-foreground hover:border-primary/50',
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
      {count > 0 && (
        <span
          className={cn(
            'rounded-full px-1.5 text-[10px]',
            active ? 'bg-white/20' : 'bg-muted',
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function ConversationPreviewCard({ conversation, currentUserId, unread, onSelect, reduce }) {
  const title = conversationTitle(conversation, currentUserId);
  const isGroup = conversation.is_group;
  const lastMsg = conversation.last_message;
  const lastSender = lastMsg?.sender_name || '';
  const lastText = lastMsg?.text || '';
  const lastTime = formatRelative(lastMsg?.created_at);

  return (
    <motion.button
      type="button"
      variants={ANIM}
      onClick={() => onSelect(conversation.id)}
      className={cn(
        'group w-full text-left rounded-2xl border border-border bg-card p-3 transition-all hover:border-primary/50 hover:shadow-md',
        unread > 0 && 'border-primary/40 bg-primary/[0.02]',
      )}
      data-testid={`conversation-${conversation.id}`}
    >
      <div className="flex items-start gap-3">
        <div className="relative">
          {isGroup ? (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
              <Users className="h-5 w-5" aria-hidden="true" />
            </div>
          ) : (
            <UserAvatar
              name={title}
              size="md"
            />
          )}
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-semibold text-foreground">{title}</p>
            {lastTime && (
              <span className="shrink-0 text-[10.5px] text-muted-foreground">{lastTime}</span>
            )}
          </div>
          {lastMsg ? (
            <p className={cn(
              'mt-0.5 line-clamp-1 text-xs',
              unread > 0 ? 'font-medium text-foreground/90' : 'text-muted-foreground',
            )}>
              {isGroup && lastSender && (
                <span className="font-semibold">{lastSender}: </span>
              )}
              {lastText || <em className="opacity-60">Anexo</em>}
            </p>
          ) : (
            <p className="mt-0.5 text-xs italic text-muted-foreground">
              Sem mensagens ainda
            </p>
          )}
          <div className="mt-1 flex items-center gap-1.5">
            {isGroup && (
              <Badge variant="secondary" className="text-[9.5px]">
                Grupo
              </Badge>
            )}
            {conversation.pinned && (
              <Pin className="h-3 w-3 text-amber-500" aria-hidden="true" />
            )}
          </div>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </div>
    </motion.button>
  );
}

function ChatListSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="rounded-2xl border border-border bg-card p-3">
          <div className="flex items-start gap-3">
            <Skeleton className="h-11 w-11 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyChatHero({ onNew }) {
  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1 }}
      className="rounded-2xl border border-border bg-card p-6 text-center sm:p-10"
    >
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
        <MessageCircle className="h-8 w-8 text-primary" aria-hidden="true" />
      </div>
      <h3 className="mt-4 text-xl font-bold text-foreground">
        Comece uma conversa
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Converse com pessoas e grupos da comunidade Viralata.
        Inicie uma nova conversa para falar com adotantes, ONGs,
        voluntários e outros membros.
      </p>
      <Button onClick={onNew} className="mt-5">
        <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
        Nova conversa
      </Button>
    </motion.div>
  );
}

// ============================================================================
// PAGE
// ============================================================================

export default function ChatPageV3() {
  const reduce = useReducedMotion();
  const { conversationId: routeConversationId } = useParams();
  const { user, isAuthAvailable } = useAuth();
  const { toast } = useToast();
  const { conversations, isLoading, error, refetch } = useConversations();
  const actions = useChatActions();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedId, setSelectedId] = useState(searchParams.get('c') || routeConversationId || null);
  const [newOpen, setNewOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [view, setView] = useState('list'); // 'list' | 'conversation'
  const isPreviewMode = import.meta.env.DEV && !isAuthAvailable;

  // Sync URL with selection
  useEffect(() => {
    const param = searchParams.get('c') || routeConversationId || null;
    setSelectedId(param);
    if (param) setView('conversation');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeConversationId, searchParams]);

  const selectConversation = useCallback((id) => {
    setSelectedId(id);
    setView(id ? 'conversation' : 'list');
    const next = new URLSearchParams(searchParams);
    if (id) next.set('c', id);
    else next.delete('c');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  // Stats
  const stats = useMemo(() => {
    const list = conversations || [];
    const direct = list.filter((c) => !c.is_group);
    const group = list.filter((c) => c.is_group);
    const unread = list.reduce((sum, c) => {
      const uread = (c.unread_count || 0);
      return sum + (typeof uread === 'number' ? uread : 0);
    }, 0);
    return {
      total: list.length,
      direct: direct.length,
      group: group.length,
      unread,
    };
  }, [conversations]);

  // Apply filter + search
  const filteredConversations = useMemo(() => {
    let list = conversations || [];

    // Filter by tab
    if (filter === 'direct') list = list.filter((c) => !c.is_group);
    else if (filter === 'group') list = list.filter((c) => c.is_group);
    else if (filter === 'unread') list = list.filter((c) => (c.unread_count || 0) > 0);

    // Filter by search
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((c) => {
        const title = conversationTitle(c, user?.uid).toLowerCase();
        const lastText = (c.last_message?.text || '').toLowerCase();
        return title.includes(q) || lastText.includes(q);
      });
    }

    return list;
  }, [conversations, filter, search, user?.uid]);

  const selectedConversation = useMemo(
    () => conversations.find((c) => c.id === selectedId) || null,
    [conversations, selectedId],
  );

  // Handlers
  const handleCreate = useCallback(async (people, title) => {
    setCreating(true);
    try {
      const id = people.length > 1
        ? await actions.createGroup(people, title)
        : await actions.startDirect(people[0]);
      toast({
        title: 'Conversa iniciada 🎉',
        description: 'Você pode começar a conversar agora.',
      });
      setNewOpen(false);
      selectConversation(id);
    } catch (err) {
      toast({
        title: 'Erro ao criar conversa',
        description: 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  }, [actions, selectConversation, toast]);

  // JSON-LD
  const jsonLd = useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Chat — Viralata',
    description: 'Suas conversas com pessoas e grupos da comunidade Viralata.',
    url: 'https://viralata.web.app/chat',
  }), []);

  // Error state
  if (error) {
    return (
      <div className="arena-page mx-auto max-w-6xl space-y-6 px-4 py-6 pb-24 sm:px-6" data-testid="chat-page">
        <Seo title="Chat — Viralata" description="Suas conversas com a comunidade." />
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-destructive" aria-hidden="true" />
          <h1 className="mt-3 text-lg font-semibold text-foreground">
            Erro ao carregar conversas
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {error.message || 'Não foi possível buscar suas conversas.'}
          </p>
          <Button onClick={refetch} className="mt-4">
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
            Tentar de novo
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="arena-page mx-auto max-w-6xl space-y-6 px-4 py-6 pb-24 sm:px-6" data-testid="chat-page">
      <Seo
        title="Chat — Viralata"
        description="Suas conversas com pessoas e grupos da comunidade Viralata."
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* HERO */}
      <motion.section
        initial="hidden"
        animate="show"
        variants={reduce ? undefined : stagger}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-500 via-indigo-600 to-violet-600 p-6 text-white shadow-lg sm:p-10"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.18),_transparent_60%)]" aria-hidden="true" />
        <div className="relative grid grid-cols-1 gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div>
            <motion.div variants={ANIM}>
              <Badge variant="secondary" className="border-0 bg-white/20 text-white backdrop-blur">
                <MessageCircle className="mr-1 h-3 w-3" aria-hidden="true" />
                Suas conversas
              </Badge>
            </motion.div>
            <motion.h1
              variants={ANIM}
              className="mt-4 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-5xl"
            >
              Chat
            </motion.h1>
            <motion.p
              variants={ANIM}
              className="mt-3 max-w-2xl text-base text-white/90 sm:text-lg"
            >
              Converse com pessoas e grupos da comunidade.
              Receba mensagens em tempo real sobre pets, adoções, eventos e mais.
            </motion.p>
            <motion.div variants={ANIM} className="mt-5 flex flex-wrap items-center gap-2">
              <Button
                onClick={() => setNewOpen(true)}
                size="lg"
                className="border-0 bg-white text-indigo-700 hover:bg-white/90"
              >
                <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
                Nova conversa
              </Button>
            </motion.div>
          </div>

          {/* Stats decorativos (desktop) */}
          <motion.div
            variants={ANIM}
            className="hidden lg:flex lg:flex-col lg:gap-2"
          >
            <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
                  <MessageCircle className="h-6 w-6" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-2xl font-extrabold leading-none">{stats.total}</p>
                  <p className="text-xs text-white/80">conversas ativas</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-2xl border border-white/20 bg-white/10 p-3 backdrop-blur">
                <div className="flex items-center gap-2">
                  <UserIcon className="h-4 w-4" aria-hidden="true" />
                  <p className="text-lg font-extrabold leading-none">{stats.direct}</p>
                </div>
                <p className="mt-0.5 text-[10.5px] text-white/80">diretas</p>
              </div>
              <div className="rounded-2xl border border-white/20 bg-white/10 p-3 backdrop-blur">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  <p className="text-lg font-extrabold leading-none">{stats.unread}</p>
                </div>
                <p className="mt-0.5 text-[10.5px] text-white/80">não lidas</p>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* STATS mobile */}
      <motion.section
        initial="hidden"
        animate="show"
        variants={reduce ? undefined : stagger}
        className="grid grid-cols-3 gap-3 lg:hidden"
      >
        <StatCard icon={MessageCircle} value={stats.total} label="Total" accent="primary" />
        <StatCard icon={UserIcon} value={stats.direct} label="Diretas" accent="sky" />
        <StatCard icon={Sparkles} value={stats.unread} label="Não lidas" accent="amber" />
      </motion.section>

      {/* PREVIEW MODE */}
      {isPreviewMode && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          <AlertCircle className="mr-2 inline h-4 w-4" aria-hidden="true" />
          Prévia local sem Firebase: o chat não carrega conversas neste ambiente.
        </div>
      )}

      {/* FILTROS + BUSCA */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {FILTER_TABS.map((tab) => {
            const Icon = tab.icon;
            const count = tab.id === 'all' ? stats.total
              : tab.id === 'direct' ? stats.direct
              : tab.id === 'group' ? stats.group
              : stats.unread;
            return (
              <FilterTab
                key={tab.id}
                id={tab.id}
                label={tab.label}
                icon={Icon}
                count={count}
                active={filter === tab.id}
                onClick={setFilter}
              />
            );
          })}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar conversa por nome ou mensagem..."
            className="h-10 pl-9 pr-9"
            aria-label="Buscar conversa"
            data-testid="chat-search"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Limpar busca"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>

        {(filter !== 'all' || search) && (
          <p className="text-xs text-muted-foreground" role="status" aria-live="polite">
            <span className="font-semibold text-foreground">{filteredConversations.length}</span>
            {' '}conversa{filteredConversations.length !== 1 ? 's' : ''} encontrada{filteredConversations.length !== 1 ? 's' : ''}
            {filter === 'unread' && ' (não lidas)'}
            {filter === 'direct' && ' (diretas)'}
            {filter === 'group' && ' (grupos)'}
            {search && ` para "${search}"`}
          </p>
        )}
      </div>

      {/* VIEW: LIST ou CONVERSATION */}
      {view === 'list' && (
        <>
          {/* LOADING */}
          {isLoading && <ChatListSkeleton />}

          {/* EMPTY (sem conversas no total) */}
          {!isLoading && conversations.length === 0 && (
            <EmptyChatHero onNew={() => setNewOpen(true)} />
          )}

          {/* EMPTY (com filtro mas sem matches) */}
          {!isLoading && conversations.length > 0 && filteredConversations.length === 0 && (
            <EmptyState
              icon={MessageCircle}
              title="Nenhuma conversa encontrada"
              description={
                filter !== 'all' || search
                  ? 'Tente outro filtro ou busca.'
                  : 'Você ainda não tem conversas.'
              }
              action={
                (filter !== 'all' || search) && (
                  <Button
                    onClick={() => {
                      setFilter('all');
                      setSearch('');
                    }}
                    variant="outline"
                  >
                    <X className="mr-2 h-4 w-4" aria-hidden="true" />
                    Limpar filtros
                  </Button>
                )
              }
            />
          )}

          {/* LIST */}
          {!isLoading && filteredConversations.length > 0 && (
            <motion.section
              initial="hidden"
              animate="show"
              variants={reduce ? undefined : stagger}
              className="grid grid-cols-1 gap-3 lg:grid-cols-2"
            >
              {filteredConversations.map((c) => (
                <ConversationPreviewCard
                  key={c.id}
                  conversation={c}
                  currentUserId={user?.uid}
                  unread={c.unread_count || 0}
                  onSelect={selectConversation}
                  reduce={reduce}
                />
              ))}
            </motion.section>
          )}
        </>
      )}

      {/* VIEW: CONVERSATION (ativa) */}
      {view === 'conversation' && selectedConversation && (
        <motion.section
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="mb-3 flex items-center gap-2 lg:hidden">
            <Button variant="ghost" size="sm" onClick={() => selectConversation(null)}>
              <ArrowLeft className="mr-1 h-4 w-4" aria-hidden="true" />
              Voltar
            </Button>
          </div>
          <ChatWindow
            conversation={selectedConversation}
            currentUserId={user?.uid}
            onBack={() => selectConversation(null)}
            onClose={() => selectConversation(null)}
            onOpenConversation={selectConversation}
          />
        </motion.section>
      )}

      {/* CTA FINAL (se tiver conversas) */}
      {!isLoading && conversations.length > 0 && view === 'list' && (
        <motion.section
          initial={reduce ? false : { opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.4 }}
          className="overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-sky-50 via-indigo-50 to-violet-50 p-6 text-center sm:p-10 dark:from-sky-950/20 dark:via-indigo-950/10 dark:to-violet-950/20"
        >
          <MessageCircle className="mx-auto h-10 w-10 text-primary" aria-hidden="true" />
          <h2 className="mt-3 text-2xl font-extrabold text-foreground sm:text-3xl">
            Conecte-se com a comunidade
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-foreground/80">
            Inicie conversas com pessoas e grupos para discutir adoções,
            eventos, dicas de cuidado e muito mais.
          </p>
          <Button onClick={() => setNewOpen(true)} size="lg" className="mt-4">
            <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Iniciar nova conversa
            <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
          </Button>
        </motion.section>
      )}

      <NewChatDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        mode="new"
        busy={creating}
        onConfirm={handleCreate}
      />
    </div>
  );
}
