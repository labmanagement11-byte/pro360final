import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import webpushModule from "npm:web-push@3.6.7";

// Sends a Web Push to the assigned employee for a new calendar
// assignment or extra task (match username, email, or the part
// before @). Also tells the owner and that house's manager when the
// employee confirms a checklist or extra task, and for reminders,
// perdido/danado inventory, and shopping items.
// REMINDER_SWEEP covers reminders that become due with no row change.
// Reads VAPID_PRIVATE_KEY from the function env, never from source.
// Needs public.subscriptions (SQL not applied yet).
// Deploy later with JWT verification off (--no-verify-jwt); the webhook is not a user session.

const webpush = (webpushModule as { default?: typeof webpushModule }).default ?? webpushModule;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-work-push-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function nameKeys(value: string): string[] {
  const raw = value.trim().toLowerCase();
  if (!raw) return [];
  const keys = new Set<string>([raw]);
  const at = raw.indexOf("@");
  if (at > 0) keys.add(raw.slice(0, at));
  return Array.from(keys);
}

function assigneeOf(record: Record<string, unknown>): string {
  return text(record.employee) || text(record.assigned_to) || text(record.assignedTo);
}

function notesObject(raw: unknown): Record<string, unknown> {
  if (!raw) return {};
  if (typeof raw === "object" && !Array.isArray(raw)) return raw as Record<string, unknown>;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
    } catch {
      /* plain text */
    }
  }
  return {};
}

function confirmationStamp(record: Record<string, unknown>): string {
  const direct = text(record.employee_confirmed_at) || text(record.employeeConfirmedAt);
  if (direct) return direct;
  return text(notesObject(record.notes).employee_confirmed_at);
}

function confirmationBy(record: Record<string, unknown>): string {
  const direct = text(record.employee_confirmed_by) || text(record.employeeConfirmedBy);
  if (direct) return direct;
  return text(notesObject(record.notes).employee_confirmed_by) || assigneeOf(record);
}

function messageFor(table: string, record: Record<string, unknown>) {
  const house = text(record.house);
  const when = [text(record.date), text(record.time)].filter(Boolean).join(" ");
  const id = text(record.id) || "nuevo";
  if (table === "calendar_assignments") {
    const type = text(record.type) || "Trabajo";
    const bits = [type, house && `en ${house}`, when && `el ${when}`].filter(Boolean);
    return {
      title: "Nuevo horario de trabajo",
      body: bits.join(" ") || "Te asignaron un trabajo en el calendario.",
      url: "/",
      tag: `cal:${id}`,
    };
  }
  const taskText = text(record.task) || text(record.title) || text(record.description) || "Tarea extra";
  const extra = [house && `Casa ${house}`, when].filter(Boolean).join(" · ");
  return {
    title: "Nueva tarea extra",
    body: extra ? `${taskText}. ${extra}` : taskText,
    url: "/",
    tag: `task:${id}`,
  };
}

const REMINDER_WARNING_DAYS = 7;
const LOST_OR_DAMAGED = new Set(["perdido", "danado"]);

