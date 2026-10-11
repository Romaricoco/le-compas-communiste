/* ══════════════════════════════════════════════════════════
   LA SÉANCE SANS MODÈLE
   Quand aucune clé n'est configurée — ou que Mistral refuse — la
   salle continue de siéger. Les répliques sont écrites d'avance,
   mais le choix, lui, dépend vraiment de ce que tu dis : on lit
   l'argument au compas marxiste, chaque délégué le pèse selon ce
   qui le fait bouger LUI, et c'est ce calcul qui décide qui parle,
   sur quel ton, et de combien sa conviction varie.

   Ce n'est pas un modèle de langage : les six finissent par se
   répéter sur une longue partie. Mais ça ne ment pas — un argument
   vague fait décrocher la salle, un argument concret la fait
   monter, et Adama ne se convainc pas avec les mêmes mots
   qu'Esperanza.
   ══════════════════════════════════════════════════════════ */

const CRIT = {
  propriete:     /propri[ée]t|exproprier?|exproprie|nationalis|collectivis|r[ée]quisition|socialis|mise en commun|coop[ée]rative|autogestion|communs?\b|mutualis/i,
  travail:       /salaire|travail|ouvri|docker|usine|atelier|chantier|port\b|quai|horaire|retraite|emploi|embauch|m[ée]tier|paysan|agricole/i,
  exploitation:  /exploit|patron|actionnaire|profit|rente|dividende|licenci|pr[ée]caire|int[ée]rim|loyer|propri[ée]taire|banque|dette|march[ée]/i,
  international: /fronti[èe]re|international|migrant|exil|[ée]tranger|r[ée]fugi|ailleurs|monde|guerre|palestin|afrique|sud\b/i,
  concret:       /demain|lundi|comment|qui paie|financ|loi\b|d[ée]cret|gr[èe]ve|assembl[ée]e|vote|caisse|budget|imp[ôo]t|taxe|%|euros?|€|\d/i,
  memoire:       /m[ée]moire|histoire|retirada|camp\b|r[ée]publique|espagne|1939|r[ée]sistance|a[ïi]eux|anc[êe]tres|grand-p[èe]re/i,
  culture:       /[ée]cole|[ée]duc|culture|livre|musique|th[ée][âa]tre|art\b|cin[ée]ma|savoir|apprendre/i,
  vague:         /libert[ée]|espoir|avenir|humanit[ée]|r[êe]ve|bonheur|fraternit[ée]|changer le monde|tous ensemble|justice sociale/i,
};

/* Ce qui fait bouger chacun. Positif : ça l'emporte. Négatif : ça
   l'agace. Le scénario donne les six tempéraments, on s'y tient. */
const POIDS = {
  felix:     { propriete: 6, exploitation: 5, memoire: 7, international: 4, concret: 3, travail: 3, culture: 2, vague: -3 },
  alain:     { concret: 7, propriete: 4, culture: 4, travail: 3, international: 2, vague: -5, memoire: -1, exploitation: 3 },
  esperanza: { concret: 8, travail: 5, exploitation: 5, memoire: 4, propriete: 3, vague: -8, international: 1, culture: 0 },
  ana:       { international: 8, culture: 5, memoire: 4, exploitation: 3, propriete: 2, travail: 2, concret: 1, vague: -1 },
  adama:     { travail: 9, concret: 6, exploitation: 5, propriete: 3, international: 2, vague: -6, memoire: 0, culture: 1 },
  roberto:   { exploitation: 5, culture: 4, concret: 4, international: 3, propriete: 3, travail: 2, memoire: 2, vague: -4 },
};

/* Les répliques. {mot} reçoit un mot repris de l'argument du joueur,
   {autre} le nom d'un autre délégué. */
