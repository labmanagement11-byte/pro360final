import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hecvlywrahigujakkguw.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlY3ZseXdyYWhpZ3VqYWtrZ3V3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjcyMzg2NCwiZXhwIjoyMDgyMjk5ODY0fQ.ZgmvGtXXCSNJ51RsHBe0vBONP6TaZ_pAW5fcRJchSCA';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkUsers() {
  try {
    console.log('🔍 Verificando usuarios en la BD...\n');

    // Verificar Sandra
    const { data: sandra, error: sandraError } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', 'sandra');

    if (sandraError) {
      console.error('❌ Error verificando Sandra:', sandraError.message);
    } else {
      console.log('📋 Sandra en BD:', sandra);
    }

    // Verificar Chava
    const { data: chava, error: chavaError } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', 'chava');

    if (chavaError) {
      console.error('❌ Error verificando Chava:', chavaError.message);
    } else {
      console.log('📋 Chava en BD:', chava);
    }

    // Listar todos los usuarios
    console.log('\n📋 Todos los usuarios:');
    const { data: allUsers, error: allError } = await supabase
      .from('profiles')
      .select('username, house, role');

    if (allError) {
      console.error('❌ Error listando usuarios:', allError.message);
    } else {
      console.table(allUsers);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkUsers().catch(console.error);
