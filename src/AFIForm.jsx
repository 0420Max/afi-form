import { useState } from "react";

// TODO: Remplacer ce fichier stub avec le contenu complet d'AFIForm.jsx
// Le fichier complet contient 600+ lignes avec tout le formulaire bilingue

export default function AFIForm() {
  const [lang, setLang] = useState("fr");

  return (
    <div style={{ fontFamily: "system-ui,sans-serif", maxWidth: 560, margin: "0 auto", padding: "0 14px 60px" }}>
      <div style={{ textAlign: "center", padding: "22px 0 18px" }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#0e5f8a", letterSpacing: -0.5 }}>
          ◈ Aqua Fibre Innovation
        </div>
        <div style={{ fontSize: 12, color: "#8a847e", marginTop: 4 }}>
          {lang === "fr" ? "Formulaire de demande de service" : "Service Request Form"}
        </div>
      </div>
      
      <div style={{ background: "#fff3cd", border: "1px solid #ffc107", borderRadius: 10, padding: "16px", marginTop: 20, textAlign: "center" }}>
        <strong style={{ fontSize: 16 }}>🚧 Formulaire en construction</strong>
        <p style={{ margin: "8px 0 0", fontSize: 14, color: "#664d03" }}>
          {lang === "fr" 
            ? "Le formulaire complet sera ajouté prochainement. Veuillez éditer le fichier src/AFIForm.jsx avec le contenu complet."
            : "The complete form will be added soon. Please edit the src/AFIForm.jsx file with the full content."}
        </p>
        <button 
          onClick={() => setLang(lang === "fr" ? "en" : "fr")}
          style={{ marginTop: 12, padding: "8px 16px", borderRadius: 6, border: "none", background: "#0e5f8a", color: "white", cursor: "pointer" }}
        >
          {lang === "fr" ? "🇬🇧 Switch to English" : "🇫🇷 Passer au français"}
        </button>
      </div>
    </div>
  );
}
