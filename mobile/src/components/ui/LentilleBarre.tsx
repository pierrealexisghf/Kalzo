/* eslint-disable react-hooks/refs -- la lentille expose une ref de mesure et des gestes : lus dans des callbacks, jamais pendant le rendu. */
// « Lentille » de barre de navigation : la capsule de verre qui marque l'onglet actif et SUIT LE DOIGT quand on le
// glisse sur la barre (comme la barre de BeReal / Liquid Glass d'iOS 26). Même composant que dans Mes Amendes,
// Anyone In? et Mon Vestiaire.
//
//  - posée au repos sur l'onglet actif (masquée quand aucun onglet n'est actif) ;
//  - au toucher : elle grossit un peu et colle au doigt en direct, l'onglet survolé s'agrandit et un retour
//    haptique discret marque chaque changement d'onglet ;
//  - au relâchement : on va sur l'onglet survolé et la lentille se pose dessus. Un tap fait la même chose.
//
// La barre garde sa propre mise en page : elle mesure chaque onglet (`zones`), branche `refBarre` et `panHandlers`
// sur la rangée qui les contient, et pose `<LentilleVerre>` DANS cette rangée (mêmes coordonnées). Les boutons qui
// ne sont pas des onglets (action centrale) restent des `Pressable` : ils gardent leurs touchers.
import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react'
import { Animated, PanResponder, StyleSheet, type GestureResponderHandlers, type View } from 'react-native'

type NoeudVue = ComponentRef<typeof View>

export type Zone = { x: number; w: number }

export type Lentille = {
  /** Ref (fonction) de la rangée qui contient les onglets. */
  refBarre: (n: NoeudVue | null) => void
  panHandlers: GestureResponderHandlers
  /** Position (coin gauche) animée de la lentille, dans le repère de la rangée. */
  x: Animated.Value
  /** 1 au repos, ~1,14 sous le doigt. */
  echelle: Animated.Value
  largeur: number
  /** Onglet sous la lentille (indice dans `zones`), -1 si aucun. */
  survol: number
  enDoigt: boolean
  /** Échelle animée de l'icône de l'onglet `i` : grandit quand la lentille passe dessus. */
  echelleOnglet: (i: number) => Animated.AnimatedInterpolation<number>
}