const DIT = {
  felix: {
    pour: [
      ['solennel', 'Voilà ! {mot} — c’est exactement ce que nos pères n’ont pas eu le temps de faire. On reprend là où ils sont tombés.'],
      ['colere', 'Enfin quelqu’un qui ose le dire tout haut ! {mot}, camarade, c’est le cœur de l’affaire.'],
      ['emu', 'Mon père parlait comme toi, dans un wagon, en 39. Il n’est jamais revenu. Toi tu es là, et tu le dis.'],
      ['solennel', 'La salle est avec toi. Continue, ne faiblis pas maintenant.'],
    ],
    contre: [
      ['colere', 'On a déjà entendu ça ! Des phrases ! Où est l’acte, camarade ?'],
      ['doute', 'Tu parles de {mot} comme on parle du beau temps. La bourgeoisie, elle, ne parle pas : elle agit.'],
      ['colere', 'Ce n’est pas une tribune pour les bons sentiments. Qu’est-ce que tu déranges, concrètement ?'],
      ['solennel', 'Je vais être franc : tu n’as pas encore dit qui tu comptes affronter. On n’exproprie personne par accord mutuel.'],
    ],
    vers: [
      ['colere', '{autre}, ne sois pas si prompt à démolir. Écoute d’abord.'],
      ['ironie', '{autre} veut du concret. {autre} a raison. Mais sans horizon, ton concret n’est qu’un emploi du temps.'],
      ['solennel', '{autre}, tu étais plus dure que ça quand il fallait partir. Laisse-le finir.'],
    ],
    relance: [
      ['solennel', 'Et qui t’en empêchera, camarade ? Nomme-les.'],
      ['colere', 'Dis-nous qui perd, si tu gagnes. Sinon tu n’as rien proposé.'],
      ['solennel', 'À quoi reconnaîtra-t-on que c’est fait ?'],
    ],
  },
  alain: {
    pour: [
      ['joie', 'Ça, j’y crois ! {mot}, c’est la première chose sérieuse qu’on entend ici depuis des mois.'],
      ['joie', 'Papa, écoute-le pour une fois. Il dit comment, pas seulement pourquoi.'],
      ['emu', 'Moi je suivrais quelqu’un qui parle comme ça. Dis-moi juste où il faut être, et j’y serai.'],
    ],
    contre: [
      ['doute', 'C’est beau. Mais qui paie ? Dis-moi qui paie, et je te suis.'],
      ['doute', '{mot}, d’accord. Et lundi matin, on fait quoi exactement ? Moi je me lève à cinq heures.'],
      ['colere', 'Vous parlez tous comme mon père. Des grands mots et rien dans les mains.'],
      ['doute', 'Et si personne ne vient ? On a déjà été trente dans une salle pour cinq cents chaises.'],
    ],
    vers: [
      ['colere', 'Tu es seul, papa ! Tu l’as toujours été, et tu appelles ça la lucidité.'],
      ['joie', '{autre}, tu vois bien qu’il a quelque chose. Arrête de chercher la faille.'],
      ['doute', '{autre}, tu ferais quoi à sa place, toi, avec rien et personne ?'],
    ],
    relance: [
      ['doute', 'Et moi là-dedans, j’ai une place ou je regarde ?'],
      ['joie', 'On commence par quoi ? Donne-moi une date.'],
      ['doute', 'Tu as déjà essayé, ou tu l’imagines ?'],
    ],
  },
  esperanza: {
    pour: [
      ['solennel', 'Ça, c’est du solide. {mot}. Je peux le toucher, je peux le compter.'],
      ['ironie', 'Tiens. Un homme qui parle de choses qui existent. Ça faisait longtemps.'],
      ['solennel', 'Je lève la main pour ça. Pas pour le reste de ce qui s’est dit ici.'],
    ],
    contre: [
      ['ironie', 'J’ai tout perdu une fois. Les mots, ça ne remplit pas une gamelle.'],
      ['solennel', 'Montre-moi les mains qui font. Pas la bouche qui promet.'],
      ['ironie', '{mot}. Magnifique. Et avec quoi ? Mon ombre ?'],
      ['colere', 'On m’a déjà fait ce discours, de l’autre côté de la frontière. J’ai marché trois cents kilomètres après.'],
    ],
    vers: [
      ['ironie', '{autre}, tes visions, ça ne remplit toujours pas une gamelle.'],
      ['solennel', '{autre} a raison sur un point, et c’est rare.'],
      ['ironie', 'Laisse-le, {autre}. Il apprendra comme nous : par le dos.'],
    ],
    relance: [
      ['solennel', 'Combien, camarade ? Donne-moi un chiffre, pas une idée.'],
      ['ironie', 'Et quand ça ratera, qui ramasse ?'],
      ['solennel', 'Tu as déjà eu faim ? Réponds franchement.'],
    ],
  },
  ana: {
    pour: [
      ['emu', 'Tu as dit {mot}, et j’ai pensé à ceux qui n’ont pas de tribune du tout. Merci pour eux.'],
      ['calme', 'Il y a une justesse là-dedans. Ça dépasse cette salle, et c’est ce qu’il faut.'],
      ['emu', 'Mon grand-père jouait pour des gens qui partaient. Ce que tu dis leur ressemble.'],
    ],
    contre: [
      ['calme', 'Et les autres, camarade ? Ceux d’au-delà des frontières ? Ils attendent aussi.'],
      ['doute', 'Ce que tu proposes s’arrête à la douane. L’exploitation, elle, la traverse.'],
      ['emu', 'Tu parles de nous. Je voudrais t’entendre parler d’eux.'],
    ],
    vers: [
      ['calme', 'Entre vous deux, je cherche le pont. Il existe, je l’entends.'],
      ['emu', '{autre}, vous dites la même chose avec deux colères différentes.'],
      ['calme', '{autre}, laisse-lui le temps. On ne joue pas juste du premier coup.'],
    ],
    relance: [
      ['calme', 'Et ailleurs, camarade ? Qu’est-ce que ça change ailleurs ?'],
      ['emu', 'Qui portera ça quand tu seras fatigué ?'],
      ['calme', 'Est-ce que ça tient sans toi ?'],
    ],
  },
  adama: {
    pour: [
      ['calme', 'Ça, ça parle au quai. {mot}, les gars comprendront tout de suite.'],
      ['solennel', 'Si c’est vrai, je lève la main. Et j’en ramène quarante.'],
      ['calme', 'C’est simple. C’est bien. Le reste était trop compliqué pour être honnête.'],
    ],
    contre: [
      ['calme', 'Ça change quoi pour le port ? Dis-le simplement.'],
      ['doute', 'J’ai pas compris. Et si moi j’ai pas compris, personne sur le quai comprendra.'],
      ['solennel', 'Si c’est vrai, je lève la main. Pas avant.'],
      ['calme', 'Les gars que je connais, ils demanderont : et ma fiche de paie ? Réponds à ça.'],
    ],
    vers: [
      ['calme', '{autre} parle bien. Moi je parle peu. Mais le quai, c’est moi.'],
      ['solennel', '{autre}, tu vas trop vite pour nous.'],
      ['calme', '{autre} a posé la bonne question. J’attends la réponse aussi.'],
    ],
    relance: [
      ['calme', 'Et pour ceux qui bossent, ça donne quoi ?'],
      ['solennel', 'Qui commence ? Toi ?'],
      ['calme', 'Combien de temps avant que ça se voie ?'],
    ],
  },
  roberto: {
    pour: [
      ['rire', 'Ah ! Enfin du spectacle avec du fond ! {mot} — j’applaudis, et je ne m’applaudis pas souvent.'],
      ['joie', 'J’ai porté l’uniforme, camarade. Je sais reconnaître quelqu’un qui n’a pas peur. Toi, tu n’as pas peur.'],
      ['rire', 'Il est meilleur que moi, et je suis vexée. Continue.'],
    ],
    contre: [
      ['ironie', 'Moi, ancien gendarme, je reconnais un discours qui tient. Celui-ci tient à moitié.'],
      ['rire', 'C’est du théâtre, ça, camarade ! Et je m’y connais, j’en fais tous les samedis.'],
      ['ironie', 'J’ai entendu la même chose en salle de garde. Avec les menottes en plus.'],
      ['doute', 'Tu plais à la salle. Ce n’est pas pareil qu’avoir raison.'],
    ],
    vers: [
      ['rire', '{autre}, respire ! On dirait un sermon du dimanche.'],
      ['ironie', '{autre} a raison, et ça me coûte de le dire.'],
      ['rire', 'Allez, {autre}, souris une fois dans ta vie, la révolution n’est pas un enterrement.'],
    ],
    relance: [
      ['ironie', 'Et quand la police arrivera, camarade ? Parce qu’elle arrivera.'],
      ['rire', 'Tu tiendrais combien de temps, toi, en vrai ?'],
      ['doute', 'Qu’est-ce que tu risques, personnellement ?'],
    ],
  },
};

