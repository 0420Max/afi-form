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
  testPression: "SVC_TEST_PRESSION",
};

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
    testPression: m(CODES.testPression),
  };
}

// Montants selon la langue, toujours 2 décimales : « 1 250,50 $ » (fr-CA) ou « $1,250.50 » (en-CA).
export const fmt = (v, lang = "fr") => (v == null ? null
  : Number(v).toLocaleString(lang === "en" ? "en-CA" : "fr-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
export const dollars = (v, lang = "fr") => (v == null ? "—" : lang === "en" ? `$${fmt(v, "en")}` : `${fmt(v)} $`);
