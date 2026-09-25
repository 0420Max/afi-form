// Tests de la grille tarifaire (aucun réseau) : node scripts/test-tarifs.mjs
// Données = copie de GET /api/tarifs/public (board Tarifs AFI) le 25 sept. 2026.
import assert from "node:assert/strict";
import { grille, dollars } from "../src/tarifs.js";

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
console.log(`${n} tests réussis`);