const IDS = Object.keys(POIDS);
const NOMS = { felix: 'Felix', alain: 'Alain', esperanza: 'Esperanza', ana: 'Ana', adama: 'Adama', roberto: 'Roberto' };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const vus = new Set();

/* Un mot de l'argument qu'on peut lui renvoyer : le plus long mot
   plein, pour éviter « les », « avec », « très ». */
function motSaillant(arg) {
  const mots = String(arg).toLowerCase()
    .replace(/[^a-zàâäéèêëîïôöùûüç\s-]/g, ' ')
    .split(/\s+/)
    .filter(m => m.length > 5 && !/^(pourquoi|comment|lorsque|pendant|toujours|beaucoup|vraiment|certain|plusieurs)/.test(m));
  if (!mots.length) return 'ce que tu dis';
  return mots.sort((a, b) => b.length - a.length)[Math.floor(Math.random() * Math.min(3, mots.length))];
}

function lire(arg) {
  const t = String(arg || '');
  const f = {};
  for (const [k, re] of Object.entries(CRIT)) f[k] = re.test(t) ? 1 : 0;
  // un argument qui ne fait que planer, sans rien de concret ni de matériel
  if (f.vague && !f.concret && !f.propriete && !f.travail) f.vague = 2;
  f.court = t.trim().length < 40 ? 1 : 0;
  return f;
}

