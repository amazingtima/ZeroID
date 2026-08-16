import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { isMobile, isSafari } from "./lib/viewport";

if (isSafari) document.documentElement.classList.add("is-safari");
if (isMobile) document.documentElement.classList.add("is-mobile");

const root = document.getElementById("root");
if (!root) throw new Error("Root element #root not found");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);
