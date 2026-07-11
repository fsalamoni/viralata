/**
 * @fileoverview Política de Cookies — Fase 19.
 *
 * Documenta cookies e tecnologias de rastreamento utilizados pela
 * Viralata, em conformidade com LGPD Art. 9º e Marco Civil Art. 7º.
 *
 * Categorias:
 *  - Essenciais (não-opt-in)
 *  - Funcionais
 *  - Analíticos (agregados, sem identificar usuário)
 *  - Marketing (opt-in)
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 19
 */

import {
  Cookie,
  ShieldCheck,
  Settings2,
  Eye,
  ScrollText,
  Database,
} from 'lucide-react';
import {
  LegalList,
  LegalListItem,
  LegalPage,
  LegalSection,
  LegalStat,
} from '@/components/legal-page';

const COOKIE_TABLE = [
  {
    name: 'viralata_session',
    purpose: 'Sessão autenticada (Firebase Auth)',
    category: 'Essencial',
    duration: '12h',
  },
  {
    name: 'viralata_csrf',
    purpose: 'Token anti-CSRF em formulários sensíveis',
    category: 'Essencial',
    duration: 'Sessão',
  },
  {
    name: 'viralata_locale',
    purpose: 'Idioma e fuso horário do usuário',
    category: 'Funcional',
    duration: '365 dias',
  },
  {
    name: 'viralata_theme',
    purpose: 'Preferência de tema (claro/escuro)',
    category: 'Funcional',
    duration: '365 dias',
  },
  {
    name: 'viralata_dismissed_banners',
    purpose: 'Banners já visualizados (LGPD, manutenção)',
    category: 'Funcional',
    duration: '30 dias',
  },
  {
    name: 'ga_measurement_id',
    purpose: 'Google Analytics 4 (agregado, anonimizado)',
    category: 'Analítico',
    duration: '13 meses',
  },
  {
    name: 'sentrysid',
    purpose: 'Sentry — observabilidade e detecção de erros',
    category: 'Analítico',
    duration: 'Sessão',
  },
  {
    name: 'fbp',
    purpose: 'Meta Pixel — campanhas de marketing (opt-in)',
    category: 'Marketing',
    duration: '90 dias',
  },
];

