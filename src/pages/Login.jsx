import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { PawPrint } from 'lucide-react';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const LOGIN_HIGHLIGHTS = [
  'Encontre o pet ideal com base no seu espaço, rotina e estilo de vida.',
  'Converse diretamente com ONGs e responsáveis pelo chat integrado.',
  'Cadastre pets para adoção e acompanhe os interessados em tempo real.',
];

const LOGIN_QUOTE = {
  quote: 'O Viralata me ajudou a encontrar o Bolt em uma semana. O questionário de compatibilidade fez toda diferença.',
  adopter: 'Fernanda R.',
  pet: 'Bolt',
};

export default function Login() {
  const { signInWithGoogle, isAuthenticated, isLoadingAuth, authError, isAuthAvailable, authUnavailableReason } = useAuth();
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/feed';

  useEffect(() => {
    if (isAuthenticated) navigate(from, { replace: true });
  }, [isAuthenticated, navigate, from]);

  useEffect(() => {
    if (authError?.message) toast.error(authError.message);
  }, [authError]);

  const onClick = async () => {
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch {
      // tratado pelo authError effect
    } finally {
      setBusy(false);
    }
  };

  if (isLoadingAuth) return null;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(155deg,hsl(14,55%,30%),hsl(20,30%,15%)_65%)]">
      {/* Gradiente decorativo */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_10%,hsl(40,88%,54%,0.22),transparent_40%)]" />

      <div className="relative mx-auto grid min-h-screen max-w-6xl gap-8 px-6 py-8 lg:grid-cols-[1.05fr,0.95fr] lg:items-center">

        {/* Painel esquerdo — desktop */}
        <div className="hidden h-full min-h-[42rem] flex-col justify-between rounded-[2.25rem] border border-white/10 bg-white/5 p-14 backdrop-blur-sm lg:flex">
          <div>
            <Link to="/" className="inline-flex items-center gap-3 text-white">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,hsl(var(--primary))_0%,hsl(var(--highlight))_100%)] shadow-[0_10px_24px_-12px_rgba(64,34,18,0.6)]">
                <PawPrint className="h-5 w-5 text-white" />
              </span>
              <div>
                <span className="block text-sm font-semibold uppercase tracking-[0.24em] text-orange-200/80">Viralata</span>
                <span className="block text-xl font-semibold text-white">Adoção responsável de pets</span>
              </div>
            </Link>
          </div>

          <div>
            <span className="inline-flex h-[30px] items-center gap-1.5 rounded-full border border-white/20 bg-white/[0.12] px-3.5 text-xs font-bold text-orange-200/85">
              <PawPrint className="h-[15px] w-[15px]" /> Plataforma gratuita de adoção
            </span>
            <h1 className="mt-[22px] max-w-[440px] text-[36px] font-extrabold leading-[1.15] tracking-[-0.02em] text-white">
              Conecte-se com pets que precisam de um lar e famílias que têm amor para dar.
            </h1>

            <div className="mt-8 flex flex-col gap-2.5">
              {LOGIN_HIGHLIGHTS.map((item) => (
                <div key={item} className="rounded-2xl border border-white/[0.15] bg-white/10 p-3.5 text-[13.5px] leading-[1.55] text-orange-50/90">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[18px] border border-white/[0.15] bg-white/[0.08] px-5 py-4.5">
            <p className="mb-2.5 text-[13.5px] italic leading-[1.6] text-orange-50/85">&ldquo;{LOGIN_QUOTE.quote}&rdquo;</p>
            <div className="text-[12.5px] font-bold text-orange-200/85">{LOGIN_QUOTE.adopter} · adotou {LOGIN_QUOTE.pet}</div>
          </div>
        </div>

        {/* Card de login */}
        <div className="flex items-center justify-center">
          <Card className="w-full max-w-[420px] rounded-[28px] border-white bg-card p-0 text-center shadow-[0_30px_70px_-30px_hsl(20_40%_20%/0.4)]">
            <CardHeader className="px-[30px] pb-0 pt-9">
              {/* Logo mobile */}
              <Link to="/" className="mx-auto mb-4 inline-flex items-center gap-3 text-foreground lg:hidden">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,hsl(var(--primary))_0%,hsl(var(--highlight))_100%)] shadow-[0_10px_24px_-12px_rgba(64,34,18,0.6)]">
                  <PawPrint className="h-5 w-5 text-white" />
                </span>
                <span className="text-lg font-semibold">Viralata</span>
              </Link>

              {/* Ícone central */}
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,hsl(var(--primary))_0%,hsl(var(--highlight))_100%)] text-white shadow-[0_18px_32px_-16px_hsl(17_72%_30%/0.6)]">
                <PawPrint className="h-[26px] w-[26px]" />
              </div>

              <CardTitle className="mt-[18px] text-2xl font-extrabold text-foreground">
                Bem-vindo ao Viralata
              </CardTitle>
              <CardDescription className="mt-2.5 text-[13.5px] leading-[1.6] text-muted-foreground">
                Use sua conta Google para acessar a plataforma e encontrar ou cadastrar pets para adoção responsável.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-0 px-[30px] pb-9 pt-6">
              <Button
                onClick={onClick}
                disabled={busy || !isAuthAvailable}
                variant="outline"
                className="h-[50px] w-full gap-2.5 border-border bg-card text-[14.5px] font-bold text-foreground shadow-[0_10px_24px_-16px_hsl(20_40%_20%/0.3)]"
              >
                <GoogleIcon className="h-[18px] w-[18px] flex-shrink-0" />
                {busy ? 'Conectando…' : isAuthAvailable ? 'Continuar com Google' : 'Login indisponível'}
              </Button>

              {!isAuthAvailable && (
                <p className="mt-4 rounded-[1.15rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
                  {authUnavailableReason || 'Configure o Firebase para habilitar autenticação.'}
                </p>
              )}

              <p className="mt-[18px] text-[11.5px] leading-[1.6] text-muted-foreground">
                Ao continuar você aceita nossa{' '}
                <Link to="/politica-privacidade" className="font-medium text-foreground/80 underline underline-offset-4">
                  Política de Privacidade
                </Link>
                . O Viralata é 100% gratuito e não realiza venda de animais.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}
