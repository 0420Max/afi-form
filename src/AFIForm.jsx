import { useState, useRef } from "react";

const QUESTIONS = [
  { slug: "language", type: "radio", required: true,
    label: { fr: "Langue / Language", en: "Langue / Language" },
    show_if: () => true,
    options: [
      { value: "fr", label: { fr: "🇫🇷 Français", en: "🇫🇷 Français" } },
      { value: "en", label: { fr: "🇬🇧 English",  en: "🇬🇧 English" } },
    ] },
  { slug: "client_type", type: "radio", required: true,
    label: { fr: "Quel type de client êtes-vous?", en: "What type of client are you?" },
    show_if: (a) => a.language != null,
    options: [
      { value: "residential", label: { fr: "🏠 Client résidentiel",  en: "🏠 Residential client" } },
      { value: "employee",    label: { fr: "👷 Employé AFI",          en: "👷 AFI employee" } },
      { value: "dealer",      label: { fr: "🤝 Vendeur",              en: "🤝 Dealer" } },
      { value: "installer",   label: { fr: "🚚 Livreur / Installeur", en: "🚚 Installer / Driver" } },
    ] },
  { slug: "request_type", type: "radio", required: true,
    label: { fr: "Quel type de demande souhaitez-vous faire?", en: "What type of request would you like to make?" },
    show_if: (a) => a.client_type != null && a.client_type !== "employee",
    options: [
      { value: "service",  label: { fr: "🔧 Service",            en: "🔧 Service Request" } },
      { value: "purchase", label: { fr: "🛒 Achat d'un produit", en: "🛒 Parts Request" } },
      { value: "rma",      label: { fr: "🔄 Retour / RMA",       en: "🔄 Return / RMA" } },
    ] },
  { slug: "employee_number", type: "text", required: true,
    label: { fr: "👷 Numéro d'employé AFI", en: "👷 AFI Employee Number" },
    placeholder: { fr: "Ex: AFI-042", en: "Ex: AFI-042" },
    show_if: (a) => a.client_type === "employee",
    badge: { fr: "⚡ Mode Fast Track", en: "⚡ Fast Track Mode" },
  },
  { slug: "ft_call_type", type: "radio", required: true,
    label: { fr: "📞 Type d'appel reçu", en: "📞 Type of call received" },
    show_if: (a) => a.client_type === "employee" && !!a.employee_number,
    options: [
      { value: "opening",    label: { fr: "🌸 Ouverture saisonnière",         en: "🌸 Seasonal Opening" } },
      { value: "closing",    label: { fr: "❄️ Fermeture saisonnière",         en: "❄️ Seasonal Closing" } },
      { value: "break",      label: { fr: "🔧 Bris / remplacement de pièce",  en: "🔧 Break / Part replacement" } },
      { value: "warranty",   label: { fr: "📄 Demande de garantie",           en: "📄 Warranty Request" } },
      { value: "gelcoat",    label: { fr: "🎨 Gelcoat / réparation",          en: "🎨 Gelcoat / repair" } },
      { value: "purchase",   label: { fr: "🛒 Achat d'une pièce",             en: "🛒 Part purchase" } },
      { value: "incomplete", label: { fr: "📦 Livraison incomplète",          en: "📦 Incomplete delivery" } },
      { value: "other",      label: { fr: "💬 Autre",                         en: "💬 Other" } },
    ] },
  { slug: "ft_description", type: "textarea", required: true,
    label: { fr: "📝 Résumé de la demande", en: "📝 Request summary" },
    placeholder: { fr: "Décrivez brièvement la situation du client...", en: "Briefly describe the client's situation..." },
    show_if: (a) => a.client_type === "employee" && a.ft_call_type != null,
  },
  { slug: "ft_client_name", type: "text", required: true,
    label: { fr: "👤 Nom du client", en: "👤 Client name" },
    placeholder: { fr: "Jean Tremblay", en: "John Smith" },
    show_if: (a) => a.client_type === "employee" && !!a.ft_description,
  },
  { slug: "ft_client_address", type: "text", required: true,
    label: { fr: "📍 Adresse du client", en: "📍 Client address" },
    placeholder: { fr: "123 rue des Érables, Québec, QC G1A 1A1", en: "123 Main St, Quebec City, QC" },
    show_if: (a) => a.client_type === "employee" && !!a.ft_client_name,
  },
  { slug: "ft_client_email", type: "email", required: true,
    label: { fr: "📧 Courriel du client", en: "📧 Client email" },
    placeholder: { fr: "client@courriel.com", en: "client@email.com" },
    show_if: (a) => a.client_type === "employee" && !!a.ft_client_name,
  },
  { slug: "ft_client_phone", type: "tel", required: false,
    label: { fr: "📞 Téléphone du client", en: "📞 Client phone" },
    placeholder: { fr: "(418) 555-0000", en: "(418) 555-0000" },
    show_if: (a) => a.client_type === "employee" && !!a.ft_client_address,
  },
  { slug: "ft_urgency", type: "radio", required: false,
    label: { fr: "🚦 Niveau d'urgence perçu", en: "🚦 Perceived urgency" },
    show_if: (a) => a.client_type === "employee" && !!a.ft_client_address,
    options: [
      { value: "urgent",    label: { fr: "🔴 Urgent",   en: "🔴 Urgent" } },
      { value: "important", label: { fr: "🟠 Important", en: "🟠 Important" } },
      { value: "standard",  label: { fr: "🟢 Standard",  en: "🟢 Standard" } },
    ] },
  { slug: "service_type", type: "radio", required: true,
    label: { fr: "🔧 Type de service", en: "🔧 Service Type" },
    show_if: (a) => a.request_type === "service",
    options: [
      { value: "opening",    label: { fr: "🌸 Ouverture saisonnière",              en: "🌸 Seasonal Opening" } },
      { value: "closing",    label: { fr: "❄️ Fermeture saisonnière",              en: "❄️ Seasonal Closing" } },
      { value: "break",      label: { fr: "🔧 Bris ou remplacement de pièce",      en: "🔧 Equipment Break / Part" } },
      { value: "warranty",   label: { fr: "📄 Demande de garantie",                en: "📄 Warranty Request" } },
      { value: "gelcoat",    label: { fr: "🎨 Gelcoat (devis sur mesure)",         en: "🎨 Gelcoat Repair" } },
      { value: "plumbing",   label: { fr: "🚰 Raccordement / mise en service",     en: "🚰 Plumbing / Commissioning" } },
      { value: "pressure",   label: { fr: "💦 Test de pression / fuites",          en: "💦 Pressure Test / Leak" } },
      { value: "incomplete", label: { fr: "📦 Livraison incomplète",               en: "📦 Incomplete Delivery" } },
    ] },
  { slug: "equipment", type: "checkbox", required: false,
    label: { fr: "⚙️ Équipement concerné (cochez tout ce qui s'applique)", en: "⚙️ Equipment involved (check all that apply)" },
    show_if: (a) => ["opening","closing","break","warranty","pressure","plumbing"].includes(a.service_type),
    options: [
      { value: "pool",     label: { fr: "🏊 Piscine",        en: "🏊 Swimming pool" } },
      { value: "spa",      label: { fr: "♨️ Spa",            en: "♨️ Spa" } },
      { value: "heater",   label: { fr: "🔥 Chauffe-eau",    en: "🔥 Water heater" } },
      { value: "pump",     label: { fr: "⚙️ Pompe",          en: "⚙️ Pump" } },
      { value: "filter",   label: { fr: "🔵 Filtre",         en: "🔵 Filter" } },
      { value: "lighting", label: { fr: "💡 Éclairage",      en: "💡 Lighting" } },
      { value: "cover",    label: { fr: "🛡️ Couvert",        en: "🛡️ Cover" } },
      { value: "salt",     label: { fr: "🧂 Système au sel",  en: "🧂 Salt system" } },
      { value: "heatpump", label: { fr: "🌡️ Thermopompe",    en: "🌡️ Heat Pump" } },
      { value: "blower",   label: { fr: "💨 Soufflerie",      en: "💨 Blower" } },
    ] },
  { slug: "missing_equipment", type: "checkbox", required: true,
    label: { fr: "❓ Quel équipement manquait-il?", en: "❓ Which equipment was missing?" },
    show_if: (a) => a.service_type === "incomplete",
    options: [
      { value: "pump",        label: { fr: "⚙️ Pompe",       en: "⚙️ Pump" } },
      { value: "filter",      label: { fr: "🔵 Filtre",      en: "🔵 Filter" } },
      { value: "light",       label: { fr: "💡 Lumière",     en: "💡 Light" } },
      { value: "heatpump",    label: { fr: "🌡️ Thermopompe", en: "🌡️ Heat Pump" } },
      { value: "blower",      label: { fr: "💨 Soufflerie",   en: "💨 Blower" } },
      { value: "cover",       label: { fr: "🛡️ Couvert",     en: "🛡️ Cover" } },
      { value: "salt",        label: { fr: "🧂 Sel",          en: "🧂 Salt" } },
      { value: "plumbing",    label: { fr: "🚰 Plomberie",    en: "🚰 Plumbing" } },
      { value: "chemical",    label: { fr: "🧪 Chimique",     en: "🧪 Chemical" } },
      { value: "keypad",      label: { fr: "🎛️ Clavier",     en: "🎛️ Keypad" } },
      { value: "cleaner",     label: { fr: "🤖 Balayeuse",    en: "🤖 Cleaner" } },
      { value: "waterheater", label: { fr: "🔥 Chauffe-eau",  en: "🔥 Water heater" } },
    ] },
  { slug: "pool_type", type: "radio", required: true,
    label: { fr: "🏊‍♀️ Quel type de bassin?", en: "🏊‍♀️ What type of pool or spa?" },
    show_if: (a) => (Array.isArray(a.equipment)) || a.service_type === "gelcoat",
    options: [
      { value: "pool", label: { fr: "🏊 Piscine", en: "🏊 Pool" } },
      { value: "spa",  label: { fr: "♨️ Spa",     en: "♨️ Spa" } },
    ] },
  { slug: "model_serial", type: "text", required: false,
    label: { fr: "🏷️ Modèle ou numéro de série", en: "🏷️ Model or serial number" },
    placeholder: { fr: "Ex: Riviera 4.5 ou SN-2024-XXXX", en: "Ex: Riviera 4.5 or SN-2024-XXXX" },
    show_if: (a) => a.pool_type != null },
  { slug: "purchase_date", type: "date", required: true,
    label: { fr: "📅 Date approximative d'achat", en: "📅 Approximate purchase date" },
    show_if: (a) => a.service_type === "warranty" && a.model_serial != null },
  { slug: "installed_by", type: "text", required: true,
    label: { fr: "👷 Installation faite par", en: "👷 Installation done by" },
    placeholder: { fr: "Nom de l'entreprise ou technicien", en: "Company or technician name" },
    show_if: (a) => a.service_type === "warranty" && a.purchase_date != null },
  { slug: "maintained_by", type: "text", required: true,
    label: { fr: "🔧 Maintenance effectuée par", en: "🔧 Maintenance performed by" },
    placeholder: { fr: "Nom de l'entreprise ou technicien", en: "Company or technician name" },
    show_if: (a) => a.service_type === "warranty" && a.installed_by != null },
  { slug: "description", type: "textarea", required: true,
    label: { fr: "📜 Décrivez le problème", en: "📜 Describe the issue" },
    placeholder: { fr: "Décrivez ce que vous observez, depuis quand, etc.", en: "Describe what you observe, since when, etc." },
    show_if: (a) => {
      if (a.service_type === "warranty") return !!a.maintained_by;
      if (a.service_type === "incomplete") return a.missing_equipment?.length > 0;
      return a.pool_type != null && ["break","gelcoat","pressure","plumbing"].includes(a.service_type);
    } },
  { slug: "photo_required", type: "file", required: true,
    label: { fr: "📸 Photo (obligatoire pour garantie)", en: "📸 Photo (required for warranty)" },
    show_if: (a) => a.service_type === "warranty" && a.description != null },
  { slug: "photo_optional", type: "file", required: false,
    label: { fr: "📸 Photo (recommandée)", en: "📸 Upload photo (recommended)" },
    show_if: (a) => ["break","gelcoat","pressure"].includes(a.service_type) && a.description != null },
  { slug: "urgency", type: "radio", required: false,
    label: { fr: "🚦 Niveau d'urgence", en: "🚦 Urgency Level" },
    show_if: (a) => {
      if (a.service_type === "warranty") return a.photo_required != null;
      return ["break","gelcoat","pressure","plumbing"].includes(a.service_type) && a.description != null;
    },
    options: [
      { value: "urgent",    label: { fr: "🔴 Urgent",   en: "🔴 Urgent" } },
      { value: "important", label: { fr: "🟠 Important", en: "🟠 Important" } },
      { value: "standard",  label: { fr: "🟢 Standard",  en: "🟢 Standard" } },
      { value: "unsure",    label: { fr: "⚪ Incertain", en: "⚪ Not sure" } },
    ] },
  { slug: "part_description", type: "textarea", required: true,
    label: { fr: "🏷️ Numéro ou description de la pièce", en: "🏷️ Part Number or Description" },
    placeholder: { fr: "Ex: Pompe Hayward VS 1.5HP, #SPX3400Z1A", en: "Ex: Hayward VS Pump 1.5HP, #SPX3400Z1A" },
    show_if: (a) => a.request_type === "purchase" },
  { slug: "delivery_urgency", type: "radio", required: true,
    label: { fr: "🚦 Urgence de livraison", en: "🚦 Urgency Level for Parts" },
    show_if: (a) => !!a.part_description,
    options: [
      { value: "urgent",   label: { fr: "🔴 Urgent",   en: "🔴 Urgent" } },
      { value: "standard", label: { fr: "🟢 Standard",  en: "🟢 Standard" } },
      { value: "unsure",   label: { fr: "⚪ Incertain", en: "⚪ Not sure" } },
    ] },
  { slug: "delivery_method", type: "radio", required: true,
    label: { fr: "🚛 Mode de livraison", en: "🚛 Delivery Method" },
    show_if: (a) => a.delivery_urgency != null,
    options: [
      { value: "pickup",    label: { fr: "🏪 Cueillette en magasin", en: "🏪 In-store pickup" } },
      { value: "purolator", label: { fr: "📦 Purolator",             en: "📦 Purolator" } },
      { value: "afi_150",   label: { fr: "🚚 Livraison AFI — 150$",  en: "🚚 AFI Delivery — $150" } },
      { value: "afi_250",   label: { fr: "🚚 Livraison AFI — 250$",  en: "🚚 AFI Delivery — $250" } },
      { value: "express",   label: { fr: "⚡ Express 2$/km",          en: "⚡ Express $2/km" } },
    ] },
  { slug: "quote_intent", type: "radio", required: true,
    label: { fr: "📜 Que souhaitez-vous faire?", en: "📜 What would you like?" },
    show_if: (a) => a.delivery_method != null,
    options: [
      { value: "quote",    label: { fr: "📋 Demande de soumission", en: "📋 Request a quote" } },
      { value: "order",    label: { fr: "🛒 Commander directement", en: "🛒 Place an order" } },
      { value: "callback", label: { fr: "📞 Être rappelé",          en: "📞 Request a callback" } },
    ] },
  { slug: "payment_method", type: "radio", required: true,
    label: { fr: "💳 Mode de paiement", en: "💳 Payment Method" },
    show_if: (a) => a.quote_intent != null,
    options: [
      { value: "immediate", label: { fr: "💳 Paiement immédiat", en: "💳 Immediate payment" } },
      { value: "po",        label: { fr: "📝 Bon de commande",   en: "📝 Purchase Order" } },
    ] },
  { slug: "purchase_order_file", type: "file", required: true,
    label: { fr: "📎 Joindre le bon de commande", en: "📎 Upload Purchase Order" },
    show_if: (a) => a.payment_method === "po" },
  { slug: "return_reason", type: "radio", required: true,
    label: { fr: "🔄 Raison du retour", en: "🔄 Return Reason" },
    show_if: (a) => a.request_type === "rma",
    options: [
      { value: "warranty",   label: { fr: "🛡️ Garantie fabricant",   en: "🛡️ Manufacturer warranty" } },
      { value: "defective",  label: { fr: "⚠️ Pièce défectueuse",    en: "⚠️ Defective part" } },
      { value: "wrong_part", label: { fr: "❌ Mauvaise pièce reçue", en: "❌ Wrong part received" } },
    ] },
  { slug: "original_order_number", type: "text", required: true,
    label: { fr: "📋 Numéro de commande original", en: "📋 Original Order Number" },
    placeholder: { fr: "Shopify # ou facture AFI", en: "Shopify # or AFI invoice" },
    show_if: (a) => a.return_reason != null },
  { slug: "returned_part", type: "text", required: true,
    label: { fr: "🔧 Pièce ou produit retourné", en: "🔧 Part or Product Being Returned" },
    placeholder: { fr: "Numéro de pièce ou description", en: "Part number or description" },
    show_if: (a) => !!a.original_order_number },
  { slug: "part_installed", type: "toggle", required: true,
    label: { fr: "🔩 La pièce a-t-elle été installée?", en: "🔩 Was the part installed?" },
    show_if: (a) => !!a.returned_part },
  { slug: "rma_resolution", type: "radio", required: true,
    label: { fr: "✅ Ce que vous souhaitez", en: "✅ What would you like?" },
    show_if: (a) => a.part_installed != null,
    options: [
      { value: "replacement", label: { fr: "🔁 Remplacement",          en: "🔁 Replacement" } },
      { value: "refund",      label: { fr: "💰 Remboursement / Crédit", en: "💰 Refund / Credit" } },
    ] },
  { slug: "return_method", type: "radio", required: true,
    label: { fr: "📦 Mode de retour", en: "📦 Return Method" },
    show_if: (a) => a.rma_resolution != null,
    options: [
      { value: "drop_off",   label: { fr: "🏪 Dépôt en magasin",   en: "🏪 Drop off in store" } },
      { value: "purolator",  label: { fr: "📦 Purolator",           en: "📦 Purolator" } },
      { value: "afi_pickup", label: { fr: "🚚 Enlèvement par AFI",  en: "🚚 AFI pickup" } },
    ] },
  { slug: "access_without_presence", type: "toggle", required: true,
    label: { fr: "🚪 Le technicien peut-il accéder sans votre présence?", en: "🚪 Can the technician access without your presence?" },
    show_if: (a) => {
      if (a.request_type !== "service") return false;
      if (a.service_type === "warranty") return a.urgency != null;
      if (a.service_type === "incomplete") return !!a.description;
      if (["opening","closing"].includes(a.service_type)) return a.pool_type != null;
      return a.urgency != null;
    } },
  { slug: "full_name", type: "text", required: true,
    label: { fr: "👤 Nom complet ou Entreprise", en: "👤 Full Name or Company" },
    placeholder: { fr: "Jean Tremblay", en: "John Smith" },
    show_if: (a) => {
      if (a.request_type === "service") return a.access_without_presence != null;
      if (a.request_type === "purchase") return a.payment_method != null;
      if (a.request_type === "rma") return a.return_method != null;
      return false;
    } },
  { slug: "address", type: "text", required: true,
    label: { fr: "📍 Adresse complète", en: "📍 Full Address" },
    placeholder: { fr: "123 rue des Érables, Québec, QC G1A 1A1", en: "123 Main St, Quebec City, QC G1A 1A1" },
    show_if: (a) => !!a.full_name },
  { slug: "email", type: "email", required: true,
    label: { fr: "📧 Adresse courriel", en: "📧 Email address" },
    placeholder: { fr: "votre@courriel.com", en: "your@email.com" },
    show_if: (a) => !!a.full_name },
  { slug: "phone", type: "tel", required: false,
    label: { fr: "📞 Numéro de téléphone", en: "📞 Phone number" },
    placeholder: { fr: "(418) 555-0000", en: "(418) 555-0000" },
    show_if: (a) => !!a.address },
  { slug: "contact_preference", type: "radio", required: false,
    label: { fr: "📬 Préférence de contact", en: "📬 Preferred contact method" },
    show_if: (a) => !!a.email,
    options: [
      { value: "call",  label: { fr: "📞 Appel téléphonique", en: "📞 Phone call" } },
      { value: "email", label: { fr: "📧 Courriel",           en: "📧 Email" } },
      { value: "sms",   label: { fr: "💬 SMS",                en: "💬 SMS" } },
    ] },
  { slug: "contact_schedule", type: "radio", required: false,
    label: { fr: "🕐 Meilleure plage horaire", en: "🕐 Best time to reach you" },
    show_if: (a) => a.contact_preference === "call",
    options: [
      { value: "morning",   label: { fr: "🌅 Matin (8h–12h)",        en: "🌅 Morning (8am–12pm)" } },
      { value: "afternoon", label: { fr: "☀️ Après-midi (12h–17h)",  en: "☀️ Afternoon (12pm–5pm)" } },
      { value: "evening",   label: { fr: "🌆 Soir (17h–20h)",        en: "🌆 Evening (5pm–8pm)" } },
    ] },
  { slug: "gdpr_consent", type: "checkbox_single", required: true,
    label: { fr: "🔒 J'accepte que mes informations soient utilisées pour traiter ma demande", en: "🔒 I agree that my information will be used to process my request" },
    show_if: (a) => a.client_type === "residential" && !!a.email },
  { slug: "pricing_consent", type: "checkbox_single", required: true,
    label: { fr: "💰 Je comprends que les déplacements et interventions sont facturables selon la grille tarifaire AFI", en: "💰 I understand that travel and service calls are billable according to AFI's rate schedule" },
    show_if: (a) => a.client_type === "residential" && a.request_type === "service" && a.gdpr_consent === true },
];

