/**
 * @fileoverview VolunteerProgram — página pública /voluntarios
 * (TASK-235 / Regra A §A.3).
 *
 * Landing institucional do programa de voluntariado. Apresenta o programa
 * em PT-BR, três CTAs principais e FAQ. É a porta de entrada para o
 * fluxo de inscrição pública.
 *
 * - Totalmente pública (sem auth) — anonymous visitor pode ler.
 * - Mobile-first e WCAG AA (semântica, contraste, keyboard nav).
 * - Hero usa o `<PageHero>` padrão da plataforma, com gradiente
 *   controlado pela flag `PAGE_HERO_ENABLED` (idêntico ao resto).
 */

import { Link } from 'react-router-dom';
import Seo from '@/components/Seo';
import {
  HeartHandshake, ClipboardList, Building2, HelpCircle,
  CalendarCheck, ShieldCheck, ScrollText,
} from 'lucide-react';
import PageHero from '@/components/PageHero';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useArenaPageClasses } from '@/core/lib/useArenaPageClasses';

const FAQ_ITEMS = [
  {
    q: 'Preciso ter experiência prévia com animais?',
    a: 'Não. O programa aceita pessoas com qualquer nível de experiência. Os abrigos oferecem orientações iniciais de manejo, comportamento animal, primeiros socorros, zoonoses e LGPD.',
  },
  {
    q: 'Posso ser voluntário em mais de um abrigo?',
    a: 'Sim. Você pode entrar na rostagem de quantos abrigos quiser, desde que aceite o termo de voluntariado uma única vez e mantenha sua disponibilidade atualizada.',
  },
  {
    q: 'Existe custo ou contraprestação envolvida?',
    a: 'Não. O voluntariado é gratuito, espontâneo e sem vínculo empregatício (Lei 9.608/1998). Você pode, a seu critério, arcar com deslocamento e alimentação — alguns abrigos ressarcem despesas mediante recibo.',
  },
  {
    q: 'Quantas horas por semana preciso me comprometer?',
    a: 'Você define a sua disponibilidade. Pode ser 1h por semana, um sábado por mês ou um turno em um evento pontual. O importante é avisar com 24h de antecedência quando não puder comparecer.',
  },
  {
    q: 'O que acontece com meus dados pessoais?',
    a: 'São tratados conforme a LGPD. A base legal é a execução do contrato de voluntariado (art. 7º, V). Você pode solicitar acesso, correção, portabilidade e eliminação a qualquer momento pelo e-mail dpo@viralata.org.',
  },
];

const HOW_IT_WORKS = [
  {
    icon: ScrollText,
    title: '1. Leia o termo',
    description: 'Conheça seus direitos e deveres. O termo integral está disponível antes de qualquer cadastro.',
  },
  {
    icon: ClipboardList,
    title: '2. Preencha seu perfil',
    description: 'Habilidades, disponibilidade, raio de atuação e logística. Leva menos de 5 minutos.',
  },
  {
    icon: Building2,
    title: '3. Escolha um abrigo',
    description: 'Veja os abrigos parceiros na sua região e entre na rostagem daquele que combina com você.',
  },
  {
    icon: CalendarCheck,
    title: '4. Confirme presenças',
    description: 'Receba convocações, faça check-in nos turnos e acumule horas. Tudo registrado na plataforma.',
  },
];

