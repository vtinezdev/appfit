import { describe, expect, it } from 'vitest'
import ciqual from '../../../../public/catalogo/ciqual-2025-es2.json'
import off from '../../../../public/catalogo/offes-2026-09-30.json'
import type { Entry } from '../../../shared/db/types'
import { nombreVisible, sugerirNombreCorto } from './nombresCortos'
import { agruparPlatos } from './platos'

function entrada(extra: Partial<Entry> = {}): Entry {
  return {
    id: 1, fecha: '2026-10-03', comida: 'cena', nombre: 'Pollo, muslo crudo',
    gramos: 100, kcal: 150, prot: 20, carb: 0, grasa: 8, createdAt: 1, ...extra,
  }
}

describe('sugerirNombreCorto', () => {
  it.each([
    ['pollo, muslo crudo', 'Pollo'],
    ['arroz integral, crudo', 'Arroz'],
    ['hamburguesa con queso, envasada', 'Hamburguesa'],
    ['Pechuga de pollo, sin piel, cruda', 'Pollo'],
    ['Filetes de pavo cocidos', 'Pavo'],
    ['Filete de merluza, crudo', 'Merluza'],
    ['Lomo de salmón, ahumado', 'Salmón'],
    ['Muslo de avestruz, crudo', 'Avestruz'],
    ['Carne picada de ternera, cruda', 'Ternera'],
    ['Pollo asado con piel', 'Pollo'],
    ['Café, instantáneo, sin azúcares añadidos, listo para beber', 'Café'],
    ['Leche semidesnatada promedio', 'Leche'],
    ['Yogur natural, desnatado', 'Yogur'],
    ['Atún al natural, escurrido', 'Atún'],
    ['Nueces, sin cáscara', 'Nueces'],
    ['Galletas integrales con chocolate', 'Galletas'],
    ['  ARROZ   integral, crudo  ', 'Arroz'],
  ])('muestra el alimento principal de «%s»', (nombre, esperado) => {
    expect(sugerirNombreCorto(nombre)).toBe(esperado)
  })

  it.each([
    ['Aceite de oliva virgen extra', 'Aceite de oliva'],
    ['Aceite (vegetal) de oliva, virgen extra', 'Aceite de oliva'],
    ['Clara de huevo, cruda', 'Clara de huevo'],
    ['Mantequilla de cacahuete, sin azúcar', 'Mantequilla de cacahuete'],
    ['Bebida de avena, enriquecida en calcio', 'Bebida de avena'],
    ['Harina de trigo integral', 'Harina de trigo'],
    ['Puré de patata, reconstituido', 'Puré de patata'],
    ['Café con leche, sin azúcar', 'Café con leche'],
    ['Chocolate caliente, listo para beber', 'Chocolate caliente'],
    ['Zumo de fruta de la pasión, concentrado', 'Zumo de fruta de la pasión'],
    ['Frutos secos (mezcla), tostados', 'Frutos secos'],
    ['Foie gras, pato, entero, cocido', 'Foie gras'],
    ['Dulce de leche, envasado', 'Dulce de leche'],
    ['Trigo sarraceno integral, crudo', 'Trigo sarraceno'],
    ['Filete de pez espada, congelado', 'Pez espada'],
    ['Sopa de pollo con fideos', 'Sopa'],
    ['Salsa para hamburguesa, envasada', 'Salsa'],
    ['Tortita de arroz integral inflado', 'Tortita de arroz'],
  ])('conserva la identidad de «%s», sin confundirla con sus ingredientes', (nombre, esperado) => {
    expect(sugerirNombreCorto(nombre)).toBe(esperado)
  })

  it.each([
    ['Chirimoya, cruda', 'Chirimoya'],
    ['Chirimoya madura sin piel', 'Chirimoya'],
    ['Tempeh (fermentado), envasado', 'Tempeh'],
    ['Tempeh ahumado con soja', 'Tempeh'],
    ['Grosella negra, cruda', 'Grosella'],
    ['Kéfir Bajo Contenido en Grasa', 'Kéfir'],
    ['Kefir cremoso naranja y mango', 'Kefir'],
    ['Bulgur de trigo, cocido, sin sal añadida', 'Bulgur'],
    ['Muesli esponjoso con frutas, frutos secos y/o semillas, enriquecido', 'Muesli'],
    ['Granola crujiente con chocolate, no enriquecida', 'Granola'],
    ['Kombucha frutos rojos', 'Kombucha'],
    ['Guacamole picante', 'Guacamole'],
    ['Cuscús con pescado', 'Cuscús'],
    ['Alimento nuevo con especias', 'Alimento'],
    ['Alimento nuevo', 'Alimento'],
    ['San Miguel sin alcohol', 'San Miguel'],
    ['Coca-Cola sin azúcar', 'Coca Cola'],
    ['Producto especial con especias', 'Producto'],
    ['Producto especial', 'Producto'],
    ['4 Quesos', 'Quesos'],
    ['2 mini hamburguesas con queso', 'Hamburguesas'],
    ['0,5 l de leche', 'Leche'],
    ['La rúcula fresca', 'Rúcula'],
    ['Mini Crackers Zout/Sel', 'Crackers'],
    ['  *** Tempeh   ahumado  ', 'Tempeh'],
    ['', ''],
    ['  ', ''],
  ])('aplica la regla general a alimentos desconocidos y productos de marca: «%s»', (nombre, esperado) => {
    expect(sugerirNombreCorto(nombre)).toBe(esperado)
  })

  it('genera etiquetas breves para todos los alimentos publicados en CIQUAL y Open Food Facts', () => {
    for (const fila of [...ciqual.filas, ...off.filas]) {
      const nombre = fila[1] as string
      const corto = sugerirNombreCorto(nombre)
      expect(corto.trim(), nombre).not.toBe('')
      expect(corto.split(/\s+/).length, nombre).toBeLessThanOrEqual(6)
      expect(corto, nombre).not.toMatch(/[,;()[\]]/)
    }
  })
})

