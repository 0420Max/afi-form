// src/tarifs.js — SOURCE UNIQUE des tarifs affichés par le formulaire.
//
// Aucun montant de service n'est écrit dans le code : ils viennent du board
// Monday « Tarifs AFI » via GET https://afi-ops-backend.onrender.com/api/tarifs/public
// (lu au montage du formulaire). Ce fichier dit seulement QUELS codes du board
// servent à quoi, et comment le tarif d'urgence se calcule.
//
// Règle d'urgence — doc Monday « Règles de garantie AFI » (18420977898), sections 5
// et 7, confirmée contre le board le 1er sept. 2026, vérifiée le 25 sept. 2026 :
//   main-d'œuvre 110 $/h → 135 $/h en urgence (MO_REG → MO_URG)
//   déplacement ≤ 75 km 150 $ → 200 $ ; 75–300 km 300 $ → 350 $ (+ DEP_URG_EXTRA, forfait 50 $)
// « Urgent » n'est jamais présélectionné : c'est le client qui le choisit.

export const CODES = {
  moRegulier: "MO_REG",
  moUrgence: "MO_URG",
  deplacement75: "DEP_75",
  deplacement300: "DEP_300",
  supplementUrgenceDeplacement: "DEP_URG_EXTRA",
  ouverture: "SVC_OUVERTURE",
  fermeture: "SVC_FERMETURE",
  raccordement: "SVC_RACCORDEMENT",
  raccordementV2: "SVC_RACCORDEMENT_V2",
  raccordement2Temps: "SVC_RACCORDEMENT_2TEMPS", // forfait en 2 temps (remplace SVC_RACCORDEMENT, pas en plus)
  bouchonJet: "SVC_BOUCHON_JET", // bouchons d'hiver, par jet (fermeture)
  raccordementAppareil: "SVC_RACCORDEMENT_APPAREIL",
  raccordementInclus: "SVC_RACCORDEMENT_INCLUS", // NOMBRE d'appareils inclus (pas un montant)
  testPression: "SVC_TEST_PRESSION",
};

// Paiement à la réservation (décision Max, 21 oct. 2026) : ces services se paient à l'envoi du formulaire.
// Le montant FACTURÉ est calculé par le serveur (afi-ops-backend, lib/paiement/prepaiementFormulaire.js) ;
// ici, seulement l'affichage, avec les mêmes règles et les mêmes codes du board.
export const SERVICES_PREPAYES = ["opening", "closing", "pressure", "plumbing"];
// Au-delà de ce nombre, aucun montant automatique : l'équipe confirme le prix (même limite au serveur).
export const APPAREILS_MAX = 20;

/** Nombre RÉEL d'appareils : 1 à 7 choisis directement, « 8 ou plus » → nombre exact tapé. → entier ≥ 1 | null */
export function nbAppareils(a) {
  if (!a) return null;
  const v = a.plumbing_devices === "8+" ? a.plumbing_devices_exact : a.plumbing_devices;
  const n = Number(String(v == null ? "" : v).trim());
  if (!Number.isInteger(n) || n < 1) return null;
  if (a.plumbing_devices === "8+" && n < 8) return null;
  return n;
}

export const JETS_MAX = 100;

/** Jets de la fermeture : 0, 12, 20, 30, 48, ou « autre » → nombre exact. → entier ≥ 0 | null */
export function nbJets(a) {
  if (!a) return null;
  const v = a.closing_jets === "autre" ? a.closing_jets_exact : a.closing_jets;
  const t = String(v == null ? "" : v).trim();
  const n = Number(t);
  if (t === "" || !Number.isInteger(n) || n < 0) return null;
  return n;
}

export const estPrepaye = (a) => !!a && a.request_type === "service" && a.client_type === "residential"
  && SERVICES_PREPAYES.includes(a.service_type);

// Montants de LIVRAISON d'un achat (question « Mode de livraison ») : absents du
// board Tarifs AFI, libellés historiques du formulaire conservés tels quels.
// À confirmer par Max. ⚠️ Écart : le board a KM_AFI_RAPIDE = 2,10 $/km, le
// formulaire affiche 2 $/km pour l'express.
export const LIVRAISON = { afi150: 150, afi250: 250, expressParKm: 2 };

export function montant(tarifs, code) {
  const t = (tarifs || []).find((x) => x.code === code);
  return t && t.montant != null && Number.isFinite(Number(t.montant)) ? Number(t.montant) : null;
}

