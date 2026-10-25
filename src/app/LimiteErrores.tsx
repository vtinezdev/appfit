import { Component, type ReactNode } from 'react'
import { registrarErrorDiagnostico } from '../shared/lib/diagnostico'
import FalloAplicacion from './FalloAplicacion'

/** No guarda mensajes, stacks ni datos del usuario. Una recarga también permite reintentar chunks fallidos. */
export default class LimiteErrores extends Component<{ children: ReactNode }, { fallo: boolean }> {
  state = { fallo: false }
  static getDerivedStateFromError() { return { fallo: true } }
  componentDidCatch() { registrarErrorDiagnostico('ejecucion') }
  render() { return this.state.fallo ? <FalloAplicacion /> : this.props.children }
}
