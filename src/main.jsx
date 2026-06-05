import React from "react";
import ReactDOM from "react-dom/client";
import { AppProvider } from "./contexts/AppContext";
import { WealthProvider } from "./contexts/WealthContext";
import { runMigration } from "./storage/migration.js";
import App from "./App.jsx";

// ── Migração de dados legados → vyta.wealth.v2 ─────────────────────────────
// Roda uma única vez, sincrona, antes do primeiro render.
// Não-destrutiva: chaves antigas preservadas até clearAll.
runMigration();

// ── Reset via URL param ────────────────────────────────────────────────────
// Acesse ?reset na URL para limpar o storage e reiniciar o onboarding
if (new URLSearchParams(window.location.search).has("reset")) {
  [
    "auren.onboarding.v1",
    "auren.goals.v1",
    "auren.locale.v1",
    "auren.language.v1",
    "vyta.wealth.v2",
    "vyta.migration.v2.completed",
  ].forEach((k) => localStorage.removeItem(k));
  window.location.replace(window.location.pathname);
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppProvider>
      <WealthProvider>
        <App />
      </WealthProvider>
    </AppProvider>
  </React.StrictMode>
);
