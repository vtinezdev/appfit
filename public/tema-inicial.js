// Evita el parpadeo de tema antes de que cargue React (misma lógica que src/shared/design/theme.ts). Va aparte del
// index.html para que la política de seguridad de contenido (public/_headers) no tenga que permitir scripts en línea.
try {
  var p = localStorage.getItem('appfit-theme')
  var dark = p === 'dark' || (p !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
} catch (e) {}
