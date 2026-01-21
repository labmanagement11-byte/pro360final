import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hecvlywrahigujakkguw.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlY3ZseXdyYWhpZ3VqYWtrZ3V3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjcyMzg2NCwiZXhwIjoyMDgyMjk5ODY0fQ.ZgmvGtXXCSNJ51RsHBe0vBONP6TaZ_pAW5fcRJchSCA';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function moveUsers() {
  try {
    console.log('🚀 Moving Sandra and Chava to YNTIBA 2...');

    // Actualizar Sandra
    const { data: sandraData, error: sandraError } = await supabase
      .from('profiles')
      .update({ house: 'YNTIBA 2' })
      .eq('username', 'sandra')
      .select();

    if (sandraError) {
      console.error('❌ Error moving Sandra:', sandraError.message);
    } else {
      console.log('✅ Sandra moved to YNTIBA 2:', sandraData);
    }

    // Actualizar Chava
    const { data: chavaData, error: chavaError } = await supabase
      .from('profiles')
      .update({ house: 'YNTIBA 2' })
      .eq('username', 'chava')
      .select();

    if (chavaError) {
      console.error('❌ Error moving Chava:', chavaError.message);
    } else {
      console.log('✅ Chava moved to YNTIBA 2:', chavaData);
    }

    console.log('✅ Users moved successfully!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

moveUsers().catch(console.error);
