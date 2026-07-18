import { Link } from 'react-router-dom';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { Button } from '@/components/ui/button';
import {
  Shield, PawPrint, Building2, AlertTriangle, Users, UserCog,
  BarChart3, ScrollText, Bell, SlidersHorizontal, Flag,
  Activity, Siren, Database,
} from 'lucide-react';
import PageHero from '@/components/PageHero';
import { useArenaPageClasses } from '@/core/lib/useArenaPageClasses';

/**
 * AdminDashboard — página principal do admin da plataforma.
 * Ver TASK-857: auditoria DS_V2, accessibility, consistência.
 */
export default function AdminDashboard() {
  const { isPlatformAdmin } = useAuth();
  const wrapperClass = useArenaPageClasses('arena-page max-w-4xl mx-auto px-4 py-6 space-y-6');
  const deniedClass = useArenaPageClasses('arena-page mx-auto max-w-3xl py-16 text-center');

  if (!isPlatformAdmin) {
    return (
      <div className={deniedClass}>
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <Shield className="h-5 w-5" />
        </div>
        <p className="text-base font-semibold text-foreground">Acesso restrito</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Esta página é exclusiva do administrador da plataforma.
        </p>
      </div>
    );
  }

  const sections = [
    { icon: PawPrint, title: 'Gerenciar Pets', desc: 'Moderar anúncios, aprovar ou remover pets', link: '/admin/pets', tone: 'bg-primary/10 text-primary' },
    { icon: Building2, title: 'Abrigos', desc: 'Moderar diretório de abrigos e organizações parceiras', link: '/admin/organizacoes', tone: 'bg-accent/10 text-accent' },
    { icon: Users, title: 'Comunidades', desc: 'Gerenciar grupos, fóruns e espaços sociais de usuários', link: '/admin/comunidades', tone: 'bg-primary/10 text-primary' },
    { icon: AlertTriangle, title: 'Denúncias', desc: 'Revisar denúncias de maus-tratos', link: '/admin/denuncias', tone: 'bg-destructive/10 text-destructive' },
    // FIX: 'Usuários' usava ícone duplicado Users igual a 'Comunidades'.
    // Diferenciado com UserCog (ícone semanticamente melhor para admin de usuários).
    { icon: UserCog, title: 'Usuários', desc: 'Gerenciar contas, papéis e banimentos', link: '/admin/usuarios', tone: 'bg-highlight/20 text-[hsl(30,60%,32%)]' },
    { icon: Shield, title: 'Platform Admins', desc: 'Delegar e revogar acesso admin master (só o owner pode)', link: '/admin/admins', tone: 'bg-highlight/20 text-[hsl(30,60%,32%)]' },
    { icon: BarChart3, title: 'Métricas', desc: 'Adoções, crescimento e denúncias em gráficos', link: '/admin/metricas', tone: 'bg-secondary text-secondary-foreground' },
    { icon: ScrollText, title: 'Auditoria', desc: 'Trilha completa de ações registradas na plataforma', link: '/admin/auditoria', tone: 'bg-primary/10 text-primary' },
    { icon: Bell, title: 'Notificações', desc: 'Inspecionar entregas, links e leituras das notificações geradas', link: '/admin/notificacoes', tone: 'bg-accent/10 text-accent' },
    { icon: SlidersHorizontal, title: 'Configurações', desc: 'Ajustar textos, rótulos e parâmetros operacionais auditáveis da plataforma', link: '/admin/configuracoes', tone: 'bg-highlight/20 text-[hsl(30,60%,32%)]' },
    { icon: Flag, title: 'Flags de atualizações', desc: 'Ligar e desligar as feature flags que liberam novidades na plataforma', link: '/admin/flags', tone: 'bg-primary/10 text-primary' },
    { icon: Activity, title: 'Saúde da plataforma', desc: 'Latência, error rate, deploys, uptime, custos, capacidade, alertas', link: '/admin/saude', tone: 'bg-destructive/10 text-destructive' },
    { icon: Bell, title: 'Alertas', desc: 'Configurar thresholds de Slack/Email para billing, error rate, latência', link: '/admin/alertas', tone: 'bg-destructive/10 text-destructive' },
    { icon: Siren, title: 'Alertas de segurança', desc: 'Logins suspeitos, alterações de regras, rate limit, billing — logados pela Cloud Function (Fase 20)', link: '/admin/security-alerts', tone: 'bg-destructive/10 text-destructive' },
    { icon: Database, title: 'Dados demo (mock data)', desc: 'Carregar ou limpar o pacote de dados de demonstração (gated por flag)', link: '/admin/mock-data', tone: 'bg-accent/10 text-accent' },
  ];

  return (
    <div className={wrapperClass}>
      <PageHero
        eyebrow="Admin"
        title="Painel Administrativo"
        description="Centralize moderação, auditoria, notificações e indicadores da plataforma em um fluxo visual consistente com as demais áreas."
        actions={(
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-orange-50/85">
            <Shield className="h-3.5 w-3.5" /> Acesso restrito
          </span>
        )}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {sections.map(({ icon: Icon, title, desc, link, tone }) => (
          <div key={link} className="arena-section-card transition-shadow hover:shadow-[0_18px_40px_-28px_rgba(64,34,18,0.35)]">
            <div className="arena-section-card-header">
              <h3 className="arena-section-card-title flex items-center gap-2.5 text-base">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone}`}>
                  <Icon className="w-4 h-4" />
                </span>
                {title}
              </h3>
            </div>
            <div className="arena-section-card-body space-y-3">
              <p className="text-sm text-muted-foreground">{desc}</p>
              <Button asChild variant="outline" size="sm">
                <Link to={link}>Acessar</Link>
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
