import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { TriangleAlert, Waves } from 'lucide-react'
import { ApiError } from '../api/http'
import { useSession } from '../api/session'
import { Button } from '../components/ui/Button'
import { Field } from '../components/ui/Field'
import { FadeUp, MaskedText } from '../motion/Motion'
import { LiquidField } from '../three/LiquidField'
import { PondOrb } from '../three/PondOrb'

export default function Entrar() {
  const navigate = useNavigate()
  const { autenticado, debeCambiarClave, login } = useSession()
  const [documento, setDocumento] = useState('')
  const [clave, setClave] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  if (autenticado) {
    return <Navigate to={debeCambiarClave ? '/clave' : '/'} replace />
  }

  const entrar = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    setError(null)
    setEnviando(true)
    try {
      const sesion = await login(documento.trim(), clave)
      navigate(sesion.usuario.debe_cambiar_clave ? '/clave' : '/', { replace: true })
    } catch (causa) {
      setError(
        causa instanceof ApiError
          ? causa.detalle
          : 'No se pudo conectar con el servidor. Revisa la conexión e intenta de nuevo.',
      )
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="relative isolate flex min-h-dvh items-center justify-center overflow-hidden bg-nav px-[var(--gutter)] py-10">
      <LiquidField intensity={1} />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[1] bg-nav/45" />

      <div className="orbit-badge left-[var(--gutter)] bottom-10 hidden md:grid" aria-hidden="true">
        <svg viewBox="0 0 100 100">
          <defs>
            <path id="orbit-circle" d="M 50,50 m -38,0 a 38,38 0 1,1 76,0 a 38,38 0 1,1 -76,0" />
          </defs>
          <text><textPath href="#orbit-circle">el agua · entra · el agua · entra · el agua ·</textPath></text>
        </svg>
        <span className="text-lead leading-none text-white">↓</span>
      </div>

      <div className="relative z-10 flex w-full max-w-6xl flex-col gap-8">
        <div className="flex flex-col items-start gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-[var(--radius-small)] bg-accent-soft text-ink-emphasis ">
            <Waves size={24} strokeWidth={1.5} aria-hidden="true" />
          </span>
          <p className="text-on-nav text-[var(--text-label)] leading-[var(--leading-body)]">Laguna de La Cocha, Nariño</p>
          <MaskedText
            as="h1"
            text="La Cocha"
            className="whitespace-nowrap font-display font-light leading-[0.9] tracking-[var(--tracking-display)] text-on-nav text-[clamp(3.5rem,15vw,13rem)]"
          />
        </div>
        <div className="flex w-full flex-col items-center gap-10 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex w-full max-w-sm flex-col items-start">
          <p className="mb-6 max-w-[36ch] text-body text-on-nav">
            Panel de la finca. Usa el documento y la clave que te entregaron.
          </p>
          <PondOrb />
        </div>

        <div className="w-full max-w-sm">
        <FadeUp className="rounded-[var(--radius-cards)] bg-surface p-6 ">
          <h2 className="mb-1">Entrar</h2>
          <p className="mb-5 text-caption text-ink-muted">Acceso para el equipo de la finca.</p>
          <form
            onSubmit={(event) => {
              void entrar(event)
            }}
            className="flex flex-col gap-4"
          >
            <Field
              id="documento"
              label="Documento"
              value={documento}
              onChange={(event) => setDocumento(event.target.value)}
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="username"
              autoFocus
              required
            />
            <Field
              id="clave"
              label="Clave"
              type="password"
              value={clave}
              onChange={(event) => setClave(event.target.value)}
              autoComplete="current-password"
              required
            />
            {error ? (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-[var(--radius-small)] bg-critico-tint px-3 py-2 text-caption text-ink"
              >
                <TriangleAlert
                  size={16}
                  strokeWidth={1.5}
                  aria-hidden="true"
                  className="mt-0.5 shrink-0 text-critico"
                />
                {error}
              </p>
            ) : null}
            <Button type="submit" loading={enviando} className="mt-1 w-full">
              Entrar
            </Button>
          </form>
        </FadeUp>
        </div>
        </div>
      </div>
    </main>
  )
}
