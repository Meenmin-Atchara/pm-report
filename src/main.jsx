import React from "react";
import ReactDOM from "react-dom/client";
import storage from "./storage.js";
import App from "./App.jsx";

// App.jsx calls window.storage.* directly (same API as Claude Artifacts'
// persistent storage). Attaching the localStorage-backed polyfill here lets
// App.jsx run unmodified as a normal static web app.
window.storage = storage;

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
