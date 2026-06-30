import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, PawPrint, Building2, AlertTriangle, Users } from 'lucide-react';

export default function AdminDashboard() {
  const { isPlatformAdmin } = useAuth();
  if (!isPlatformAdmin) return <div className="text-center py-16 text-gray-500">Acesso restrito.</div>;

  const sections = [
    { icon: PawPrint, title: 'Gerenciar Pets', desc: 'Moderar anúncios, aprovar ou remover pets', link: '/admin/pets', color: 'text-orange-500' },
    { icon: Building2, title: 'Organizações', desc: 'Verificar e gerenciar ONGs e lojas', link: '/admin/organizations', color: 'text-blue-500' },
    { icon: AlertTriangle, title: 'Denúncias', desc: 'Revisar denúncias de maus-tratos', link: '/admin/reports', color: 'text-red-500' },
    { icon: Users, title: 'Usuários', desc: 'Gerenciar contas e papéis', link: '/admin/users', color: 'text-purple-500' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="w-6 h-6 text-orange-500" />
        <h1 className="text-2xl font-bold text-gray-900">Painel Administrativo</h1>
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
              <p className="text-sm text-gray-500">{desc}</p>
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
