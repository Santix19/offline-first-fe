// Create/edit pond form. Client validation mirrors the Java annotations in
// _kit/backend/dto/Catalog.java (PondCreate/PondUpdate); the server's `detalle` decides
// everything else and is mapped back to the field when the message names it.
import { useState, type FormEvent } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { TriangleAlert, Waves } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { Select } from '../../components/ui/Select'
import { useCreatePond, useUpdatePond } from '../../api/queries'
import { ApiError } from '../../api/http'
import { duration, ease } from '../../motion/presets'
import type { PondResponse, PondType } from '../../api/types'

/** Field error with the shared state motion: slides down and fades. Reduced: opacity only. */
function FieldError({ id, message }: { id: string; message?: string }) {
  const reduce = useReducedMotion()
  const offset = reduce ? 0 : -4
  return (
    <AnimatePresence initial={false}>
      {message ? (
        <motion.p
          key={message}
          id={id}
          initial={{ opacity: 0, y: offset }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: offset }}
          transition={{
            duration: reduce ? duration.micro : duration.state,
            ease: ease.out,
          }}
          className="flex items-center gap-1 text-caption text-ink"
        >
          <TriangleAlert size={16} strokeWidth={1.5} className="shrink-0 text-critico" aria-hidden="true" />
          {message}
        </motion.p>
      ) : null}
    </AnimatePresence>
  )
}

export interface PondFormProps {
  /** Present = edit (PATCH), absent = create (POST). */
  pond?: PondResponse
  onDone: (saved: PondResponse) => void
  onCancel: () => void
}

type PondField = 'nombre' | 'tipo' | 'volumen_m3'

const TIPO_OPTIONS = [
  { value: 'estanque', label: 'Estanque' },
  { value: 'tanque', label: 'Tanque' },
  { value: 'jaula', label: 'Jaula' },
]

function detalleField(detalle: string): PondField | null {
  const d = detalle.toLowerCase()
  if (d.includes('volumen')) return 'volumen_m3'
  if (d.includes('nombre')) return 'nombre'
  if (d.includes('tipo')) return 'tipo'
  return null
}

/** The parsed volumen: accepts the comma decimal the es-CO keyboard writes. null when empty. */
function parseVolumen(text: string): number | null | undefined {
  if (text.trim() === '') return undefined
  const value = Number(text.replace(',', '.'))
  return Number.isFinite(value) ? value : null
}

export default function PondForm({ pond, onDone, onCancel }: PondFormProps) {
  const isEdit = pond !== undefined
  const [nombre, setNombre] = useState(pond?.nombre ?? '')
  const [tipo, setTipo] = useState<PondType>(pond?.tipo ?? 'estanque')
  const [volumen, setVolumen] = useState(
    pond?.volumen_m3 != null ? String(pond.volumen_m3).replace('.', ',') : '',
  )
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<PondField, string>>>({})
  const [detalle, setDetalle] = useState<string | null>(null)

  const createPond = useCreatePond()
  const updatePond = useUpdatePond()
  const saving = createPond.isPending || updatePond.isPending

  function validate(): boolean {
    const errors: Partial<Record<PondField, string>> = {}
    const nombreLimpio = nombre.trim()
    if (nombreLimpio === '') {
      errors.nombre = 'El nombre es obligatorio.'
    } else if (nombreLimpio.length > 80) {
      errors.nombre = 'El nombre puede tener hasta 80 caracteres.'
    }
    const volumenParsed = parseVolumen(volumen)
    if (volumenParsed === null) {
      errors.volumen_m3 = 'El volumen debe ser un número mayor que cero.'
    } else if (volumenParsed !== undefined && volumenParsed <= 0) {
      errors.volumen_m3 = 'El volumen debe ser mayor que cero.'
    }
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return false
    setDetalle(null)
    return true
  }

  function handleError(err: unknown) {
    const texto = err instanceof ApiError ? err.detalle : 'No se pudo guardar. Intenta de nuevo.'
    const field = detalleField(texto)
    if (field) {
      setFieldErrors({ [field]: texto })
      setDetalle(null)
    } else {
      setDetalle(texto)
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!validate() || saving) return
    const nombreLimpio = nombre.trim()
    const volumen_m3 = parseVolumen(volumen) ?? null

    if (isEdit && pond) {
      updatePond.mutate(
        { id: pond.id, body: { nombre: nombreLimpio, tipo, volumen_m3, activo: pond.activo } },
        { onSuccess: onDone, onError: handleError },
      )
    } else {
      createPond.mutate(
        { nombre: nombreLimpio, tipo, volumen_m3 },
        { onSuccess: onDone, onError: handleError },
      )
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex w-full flex-col gap-5">
      <header className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-small)] bg-accent-soft text-ink-emphasis">
          <Waves size={20} strokeWidth={1.5} aria-hidden="true" />
        </span>
        <div>
          <h2>{isEdit ? 'Editar estanque' : 'Nuevo estanque'}</h2>
          <p className="text-caption text-ink-faint">
            {isEdit
              ? 'Cambia el nombre, el tipo o el volumen del estanque.'
              : 'Registra un estanque, tanque o jaula de la finca.'}
          </p>
        </div>
      </header>

      {detalle ? (
        <p className="flex items-start gap-1 rounded-[var(--radius-small)] bg-critico-tint px-3 py-2 text-caption text-ink">
          <TriangleAlert
            size={16}
            strokeWidth={1.5}
            className="mt-0.5 shrink-0 text-critico"
            aria-hidden="true"
          />
          {detalle}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1 sm:col-span-2">
          <Field
            id="estanque-nombre"
            label="Nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            aria-invalid={fieldErrors.nombre ? true : undefined}
            aria-describedby={fieldErrors.nombre ? 'estanque-nombre-error' : undefined}
            maxLength={80}
          />
          <FieldError id="estanque-nombre-error" message={fieldErrors.nombre} />
        </div>

        <div className="flex flex-col gap-1">
          <Select
            id="estanque-tipo"
            label="Tipo"
            options={TIPO_OPTIONS}
            value={tipo}
            onChange={(e) => setTipo(e.target.value as PondType)}
            aria-invalid={fieldErrors.tipo ? true : undefined}
            aria-describedby={fieldErrors.tipo ? 'estanque-tipo-error' : undefined}
          />
          <FieldError id="estanque-tipo-error" message={fieldErrors.tipo} />
        </div>

        <div className="flex flex-col gap-1">
          <Field
            id="estanque-volumen"
            label="Volumen (m³)"
            inputMode="decimal"
            value={volumen}
            onChange={(e) => setVolumen(e.target.value)}
            aria-invalid={fieldErrors.volumen_m3 ? true : undefined}
            aria-describedby={fieldErrors.volumen_m3 ? 'estanque-volumen-error' : undefined}
            placeholder="18"
          />
          <FieldError id="estanque-volumen-error" message={fieldErrors.volumen_m3} />
        </div>

        <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onCancel} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            Guardar
          </Button>
        </div>
      </div>
    </form>
  )
}