const A = "#0e5f8a";
const AL = "#e8f3f9";
const BG = "#f8f7f4";
const BORDER = "#e2ddd8";
const TEXT = "#1a1714";
const MUTED = "#8a847e";

function isAnswered(v) {
  if (v == null) return false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "string") return v.trim().length > 0;
  return true;
}

function getVisible(ans) { return QUESTIONS.filter(q => q.show_if(ans)); }

function QCard({ q, lang, answers, onChange, idx, total }) {
  const v = answers[q.slug];
  const done = isAnswered(v);
  const lbl = q.label[lang] || q.label.fr;
  const ph = q.placeholder ? (q.placeholder[lang] || q.placeholder.fr) : "";
  const fRef = useRef();

  const toggleCb = (opt) => {
    const cur = Array.isArray(v) ? [...v] : [];
    const i = cur.indexOf(opt.value);
    onChange(q.slug, i === -1 ? [...cur, opt.value] : cur.filter(x => x !== opt.value));
  };

  const card = {
    background: done ? AL : "#fff",
    border: `1.5px solid ${done ? A : BORDER}`,
    borderRadius: 12, padding: "18px 16px", marginBottom: 10,
    transition: "border-color 0.2s, background 0.2s",
  };

  const optBtn = (sel) => ({
    display: "flex", alignItems: "center", gap: 9, padding: "9px 12px",
    borderRadius: 8, border: `1.5px solid ${sel ? A : BORDER}`,
    background: sel ? AL : BG, fontFamily: "inherit", fontSize: 15,
    cursor: "pointer", textAlign: "left", color: TEXT,
    fontWeight: sel ? 600 : 400, transition: "all 0.15s",
  });

  return (
        <div id={"q-" + q.slug} style={card}>
      <div style={{ fontSize: 11, fontWeight: 600, color: MUTED, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 }}>
        {q.badge && answers.client_type === "employee"
          ? <span style={{ background: "#fff3cd", color: "#856404", padding: "2px 8px", borderRadius: 4, marginRight: 8 }}>{q.badge[lang] || q.badge.fr}</span>
          : null}
        {idx}/{total}
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 14, lineHeight: 1.4, color: TEXT }}>{lbl}</div>

      {q.type === "radio" && (
        <div style={{ display: "grid", gridTemplateColumns: q.options.length <= 4 ? "1fr 1fr" : "1fr", gap: 7 }}>
          {q.options.map(o => (
            <button key={o.value} onClick={() => onChange(q.slug, o.value)} style={optBtn(v === o.value)}>
              <span style={{ width: 14, height: 14, borderRadius: "50%", border: `2px solid ${v === o.value ? A : "#ccc"}`,
                background: v === o.value ? A : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {v === o.value && <span style={{ width: 5, height: 5, borderRadius: "50%", background: "white", display: "block" }} />}
              </span>
              {o.label[lang] || o.label.fr}
            </button>
          ))}
        </div>
      )}

      {q.type === "checkbox" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {q.options.map(o => {
            const chk = Array.isArray(v) && v.includes(o.value);
            return (
              <button key={o.value} onClick={() => toggleCb(o)} style={optBtn(chk)}>
                <span style={{ width: 15, height: 15, borderRadius: 4, border: `2px solid ${chk ? A : "#ccc"}`,
                  background: chk ? A : "transparent", display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, color: "white", fontSize: 10, fontWeight: 700 }}>{chk ? "✓" : ""}</span>
                {o.label[lang] || o.label.fr}
              </button>
            );
          })}
          {!q.required && (
            <button onClick={() => { if (!Array.isArray(v) || v.length === 0) onChange(q.slug, []); }}
              style={{ marginTop: 6, padding: "9px 14px", borderRadius: 8, border: `1.5px solid ${A}`,
                background: AL, color: A, fontFamily: "inherit", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              {Array.isArray(v) && v.length > 0
                ? `✅ ${v.length} ${lang === "fr" ? `sélectionné${v.length > 1 ? "s" : ""}` : "selected"} — ${lang === "fr" ? "Continuer →" : "Continue →"}`
                : (lang === "fr" ? "Aucun — Continuer →" : "None — Continue →")}
            </button>
          )}
          {q.required && Array.isArray(v) && v.length > 0 && (
            <div style={{ fontSize: 12, color: A, marginTop: 4, fontWeight: 500 }}>
              ✅ {v.length} {lang === "fr" ? `sélectionné${v.length > 1 ? "s" : ""}` : "selected"}
            </div>
          )}
        </div>
      )}

      {["text","email","tel","date","address"].includes(q.type) && (
        <input type={q.type === "address" ? "text" : q.type} value={v || ""} placeholder={ph}
          onChange={e => onChange(q.slug, e.target.value || null)}
          style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1.5px solid ${BORDER}`,
            background: BG, fontFamily: "inherit", fontSize: 15, outline: "none", boxSizing: "border-box",
            color: TEXT }} />
      )}

      {q.type === "textarea" && (
        <textarea value={v || ""} placeholder={ph} rows={3}
          onChange={e => onChange(q.slug, e.target.value || null)}
          style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1.5px solid ${BORDER}`,
            background: BG, fontFamily: "inherit", fontSize: 15, outline: "none",
            resize: "vertical", boxSizing: "border-box", color: TEXT }} />
      )}

      {q.type === "toggle" && (
        <div style={{ display: "flex", gap: 8 }}>
          {[{ val: true, fr: "✅ Oui", en: "✅ Yes" }, { val: false, fr: "❌ Non", en: "❌ No" }].map(t => (
            <button key={String(t.val)} onClick={() => onChange(q.slug, t.val)} style={{
              flex: 1, padding: "10px 12px", borderRadius: 8, fontFamily: "inherit", fontSize: 15,
              cursor: "pointer", fontWeight: 600, transition: "all 0.15s",
              border: `1.5px solid ${v === t.val ? (t.val ? "#1a7a4a" : "#c0392b") : BORDER}`,
              background: v === t.val ? (t.val ? "#e8f5ee" : "#fdecea") : BG,
              color: v === t.val ? (t.val ? "#1a7a4a" : "#c0392b") : TEXT,
            }}>{t[lang] || t.fr}</button>
          ))}
        </div>
      )}

      {q.type === "file" && (
        <div onClick={() => fRef.current?.click()} style={{
          border: `2px dashed ${v ? A : BORDER}`, borderRadius: 8, padding: "18px 16px",
          textAlign: "center", cursor: "pointer", background: v ? AL : BG, transition: "all 0.15s",
        }}>
          <input ref={fRef} type="file" accept="image/*,.pdf" style={{ display: "none" }}
            onChange={e => { const f = e.target.files?.[0]; if (f) onChange(q.slug, f.name); }} />
          <div style={{ fontSize: 22, marginBottom: 6 }}>📎</div>
          <div style={{ fontSize: 12, color: v ? A : MUTED, fontWeight: v ? 500 : 400 }}>
            {v ? `✅ ${v}` : (lang === "fr" ? "Cliquer pour sélectionner un fichier" : "Click to select a file")}
          </div>
        </div>
      )}

      {q.type === "checkbox_single" && (
        <div onClick={() => onChange(q.slug, !v)} style={{
          display: "flex", alignItems: "flex-start", gap: 11, cursor: "pointer",
          padding: "11px 12px", borderRadius: 8,
          border: `1.5px solid ${v ? A : BORDER}`, background: v ? AL : BG, transition: "all 0.15s",
        }}>
          <span style={{ width: 17, height: 17, borderRadius: 4, border: `2px solid ${v ? A : "#ccc"}`,
            background: v ? A : "transparent", flexShrink: 0, marginTop: 1,
            display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 10, fontWeight: 700 }}>
            {v ? "✓" : ""}
          </span>
          <span style={{ fontSize: 14, lineHeight: 1.5, color: TEXT }}>{lbl}</span>
        </div>
      )}
    </div>
  );
}

