/**
 * @fileoverview PetIDStrip — strip com identificadores únicos do pet.
 *
 * Exibe: pet_code (VLT-000123) + national_pet_id (RG) + microchip.
 * Mostra "—" para campos vazios, com tooltip explicativo.
 *
 * Decisão D-PET-FULL-02/03/04: padronização de IDs.
 *
 * @see docs/V3_PET_DETAIL_FULL_PLAN.md
 */
import React from 'react';
import { motion } from 'framer-motion';
import { Hash, IdCard, Cpu, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/core/lib/utils';
import { toast } from 'sonner';

function Chip({ icon: Icon, label, value, accent = 'primary', emptyMessage = 'Não cadastrado' }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e) => {
    e.stopPropagation();
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success('Copiado!');
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Não foi possível copiar');
    }
  };

  const colorMap = {
    primary: 'border-primary/30 bg-primary/5 text-primary',
    amber: 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700/50 dark:bg-amber-900/20 dark:text-amber-300',
    sky: 'border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-700/50 dark:bg-sky-900/20 dark:text-sky-300',
    gray: 'border-border bg-muted text-muted-foreground',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
        value ? colorMap[accent] : colorMap.gray,
      )}
      title={value || emptyMessage}
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span className="text-[10.5px] uppercase tracking-wide opacity-70">{label}</span>
      {value ? (
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
          aria-label={`Copiar ${label}: ${value}`}
        >
          {value}
          {copied ? (
            <Check className="h-3 w-3 text-emerald-600" aria-hidden="true" />
          ) : (
            <Copy className="h-3 w-3 opacity-50" aria-hidden="true" />
          )}
        </button>
      ) : (
        <span className="opacity-50">{emptyMessage}</span>
      )}
    </div>
  );
}

export default function PetIDStrip({ pet, compact = false }) {
  const petCode = pet?.pet_code;
  const rg = pet?.national_pet_id;
  const microchip = pet?.microchip;

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'flex flex-wrap items-center gap-1.5',
        compact ? 'text-[10.5px]' : 'text-xs',
      )}
      aria-label="Identificadores do pet"
    >
      <Chip
        icon={Hash}
        label="ID"
        value={petCode}
        accent="primary"
        emptyMessage="Aguardando geração de ID"
      />
      <Chip
        icon={IdCard}
        label="RG"
        value={rg}
        accent="amber"
        emptyMessage="RG não cadastrado"
      />
      <Chip
        icon={Cpu}
        label="Chip"
        value={microchip}
        accent="sky"
        emptyMessage="Sem microchip"
      />
    </motion.div>
  );
}
