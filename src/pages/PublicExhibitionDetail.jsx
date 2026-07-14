/**
 * @fileoverview PublicExhibitionDetail — página individual PÚBLICA de uma
 * vitrine (TASK-146).
 *
 * Mostra:
 * - Cabeçalho com capa, título, status, abrigo
 * - Descrição completa
 * - Data/hora + local
 * - Pets participantes (com foto se houver)
 * - Botão "Quero adotar" → contacta abrigo
 * - Mapa (se tiver location_lat/lng)
 *
 * Rota: /vitrines/{id}
 */

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Calendar, Clock, MapPin, Building2, PawPrint, Heart, Phone, Mail,
  ExternalLink, AlertCircle, ArrowLeft,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import {
  EXHIBITION_STATUS_LABELS,
} from '@/modules/shelter/domain/operational/exhibition';
import { listPublicExhibitions } from '@/modules/shelter/services/exhibitionPublicService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { logger } from '@/core/lib/logger';

const STATUS_TONE = {
  scheduled: 'bg-blue-100 text-blue-800 border-blue-200',
  active: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  completed: 'bg-slate-100 text-slate-700 border-slate-200',
  cancelled: 'bg-rose-100 text-rose-700 border-rose-200',
};

function formatDateTime(iso) {
  if (!iso) return '—';
  const d = typeof iso === 'string' ? new Date(iso) : iso?.toDate?.() || null;
  if (!d || Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function durationHours(start, end) {
  if (!start || !end) return null;
  const s = typeof start === 'string' ? new Date(start) : start?.toDate?.() || null;
  const e = typeof end === 'string' ? new Date(end) : end?.toDate?.() || null;
  if (!s || !e) return null;
  const diffMs = e - s;
  const hours = diffMs / (1000 * 60 * 60);
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 24) return `${Math.round(hours)}h`;
  return `${(hours / 24).toFixed(1)} dias`;
}

export default function PublicExhibitionDetail() {
  const { id } = useParams();
  const [exhibition, setExhibition] = useState(null);
  const [shelter, setShelter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);

    // Tenta achar a vitrine (sem multi-tenant path porque é público)
    // Listagem filtrada por id
    listPublicExhibitions({ max: 200 }).then(async (items) => {
      if (cancelled) return;
      const ex = items.find((it) => it.id === id);
      if (!ex) {
        setError('Vitrine não encontrada');
        setLoading(false);
        return;
      }
      setExhibition(ex);

      // Buscar info do abrigo
      if (ex.shelter_club_id && db) {
        try {
          const shelterSnap = await getDoc(doc(db, 'clubs', ex.shelter_club_id));
          if (!cancelled && shelterSnap.exists()) {
            setShelter({ id: shelterSnap.id, ...shelterSnap.data() });
          }
        } catch (err) {
          logger.warn('PublicExhibitionDetail.fetchShelter', { err: String(err) });
        }
      }
      setLoading(false);
    }).catch((err) => {
      if (!cancelled) {
        setError(err.message);
        setLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    );
  }

  if (error || !exhibition) {
    return (
      <div className="max-w-2xl mx-auto">
        <Button asChild variant="ghost" className="mb-4">
          <Link to="/vitrines">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Link>
        </Button>
        <EmptyState
          icon={Calendar}
          title="Vitrine não encontrada"
          description={error || 'Esta vitrine pode ter sido removida ou ainda não está visível publicamente.'}
          action={
            <Button asChild>
              <Link to="/vitrines">Ver todas as vitrines</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const statusTone = STATUS_TONE[exhibition.status] || STATUS_TONE.scheduled;
  const isPast = exhibition.status === 'completed' || exhibition.status === 'cancelled';
  const pets = exhibition.internal_pets || exhibition.pets || [];
  const shelterName = exhibition.shelter_name || shelter?.name || 'Abrigo parceiro';
  const shelterCity = exhibition.shelter_city || shelter?.city || '';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link to="/vitrines">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para vitrines
        </Link>
      </Button>

      {/* Capa */}
      <Card className="overflow-hidden">
        {exhibition.cover_url ? (
          <img
            src={exhibition.cover_url}
            alt={exhibition.title}
            className="w-full h-64 object-cover"
          />
        ) : (
          <div
            className="w-full h-64 flex items-center justify-center"
            style={{ background: 'var(--cover-gradient, linear-gradient(135deg, #f97316 0%, #ec4899 100%))' }}
          >
            <Calendar className="h-16 w-16 text-white opacity-50" aria-hidden="true" />
          </div>
        )}
        <CardContent className="p-6 space-y-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold flex-1">
              {exhibition.title || 'Vitrinha'}
            </h1>
            <Badge className={statusTone} data-testid="status-badge">
              {EXHIBITION_STATUS_LABELS[exhibition.status] || exhibition.status}
            </Badge>
          </div>

          {exhibition.description && (
            <p className="text-base text-muted-foreground leading-relaxed">
              {exhibition.description}
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            <div className="flex items-start gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Início</p>
                <p className="text-muted-foreground">{formatDateTime(exhibition.datetime_start)}</p>
              </div>
            </div>
            {exhibition.datetime_end && (
              <div className="flex items-start gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Término</p>
                  <p className="text-muted-foreground">{formatDateTime(exhibition.datetime_end)}</p>
                </div>
              </div>
            )}
            {exhibition.location && (
              <div className="flex items-start gap-2 text-sm md:col-span-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Local</p>
                  <p className="text-muted-foreground">{exhibition.location}</p>
                </div>
              </div>
            )}
            {exhibition.shelter_club_id && (
              <div className="flex items-start gap-2 text-sm md:col-span-2">
                <Building2 className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Organizado por</p>
                  <Link
                    to={`/abrigos/${exhibition.shelter_club_id}`}
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    {shelterName}{shelterCity ? ` — ${shelterCity}` : ''}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            )}
            {durationHours(exhibition.datetime_start, exhibition.datetime_end) && (
              <div className="text-xs text-muted-foreground">
                Duração: {durationHours(exhibition.datetime_start, exhibition.datetime_end)}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pets participantes */}
      {pets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PawPrint className="h-5 w-5 text-primary" />
              Pets participantes ({pets.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {pets.map((pet, idx) => (
                <Link
                  key={pet.id || idx}
                  to={`/pet/${pet.id || ''}`}
                  className="block rounded-lg border border-border/60 overflow-hidden hover:shadow-md transition-shadow"
                >
                  {pet.photo_url || pet.cover_url ? (
                    <img
                      src={pet.photo_url || pet.cover_url}
                      alt={pet.name}
                      className="w-full h-32 object-cover"
                    />
                  ) : (
                    <div className="w-full h-32 bg-muted flex items-center justify-center">
                      <PawPrint className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                  )}
                  <div className="p-2">
                    <p className="font-medium text-sm line-clamp-1">{pet.name}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {[pet.species, pet.breed, pet.age].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ações */}
      <Card>
        <CardContent className="p-6 space-y-3">
          <h2 className="font-semibold flex items-center gap-2">
            <Heart className="h-5 w-5 text-rose-500" />
            Quer participar?
          </h2>
          {isPast ? (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-900">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Este evento já passou.</p>
                <p className="text-xs mt-0.5">
                  Mas você pode conhecer os pets do abrigo e se inscrever para o próximo evento.
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Entre em contato com o abrigo para saber como adotar um dos pets
              ou ser voluntário neste evento.
            </p>
          )}

          {exhibition.shelter_club_id && (
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link to={`/abrigos/${exhibition.shelter_club_id}`}>
                  <Building2 className="h-4 w-4 mr-2" />
                  Ver abrigo
                </Link>
              </Button>
              {shelter?.contact_email && (
                <Button variant="outline" asChild>
                  <a href={`mailto:${shelter.contact_email}?subject=Interesse na vitrine ${exhibition.title}`}>
                    <Mail className="h-4 w-4 mr-2" />
                    Email
                  </a>
                </Button>
              )}
              {shelter?.contact_phone && (
                <Button variant="outline" asChild>
                  <a href={`tel:${shelter.contact_phone}`}>
                    <Phone className="h-4 w-4 mr-2" />
                    Ligar
                  </a>
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