export default function AFIForm() {
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [ticketId, setTicketId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const lang = answers.language || "fr";
  const visible = getVisible(answers);
  const answeredCount = visible.filter(q => isAnswered(answers[q.slug])).length;
  const progress = visible.length > 0 ? Math.round((answeredCount / visible.length) * 100) : 0;
  const allRequiredDone = visible.filter(q => q.required).every(q => isAnswered(answers[q.slug]));
  const isEmployee = answers.client_type === "employee";
  const canSubmit = allRequiredDone && visible.length > 3 && (
    isEmployee
      ? (!!answers.ft_client_name && !!answers.ft_client_email)
      : (!!answers.full_name && !!answers.email)
  );

  const handleChange = (slug, value) => {
    setAnswers(prev => {
      const next = { ...prev, [slug]: value };
      const clearKeys = (keys) => keys.forEach(k => delete next[k]);
      if (slug === "request_type") clearKeys(["service_type","equipment","missing_equipment","pool_type",
        "model_serial","purchase_date","installed_by","maintained_by","description","photo_required",
        "photo_optional","urgency","part_description","delivery_urgency","delivery_method","quote_intent",
        "payment_method","purchase_order_file","return_reason","original_order_number","returned_part",
        "part_installed","rma_resolution","return_method"]);
      if (slug === "service_type") clearKeys(["equipment","missing_equipment","pool_type","model_serial",
        "purchase_date","installed_by","maintained_by","description","photo_required","photo_optional","urgency"]);

          // Auto-scroll vers la prochaine question
    setTimeout(() => {
      const visible = QUESTIONS.filter(q => q.show_if(next));
      const currentIdx = visible.findIndex(q => q.slug === slug);
      const nextQ = visible[currentIdx + 1];
      if (nextQ) {
        const el = document.getElementById("q-" + nextQ.slug);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 80);
      return next;
    });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const hash = "AFI-" + Math.random().toString(36).substring(2,8).toUpperCase();
      const payload = {
        ...answers,
        ticket_hash: hash,
        submitted_at: new Date().toISOString(),
        origin: "web"
      };
      const res = await fetch("https://afi-ops-backend.onrender.com/api/form/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur serveur");
      setTicketId(data.ticket_hash || hash);
      setSubmitted(true);
    } catch (err) {
      alert(lang === "fr"
        ? "Une erreur est survenue. Veuillez réessayer ou nous contacter directement."
        : "An error occurred. Please try again or contact us directly.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) return (
    <div style={{ fontFamily: "system-ui,sans-serif", maxWidth: 560, margin: "0 auto", padding: 24, textAlign: "center", paddingTop: 60 }}>
      <div style={{ fontSize: 48, marginBottom: 14 }}>✅</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: TEXT, marginBottom: 10 }}>
        {lang === "fr" ? "Demande reçue!" : "Request received!"}
      </div>
      <div style={{ fontSize: 14, color: MUTED, lineHeight: 1.6, marginBottom: 20 }}>
        {lang === "fr" ? "Notre équipe traitera votre demande dans les plus brefs délais. Vous recevrez une confirmation par courriel." : "Our team will process your request as soon as possible. You will receive a confirmation by email."}
      </div>
      <div style={{ display: "inline-block", padding: "8px 20px", background: AL, border: `1px solid ${A}`,
        borderRadius: 20, fontSize: 13, color: A, fontWeight: 600 }}>
        🎫 {ticketId}
      </div>
      <div style={{ marginTop: 24 }}>
        <button onClick={() => { setAnswers({}); setSubmitted(false); }} style={{
          padding: "9px 20px", borderRadius: 8, border: `1px solid ${BORDER}`, background: BG,
          fontFamily: "inherit", fontSize: 13, cursor: "pointer", color: MUTED,
        }}>
          {lang === "fr" ? "Nouvelle demande" : "New request"}
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily: "system-ui,sans-serif", maxWidth: 560, margin: "0 auto", padding: "0 14px 60px" }}>
      <div style={{ textAlign: "center", padding: "22px 0 18px" }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: A, letterSpacing: -0.5 }}>◈ Aqua Fibre Innovation</div>
        <div style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>
          {lang === "fr" ? "Formulaire de demande de service" : "Service Request Form"}
        </div>
      </div>
      <div style={{ height: 3, background: BORDER, borderRadius: 2, marginBottom: 20 }}>
        <div style={{ height: "100%", width: `${progress}%`, background: A, borderRadius: 2, transition: "width 0.4s ease" }} />
      </div>
      <div style={{ fontSize: 11, color: MUTED, textAlign: "right", marginBottom: 16 }}>
        {answeredCount}/{visible.length} {lang === "fr" ? "répondu" : "answered"} · {progress}%
      </div>
      {answers.client_type === "employee" && (
        <div style={{ background: "#fff3cd", border: "1px solid #ffc107", borderRadius: 10, padding: "12px 16px",
          marginBottom: 16, fontSize: 13, color: "#664d03", lineHeight: 1.5 }}>
          <strong>⚡ Mode Fast Track Employé</strong><br />
          {lang === "fr"
            ? "Remplissez ce formulaire au nom de votre client. Fournissez le minimum d'information pour créer le ticket rapidement."
            : "Fill this form on behalf of your client. Provide minimum information to create the ticket quickly."}
        </div>
      )}
      {visible.map((q, i) => (
        <QCard key={q.slug} q={q} lang={lang} answers={answers}
          onChange={handleChange} idx={i + 1} total={visible.length} />
      ))}
      {canSubmit && (
        <div style={{ textAlign: "center", marginTop: 20, padding: "20px 0" }}>
          <button onClick={handleSubmit} disabled={submitting} style={{
            padding: "14px 40px", borderRadius: 10, background: submitting ? "#aaa" : A,
            color: "white", border: "none", fontFamily: "inherit", fontSize: 15,
            fontWeight: 700, cursor: submitting ? "not-allowed" : "pointer",
            boxShadow: submitting ? "none" : "0 4px 14px rgba(14,95,138,0.3)",
            transition: "all 0.2s",
          }}>
            {submitting
              ? (lang === "fr" ? "Envoi en cours..." : "Submitting...")
              : (lang === "fr" ? "Envoyer ma demande →" : "Submit my request →")}
          </button>
          <div style={{ fontSize: 11, color: MUTED, marginTop: 10 }}>
            🔒 {lang === "fr" ? "Vos informations sont sécurisées et confidentielles" : "Your information is secure and confidential"}
          </div>
        </div>
      )}
    </div>
  );
}
