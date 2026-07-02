import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';

export default function BannedNotice() {
  const { userProfile, signOut } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-slate-100 p-6">
      <div className="text-center max-w-md space-y-4">
        <ShieldAlert className="w-14 h-14 text-red-500 mx-auto" />
        <h1 className="text-2xl font-bold text-gray-900">Conta suspensa</h1>
        <p className="text-gray-600">
          Sua conta foi suspensa pela equipe do Viralata e você não pode mais acessar a plataforma.
        </p>
        {userProfile?.banned_reason && (
          <p className="text-sm text-gray-500 bg-white rounded-lg border border-gray-200 p-3">
            <strong>Motivo:</strong> {userProfile.banned_reason}
          </p>
        )}
        <p className="text-sm text-gray-400">
          Se você acredita que isso é um engano, entre em contato com o suporte.
        </p>
        <Button variant="outline" onClick={signOut}>Sair</Button>
      </div>
    </div>
  );
}