// Tarifs à afficher selon l'urgence choisie. Un montant manquant au board → null
// (l'affichage dit alors « — » ou renvoie à l'équipe, jamais un chiffre inventé).
export function grille(tarifs, urgency) {
  const urgent = urgency === "urgent";
  const m = (code) => montant(tarifs, code);
  const sup = m(CODES.supplementUrgenceDeplacement);
  const plus = (base) => (base == null ? null : urgent ? (sup == null ? null : base + sup) : base);
  return {
    urgent,
    mo: urgent ? m(CODES.moUrgence) : m(CODES.moRegulier),
    dep75: plus(m(CODES.deplacement75)),
    dep300: plus(m(CODES.deplacement300)),
    supplement: urgent ? sup : null,
    ouverture: m(CODES.ouverture),
    fermeture: m(CODES.fermeture),
    raccordement: m(CODES.raccordement),
    raccordementV2: m(CODES.raccordementV2),
    raccordement2Temps: m(CODES.raccordement2Temps),
    bouchonJet: m(CODES.bouchonJet),
    raccordementAppareil: m(CODES.raccordementAppareil),
    raccordementInclus: m(CODES.raccordementInclus),
    testPression: m(CODES.testPression),
  };
}

/**
 * Montant payable à la réservation (avant taxes), pour l'affichage.
 * → { lignes: [{ fr, en, qte, tarif }], sousTotal, deplacementSelonAdresse? } | null (montant incomplet : jamais inventé)
 * Test de pression : le déplacement dépend de l'adresse (calculé au serveur) → sous-total SANS déplacement,
 * deplacementSelonAdresse = { dep75, dep300 } à afficher.
 */
export function reservation(tarifs, a) {
  if (!estPrepaye(a)) return null;
  const g = grille(tarifs, a.urgency);
  const s = a.service_type;
  const lignes = [];
  if (s === "opening") {
    if (g.ouverture == null) return null;
    lignes.push({ fr: "Forfait ouverture saisonnière", en: "Seasonal opening package", qte: 1, tarif: g.ouverture });
  }
  if (s === "closing") {
    const j = nbJets(a);
    if (g.fermeture == null || j == null || j > JETS_MAX) return null;
    lignes.push({ fr: "Forfait fermeture saisonnière", en: "Seasonal closing package", qte: 1, tarif: g.fermeture });
    if (j > 0) {
      if (g.bouchonJet == null) return null;
      lignes.push({ fr: "Bouchons d'hiver (par jet)", en: "Winter plugs (per jet)", qte: j, tarif: g.bouchonJet });
    }
  }
  let deplacementSelonAdresse;
  if (s === "pressure") {
    if (g.testPression == null || g.dep75 == null || g.dep300 == null) return null;
    lignes.push({ fr: "Forfait test de pression / détection de fuite", en: "Pressure test / leak detection package", qte: 1, tarif: g.testPression });
    deplacementSelonAdresse = { dep75: g.dep75, dep300: g.dep300 };
  }
  if (s === "plumbing") {
    const n = nbAppareils(a);
    const inclus = g.raccordementInclus;
    const deux = a.plumbing_two_step === true;
    const base = deux ? g.raccordement2Temps : g.raccordement;
    if (base == null || inclus == null || n == null || n > APPAREILS_MAX) return null;
    lignes.push(deux
      ? { fr: `Forfait raccordement en 2 temps — retour sur place inclus (jusqu'à ${inclus} appareils)`,
          en: `Two-step plumbing package — return visit included (up to ${inclus} devices)`, qte: 1, tarif: base }
      : { fr: `Forfait raccordement (jusqu'à ${inclus} appareils)`, en: `Plumbing package (up to ${inclus} devices)`, qte: 1, tarif: base });
    if (n > inclus) {
      if (g.raccordementAppareil == null) return null;
      lignes.push({ fr: "Appareil additionnel à raccorder", en: "Additional device to connect", qte: n - inclus, tarif: g.raccordementAppareil });
    }
  }
  const sousTotal = Math.round(lignes.reduce((x, l) => x + l.qte * l.tarif, 0) * 100) / 100;
  return { lignes, sousTotal, ...(deplacementSelonAdresse ? { deplacementSelonAdresse } : {}) };
}

// Montants selon la langue, toujours 2 décimales : « 1 250,50 $ » (fr-CA) ou « $1,250.50 » (en-CA).
export const fmt = (v, lang = "fr") => (v == null ? null
  : Number(v).toLocaleString(lang === "en" ? "en-CA" : "fr-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
export const dollars = (v, lang = "fr") => (v == null ? "—" : lang === "en" ? `$${fmt(v, "en")}` : `${fmt(v)} $`);
