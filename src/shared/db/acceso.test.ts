/// <reference types="node" />
// Regla del proyecto: en las features, solo `data/*Repo.ts` importa `db`. Pantallas, componentes,
// hooks y lógica pura pasan por los repositorios.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    return statSync(p).isDirectory() ? walk(p) : [p]
  })
}

const IMPORTA_DB = /(?:from\s+|import\s*\(\s*)['"][./]*(?:shared\/db\/)?db(?:\.ts)?['"]/

describe('acceso a la base de datos', () => {
  it('en features/ solo los repositorios de data/ importan db', () => {
    const infractores = walk('src/features')
      .map((f) => f.replace(/\\/g, '/'))
      .filter((f) => /\.tsx?$/.test(f) && !/\.test\./.test(f) && !/\/data\/[^/]+Repo\.ts$/.test(f))
      .filter((f) => IMPORTA_DB.test(readFileSync(f, 'utf8')))
    expect(infractores).toEqual([])
  })

  it('la regex detecta el import de db', () => {
    expect(IMPORTA_DB.test("import { db } from '../../../shared/db/db'")).toBe(true)
    expect(IMPORTA_DB.test("const { db } = await import('../../../shared/db/db')")).toBe(true)
    expect(IMPORTA_DB.test("import type { Food } from '../../../shared/db/types'")).toBe(false)
  })
})
