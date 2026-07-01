import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  PawPrint, Heart, Shield, Building2, AlertTriangle,
  ClipboardList, Search, Sparkles, ArrowRight,
} from 'lucide-react';

const STEPS = [
  { icon: ClipboardList, title: 'Monte seu perfil', desc: 'Responda algumas perguntas sobre seu espaço e rotina para encontrarmos os pets mais compatíveis.' },
  { icon: Search, title: 'Encontre seu pet', desc: 'Navegue pelo feed personalizado e demonstre interesse nos pets que chamarem sua atenção.' },
  { icon: Heart, title: 'Adote com amor', desc: 'Converse com o responsável pelo chat e finalize a adoção de forma segura e responsável.' },
];

const FEATURES = [
  { icon: Heart, title: 'Match inteligente', desc: 'Algoritmo que cruza seu perfil com as necessidades do pet.', tone: 'bg-primary/10 text-primary' },
  { icon: Building2, title: 'ONGs e Lojas', desc: 'Parceiros verificados que cuidam dos pets com responsabilidade.', tone: 'bg-accent/10 text-accent' },
  { icon: AlertTriangle, title: 'Denúncias', desc: 'Reporte maus-tratos com GPS e gere PDF para as autoridades.', tone: 'bg-highlight/20 text-[hsl(30,60%,32%)]' },
  { icon: Shield, title: 'Seguro e gratuito', desc: 'Plataforma 100% gratuita, sem venda de animais.', tone: 'bg-foreground/5 text-foreground/70' },
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
  return (
    <div className="arena-page min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden px-4 pb-20 pt-16 sm:pt-24">
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.05fr,0.95fr]">
          <motion.div
            initial="hidden"
            animate="show"
            variants={stagger}
            className="space-y-6 text-center lg:text-left"
          >
            <motion.span variants={fadeUp} className="arena-chip mx-auto lg:mx-0">
              <PawPrint className="h-3.5 w-3.5 text-primary" /> Adoção responsável e gratuita
            </motion.span>
            <motion.h1 variants={fadeUp} className="text-4xl font-extrabold leading-[1.05] text-foreground sm:text-5xl lg:text-6xl">
              Encontre seu <span className="arena-heading">companheiro</span> ideal
            </motion.h1>
            <motion.p variants={fadeUp} className="mx-auto max-w-xl text-lg leading-relaxed text-muted-foreground lg:mx-0">
              O Viralata conecta pets que precisam de um lar com famílias que têm amor para dar.
              Adoção responsável, gratuita e segura, do início ao fim.
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
              <Button asChild size="lg" className="px-8">
                <Link to="/feed">Ver Pets para Adoção</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/login">Cadastrar meu Pet</Link>
              </Button>
            </motion.div>
          </motion.div>

          {/* Composição visual do hero */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.15 }}
            className="relative mx-auto aspect-square w-full max-w-md"
          >
            <div className="absolute inset-6 rounded-[3rem] bg-[linear-gradient(135deg,hsl(var(--primary)/0.35),hsl(var(--highlight)/0.3))] blur-2xl" />
            <div className="arena-panel relative flex h-full items-center justify-center rounded-[2.5rem]">
              <PawPrint className="h-28 w-28 text-primary/70 sm:h-36 sm:w-36" strokeWidth={1.25} />
            </div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="arena-chip absolute -left-4 top-8 sm:-left-8"
            >
              <Sparkles className="h-3.5 w-3.5 text-highlight" /> +500 adoções realizadas
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.65 }}
              className="arena-chip absolute -right-2 bottom-8 sm:-right-6"
            >
              <Heart className="h-3.5 w-3.5 text-primary" /> 100% sem custo
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Como funciona */}
      <motion.section
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-80px' }}
        variants={stagger}
        className="px-4 py-16 sm:py-24"
      >
        <div className="mx-auto max-w-4xl">
          <motion.h2 variants={fadeUp} className="mb-12 text-center text-2xl font-bold text-foreground sm:text-3xl">
            Como funciona
          </motion.h2>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, desc }, i) => (
              <motion.div key={title} variants={fadeUp} className="space-y-3 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,hsl(var(--primary))_0%,hsl(var(--highlight))_100%)] text-white shadow-[0_14px_28px_-16px_rgba(64,34,18,0.55)]">
                  <Icon className="h-6 w-6" />
                </div>
                <div className="mx-auto flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">
                  {i + 1}
                </div>
                <h3 className="font-semibold text-foreground">{title}</h3>
                <p className="text-sm text-muted-foreground">{desc}</p>
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
        className="px-4 py-16 sm:py-24"
      >
        <div className="mx-auto max-w-4xl">
          <motion.h2 variants={fadeUp} className="mb-12 text-center text-2xl font-bold text-foreground sm:text-3xl">
            Tudo que você precisa
          </motion.h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, desc, tone }) => (
              <motion.div key={title} variants={fadeUp} whileHover={{ y: -4 }} className="arena-panel space-y-3 rounded-[1.5rem] p-5">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${tone}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-foreground">{title}</h3>
                <p className="text-sm text-muted-foreground">{desc}</p>
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
        className="px-4 pb-20"
      >
        <div className="arena-panel-strong mx-auto max-w-4xl rounded-[2rem] px-8 py-14 text-center">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">Pronto para mudar uma vida?</h2>
          <p className="mx-auto mt-3 max-w-md text-white/75">Cada adoção é uma história de amor que começa aqui.</p>
          <Button asChild size="lg" className="mt-6 px-10">
            <Link to="/login">
              Criar minha conta grátis <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </motion.section>

      {/* Footer */}
      <footer className="border-t border-white/60 px-4 py-8 text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} Viralata — Adoção responsável de pets</p>
        <div className="mt-2 flex flex-wrap justify-center gap-4">
          <Link to="/termos" className="hover:text-foreground">Termos</Link>
          <Link to="/politica-privacidade" className="hover:text-foreground">Privacidade</Link>
          <Link to="/legislacao" className="hover:text-foreground">Legislação e boas práticas</Link>
        </div>
      </footer>
    </div>
  );
}
