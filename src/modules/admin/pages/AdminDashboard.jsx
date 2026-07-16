import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, PawPrint, Building2, AlertTriangle, Users, BarChart3, ScrollText, Bell, SlidersHorizontal } from 'lucide-react';
import PageHero from '@/components/PageHero';
import PageContainer from '@/components/PageContainer';

export default function AdminDashboard() {
  const { isPlatformAdmin } = useAuth();
  if (!isPlatformAdmin) return <PageContainer><div className="text-center py-16 text-muted-foreground">Acesso restrito.</div></PageContainer>;

  const sections = [
    { icon: PawPrint, title: 'Gerenciar Pets', desc: 'Moderar anúncios, aprovar ou remover pets', link: '/admin/pets', color: 'text-primary' },
    { icon: Building2, title: 'Organizações', desc: 'Verificar, gerenciar e excluir ONGs e lojas', link: '/admin/organizacoes', color: 'text-accent' },
    { icon: AlertTriangle, title: 'Denúncias', desc: 'Revisar denúncias de maus-tratos', link: '/admin/denuncias', color: 'text-destructive' },
    { icon: Users, title: 'Usuários', desc: 'Gerenciar contas, papéis e banimentos', link: '/admin/usuarios', color: 'text-highlight' },
    { icon: BarChart3, title: 'Métricas', desc: 'Adoções, crescimento e denúncias em gráficos', link: '/admin/metricas', color: 'text-primary/70' },
    { icon: FileText, title: 'Conteúdo institucional', desc: 'Editar Termos, Privacidade e Legislação', link: '/admin/conteudo', color: 'text-accent/70' },
  ];

  return (
    <PageContainer className="space-y-6">
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
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{desc}</p>
              <Button asChild variant="outline" size="sm">
                <Link to={link}>Acessar</Link>
              </Button>
            </div>
          </div>
        ))}
      </div>
    </PageContainer>
  );
}