export default function CookiePolicy() {
  return (
    <LegalPage
      eyebrow="Termos de uso e privacidade"
      title="Política de Cookies e Tecnologias de Rastreamento"
      description="Como a Viralata utiliza cookies, pixels e tecnologias similares para operação da plataforma, personalização, análise agregada e marketing. Em conformidade com a LGPD Art. 9º e o Marco Civil da Internet (Lei 12.965/2014)."
      meta="Versão 2.0 · 10 de julho de 2026. Atualizada para refletir o uso atual de cookies e provedores."
    >
      <LegalSection
        icon={Cookie}
        title="1. O que são cookies?"
        description="Definição rápida."
      >
        <p>
          Cookies são pequenos arquivos de texto armazenados no seu navegador quando você visita
          um site. Eles servem para que o site “lembre” de informações da sua visita, como
          preferências de idioma, itens no carrinho ou status de login. Tecnologias similares
          incluem <strong>pixels</strong> (imagens 1x1 invisíveis que registram visitas),{' '}
          <strong>localStorage</strong> e <strong>sessionStorage</strong> (armazenamento local do
          navegador), e <strong>SDKs de aplicativos</strong> (Firebase, Sentry).
        </p>
      </LegalSection>

      <LegalSection
        icon={Database}
        title="2. Cookies que utilizamos"
        description="Tabela de cookies em uso na plataforma."
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-3">Nome</th>
                <th className="py-2 pr-3">Finalidade</th>
                <th className="py-2 pr-3">Categoria</th>
                <th className="py-2 pr-3">Duração</th>
              </tr>
            </thead>
            <tbody>
              {COOKIE_TABLE.map((c) => (
                <tr key={c.name} className="border-b border-border/50 align-top">
                  <td className="py-2 pr-3 font-mono text-xs">{c.name}</td>
                  <td className="py-2 pr-3">{c.purpose}</td>
                  <td className="py-2 pr-3">
                    <span
                      className={
                        c.category === 'Essencial'
                          ? 'rounded bg-primary/10 px-2 py-0.5 text-xs text-primary'
                          : c.category === 'Funcional'
                            ? 'rounded bg-secondary/30 px-2 py-0.5 text-xs text-foreground/80'
                            : c.category === 'Analítico'
                              ? 'rounded bg-accent px-2 py-0.5 text-xs text-foreground/80'
                              : 'rounded bg-muted px-2 py-0.5 text-xs text-foreground/80'
                      }
                    >
                      {c.category}
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-xs text-muted-foreground">{c.duration}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="pt-2 text-xs text-muted-foreground">
          Tabela pode ser atualizada sem aviso prévio para refletir mudanças técnicas. A versão
          vigente está sempre nesta página.
        </p>
      </LegalSection>

      <LegalSection
        icon={Settings2}
        title="3. Categorias e bases legais (LGPD Art. 9º)"
        description="O que é opt-in vs opt-out."
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <LegalStat label="Essenciais" value="Opt-out" />
          <LegalStat label="Funcionais" value="Opt-out" />
          <LegalStat label="Analíticos" value="Opt-in" />
          <LegalStat label="Marketing" value="Opt-in" />
        </div>
        <LegalList>
          <LegalListItem><strong>Essenciais</strong>: necessários para o funcionamento básico (login, segurança, antifraude). Não exigem consentimento (LGPD Art. 7º II e IX — cumprimento de obrigação legal e legítimo interesse).</LegalListItem>
          <LegalListItem><strong>Funcionais</strong>: melhoram a experiência (idioma, tema). Opt-out: você pode desativar, mas algumas funcionalidades podem ficar limitadas.</LegalListItem>
          <LegalListItem><strong>Analíticos</strong>: medem o desempenho agregado da plataforma. Opt-in: você pode recusar a qualquer momento sem prejuízo.</LegalListItem>
          <LegalListItem><strong>Marketing</strong>: medem campanhas e personalizam comunicações. Opt-in: exigem consentimento explícito.</LegalListItem>
        </LegalList>
      </LegalSection>

      <LegalSection
        icon={Eye}
        title="4. Banner de consentimento"
        description="Quando e como o consentimento é coletado."
      >
        <p>
          No primeiro acesso, a Viralata exibe um banner com opções:
        </p>
        <LegalList>
          <LegalListItem><strong>“Aceitar todos”</strong>: ativa todas as categorias.</LegalListItem>
          <LegalListItem><strong>“Apenas essenciais”</strong>: ativa apenas o necessário para o funcionamento.</LegalListItem>
          <LegalListItem><strong>“Personalizar”</strong>: ativa cada categoria individualmente.</LegalListItem>
        </LegalList>
        <p>
          Sua escolha é registrada com hash + timestamp e pode ser alterada a qualquer momento
          clicando no ícone <Cookie className="inline h-3 w-3" /> no rodapé da plataforma, ou
          acessando <strong>Meu Perfil &gt; Privacidade &gt; Cookies</strong>.
        </p>
      </LegalSection>

      <LegalSection
        icon={ShieldCheck}
        title="5. Provedores terceiros (sub-operadores)"
        description="Quem define cookies em nome da Viralata."
      >
        <LegalList>
          <LegalListItem><strong>Google Analytics 4</strong> — análise agregada, IP anonimizado.</LegalListItem>
          <LegalListItem><strong>Firebase Auth / Firestore</strong> — sessão, autenticação, dados da conta.</LegalListItem>
          <LegalListItem><strong>Sentry</strong> — observabilidade, detecção de erros.</LegalListItem>
          <LegalListItem><strong>Meta Pixel</strong> — campanhas de marketing (apenas com opt-in).</LegalListItem>
          <LegalListItem><strong>Provedor de pagamento</strong> — antifraude, segurança transacional (cookies próprios).</LegalListItem>
        </LegalList>
        <p>
          Esses provedores podem definir cookies em domínios próprios (ex.: google-analytics.com,
          facebook.com). Recomendamos consultar as políticas de cookies de cada provedor.
        </p>
      </LegalSection>

      <LegalSection
        icon={ScrollText}
        title="6. Como gerenciar cookies no seu navegador"
        description="Opções fora da Viralata."
      >
        <p>
          Você pode gerenciar cookies diretamente no seu navegador, bloqueando, limpando ou
          configurando exceções. Cada navegador tem um caminho diferente — geralmente em{' '}
          <em>Configurações &gt; Privacidade e Segurança &gt; Cookies</em>. Para os principais
          navegadores:
        </p>
        <LegalList>
          <LegalListItem><strong>Chrome</strong>: <code>chrome://settings/cookies</code></LegalListItem>
          <LegalListItem><strong>Firefox</strong>: Preferências &gt; Privacidade e Segurança</LegalListItem>
          <LegalListItem><strong>Safari</strong>: Ajustes &gt; Privacidade</LegalListItem>
          <LegalListItem><strong>Edge</strong>: Configurações &gt; Cookies e permissões do site</LegalListItem>
        </LegalList>
        <p>
          Atenção: bloquear cookies essenciais pode impedir o funcionamento da plataforma.
        </p>
      </LegalSection>

      <LegalSection
        icon={ShieldCheck}
        title="7. Do Not Track (DNT) e Global Privacy Control (GPC)"
        description="Sinais de privacidade do navegador."
      >
        <p>
          A Viralata respeita os sinais <strong>Do Not Track</strong> (DNT) e{' '}
          <strong>Global Privacy Control</strong> (GPC) emitidos pelo seu navegador. Quando esses
          sinais estão ativos, cookies analíticos e de marketing são automaticamente desativados,
          independentemente da sua escolha anterior no banner.
        </p>
      </LegalSection>

      <LegalSection
        icon={ScrollText}
        title="8. Disposições finais"
      >
        <p>
          Esta Política integra a <a href="/politica-privacidade">Política de Privacidade</a> e o{' '}
          <a href="/termos">Termo de Uso</a>, e sua aceitação é obrigatória para uso da plataforma.
          Dúvidas podem ser enviadas para <a href="mailto:dpo@viralata.app">dpo@viralata.app</a>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
