import React from 'react';
import HomeStats from '@/components/HomeStats';
import Seo from '@/components/Seo';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  PawPrint, Heart, Shield, Users, Megaphone,
  ClipboardList, Search, Sparkles, ArrowRight, CheckCircle2,
} from 'lucide-react';
import { usePlatformSettings } from '@/core/lib/FeatureFlagsContext';
import UpcomingExhibitionsFeed from '@/modules/shelter/components/UpcomingExhibitionsFeed';

const IMPACT_STATS = [
  { value: '500+', label: 'Adoções realizadas' },
  { value: '1.200+', label: 'Animais resgatados' },
  { value: '26', label: 'ONGs parceiras' },
  { value: '14', label: 'Cidades atendidas' },
];

const STEPS = [
  { icon: ClipboardList, title: 'Monte seu perfil', desc: 'Responda algumas perguntas sobre seu espaço e rotina para encontrarmos os pets mais compatíveis.' },
  { icon: Search, title: 'Encontre seu pet', desc: 'Navegue pelo feed personalizado e demonstre interesse nos pets que chamarem sua atenção.' },
  { icon: Heart, title: 'Adote com amor', desc: 'Converse com o responsável pelo chat e finalize a adoção de forma segura e responsável.' },
];

const STORIES = [
  { adopter: 'Fernanda R.', pet: 'Bolt', quote: 'O Viralata me ajudou a encontrar o Bolt em uma semana. O questionário de compatibilidade fez toda diferença.', gradient: 'linear-gradient(135deg,#E8875F,#C1502E)' },
  { adopter: 'Marcos e Júlia', pet: 'Mia', quote: 'Adotamos a Mia pela ONG Refúgio Quatro Patas e o processo foi todo acompanhado e seguro, do início ao fim.', gradient: 'linear-gradient(135deg,#C9A876,#8B6F47)' },
  { adopter: 'Diego T.', pet: 'Zeca', quote: 'Denunciei um caso de maus-tratos pelo app e a ONG parceira resgatou o animal no mesmo dia.', gradient: 'linear-gradient(135deg,#9CAA6B,#5F6B3E)' },
];

const FEATURES = [
  { icon: Heart, title: 'Match inteligente', desc: 'Algoritmo que cruza seu perfil com as necessidades do pet.', bg: 'hsl(17 72% 45% / 0.12)', color: 'hsl(17 72% 38%)' },
  { icon: Users, title: 'Comunidade viva', desc: 'ONGs, tutores e adotantes trocando experiências e apoio.', bg: 'hsl(86 30% 32% / 0.14)', color: 'hsl(86 34% 26%)' },
  { icon: Megaphone, title: 'Denúncias com propósito', desc: 'Reporte maus-tratos com GPS e gere PDF para as autoridades.', bg: 'hsl(40 88% 54% / 0.18)', color: 'hsl(30 60% 32%)' },
  { icon: Shield, title: 'Seguro e gratuito', desc: 'Plataforma 100% gratuita, sem venda de animais.', bg: 'hsl(20 20% 20% / 0.06)', color: 'hsl(20 20% 25%)' },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09 } },
};

