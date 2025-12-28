// reset-users.js
// Instala primero: npm install @supabase/supabase-js
const { createClient } = require('@supabase/supabase-js');

// Pega aquí tus datos:
const SUPABASE_URL = 'https://hecvlywrahigujakkguw.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlY3ZseXdyYWhpZ3VqYWtrZ3V3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjcyMzg2NCwiZXhwIjoyMDgyMjk5ODY0fQ.ZgmvGtXXCSNJ51RsHBe0vBONP6TaZ_pAW5fcRJchSCA';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function createOrResetUser(email, password, role, username) {
  // Busca usuario por email
  const { data: users, error: fetchError } = await supabase.auth.admin.listUsers();
  const existing = users?.users.find(u => u.email === email);

  if (existing) {
    await supabase.auth.admin.deleteUser(existing.id);
    console.log(`Usuario ${email} eliminado para reiniciar.`);
  }

  // Crea usuario
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    user_metadata: { role, username }
  });

  if (error) {
    console.error(`Error creando usuario ${email}:`, error);
  } else {
    console.log(`Usuario ${email} creado correctamente.`);
  }
}

(async () => {
  await createOrResetUser('galindo123@email.com', 'galindo123', 'dueno', 'galindo123');
  await createOrResetUser('alejandra@email.com', 'vela123', 'manager', 'Alejandra');
})();