export function useLentille({ zones, actif, onChoisir, onSurvol }: {
  zones: Zone[]
  /** Indice (dans `zones`) de l'onglet actif, ou -1 s'il n'y en a pas. */
  actif: number
  onChoisir: (indice: number) => void
  /** Appelé à chaque changement d'onglet sous le doigt (haptique). */
  onSurvol?: () => void
}): Lentille {
  const [x] = useState(() => new Animated.Value(0))
  const [echelle] = useState(() => new Animated.Value(1))
  const [survol, setSurvol] = useState(Math.max(actif, 0))
  const [enDoigt, setEnDoigt] = useState(false)

  const largeur = zones.length > 0 ? Math.max(...zones.map(z => z.w)) : 0
  const centre = useCallback((i: number) => (zones[i] ? zones[i].x + zones[i].w / 2 : 0), [zones])

  // Valeurs lues par les gestes (qui vivent plus longtemps qu'un rendu), mises à jour dans un effet.
  const etat = useRef({ zones, actif, onChoisir, onSurvol, largeur, gauche: 0, pageX: 0, px: 0, survol: 0, enDoigt: false, noeud: null as NoeudVue | null })
  useEffect(() => { Object.assign(etat.current, { zones, actif, onChoisir, onSurvol, largeur }) })
  const refBarre = useCallback((n: NoeudVue | null) => { etat.current.noeud = n }, [])

  const poser = useCallback((i: number) => {
    Animated.spring(x, { toValue: centre(i) - largeur / 2, stiffness: 260, damping: 22, mass: 1, useNativeDriver: true }).start()
  }, [x, centre, largeur])

  // Au repos : sur l'onglet actif (à chaque changement d'onglet, d'où qu'il vienne). Jamais pendant un glissement ; et au
  // relâchement la lentille file directement sur l'onglet choisi (voir plus bas), sans repasser par l'ancien.
  useEffect(() => {
    if (etat.current.enDoigt || largeur === 0 || actif < 0) return
    poser(actif)
  }, [actif, zones, largeur, poser])

  const plusProche = (px: number) => {
    const { zones: z } = etat.current
    let meilleur = 0
    let ecart = Infinity
    z.forEach((zone, i) => {
      const d = Math.abs(px - (zone.x + zone.w / 2))
      if (d < ecart) { ecart = d; meilleur = i }
    })
    return meilleur
  }

  const suivre = (px: number) => {
    etat.current.px = px // dernière position connue du doigt : un simple tap n'émet aucun « move », et moveX vaut alors 0
    const { zones: z, largeur: l } = etat.current
    if (z.length === 0) return
    const premier = z[0].x + z[0].w / 2 - l / 2
    const dernier = z[z.length - 1].x + z[z.length - 1].w / 2 - l / 2
    const cible = Math.min(dernier, Math.max(premier, px - l / 2))
    // Collée au doigt, en direct (pas de ressort pendant le glissement : il ferait traîner la lentille derrière).
    x.stopAnimation()
    x.setValue(cible)
    const i = plusProche(px)
    if (i !== etat.current.survol) {
      etat.current.survol = i
      setSurvol(i)
      etat.current.onSurvol?.()
    }
  }

  const [responder] = useState(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (e, g) => {
      const x0 = g.x0 ?? e.nativeEvent.pageX
      etat.current.pageX = x0
      etat.current.enDoigt = true
      setEnDoigt(true)
      Animated.spring(echelle, { toValue: 1.14, stiffness: 320, damping: 15, mass: 0.7, useNativeDriver: true }).start()
      suivre(x0 - etat.current.gauche)
      // La position de la barre à l'écran est (re)mesurée à chaque toucher ; dès qu'on l'a, on replace la lentille.
      etat.current.noeud?.measureInWindow((px: number) => {
        etat.current.gauche = px
        if (etat.current.enDoigt) suivre(etat.current.pageX - px)
      })
    },
    onPanResponderMove: (_e, g) => { etat.current.pageX = g.moveX; suivre(g.moveX - etat.current.gauche) },
    onPanResponderRelease: () => {
      const i = plusProche(etat.current.px)
      etat.current.enDoigt = false
      setEnDoigt(false)
      Animated.spring(echelle, { toValue: 1, stiffness: 300, damping: 18, mass: 0.7, useNativeDriver: true }).start()
      setSurvol(i)
      etat.current.survol = i
      // (les zones sont lues dans la ref : ce callback a été créé au tout premier rendu, avant toute mesure)
      const zone = etat.current.zones[i]
      if (zone) Animated.spring(x, { toValue: zone.x + zone.w / 2 - etat.current.largeur / 2, stiffness: 260, damping: 22, mass: 1, useNativeDriver: true }).start()
      etat.current.onChoisir(i)
    },
    onPanResponderTerminate: () => {
      etat.current.enDoigt = false
      setEnDoigt(false)
      Animated.spring(echelle, { toValue: 1, stiffness: 300, damping: 18, mass: 0.7, useNativeDriver: true }).start()
    },
  }))

  const echelleOnglet = useCallback((i: number) => {
    const c = centre(i)
    const l = Math.max(largeur, 1)
    return Animated.add(x, largeur / 2).interpolate({ inputRange: [c - l, c, c + l], outputRange: [1, 1.16, 1], extrapolate: 'clamp' })
  }, [x, centre, largeur])

  // Au repos, l'onglet « survolé » est simplement l'onglet actif (-1 : aucun, la lentille est alors masquée).
  return { refBarre, panHandlers: responder.panHandlers, x, echelle, largeur, survol: enDoigt ? survol : actif, enDoigt, echelleOnglet }
}

/** La capsule de verre elle-même. À poser dans la rangée d'onglets (position absolue). */
export function LentilleVerre({ lentille, sombre, hauteur, haut = 0 }: {
  lentille: Lentille; sombre: boolean; hauteur: number; haut?: number
}) {
  if (lentille.largeur === 0 || (!lentille.enDoigt && lentille.survol < 0)) return null
  const sous = lentille.echelle.interpolate({ inputRange: [1, 1.14], outputRange: [0, 1], extrapolate: 'clamp' })
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        s.lentille,
        {
          top: haut, width: lentille.largeur, height: hauteur,
          backgroundColor: sombre ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.06)',
          transform: [{ translateX: lentille.x }, { scale: lentille.echelle }],
        },
      ]}
    >
      {/* Sous le doigt : le verre s'éclaircit, un liseré lumineux apparaît et une ombre le détache de la barre. */}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill, s.reflet,
          {
            opacity: sous,
            backgroundColor: sombre ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.75)',
            borderColor: sombre ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.95)',
            shadowColor: '#000',
          },
        ]}
      />
    </Animated.View>
  )
}

const s = StyleSheet.create({
  lentille: { position: 'absolute', left: 0, borderRadius: 999 },
  reflet: { borderRadius: 999, borderWidth: 1.5, shadowOpacity: 0.28, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
})
