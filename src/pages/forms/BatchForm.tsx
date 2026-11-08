// Create/edit batch form. Client validation mirrors the Java annotations in
// _kit/backend/dto/Catalog.java (BatchCreate/BatchUpdate); the server's `detalle` decides
// everything else and is mapped back to the field when the message names it.
import { useState, type FormEvent } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Fish, TriangleAlert } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { Select } from '../../components/ui/Select'
import { useCreateBatch, usePonds, useUpdateBatch } from '../../api/queries'
import { ApiError } from '../../api/http'
import { duration, ease } from '../../motion/presets'
import type { BatchResponse, UUID } from '../../api/types'

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

export interface BatchFormProps {
  /** Present = edit (PATCH), absent = create (POST). */
  batch?: BatchResponse
  /** Preselected pond when creating from a pond page. */
  pondId?: string
  onDone: (saved: BatchResponse) => void
  onCancel: () => void
}

type BatchField =
  | 'estanque_id'
  | 'codigo'
  | 'fecha_siembra'
  | 'cantidad_inicial'
  | 'peso_inicial_g'

function detalleField(detalle: string): BatchField | null {
  const d = detalle.toLowerCase()
  if (d.includes('estanque')) return 'estanque_id'
  if (d.includes('codigo') || d.includes('código')) return 'codigo'
  if (d.includes('siembra')) return 'fecha_siembra'
  if (d.includes('cantidad')) return 'cantidad_inicial'
  if (d.includes('peso') && d.includes('inicial')) return 'peso_inicial_g'
  return null
}