export default function Home() {
  const { settings } = usePlatformSettings();

  return (
    <div className="arena-page arena-hero-glow min-h-screen">
      <Seo title="Adoção responsável de pets" description="Encontre pets para adoção, converse com ONGs e cadastre pets com segurança. Plataforma gratuita." />
      {/* TASK-153: contadores agregados (flag home_stats_v1, some se OFF) */}
      <HomeStats />
      {/* Hero */}
      <section className="relative overflow-hidden px-4 sm:px-6 pb-16 pt-14">
        <div className="relative mx-auto grid max-w-[1180px] items-center gap-12 lg:grid-cols-[1.05fr,0.95fr]">
          <motion.div
            initial="hidden"
            animate="show"
            variants={stagger}
            className="gap-y-section-lg text-center lg:text-left lg:gap-y-section-lg"
          >
            <motion.span variants={fadeUp} className="arena-chip mx-auto h-[30px] px-3.5 text-[11.5px] font-bold lg:mx-0">
              <PawPrint className="h-3.5 w-3.5 text-primary" /> {settings.ui_text.home_hero_badge}
            </motion.span>
            <motion.h1 variants={fadeUp} className="text-[28px] font-extrabold leading-[1.1] tracking-[-0.025em] text-foreground sm:text-[38px] lg:text-[50px]">
              {settings.ui_text.home_hero_title_prefix}
              {' '}
              <span className="arena-heading">{settings.ui_text.home_hero_title_highlight}</span>
              {' '}
              {settings.ui_text.home_hero_title_suffix}
            </motion.h1>
            <motion.p variants={fadeUp} className="mx-auto max-w-[480px] text-sm leading-[1.65] text-muted-foreground sm:text-[15px] lg:mx-0">
              {settings.ui_text.home_hero_description}
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-col justify-center gap-3 pt-1 sm:flex-row lg:justify-start">
              <Button asChild className="h-[46px] px-6 text-[14px]">
                <Link to="/feed">{settings.ui_labels.home_primary_cta}</Link>
              </Button>
              <Button asChild variant="outline" className="h-[46px] px-6 text-[14px]">
                <Link to="/login">{settings.ui_labels.home_secondary_cta}</Link>
              </Button>
            </motion.div>
          </motion.div>

          {/* Composição visual do hero */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.15 }}
            className="relative mx-auto aspect-square w-full max-w-[420px]"
          >
            <div className="absolute inset-3.5 rounded-[44%_56%_58%_42%/46%_42%_58%_54%] bg-[linear-gradient(135deg,hsl(var(--primary)/0.35),hsl(var(--highlight)/0.3))] blur-2xl" />
            <div className="arena-panel relative flex h-full items-center justify-center rounded-[40%_60%_55%_45%/48%_44%_56%_52%] overflow-hidden">
              <PawPrint className="h-[130px] w-[130px] text-primary/50" strokeWidth={1.25} />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Impacto */}
      <section className="relative mx-auto max-w-[1000px] px-4 sm:px-6 pb-[72px]">
        <div className="grid grid-cols-2 gap-3.5 rounded-[28px] border border-white bg-card/85 p-5 shadow-[0_24px_60px_-34px_hsl(20_40%_20%/0.35)] backdrop-blur-md sm:grid-cols-4 sm:p-7">
          {IMPACT_STATS.map((stat) => (
            <div key={stat.label} className="p-1.5 text-center">
              <div className="arena-heading text-[28px] font-extrabold">{stat.value}</div>
              <div className="mt-1 text-[12.5px] font-semibold text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Como funciona */}
      <motion.section
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-80px' }}
        variants={stagger}
        className="px-4 sm:px-6 py-[38px]"
      >
        <div className="mx-auto max-w-[900px]">
          <motion.h2 variants={fadeUp} className="mb-11 text-center text-[30px] font-extrabold tracking-[-0.02em] text-foreground">
            Como funciona
          </motion.h2>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, desc }, i) => (
              <motion.div key={title} variants={fadeUp} className="text-center">
                <div className="mx-auto flex h-[60px] w-[60px] items-center justify-center rounded-[20px] bg-[linear-gradient(135deg,hsl(var(--primary))_0%,hsl(var(--highlight))_100%)] text-white shadow-[0_16px_30px_-16px_hsl(17_72%_30%/0.6)]">
                  <Icon className="h-[26px] w-[26px]" />
                </div>
                <div className="mx-auto mt-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-xs font-extrabold text-secondary-foreground">
                  {i + 1}
                </div>
                <h3 className="mt-2.5 mb-1.5 text-[16.5px] font-bold text-foreground">{title}</h3>
                <p className="text-[13.5px] leading-[1.6] text-muted-foreground">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Histórias de adoção */}
      <motion.section
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-80px' }}
        variants={stagger}
        className="px-4 sm:px-6 py-[38px]"
      >
        <div className="mx-auto max-w-[1080px]">
          <motion.div variants={fadeUp} className="mb-10 text-center">
            <span className="arena-chip mx-auto h-[30px] bg-accent/[0.12] px-3.5 text-xs font-bold text-accent">
              <Heart className="h-[15px] w-[15px]" /> Histórias reais
            </span>
            <h2 className="mt-3.5 text-[30px] font-extrabold tracking-[-0.02em] text-foreground">Vidas que mudaram de rumo</h2>
          </motion.div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            {STORIES.map((story) => (
              <motion.div key={story.adopter} variants={fadeUp} className="arena-panel rounded-[24px] p-6">
                <div className="mb-3.5 flex items-center gap-3">
                  <span
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-['Sora'] text-[15px] font-bold text-white"
                    style={{ background: story.gradient }}
                  >
                    {story.adopter.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
                  </span>
                  <div>
                    <div className="text-[13.5px] font-bold text-foreground">{story.adopter}</div>
                    <div className="text-xs text-muted-foreground">adotou {story.pet}</div>
                  </div>
                </div>
                <p className="text-sm italic leading-[1.65] text-foreground/85">&ldquo;{story.quote}&rdquo;</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Funcionalidades */}
      <motion.section
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-80px' }}
        variants={stagger}
        className="px-4 sm:px-6 py-[38px]"
      >
        <div className="mx-auto max-w-[1080px]">
          <motion.h2 variants={fadeUp} className="mb-10 text-center text-[30px] font-extrabold tracking-[-0.02em] text-foreground">
            Tudo em um só lugar
          </motion.h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, desc, bg, color }) => (
              <motion.div key={title} variants={fadeUp} whileHover={{ y: -4 }} className="arena-panel rounded-[22px] p-[22px]">
                <div className="mb-3.5 flex h-11 w-11 items-center justify-center rounded-[15px]" style={{ background: bg, color }}>
                  <Icon className="h-[22px] w-[22px]" />
                </div>
                <h3 className="mb-1.5 text-[15.5px] font-bold text-foreground">{title}</h3>
                <p className="text-[13px] leading-[1.55] text-muted-foreground">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* CTA final */}
      <motion.section
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-80px' }}
        variants={fadeUp}
        className="px-4 sm:px-6 pb-[72px]"
      >
        <div className="arena-panel-strong mx-auto max-w-[900px] rounded-[32px] px-8 py-14 text-center">
          <h2 className="text-[28px] font-extrabold text-white">{settings.ui_text.home_final_cta_title}</h2>
          <p className="mx-auto mt-3 max-w-[420px] text-[15px] text-white/80">{settings.ui_text.home_final_cta_description}</p>
          <Button asChild className="mt-6 h-[52px] px-[30px] text-[15px]">
            <Link to="/login">
              {settings.ui_labels.home_final_cta} <ArrowRight className="ml-1.5 h-[18px] w-[18px]" />
            </Link>
          </Button>
        </div>
      </motion.section>

      {/* TASK-149: Próximas vitrines */}
      <section className="px-4 sm:px-6 py-7 max-w-5xl mx-auto">
        <UpcomingExhibitionsFeed limit={6} />
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-4 sm:px-6 py-7 text-center">
        <p className="text-[13px] text-muted-foreground">© {new Date().getFullYear()} Viralata — Adoção responsável de pets</p>
        <div className="mt-2.5 flex flex-wrap justify-center gap-5">
          <Link to="/termos" className="text-[12.5px] text-muted-foreground hover:text-foreground">Termos</Link>
          <Link to="/politica-privacidade" className="text-[12.5px] text-muted-foreground hover:text-foreground">Privacidade</Link>
          <Link to="/legislacao" className="text-[12.5px] text-muted-foreground hover:text-foreground">Legislação e boas práticas</Link>
        </div>
      </footer>
    </div>
  );
}
