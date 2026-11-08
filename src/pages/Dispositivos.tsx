// Devices that sync (phone app, ESP32 counters) and the log of their pushes.
// A description of 1 to 120 characters, per Devices.java DeviceUpdate.
import { EmptyState } from "../components/ui/EmptyState";
import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { CircleCheck, RefreshCw, Smartphone, WifiOff, X } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { DataTable, type Column } from "../components/ui/DataTable";
import { ErrorState } from "../components/ui/ErrorState";
import { Skeleton } from "../components/ui/Skeleton";
import { SlowServerNotice } from "../components/ui/SlowServerNotice";
import { useToast } from "../components/ui/Toast";
import { useDevices, useSyncLogs, useUpdateDevice } from "../api/queries";
import { FadeUp, MaskedText } from "../motion/Motion";
import { duration, ease } from "../motion/presets";
import type { DeviceResponse, SyncLogResponse } from "../api/types";
import { hoursSince, formatDateTime, formatInteger, formatRelative } from "../lib/format";

const SIN_SENAL_HORAS = 24;

interface DispositivoRow extends DeviceResponse {
  nombre: string;
  sinSenal: boolean;
}

/** Solid advertencia chip: icon + word, never color alone. */
function SinSenal() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-advertencia px-2 py-0.5 text-caption text-advertencia-fg">
      <WifiOff size={14} strokeWidth={1.5} aria-hidden="true" />
      <span>Sin señal</span>
    </span>
  );
}

function EstadoChip({ activo }: { activo: boolean }) {
  if (activo) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-ok px-2 py-0.5 text-caption text-ok-fg">
        <CircleCheck size={14} strokeWidth={1.5} aria-hidden="true" />
        <span>Activo</span>
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-caption text-ink-muted">
      <X size={14} strokeWidth={1.5} aria-hidden="true" />
      <span>Dado de baja</span>
    </span>
  );
}

const DISPOSITIVOS_VACIOS =
  "Aún no hay dispositivos sincronizando. Aparecen cuando el celular o un nodo envía datos.";
const SINCRONIZACIONES_VACIAS =
  "Aún no hay sincronizaciones registradas. Aparecen cuando un dispositivo envía eventos.";

import { useSession } from "../api/session";

export default function Dispositivos() {
  const session = useSession();
  if (!session.isProductor) return <SoloProductor />;
  return <DispositivosProductor />;
}

function SoloProductor() {
  return (
    <div className="flex flex-col gap-6">
      <h1>Dispositivos</h1>
      <EmptyState message="Solo el productor administra los dispositivos de la finca." />
    </div>
  );
}

