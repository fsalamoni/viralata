/**
 * @fileoverview VolunteerProgram V3 — landing pública do programa de voluntariado.
 *
 * V3 (TASK-V3-VOLUNTEER): redesign do zero, sem aproveitar o JSX do V1.
 * Flag: V3_PAGE_VOLUNTEER (default OFF, gated via React.lazy).
 *
 * Rota: /voluntarios
 *
 * Funcionalidades:
 *  - Hero impactante com gradiente coral→amber
 *  - 3 stat cards de impacto (voluntários, abrigos, horas)
 *  - 4 steps "Como funciona" com ícones numerados
 *  - Grid de benefícios com ícones
 *  - FAQ com details/summary acessível
 *  - CTAs em 2 pontos da página
 *  - Reusar Seo (canonical)
 *  - A11y WCAG AA, dark mode, reduced motion
 *
 * @see docs/REGENCY_VOLUNTEER_V3.md
 * @see .harness/v3-redesign/DIRECTIVE.md
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  HeartHandshake, ClipboardList, Building2, HelpCircle,
  CalendarCheck, ShieldCheck, ScrollText, Users, Award,
  Clock, Sparkles, ArrowRight, Check, BookOpen,
} from 'lucide-react';
import { Seo } from '@/components/Seo';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// ============================================================================
// DATA
// ============================================================================

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
    q: 'Recebo certificado de horas?',
    a: 'Sim. Sua declaração de horas fica disponível no seu perfil ao final de cada ano e pode ser exportada em PDF para usar em currículo, faculdade ou horas extracurriculares.',
  },
  {
    q: 'O que acontece com meus dados pessoais?',
    a: 'São tratados conforme a LGPD. A base legal é a execução do contrato de voluntariado (art. 7º, V). Você pode solicitar acesso, correção, portabilidade e eliminação a qualquer momento pelo e-mail dpo@viralata.org.',
  },
];

const HOW_IT_WORKS = [
  {
    icon: ScrollText,
    title: 'Leia o termo',
    description: 'Conheça seus direitos e deveres. O termo integral está disponível antes de qualquer cadastro, com registro eletrônico (Lei 14.063/2020).',
    accent: 'from-rose-100 to-rose-50',
  },
  {
    icon: ClipboardList,
    title: 'Preencha seu perfil',
    description: 'Habilidades, disponibilidade, raio de atuação e logística. Leva menos de 5 minutos — você pode editar depois.',
    accent: 'from-amber-100 to-amber-50',
  },
  {
    icon: Building2,
    title: 'Escolha um abrigo',
    description: 'Veja os abrigos parceiros na sua região e entre na rostagem daquele que combina com você.',
    accent: 'from-emerald-100 to-emerald-50',
  },
  {
    icon: CalendarCheck,
    title: 'Confirme presenças',
    description: 'Receba convocações, faça check-in nos turnos e acumule horas. Tudo registrado na plataforma.',
    accent: 'from-sky-100 to-sky-50',
  },
];

const BENEFITS = [
  {
    icon: HeartHandshake,
    title: 'Impacto direto',
    description: 'Cada turno registrado aumenta a taxa de adoção e reduz o tempo de permanência dos animais no abrigo.',
  },
  {
    icon: ShieldCheck,
    title: 'Segurança jurídica',
    description: 'Termo formalizado, com clareza sobre a ausência de vínculo empregatício e cobertura securitária (Lei 9.608/98).',
  },
  {
    icon: ClipboardList,
    title: 'Tudo organizado',
    description: 'Escalas, RSVPs, check-in/out e declarações de horas em um só lugar — sem caderno físico.',
  },
  {
    icon: CalendarCheck,
    title: 'Horário flexível',
    description: 'Você define sua disponibilidade semanal e só recebe convocações compatíveis com ela.',
  },
  {
    icon: Award,
    title: 'Certificado de horas',
    description: 'Declaração anual de horas disponível em PDF para currículo, faculdade ou horas extracurriculares.',
  },
  {
    icon: BookOpen,
    title: 'Capacitação',
    description: 'Acesso a workshops, materiais de manejo, comportamento animal e primeiros socorros.',
  },
];

const ANIM = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function StepCard({ icon: Icon, title, description, accent, index }) {
  return (
    <motion.article
      variants={ANIM}
      className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 transition-shadow hover:shadow-md"
    >
      <div
        className={`absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br ${accent} opacity-50 blur-2xl`}
        aria-hidden="true"
      />
      <div className="relative">
        <div className="flex items-center gap-3">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"
            aria-hidden="true"
          >
            <Icon className="h-5 w-5" />
          </span>
          <span
            className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-xs font-bold text-background"
            aria-hidden="true"
          >
            {index + 1}
          </span>
        </div>
        <h3 className="mt-3 text-base font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
    </motion.article>
  );
}

function BenefitCard({ icon: Icon, title, description }) {
  return (
    <motion.li
      variants={ANIM}
      className="flex gap-3 rounded-xl border border-border bg-card/60 p-4"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-sm text-foreground/75">{description}</p>
      </div>
    </motion.li>
  );
}

function StatPill({ icon: Icon, value, label }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white backdrop-blur">
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      <span><span className="font-bold">{value}</span> {label}</span>
    </div>
  );
}

// ============================================================================
// PAGE
// ============================================================================

export default function VolunteerProgramV3() {
  const reduce = useReducedMotion();

  return (
    <div className="arena-page mx-auto max-w-6xl px-4 py-6 pb-12 sm:px-6" data-testid="volunteer-page">
      <Seo
        title="Seja voluntário — Viralata"
        description="Programa de voluntariado da Viralata: cadastre-se, escolha um abrigo e comece a ajudar. Sem vínculo empregatício, com seguro, capacitação e certificado de horas."
      />

      {/* HERO */}
      <motion.section
        initial="hidden"
        animate="show"
        variants={reduce ? undefined : { show: { transition: { staggerChildren: 0.08 } } }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose-500 via-rose-600 to-amber-700 p-6 text-white shadow-lg sm:p-10"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.18),_transparent_60%)]" aria-hidden="true" />
        <div className="relative grid grid-cols-1 gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div>
            <motion.div variants={ANIM}>
              <Badge variant="secondary" className="border-0 bg-white/20 text-white backdrop-blur">
                <Sparkles className="mr-1 h-3 w-3" aria-hidden="true" />
                Programa de Voluntariado
              </Badge>
            </motion.div>
            <motion.h1 variants={ANIM} className="mt-4 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
              Transforme cuidado em horas que valem
            </motion.h1>
            <motion.p variants={ANIM} className="mt-3 max-w-2xl text-base text-white/90 sm:text-lg">
              A Viralata conecta pessoas a abrigos parceiros. Cadastre-se, escolha um abrigo
              e comece a ajudar — sem vínculo empregatício, com seguro, capacitação e
              certificado de horas.
            </motion.p>
            <motion.div variants={ANIM} className="mt-5 flex flex-wrap items-center gap-2">
              <Button asChild size="lg" className="border-0 bg-white text-rose-700 hover:bg-white/90">
                <Link to="/voluntarios/seja">
                  Quero ser voluntário
                  <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="ghost" className="text-white hover:bg-white/15">
                <Link to="/voluntarios/termo">
                  Ver termo completo
                </Link>
              </Button>
              <Button asChild size="lg" variant="ghost" className="text-white hover:bg-white/15">
                <Link to="/organizacoes">
                  Encontrar abrigo
                </Link>
              </Button>
            </motion.div>
            <motion.ul
              variants={ANIM}
              className="mt-5 flex flex-wrap items-center gap-2"
              aria-label="Benefícios do programa"
            >
              <li><StatPill icon={ShieldCheck} value="" label="Seguro Lei 9.608/98" /></li>
              <li><StatPill icon={ScrollText} value="" label="Termo Lei 14.063/2020" /></li>
              <li><StatPill icon={Award} value="" label="Certificado anual" /></li>
            </motion.ul>
          </div>

          {/* Stats decorativos no hero */}
          <motion.div
            variants={ANIM}
            className="relative hidden lg:flex lg:flex-col lg:justify-center lg:gap-3"
          >
            <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
                  <Users className="h-6 w-6" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-2xl font-extrabold leading-none">2.847</p>
                  <p className="text-xs text-white/80">voluntários ativos</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
                  <Building2 className="h-6 w-6" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-2xl font-extrabold leading-none">186</p>
                  <p className="text-xs text-white/80">abrigos parceiros</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
                  <Clock className="h-6 w-6" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-2xl font-extrabold leading-none">41.2k</p>
                  <p className="text-xs text-white/80">horas em 2025</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* COMO FUNCIONA */}
      <section aria-labelledby="how-it-works-title" className="mt-10 space-y-4">
        <div className="space-y-1">
          <h2 id="how-it-works-title" className="text-2xl font-extrabold text-foreground sm:text-3xl">
            Como funciona
          </h2>
          <p className="text-sm text-muted-foreground">
            Em quatro passos você sai do cadastro para o primeiro turno no abrigo.
          </p>
        </div>
        <motion.div
          initial="hidden"
          animate="show"
          variants={reduce ? undefined : { show: { transition: { staggerChildren: 0.08 } } }}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          {HOW_IT_WORKS.map((step, idx) => (
            <StepCard key={step.title} {...step} index={idx} />
          ))}
        </motion.div>
      </section>

      {/* BENEFÍCIOS */}
      <section aria-labelledby="benefits-title" className="mt-10 space-y-4">
        <div className="space-y-1">
          <h2 id="benefits-title" className="text-2xl font-extrabold text-foreground sm:text-3xl">
            Por que ser voluntário pela Viralata?
          </h2>
          <p className="text-sm text-muted-foreground">
            Você contribui com a causa animal e ainda recebe benefícios práticos.
          </p>
        </div>
        <motion.ul
          initial="hidden"
          animate="show"
          variants={reduce ? undefined : { show: { transition: { staggerChildren: 0.05 } } }}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        >
          {BENEFITS.map((b) => <BenefitCard key={b.title} {...b} />)}
        </motion.ul>
      </section>

      {/* FAQ */}
      <section aria-labelledby="faq-title" className="mt-10 space-y-4">
        <div className="space-y-1">
          <h2 id="faq-title" className="flex items-center gap-2 text-2xl font-extrabold text-foreground sm:text-3xl">
            <HelpCircle className="h-6 w-6 text-primary" aria-hidden="true" />
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
              className="group rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30 sm:p-5"
            >
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3 text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                <span className="flex-1">{item.q}</span>
                <span
                  aria-hidden="true"
                  className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm leading-none text-primary transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm leading-6 text-foreground/80">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA FINAL */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.5 }}
        className="mt-10 overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-rose-50 via-amber-50 to-rose-50 p-6 text-center sm:p-10 dark:from-rose-950/20 dark:via-amber-950/10 dark:to-rose-950/20"
        aria-labelledby="cta-title"
      >
        <h2 id="cta-title" className="text-2xl font-extrabold text-foreground sm:text-3xl">
          Pronto(a) para começar?
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-foreground/80">
          O cadastro leva menos de 5 minutos. Você vai ler o termo, preencher seu perfil
          e escolher o abrigo onde quer contribuir.
        </p>
        <ul className="mx-auto mt-4 flex max-w-md flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-foreground/70">
          <li className="flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
            Sem custo
          </li>
          <li className="flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
            Sem vínculo
          </li>
          <li className="flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
            Com seguro
          </li>
          <li className="flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
            Com certificado
          </li>
        </ul>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <Button asChild size="lg">
            <Link to="/voluntarios/seja">
              Quero ser voluntário
              <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/voluntarios/termo">Ler o termo antes</Link>
          </Button>
        </div>
      </motion.section>
    </div>
  );
}
