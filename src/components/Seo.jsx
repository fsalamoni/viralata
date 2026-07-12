import { useEffect } from 'react';

/**
 * Helper de SEO por rota (TASK-183).
 *
 * SPA sem SSR: atualizamos `document.title` e as meta tags no client.
 * Crawlers modernos (Googlebot) executam JS; para og:* em share de
 * rede social o fallback é o index.html estático. Cada página pública
 * monta `<Seo title=... description=... image=... />`.
 *
 * As tags são criadas on-demand (se não existirem no index.html) e
 * restauradas ao default no unmount para não vazar entre rotas.
 */

const DEFAULTS = {
  title: 'Viralata — adoção responsável de pets',
  description:
    'Viralata — plataforma gratuita de adoção responsável de pets no Brasil. ' +
    'Encontre pets para adoção, converse com ONGs e responsáveis, e cadastre pets com segurança.',
  image: '/favicon.svg',
};

function upsertMeta(attr, key, content) {
  if (typeof document === 'undefined') return;
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function applySeo({ title, description, image, url }) {
  document.title = title;
  upsertMeta('name', 'description', description);
  upsertMeta('property', 'og:title', title);
  upsertMeta('property', 'og:description', description);
  upsertMeta('property', 'og:image', image);
  upsertMeta('property', 'og:type', 'website');
  upsertMeta('property', 'og:url', url);
  upsertMeta('name', 'twitter:card', 'summary_large_image');
  upsertMeta('name', 'twitter:title', title);
  upsertMeta('name', 'twitter:description', description);
  upsertMeta('name', 'twitter:image', image);
}

export function Seo({ title, description, image }) {
  useEffect(() => {
    const fullTitle = title ? `${title} · Viralata` : DEFAULTS.title;
    applySeo({
      title: fullTitle,
      description: description || DEFAULTS.description,
      image: image || DEFAULTS.image,
      url: typeof window === 'undefined' ? '' : window.location.href,
    });
    return () => {
      applySeo({
        title: DEFAULTS.title,
        description: DEFAULTS.description,
        image: DEFAULTS.image,
        url: typeof window === 'undefined' ? '' : window.location.origin,
      });
    };
  }, [title, description, image]);
  return null;
}

export default Seo;
