// src/prefill.js
// Préremplissage du formulaire depuis l'URL (page d'assistance, bot, Félix).
//
// Lien COURT de Félix : ?f=<jeton> seulement (voir lireJeton / chargerLienCourt en bas).
//
// Convention UNIQUE partagée avec afi-assistance (6 paramètres + tel) :
//   type        service | piece                           → request_type (piece = « Achat d'une pièce »)
//   piece       pièce demandée (type=piece), 300 car. max  → « Numéro ou description de la pièce »
//   modele      modèle du spa ou de la piscine (type=piece), 120 car. max → ajouté à la pièce
//   symptome    liste fermée (SYMPTOMES ci-dessous)        → texte de la description (+ spa si connu)
//   code        code d'erreur affiché, 12 car. max        → champ « Code affiché » (error_code)
//   description résumé en texte brut, 1800 car. max        → champ « Décrivez le problème »
//   urgence     important | standard | incertain          → urgency (« urgent » n'est JAMAIS coché d'office)
//   source      arbre-chauffage | arbre-pompe | decodeur | symptome | bot | faq | felix
//   tel         10 chiffres (SMS Félix)                    → téléphone
//   conv        identifiant de conversation d'AFI Assist  → envoyé tel quel au serveur (lien
//               vers la conversation dans les Remarques internes du dossier) ; jamais affiché
//   lang        en (page d'assistance /en, bot en anglais) → question « Langue » présélectionnée
//               (modifiable) ; toute autre valeur : ignorée (français par défaut)
//
// Règles : texte brut seulement (React n'interprète jamais de HTML), longueur
// bornée par champ, valeur inconnue ignorée. Tout est prérempli dans des champs
// visibles et modifiables ; rien n'est envoyé automatiquement.

export const SOURCES = ["arbre-chauffage", "arbre-pompe", "decodeur", "symptome", "bot", "faq", "felix"];

// Libellé repris dans la description (langue du formulaire) ; spa = bassin connu (spa présélectionné).
export const SYMPTOMES = {
  "chauffage":              { fr: "Le spa ne chauffe pas", en: "The spa isn't heating", spa: true },
  "code-erreur":            { fr: "Un code d'erreur s'affiche", en: "An error code is displayed" },
  "eau-trouble":            { fr: "Eau trouble", en: "Cloudy water" },
  "fuite":                  { fr: "Fuite d'eau", en: "Water leak" },
  "pompe":                  { fr: "Problème de pompe", en: "Pump problem" },
  "clavier":                { fr: "Problème de clavier", en: "Keypad problem" },
  "eclairage":              { fr: "Problème d'éclairage", en: "Lighting problem" },
  "garantie":               { fr: "Question de garantie", en: "Warranty question" },
  "ouverture-saisonniere":  { fr: "Ouverture saisonnière", en: "Seasonal opening" },
  "hivernage":              { fr: "Fermeture / hivernage", en: "Closing / winterizing" },
  "remplacement-araignee":  { fr: "Remplacement de l'araignée", en: "Sand filter lateral replacement" },
};

// « urgent » absent volontairement : frais majorés, c'est au client de le choisir.
const URGENCES = { important: "important", standard: "standard", incertain: "unsure" };

// Type de service présélectionné seulement depuis ces sources (modifiable) : les arbres de
// diagnostic finissent par « Technicien requis », le décodeur par un code de panne.
const SOURCES_BRIS = ["arbre-chauffage", "arbre-pompe", "decodeur"];

export const LIMITES = { description: 1800, code: 12, piece: 300, modele: 120 };

// Texte brut : retire les caractères de contrôle (sauf saut de ligne) et borne la longueur.
export function texteBrut(v, max) {
  return String(v || "")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, "")
    .trim()
    .slice(0, max);
}

// Casse conservée (Prr, Hr, bo s'affichent ainsi) ; espaces retirés (« - - - » → « --- »).
export function lireCode(v) {
  const c = texteBrut(v, 40).replace(/\s+/g, "");
  return /^[A-Za-z0-9-]{1,12}$/.test(c) ? c : "";
}

// Identifiant de conversation du bot : lettres, chiffres, tirets (8 à 64).
export function lireConv(v) {
  const c = String(v || "").trim();
  return /^[A-Za-z0-9-]{8,64}$/.test(c) ? c : "";
}

