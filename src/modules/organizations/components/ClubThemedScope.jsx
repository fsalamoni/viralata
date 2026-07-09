import React, { useMemo } from 'react';
import { effectiveClubTheme, buildClubThemeStyle } from '../domain/clubTheme';

/**
 * Wrapper que aplica o tema visual da ONG (CSS variables) ao escopo de
 * uma página inteira. Use uma vez por página que deva refletir a
 * identidade da ONG — normalmente `ClubDetail` (página pública) e
 * `OrganizationAdminPanel` (para o admin ver o que está editando).
 *
 * `className` é aplicado no wrapper; variáveis CSS cascateiam para
 * todos os descendentes. Campos não definidos no `club.theme` caem no
 * default (mesmo do `index.css`), portanto nunca há pintura
 * "quebrada" — só personalização opcional.
 */
export default function ClubThemedScope({ club, className, children, as: As = 'div' }) {
  const style = useMemo(() => buildClubThemeStyle(effectiveClubTheme(club)), [club?.theme]);
  return (
    <As className={className} style={style}>
      {children}
    </As>
  );
}
