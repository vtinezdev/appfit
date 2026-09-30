// Lector de códigos de barras (polyfill de `BarcodeDetector` sobre ZXing en WebAssembly). Este módulo solo se
// carga con `import()` al abrir el escáner (ver `detector.ts`), así que no pesa en el arranque de la app.
// El `.wasm` se sirve desde el propio origen (Vite lo emite como asset) en lugar del CDN por defecto (jsDelivr).
// Tiene que ser la versión de `zxing-wasm` que usa `barcode-detector` (fijada en package.json; lo comprueba un test).
import { BarcodeDetector, prepareZXingModule } from 'barcode-detector/ponyfill'
import wasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url'

prepareZXingModule({
  overrides: {
    locateFile: (path: string, prefix: string) => (path.endsWith('.wasm') ? wasmUrl : prefix + path),
  },
})

export { BarcodeDetector }
