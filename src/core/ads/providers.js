/**
 * Ad providers registry — TASK-024.
 *
 * Cada provider define:
 *  - id: chave usada em platform_settings.adProvider
 *  - label: nome humano
 *  - script: URL do SDK (se aplicável)
 *  - render(slotId, opts): função que injeta o anúncio no DOM
 *  - enabled(config): true se configurado e autorizado
 *  - docsUrl: link para setup/termos
 *
 * Suportados:
 *  - none: placeholder visual (desenvolvimento, sem monetização)
 *  - adsense: Google AdSense (rede mais usada, precisa de aprovação)
 *  - adsterra: Adsterra (alternativa sem aprovação rígida)
 *  - custom: HTML customizado do parceiro
 *
 * Adicionar nova rede:
 *  1) Criar entry em PROVIDERS
 *  2) Implementar render() que faz fetch/inject do script
 *  3) Adicionar campo em platform_settings.adConfig
 *  4) Atualizar docs/AD_PROVIDERS.md com setup
 */
import { Megaphone, ExternalLink } from 'lucide-react';

export const PROVIDERS = {
  none: {
    id: 'none',
    label: 'Sem anúncios (placeholder)',
    icon: Megaphone,
    docsUrl: null,
    enabled: () => true,
    /** Placeholder visual. Mantém UX consistente e informa que ali vai anúncio. */
    render: (container, opts) => {
      const { label = 'Espaço para parceiros', sub = 'Este espaço é reservado para parceiros do Viralata.' } = opts || {};
      container.innerHTML = '';
      const div = document.createElement('div');
      div.className = 'flex items-center gap-3 py-4 text-muted-foreground';
      div.setAttribute('data-ad-placeholder', 'true');
      div.innerHTML = `
        <svg class="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>
        <div class="text-sm">
          <p class="font-medium text-foreground"></p>
          <p class="text-xs text-muted-foreground"></p>
        </div>
      `;
      div.querySelector('p.font-medium').textContent = label;
      div.querySelector('p.text-xs').textContent = sub;
      container.appendChild(div);
    },
  },

  adsense: {
    id: 'adsense',
    label: 'Google AdSense',
    icon: ExternalLink,
    docsUrl: 'https://support.google.com/adsense/answer/9274016',
    /**
     * Requer: platform_settings.adConfig.adsenseClientId (ex: "ca-pub-1234567890")
     *          platform_settings.adConfig.adsenseSlotId   (slot específico)
     * SDK carregado em index.html via <script src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=...">.
     * Aqui apenas insere o <ins> element.
     */
    enabled: (config) => !!(config?.adsenseClientId && config?.adsenseSlotId),
    render: (container, opts) => {
      const { adsenseClientId, adsenseSlotId, adsenseFormat = 'auto', adsenseResponsive = true } = opts || {};
      container.innerHTML = '';
      const ins = document.createElement('ins');
      ins.className = 'adsbygoogle';
      ins.style.display = 'block';
      ins.setAttribute('data-ad-client', adsenseClientId);
      ins.setAttribute('data-ad-slot', adsenseSlotId);
      ins.setAttribute('data-ad-format', adsenseFormat);
      if (adsenseResponsive) ins.setAttribute('data-full-width-responsive', 'true');
      container.appendChild(ins);
      try {
        // eslint-disable-next-line no-undef
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[ad] adsense push failed:', e);
      }
    },
  },

  adsterra: {
    id: 'adsterra',
    label: 'Adsterra',
    icon: ExternalLink,
    docsUrl: 'https://www.adsterra.com/blog/adsterra-direct-link-guide/',
    /**
     * Adsterra usa <script> injetado com key específica. Sem aprovação rígida.
     * Requer: platform_settings.adConfig.adsterraKey
     *          platform_settings.adConfig.adsterraWidth (opcional, default 728)
     *          platform_settings.adConfig.adsterraHeight (opcional, default 90)
     */
    enabled: (config) => !!config?.adsterraKey,
    render: (container, opts) => {
      const { adsterraKey, adsterraWidth = 728, adsterraHeight = 90 } = opts || {};
      container.innerHTML = '';
      const cfg = `{"key": "${adsterraKey}", "width": ${adsterraWidth}, "height": ${adsterraHeight}}`;
      const config = document.createElement('script');
      config.type = 'text/javascript';
      config.text = `var atOptions = ${cfg};`;
      container.appendChild(config);
      const invoke = document.createElement('script');
      invoke.type = 'text/javascript';
      invoke.src = `https://www.profitabledisplaynetwork.com/${adsterraKey}/invoke.js`;
      invoke.async = true;
      container.appendChild(invoke);
    },
  },

  custom: {
    id: 'custom',
    label: 'HTML customizado',
    icon: ExternalLink,
    docsUrl: null,
    /** Requer: platform_settings.adConfig.customHtml (string HTML sanitizado) */
    enabled: (config) => !!config?.customHtml,
    render: (container, opts) => {
      const { customHtml } = opts || {};
      // DomPurify seria ideal; aqui confiamos que admin não vai injetar
      // script malicioso (role 'legal' ou 'platform_admin'). O Firestore
      // rules deveria validar isto — TODO: ver com segurança.
      container.innerHTML = customHtml || '';
    },
  },
};

export const DEFAULT_PROVIDER = 'none';
export const PROVIDER_IDS = Object.keys(PROVIDERS);

export function getProvider(id) {
  return PROVIDERS[id] || PROVIDERS[DEFAULT_PROVIDER];
}
