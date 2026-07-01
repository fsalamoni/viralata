import { Megaphone } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { FEATURE_FLAG } from '@/core/featureFlags';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';

/**
 * Espaço reservado para "conteúdo patrocinado" — não intrusivo, sem integração
 * com nenhuma rede de anúncios real. Controlado pela flag `ad_slots`
 * (`platform_settings/global`); enquanto desligada, não renderiza nada.
 */
export default function AdSlot({ className = '' }) {
  const enabled = useFeatureFlag(FEATURE_FLAG.AD_SLOTS);
  if (!enabled) return null;

  return (
    <Card className={`border-dashed bg-gray-50 ${className}`}>
      <CardContent className="flex items-center gap-3 py-4 text-gray-500">
        <Megaphone className="w-5 h-5 flex-shrink-0" />
        <div className="text-sm">
          <p className="font-medium">Conteúdo patrocinado</p>
          <p className="text-xs text-gray-400">Este espaço é reservado para parceiros do Viralata.</p>
        </div>
      </CardContent>
    </Card>
  );
}
