// Tokens repris du web (globals.css) : vert profond, univers colorés, clair + sombre.
const hsl = (h: number, s: number, l: number) => `hsl(${h}, ${s}%, ${l}%)`
const hsla = (h: number, s: number, l: number, a: number) => `hsla(${h}, ${s}%, ${l}%, ${a})`

export type Palette = {
  background: string; foreground: string; card: string; primary: string; primaryFg: string
  muted: string; mutedFg: string; accent: string; border: string; destructive: string
  nutri: string; nutriSoft: string; sport: string; sportSoft: string; water: string; waterSoft: string
  weight: string; weightSoft: string; coach: string; coachSoft: string
  prot: string; gluc: string; lip: string; star: string; overlay: string
}

export const light: Palette = {
  background: hsl(150, 22, 97), foreground: hsl(160, 25, 12), card: hsl(0, 0, 100),
  primary: hsl(158, 64, 22), primaryFg: hsl(0, 0, 98), muted: hsl(150, 16, 94), mutedFg: hsl(160, 10, 40),
  accent: hsl(152, 30, 93), border: hsl(150, 14, 88), destructive: hsl(0, 78, 56),
  nutri: hsl(152, 56, 36), nutriSoft: hsl(152, 44, 92), sport: hsl(22, 92, 52), sportSoft: hsl(24, 95, 93),
  water: hsl(200, 88, 46), waterSoft: hsl(200, 90, 93), weight: hsl(262, 56, 58), weightSoft: hsl(262, 70, 94),
  coach: hsl(172, 62, 34), coachSoft: hsl(172, 50, 91),
  prot: hsl(350, 72, 56), gluc: hsl(36, 94, 48), lip: hsl(221, 72, 58), star: hsl(41, 96, 50),
  overlay: hsla(160, 30, 6, 0.45),
}

export const dark: Palette = {
  background: hsl(160, 20, 6), foreground: hsl(140, 15, 96), card: hsl(160, 16, 9.5),
  primary: hsl(152, 54, 48), primaryFg: hsl(160, 30, 7), muted: hsl(160, 12, 14), mutedFg: hsl(150, 8, 65),
  accent: hsl(160, 16, 17), border: hsl(160, 12, 18), destructive: hsl(0, 70, 58),
  nutri: hsl(152, 56, 52), nutriSoft: hsl(152, 30, 14), sport: hsl(24, 94, 60), sportSoft: hsl(22, 40, 15),
  water: hsl(200, 92, 60), waterSoft: hsl(200, 45, 15), weight: hsl(262, 80, 72), weightSoft: hsl(262, 30, 17),
  coach: hsl(172, 62, 50), coachSoft: hsl(172, 32, 13),
  prot: hsl(350, 80, 66), gluc: hsl(38, 95, 58), lip: hsl(221, 88, 72), star: hsl(41, 96, 56),
  overlay: hsla(160, 30, 2, 0.65),
}

export const radius = { sm: 12, md: 16, lg: 22, xl: 28, pill: 999 }
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 }
export const MIN_TOUCH = 44
