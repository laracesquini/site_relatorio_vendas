import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'

const MIGRATIONS_DIR = join(import.meta.dirname, '..', 'migrations')

// Minimal stand-in for what Supabase provides: roles, auth.users, auth.uid().
const SUPABASE_STUB = `
  create role anon nologin;
  create role authenticated nologin;
  create schema auth;
  create table auth.users (
    id uuid primary key default gen_random_uuid(),
    email text,
    created_at timestamptz not null default now()
  );
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
  grant usage on schema public to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on sequences to anon, authenticated;
  alter default privileges in schema public grant execute on functions to anon, authenticated;
`

export type TestDb = Awaited<ReturnType<typeof createTestDb>>

/** Fresh database with every migration applied and a signed-in owner. */
export async function createTestDb() {
  const db = new PGlite()
  await db.exec(SUPABASE_STUB)
  for (const file of readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort()) {
    await db.exec(readFileSync(join(MIGRATIONS_DIR, file), 'utf8'))
  }

  const owner = await createUser(db, 'dona@exemplo.com')
  await signIn(db, owner)

  async function one<T = Record<string, unknown>>(sql: string, params: unknown[] = []) {
    const { rows } = await db.query<T>(sql, params)
    return rows[0]
  }
  async function all<T = Record<string, unknown>>(sql: string, params: unknown[] = []) {
    return (await db.query<T>(sql, params)).rows
  }
  async function id(sql: string, params: unknown[] = []) {
    return (await one<{ id: string }>(sql, params)).id
  }

  return { db, owner, one, all, id }
}

export async function createUser(db: PGlite, email: string) {
  const { rows } = await db.query<{ id: string }>(
    'insert into auth.users (email) values ($1) returning id',
    [email],
  )
  return rows[0].id
}

export async function signIn(db: PGlite, userId: string) {
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [userId])
}

/** numeric columns come back as strings; compare as numbers. */
export const n = (value: unknown) => Number(value)
