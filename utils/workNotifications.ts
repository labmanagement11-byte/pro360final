import { supabase } from "./supabaseClient";
import { employeeMatchKeys, isEmpleadoRole, nameBelongsToEmployee, type EmployeeIdentity } from "./employeeScope";

const PUSH_STORAGE_KEY = "limpieza360.pushSubscription";
const PERMISSION_ASKED_KEY = "limpieza360.notificationAsked";

export type WorkAlertUser = EmployeeIdentity & {
  username?: string | null;
  role?: string | null;
  house?: string | null;
};

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

const REMINDER_WARNING_DAYS = 7;
const LOST_OR_DAMAGED = new Set(["perdido", "danado"]);

function roleOf(identity: WorkAlertUser): string {
  return String(identity.role || "").trim().toLowerCase();
}

/** Owner sees every house. A manager sees only their house. Employees never do. */
function staffScope(identity: WorkAlertUser): "all" | "house" | null {
  if (isEmpleadoRole(identity.role)) return null;
  const role = roleOf(identity);
  const house = String(identity.house || "").trim().toLowerCase();
  if (role === "owner" || role === "dueno" || role === "admin" || house === "all") return "all";
  if (role === "manager" && house && house !== "all") return "house";
  return null;
}

function seesHouse(identity: WorkAlertUser, house: unknown): boolean {
  const scope = staffScope(identity);
  if (scope === "all") return true;
  if (scope !== "house") return false;
  const mine = String(identity.house || "").trim().toLowerCase();
  const theirs = String(house || "").trim().toLowerCase();
  return Boolean(mine && theirs && mine === theirs);
}

function parseDueDay(raw: unknown): Date | null {
  if (!raw) return null;
  const str = String(raw).trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(str);
  const date = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date(str);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

function reminderLevel(row: any): "soon" | "overdue" | null {
  if (!row || row.paid) return null;
  const due = parseDueDay(row.due_date || row.due);
  if (!due) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysLeft = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (daysLeft < 0) return "overdue";
  if (daysLeft <= REMINDER_WARNING_DAYS) return "soon";
  return null;
}

function reminderAlert(row: any, identity: WorkAlertUser): AlertRow | null {
  if (!row || row.id == null || !seesHouse(identity, row.house)) return null;
  const level = reminderLevel(row);
  if (!level) return null;
  const due = parseDueDay(row.due_date || row.due);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysLeft = due ? Math.round((due.getTime() - today.getTime()) / 86400000) : null;
  const name = String(row.name || "Pago").trim();
  const house = String(row.house || "").trim();
  const dueText = String(row.due_date || row.due || "").slice(0, 10);
  let when = "por vencer";
  if (level === "overdue") {
    const days = Math.abs(daysLeft || 0);
    when = `vencido hace ${days} día${days === 1 ? "" : "s"}`;
  } else if (daysLeft === 0) {
    when = "vence hoy";
  } else if (daysLeft != null) {
    when = `vence en ${daysLeft} día${daysLeft === 1 ? "" : "s"}`;
  }
  return {
    key: `rem:${row.id}:${level}`,
    title: level === "overdue" ? "Recordatorio vencido" : "Recordatorio por vencer",
    body: [name, house && `Casa ${house}`, when, dueText && `(${dueText})`].filter(Boolean).join(". "),
  };
}

const REMINDER_SEEN_KEY = "limpieza360.reminderAlerts";

function readReminderSeen(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(REMINDER_SEEN_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(list) ? list.filter((item) => typeof item === "string") : []);
  } catch {
    return new Set();
  }
}

function rememberReminder(key: string) {
  const seen = readReminderSeen();
  seen.add(key);
  try {
    localStorage.setItem(REMINDER_SEEN_KEY, JSON.stringify(Array.from(seen).slice(-300)));
  } catch {
    /* ignore */
  }
}