// params : URLSearchParams. Renvoie { answers, source, conv, prefilled } où
// prefilled liste les champs remplis depuis l'URL (bandeau d'information).
export function readPrefill(params) {
  const answers = {};
  const get = (k) => (params && params.get(k)) || "";

  // Langue : seul « en » est lu ; le client peut toujours la changer.
  const en = get("lang").trim().toLowerCase() === "en";
  if (en) answers.language = "en";

  const tel = get("tel").replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
  if (tel.length === 10) { answers.phone = tel; answers.ft_client_phone = tel; }

  const src = get("source").trim().toLowerCase();
  const source = SOURCES.includes(src) ? src : "";

  const type = get("type").trim().toLowerCase();
  const service = type === "service";
  // Demande de pièce (bot : pièce absente de la boutique) : type « Achat d'une pièce »,
  // pièce et modèle préremplis, modifiables. Rien d'autre n'est présumé.
  if (type === "piece") {
    answers.request_type = "purchase";
    const piece = texteBrut(get("piece"), LIMITES.piece);
    const modele = texteBrut(get("modele"), LIMITES.modele);
    const lignes = [piece, modele ? (en ? `Model: ${modele}` : `Modèle : ${modele}`) : ""].filter(Boolean);
    if (lignes.length) answers.part_description = lignes.join("\n");
  }
  const symKey = get("symptome").trim().toLowerCase();
  const symptome = Object.prototype.hasOwnProperty.call(SYMPTOMES, symKey) ? SYMPTOMES[symKey] : null;
  const code = lireCode(get("code"));
  let description = texteBrut(get("description"), LIMITES.description);
  const urgence = URGENCES[get("urgence").trim().toLowerCase()] || "";

  if (service) {
    answers.request_type = "service";
    if (SOURCES_BRIS.includes(source)) answers.service_type = "break";
    if (symptome && symptome.spa) { answers.equipment = ["spa"]; answers.pool_type = "spa"; }
    // Équipement « rien de coché » : la question du bassin s'affiche sans
    // obliger le client à cocher un équipement pour atteindre la description.
    else if (answers.service_type) answers.equipment = [];
    if (urgence) answers.urgency = urgence;
  }

  if (!description) {
    const lignes = [];
    if (symptome) lignes.push(en ? `Symptom: ${symptome.en}.` : `Symptôme : ${symptome.fr}.`);
    description = lignes.join("\n");
  }
  // Le code a son propre champ, visible et modifiable ; le serveur l'ajoute à
  // la description de Monday (« Code affiché : … »), sans doublon.
  if (code) answers.error_code = code;
  if (description) answers.description = description.slice(0, LIMITES.description);

  // prefilled : champs affichés dans le bandeau « prérempli » (la langue n'en fait pas partie).
  return { answers, source, conv: lireConv(get("conv")), prefilled: Object.keys(answers).filter((k) => k !== "ft_client_phone" && k !== "language") };
}

// Réponses préremplies remises en place après un changement de type : handleChange
// (AFIForm.jsx) efface les réponses qui dépendent du type de demande ou de service.
// Sans ça, l'urgence triée par Félix était perdue dès que le client cliquait
// « Bris » (felix n'est pas dans SOURCES_BRIS, le type n'est donc pas présélectionné) :
// fiche AFI-1229, 8 oct. 2026, « Standard » au lieu de « important ».
// Seules les clés VIDES après l'effacement sont remises (jamais une réponse du client).
export function clesARestaurer(slug, value) {
  if (slug === "service_type") return ["equipment", "pool_type", "urgency"];
  if (slug === "request_type" && value === "service") return ["service_type", "equipment", "pool_type", "urgency"];
  if (slug === "request_type" && value === "purchase") return ["part_description"];
  return [];
}

// next : réponses après effacement (modifié en place et renvoyé) ;
// prefillAnswers : réponses lues de l'URL au chargement.
export function restaurerPrefill(next, prefillAnswers, slug, value) {
  for (const k of clesARestaurer(slug, value)) {
    const v = prefillAnswers && prefillAnswers[k];
    if (next[k] === undefined && v !== undefined) next[k] = Array.isArray(v) ? [...v] : v;
  }
  return next;
}

// ── Lien COURT de Félix (?f=jeton, phase 3b) ─────────────────────────────────────
// Le texto de Félix ne porte plus que ?f=<jeton de 10 caractères> : aucune donnée du
// client dans l'adresse (Loi 25). Les réponses pré-remplies sont lues au serveur
// (afi-ops-backend, GET /api/form/prefill/:jeton, lib/vocal/lienFormulaire.js), qui les a
// déjà validées ; elles sont revalidées ici (listes fermées, texte brut, longueurs).
// Jeton inconnu, expiré, déjà utilisé, ou serveur muet après DELAI_LIEN_MS : formulaire
// vide, avec la mention « lien expiré ». Les anciens liens (?type=…&description=…)
// restent lus par readPrefill, pendant la transition.

