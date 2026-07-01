import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PawPrint, Heart, Shield, Building2, AlertTriangle } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-gradient-to-b from-orange-50 to-white py-20 px-4 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="text-6xl">🐾</div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight">
            Encontre seu <span className="text-orange-500">companheiro</span> ideal
          </h1>
          <p className="text-lg text-gray-600 max-w-xl mx-auto">
            O Viralata conecta pets que precisam de um lar com famílias que têm amor para dar. Adoção responsável, gratuita e segura.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" className="bg-orange-500 hover:bg-orange-600 text-white px-8">
              <Link to="/feed">Ver Pets para Adoção</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/register">Cadastrar meu Pet</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-10">Como funciona</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
            {[
              { icon: '📋', step: '1', title: 'Monte seu perfil', desc: 'Responda algumas perguntas sobre seu espaço e rotina para encontrarmos os pets mais compatíveis.' },
              { icon: '🐶', step: '2', title: 'Encontre seu pet', desc: 'Navegue pelo feed personalizado e demonstre interesse nos pets que chamarem sua atenção.' },
              { icon: '🏠', step: '3', title: 'Adote com amor', desc: 'Converse com o responsável pelo chat e finalize a adoção de forma segura e responsável.' },
            ].map(({ icon, step, title, desc }) => (
              <div key={step} className="space-y-3">
                <div className="text-4xl">{icon}</div>
                <div className="w-8 h-8 rounded-full bg-orange-500 text-white text-sm font-bold flex items-center justify-center mx-auto">{step}</div>
                <h3 className="font-semibold text-gray-900">{title}</h3>
                <p className="text-sm text-gray-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Funcionalidades */}
      <section className="py-16 px-4 bg-orange-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-10">Tudo que você precisa</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Heart, title: 'Match inteligente', desc: 'Algoritmo que cruza seu perfil com as necessidades do pet', color: 'text-red-500' },
              { icon: Building2, title: 'ONGs e Lojas', desc: 'Parceiros verificados que cuidam dos pets com responsabilidade', color: 'text-blue-500' },
              { icon: AlertTriangle, title: 'Denúncias', desc: 'Reporte maus-tratos com GPS e gere PDF para autoridades', color: 'text-amber-500' },
              { icon: Shield, title: 'Seguro e gratuito', desc: 'Plataforma 100% gratuita, sem venda de animais', color: 'text-green-500' },
            ].map(({ icon: Icon, title, desc, color }) => (
              <div key={title} className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
                <Icon className={`w-8 h-8 ${color}`} />
                <h3 className="font-semibold text-gray-900">{title}</h3>
                <p className="text-sm text-gray-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="py-16 px-4 text-center bg-white">
        <div className="max-w-xl mx-auto space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">Pronto para mudar uma vida?</h2>
          <p className="text-gray-500">Cada adoção é uma história de amor que começa aqui.</p>
          <Button asChild size="lg" className="bg-orange-500 hover:bg-orange-600 text-white px-10">
            <Link to="/register">Criar minha conta grátis</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-4 text-center text-sm text-gray-400">
        <p>© {new Date().getFullYear()} Viralata — Adoção responsável de pets</p>
        <div className="flex flex-wrap justify-center gap-4 mt-2">
          <Link to="/termos" className="hover:text-gray-600">Termos</Link>
          <Link to="/politica-privacidade" className="hover:text-gray-600">Privacidade</Link>
          <Link to="/legislacao" className="hover:text-gray-600">Legislação e boas práticas</Link>
        </div>
      </footer>
    </div>
  );
}
