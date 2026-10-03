/* Les six délégués du premier rang — personnages du scénario
   « Felix et la Re-Retirada ». L'ordre est celui de la scène, de
   gauche à droite ; Felix, président de séance, est au centre. */

export const CAST = [
  {
    id: 'esperanza', name: 'Esperanza', role: 'la mémoire',
    img: '/portraits/esperanza.webp', height: 1, nudge: 0,
    voice: '21m00Tcm4TlvDq8ikWAM', gender: 'female', pitch: 0.74, rate: 0.86,
  },
  {
    id: 'alain', name: 'Alain', role: 'le fils',
    img: '/portraits/alain.webp', height: 1, nudge: 0,
    voice: 'VR6AewLTigWG4xSOukaG', gender: 'male', pitch: 1.08, rate: 1.02,
  },
  {
    id: 'felix', name: 'Felix', role: 'président de séance',
    img: '/portraits/felix.webp', height: 0.9, nudge: 0,
    voice: 'ErXwobaYiN019PkySvjV', gender: 'male', pitch: 0.86, rate: 0.98,
  },
  {
    id: 'ana', name: 'Ana', role: 'la violoniste',
    img: '/portraits/ana.webp', height: 1, nudge: 0,
    voice: 'EXAVITQu4vr4xnSDxMaL', gender: 'female', pitch: 1.06, rate: 0.88,
  },
  {
    id: 'adama', name: 'Adama', role: 'le docker',
    img: '/portraits/adama.webp', height: 0.9, nudge: 0,
    voice: 'TxGEqnHWrfWFTfGW9XjX', gender: 'male', pitch: 0.8, rate: 0.8,
  },
  {
    id: 'roberto', name: 'Roberto', role: 'l’ancien gendarme',
    img: '/portraits/roberto.webp', height: 0.96, nudge: 0,
    voice: 'yoZ06aMxZJJ28mfd3POQ', gender: 'male', pitch: 1, rate: 1,
  },
];

export const byId = id => CAST.find(c => c.id === id);
export const indexOf = id => CAST.findIndex(c => c.id === id);

export const ROUNDS = 5;
export const START = 40;
export const CONVINCED_AT = 60;
export const HOSTILE_AT = 25;
export const WIN_AT = 4; // délégués convaincus sur 6

export const stance = v => (v >= CONVINCED_AT ? 'convaincu' : v <= HOSTILE_AT ? 'hostile' : 'sceptique');
