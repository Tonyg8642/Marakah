import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./i18n";
import AppProviders from "./AppProviders";
import "./styles/index.css";
import "./styles/App.css";

const rootElement = document.getElementById("root");

function RootApp() {
  return (
    <BrowserRouter>
      <AppProviders>
        <App />
      </AppProviders>
    </BrowserRouter>
  );
}

if (rootElement) {
  createRoot(rootElement).render(
    <React.StrictMode>
      <RootApp />
    </React.StrictMode>,
  );
}
