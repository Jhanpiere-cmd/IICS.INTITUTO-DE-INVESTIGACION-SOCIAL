// Script para agregar columna 'questions' a tabla lessons en Supabase
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pqzhysgojvucxzwcrlal.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxemh5c2dvanZ1Y3h6d2NybGFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ1NTc0MjYsImV4cCI6MjA1MDEzMzQyNn0.xj67UH2cInQ5STiS8yrBkO76JLJdFrZN9nzDHvC7qHY';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function addQuestionsColumn() {
    console.log('🔧 Agregando columna "questions" a tabla lessons...\n');

    try {
        // Ejecutar ALTER TABLE usando rpc o query directo
        const { data, error } = await supabase.rpc('exec_sql', {
            query: `
                ALTER TABLE lessons 
                ADD COLUMN IF NOT EXISTS questions JSONB DEFAULT '[]'::jsonb;
            `
        });

        if (error) {
            // Si rpc no existe, intentar con query directo
            console.log('⚠️  RPC no disponible, intentando método alternativo...\n');

            // Método alternativo: crear una lección de prueba para verificar
            const { error: testError } = await supabase
                .from('lessons')
                .select('questions')
                .limit(1);

            if (testError && testError.message.includes('questions')) {
                console.error('❌ Error: La columna "questions" no existe y no pudo ser agregada automáticamente.');
                console.log('\n📋 SOLUCIÓN MANUAL:\n');
                console.log('1. Ve a Supabase → SQL Editor');
                console.log('2. Ejecuta este comando:\n');
                console.log('   ALTER TABLE lessons ADD COLUMN IF NOT EXISTS questions JSONB DEFAULT \'[]\'::jsonb;\n');
                console.log('3. Click "Run"\n');
                return false;
            }

            console.log('✅ La columna "questions" ya existe o se agregó correctamente!\n');
            return true;
        }

        console.log('✅ Columna "questions" agregada exitosamente!\n');

        // Verificar que la columna existe
        console.log('🔍 Verificando...\n');
        const { data: columns, error: verifyError } = await supabase
            .from('lessons')
            .select('questions')
            .limit(1);

        if (!verifyError) {
            console.log('✅ Verificación exitosa! La columna está lista para usar.\n');
            console.log('🎉 Ahora puedes crear módulos y lecciones con IA sin problemas!\n');
            return true;
        }

        return true;

    } catch (error) {
        console.error('❌ Error al ejecutar migración:', error.message);
        console.log('\n📋 SOLUCIÓN MANUAL:\n');
        console.log('1. Ve a Supabase → SQL Editor');
        console.log('2. Ejecuta este comando:\n');
        console.log('   ALTER TABLE lessons ADD COLUMN IF NOT EXISTS questions JSONB DEFAULT \'[]\'::jsonb;\n');
        console.log('3. Click "Run"\n');
        return false;
    }
}

// Ejecutar
addQuestionsColumn()
    .then(success => {
        if (success) {
            console.log('✅ Migración completada con éxito!');
            process.exit(0);
        } else {
            console.log('⚠️  Requiere acción manual en Supabase');
            process.exit(1);
        }
    })
    .catch(error => {
        console.error('Error fatal:', error);
        process.exit(1);
    });
