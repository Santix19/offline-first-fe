// Route table. Owned by Claude (integration). Each page lives in its own file under src/pages/.
// Pages load lazily so the first paint (Entrar/Inicio) never waits for recharts
// and the heavy detail pages: code-split per route, one shared skeleton fallback.
import { Suspense, lazy, type ReactNode } from 'react'
import { createBrowserRouter } from 'react-router'
import Shell from './Shell'
import { Skeleton } from '../components/ui/Skeleton'

const Entrar = lazy(() => import('../pages/Entrar'))
const Clave = lazy(() => import('../pages/Clave'))
const Inicio = lazy(() => import('../pages/Inicio'))
const Alertas = lazy(() => import('../pages/Alertas'))
const Estanque = lazy(() => import('../pages/Estanque'))
const Lote = lazy(() => import('../pages/Lote'))
const Dispositivos = lazy(() => import('../pages/Dispositivos'))
const Parametros = lazy(() => import('../pages/Parametros'))
const Usuarios = lazy(() => import('../pages/Usuarios'))
const Kit = lazy(() => import('../pages/Kit').then((modulo) => ({ default: modulo.Kit })))

function diferida(nodo: ReactNode): ReactNode {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-3">
          <Skeleton rows={4} />
        </div>
      }
    >
      {nodo}
    </Suspense>
  )
}

export const router = createBrowserRouter([
  { path: '/entrar', element: diferida(<Entrar />) },
  { path: '/clave', element: diferida(<Clave />) },
  {
    path: '/',
    element: <Shell />,
    children: [
      { index: true, element: diferida(<Inicio />) },
      { path: 'estanques/:id', element: diferida(<Estanque />) },
      { path: 'lotes/:id', element: diferida(<Lote />) },
      { path: 'alertas', element: diferida(<Alertas />) },
      { path: 'dispositivos', element: diferida(<Dispositivos />) },
      { path: 'parametros', element: diferida(<Parametros />) },
      { path: 'usuarios', element: diferida(<Usuarios />) },
      { path: 'kit', element: diferida(<Kit />) },
    ],
  },
])
