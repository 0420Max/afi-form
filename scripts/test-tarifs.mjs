// Tests de la grille tarifaire (aucun réseau) : node scripts/test-tarifs.mjs
// Données = copie de GET /api/tarifs/public (board Tarifs AFI) le 25 sept. 2026.
import assert from "node:assert/strict";
import { grille, dollars, fmt, reservation, estPrepaye, nbAppareils } from "../src/tarifs.js";

const BOARD = [
  { code: "DEP_300", montant: 300 }, { code: "DEP_75", montant: 150 }, { code: "DEP_URG_EXTRA", montant: 50 },
  { code: "MO_REG", montant: 110 }, { code: "MO_URG", montant: 135 }, { code: "SVC_TEST_PRESSION", montant: 500 },
];
let n = 0;
const t = (nom, fn) => { fn(); n++; console.log("ok -", nom); };

t("standard : 110 $/h, 150 $ / 300 $", () => {
  const g = grille(BOARD, "standard");
  assert.deepEqual([g.urgent, g.mo, g.dep75, g.dep300], [false, 110, 150, 300]);
});
t("urgent : 135 $/h, 200 $ / 350 $ (doc Règles de garantie AFI)", () => {
  const g = grille(BOARD, "urgent");
  assert.deepEqual([g.urgent, g.mo, g.dep75, g.dep300, g.supplement], [true, 135, 200, 350, 50]);
});
t("retour à un autre niveau : tarifs normaux", () => {
  for (const u of ["important", "unsure", undefined, null]) assert.equal(grille(BOARD, u).mo, 110);
});
t("code manquant au board : jamais de montant inventé", () => {
  const g = grille(BOARD.filter((x) => x.code !== "DEP_URG_EXTRA" && x.code !== "MO_URG"), "urgent");
  assert.equal(g.mo, null); assert.equal(g.dep75, null); assert.equal(dollars(g.dep75), "—");
});
t("montants selon la langue, toujours 2 décimales : « 1 250,50 $ » / « $1,250.50 »", () => {
  assert.equal(dollars(1250.5).replace(/\s/g, " "), "1 250,50 $");
  assert.equal(dollars(1250.5, "en"), "$1,250.50");
  assert.equal(dollars(95).replace(/\s/g, " "), "95,00 $");
  assert.equal(dollars(95, "en"), "$95.00");
  assert.equal(fmt(2, "en"), "2.00");
  assert.equal(fmt(2), "2,00");
  assert.equal(dollars(89.999, "en"), "$90.00", "arrondi au cent");
  assert.equal(dollars(null, "en"), "—");
});

// Paiement à la réservation — mêmes cas que afi-ops-backend/tests/lib/prepaiementFormulaire.test.js.
const RESA = [...BOARD, { code: "SVC_OUVERTURE", montant: 250 }, { code: "SVC_FERMETURE", montant: 300 }, { code: "SVC_BOUCHON_JET", montant: 5 },
  { code: "SVC_RACCORDEMENT", montant: 300 }, { code: "SVC_RACCORDEMENT_2TEMPS", montant: 500 }, { code: "SVC_RACCORDEMENT_V2", montant: 250 },
  { code: "SVC_RACCORDEMENT_APPAREIL", montant: 50 }, { code: "SVC_RACCORDEMENT_INCLUS", montant: 2 }];