function inventoryAlert(row: any, identity: WorkAlertUser): AlertRow | null {
  if (!row || row.id == null || row.complete === true) return null;
  if (!seesHouse(identity, row.house)) return null;
  const issue = String(row.issue_type || "").trim().toLowerCase();
  if (!LOST_OR_DAMAGED.has(issue)) return null;
  if (nameBelongsToEmployee(row.checked_by, identity)) return null;
  const label = issue === "perdido" ? "perdido" : "dañado";
  const name = String(row.name || "Artículo").trim();
  const house = String(row.house || "").trim();
  const zone = String(row.location || "").trim();
  const who = String(row.checked_by || "").trim();
  return {
    key: `inv:${row.id}:${issue}`,
    title: `Inventario ${label}`,
    body: [name, house && `en ${house}`, zone && `zona ${zone}`, who && `lo reportó ${who}`].filter(Boolean).join(". "),
  };
}

function shoppingAlert(row: any, identity: WorkAlertUser): AlertRow | null {
  if (!row || row.id == null || row.is_purchased === true) return null;
  if (!seesHouse(identity, row.house)) return null;
  if (nameBelongsToEmployee(row.added_by, identity)) return null;
  const name = String(row.item_name || row.name || "Artículo").trim();
  const qty = String(row.quantity || "").trim();
  const house = String(row.house || "").trim();
  const who = String(row.added_by || "").trim();
  return {
    key: `shop:${row.id}`,
    title: "Nuevo artículo en la lista de compras",
    body: [`${name}${qty ? ` (${qty})` : ""}`, house && `Casa ${house}`, who && `lo agregó ${who}`].filter(Boolean).join(". "),
  };
}



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
  let primedReminders = false;
  let primedInventory = false;
  let primedShopping = false;
  let stopped = false;

  const consider = async (rows: AlertRow[], allowNotify: boolean) => {
    for (const row of rows) {
      if (seen.has(row.key)) continue;
      seen.add(row.key);
      if (allowNotify) await showWorkNotification(row.title, row.body, row.key);
    }
  };

  const loadStaff = async (table: "reminders" | "inventory" | "shopping_list") => {
    if (!supabase || !staffScope(identity)) return null;
    let query = (supabase.from(table) as any).select("*");
    if (staffScope(identity) === "house") query = query.eq("house", String(identity.house || "").trim());
    if (table === "reminders") query = query.eq("paid", false).order("due_date", { ascending: true });
    if (table === "inventory") query = query.in("issue_type", ["perdido", "danado"]);
    if (table === "shopping_list") query = query.order("created_at", { ascending: false }).limit(40);
    const { data, error } = await query;
    if (error || !data) return null;
    return data as any[];
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
    if (staffScope(identity)) {
      const [reminders, inventory, shopping] = await Promise.all([
        loadStaff("reminders"),
        loadStaff("inventory"),
        loadStaff("shopping_list"),
      ]);
      if (reminders !== null) {
        const already = readReminderSeen();
        const rows = reminders
          .map((row) => reminderAlert(row, identity))
          .filter((row): row is AlertRow => Boolean(row))
          .filter((row) => !already.has(row.key));
        // A due date can arrive without a new row, so the first look
        // also notifies. The key is remembered so it does not repeat.
        await consider(rows, true);
        rows.forEach((row) => rememberReminder(row.key));
        primedReminders = true;
      }
      if (inventory !== null) {
        const rows = inventory
          .map((row) => inventoryAlert(row, identity))
          .filter((row): row is AlertRow => Boolean(row));
        await consider(rows, primedInventory);
        primedInventory = true;
      }
      if (shopping !== null) {
        const rows = shopping
          .map((row) => shoppingAlert(row, identity))
          .filter((row): row is AlertRow => Boolean(row));
        await consider(rows, primedShopping);
        primedShopping = true;
      }
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
    });
  if (staffScope(identity)) {
    channel
      .on("postgres_changes", { event: "*", schema: "public", table: "reminders" }, (payload: any) => {
        const row = reminderAlert(payload.new, identity);
        if (row && primedReminders && !readReminderSeen().has(row.key)) {
          consider([row], true);
          rememberReminder(row.key);
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "inventory" }, (payload: any) => {
        const row = inventoryAlert(payload.new, identity);
        if (row && primedInventory) consider([row], true);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "shopping_list" }, (payload: any) => {
        const row = shoppingAlert(payload.new, identity);
        if (row && primedShopping) consider([row], true);
      });
  }
  channel.subscribe();

  return () => {
    stopped = true;
    window.clearInterval(timer);
    document.removeEventListener("visibilitychange", onVisible);
    supabase?.removeChannel(channel);
  };
}