function DispositivosProductor() {
  const devices = useDevices();
  const syncs = useSyncLogs();
  const updateDevice = useUpdateDevice();

  const { notify } = useToast();
  const [editando, setEditando] = useState<string | null>(null);
  const [descripcion, setDescripcion] = useState("");
  const [descripcionError, setDescripcionError] = useState<string | null>(null);
  const [darDeBaja, setDarDeBaja] = useState<DispositivoRow | null>(null);
  const [detalle, setDetalle] = useState<string | null>(null);
  const [pendiente, setPendiente] = useState<string | null>(null);
  const reduce = useReducedMotion();

  const dispositivos: DispositivoRow[] = (devices.data ?? []).map((device) => ({
    ...device,
    nombre: device.descripcion ?? device.id,
    sinSenal: hoursSince(device.ultimo_visto_en) > SIN_SENAL_HORAS,
  }));

  function cancelarEdicion() {
    setEditando(null);
    setDescripcion("");
    setDescripcionError(null);
  }

  function iniciarRename(device: DispositivoRow) {
    setEditando(device.id);
    setDescripcion(device.descripcion ?? "");
    setDescripcionError(null);
  }

  function errorDeMutation(err: unknown, texto: string): string {
    return err instanceof Error && err.message ? err.message : texto;
  }

  function guardarDescripcion(device: DispositivoRow) {
    const texto = descripcion.trim();
    if (texto === "") {
      setDescripcionError("La descripción es obligatoria.");
      return;
    }
    if (texto.length > 120) {
      setDescripcionError("La descripción puede tener hasta 120 caracteres.");
      return;
    }
    setDescripcionError(null);
    setPendiente(device.id);
    updateDevice.mutate(
      { id: device.id, body: { descripcion: texto } },
      {
        onSuccess: () => {
          setEditando(null);
          setPendiente(null);
          notify("Descripción guardada.");
        },
        onError: (err) => {
          setPendiente(null);
          setDetalle(errorDeMutation(err, "No se pudo guardar la descripción."));
        },
      },
    );
  }

  function cambiarActivo(device: DispositivoRow, activo: boolean) {
    setPendiente(device.id);
    updateDevice.mutate(
      { id: device.id, body: { activo } },
      {
        onSuccess: () => {
          setPendiente(null);
          notify(activo ? "Dispositivo activado." : "Dispositivo dado de baja.");
        },
        onError: (err) => {
          setPendiente(null);
          setDetalle(errorDeMutation(err, "No se pudo actualizar el dispositivo."));
        },
      },
    );
  }

  const columnasDispositivos: Column<DispositivoRow>[] = [
    {
      key: "nombre",
      header: "Dispositivo",
      render: (device) =>
        editando === device.id ? (
          <motion.div
            className="flex flex-col gap-1"
            initial={{ opacity: 0, y: reduce ? 0 : 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={
              reduce
                ? { duration: duration.micro }
                : { duration: duration.state, ease: ease.out }
            }
          >
            <div className="flex flex-wrap items-center gap-1">
              <input
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                maxLength={120}
                aria-label={`Descripción de ${device.nombre}`}
                className="min-h-[var(--button-height)] w-44 rounded-[var(--radius-small)] border border-hairline bg-surface px-2 text-body text-ink"
              />
              <Button
                variant="quiet"
                loading={pendiente === device.id && updateDevice.isPending}
                onClick={() => guardarDescripcion(device)}
              >
                Guardar
              </Button>
              <Button variant="quiet" onClick={cancelarEdicion}>
                Cancelar
              </Button>
            </div>
            {descripcionError ? (
              <motion.p
                className="flex items-center gap-1 text-caption text-ink"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={
                  reduce
                    ? { duration: duration.micro }
                    : { duration: duration.state, ease: ease.out }
                }
              >
                <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4 shrink-0 text-critico">
                  <path
                    d="M8 1.8 14.6 13.4H1.4Z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                  <path d="M8 6.2v3.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <circle cx="8" cy="11.4" r="1" fill="currentColor" />
                </svg>
                {descripcionError}
              </motion.p>
            ) : null}
          </motion.div>
        ) : (
          <span className="inline-flex items-center gap-1">
            <Smartphone size={16} strokeWidth={1.5} aria-hidden="true" className="shrink-0 text-ink-emphasis" />
            <span>{device.descripcion ?? <span className="text-ink-muted">{device.id}</span>}</span>
          </span>
        ),
    },
    {
      key: "activo",
      header: "Estado",
      render: (device) => (
        <span className="flex flex-col items-start gap-1">
          <EstadoChip activo={device.activo} />
          {device.sinSenal ? <SinSenal /> : null}
        </span>
      ),
    },
    {
      key: "primer_visto_en",
      header: "Primer visto",
      render: (device) => (
        <span title={formatDateTime(device.primer_visto_en)} className="tabular-nums text-ink-muted">
          {formatRelative(device.primer_visto_en)}
        </span>
      ),
    },
    {
      key: "ultimo_visto_en",
      header: "Último visto",
      render: (device) => (
        <span title={formatDateTime(device.ultimo_visto_en)} className="tabular-nums text-ink">
          {formatRelative(device.ultimo_visto_en)}
        </span>
      ),
    },
    {
      key: "acciones",
      header: "Acciones",
      render: (device) => (
        <div className="flex flex-wrap gap-2">
          <Button variant="quiet" onClick={() => iniciarRename(device)}>
            Renombrar
          </Button>
          {device.activo ? (
            <Button variant="secondary" onClick={() => setDarDeBaja(device)}>
              Dar de baja
            </Button>
          ) : (
            <Button
              variant="quiet"
              loading={pendiente === device.id && updateDevice.isPending}
              onClick={() => cambiarActivo(device, true)}
            >
              Activar
            </Button>
          )}
        </div>
      ),
    },
  ];

  const columnasSincronizaciones: Column<SyncLogResponse>[] = [
    {
      key: "dispositivo_id",
      header: "Dispositivo",
      render: (log) => (
        <span className="inline-flex items-center gap-1">
          <Smartphone size={16} strokeWidth={1.5} aria-hidden="true" className="shrink-0 text-ink-emphasis" />
          {log.dispositivo_id}
        </span>
      ),
    },
    {
      key: "servidor_en",
      header: "Recibido",
      render: (log) => (
        <span title={formatDateTime(log.servidor_en)} className="inline-flex items-center gap-1 tabular-nums text-ink-muted">
          <RefreshCw size={16} strokeWidth={1.5} aria-hidden="true" className="shrink-0 text-ink-emphasis" />
          {formatRelative(log.servidor_en)}
        </span>
      ),
    },
    { key: "aceptados", header: "Aceptados", numeric: true, render: (log) => <span className="font-mono tabular-nums">{formatInteger(log.aceptados)}</span> },
    { key: "duplicados", header: "Duplicados", numeric: true, render: (log) => <span className="font-mono tabular-nums">{formatInteger(log.duplicados)}</span> },
    { key: "obsoletos", header: "Obsoletos", numeric: true, render: (log) => <span className="font-mono tabular-nums">{formatInteger(log.obsoletos)}</span> },
    { key: "rechazados", header: "Rechazados", numeric: true, render: (log) => <span className="font-mono tabular-nums">{formatInteger(log.rechazados)}</span> },
    {
      key: "alertas_generadas",
      header: "Alertas generadas",
      numeric: true,
      render: (log) => <span className="font-mono tabular-nums">{log.alertas_generadas > 0 ? formatInteger(log.alertas_generadas) : 0}</span>,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start gap-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-small)] bg-accent-soft text-ink-emphasis">
          <Smartphone size={20} strokeWidth={1.5} aria-hidden="true" />
        </span>
        <div>
          <MaskedText as="h1" text="Dispositivos" />
          <p className="text-body text-ink-muted">
            Celulares y contadores que envían datos sincronizados al panel.
          </p>
        </div>
      </header>

      <FadeUp delay={0}>
      <Card title="Dispositivos">
        {detalle ? (
          <motion.p
            className="mb-4 flex items-start gap-1 text-caption text-ink"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={
              reduce
                ? { duration: duration.micro }
                : { duration: duration.state, ease: ease.out }
            }
          >
            <svg viewBox="0 0 16 16" aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-critico">
              <path
                d="M8 1.8 14.6 13.4H1.4Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path d="M8 6.2v3.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="8" cy="11.4" r="1" fill="currentColor" />
            </svg>
            {detalle}
          </motion.p>
        ) : null}
        {devices.isLoading ? (
          <div className="flex flex-col gap-3">
            <Skeleton rows={3} />
            <SlowServerNotice active={devices.isLoading} />
          </div>
        ) : devices.isError ? (
          <ErrorState
            detalle={errorDeMutation(devices.error, "No se pudo cargar los dispositivos.")}
            onRetry={() => devices.refetch()}
          />
        ) : (
          <DataTable
            columns={columnasDispositivos}
            data={dispositivos}
            keyOf={(device) => device.id}
            emptyText={DISPOSITIVOS_VACIOS}
          />
        )}
      </Card>
      </FadeUp>

      <FadeUp delay={0.06}>
      <Card title="Sincronizaciones">
        {syncs.isLoading ? (
          <div className="flex flex-col gap-3">
            <Skeleton rows={3} />
            <SlowServerNotice active={syncs.isLoading} />
          </div>
        ) : syncs.isError ? (
          <ErrorState
            detalle={errorDeMutation(
              syncs.error,
              "No se pudo cargar el registro de sincronizaciones.",
            )}
            onRetry={() => syncs.refetch()}
          />
        ) : (
          <DataTable
            columns={columnasSincronizaciones}
            data={syncs.data ?? []}
            keyOf={(log) => log.id}
            emptyText={SINCRONIZACIONES_VACIAS}
          />
        )}
      </Card>
      </FadeUp>

      <ConfirmDialog
        open={darDeBaja !== null}
        title={darDeBaja ? `Dar de baja ${darDeBaja.nombre}` : "Dar de baja"}
        message="El dispositivo deja de recibir datos sincronizados. Puedes activarlo de nuevo después."
        confirmLabel="Dar de baja"
        onConfirm={() => {
          if (darDeBaja) cambiarActivo(darDeBaja, false);
          setDarDeBaja(null);
        }}
        onClose={() => setDarDeBaja(null)}
      />
    </div>
  );
}
