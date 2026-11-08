import { useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { BellRing, LayoutDashboard, SlidersHorizontal, Smartphone, Users } from 'lucide-react'
import { useAlerts, usePendingFindings } from '../api/queries'
import { onUnauthorized, useSession } from '../api/session'
import { useLiveEvents } from '../api/stream'
import { useToast } from '../components/ui/Toast'
import { Layout, type NavItem } from './Layout'

/**
 * Session gate. The live data lives in ShellFrame so nothing is fetched while the visitor has no
 * session (the login screen shares no queries with the panel).
 */
export default function Shell() {
  const navigate = useNavigate()
  const { notify } = useToast()
  const { autenticado, debeCambiarClave } = useSession()

  useEffect(
    () =>
      onUnauthorized((detalle) => {
        notify(detalle, 'critico')
        navigate('/entrar', { replace: true })
      }),
    [navigate, notify],
  )

  if (!autenticado) return <Navigate to="/entrar" replace />
  if (debeCambiarClave) return <Navigate to="/clave" replace />

  return <ShellFrame />
}

function ShellFrame() {
  const navigate = useNavigate()
  const { notify } = useToast()
  const { usuario, logout } = useSession()

  const alertas = useAlerts({ pendientes: true })
  const hallazgos = usePendingFindings()
  const { connected, lastFinding, clearLastFinding } = useLiveEvents()

  useEffect(() => {
    if (!lastFinding) return
    notify(`Hallazgo nuevo: ${lastFinding.mensaje}`, 'info')
    clearLastFinding()
  }, [lastFinding, clearLastFinding, notify])

  const pendientes = (alertas.data?.length ?? 0) + (hallazgos.data?.length ?? 0)

  const nav: NavItem[] = [
    { label: 'Inicio', to: '/', icon: LayoutDashboard },
    { label: 'Alertas', to: '/alertas', count: pendientes, icon: BellRing },
    { label: 'Parámetros', to: '/parametros', icon: SlidersHorizontal },
  ]
  // Devices and users answer 403 to a cuidador (backend: "solo lo puede hacer el productor").
  if (usuario?.rol === 'productor') {
    nav.splice(2, 0, { label: 'Dispositivos', to: '/dispositivos', icon: Smartphone })
    nav.push({ label: 'Usuarios', to: '/usuarios', icon: Users })
  }

  const salir = (): void => {
    void logout().then(() => {
      navigate('/entrar', { replace: true })
    })
  }

  return (
    <Layout
      nav={nav}
      userName={usuario?.nombre ?? ''}
      rol={usuario?.rol}
      enVivo={connected}
      onSalir={salir}
    />
  )
}