function bogotaToday(): number {
  const iso = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const [year, month, day] = iso.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function dueUtc(raw: unknown): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(text(raw));
  if (!match) return null;
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function reminderLevel(record: Record<string, unknown>): "soon" | "overdue" | null {
  if (record.paid === true) return null;
  const due = dueUtc(record.due_date ?? record.due);
  if (due == null) return null;
  const days = Math.round((due - bogotaToday()) / 86400000);
  if (days < 0) return "overdue";
  if (days <= REMINDER_WARNING_DAYS) return "soon";
  return null;
}

function staffMessage(table: string, record: Record<string, unknown>) {
  const house = text(record.house);
  const id = text(record.id) || "nuevo";
  if (table === "reminders") {
    const level = reminderLevel(record);
    if (!level) return null;
    const due = dueUtc(record.due_date ?? record.due);
    const days = due == null ? 0 : Math.round((due - bogotaToday()) / 86400000);
    const name = text(record.name) || "Pago";
    let when = "por vencer";
    if (level === "overdue") {
      const late = Math.abs(days);
      when = `vencido hace ${late} día${late === 1 ? "" : "s"}`;
    } else if (days === 0) when = "vence hoy";
    else when = `vence en ${days} día${days === 1 ? "" : "s"}`;
    const dueText = text(record.due_date || record.due).slice(0, 10);
    return {
      title: level === "overdue" ? "Recordatorio vencido" : "Recordatorio por vencer",
      body: [name, house && `Casa ${house}`, when, dueText && `(${dueText})`].filter(Boolean).join(". "),
      url: "/",
      tag: `rem:${id}:${level}`,
    };
  }
  if (table === "inventory") {
    const issue = text(record.issue_type).toLowerCase();
    if (record.complete === true || !LOST_OR_DAMAGED.has(issue)) return null;
    const label = issue === "perdido" ? "perdido" : "dañado";
    const name = text(record.name) || "Artículo";
    const zone = text(record.location);
    const who = text(record.checked_by);
    return {
      title: `Inventario ${label}`,
      body: [name, house && `en ${house}`, zone && `zona ${zone}`, who && `lo reportó ${who}`].filter(Boolean).join(". "),
      url: "/",
      tag: `inv:${id}:${issue}`,
    };
  }
  if (record.is_purchased === true) return null;
  const item = text(record.item_name) || text(record.name) || "Artículo";
  const qty = text(record.quantity);
  const who = text(record.added_by);
  return {
    title: "Nuevo artículo en la lista de compras",
    body: [`${item}${qty ? ` (${qty})` : ""}`, house && `Casa ${house}`, who && `lo agregó ${who}`].filter(Boolean).join(". "),
    url: "/",
    tag: `shop:${id}`,
  };
}

function staffActor(table: string, record: Record<string, unknown>): string {
  if (table === "inventory") return text(record.checked_by);
  if (table === "shopping_list") return text(record.added_by);
  return "";
}

type ProfileRow = { id: string; username?: string | null; email?: string | null; role?: string | null; house?: string | null };

function staffRecipient(row: ProfileRow, house: string, actorKeys: Set<string>): boolean {
  const role = text(row.role).toLowerCase();
  if (role === "empleado") return false;
  const keys = nameKeys(text(row.username));
  if (actorKeys.size > 0 && keys.some((key) => actorKeys.has(key))) return false;
  const profileHouse = text(row.house).toLowerCase();
  if (role === "owner" || role === "dueno" || role === "admin" || profileHouse === "all") return true;
  if (role !== "manager" || !profileHouse || profileHouse === "all") return false;
  return profileHouse === house.trim().toLowerCase();
}

function staffSkip(
  table: string,
  eventType: string,
  record: Record<string, unknown>,
  oldRecord: Record<string, unknown> | undefined,
): string | null {
  if (table === "shopping_list") {
    if (eventType !== "INSERT") return "la lista solo avisa al agregar";
    if (record.is_purchased === true) return "ya comprado";
    return null;
  }
  if (eventType !== "INSERT" && eventType !== "UPDATE") return "evento no avisado";
  if (table === "reminders") {
    if (!reminderLevel(record)) return "no está por vencer ni vencido";
    if (eventType === "UPDATE" && oldRecord && reminderLevel(oldRecord) === reminderLevel(record)) {
      return "el aviso de ese recordatorio no cambió";
    }
    return null;
  }
  const issue = text(record.issue_type).toLowerCase();
  if (record.complete === true || !LOST_OR_DAMAGED.has(issue)) return "no es perdido ni dañado";
  if (eventType === "UPDATE" && oldRecord && text(oldRecord.issue_type).toLowerCase() === issue) {
    return "el reporte no cambió";
  }
  return null;
}

function finishedMessage(table: string, record: Record<string, unknown>) {
  const house = text(record.house);
  const who = confirmationBy(record) || "El empleado";
  const id = text(record.id) || "nuevo";
  if (table === "calendar_assignments") {
    const type = text(record.type) || "el trabajo";
    return {
      title: "El empleado terminó el trabajo",
      body: `${who} confirmó ${type}${house ? ` en ${house}` : ""}.`,
      url: "/",
      tag: `fin:cal:${id}`,
    };
  }
  const taskText = text(record.title) || text(record.task) || "la tarea extra";
  return {
    title: "El empleado terminó la tarea extra",
    body: `${who} confirmó ${taskText}${house ? ` en ${house}` : ""}.`,
    url: "/",
    tag: `fin:task:${id}`,
  };
}

type AuthLike = { id?: string; email?: string | null; user_metadata?: Record<string, unknown> | null };

function personKeys(username: string, email: string): string[] {
  return Array.from(new Set([...nameKeys(username), ...nameKeys(email)]));
}

function matchesWanted(keys: string[], wanted: Set<string>): boolean {
  return keys.some((key) => wanted.has(key));
}

/** Profile id and auth id. Subscriptions are stored with the auth user id. */
function employeeRecipientIds(
  profiles: ProfileRow[],
  authUsers: AuthLike[],
  wanted: Set<string>,
): string[] {
  const ids = new Set<string>();
  for (const row of profiles) {
    const keys = personKeys(text(row.username), text(row.email));
    if (!matchesWanted(keys, wanted)) continue;
    if (row.id) ids.add(row.id);
  }
  for (const user of authUsers) {
    const meta = user.user_metadata || {};
    const keys = personKeys(text(meta.username), text(user.email));
    if (!matchesWanted(keys, wanted) || !user.id) continue;
    ids.add(user.id);
  }
  return Array.from(ids);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  const secret = Deno.env.get("WORK_PUSH_SECRET") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const headerSecret = req.headers.get("x-work-push-secret") || "";
  const authHeader = req.headers.get("Authorization") || "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const allowed = (secret && headerSecret === secret) || (serviceKey && bearer === serviceKey);
  if (!allowed) return json({ error: "No autorizado" }, 401);

  const publicKey = Deno.env.get("VAPID_PUBLIC_KEY") || "";
  const privateKey = Deno.env.get("VAPID_PRIVATE_KEY") || "";
  const subject = Deno.env.get("VAPID_SUBJECT") || "mailto:avisos@360pro.com";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  if (!publicKey || !privateKey) return json({ error: "Faltan las claves VAPID en el entorno de la función" }, 500);
  if (!supabaseUrl || !serviceKey) return json({ error: "Faltan variables de Supabase" }, 500);

  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  const nested = body?.payload && typeof body.payload === "object"
    ? body.payload as Record<string, unknown>
    : null;
  const source = (body?.record ? body : nested) || body || {};
  const rawTable = text(source.table || body?.table || nested?.table);
  const table = rawTable.includes(".") ? rawTable.slice(rawTable.lastIndexOf(".") + 1) : rawTable;
  const eventType = text(source.type || body?.type || nested?.type || "INSERT").toUpperCase();
  let record = (source.record || body?.record || nested?.record || source.new || body?.new) as Record<string, unknown> | undefined;
  const oldRecord = (source.old_record || body?.old_record || nested?.old_record || source.old || body?.old) as Record<string, unknown> | undefined;
  if (!record && body && (body.employee || body.assigned_to || body.assignedTo)) record = body;
  const isSweep = eventType === "REMINDER_SWEEP";
  if (!record && !isSweep) return json({ ok: true, skipped: "sin registro" });

  const employeeTable = table === "calendar_assignments" || table === "tasks";
  const staffTable = table === "reminders" || table === "inventory" || table === "shopping_list";
  if (!isSweep && !employeeTable && !staffTable) return json({ ok: true, skipped: "tabla no avisada" });

  let note: Record<string, string> | null = null;
  let userIds: string[] = [];

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let authUsers: AuthLike[] = [];
  try {
    const { data: listed } = await admin.auth.admin.listUsers({ perPage: 1000 });
    authUsers = (listed?.users || []) as AuthLike[];
  } catch {
    authUsers = [];
  }

  if (isSweep) {
    const { data: dueRows, error: dueError } = await admin.from("reminders").select("*").eq("paid", false);
    if (dueError) return json({ error: dueError.message }, 500);
    const { data: profiles, error: profileError } = await admin
      .from("profiles")
      .select("id, username, role, house");
    if (profileError) return json({ error: profileError.message }, 500);
    webpush.setVapidDetails(subject, publicKey, privateKey);
    let sent = 0;
    const gone: string[] = [];
    for (const row of (dueRows || []) as Record<string, unknown>[]) {
      const sweepNote = staffMessage("reminders", row);
      if (!sweepNote) continue;
      const house = text(row.house);
      const ids = ((profiles || []) as ProfileRow[])
        .filter((profile) => staffRecipient(profile, house, new Set()))
        .map((profile) => profile.id);
      if (ids.length === 0) continue;
      const { data: subs, error: subError } = await admin
        .from("subscriptions")
        .select("endpoint, p256dh, auth")
        .in("user_id", ids);
      if (subError) return json({ error: subError.message }, 500);
      const bodyText = JSON.stringify(sweepNote);
      for (const sub of (subs || []) as Array<{ endpoint: string; p256dh: string; auth: string }>) {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            bodyText,
          );
          sent += 1;
        } catch (err) {
          const statusCode = (err as { statusCode?: number }).statusCode;
          if (statusCode === 404 || statusCode === 410) gone.push(sub.endpoint);
        }
      }
    }
    if (gone.length > 0) await admin.from("subscriptions").delete().in("endpoint", gone);
    return json({ ok: true, sweep: true, sent });
  }

  if (!record) return json({ ok: true, skipped: "sin registro" });

  if (employeeTable) {
    const confirmedNow = confirmationStamp(record);
    const confirmedBefore = oldRecord ? confirmationStamp(oldRecord) : "";
    const justConfirmed = eventType === "UPDATE" && Boolean(confirmedNow) && !confirmedBefore;
    if (justConfirmed) {
      note = finishedMessage(table, record);
      const { data: profiles, error: profileError } = await admin
        .from("profiles")
        .select("id, username, role, house");
      if (profileError) return json({ error: profileError.message }, 500);
      const actorKeys = new Set(nameKeys(confirmationBy(record)));
      const house = text(record.house);
      userIds = ((profiles || []) as ProfileRow[])
        .filter((row) => staffRecipient(row, house, actorKeys))
        .map((row) => row.id);
      const staffKeys = new Set<string>();
      for (const row of (profiles || []) as ProfileRow[]) {
        if (!userIds.includes(row.id)) continue;
        personKeys(text(row.username), text(row.email)).forEach((key) => staffKeys.add(key));
      }
      for (const user of authUsers) {
        if (!user.id || userIds.includes(user.id)) continue;
        const meta = user.user_metadata || {};
        const keys = personKeys(text(meta.username), text(user.email));
        if (keys.some((key) => staffKeys.has(key))) userIds.push(user.id);
      }
    } else if (eventType === "INSERT") {
      if (record.completed === true) return json({ ok: true, skipped: "ya completada" });
      const wanted = new Set(nameKeys(assigneeOf(record)));
      if (wanted.size === 0) return json({ ok: true, skipped: "sin empleado" });
      const { data: profiles, error: profileError } = await admin.from("profiles").select("id, username");
      if (profileError) return json({ error: profileError.message }, 500);
      userIds = employeeRecipientIds((profiles || []) as ProfileRow[], authUsers, wanted);
      note = messageFor(table, record);
    } else {
      return json({ ok: true, skipped: "no es un alta ni una confirmación" });
    }
  } else {
    const reason = staffSkip(table, eventType, record, oldRecord);
    if (reason) return json({ ok: true, skipped: reason });
    note = staffMessage(table, record);
    if (!note) return json({ ok: true, skipped: "nada que avisar" });
    const { data: profiles, error: profileError } = await admin
      .from("profiles")
      .select("id, username, role, house");
    if (profileError) return json({ error: profileError.message }, 500);
    const actorKeys = new Set(nameKeys(staffActor(table, record)));
    const house = text(record.house);
    userIds = ((profiles || []) as ProfileRow[])
      .filter((row) => staffRecipient(row, house, actorKeys))
      .map((row) => row.id);
  }

  if (userIds.length === 0) return json({ ok: true, sent: 0, reason: "sin perfil" });

  const { data: subs, error: subError } = await admin
    .from("subscriptions")
    .select("endpoint, p256dh, auth")
    .in("user_id", userIds);
  if (subError) return json({ error: subError.message }, 500);
  if (!subs || subs.length === 0) return json({ ok: true, sent: 0 });

  webpush.setVapidDetails(subject, publicKey, privateKey);
  const bodyText = JSON.stringify(note);
  let sent = 0;
  const gone: string[] = [];
  for (const sub of subs as Array<{ endpoint: string; p256dh: string; auth: string }>) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        bodyText,
      );
      sent += 1;
    } catch (err) {
      const statusCode = (err as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) gone.push(sub.endpoint);
    }
  }
  if (gone.length > 0) {
    await admin.from("subscriptions").delete().in("endpoint", gone);
  }
  return json({ ok: true, sent });
});
