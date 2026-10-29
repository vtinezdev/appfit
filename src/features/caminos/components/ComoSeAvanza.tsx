import { BloqueComoFunciona, ListaComoFunciona } from '../../../shared/components/ComoFunciona'
import Disclosure from '../../../shared/components/Disclosure'
import { FUENTE_RUTAS, NOMBRE_COLECCION, NOTA_COLECCION, type ColeccionRuta } from '../lib/rutas'

const COLECCIONES = Object.keys(NOMBRE_COLECCION) as ColeccionRuta[]

/** Las reglas de Caminos, para la página «Cómo funciona». */
export default function ComoSeAvanza() {
  return <>
    <BloqueComoFunciona titulo="Qué avanza">
      <ListaComoFunciona>
        <li>Cada km de caminar, correr o senderismo es un km de la ruta: grabado, importado o a mano.</li>
        <li>También los pasos que apuntes, pasados a km con tu zancada. Como el total del móvil ya incluye tus actividades, de cada día solo cuenta lo que pase de ellas: 9 km de pasos y una caminata de 5 km suman 9, no 14.</li>
        <li>El gimnasio no avanza los Caminos: sube metros en Cumbres.</li>
        <li>Cada etapa acaba en un lugar real o del libro, y cada día que avanzas es un sello en la credencial de la ruta.</li>
      </ListaComoFunciona>
    </BloqueComoFunciona>

    <BloqueComoFunciona titulo="La ruta">
      <ListaComoFunciona>
        <li>No hay plazo ni se puede fallar. Al llegar, los km que sobran no pasan a la siguiente.</li>
        <li>Puedes cambiar a otra ruta más larga que lo ya recorrido, también a una que ya hayas hecho; con todas hechas, vuelven a empezar.</li>
        <li>Cuenta desde el día en que eliges la primera y sale de tus actividades y tus pasos: si borras o cambias algo, se recalcula.</li>
      </ListaComoFunciona>
    </BloqueComoFunciona>

    <BloqueComoFunciona titulo="Los pasos">
      <ListaComoFunciona>
        <li>Una web app no puede leer los pasos de Salud ni de Google Fit: se apuntan a mano, un total por día.</li>
        <li>La zancada se estima por tu altura (0,415 × la altura; 0,413 en mujeres), como hacen los podómetros. Si conoces la tuya, cámbiala.</li>
      </ListaComoFunciona>
    </BloqueComoFunciona>

    <BloqueComoFunciona titulo="Las colecciones">
      <ListaComoFunciona>
        {COLECCIONES.map((col) => <li key={col}><span className="font-semibold text-fg">{NOMBRE_COLECCION[col]}:</span> {NOTA_COLECCION[col].charAt(0).toLowerCase()}{NOTA_COLECCION[col].slice(1)}.</li>)}
      </ListaComoFunciona>
    </BloqueComoFunciona>

    <BloqueComoFunciona titulo="Tus rutas">
      <p className="text-body-sm text-fg">Los km van en línea recta entre sus lugares, con un 15 % más por las curvas del camino, o los que pongas tú.</p>
      <Disclosure title="Fuentes de las rutas y los lugares">
        <div className="space-y-2 text-body-sm text-fg-muted"><p>{FUENTE_RUTAS}</p><p>Lugares de tus rutas: GeoNames (geonames.org), CC BY 4.0.</p></div>
      </Disclosure>
    </BloqueComoFunciona>
  </>
}
