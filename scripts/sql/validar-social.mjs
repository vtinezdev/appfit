// PostgreSQL temporal en Docker. Nunca lee credenciales, URLs ni bases de datos reales.
import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
const raiz=fileURLToPath(new URL('../../',import.meta.url))
const nombre=`appfit-social-qa-${randomUUID().slice(0,8)}`
const docker=(args,opciones={})=>execFileSync('docker',args,{encoding:'utf8',stdio:'pipe',...opciones})
const sql=(entrada)=>docker(['exec','-i',nombre,'psql','-U','postgres','-v','ON_ERROR_STOP=1'],{input:entrada})
try {
  docker(['run','-d','--rm','--name',nombre,'-e','POSTGRES_PASSWORD=solo-pruebas-locales','postgres:17-alpine'])
  for(let intento=0;;intento++) {
    try {
      if(docker(['exec',nombre,'cat','/proc/1/comm'],{stdio:'pipe'}).trim()!=='postgres') throw new Error('Inicializando PostgreSQL')
      docker(['exec',nombre,'pg_isready','-U','postgres'],{stdio:'pipe'}); break
    }
    catch(e) { if(intento===60) throw e; await new Promise(r=>setTimeout(r,250)) }
  }
  sql(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key,email text,aud text,role text,created_at timestamptz,updated_at timestamptz);
    create function auth.uid() returns uuid language sql stable as $$ select (current_setting('request.jwt.claims',true)::jsonb->>'sub')::uuid $$;`)
  for(const nombreSql of readdirSync(path.join(raiz,'supabase/migrations')).filter(f=>f.endsWith('.sql')).sort()) {
    let entrada=readFileSync(path.join(raiz,'supabase/migrations',nombreSql),'utf8')
    if(nombreSql.startsWith('0002_')) entrada=entrada.split('-- Tareas programadas (pg_cron')[0]
    sql(entrada); console.log(`Migración correcta: ${nombreSql}`)
  }
  console.log('pg_cron y auth de Supabase se sustituyen solo en esta base temporal; no se prueba el envío de correo ni las tareas programadas.')
  for(const nombreSql of readdirSync(path.join(raiz,'supabase/pruebas')).filter(f=>f.endsWith('.sql')).sort()) {
    const entrada=readFileSync(path.join(raiz,'supabase/pruebas',nombreSql),'utf8')
    try {
      const resultado=sql(entrada)
      if(entrada.includes("raise exception 'PRUEBAS_OK'"))throw new Error(`Falta rollback esperado en ${nombreSql}`)
      console.log(`Suite correcta: ${nombreSql} (${resultado.includes('_OK')?'confirmada':'sin marcador'})`)
    } catch(e) {
      if(e.stderr?.includes('ERROR:  PRUEBAS_OK\n')) console.log(`Suite correcta con rollback: ${nombreSql}`)
      else throw e
    }
  }
} finally { docker(['rm','-f',nombre],{stdio:'pipe'}) }