export const JETON_RE = /^[A-Za-z0-9]{10}$/;
export const DELAI_LIEN_MS = 3000;

export function lireJeton(params) {
  const j = String((params && params.get("f")) || "").trim();
  return JETON_RE.test(j) ? j : "";
}

const LISTES = {
  language: ["fr", "en"],
  request_type: ["service", "purchase"],
  service_type: ["opening", "closing", "break", "warranty", "gelcoat", "plumbing", "pressure", "incomplete"],
  pool_type: ["pool", "spa"],
  urgency: ["important", "standard", "unsure"], // « urgent » n'est JAMAIS coché d'office
};
const TEXTES = { model_serial: 120, serial_number: 80, installed_by: 80, maintained_by: 80, description: 1800, part_description: 400 };
const EQUIPEMENTS = ["pool", "spa", "heater", "pump", "filter", "lighting", "cover", "salt", "heatpump", "blower"];
const dateValide = (v) => {
  const s = String(v || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return "";
  const d = new Date(`${s}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s ? s : "";
};

// Réponses du serveur → réponses du formulaire. Même forme que readPrefill :
// { answers, source: "felix", conv: "", prefilled }.
export function reponsesLienCourt(brut) {
  const b = brut && typeof brut === "object" ? brut : {};
  const answers = {};
  for (const [cle, liste] of Object.entries(LISTES)) if (liste.includes(b[cle])) answers[cle] = b[cle];
  for (const [cle, max] of Object.entries(TEXTES)) {
    const t = texteBrut(b[cle], max);
    if (t) answers[cle] = t;
  }
  if (Array.isArray(b.equipment)) answers.equipment = [...new Set(b.equipment.filter((x) => EQUIPEMENTS.includes(x)))];
  for (const cle of ["purchase_date", "install_date"]) {
    const d = dateValide(b[cle]);
    if (d) answers[cle] = d;
  }
  const code = lireCode(b.error_code);
  if (code) answers.error_code = code;
  if (typeof b.access_without_presence === "boolean") answers.access_without_presence = b.access_without_presence;
  const tel = String(b.phone || "").replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
  if (tel.length === 10) { answers.phone = tel; answers.ft_client_phone = tel; }
  // Les réponses de service n'ont de sens que pour une demande de service (et la pièce pour un achat).
  if (answers.request_type !== "service") {
    for (const k of ["service_type", "equipment", "pool_type", "urgency", "error_code", "description"]) delete answers[k];
  }
  if (answers.request_type !== "purchase") delete answers.part_description;
  return {
    answers,
    source: "felix",
    conv: "",
    prefilled: Object.keys(answers).filter((k) => k !== "ft_client_phone" && k !== "language"),
  };
}

// → { etat: "ok", answers, source, conv, prefilled } | { etat: "expire" | "utilise" | "inconnu" | "indisponible" }
// Jamais plus de delaiMs : au-delà, « indisponible » (le formulaire s'ouvre vide).
export async function chargerLienCourt(jeton, { base, fetchFn = (...a) => fetch(...a), delaiMs = DELAI_LIEN_MS } = {}) {
  if (!JETON_RE.test(String(jeton || ""))) return { etat: "inconnu" };
  const ctl = typeof AbortController === "function" ? new AbortController() : null;
  let minuterie;
  const delai = new Promise((resolve) => {
    minuterie = setTimeout(() => { if (ctl) ctl.abort(); resolve({ etat: "indisponible" }); }, delaiMs);
  });
  const lecture = (async () => {
    try {
      const r = await fetchFn(`${base}/api/form/prefill/${encodeURIComponent(jeton)}`, ctl ? { signal: ctl.signal } : undefined);
      const d = await r.json().catch(() => ({}));
      if (r.ok && d && d.ok && d.answers) return { etat: "ok", ...reponsesLienCourt(d.answers) };
      return { etat: ["expire", "utilise", "inconnu"].includes(d && d.etat) ? d.etat : "indisponible" };
    } catch {
      return { etat: "indisponible" };
    }
  })();
  try {
    return await Promise.race([lecture, delai]);
  } finally {
    clearTimeout(minuterie);
  }
}
