import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = 'https://srwgqpxcyjshbefzswnn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNyd2dxcHhjeWpzaGJlZnpzd25uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NTcyNTgsImV4cCI6MjA5MDEzMzI1OH0.8YcBIERpf35bbocXXAdTy_llCJt3X5sSbO8AgnemmO4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('🚀 Iniciando migración...\n');

  const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20260329120000_fix_tasks_categories.sql');
  
  if (!fs.existsSync(migrationPath)) {
    console.error('❌ Archivo de migración no encontrado:', migrationPath);
    process.exit(1);
  }

  const sql = fs.readFileSync(migrationPath, 'utf8');
  
  console.log('📄 Ejecutando SQL de migración...\n');

  try {
    const { data, error } = await supabase.rpc('exec', { query: sql });
    
    if (error) {
      // El RPC exec puede no existir, intentemos otro método
      console.log('ℹ️ RPC exec no disponible, intentando método alternativo...\n');
      
      // Método alternativo: ejecutar cada statement por separado
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));
      
      for (const statement of statements) {
        if (statement.includes('CREATE TABLE') || statement.includes('ALTER TABLE') || statement.includes('CREATE POLICY') || statement.includes('CREATE INDEX') || statement.includes('ALTER PUBLICATION')) {
          try {
            const { error: stmtError } = await supabase.rpc('pg_execute', { 
              sql_query: statement + ';' 
            }).catch(() => ({ error: { message: 'RPC not available' } }));
            
            // Si el RPC no está disponible, mostramos el SQL para que el usuario lo ejecute manualmente
            console.log('⚠️ No se puede ejecutar automáticamente. Mostrando SQL para ejecutar manualmente:\n');
            console.log('═'.repeat(60));
            console.log(sql);
            console.log('═'.repeat(60));
            break;
          } catch (e) {
            console.log('⚠️ No se puede ejecutar automáticamente.');
            console.log('\n📋 SQL para ejecutar en Supabase SQL Editor:\n');
            console.log('═'.repeat(60));
            console.log(sql);
            console.log('═'.repeat(60));
            process.exit(0);
          }
        }
      }
    } else {
      console.log('✅ ¡Migración ejecutada correctamente!');
    }
  } catch (err) {
    console.log('⚠️ Error al ejecutar migración vía API.');
    console.log('\n📋 SQL para ejecutar en Supabase SQL Editor:\n');
    console.log('═'.repeat(60));
    console.log(sql);
    console.log('═'.repeat(60));
  }
}

runMigration();
