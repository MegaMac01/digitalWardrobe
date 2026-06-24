// @gradio/client (used for the local try-on server) references Node globals
// that don't exist in the browser. Polyfill them before anything loads it.
import { Buffer } from "buffer";
if (typeof globalThis.Buffer === "undefined") globalThis.Buffer = Buffer;
if (typeof globalThis.global === "undefined") globalThis.global = globalThis;

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { CssBaseline, ThemeProvider } from "@mui/material";
import App from "./App";
import { AuthProvider } from "./contexts/AuthContext";
import { vintageTheme } from "./theme";
import { installGlobalTelemetry, logClientError } from "./utils/telemetry";
import "./index.css";

installGlobalTelemetry();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      logClientError(error, {
        scope: "pwa",
        action: "register-service-worker",
      });
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider theme={vintageTheme}>
      <CssBaseline />
      <AuthProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);
