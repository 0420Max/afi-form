// src/prefill.js
// Préremplissage du formulaire depuis l'URL (page d'assistance, bot, Félix).
//
// Convention UNIQUE partagée avec afi-assistance (6 paramètres + tel) :
//   type        service                                   → request_type
//   symptome    liste fermée (SYMPTOMES ci-dessous)        → texte de la description (+ spa si connu)
//   code        code d'erreur affiché, 12 car. max        → champ « Code affiché » (error_code)
//   description résumé en texte brut, 1800 car. max        → champ « Décrivez le problème »
//   urgence     important | standard | incertain          → urgency (« urgent » n'est JAMAIS coché d'office)
//   source      arbre-chauffage | decodeur | symptome | bot | faq | felix
//   tel         10 chiffres (SMS Félix)                    → téléphone
//   conv        identifiant de conversation d'AFI Assist  → envoyé tel quel au serveur (lien
//               vers la conversation dans les Remarques internes du dossier) ; jamais affiché
//   lang        en (page d'assistance /en, bot en anglais) → question « Langue » présélectionnée
//               (modifiable) ; toute autre valeur : ignorée (français par défaut)
//
// Règles : texte brut seulement (React n'interprète jamais de HTML), longueur
// bornée par champ, valeur inconnue ignorée. Tout est prérempli dans des champs
// visibles et modifiables ; rien n'est envoyé automatiquement.

export const SOURCES = ["arbre-chauffage", "decodeur", "symptome", "bot", "faq", "felix"];

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

// Type de service présélectionné seulement depuis ces sources (modifiable).
const SOURCES_BRIS = ["arbre-chauffage", "decodeur"];

export const LIMITES = { description: 1800, code: 12 };

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

  const service = get("type").trim().toLowerCase() === "service";
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
