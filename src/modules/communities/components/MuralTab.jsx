import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { FEATURE_FLAG } from '@/core/featureFlags';
import MuralTabOriginal from './MuralTab.original';
import MuralTabEnhanced from './MuralTabEnhanced';

/**
 * Wrapper do Mural da comunidade. Mantém a versão original como default
 * (somente leitura) e expõe curtidas + comentários em
 * `MuralTabEnhanced` quando a flag `mural_likes_and_comments` está ligada
 * em `platform_settings/global`.
 */
export default function MuralTab(props) {
  const useEnhanced = useFeatureFlag(FEATURE_FLAG.MURAL_LIKES_AND_COMMENTS);
  return useEnhanced ? <MuralTabEnhanced {...props} /> : <MuralTabOriginal {...props} />;
}