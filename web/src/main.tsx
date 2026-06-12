import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { bootSync, initSyncListeners, reconcileDrafts } from "./data/store";
import { scheduleWindowNotifications } from "./data/notifications";
import "./theme.css";

bootSync();
initSyncListeners(() => reconcileDrafts());
void scheduleWindowNotifications();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
