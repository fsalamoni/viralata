import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { FEATURE_FLAG } from '@/core/featureFlags';
import MuralTabOriginal from './MuralTab.original';
import MuralTabEnhanced from './MuralTabEnhanced';
import MuralTabAdmin from './MuralTabAdmin';

/**
 * Wrapper do Mural da comunidade. Renderiza a versão mais rica habilitada
 * pelas feature flags:
 *
 * 1. `MURAL_RICH_POSTS` (default OFF) — MuralTabAdmin: curtidas, comentários
 *    e CRIAÇÃO de posts com anexos (fotos, vídeos, PDFs etc.). O admin da
 *    comunidade pode incluir arquivos e informações pertinentes.
 * 2. `MURAL_LIKES_AND_COMMENTS` (default OFF) — MuralTabEnhanced: curtidas
 *    e comentários (sem anexos).
 * 3. fallback — MuralTab.original: postar + ler.
 *
 * Ordem de precedência: Admin > Enhanced > Original.
 */
export default function MuralTab(props) {
  const useAdmin = useFeatureFlag(FEATURE_FLAG.MURAL_RICH_POSTS);
  const useEnhanced = useFeatureFlag(FEATURE_FLAG.MURAL_LIKES_AND_COMMENTS);
  if (useAdmin) return <MuralTabAdmin {...props} />;
  if (useEnhanced) return <MuralTabEnhanced {...props} />;
  return <MuralTabOriginal {...props} />;
}
