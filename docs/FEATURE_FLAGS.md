# Feature Flags — Viralata

**Última atualização**: 2026-07-14
**Regra de ouro**: toda flag tem `defaultValue: false` e só vai pra `true` após validação manual.

## Como usar

```jsx
import { useFeatureFlag, FEATURE_FLAG } from '@/core/lib/FeatureFlagsContext';

const showNewFeature = useFeatureFlag(FEATURE_FLAG.SHELTER_KANBAN);
if (showNewFeature) {
  return <NewFeature />;
}
return <OldFeature />;
```

## Flags ativas

| Flag | Key | Default | Descrição |
|------|-----|---------|-----------|
| `SHELTER_FOUNDATION` | `shelter_foundation` | OFF | TBD |
| `SHELTER_ANIMAL_UNIFIED_PROFILE` | `shelter_animal_unified_profile` | OFF | TBD |
| `SHELTER_PET_TIMELINE` | `shelter_pet_timeline` | OFF | TBD |
| `SHELTER_ADOPTION_WORKFLOW` | `shelter_adoption_workflow` | OFF | TBD |
| `SHELTER_ADOPTER_FULL_PROFILE` | `shelter_adopter_full_profile` | OFF | TBD |
| `SHELTER_POST_ADOPTION_FOLLOWUP` | `shelter_post_adoption_followup` | OFF | TBD |
| `SHELTER_FOSTER` | `shelter_foster` | OFF | TBD |
| `SHELTER_HEALTH_RECORDS` | `shelter_health_records` | OFF | TBD |
| `SHELTER_MEDICATION` | `shelter_medication` | OFF | TBD |
| `SHELTER_GALLERY` | `shelter_gallery` | OFF | TBD |
| `SHELTER_EXHIBITIONS` | `shelter_exhibitions` | OFF | TBD |
| `SHELTER_EXHIBITION_RSVPS` | `shelter_exhibition_rsvps` | OFF | TBD |
| `SHELTER_EXHIBITION_WORKFLOW_V1` | `shelter_exhibition_workflow_v1` | OFF | TBD |
| `SHELTER_VOLUNTEERS` | `shelter_volunteers` | OFF | TBD |
| `SHELTER_VOLUNTEER_PROFILE_V1` | `shelter_volunteer_profile_v1` | OFF | TBD |
| `SHELTER_DASHBOARD` | `shelter_dashboard` | OFF | TBD |
| `SHELTER_KANBAN` | `shelter_kanban` | OFF | TBD |
| `SHELTER_REPORTS` | `shelter_reports` | OFF | TBD |
| `SHELTER_INDICATORS` | `shelter_indicators` | OFF | TBD |
| `SHELTER_SMART_SEARCH` | `shelter_smart_search` | OFF | TBD |
| `SHELTER_LEGAL_TERMS` | `shelter_legal_terms` | OFF | TBD |
| `SHELTER_LEGAL_TERMS_V1` | `shelter_legal_terms_v1` | OFF | TBD |
| `SHELTER_SECURITY_HARDENING` | `shelter_security_hardening` | OFF | TBD |
| `SHELTER_PLATFORM_HEALTH` | `shelter_platform_health` | OFF | TBD |
| `SHELTER_CUTOVER` | `shelter_cutover` | OFF | TBD |
| `ABRIGO` | `abrigo` | OFF | TBD |
| `TBD` | `ad_slots` | OFF | TBD |
| `TBD` | `home_stats_v1` | OFF | TBD |
| `PET_FEED_RELIABILITY_FIX` | `pet_feed_reliability_fix` | **ON** (legado) | Correção de confiabilidade do feed |
| `MURAL_LIKES_AND_COMMENTS` | `mural_likes_and_comments` | **ON** (legado) | Mural com curtidas e comentários |
| `PET_ADOPTION_GATING` | `pet_adoption_gating` | **ON** (legado) | Bloqueio de adoção explicado |
| `MURAL_RICH_POSTS` | `mural_rich_posts` | **ON** (legado) | Mural com posts ricos (anexos) |
| `TBD` | `page_hero_enabled` | OFF | TBD |
| `TBD` | `standardized_page_layout` | OFF | TBD |
| `TBD` | `community_ngo_parity` | OFF | TBD |
| `MOCK_DATA_PANEL` | `mock_data_panel` | **ON** (legado) | Painel de dados demo (mock data) |
