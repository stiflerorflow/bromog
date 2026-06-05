import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { bootSync } from "./data/store";
import { scheduleWindowNotifications } from "./data/notifications";
import "./theme.css";

bootSync();
void scheduleWindowNotifications();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
