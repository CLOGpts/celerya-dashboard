import './index.css'
import React from "react";
import ReactDOM from "react-dom/client";
import App from "../App";
import { ErrorBoundary } from "./ErrorBoundary";   // ← nuovo import

ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
).render(
  <React.StrictMode>
    <ErrorBoundary>       {/* ← avvolge tutta l’app */}
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