/** Today as YYYY-MM-DD in local time: the input max so the siembra is never future. */
function todayIso(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

/** The parsed number behind a text input. null when the text is not a number. */
function parseNumber(text: string): number | null {
  if (text.trim() === '') return null
  const value = Number(text.replace(',', '.'))
  return Number.isFinite(value) ? value : null
}

export default function BatchForm({ batch, pondId, onDone, onCancel }: BatchFormProps) {
  const isEdit = batch !== undefined
  const ponds = usePonds()
  const estanqueOptions = (ponds.data ?? []).map((pond) => ({
    value: pond.id,
    label: pond.nombre,
  }))

  const [estanque, setEstanque] = useState<UUID>(batch?.estanque_id ?? pondId ?? '')
  const [codigo, setCodigo] = useState(batch?.codigo ?? '')
  const [fechaSiembra, setFechaSiembra] = useState(batch?.fecha_siembra ?? '')
  const [cantidad, setCantidad] = useState(
    batch?.cantidad_inicial != null ? String(batch.cantidad_inicial) : '',
  )
  const [peso, setPeso] = useState(
    batch?.peso_inicial_g != null ? String(batch.peso_inicial_g).replace('.', ',') : '',
  )
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<BatchField, string>>>({})
  const [detalle, setDetalle] = useState<string | null>(null)

  const createBatch = useCreateBatch()
  const updateBatch = useUpdateBatch()
  const saving = createBatch.isPending || updateBatch.isPending

  function validate(): boolean {
    const errors: Partial<Record<BatchField, string>> = {}
    const codigoLimpio = codigo.trim()
    if (!isEdit && estanque.trim() === '') {
      errors.estanque_id = 'El estanque es obligatorio.'
    }
    if (codigoLimpio === '') {
      errors.codigo = 'El código es obligatorio.'
    } else if (codigoLimpio.length > 40) {
      errors.codigo = 'El código puede tener hasta 40 caracteres.'
    }
    if (fechaSiembra !== '' && fechaSiembra > todayIso()) {
      errors.fecha_siembra = 'La fecha de siembra no puede ser futura.'
    }
    const cantidadParsed = parseNumber(cantidad)
    if (cantidadParsed !== null && cantidadParsed < 0) {
      errors.cantidad_inicial = 'La cantidad inicial no puede ser negativa.'
    }
    const pesoParsed = parseNumber(peso)
    if (pesoParsed !== null && pesoParsed <= 0) {
      errors.peso_inicial_g = 'El peso inicial debe ser mayor que cero.'
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

    const codigoLimpio = codigo.trim()
    if (isEdit && batch) {
      updateBatch.mutate(
        {
          id: batch.id,
          body: {
            codigo: codigoLimpio,
            fecha_siembra: fechaSiembra === '' ? undefined : fechaSiembra,
            cantidad_inicial: parseNumber(cantidad),
            peso_inicial_g: parseNumber(peso),
          },
        },
        { onSuccess: onDone, onError: handleError },
      )
    } else {
      createBatch.mutate(
        {
          estanque_id: estanque,
          codigo: codigoLimpio,
          fecha_siembra: fechaSiembra === '' ? undefined : fechaSiembra,
          cantidad_inicial: parseNumber(cantidad),
          peso_inicial_g: parseNumber(peso),
        },
        { onSuccess: onDone, onError: handleError },
      )
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex w-full flex-col gap-5">
      <header className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-small)] bg-accent-soft text-ink-emphasis">
          <Fish size={20} strokeWidth={1.5} aria-hidden="true" />
        </span>
        <div>
          <h2>{isEdit ? 'Editar lote' : 'Nuevo lote'}</h2>
          <p className="text-caption text-ink-faint">
            {isEdit
              ? 'Cambia el código, la siembra o el peso inicial del lote.'
              : 'Siembra un lote nuevo en un estanque de la finca.'}
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
        {isEdit && batch ? (
          <div className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-caption text-ink-muted">Estanque</span>
            <span className="flex h-[var(--button-height)] items-center truncate rounded-[var(--radius-small)] border border-hairline bg-surface-2 px-3 text-body text-ink-muted">
              {ponds.data?.find((pond) => pond.id === batch.estanque_id)?.nombre ??
                'Estanque del lote'}
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-1 sm:col-span-2">
            <Select
              id="lote-estanque"
              label="Estanque"
              options={estanqueOptions}
              value={estanque}
              onChange={(e) => setEstanque(e.target.value)}
              aria-invalid={fieldErrors.estanque_id ? true : undefined}
              aria-describedby={fieldErrors.estanque_id ? 'lote-estanque-error' : undefined}
            />
            <FieldError id="lote-estanque-error" message={fieldErrors.estanque_id} />
          </div>
        )}

        <div className="flex flex-col gap-1">
          <Field
            id="lote-codigo"
            label="Código"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            aria-invalid={fieldErrors.codigo ? true : undefined}
            aria-describedby={fieldErrors.codigo ? 'lote-codigo-error' : undefined}
            maxLength={40}
            placeholder="L-2026-04"
          />
          <FieldError id="lote-codigo-error" message={fieldErrors.codigo} />
        </div>

        <div className="flex flex-col gap-1">
          <Field
            id="lote-fecha-siembra"
            label="Fecha de siembra"
            type="date"
            value={fechaSiembra}
            max={todayIso()}
            onChange={(e) => setFechaSiembra(e.target.value)}
            aria-invalid={fieldErrors.fecha_siembra ? true : undefined}
            aria-describedby={fieldErrors.fecha_siembra ? 'lote-fecha-siembra-error' : undefined}
          />
          <FieldError id="lote-fecha-siembra-error" message={fieldErrors.fecha_siembra} />
        </div>

        <div className="flex flex-col gap-1">
          <Field
            id="lote-cantidad-inicial"
            label="Cantidad inicial (peces)"
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
            aria-invalid={fieldErrors.cantidad_inicial ? true : undefined}
            aria-describedby={fieldErrors.cantidad_inicial ? 'lote-cantidad-inicial-error' : undefined}
            placeholder="5200"
          />
          <FieldError id="lote-cantidad-inicial-error" message={fieldErrors.cantidad_inicial} />
        </div>

        <div className="flex flex-col gap-1">
          <Field
            id="lote-peso-inicial"
            label="Peso inicial (g)"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.1"
            value={peso}
            onChange={(e) => setPeso(e.target.value)}
            aria-invalid={fieldErrors.peso_inicial_g ? true : undefined}
            aria-describedby={fieldErrors.peso_inicial_g ? 'lote-peso-inicial-error' : undefined}
            placeholder="1,8"
          />
          <FieldError id="lote-peso-inicial-error" message={fieldErrors.peso_inicial_g} />
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