export default function VolunteerProgram() {
  const wrapperClass = useArenaPageClasses('arena-page mx-auto max-w-6xl px-5 py-6 pb-12 space-y-8');

  return (
    <div className={wrapperClass}>
      <Seo title="Seja voluntário" description="Programa de voluntariado do Viralata: ajude abrigos com passeios, transporte, eventos e muito mais." />
      {/* Hero */}
      <PageHero
        eyebrow="Programa de Voluntariado"
        title="Transforme cuidado em horas que valem"
        description="O programa de voluntariado da Viralata conecta pessoas a abrigos parceiros. Cadastre-se, escolha um abrigo e comece a ajudar — sem vínculo empregatício, com seguro, capacitação e certificado de horas."
        actions={
          <>
            <Button asChild size="lg">
              <Link to="/voluntarios/seja">Quero ser voluntário</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/voluntarios/termo">Ver termo completo</Link>
            </Button>
            <Button asChild size="lg" variant="ghost">
              <Link to="/organizacoes">Encontrar abrigo</Link>
            </Button>
          </>
        }
      >
        <ul className="mt-2 grid grid-cols-1 gap-2 text-xs text-orange-50/82 sm:grid-cols-3">
          <li className="flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-orange-100" aria-hidden="true" />
            <span>Seguro de acidentes pessoais (Lei 9.608/98 art. 2º-B)</span>
          </li>
          <li className="flex items-center gap-2">
            <ScrollText className="h-3.5 w-3.5 text-orange-100" aria-hidden="true" />
            <span>Termo registrado eletronicamente (Lei 14.063/2020)</span>
          </li>
          <li className="flex items-center gap-2">
            <CalendarCheck className="h-3.5 w-3.5 text-orange-100" aria-hidden="true" />
            <span>Certificado de horas ao final de cada ano</span>
          </li>
        </ul>
      </PageHero>

      {/* Como funciona */}
      <section aria-labelledby="how-it-works-title" className="space-y-3">
        <div className="space-y-1">
          <h2 id="how-it-works-title" className="text-xl font-bold text-foreground sm:text-2xl">
            Como funciona
          </h2>
          <p className="text-sm text-muted-foreground">
            Em quatro passos você sai do cadastro para o primeiro turno no abrigo.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {HOW_IT_WORKS.map(({ icon: Icon, title, description }) => (
            <Card key={title} className="overflow-hidden">
              <CardHeader className="space-y-2 p-4 sm:p-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </div>
                <CardTitle className="text-sm">{title}</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0 text-sm text-foreground/80 sm:px-5 sm:pb-5">
                {description}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Por que voluntariar */}
      <section aria-labelledby="why-volunteer-title" className="space-y-3">
        <div className="space-y-1">
          <h2 id="why-volunteer-title" className="text-xl font-bold text-foreground sm:text-2xl">
            Por que ser voluntário pela Viralata?
          </h2>
          <p className="text-sm text-muted-foreground">
            Você contribui com a causa animal e ainda recebe benefícios práticos.
          </p>
        </div>
        <Card>
          <CardContent className="grid grid-cols-1 gap-4 p-4 sm:p-5 sm:grid-cols-2">
            <div className="flex gap-3">
              <HeartHandshake className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-foreground">Impacto direto</p>
                <p className="text-sm text-foreground/80">
                  Cada turno registrado aumenta a taxa de adoção e reduz o tempo de permanência dos animais no abrigo.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <ShieldCheck className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-foreground">Segurança jurídica</p>
                <p className="text-sm text-foreground/80">
                  Termo formalizado, com clareza sobre a ausência de vínculo empregatício e cobertura securitária.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <ClipboardList className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-foreground">Tudo organizado</p>
                <p className="text-sm text-foreground/80">
                  Escalas, RSVPs, check-in/out e declarações de horas em um só lugar — sem caderno físico.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <CalendarCheck className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-foreground">Horário flexível</p>
                <p className="text-sm text-foreground/80">
                  Você define sua disponibilidade semanal e só recebe convocações compatíveis com ela.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* FAQ */}
      <section aria-labelledby="faq-title" className="space-y-3">
        <div className="space-y-1">
          <h2 id="faq-title" className="flex items-center gap-2 text-xl font-bold text-foreground sm:text-2xl">
            <HelpCircle className="h-5 w-5 text-primary" aria-hidden="true" />
            Perguntas frequentes
          </h2>
          <p className="text-sm text-muted-foreground">
            Se a sua dúvida não estiver aqui, escreva para{' '}
            <a className="text-primary underline underline-offset-2" href="mailto:voluntarios@viralata.org">
              voluntarios@viralata.org
            </a>
            .
          </p>
        </div>
        <div className="space-y-2">
          {FAQ_ITEMS.map((item) => (
            <details
              key={item.q}
              className="group rounded-md border border-primary/10 bg-white/65 p-4 sm:p-5"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <span>{item.q}</span>
                <span
                  aria-hidden="true"
                  className="ml-auto h-5 w-5 shrink-0 rounded-full bg-primary/10 text-center text-xs leading-5 text-primary transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm leading-6 text-foreground/80">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="rounded-[1.25rem] border border-primary/20 bg-white/65 p-6 text-center sm:p-8" aria-labelledby="cta-title">
        <h2 id="cta-title" className="text-xl font-bold text-foreground sm:text-2xl">
          Pronto(a) para começar?
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-foreground/80">
          O cadastro leva menos de 5 minutos. Você vai ler o termo, preencher seu perfil
          e escolher o abrigo onde quer contribuir.
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
          <Button asChild size="lg">
            <Link to="/voluntarios/seja">Quero ser voluntário</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/voluntarios/termo">Ler o termo antes</Link>
          </Button>
        </div>
      </section>

      {/* Skeleton fallback exportado para uso em testes / SSR — não é
          renderizado aqui, mas mantém a página testável quando o
          bundler faz code-splitting. */}
      <span aria-hidden="true" hidden>
        <Skeleton className="h-0 w-0" />
      </span>
    </div>
  );
}
