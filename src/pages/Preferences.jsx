/**
 * @fileoverview Preferences — página /preferencias com UI + notificações + conta.
 *
 * TASK-PREFERENCIAS-1: configurações agrupadas em 3 seções:
 *  1. Aparência (reusa AppearanceSettings — topbar, footer, tabbar, grid, etc)
 *  2. Notificações (NOVO — email_notifications, etc via notificationPrefsService)
 *  3. Conta (export LGPD, delete account)
 *
 * Auth obrigatória. Redirect para /login se anônimo.
 */
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Bell, Palette, User, Eye, Mail, MessageCircle, Heart,
  CheckCircle2, AlertTriangle, Loader2, Download, Trash2, ChevronLeft,
  Sparkles, Calendar, Award,
} from 'lucide-react';
import { Seo } from '@/components/Seo';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { AppearanceSettings } from '@/components/AppearanceSettings';
import {
  getNotificationPrefs, setNotificationPrefs, subscribeNotificationPrefs,
  DEFAULT_PREFS,
} from '@/core/services/notificationPrefsService';
import { exportMyData, downloadDataExport } from '@/core/services/dataExportService';
import { cn } from '@/core/lib/utils';

const PREF_META = [
  {
    key: 'email_notifications',
    title: 'Receber notificações por email',
    description: 'Master switch. Quando desligado, nenhuma notificação é enviada.',
    icon: Mail,
    master: true,
  },
  {
    key: 'interest_received',
    title: 'Alguém demonstrou interesse em um pet meu',
    description: 'Avisa quando alguém quer adotar ou entrar em lar temporário.',
    icon: Heart,
  },
  {
    key: 'interest_accepted',
    title: 'Meu interesse foi aceito',
    description: 'Avisa quando o responsável aceita seu pedido de adoção ou LT.',
    icon: CheckCircle2,
  },
  {
    key: 'interest_rejected',
    title: 'Meu interesse foi rejeitado',
    description: 'Avisa quando o responsável não aceita seu pedido.',
    icon: AlertTriangle,
  },
  {
    key: 'chat_message',
    title: 'Nova mensagem no chat',
    description: 'Avisa quando alguém te envia mensagem.',
    icon: MessageCircle,
  },
  {
    key: 'adoption_completed',
    title: 'Adoção concluída',
    description: 'Avisa quando uma adoção que você acompanha é finalizada.',
    icon: Sparkles,
  },
  {
    key: 'weekly_digest',
    title: 'Resumo semanal de atividades',
    description: 'Toda segunda, você recebe um email com o resumo da semana.',
    icon: Calendar,
  },
  {
    key: 'product_updates',
    title: 'Novidades do Viralata',
    description: 'Avisa sobre novos recursos, melhorias e avisos importantes.',
    icon: Award,
  },
];

function PreferencesSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4">
      <Skeleton className="h-20 w-full rounded-2xl" />
      <Skeleton className="h-64 w-full rounded-2xl" />
      <Skeleton className="h-64 w-full rounded-2xl" />
      <Skeleton className="h-40 w-full rounded-2xl" />
    </div>
  );
}

function NotificationRow({ meta, value, onChange, disabled }) {
  const Icon = meta.icon;
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-xl border p-4 transition-colors',
        value && !meta.master
          ? 'border-primary/30 bg-primary/[0.04]'
          : 'border-border bg-card',
        disabled && 'opacity-50',
      )}
      data-testid={`notif-pref-${meta.key}`}
    >
      <div className={cn(
        'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
        value ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
      )}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-foreground">{meta.title}</p>
          {meta.master && (
            <Badge variant="default" className="text-[10px]">Master</Badge>
          )}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">{meta.description}</p>
      </div>
      <Switch
        checked={Boolean(value)}
        onCheckedChange={(checked) => onChange(checked)}
        disabled={disabled}
        aria-label={meta.title}
      />
    </div>
  );
}

