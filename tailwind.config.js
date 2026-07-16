import animate from 'tailwindcss-animate';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        highlight: {
          DEFAULT: 'hsl(var(--highlight))',
          foreground: 'hsl(var(--highlight-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
          border: 'hsl(var(--border))',
          input: 'hsl(var(--input))',
          ring: 'hsl(var(--ring))',
          // Cores personalizáveis do card da ONG (gradient + nome). Os
          // values HSL ficam no :root (CSS vars) e em
          // clubs.theme (sobrescritas por ClubThemedScope).
          cover: {
            from: 'hsl(var(--cover-from))',
            to: 'hsl(var(--cover-to))',
            name: 'hsl(var(--cover-name))',
            gradient: 'var(--cover-gradient)',
          },
          sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      // Espaçamentos semânticos — TASK-604
      // 7 níveis: xs(8px), sm(12px), md(16px), lg(24px), xl(32px), 2xl(48px), 3xl(64px)
      spacing: {
        'section-xs': '0.5rem',  // 8px  — entre items de uma lista compacta
        'section-sm': '0.75rem', // 12px — gap entre elementos relacionados
        'section-md': '1rem',    // 16px — gap padrão entre campos de formulário
        'section-lg': '1.5rem', // 24px — gap entre componentes dentro de uma seção
        'section-xl': '2rem',    // 32px — gap entre seções vizinhas
        'section-2xl': '3rem',   // 48px — gap entre grandes blocos
        'section-3xl': '4rem',  // 64px — gap entre páginas/sections raiz
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },

      // Escala tipográfica semântica — TASK-613
      fontSize: {
        'display': ['3rem', { lineHeight: '1.1', fontWeight: '700', letterSpacing: '-0.02em' }],
        'h1': ['2rem', { lineHeight: '1.2', fontWeight: '700', letterSpacing: '-0.01em' }],
        'h2': ['1.5rem', { lineHeight: '1.25', fontWeight: '600' }],
        'h3': ['1.125rem', { lineHeight: '1.35', fontWeight: '600' }],
        'body': ['0.9375rem', { lineHeight: '1.5', fontWeight: '400' }],
        'small': ['0.8125rem', { lineHeight: '1.5', fontWeight: '400' }],
        'tiny': ['0.71875rem', { lineHeight: '1.4', fontWeight: '400' }],
      },

      // Escala tipográfica semântica — TASK-613
      fontSize: {
        'display': ['3rem', { lineHeight: '1.1', fontWeight: '700', letterSpacing: '-0.02em' }],
        'h1': ['2rem', { lineHeight: '1.2', fontWeight: '700', letterSpacing: '-0.01em' }],
        'h2': ['1.5rem', { lineHeight: '1.25', fontWeight: '600' }],
        'h3': ['1.125rem', { lineHeight: '1.35', fontWeight: '600' }],
        'body': ['0.9375rem', { lineHeight: '1.5', fontWeight: '400' }],
        'small': ['0.8125rem', { lineHeight: '1.5', fontWeight: '400' }],
        'tiny': ['0.71875rem', { lineHeight: '1.4', fontWeight: '400' }],
      },
    },
  },
  plugins: [animate],
};
