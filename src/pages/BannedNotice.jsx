import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';

export default function BannedNotice() {
  const { userProfile, signOut } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-destructive to-secondary p-6">
      <div className="text-center max-w-md space-y-4">
        <ShieldAlert className="w-14 h-14 text-destructive mx-auto" />
        <h1 className="text-2xl font-bold text-foreground">Conta suspensa</h1>
        <p className="text-muted-foreground">
          Sua conta foi suspensa pela equipe do Viralata e você não pode mais acessar a plataforma.
        </p>
        {userProfile?.banned_until && (
          <p className="text-sm text-muted-foreground">
            <strong>Suspensão até:</strong>{' '}
            {new Date(userProfile.banned_until).toLocaleDateString('pt-BR')}
          </p>
        )}
        {userProfile?.banned_reason && (
          <p className="text-sm text-muted-foreground bg-card rounded-lg border border-border p-3">
            <strong>Motivo:</strong> {userProfile.banned_reason}
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          Se você acredita que isso é um engano, entre em contato com o suporte.
        </p>
        <Button variant="outline" onClick={signOut}>Sair</Button>
      </div>
    </div>
  );
}