const A = (o) => ({ request_type: "service", client_type: "residential", ...o });
t("prépayés : ouverture, fermeture, test de pression, raccordement (résidentiel seulement)", () => {
  for (const s of ["opening", "closing", "pressure", "plumbing"]) assert.equal(estPrepaye(A({ service_type: s })), true);
  for (const s of ["break", "warranty", "gelcoat", "incomplete"]) assert.equal(estPrepaye(A({ service_type: s })), false);
  assert.equal(estPrepaye(A({ service_type: "closing", client_type: "employee" })), false);
  assert.equal(reservation(RESA, A({ service_type: "break" })), null);
});
t("ouverture 250 $ ; fermeture 300 $ + 5 $/jet (= variantes du site)", () => {
  assert.equal(reservation(RESA, A({ service_type: "opening" })).sousTotal, 250);
  for (const [j, attendu] of [[0, 300], [12, 360], [20, 400], [30, 450], [48, 540]]) {
    assert.equal(reservation(RESA, A({ service_type: "closing", closing_jets: j })).sousTotal, attendu, j + " jets");
  }
  assert.equal(reservation(RESA, A({ service_type: "closing", closing_jets: "autre", closing_jets_exact: "16" })).sousTotal, 380);
  assert.equal(reservation(RESA, A({ service_type: "closing" })), null, "jets pas encore choisis");
  const demain = RESA.map((x) => (x.code === "SVC_FERMETURE" ? { ...x, montant: 330 } : x));
  assert.equal(reservation(demain, A({ service_type: "closing", closing_jets: 12 })).sousTotal, 390);
});
t("test de pression : 500 $ + déplacement selon l'adresse (150 / 300, urgent 200 / 350)", () => {
  const r = reservation(RESA, A({ service_type: "pressure" }));
  assert.equal(r.sousTotal, 500); assert.deepEqual(r.deplacementSelonAdresse, { dep75: 150, dep300: 300 });
  assert.deepEqual(reservation(RESA, A({ service_type: "pressure", urgency: "urgent" })).deplacementSelonAdresse, { dep75: 200, dep300: 350 });
});
t("raccordement : 300 $ (2 appareils) ; en 2 temps 500 $ ; + 50 $/appareil additionnel une fois", () => {
  const r = (o) => reservation(RESA, A({ service_type: "plumbing", ...o }));
  assert.equal(r({ plumbing_devices: 1 }).sousTotal, 300);
  assert.equal(r({ plumbing_devices: 2 }).sousTotal, 300);
  assert.equal(r({ plumbing_devices: 5 }).sousTotal, 450);
  assert.equal(r({ plumbing_devices: 2, plumbing_two_step: true }).sousTotal, 500);
  assert.equal(r({ plumbing_devices: 4, plumbing_two_step: true }).sousTotal, 600);
  assert.equal(r({ plumbing_devices: 2, plumbing_two_step: false }).lignes.length, 1);
  assert.equal(r({}), null, "nombre d'appareils pas encore choisi");
});
t("tarif absent du board : aucun total inventé", () => {
  assert.equal(reservation(RESA.filter((x) => x.code !== "SVC_RACCORDEMENT_APPAREIL"), A({ service_type: "plumbing", plumbing_devices: 3 })), null);
  assert.equal(reservation(RESA.filter((x) => x.code !== "SVC_FERMETURE"), A({ service_type: "closing", closing_jets: 0 })), null);
  assert.equal(reservation(RESA.filter((x) => x.code !== "SVC_BOUCHON_JET"), A({ service_type: "closing", closing_jets: 12 })), null);
});

t("« 8 ou plus » : le nombre EXACT est facturé (revue Codex P1)", () => {
  const r = (o) => reservation(RESA, A({ service_type: "plumbing", ...o }));
  assert.equal(r({ plumbing_devices: "8+", plumbing_devices_exact: "12" }).sousTotal, 300 + 10 * 50);
  assert.equal(r({ plumbing_devices: "8+", plumbing_devices_exact: "8" }).sousTotal, 300 + 6 * 50);
  assert.equal(r({ plumbing_devices: "8+" }), null, "nombre exact pas encore tapé");
  assert.equal(nbAppareils({ plumbing_devices: "8+", plumbing_devices_exact: "5" }), null, "moins de 8 refusé");
  assert.equal(r({ plumbing_devices: "8+", plumbing_devices_exact: "21" }), null, "au-delà de 20 : prix confirmé par l'équipe");
});

console.log(`${n} tests réussis`);
