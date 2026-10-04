import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import webpushModule from "npm:web-push@3.6.7";

// Sends a Web Push when a calendar assignment or extra task is inserted.
// Not deployed. Reads VAPID_PRIVATE_KEY from the function env, never from source.
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
  const taskText = text(record.task) || text(record.title) || "Tarea extra";
  const extra = [house && `Casa ${house}`, when].filter(Boolean).join(" · ");
  return {
    title: "Nueva tarea extra",
    body: extra ? `${taskText}. ${extra}` : taskText,
    url: "/",
    tag: `task:${id}`,
  };
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
  const payload = (body?.record ? body : (body?.payload as Record<string, unknown> | undefined)) || {};
  const table = text(payload.table || body?.table);
  const eventType = text(payload.type || body?.type || "INSERT").toUpperCase();
  const record = (payload.record || body?.record) as Record<string, unknown> | undefined;
  if (eventType !== "INSERT" || !record) return json({ ok: true, skipped: "no es un alta" });
  if (table !== "calendar_assignments" && table !== "tasks") {
    return json({ ok: true, skipped: "tabla no avisada" });
  }
  if (record.completed === true) return json({ ok: true, skipped: "ya completada" });

  const assignee = assigneeOf(record);
  const wanted = new Set(nameKeys(assignee));
  if (wanted.size === 0) return json({ ok: true, skipped: "sin empleado" });

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: profiles, error: profileError } = await admin.from("profiles").select("id, username");
  if (profileError) return json({ error: profileError.message }, 500);
  const userIds = (profiles || [])
    .filter((row) => {
      const keys = nameKeys(text((row as { username?: string }).username));
      return keys.some((key) => wanted.has(key));
    })
    .map((row) => (row as { id: string }).id);
  if (userIds.length === 0) return json({ ok: true, sent: 0, reason: "sin perfil" });

  const { data: subs, error: subError } = await admin
    .from("subscriptions")
    .select("endpoint, p256dh, auth")
    .in("user_id", userIds);
  if (subError) return json({ error: subError.message }, 500);
  if (!subs || subs.length === 0) return json({ ok: true, sent: 0 });

  webpush.setVapidDetails(subject, publicKey, privateKey);
  const note = JSON.stringify(messageFor(table, record));
  let sent = 0;
  const gone: string[] = [];
  for (const sub of subs as Array<{ endpoint: string; p256dh: string; auth: string }>) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        note,
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
