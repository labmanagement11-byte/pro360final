import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isOwnerRole(role: string) {
  const value = String(role || "").toLowerCase();
  return value === "dueno" || value === "owner";
}

function normalizeRole(role: string) {
  const value = String(role || "").trim().toLowerCase();
  if (value === "manager" || value === "empleado") return value;
  return "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    if (!supabaseUrl || !serviceKey || !anonKey) {
      return json({ error: "Faltan variables de Supabase en la función" }, 500);
    }

    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "No hay sesión activa" }, 401);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData?.user) {
      return json({ error: "Sesión inválida" }, 401);
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: requester, error: requesterError } = await admin
      .from("profiles")
      .select("id, role, house, username")
      .eq("id", authData.user.id)
      .single();

    if (requesterError || !requester || !isOwnerRole(String((requester as { role?: string }).role || ""))) {
      return json({ error: "Solo el dueño puede agregar o eliminar usuarios" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const action = String((body as { action?: string }).action || "list");

    if (action === "list") {
      const { data: profilesData, error: profilesError } = await admin
        .from("profiles")
        .select("id, username, role, house")
        .order("username", { ascending: true });
      if (profilesError) return json({ error: profilesError.message }, 400);

      const { data: authUsersData } = await admin.auth.admin.listUsers({ perPage: 1000 });
      const emailMap: Record<string, string> = {};
      for (const authUser of authUsersData?.users || []) {
        emailMap[authUser.id] = authUser.email || "";
      }

      const users = (profilesData || []).map((p: { id: string; username: string; role: string; house: string | null }) => ({
        id: p.id,
        username: p.username,
        role: p.role,
        house: p.house,
        email: emailMap[p.id] || "",
        password: "",
      }));
      return json({ ok: true, users });
    }

    if (action === "create") {
      const email = String((body as { email?: string }).email || "").trim().toLowerCase();
      const password = String((body as { password?: string }).password || "").trim();
      const username = String((body as { username?: string }).username || "").trim();
      const role = normalizeRole(String((body as { role?: string }).role || ""));
      const house = String((body as { house?: string }).house || "").trim();

      if (!email || !email.includes("@") || password.length < 6 || !username || !role || !house) {
        return json({
          error: "Faltan datos: nombre, correo válido, contraseña (mínimo 6), rol y casa",
        }, 400);
      }

      const { data: houseRow, error: houseError } = await admin
        .from("houses")
        .select("name, nombre")
        .or(`name.eq.${house},nombre.eq.${house}`)
        .maybeSingle();
      if (houseError || !houseRow) {
        return json({ error: `La casa "${house}" no existe` }, 400);
      }
      const houseName = String((houseRow as { name?: string }).name || house);

      const created = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { username, role, house: houseName },
      });
      if (created.error || !created.data?.user) {
        return json({ error: created.error?.message || "No se pudo crear el usuario de acceso" }, 400);
      }

      const userId = created.data.user.id;
      const { data: insertedProfile, error: profileError } = await admin
        .from("profiles")
        .insert({ id: userId, username, role, house: houseName })
        .select("id, username, role, house")
        .single();

      if (profileError) {
        await admin.auth.admin.deleteUser(userId);
        return json({ error: profileError.message }, 400);
      }

      await admin.from("users").upsert(
        { username, password, role, house: houseName },
        { onConflict: "username" },
      );

      return json({
        ok: true,
        user: {
          id: insertedProfile.id,
          username: insertedProfile.username,
          role: insertedProfile.role,
          house: insertedProfile.house,
          email,
          password: "",
        },
      });
    }

    if (action === "update") {
      const id = String((body as { id?: string }).id || "").trim();
      const username = String((body as { username?: string }).username || "").trim();
      const role = normalizeRole(String((body as { role?: string }).role || ""));
      const house = String((body as { house?: string }).house || "").trim();
      const password = String((body as { password?: string }).password || "").trim();
      const email = String((body as { email?: string }).email || "").trim().toLowerCase();

      if (!id || !username || !role || !house) {
        return json({ error: "Faltan datos: id, nombre, rol y casa" }, 400);
      }

      const { data: oldProfile } = await admin
        .from("profiles")
        .select("id, username, role")
        .eq("id", id)
        .single();
      if (!oldProfile) return json({ error: "Usuario no encontrado" }, 404);
      if (isOwnerRole(String((oldProfile as { role?: string }).role || ""))) {
        return json({ error: "No se puede editar al dueño" }, 400);
      }

      const { data: houseRow } = await admin
        .from("houses")
        .select("name")
        .or(`name.eq.${house},nombre.eq.${house}`)
        .maybeSingle();
      if (!houseRow) return json({ error: `La casa "${house}" no existe` }, 400);
      const houseName = String((houseRow as { name?: string }).name || house);
      const oldUsername = String((oldProfile as { username?: string }).username || "");

      const { data: updatedProfile, error: updateError } = await admin
        .from("profiles")
        .update({ username, role, house: houseName })
        .eq("id", id)
        .select("id, username, role, house")
        .single();
      if (updateError || !updatedProfile) {
        return json({ error: updateError?.message || "No se pudo actualizar el perfil" }, 400);
      }

      if (password) {
        const pwdUpdate = await admin.auth.admin.updateUserById(id, { password });
        if (pwdUpdate.error) {
          return json({ error: `Perfil actualizado, pero la contraseña falló: ${pwdUpdate.error.message}` }, 400);
        }
      }
      if (email) {
        const emailUpdate = await admin.auth.admin.updateUserById(id, { email });
        if (emailUpdate.error) {
          return json({ error: `Perfil actualizado, pero el correo falló: ${emailUpdate.error.message}` }, 400);
        }
      }

      if (oldUsername && oldUsername !== username) {
        await admin.from("users").update({ username, role, house: houseName }).eq("username", oldUsername);
        await admin.from("calendar_assignments").update({ employee: username }).eq("employee", oldUsername);
        await admin.from("tasks").update({ assigned_to: username }).eq("assigned_to", oldUsername);
        await admin.from("cleaning_checklist").update({ employee: username }).eq("employee", oldUsername);
        await admin.from("assignment_inventory").update({ employee: username }).eq("employee", oldUsername);
        await admin.from("shopping_list").update({ added_by: username }).eq("added_by", oldUsername);
        await admin.from("shopping_list").update({ purchased_by: username }).eq("purchased_by", oldUsername);
      } else {
        await admin.from("users").update({ role, house: houseName }).eq("username", username);
      }

      return json({
        ok: true,
        user: {
          id: updatedProfile.id,
          username: updatedProfile.username,
          role: updatedProfile.role,
          house: updatedProfile.house,
          email,
          password: "",
        },
      });
    }

    if (action === "delete") {
      const id = String((body as { id?: string }).id || "").trim();
      if (!id) return json({ error: "Falta el id del usuario" }, 400);
      if (id === authData.user.id) return json({ error: "No puedes eliminarte a ti mismo" }, 400);

      const { data: targetProfile, error: targetError } = await admin
        .from("profiles")
        .select("id, role, username")
        .eq("id", id)
        .single();
      if (targetError || !targetProfile) return json({ error: "Usuario no encontrado" }, 404);
      if (isOwnerRole(String((targetProfile as { role?: string }).role || ""))) {
        return json({ error: "No se puede eliminar al dueño" }, 400);
      }

      const username = String((targetProfile as { username?: string }).username || "");
      await admin.from("users").delete().eq("username", username);
      await admin.from("profiles").delete().eq("id", id);
      const deleted = await admin.auth.admin.deleteUser(id);
      if (deleted.error) return json({ error: deleted.error.message }, 400);
      return json({ ok: true });
    }

    return json({ error: "Acción no válida" }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    return json({ error: message }, 500);
  }
});
