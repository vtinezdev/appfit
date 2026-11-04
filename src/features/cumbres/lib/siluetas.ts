// Siluetas propias de las montañas de Cumbres: un perfil simplificado de cada una tal como se suele ver (el cono del Fuji,
// el cuerno del Cervino, las dos cimas del Elbrus, la meseta del Kilimanjaro con el Mawenzi…), dibujado a mano a partir de
// su forma conocida. No son perfiles topográficos: sirven para reconocerla de un vistazo. Coordenadas de 0 a 1 con las
// reglas de `FormaMontana` (la subida, siempre hacia arriba hasta la cima).
import { FORMA_GENERICA, type FormaMontana } from './perfil'

export const SILUETAS: Readonly<Record<string, FormaMontana>> = {
  // Cresta pirenaica con el glaciar a la izquierda y la cima al fondo, tras el Puente de Mahoma.
  aneto: {
    subida: [[0, 0], [0.12, 0.24], [0.22, 0.38], [0.3, 0.5], [0.38, 0.58], [0.46, 0.7], [0.52, 0.8], [0.58, 0.92], [0.62, 1]],
    bajada: [[0.66, 0.9], [0.7, 0.93], [0.76, 0.78], [0.86, 0.52], [1, 0]],
  },
  // Lomo ancho y suave por el oeste; la cara norte cae a pico.
  mulhacen: {
    subida: [[0, 0], [0.15, 0.24], [0.3, 0.48], [0.45, 0.7], [0.55, 0.85], [0.62, 0.95], [0.68, 1]],
    bajada: [[0.72, 0.97], [0.76, 0.84], [0.8, 0.6], [0.88, 0.34], [1, 0]],
  },
  // Estratovolcán con el hombro del Pico Viejo a la izquierda y el pitón de la cima.
  teide: {
    subida: [[0, 0], [0.14, 0.15], [0.24, 0.36], [0.3, 0.44], [0.36, 0.52], [0.42, 0.72], [0.46, 0.86], [0.48, 0.94], [0.5, 1]],
    bajada: [[0.54, 1], [0.56, 0.94], [0.6, 0.82], [0.66, 0.68], [0.76, 0.44], [0.88, 0.2], [1, 0]],
  },
  // Cúpula ancha de nieve, con el Mont Maudit como hombro a la derecha.
  'mont-blanc': {
    subida: [[0, 0], [0.12, 0.2], [0.25, 0.42], [0.35, 0.6], [0.45, 0.8], [0.52, 0.93], [0.58, 1]],
    bajada: [[0.65, 0.96], [0.71, 0.86], [0.76, 0.84], [0.84, 0.62], [0.92, 0.34], [1, 0]],
  },
  // Cresta caliza larga y dentada.
  'puncak-jaya': {
    subida: [[0, 0], [0.1, 0.3], [0.2, 0.54], [0.3, 0.7], [0.36, 0.77], [0.44, 0.82], [0.5, 0.9], [0.55, 1]],
    bajada: [[0.6, 0.9], [0.65, 0.93], [0.71, 0.84], [0.78, 0.88], [0.86, 0.6], [1, 0]],
  },
  // Macizo nevado ancho, con varias lomas.
  vinson: {
    subida: [[0, 0], [0.15, 0.34], [0.28, 0.55], [0.38, 0.68], [0.46, 0.8], [0.54, 0.9], [0.6, 1]],
    bajada: [[0.66, 0.92], [0.73, 0.95], [0.8, 0.8], [0.9, 0.44], [1, 0]],
  },
  // Dos cúpulas volcánicas; la del oeste, más alta.
  elbrus: {
    subida: [[0, 0], [0.2, 0.3], [0.32, 0.6], [0.38, 0.85], [0.42, 0.97], [0.45, 1]],
    bajada: [[0.5, 0.96], [0.55, 0.86], [0.6, 0.88], [0.64, 0.95], [0.68, 0.94], [0.73, 0.8], [0.85, 0.4], [1, 0]],
  },
  // La meseta del Kibo, muy ancha, y el Mawenzi dentado a la derecha.
  kilimanjaro: {
    subida: [[0, 0], [0.12, 0.25], [0.25, 0.6], [0.32, 0.85], [0.38, 0.96], [0.45, 1]],
    bajada: [[0.6, 0.99], [0.66, 0.93], [0.72, 0.72], [0.77, 0.66], [0.8, 0.74], [0.83, 0.7], [0.86, 0.6], [0.93, 0.32], [1, 0]],
  },
  // Se alza de golpe sobre la llanura: mole enorme con dos cimas, la sur más alta.
  denali: {
    subida: [[0, 0], [0.14, 0.12], [0.24, 0.2], [0.3, 0.42], [0.36, 0.7], [0.42, 0.86], [0.48, 0.95], [0.53, 1]],
    bajada: [[0.6, 0.96], [0.66, 0.97], [0.72, 0.84], [0.76, 0.58], [0.82, 0.3], [0.9, 0.16], [1, 0]],
  },
  // Ladera larga por el noroeste y la Pared Sur a pico.
  aconcagua: {
    subida: [[0, 0], [0.2, 0.22], [0.36, 0.44], [0.48, 0.64], [0.56, 0.8], [0.62, 0.92], [0.66, 1]],
    bajada: [[0.7, 0.97], [0.72, 0.86], [0.74, 0.62], [0.78, 0.44], [0.86, 0.26], [1, 0]],
  },
  // La pirámide con la antecima sur y el Lhotse a la derecha.
  everest: {
    subida: [[0, 0], [0.12, 0.2], [0.22, 0.36], [0.3, 0.5], [0.38, 0.68], [0.44, 0.84], [0.5, 1]],
    bajada: [[0.54, 0.94], [0.58, 0.92], [0.64, 0.8], [0.7, 0.84], [0.76, 0.88], [0.8, 0.7], [0.9, 0.38], [1, 0]],
  },
  // El cono casi perfecto, de laderas cóncavas y cima plana.
  fuji: {
    subida: [[0, 0], [0.14, 0.1], [0.25, 0.24], [0.33, 0.42], [0.39, 0.62], [0.43, 0.82], [0.45, 0.96], [0.47, 1]],
    bajada: [[0.57, 1], [0.59, 0.96], [0.61, 0.82], [0.65, 0.62], [0.71, 0.42], [0.8, 0.24], [0.9, 0.1], [1, 0]],
  },
  // Pico agudo de hielo, con el hombro del Silberhorn.
  jungfrau: {
    subida: [[0, 0], [0.15, 0.3], [0.25, 0.45], [0.32, 0.5], [0.4, 0.68], [0.48, 0.88], [0.54, 1]],
    bajada: [[0.58, 0.9], [0.62, 0.82], [0.68, 0.7], [0.74, 0.72], [0.82, 0.48], [1, 0]],
  },
  // El cuerno: arista larga a la izquierda, cima ganchuda y la cara este a plomo.
  cervino: {
    subida: [[0, 0], [0.2, 0.1], [0.32, 0.2], [0.4, 0.3], [0.46, 0.42], [0.5, 0.56], [0.52, 0.7], [0.54, 0.84], [0.56, 0.94], [0.58, 1]],
    bajada: [[0.6, 0.97], [0.62, 0.9], [0.64, 0.72], [0.67, 0.52], [0.72, 0.38], [0.8, 0.26], [0.9, 0.12], [1, 0]],
  },
  // Macizo ancho con muchas cimas; la Punta Dufour, la más alta.
  'monte-rosa': {
    subida: [[0, 0], [0.14, 0.32], [0.24, 0.52], [0.32, 0.66], [0.38, 0.82], [0.42, 0.95], [0.45, 1]],
    bajada: [[0.49, 0.9], [0.53, 0.94], [0.57, 0.85], [0.62, 0.9], [0.67, 0.8], [0.72, 0.84], [0.78, 0.66], [0.88, 0.35], [1, 0]],
  },
  // Cono volcánico empinado y simétrico, con el cráter plano.
  cotopaxi: {
    subida: [[0, 0], [0.18, 0.14], [0.28, 0.3], [0.36, 0.52], [0.42, 0.76], [0.46, 0.94], [0.48, 1]],
    bajada: [[0.55, 1], [0.57, 0.94], [0.61, 0.76], [0.67, 0.52], [0.75, 0.3], [0.85, 0.14], [1, 0]],
  },
  // Volcán con un casquete de hielo redondeado.
  chimborazo: {
    subida: [[0, 0], [0.16, 0.2], [0.28, 0.42], [0.36, 0.64], [0.42, 0.82], [0.48, 0.94], [0.54, 1]],
    bajada: [[0.6, 0.99], [0.65, 0.95], [0.7, 0.86], [0.75, 0.68], [0.84, 0.4], [1, 0]],
  },
  // Volcán ancho y seco, con el pitón rocoso del cráter en la cima.
  'ojos-del-salado': {
    subida: [[0, 0], [0.22, 0.24], [0.36, 0.48], [0.46, 0.68], [0.52, 0.8], [0.56, 0.86], [0.58, 0.96], [0.6, 1]],
    bajada: [[0.63, 1], [0.65, 0.86], [0.7, 0.82], [0.78, 0.66], [0.88, 0.36], [1, 0]],
  },
  // Pirámide de cuatro caras, aislada y muy afilada.
  makalu: {
    subida: [[0, 0], [0.14, 0.22], [0.26, 0.38], [0.34, 0.52], [0.42, 0.72], [0.48, 0.9], [0.52, 1]],
    bajada: [[0.56, 0.94], [0.6, 0.95], [0.64, 0.82], [0.72, 0.62], [0.8, 0.5], [0.9, 0.28], [1, 0]],
  },
  // Cresta dentada sobre una pared enorme.
  lhotse: {
    subida: [[0, 0], [0.16, 0.26], [0.28, 0.48], [0.38, 0.66], [0.46, 0.82], [0.52, 0.92], [0.56, 1]],
    bajada: [[0.6, 0.95], [0.63, 0.98], [0.67, 0.9], [0.72, 0.93], [0.78, 0.72], [0.88, 0.4], [1, 0]],
  },
  // Macizo gigante con cinco cimas.
  kangchenjunga: {
    subida: [[0, 0], [0.12, 0.25], [0.22, 0.45], [0.3, 0.6], [0.36, 0.72], [0.42, 0.84], [0.46, 0.92], [0.5, 1]],
    bajada: [[0.54, 0.92], [0.58, 0.96], [0.62, 0.86], [0.66, 0.9], [0.72, 0.72], [0.82, 0.5], [0.9, 0.3], [1, 0]],
  },
  // La pirámide casi perfecta.
  k2: {
    subida: [[0, 0], [0.2, 0.14], [0.3, 0.28], [0.37, 0.44], [0.42, 0.62], [0.46, 0.8], [0.49, 0.94], [0.5, 1]],
    bajada: [[0.52, 0.96], [0.55, 0.82], [0.59, 0.64], [0.64, 0.46], [0.72, 0.3], [0.84, 0.14], [1, 0]],
  },
}

/** La silueta de una montaña; la genérica si no tiene propia. */
export const formaDe = (montanaId: string): FormaMontana => SILUETAS[montanaId] ?? FORMA_GENERICA
