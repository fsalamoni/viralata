import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, PawPrint, Building2, AlertTriangle, Users, BarChart3, ScrollText, Bell } from 'lucide-react';

export default function AdminDashboard() {
  const { isPlatformAdmin } = useAuth();
  if (!isPlatformAdmin) return <div className="text-center py-16 text-muted-foreground">Acesso restrito.</div>;

  const sections = [
    { icon: PawPrint, title: 'Gerenciar Pets', desc: 'Moderar anúncios, aprovar ou remover pets', link: '/admin/pets', tone: 'bg-primary/10 text-primary' },
    { icon: Building2, title: 'Organizações', desc: 'Verificar, gerenciar e excluir ONGs e lojas', link: '/admin/organizacoes', tone: 'bg-accent/10 text-accent' },
    { icon: AlertTriangle, title: 'Denúncias', desc: 'Revisar denúncias de maus-tratos', link: '/admin/denuncias', tone: 'bg-destructive/10 text-destructive' },
    { icon: Users, title: 'Usuários', desc: 'Gerenciar contas, papéis e banimentos', link: '/admin/usuarios', tone: 'bg-highlight/20 text-[hsl(30,60%,32%)]' },
    { icon: BarChart3, title: 'Métricas', desc: 'Adoções, crescimento e denúncias em gráficos', link: '/admin/metricas', tone: 'bg-secondary text-secondary-foreground' },
    { icon: ScrollText, title: 'Auditoria', desc: 'Trilha completa de ações registradas na plataforma', link: '/admin/auditoria', tone: 'bg-primary/10 text-primary' },
    { icon: Bell, title: 'Notificações', desc: 'Inspecionar entregas, links e leituras das notificações geradas', link: '/admin/notificacoes', tone: 'bg-accent/10 text-accent' },
  ];

  return (
    <div className="arena-page max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Painel Administrativo</h1>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {sections.map(({ icon: Icon, title, desc, link, tone }) => (
          <Card key={link} className="transition-shadow hover:shadow-[0_18px_40px_-28px_rgba(64,34,18,0.35)]">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2.5 text-base">
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}>
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
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
