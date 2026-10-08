// Tests du préremplissage (aucun réseau, aucun ticket) : node scripts/test-prefill.mjs
import assert from "node:assert/strict";
import { readPrefill, lireCode, lireConv, SYMPTOMES, restaurerPrefill, lireJeton, reponsesLienCourt, chargerLienCourt, DELAI_LIEN_MS } from "../src/prefill.js";
import fs from "node:fs";

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

// ── Lien court de Félix (?f=jeton, phase 3b) ──
const tAsync = async (nom, fn) => { await fn(); n++; console.log("ok -", nom); };
const reponse = (status, corps) => ({ ok: status >= 200 && status < 300, status, json: async () => corps });
const SERVEUR = {
  request_type: "service", service_type: "break", equipment: ["pump", "fusée"], pool_type: "spa",
  model_serial: "Moov MP15Ai", error_code: "E001", description: "Pompe Moov AI, code E001 confirmé.",
  urgency: "important", phone: "4185550141", purchase_date: "2025-06-01", install_date: "2025-02-30",
  installed_by: "AFI", access_without_presence: true, language: "fr", full_name: "Jean Client", email: "x@y.ca",
};

t("lireJeton : 10 caractères [A-Za-z0-9] seulement", () => {
  assert.equal(lireJeton(new URLSearchParams("f=AbCdEfGh12")), "AbCdEfGh12");
  for (const q of ["", "f=court", "f=AbCdEfGh12x", "f=AbCd%27fGh12", "type=service&description=x"]) assert.equal(lireJeton(new URLSearchParams(q)), "", q);
  assert.equal(DELAI_LIEN_MS, 3000);
});

t("réponses du serveur : tous les champs de la liste fermée, rien d'autre", () => {
  const r = reponsesLienCourt(SERVEUR);
  assert.equal(r.source, "felix");
  assert.deepEqual(r.answers, {
    language: "fr", request_type: "service", service_type: "break", pool_type: "spa", urgency: "important",
    model_serial: "Moov MP15Ai", installed_by: "AFI", description: "Pompe Moov AI, code E001 confirmé.",
    equipment: ["pump"], purchase_date: "2025-06-01", error_code: "E001", access_without_presence: true,
    phone: "4185550141", ft_client_phone: "4185550141",
  });
  assert.ok(!("full_name" in r.answers) && !("email" in r.answers), "jamais nom ni courriel");
  assert.ok(!r.prefilled.includes("ft_client_phone") && !r.prefilled.includes("language"));
  assert.equal(reponsesLienCourt({ ...SERVEUR, urgency: "urgent" }).answers.urgency, undefined, "jamais urgent d'office");
  const piece = reponsesLienCourt({ request_type: "purchase", part_description: "Cartouche Pleatco PRB50", description: "x", service_type: "break" });
  assert.deepEqual(piece.answers, { request_type: "purchase", part_description: "Cartouche Pleatco PRB50" });
});

t("lien court : l'urgence et le type de service survivent au parcours du formulaire", () => {
  const p = reponsesLienCourt(SERVEUR);
  const apres = choisir({ ...p.answers, service_type: "break" }, p, "service_type", "break");
  assert.equal(apres.urgency, "important");
  assert.deepEqual(apres.equipment, ["pump"]);
});

await tAsync("chargerLienCourt : réponses → prérempli ; 410/404 → expiré, utilisé, inconnu", async () => {
  let url = "";
  const ok = await chargerLienCourt("AbCdEfGh12", { base: "https://srv", fetchFn: async (u) => { url = u; return reponse(200, { ok: true, answers: SERVEUR }); } });
  assert.equal(url, "https://srv/api/form/prefill/AbCdEfGh12");
  assert.equal(ok.etat, "ok");
  assert.equal(ok.answers.service_type, "break");
  for (const [status, etat] of [[410, "expire"], [410, "utilise"], [404, "inconnu"]]) {
    assert.deepEqual(await chargerLienCourt("AbCdEfGh12", { base: "x", fetchFn: async () => reponse(status, { ok: false, etat }) }), { etat });
  }
  assert.deepEqual(await chargerLienCourt("AbCdEfGh12", { base: "x", fetchFn: async () => reponse(500, {}) }), { etat: "indisponible" });
  assert.deepEqual(await chargerLienCourt("AbCdEfGh12", { base: "x", fetchFn: async () => { throw new Error("réseau"); } }), { etat: "indisponible" });
  assert.deepEqual(await chargerLienCourt("mauvais", { base: "x", fetchFn: async () => { throw new Error("jamais appelé"); } }), { etat: "inconnu" });
});

await tAsync("chargerLienCourt : serveur muet → « indisponible » au bout du délai, jamais plus", async () => {
  const debut = Date.now();
  const r = await chargerLienCourt("AbCdEfGh12", { base: "x", delaiMs: 60, fetchFn: () => new Promise(() => {}) });
  assert.deepEqual(r, { etat: "indisponible" });
  assert.ok(Date.now() - debut < 1000, `${Date.now() - debut} ms`);
});

t("AFIForm : lien court lu au montage, mention « lien expiré », jeton transmis, anciens liens gardés", () => {
  const src = fs.readFileSync(new URL("../src/AFIForm.jsx", import.meta.url), "utf8");
  assert.match(src, /chargerLienCourt\(jeton, \{ base: AFI_BACKEND \}\)/);
  assert.match(src, /Lien expiré, remplis simplement le formulaire\./);
  assert.match(src, /if \(jeton\) \{ payloadData\.jeton = jeton; payloadData\.source = "felix"; \}/);
  assert.match(src, /jeton \? \{ answers: \{\}, source: "felix", conv: "", prefilled: \[\] \} : readUrlPrefill\(\)/, "sans ?f= : anciens paramètres lus comme avant");
  assert.match(src, /!chargementLien && visible\.map/, "questions cachées pendant le chargement (3 s au plus)");
  assert.ok(!/"https:\/\/afi-ops-backend\.onrender\.com\/api\//.test(src), "une seule adresse du serveur (AFI_BACKEND)");
});

console.log(`${n} tests réussis`);
