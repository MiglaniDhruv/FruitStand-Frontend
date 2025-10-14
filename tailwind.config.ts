import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
          hover: "var(--primary-hover)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
          hover: "var(--secondary-hover)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
          strong: "var(--accent-strong)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
          hover: "var(--destructive-hover)",
        },
        border: "var(--border)",
        input: "var(--input)",
        outline: "var(--outline)",
        ring: "var(--ring)",
        chart: {
          "1": "var(--chart-1)",
          "2": "var(--chart-2)",
          "3": "var(--chart-3)",
          "4": "var(--chart-4)",
          "5": "var(--chart-5)",
        },
        /**
         * Semantic status colors for invoice and payment states
         * All colors meet WCAG AA standards (4.5:1 contrast ratio)
         * Usage: text-status-paid, bg-status-pending/10, etc.
         */
        status: {
          paid: "var(--status-paid)",
          pending: "var(--status-pending)",
          partial: "var(--status-partial)",
          unpaid: "var(--status-unpaid)",
        },
        /**
         * Semantic feedback colors for UI states
         * Guaranteed WCAG AA compliance
         * Usage: text-success, bg-warning/10, text-info
         */
        success: "var(--success)",
        warning: "var(--warning)",
        info: "var(--info)",
        sidebar: {
          DEFAULT: "var(--sidebar)",
          foreground: "var(--sidebar-foreground)",
          primary: "var(--sidebar-primary)",
          "primary-foreground": "var(--sidebar-primary-foreground)",
          accent: "var(--sidebar-accent)",
          "accent-foreground": "var(--sidebar-accent-foreground)",
          border: "var(--sidebar-border)",
          ring: "var(--sidebar-ring)",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        serif: ["var(--font-serif)"],
        mono: ["var(--font-mono)"],
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
      fontSize: {
        'xs-fluid': ['clamp(0.625rem, 0.6rem + 0.125vw, 0.75rem)', { lineHeight: '1.5' }],
        'sm-fluid': ['clamp(0.75rem, 0.7rem + 0.25vw, 0.875rem)', { lineHeight: '1.5' }],
        'base-fluid': ['clamp(0.875rem, 0.8rem + 0.375vw, 1rem)', { lineHeight: '1.6' }],
        'lg-fluid': ['clamp(1rem, 0.9rem + 0.5vw, 1.125rem)', { lineHeight: '1.5' }],
        'xl-fluid': ['clamp(1.125rem, 1rem + 0.625vw, 1.25rem)', { lineHeight: '1.4' }],
        '2xl-fluid': ['clamp(1.25rem, 1.1rem + 0.75vw, 1.5rem)', { lineHeight: '1.3' }],
        '3xl-fluid': ['clamp(1.5rem, 1.3rem + 1vw, 1.875rem)', { lineHeight: '1.2' }],
      },
      lineHeight: {
        'tight-mobile': '1.25',
        'snug-mobile': '1.375',
        'normal-mobile': '1.5',
        'relaxed-mobile': '1.625',
        'loose-mobile': '1.75',
      },
      letterSpacing: {
        'tighter-mobile': '-0.02em',
        'tight-mobile': '-0.01em',
        'normal-mobile': '0em',
        'wide-mobile': '0.01em',
        'wider-mobile': '0.02em',
      },
      spacing: {
        'touch': '2.75rem',
        'touch-sm': '2.5rem',
        'icon-xs': '1rem',
        'icon-sm': '1.25rem',
        'icon-md': '1.5rem',
        'icon-lg': '2rem',
        'icon-xl': '2.5rem',
      },
      /**
       * High contrast mode media query support
       * Usage: high-contrast:border-2 high-contrast:font-bold
       */
      screens: {
        'high-contrast': { raw: '(prefers-contrast: high)' },
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
