import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { createAbuseReport } from '../services/reportService';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import PageHero from '@/components/PageHero';
import { useArenaPageClasses } from '@/core/lib/useArenaPageClasses';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { MapPin, Upload, FileText, ArrowLeft } from 'lucide-react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function CreateReport() {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [coords, setCoords] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [photoFiles, setPhotoFiles] = useState([]);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reportId, setReportId] = useState(null);
  const pdfRef = useRef(null);

  function handlePhotoChange(e) {
    const files = Array.from(e.target.files);
    setPhotoFiles((prev) => [...prev, ...files].slice(0, 5));
    files.forEach((f) => {
      const reader = new FileReader();
      reader.onload = (ev) => setPhotos((prev) => [...prev, ev.target.result].slice(0, 5));
      reader.readAsDataURL(f);
    });
  }

  async function handleGetLocation() {
    if (!navigator.geolocation) { toast.error('Geolocalização não suportada.'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
        toast.success('Localização capturada!');
      },
      () => { toast.error('Não foi possível obter a localização.'); setLocating(false); }
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!description.trim()) { toast.error('Descreva o ocorrido.'); return; }
    setSaving(true);
    try {
      const id = await createAbuseReport({
        description,
        latitude: coords?.lat,
        longitude: coords?.lng,
        address,
        photoFiles,
      }, user);
      setReportId(id);
      toast.success('Denúncia registrada com sucesso!');
    } catch {
      toast.error('Erro ao registrar denúncia. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDownloadPdf() {
    if (!pdfRef.current) return;
    try {
      const canvas = await toPng(pdfRef.current, { quality: 0.95 });
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const imgProps = pdf.getImageProperties(canvas);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(canvas, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`denuncia-viralata-${reportId || 'rascunho'}.pdf`);
    } catch {
      toast.error('Erro ao gerar PDF.');
    }
  }

  const dateStr = format(new Date(), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR });

  return (
    <div className={useArenaPageClasses('arena-page mx-auto max-w-2xl space-y-6 px-4 py-6')}>
      <PageHero
        eyebrow="Denúncia"
        title="Registrar Denúncia"
        description="Esta denúncia ficará registrada na plataforma. Ao concluir, você poderá baixar um PDF formatado para entregar à Delegacia de Crimes Ambientais ou à Polícia Civil."
        actions={
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-1.5 w-4 h-4" /> Voltar
          </Button>
        }
      />

      {!reportId ? (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1">
            <Label htmlFor="description">Descreva o ocorrido <span className="text-destructive">*</span></Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o que você presenciou com o máximo de detalhes possível..."
              rows={5}
            />
          </div>

          <div className="space-y-2">
            <Label>Localização</Label>
            <div className="flex gap-2">
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Endereço aproximado (rua, bairro, cidade)"
                className="flex-1"
              />
              <Button type="button" variant="outline" onClick={handleGetLocation} disabled={locating}>
                <MapPin className="w-4 h-4 mr-1" />
                {locating ? 'Localizando...' : 'GPS'}
              </Button>
            </div>
            {coords && (
              <p className="text-xs text-[hsl(150,38%,32%)]">
                📍 Coordenadas: {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Fotos (até 5)</Label>
            <div className="flex flex-wrap gap-2">
              {photos.map((src, i) => (
                <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border">
                  <img src={src} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => { setPhotos((p) => p.filter((_, j) => j !== i)); setPhotoFiles((p) => p.filter((_, j) => j !== i)); }}
                    className="absolute top-0.5 right-0.5 bg-black/50 text-white rounded-full w-4 h-4 text-xs flex items-center justify-center">×</button>
                </div>
              ))}
              {photos.length < 5 && (
                <label className="w-20 h-20 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary/50">
                  <Upload className="w-5 h-5 text-muted-foreground" />
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoChange} />
                </label>
              )}
            </div>
          </div>

          <Button type="submit" disabled={saving} variant="destructive" className="w-full" size="lg">
            {saving ? 'Registrando...' : 'Registrar Denúncia'}
          </Button>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-[hsl(150,38%,36%,0.35)] bg-[hsl(150,38%,36%,0.12)] p-4 text-[hsl(150,38%,22%)]">
            ✅ Denúncia registrada! Protocolo: <strong>{reportId}</strong>
          </div>

          {/* Preview do PDF */}
          <div ref={pdfRef} className="bg-white border border-gray-200 rounded-xl p-6 space-y-4 text-sm">
            <div className="text-center space-y-1 border-b pb-4">
              <div className="text-2xl font-bold text-primary">🐾 Viralata</div>
              <div className="text-lg font-semibold text-gray-900">DENÚNCIA DE MAUS-TRATOS A ANIMAIS</div>
              <div className="text-gray-500 text-xs">Plataforma Viralata — viralata.web.app</div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div><strong>Data/Hora:</strong> {dateStr}</div>
              <div><strong>Protocolo:</strong> {reportId}</div>
              <div><strong>Denunciante:</strong> {userProfile?.full_name || user?.displayName}</div>
              <div><strong>E-mail:</strong> {user?.email}</div>
            </div>
            {(address || coords) && (
              <div className="text-xs">
                <strong>Local:</strong> {address}
                {coords && <span className="ml-2 text-gray-500">(GPS: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)})</span>}
              </div>
            )}
            <div>
              <strong className="text-xs">Descrição do ocorrido:</strong>
              <p className="mt-1 text-xs text-gray-700 whitespace-pre-wrap">{description}</p>
            </div>
            {photos.length > 0 && (
              <div>
                <strong className="text-xs">Evidências fotográficas ({photos.length} foto{photos.length > 1 ? 's' : ''}):</strong>
                <div className="flex flex-wrap gap-2 mt-2">
                  {photos.map((src, i) => (
                    <img key={i} src={src} alt={`Evidência ${i + 1}`} className="w-24 h-24 object-cover rounded border" />
                  ))}
                </div>
              </div>
            )}
            <div className="border-t pt-3 text-xs text-gray-400 text-center">
              Este documento foi gerado automaticamente pela plataforma Viralata e pode ser apresentado às autoridades competentes.
            </div>
          </div>

          <Button onClick={handleDownloadPdf} className="w-full" size="lg">
            <FileText className="w-4 h-4 mr-2" />
            Baixar PDF para Autoridades
          </Button>
          <Button variant="outline" onClick={() => navigate('/feed')} className="w-full">
            Voltar ao início
          </Button>
        </div>
      )}
    </div>
  );
}
