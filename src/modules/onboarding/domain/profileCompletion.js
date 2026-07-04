function hasText(value, min = 1) {
  return String(value || '').trim().length >= min;
}

export function isAdopterProfileComplete(profile) {
  if (!profile) return false;

  return (
    hasText(profile.full_name)
    && hasText(profile.city, 2)
    && hasText(profile.state, 2)
    && hasText(profile.housing_type)
    && hasText(profile.daily_walks)
    && hasText(profile.budget_level)
    && (profile.lgpd_consent === true || Boolean(profile.lgpd_consent_at))
  );
}
