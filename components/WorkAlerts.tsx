"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  ensureNotificationPermission,
  registerAppWorker,
  startWorkWatch,
  subscribePushIfConfigured,
  type WorkAlertUser,
} from "../utils/workNotifications";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const buttonStyle: React.CSSProperties = {
  background: "#0369a1",
  color: "#fff",
  border: "none",
  borderRadius: 999,
  padding: "10px 16px",
  fontWeight: 700,
  cursor: "pointer",
};

export default function WorkAlerts({ user }: { user: WorkAlertUser }) {
  const stopRef = useRef<() => void>(() => {});
  const [permission, setPermission] = useState<NotificationPermission | "unsupported" | "unknown">("unknown");
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  const watch = (identity: WorkAlertUser) => {
    stopRef.current();
    stopRef.current = startWorkWatch(identity);
  };

  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      const reg = await registerAppWorker();
      if (cancelled) return;
      const perm = await ensureNotificationPermission(false);
      if (cancelled) return;
      setPermission(perm);
      if (perm === "granted") {
        await subscribePushIfConfigured(reg);
        if (cancelled) return;
        watch(user);
      }
    };

    boot();
    return () => {
      cancelled = true;
      stopRef.current();
      stopRef.current = () => {};
    };
    // username, role and house decide who receives each alert
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.username, user.email, user.role, user.house]);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches
      || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setInstalled(standalone);
    const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent || "");
    setIosHint(ios && !standalone);

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const enable = async () => {
    const perm = await ensureNotificationPermission(true);
    setPermission(perm);
    if (perm !== "granted") return;
    const reg = await registerAppWorker();
    await subscribePushIfConfigured(reg);
    watch(user);
  };

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    setInstallEvent(null);
  };

  const showPermission = permission === "default";
  const showInstall = !installed && Boolean(installEvent || iosHint);
  if (!showPermission && !showInstall) return null;

  return (
    <div style={{
      margin: "12px 16px 0",
      padding: "14px 16px",
      borderRadius: 16,
      background: "#f0f9ff",
      border: "1px solid #bae6fd",
      color: "#0c4a6e",
      display: "flex",
      flexWrap: "wrap",
      gap: 10,
      alignItems: "center",
      justifyContent: "space-between",
    }}>
      <div style={{ flex: "1 1 220px" }}>
        {showPermission ? (
          <>
            <strong style={{ display: "block", marginBottom: 4 }}>Limpieza360 en el teléfono</strong>
            <span style={{ fontSize: 14, lineHeight: 1.4 }}>
              Activa los avisos para enterarte de un horario o una tarea extra.
            </span>
          </>
        ) : (
          <strong style={{ display: "block", fontSize: 16 }}>Descarga la aplicación</strong>
        )}
      </div>
      {showPermission && (
        <button type="button" onClick={enable} style={buttonStyle}>Activar avisos</button>
      )}
      {installEvent && (
        <button type="button" onClick={install} style={buttonStyle}>Descarga la aplicación</button>
      )}
    </div>
  );
}
