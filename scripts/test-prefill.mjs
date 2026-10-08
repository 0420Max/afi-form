// Tests du préremplissage (aucun réseau, aucun ticket) : node scripts/test-prefill.mjs
import assert from "node:assert/strict";
import { readPrefill, lireCode, lireConv, SYMPTOMES, restaurerPrefill } from "../src/prefill.js";

const P = (q) => readPrefill(new URLSearchParams(q));
let n = 0;
const t = (nom, fn) => { fn(); n++; console.log("ok -", nom); };

t("arbre-chauffage : service, bris, spa, description reçue", () => {
  const r = P("type=service&symptome=chauffage&source=arbre-chauffage&description=" + encodeURIComponent("Symptôme : Mon spa ne chauffe pas.\nRésultat : Technicien requis."));
  assert.equal(r.source, "arbre-chauffage");
  assert.equal(r.answers.request_type, "service");
  assert.equal(r.answers.service_type, "break");
  assert.deepEqual(r.answers.equipment, ["spa"]);
  assert.equal(r.answers.pool_type, "spa");
  assert.match(r.answers.description, /Technicien requis/);
});

t("arbre-pompe : service, bris, bassin non présumé (piscine ou spa), description reçue", () => {
  const r = P("type=service&symptome=pompe&source=arbre-pompe&description=" + encodeURIComponent("Symptôme : La pompe ne s'amorce pas.\nRésultat : la pompe Moov ne s'amorce toujours pas."));
  assert.equal(r.source, "arbre-pompe");
  assert.equal(r.answers.request_type, "service");
  assert.equal(r.answers.service_type, "break");
  assert.deepEqual(r.answers.equipment, []);
  assert.equal(r.answers.pool_type, undefined);
  assert.match(r.answers.description, /ne s'amorce toujours pas/);
});

t("demande de pièce (bot) : type Achat, pièce et modèle préremplis, rien d'autre présumé", () => {
  const r = P("type=piece&piece=" + encodeURIComponent("Carte électronique pack in.xe") + "&modele=Everest&source=bot");
  assert.equal(r.answers.request_type, "purchase");
  assert.equal(r.answers.part_description, "Carte électronique pack in.xe\nModèle : Everest");
  assert.equal(r.answers.service_type, undefined);
  assert.equal(r.answers.description, undefined);
  assert.equal(r.source, "bot");
  const en = P("type=piece&piece=Part&modele=Everest&lang=en");
  assert.equal(en.answers.part_description, "Part\nModel: Everest");
  const long = P("type=piece&piece=" + "x".repeat(900));
  assert.equal(long.answers.part_description.length, 300);
  assert.equal(P("type=piece").answers.part_description, undefined);
});

t("décodeur E207 : bris, bassin non présumé, champ « Code affiché » prérempli", () => {
  const r = P("type=service&symptome=code-erreur&code=E207&source=decodeur");
  assert.equal(r.answers.service_type, "break");
  assert.deepEqual(r.answers.equipment, []);
  assert.equal(r.answers.pool_type, undefined);
  assert.equal(r.answers.description, "Symptôme : Un code d'erreur s'affiche.");
  assert.equal(r.answers.error_code, "E207");
});

t("carte symptôme : pas de type de service présélectionné", () => {
  const r = P("type=service&symptome=eau-trouble&source=symptome");
  assert.equal(r.answers.request_type, "service");
  assert.equal(r.answers.service_type, undefined);
  assert.equal(r.answers.equipment, undefined);
  assert.equal(r.answers.description, "Symptôme : Eau trouble.");
});

t("urgent n'est jamais coché d'office", () => {
  assert.equal(P("type=service&urgence=urgent").answers.urgency, undefined);
  assert.equal(P("type=service&urgence=1").answers.urgency, undefined);
  assert.equal(P("type=service&urgence=important").answers.urgency, "important");
  assert.equal(P("type=service&urgence=incertain").answers.urgency, "unsure");
});

t("valeurs inconnues ignorées", () => {
  const r = P("type=achat&symptome=inconnu&source=pirate&urgence=max&code=<script>");
  assert.deepEqual(r.answers, {});
  assert.equal(r.source, "");
});

t("texte brut et longueur bornée", () => {
  const long = "a".repeat(5000);
  assert.equal(P("description=" + long).answers.description.length, 1800);
  const html = P("description=" + encodeURIComponent("<img src=x onerror=alert(1)>\u0007ok")).answers.description;
  assert.equal(html, "<img src=x onerror=alert(1)>ok"); // texte, jamais interprété (valeur de textarea React)
});

t("code : casse conservée, espaces retirés, 12 car. max", () => {
  assert.equal(lireCode("Prr"), "Prr");
  assert.equal(lireCode("- - -"), "---");
  assert.equal(lireCode("E207 "), "E207");
  assert.equal(lireCode("ABCDEFGHIJKLM"), "");
  assert.equal(lireCode("E2<07"), "");
});

t("code : champ séparé, description du client intacte", () => {
  const r = P("code=AOH&description=" + encodeURIComponent("Code affiché : AOH."));
  assert.equal(r.answers.description, "Code affiché : AOH.");
  assert.equal(r.answers.error_code, "AOH");
});

t("Félix inchangé : tel + source=felix seulement", () => {
  const r = P("tel=%2B14185551234&source=felix");
  assert.equal(r.source, "felix");
  assert.deepEqual(r.answers, { phone: "4185551234", ft_client_phone: "4185551234" });
});

t("conv (AFI Assist) : lu, jamais dans les réponses affichées", () => {
  const r = P("type=service&source=bot&conv=f1c7e2a0-0000-4000-8000-00000000test");
  assert.equal(r.conv, "f1c7e2a0-0000-4000-8000-00000000test");
  assert.equal(r.answers.conv, undefined);
  assert.equal(P("conv=<script>alert(1)</script>").conv, "");
  assert.equal(lireConv("court"), "");
});

t("lang=en : langue présélectionnée, description en anglais, bandeau inchangé", () => {
  const r = P("type=service&symptome=chauffage&source=symptome&lang=en");
  assert.equal(r.answers.language, "en");
  assert.equal(r.answers.description, "Symptom: The spa isn't heating.");
  assert.ok(!r.prefilled.includes("language"), "la langue n'apparaît pas dans le bandeau « prérempli »");
  assert.deepEqual(P("lang=en").prefilled, [], "lang seul : aucun bandeau");
});

t("lang absent ou autre valeur : aucune langue imposée, description en français", () => {
  for (const q of ["type=service&symptome=fuite", "type=service&symptome=fuite&lang=fr", "type=service&symptome=fuite&lang=<b>"]) {
    const r = P(q);
    assert.equal(r.answers.language, undefined, q);
    assert.equal(r.answers.description, "Symptôme : Fuite d'eau.", q);
  }
});

t("chaque symptôme a son libellé anglais", () => {
  for (const [k, v] of Object.entries(SYMPTOMES)) assert.ok(v.en && v.en.trim(), k);
});

// Effacement de handleChange (AFIForm.jsx), reproduit pour les clés concernées.
const EFFACE_SERVICE = ["equipment", "missing_equipment", "pool_type", "urgency"];
const EFFACE_DEMANDE = ["service_type", ...EFFACE_SERVICE, "part_description"];
const choisir = (avant, prefill, slug, value) => {
  const next = { ...avant, [slug]: value };
  for (const k of slug === "request_type" ? EFFACE_DEMANDE : EFFACE_SERVICE) delete next[k];
  return restaurerPrefill(next, prefill.answers, slug, value);
};

t("Félix : l'urgence préremplie survit au clic sur « Bris » (fiche AFI-1229)", () => {
  const p = P("type=service&description=" + encodeURIComponent("Pompe Moov AI affiche E001") + "&code=E001&urgence=important&source=felix&tel=4185550141");
  assert.equal(p.answers.service_type, undefined, "felix : type de service non présélectionné");
  assert.equal(p.answers.urgency, "important");
  const apres = choisir(p.answers, p, "service_type", "break");
  assert.equal(apres.urgency, "important", "urgence conservée");
  assert.equal(apres.description, "Pompe Moov AI affiche E001");
  assert.equal(apres.error_code, "E001");
});

t("rechoisir « Service » remet aussi l'urgence préremplie", () => {
  const p = P("type=service&description=x&urgence=incertain&source=felix");
  const apres = choisir({ ...p.answers, service_type: "break" }, p, "request_type", "service");
  assert.equal(apres.urgency, "unsure");
});

t("une urgence choisie par le client n'est jamais écrasée par le préremplissage", () => {
  const p = P("type=service&description=x&urgence=important&source=felix");
  const next = { request_type: "service", service_type: "break", urgency: "standard" };
  restaurerPrefill(next, p.answers, "service_type", "break");
  assert.equal(next.urgency, "standard");
});

t("sans urgence dans le lien : rien n'est inventé", () => {
  const p = P("type=service&description=x&source=felix");
  assert.equal(choisir(p.answers, p, "service_type", "break").urgency, undefined);
});

t("pièce (Félix ou bot) : rechoisir « Achat » garde la pièce préremplie", () => {
  const p = P("type=piece&piece=" + encodeURIComponent("Cartouche Pleatco PRB50") + "&source=felix");
  const apres = choisir(p.answers, p, "request_type", "purchase");
  assert.equal(apres.part_description, "Cartouche Pleatco PRB50");
  assert.equal(choisir(p.answers, p, "request_type", "rma").part_description, undefined, "autre type : effacée");
});

console.log(`${n} tests réussis`);
