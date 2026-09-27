// Tests du préremplissage (aucun réseau, aucun ticket) : node scripts/test-prefill.mjs
import assert from "node:assert/strict";
import { readPrefill, lireCode, lireConv } from "../src/prefill.js";

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

console.log(`${n} tests réussis`);