function choisir(id, cat, arg, autre) {
  const bank = DIT[id][cat];
  const libres = bank.filter((_, i) => !vus.has(id + cat + i));
  const pool = libres.length ? libres : bank;
  const idx = Math.floor(Math.random() * pool.length);
  const [tone, fr] = pool[idx];
  vus.add(id + cat + bank.indexOf(pool[idx]));
  return {
    tone,
    fr: fr.replace('{mot}', motSaillant(arg)).replace(/\{autre\}/g, NOMS[autre] || 'camarade'),
  };
}

/* Même forme de réponse que /api/tribune, pour que le jeu ne voie
   pas la différence. */
export function offlineRound({ argument, convictions = {} }) {
  const f = lire(argument);
  const deltas = {};
  for (const id of IDS) {
    let d = -2 + Math.random() * 2;
    for (const [crit, poids] of Object.entries(POIDS[id])) d += (f[crit] || 0) * poids * 0.5;
    if (f.court) d -= 4;
    // plus on est déjà convaincu, plus il est dur de gagner un point
    const v = convictions[id] ?? 40;
    if (d > 0) d *= clamp((100 - v) / 60, 0.35, 1);
    if (d < 0) d *= clamp(v / 50, 0.4, 1.2);
    deltas[id] = clamp(Math.round(d), -14, 14);
  }

  const tri = IDS.slice().sort((a, b) => deltas[b] - deltas[a]);
  const meilleur = tri[0], pire = tri[tri.length - 1];
  const total = IDS.reduce((s, id) => s + deltas[id], 0);

  // qui ouvre : celui que ça a le plus remué, dans un sens ou dans l'autre
  const premier = Math.abs(deltas[meilleur]) >= Math.abs(deltas[pire]) ? meilleur : pire;
  const posPremier = deltas[premier] >= 2;
  // qui lui répond : quelqu'un de l'avis contraire si possible
  const second = (posPremier ? pire : meilleur) === premier
    ? IDS.filter(i => i !== premier)[Math.floor(Math.random() * 5)]
    : (posPremier ? pire : meilleur);
  const reste = IDS.filter(i => i !== premier && i !== second);
  const troisieme = reste[Math.floor(Math.random() * reste.length)];

  const lines = [
    { member: premier, to: 'joueur', ...choisir(premier, posPremier ? 'pour' : 'contre', argument, second) },
    { member: second, to: premier, ...choisir(second, 'vers', argument, premier) },
    { member: troisieme, to: 'joueur', ...choisir(troisieme, deltas[troisieme] >= 2 ? 'pour' : 'contre', argument, second) },
  ];

  const questionneur = reste[Math.floor(Math.random() * reste.length)];
  const question = { by: questionneur, ...choisir(questionneur, 'relance', argument, premier) };

  return {
    lines,
    deltas,
    fx: total >= 18 ? 'ovation' : total <= -12 ? 'murmure' : (lines.some(l => l.tone === 'rire') ? 'rire' : null),
    dida: null,
    question,
    horsLigne: true,
  };
}

export function resetOffline() { vus.clear(); }
