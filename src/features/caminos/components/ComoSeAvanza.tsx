import { BloqueComoFunciona, ListaComoFunciona } from '../../../shared/components/ComoFunciona'
import Disclosure from '../../../shared/components/Disclosure'
import { FUENTE_RUTAS } from '../lib/rutas'

/** Las reglas de Caminos, para la página «Cómo funciona». */
export default function ComoSeAvanza() {
  return <>
    <BloqueComoFunciona titulo="Qué avanza">
      <ListaComoFunciona>
        <li>Cada km de caminar, correr o senderismo es un km de la ruta: grabado, importado o a mano.</li>
        <li>El gimnasio no avanza los Caminos: sube metros en Cumbres.</li>
        <li>Cada etapa acaba en un lugar real o del libro, y cada día con actividad es un sello en la credencial de la ruta.</li>
      </ListaComoFunciona>
    </BloqueComoFunciona>

    <BloqueComoFunciona titulo="La ruta">
      <ListaComoFunciona>
        <li>No hay plazo ni se puede fallar. Al llegar, los km que sobran no pasan a la siguiente.</li>
        <li>Puedes cambiar a otra ruta más larga que lo ya recorrido, también a una que ya hayas hecho; con todas hechas, vuelven a empezar.</li>
        <li>Cuenta desde el día en que eliges la primera y sale de tus actividades: si borras o cambias una, se recalcula.</li>
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
