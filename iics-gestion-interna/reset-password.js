import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ififktotbpnseqwqjkyh.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmaWZrdG90YnBuc2Vxd3Fqa3loIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyOTU3OTIxNSwiZXhwIjoyMDQ1MTU1MjE1fQ.nrXJPvRrpxdPLWHNjJYWPwDQJTtLdVFJxKdLvDjBZIo';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function resetPassword() {
  try {
    // Actualizar contraseña del Director
    const { data, error } = await supabase.auth.admin.updateUserById(
      'b7e8e985-8f36-40a3-9b52-11336ceb75cd',
      { password: 'Director2025!' }
    );

    if (error) {
      console.error('❌ Error:', error.message);
    } else {
      console.log('✅ Contraseña actualizada exitosamente!');
      console.log('\n📧 Email: jsaenztello@gmail.com');
      console.log('🔑 Nueva contraseña: Director2025!');
      console.log('\n⚠️  IMPORTANTE: Cambia esta contraseña desde Configuración después de iniciar sesión');
    }
  } catch (err) {
    console.error('❌ Error:', err);
  }
}

resetPassword();
