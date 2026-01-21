const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Faltan claves de Supabase (URL o SERVICE ROLE KEY)');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceKey);
const HOUSE_NAME = 'YNTIBA 2 406';

const users = [
  {
    email: 'sandra@360pro.com',
    password: 'manager123',
    username: 'sandra',
    role: 'manager',
  },
  {
    email: 'chava@360pro.com',
    password: 'empleado123',
    username: 'chava',
    role: 'empleado',
  },
];

async function ensureProfile(userId, username, role) {
  // intenta insertar perfil; si ya existe, actualiza
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (fetchError) {
    console.error('⚠️ Error buscando perfil:', fetchError.message);
  }

  if (existing) {
    const { error: updError } = await supabaseAdmin
      .from('profiles')
      .update({ username, role, house: HOUSE_NAME })
      .eq('id', userId);
    if (updError) throw updError;
    return 'updated';
  } else {
    const { error: insError } = await supabaseAdmin
      .from('profiles')
      .insert([{ id: userId, username, role, house: HOUSE_NAME }]);
    if (insError) throw insError;
    return 'created';
  }
}

async function main() {
  for (const u of users) {
    try {
      console.log(`\n🔐 Creando auth user para ${u.email} ...`);
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
      });
      if (error) {
        // si ya existe, intentar obtenerlo
        console.log(`⚠️ createUser error: ${error.message}, intentando recuperar usuario...`);
        const { data: existing } = await supabaseAdmin.auth.admin.listUsers({
          page: 1,
          perPage: 100
        });
        const found = existing?.users?.find((usr) => usr.email === u.email);
        if (!found) throw error;
        data = { user: found };
      }
      const userId = data.user.id;
      console.log(`✅ Auth user listo: ${u.email} (id: ${userId})`);

      const action = await ensureProfile(userId, u.username, u.role);
      console.log(`✅ Perfil ${action}: ${u.username} (${u.role}) casa ${HOUSE_NAME}`);
    } catch (err) {
      console.error(`❌ Error con ${u.email}:`, err.message || err);
    }
  }
}

main();
