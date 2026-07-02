import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, PawPrint, Building2, AlertTriangle, Users, BarChart3, FileText } from 'lucide-react';

export default function AdminDashboard() {
  const { isPlatformAdmin } = useAuth();
  if (!isPlatformAdmin) return <div className="text-center py-16 text-muted-foreground">Acesso restrito.</div>;

  const sections = [
    { icon: PawPrint, title: 'Gerenciar Pets', desc: 'Moderar anúncios, aprovar ou remover pets', link: '/admin/pets', color: 'text-primary' },
    { icon: Building2, title: 'Organizações', desc: 'Verificar, gerenciar e excluir ONGs e lojas', link: '/admin/organizacoes', color: 'text-accent' },
    { icon: AlertTriangle, title: 'Denúncias', desc: 'Revisar denúncias de maus-tratos', link: '/admin/denuncias', color: 'text-destructive' },
    { icon: Users, title: 'Usuários', desc: 'Gerenciar contas, papéis e banimentos', link: '/admin/usuarios', color: 'text-highlight' },
    { icon: BarChart3, title: 'Métricas', desc: 'Adoções, crescimento e denúncias em gráficos', link: '/admin/metricas', color: 'text-primary/70' },
    { icon: FileText, title: 'Conteúdo institucional', desc: 'Editar Termos, Privacidade e Legislação', link: '/admin/conteudo', color: 'text-accent/70' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Painel Administrativo</h1>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {sections.map(({ icon: Icon, title, desc, link, color }) => (
          <Card key={link} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon className={`w-5 h-5 ${color}`} />
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
