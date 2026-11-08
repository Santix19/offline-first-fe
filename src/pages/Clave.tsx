import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { TriangleAlert, Waves } from 'lucide-react'
import { ApiError } from '../api/http'
import { useSession } from '../api/session'
import { Button } from '../components/ui/Button'
import { Field } from '../components/ui/Field'
import { useToast } from '../components/ui/Toast'
import { FadeUp, MaskedText } from '../motion/Motion'

export default function Clave() {
  const navigate = useNavigate()
  const { notify } = useToast()
  const { autenticado, usuario, changePassword, logout } = useSession()
  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [repetida, setRepetida] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  if (!autenticado) return <Navigate to="/entrar" replace />

  const guardar = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    setError(null)

    if (nueva.length < 8 || nueva.length > 72) {
      setError('La clave debe tener entre 8 y 72 caracteres.')
      return
    }
    if (nueva !== repetida) {
      setError('Las claves nuevas no coinciden.')
      return
    }

    setEnviando(true)
    try {
      await changePassword(actual, nueva)
      notify('Clave actualizada.', 'ok')
      navigate('/', { replace: true })
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

  const salir = (): void => {
    void logout().then(() => {
      navigate('/entrar', { replace: true })
    })
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-field px-[var(--gutter)] py-10">
      <div className="w-full max-w-sm">
        <div className="mb-5 flex flex-col items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-small)] bg-accent-soft text-ink-emphasis ">
            <Waves size={20} strokeWidth={1.5} aria-hidden="true" />
          </span>
          <p className="font-display text-heading text-ink">La Cocha</p>
        </div>
        <MaskedText as="h1" text="Cambiar clave" />
        <p className="mt-2 mb-6 text-body text-ink-muted">
          {usuario?.nombre ?? 'Tu cuenta'} tiene una clave temporal. Elige una clave nueva para
          continuar.
        </p>

        <FadeUp className="rounded-[var(--radius-cards)] bg-surface p-6 ">
          <form
            onSubmit={(event) => {
              void guardar(event)
            }}
            className="flex flex-col gap-4"
          >
            <Field
              id="clave-actual"
              label="Clave actual"
              type="password"
              value={actual}
              onChange={(event) => setActual(event.target.value)}
              autoComplete="current-password"
              autoFocus
              required
            />
            <Field
              id="clave-nueva"
              label="Clave nueva"
              type="password"
              value={nueva}
              onChange={(event) => setNueva(event.target.value)}
              autoComplete="new-password"
              minLength={8}
              maxLength={72}
              required
            />
            <Field
              id="clave-repetida"
              label="Repetir la clave nueva"
              type="password"
              value={repetida}
              onChange={(event) => setRepetida(event.target.value)}
              autoComplete="new-password"
              minLength={8}
              maxLength={72}
              required
            />
            <p className="text-caption text-ink-muted">Entre 8 y 72 caracteres.</p>
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
              Guardar clave
            </Button>
            <Button type="button" variant="quiet" onClick={salir}>
              Salir
            </Button>
          </form>
        </FadeUp>
      </div>
    </main>
  )
}
