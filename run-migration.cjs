const https = require('https');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://srwgqpxcyjshbefzswnn.supabase.co';
// Service role key para ejecutar SQL directamente
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNyd2dxcHhjeWpzaGJlZnpzd25uIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDU1NzI1OCwiZXhwIjoxOTA1MTA5MjU4fQ.W_Z_Yt7tWz3mG6V_WvTvP7U3i2vNQh2J5G2h8b7PZk';

async function runMigration() {
  console.log('🚀 Ejecutando migración de base de datos...\n');

  const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20260329120000_fix_tasks_categories.sql');
  
  if (!fs.existsSync(migrationPath)) {
    console.error('❌ Archivo de migración no encontrado:', migrationPath);
    process.exit(1);
  }

  const sql = fs.readFileSync(migrationPath, 'utf8');
  
  console.log('📄 SQL a ejecutar:\n');
  console.log(sql.split(';').filter(s => s.trim()).length, 'statements\n');

  // Ejecutar el SQL usando la API de Supabase
  const data = JSON.stringify({
    query: sql
  });

  const options = {
    hostname: 'srwgqpxcyjshbefzswnn.supabase.co',
    port: 443,
    path: '/rest/v1/rpc/exec',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Length': data.length
    }
  };

  const req = https.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
      if (res.statusCode === 200 || res.statusCode === 201) {
        console.log('✅ ¡Migración ejecutada correctamente!');
      } else {
        console.log('ℹ️ Status:', res.statusCode);
        console.log('Response:', body);
        console.log('\n📋 Para ejecutar manualmente, copia el siguiente SQL en Supabase SQL Editor:\n');
        console.log('═'.repeat(60));
        console.log(sql);
        console.log('═'.repeat(60));
      }
    });
  });

  req.on('error', (e) => {
    console.log('⚠️ No se puede ejecutar automáticamente (el RPC no existe).');
    console.log('\n📋 Ejecuta este SQL manualmente en Supabase SQL Editor:\n');
    console.log('═'.repeat(60));
    console.log(sql);
    console.log('═'.repeat(60));
  });

  req.write(data);
  req.end();
}

runMigration();
