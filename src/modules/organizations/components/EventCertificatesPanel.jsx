import React from 'react';
import { Award, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  useMyEventCertificate,
  useGenerateEventCertificate,
  useEventRsvps,
} from '@/modules/organizations/hooks/useClubs';
import { useAuth } from '@/core/lib/FirebaseAuthContext';

export default function EventCertificatesPanel({ event }) {
  const { user } = useAuth();
  const eventId = event.id;

  const { data: certificate, isLoading: certLoading } = useMyEventCertificate(eventId);
  const { data: rsvps, isLoading: rsvpLoading } = useEventRsvps(eventId);

  const myRsvp = rsvps?.find((r) => r.user_id === user?.uid);
  const isGoing = myRsvp?.status === 'going';
  const canDownload = !!certificate?.downloadUrl;

  const genMutation = useGenerateEventCertificate(eventId);

  const isLoading = certLoading || rsvpLoading;

  function handleDownload() {
    if (certificate?.downloadUrl) {
      window.open(certificate.downloadUrl, '_blank', 'noopener,noreferrer');
    }
  }

  function handleGenerate() {
    if (user?.uid && !genMutation.isPending) genMutation.mutate(user.uid);
  }

  return (
    <Card className="rounded-xl">
      <CardContent className="flex flex-col items-center gap-3 p-6 text-center sm:p-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
          <Award className="h-6 w-6 text-orange-600" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Certificado de Participação</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {isLoading
              ? 'Verificando seu certificado…'
              : canDownload
              ? 'Seu certificado está pronto para download.'
              : isGoing
              ? 'Gere seu certificado de participação neste evento.'
              : 'Confirme presença (RSVP: "Vou") para gerar seu certificado.'}
          </p>
        </div>

        {isLoading ? (
          <Button variant="outline" disabled>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Verificando…
          </Button>
        ) : canDownload ? (
          <>
            {certificate.issuedAt && (
              <p className="text-xs text-muted-foreground">
                Emitido em{' '}
                {new Date(certificate.issuedAt).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            )}
            <Button onClick={handleDownload} className="gap-2">
              <Download className="h-4 w-4" />
              Baixar certificado (PDF)
            </Button>
          </>
        ) : isGoing ? (
          <Button
            onClick={handleGenerate}
            disabled={genMutation.isPending}
            className="gap-2"
          >
            {genMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Award className="h-4 w-4" />
            )}
            {genMutation.isPending ? 'Gerando…' : 'Gerar meu certificado'}
          </Button>
        ) : (
          <Button variant="outline" disabled className="gap-2">
            <Award className="h-4 w-4" />
            {isGoing ? 'Gerando…' : 'Confirme presença para gerar'}
          </Button>
        )}

        {genMutation.isError && (
          <p className="mt-1 text-xs text-red-500">
            Não foi possível gerar o certificado. Tente novamente.
          </p>
        )}
        {genMutation.isSuccess && genMutation.data?.downloadUrl && (
          <Button
            onClick={() =>
              window.open(genMutation.data.downloadUrl, '_blank', 'noopener,noreferrer')
            }
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Abrir certificado
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
