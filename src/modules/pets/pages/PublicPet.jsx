/**
 * @fileoverview PublicPet — página pública read-only de um pet (TASK-180).
 *
 * **Visível para**: qualquer visitante, autenticado ou não.
 *
 * **Conteúdo público** (LGPD Art. 7 §1 — mínimo necessário):
 * - Capa + galeria pública
 * - Dados básicos (nome, espécie, porte, idade, sexo, cidade/UF)
 * - Saúde pública (vacinação, castração, vermifugação)
 * - Sobre / descrição
 * - Requisitos de adoção
 * - Card do abrigo (nome, cidade, link para /organizacoes/{id})
 *
 * **Ações de interação** pedem login:
 * - "Quero adotar" → /login (ou /onboarding)
 * - "Falar com o abrigo" → /login
 * - "Compartilhar" → funciona sem login (Web Share API + clipboard)
 *
 * **Dados SENSÍVEIS NUNCA expostos**:
 * - clinical_notes (TASK-136 já separa)
 * - informações de tutor original (LGPD)
 * - localização exata do resgate (apenas cidade/UF)
 *
 * **Rota**: `/pet/:petId` (singular, sem 's' — pública)
 * A rota `/pets/:petId` (plural) é a autenticada, com botões de gestão.
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { doc, getDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { PublicPetTimeline } from '@/modules/pets/components/PublicPetTimeline';
import { db } from '@/core/config/firebase';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Seo from '@/components/Seo';
import SocialShare from '@/components/SocialShare';
import {
  Heart, MapPin, MessageCircle, Share2, ArrowLeft, PawPrint,
  ShieldAlert, Info, Users, Calendar, CheckCircle2, XCircle, Building2,
} from 'lucide-react';
import { toast } from 'sonner';

const SIZE_LABEL = { mini: 'Mini', small: 'Pequeno', medium: 'Médio', large: 'Grande', giant: 'Gigante' };
const AGE_LABEL = { puppy: 'Filhote', adult: 'Adulto', senior: 'Idoso' };
const SPECIES_LABEL = { dog: 'Cachorro', cat: 'Gato', rabbit: 'Coelho', bird: 'Pássaro', other: 'Outro' };
const SPECIES_EMOJI = { dog: '🐕', cat: '🐈', rabbit: '🐇', bird: '🦜', other: '🐾' };

const STATUS = {
  available: { label: 'Disponível', color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  in_process: { label: 'Em processo', color: 'bg-amber-100 text-amber-700 border-amber-300' },
  adopted: { label: 'Adotado', color: 'bg-gray-100 text-gray-700 border-gray-300' },
};

export default function PublicPet() {
  const { petId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pet, setPet] = useState(null);
  const [owner, setOwner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [currentPhoto, setCurrentPhoto] = useState(0);

  // Carrega pet
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setNotFound(false);
      try {
        const snap = await getDoc(doc(db, 'pets', petId));
        if (!alive) return;
        if (!snap.exists()) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        const data = { id: snap.id, ...snap.data() };
        setPet(data);

        // Carrega owner (se for organização)
        if (data.owner_type === 'organization' && data.owner_id) {
          const orgSnap = await getDoc(doc(db, 'clubs', data.owner_id));
          if (alive && orgSnap.exists()) {
            setOwner({ id: orgSnap.id, ...orgSnap.data() });
          }
        } else if (data.owner_id) {
          // user profile — só tenta se houver user (regra users é autenticada)
          if (user) {
            const userSnap = await getDoc(doc(db, 'users', data.owner_id));
            if (alive && userSnap.exists()) {
              setOwner({ id: userSnap.id, ...userSnap.data() });
            }
          }
        }
      } catch (err) {
        console.error('[PublicPet] erro:', err);
        if (alive) setNotFound(true);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [petId, user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="aspect-[4/3] w-full rounded-2xl" />
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (notFound || !pet) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <PawPrint className="h-12 w-12 mx-auto text-muted-foreground" />
            <h1 className="text-2xl font-bold">Pet não encontrado</h1>
            <p className="text-muted-foreground">
              Este pet pode ter sido removido ou o link está incorreto.
            </p>
            <Button asChild>
              <Link to="/feed">Ver outros pets</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const photos = Array.isArray(pet.photos) && pet.photos.length > 0
    ? pet.photos
    : (pet.photo_url ? [pet.photo_url] : []);
  const currentPhotoUrl = photos[currentPhoto] || photos[0];
  const statusInfo = STATUS[pet.status] || STATUS.available;
  const speciesEmoji = SPECIES_EMOJI[pet.species] || '🐾';
  const isOrg = pet.owner_type === 'organization';

  function handleAdoptClick() {
    if (!user) {
      // Salva URL para voltar após login
      sessionStorage.setItem('postLoginRedirect', `/pets/${petId}`);
      navigate('/login');
      return;
    }
    // User logado vai para a página completa de interesse
    navigate(`/pets/${petId}`);
  }

  function handleChatClick() {
    if (!user) {
      sessionStorage.setItem('postLoginRedirect', `/pets/${petId}`);
      navigate('/login');
      toast.info('Faça login para falar com o abrigo.');
      return;
    }
    navigate(`/pets/${petId}`);
  }

  async function handleShare() {
    const url = `${window.location.origin}/pet/${petId}`;
    const title = pet.title || pet.name || 'Conheça este pet';
    if (navigator.share) {
      try {
        await navigator.share({ title, text: `${title} — disponível no Viralata!`, url });
      } catch (err) {
        // user cancelou
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        toast.success('Link copiado!');
      } catch {
        toast.error('Não foi possível copiar o link.');
      }
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title={`${pet.title || pet.name || 'Pet'} — Viralata`}
        description={`${speciesEmoji} ${SPECIES_LABEL[pet.species] || 'Pet'} para adoção em ${pet.city || 'Brasil'}. ${pet.description?.slice(0, 140) || 'Conheça no Viralata.'}`}
        image={currentPhotoUrl}
        url={`/pet/${petId}`}
        type="article"
      />

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <Button asChild variant="ghost" size="sm">
            <Link to="/feed">
              <ArrowLeft className="h-4 w-4 mr-1" /> Voltar ao feed
            </Link>
          </Button>
          {/* TASK-143: SocialShare com Web Share API + fallback (WhatsApp/X/Facebook/copy) */}
          <SocialShare
            kind="pet"
            id={petId}
            title={pet.title || pet.name || 'Conheça este pet'}
            description={pet.description?.slice(0, 140)}
            variant="icon"
          />
        </div>

        {/* Capa */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-muted"
        >
          {currentPhotoUrl ? (
            <img
              src={currentPhotoUrl}
              alt={pet.title || pet.name}
              className="w-full h-full object-cover"
              loading="eager"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-7xl">
              {speciesEmoji}
            </div>
          )}
          <Badge className={`absolute top-3 left-3 ${statusInfo.color} border`}>
            {statusInfo.label}
          </Badge>
        </motion.div>

        {/* Thumbnails (se houver mais de uma) */}
        {photos.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {photos.map((url, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCurrentPhoto(i)}
                className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                  i === currentPhoto ? 'border-primary' : 'border-transparent opacity-70'
                }`}
              >
                <img src={url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {/* Cabeçalho */}
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
            {pet.title || pet.name || 'Pet'}
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <PawPrint className="h-4 w-4" /> {SPECIES_LABEL[pet.species] || 'Pet'}
            </span>
            {pet.size && <span>· {SIZE_LABEL[pet.size] || pet.size}</span>}
            {pet.age_group && <span>· {AGE_LABEL[pet.age_group] || pet.age_group}</span>}
            {pet.gender && <span>· {pet.gender === 'male' ? 'Macho' : 'Fêmea'}</span>}
            {pet.city && (
              <span className="flex items-center gap-1">
                · <MapPin className="h-3 w-3" /> {pet.city}{pet.state ? `, ${pet.state}` : ''}
              </span>
            )}
          </div>
        </div>

        {/* CTAs principais */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            size="lg"
            className="flex-1"
            onClick={handleAdoptClick}
            disabled={pet.status === 'adopted'}
          >
            <Heart className="h-5 w-5 mr-2" />
            {pet.status === 'adopted' ? 'Já foi adotado' : 'Quero adotar'}
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="flex-1"
            onClick={handleChatClick}
            disabled={pet.status === 'adopted'}
          >
            <MessageCircle className="h-5 w-5 mr-2" /> Falar com o abrigo
          </Button>
        </div>

        {/* Sobre */}
        {pet.description && (
          <Card>
            <CardContent className="p-5">
              <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
                <Info className="h-4 w-4" /> Sobre
              </h2>
              <p className="text-foreground/85 whitespace-pre-line leading-relaxed">
                {pet.description}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Saúde pública */}
        {(pet.vaccinated || pet.neutered !== undefined || pet.dewormed !== undefined) && (
          <Card>
            <CardContent className="p-5">
              <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" /> Saúde
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <HealthBadge
                  ok={pet.vaccinated === 'yes'}
                  partial={pet.vaccinated === 'partial'}
                  label="Vacinação"
                />
                <HealthBadge ok={pet.neutered === true} label="Castrado" />
                <HealthBadge ok={pet.dewormed === true} label="Vermifugado" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Requisitos */}
        {(pet.needs_yard || pet.needs_screened_apt || pet.good_with_kids === false || pet.good_with_dogs === false || pet.good_with_cats === false) && (
          <Card>
            <CardContent className="p-5">
              <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                <Users className="h-4 w-4" /> Perfil ideal do lar
              </h2>
              <ul className="space-y-2 text-sm">
                {pet.needs_yard && <li>• Precisa de quintal</li>}
                {pet.needs_screened_apt && <li>• Apto com telas de segurança</li>}
                {pet.good_with_kids === false && <li>• Sem crianças pequenas</li>}
                {pet.good_with_dogs === false && <li>• Sem outros cachorros</li>}
                {pet.good_with_cats === false && <li>• Sem gatos</li>}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Card do abrigo (se aplicável) */}
        {owner && (
          <Card>
            <CardContent className="p-5">
              <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                <Building2 className="h-4 w-4" /> Responsável
              </h2>
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  {owner.photo_url || owner.logo_url ? (
                    <AvatarImage src={owner.photo_url || owner.logo_url} alt={owner.name || owner.platform_name} />
                  ) : null}
                  <AvatarFallback>
                    {(owner.name || owner.platform_name || '?').slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="font-semibold">{owner.name || owner.platform_name || 'Anunciante'}</div>
                  {owner.city && (
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {owner.city}{owner.state ? `, ${owner.state}` : ''}
                    </div>
                  )}
                </div>
                {isOrg && (
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/organizacoes/${owner.id}`}>Ver perfil</Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* TASK-135: timeline pública do pet (read-only) */}
        {pet?.shelter_club_id && (
          <PublicPetTimeline petId={petId} shelterClubId={pet.shelter_club_id} />
        )}

        {/* Aviso LGPD / segurança */}
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-4 flex gap-3 text-sm">
            <ShieldAlert className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-amber-900">
              <strong>Adoção responsável:</strong> visite o pet antes de
              decidir, converse com o responsável e nunca faça pagamentos
              antecipados. Em caso de dúvida,{' '}
              <Link to="/legislacao" className="underline">consulte nosso guia</Link>.
            </div>
          </CardContent>
        </Card>

        {/* Footer CTA */}
        <div className="text-center pt-4 pb-8">
          <p className="text-sm text-muted-foreground mb-3">
            Quer ajudar mas não pode adotar agora?
          </p>
          <Button asChild variant="outline">
            <Link to="/comunidade">Conheça nossa comunidade</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function HealthBadge({ ok, partial, label }) {
  return (
    <div className="flex items-center gap-2 p-3 rounded-lg border bg-card">
      {ok ? (
        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
      ) : partial ? (
        <Info className="h-5 w-5 text-amber-500" />
      ) : (
        <XCircle className="h-5 w-5 text-gray-400" />
      )}
      <div>
        <div className="font-medium text-sm">{label}</div>
        <div className="text-xs text-muted-foreground">
          {ok ? 'Sim' : partial ? 'Parcial' : 'Não informado'}
        </div>
      </div>
    </div>
  );
}