export default function Preferences() {
  const reduce = useReducedMotion();
  const navigate = useNavigate();
  const { user, isLoadingAuth, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const [prefs, setPrefs] = useState(null);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Auth guard
  useEffect(() => {
    if (!isLoadingAuth && !isAuthenticated) {
      navigate('/login?redirect=/preferencias', { replace: true });
    }
  }, [isAuthenticated, isLoadingAuth, navigate]);

  // Subscribe to notification prefs
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeNotificationPrefs(user.uid, (data) => {
      setPrefs(data);
    });
    return () => unsub && unsub();
  }, [user?.uid]);

  const handleToggle = async (key, value) => {
    if (!user?.uid) return;
    const next = { ...prefs, [key]: value };
    setPrefs(next); // optimistic
    setSaving(true);
    try {
      await setNotificationPrefs(user.uid, next);
      if (key === 'email_notifications') {
        toast.success(value ? 'Notificações por email ativadas' : 'Notificações por email desativadas');
      } else {
        toast.success('Preferência salva');
      }
    } catch (err) {
      console.error('Erro ao salvar pref:', err);
      toast.error('Erro ao salvar preferência');
      // rollback
      setPrefs((p) => ({ ...p, [key]: !value }));
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const data = await exportMyData(user.uid);
      downloadDataExport(data);
      toast.success('Dados exportados com sucesso');
    } catch (err) {
      console.error('Export falhou:', err);
      toast.error('Erro ao exportar dados');
    } finally {
      setExporting(false);
    }
  };

  if (isLoadingAuth) return <PreferencesSkeleton />;
  if (!isAuthenticated) return null;

  if (!prefs) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 p-4">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  const masterOff = !prefs.email_notifications;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 pb-24" data-testid="preferences-page">
      <Seo
        title="Preferências — Viralata"
        description="Configure notificações, aparência e privacidade da sua conta."
      />

      {/* HEADER */}
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center gap-3"
      >
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="shrink-0"
          aria-label="Voltar para o perfil"
        >
          <Link to="/perfil">
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Preferências</h1>
          <p className="text-sm text-muted-foreground">
            Configure notificações, aparência e privacidade da sua conta.
          </p>
        </div>
        {saving && (
          <Badge variant="secondary" className="gap-1">
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
            Salvando…
          </Badge>
        )}
      </motion.div>

      {/* APARÊNCIA */}
      <motion.section
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" aria-hidden="true" />
              <CardTitle>Aparência</CardTitle>
            </div>
            <CardDescription>
              Como a plataforma aparece e se comporta no seu dispositivo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AppearanceSettings />
          </CardContent>
        </Card>
      </motion.section>

      {/* NOTIFICAÇÕES */}
      <motion.section
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" aria-hidden="true" />
              <CardTitle>Notificações</CardTitle>
            </div>
            <CardDescription>
              Escolha quais notificações você quer receber por email.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {PREF_META.map((meta) => (
              <NotificationRow
                key={meta.key}
                meta={meta}
                value={prefs[meta.key]}
                onChange={(v) => handleToggle(meta.key, v)}
                disabled={meta.key !== 'email_notifications' && masterOff}
              />
            ))}
          </CardContent>
        </Card>
      </motion.section>

      {/* CONTA */}
      <motion.section
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" aria-hidden="true" />
              <CardTitle>Conta</CardTitle>
            </div>
            <CardDescription>
              Seus dados na plataforma. Você tem direito a export e eliminação (LGPD).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                onClick={handleExport}
                disabled={exporting}
                className="gap-2"
              >
                {exporting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Exportando…
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" aria-hidden="true" />
                    Exportar meus dados (LGPD)
                  </>
                )}
              </Button>
              <Button asChild variant="ghost">
                <Link to="/perfil">
                  Voltar para o perfil
                </Link>
              </Button>
            </div>
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-foreground/80">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
                <div>
                  <p className="font-semibold text-foreground">Excluir conta</p>
                  <p className="mt-0.5 text-foreground/75">
                    Para excluir permanentemente sua conta, envie um email para{' '}
                    <a className="text-primary underline underline-offset-2" href="mailto:dpo@viralata.org">
                      dpo@viralata.org
                    </a>{' '}
                    com o assunto "Exclusão de conta". Seus dados serão removidos em até 30 dias (LGPD).
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.section>
    </div>
  );
}