describe('nombreVisible en Nutrición', () => {
  it('da prioridad al alias de la referencia exacta sobre el nombre automático', () => {
    const preferencias = new Map([['catalog:ciqual:36017', 'Mi pechuga'], ['user:36017', 'Mi pollo']])
    expect(nombreVisible(entrada({ catalogId: 'ciqual:36017' }), preferencias)).toBe('Mi pechuga')
    expect(nombreVisible(entrada({ foodId: 36017 }), preferencias)).toBe('Mi pollo')
    expect(nombreVisible(entrada({ foodId: 2 }), preferencias)).toBe('Pollo')
  })

  it('simplifica el historial con referencias ausentes o inválidas sin cambiar snapshots ni nutrientes', () => {
    for (const extra of [{}, { catalogId: 'ciqual:descatalogado' }, { foodId: 1, catalogId: 'ciqual:1' }]) {
      const registro = Object.freeze(entrada(extra))
      const original = { ...registro }
      expect(nombreVisible(registro, new Map())).toBe('Pollo')
      expect(registro).toEqual(original)
    }
  })

  it('conserva el título de las kcal rápidas', () => {
    const registro = entrada({ rapida: true, gramos: 0, nombre: 'Hamburguesa con amigos' })
    expect(nombreVisible(registro, new Map())).toBe('Hamburguesa con amigos')
  })

  it('usa nombres simples en los títulos automáticos de los platos y respeta sus títulos personales', () => {
    const entries = [entrada({ platoId: 'a' }), entrada({ id: 2, platoId: 'a', nombre: 'Arroz integral, crudo' })]
    const visible = (e: Entry) => nombreVisible(e, new Map())
    expect(agruparPlatos(entries, visible)[0].nombre).toBe('Pollo + Arroz')
    expect(agruparPlatos(entries.map((e) => ({ ...e, nombrePlato: 'Mi cena favorita' })), visible)[0].nombre).toBe('Mi cena favorita')
    expect(entries[0].nombre).toBe('Pollo, muslo crudo')
  })
})
