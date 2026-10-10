/** @type {import('tailwindcss').Config} */
const hsl = (name) => `hsl(var(--${name}) / <alpha-value>)`

module.exports = {
  darkMode: 'class',
  content: [
    './src/components/**/*.{js,jsx,mdx}',
    './src/app/**/*.{js,jsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: hsl('background'),
        foreground: hsl('foreground'),
        card: hsl('card'),
        primary: { DEFAULT: hsl('primary'), foreground: hsl('primary-foreground') },
        muted: { DEFAULT: hsl('muted'), foreground: hsl('muted-foreground') },
        accent: hsl('accent'),
        border: hsl('border'),
        destructive: hsl('destructive'),
        // Teinte de l'univers courant (nutrition / sport / eau / poids / coach).
        // On la change en posant la classe .tone-xxx sur un conteneur.
        tone: { DEFAULT: hsl('tone'), soft: hsl('tone-soft'), fg: hsl('tone-fg') },
        nutri: { DEFAULT: hsl('nutri'), soft: hsl('nutri-soft') },
        sport: { DEFAULT: hsl('sport'), soft: hsl('sport-soft') },
        water: { DEFAULT: hsl('water'), soft: hsl('water-soft') },
        weight: { DEFAULT: hsl('weight'), soft: hsl('weight-soft') },
        coach: { DEFAULT: hsl('coach'), soft: hsl('coach-soft') },
        prot: hsl('prot'),
        gluc: hsl('gluc'),
        lip: hsl('lip'),
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        soft: '0 1px 2px 0 rgb(0 0 0 / 0.04), 0 8px 24px -12px rgb(0 0 0 / 0.12)',
        float: '0 10px 30px -8px rgb(0 0 0 / 0.25)',
      },
    },
  },
  plugins: [],
}
