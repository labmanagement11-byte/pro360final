import { supabase } from "./supabaseClient";
import { employeeMatchKeys, nameBelongsToEmployee, type EmployeeIdentity } from "./employeeScope";

const PUSH_STORAGE_KEY = "limpieza360.pushSubscription";
const PERMISSION_ASKED_KEY = "limpieza360.notificationAsked";

export type WorkAlertUser = EmployeeIdentity & { username?: string | null };

function vapidPublicKey(): string {
  return String(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "").trim();
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

export function registerAppWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return Promise.resolve(null);
  }
  return navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((err) => {
    console.warn("No se pudo registrar el service worker", err);
    return null;
  });
}

export async function ensureNotificationPermission(fromGesture = false): Promise<NotificationPermission | "unsupported"> {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  if (Notification.permission === "granted" || Notification.permission === "denied") {
    return Notification.permission;
  }
  if (!fromGesture) {
    try {
      if (sessionStorage.getItem(PERMISSION_ASKED_KEY) === "1") return Notification.permission;
      sessionStorage.setItem(PERMISSION_ASKED_KEY, "1");
    } catch {
      /* ignore */
    }
  }
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

/** Subscribe only when a real public VAPID key is configured. Never invents one. */
export async function subscribePushIfConfigured(reg: ServiceWorkerRegistration | null): Promise<boolean> {
  const key = vapidPublicKey();
  if (!key || !reg || typeof window === "undefined" || !("PushManager" in window)) return false;
  if (Notification.permission !== "granted") return false;
  try {
    const existing = await reg.pushManager.getSubscription();
    const subscription = existing || await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key) as BufferSource,
    });
    localStorage.setItem(PUSH_STORAGE_KEY, JSON.stringify(subscription));
    const saved = await saveSubscriptionOnServer(subscription);
    return saved;
  } catch (err) {
    console.warn("No se pudo guardar la suscripción push", err);
    return false;
  }
}

async function saveSubscriptionOnServer(subscription: PushSubscription): Promise<boolean> {
  if (!supabase) return false;
  const json = subscription.toJSON();
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;
  if (!subscription.endpoint || !p256dh || !auth) return false;
  const { data: authData, error: authError } = await supabase.auth.getUser();
  const userId = authData?.user?.id;
  if (authError || !userId) {
    console.warn("No hay sesión para guardar el aviso con la app cerrada");
    return false;
  }
  const { error } = await (supabase.from("subscriptions") as any).upsert(
    {
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh,
      auth,
    },
    { onConflict: "endpoint" }
  );
  if (error) {
    console.warn("No se pudo guardar la suscripción en el servidor", error.message);
    return false;
  }
  return true;
}

export function closedAppPushStatus(): { wired: boolean; missing: string } {
  if (!vapidPublicKey()) {
    return {
      wired: false,
      missing: "Falta la clave pública VAPID (NEXT_PUBLIC_VAPID_PUBLIC_KEY), generada en esta computadora, y un envío gratis que use la clave privada (por ejemplo una función de Supabase) para avisar cuando la app está cerrada.",
    };
  }
  return {
    wired: false,
    missing: "La clave pública ya está en local. Falta crear la tabla subscriptions (el SQL no se aplicó) y desplegar la función work-push con la clave privada en los secretos de Supabase.",
  };
}

async function showWorkNotification(title: string, body: string, tag: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  const options: NotificationOptions = {
    body,
    icon: "/limpieza360pro-logo.png",
    tag,
    data: { url: "/" },
  };
  try {
    const reg = await navigator.serviceWorker?.ready;
    if (reg && "showNotification" in reg) {
      await reg.showNotification(title, options);
      return;
    }
  } catch {
    /* fall through */
  }
  new Notification(title, options);
}

type AlertRow = { key: string; title: string; body: string };

function assignmentRow(row: any, identity: WorkAlertUser): AlertRow | null {
  if (!row || row.id == null) return null;
  if (!nameBelongsToEmployee(row.employee, identity)) return null;
  if (row.completed === true) return null;
  const type = String(row.type || "Trabajo").trim();
  const house = String(row.house || "").trim();
  const when = [row.date, row.time].filter(Boolean).join(" ");
  const bits = [type, house && `en ${house}`, when && `el ${when}`].filter(Boolean);
  return {
    key: `cal:${row.id}`,
    title: "Nuevo horario de trabajo",
    body: bits.join(" ") || "Te asignaron un trabajo en el calendario.",
  };
}

function taskRow(row: any, identity: WorkAlertUser): AlertRow | null {
  if (!row || row.id == null) return null;
  if (!nameBelongsToEmployee(row.employee, identity)) return null;
  if (row.completed === true) return null;
  const house = String(row.house || "").trim();
  const when = [row.date, row.time].filter(Boolean).join(" ");
  const text = String(row.task || "Tarea extra").trim();
  const extra = [house && `Casa ${house}`, when].filter(Boolean).join(" · ");
  return {
    key: `task:${row.id}`,
    title: "Nueva tarea extra",
    body: extra ? `${text}. ${extra}` : text,
  };
}

async function loadMine(table: "calendar_assignments" | "tasks", identity: WorkAlertUser): Promise<any[] | null> {
  if (!supabase) return null;
  const keys = employeeMatchKeys(identity).map((key) => key.replace(/[",.()]/g, "")).filter(Boolean);
  if (keys.length === 0) return [];
  const orFilter = keys.map((key) => `employee.ilike.${key}`).join(",");
  const { data, error } = await (supabase.from(table) as any)
    .select("*")
    .or(orFilter)
    .order("id", { ascending: false })
    .limit(40);
  if (error || !data) return null;
  return data as any[];
}

export function startWorkWatch(identity: WorkAlertUser): () => void {
  if (!supabase || typeof window === "undefined") return () => {};
  const seen = new Set<string>();
  let primedCal = false;
  let primedTasks = false;
  let stopped = false;

  const consider = async (rows: AlertRow[], allowNotify: boolean) => {
    for (const row of rows) {
      if (seen.has(row.key)) continue;
      seen.add(row.key);
      if (allowNotify) await showWorkNotification(row.title, row.body, row.key);
    }
  };

  const scan = async () => {
    if (stopped) return;
    const [assignments, tasks] = await Promise.all([
      loadMine("calendar_assignments", identity),
      loadMine("tasks", identity),
    ]);
    // A failed read must not count as "nothing assigned", or the next
    // successful read would announce every existing job.
    if (assignments !== null) {
      const rows = assignments
        .map((row) => assignmentRow(row, identity))
        .filter((row): row is AlertRow => Boolean(row));
      await consider(rows, primedCal);
      primedCal = true;
    }
    if (tasks !== null) {
      const rows = tasks
        .map((row) => taskRow(row, identity))
        .filter((row): row is AlertRow => Boolean(row));
      await consider(rows, primedTasks);
      primedTasks = true;
    }
  };

  scan();
  const timer = window.setInterval(() => {
    if (document.visibilityState === "hidden") return;
    scan();
  }, 20000);
  const onVisible = () => {
    if (document.visibilityState === "visible") scan();
  };
  document.addEventListener("visibilitychange", onVisible);

  const channel = supabase
    .channel(`work-alerts-${Date.now()}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "calendar_assignments" }, (payload: any) => {
      const row = assignmentRow(payload.new, identity);
      if (row && primedCal) consider([row], true);
    })
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "tasks" }, (payload: any) => {
      const row = taskRow(payload.new, identity);
      if (row && primedTasks) consider([row], true);
    })
    .subscribe();

  return () => {
    stopped = true;
    window.clearInterval(timer);
    document.removeEventListener("visibilitychange", onVisible);
    supabase?.removeChannel(channel);
  };
}
