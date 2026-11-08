import { useState } from "react";
import { Button } from "../components/ui/Button";
import { StatusBadge } from "../components/ui/StatusBadge";
import { RangeBar } from "../components/ui/RangeBar";
import { Stat } from "../components/ui/Stat";
import { Card } from "../components/ui/Card";
import { DataTable, type Column } from "../components/ui/DataTable";
import { Skeleton } from "../components/ui/Skeleton";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { SlowServerNotice } from "../components/ui/SlowServerNotice";
import { useToast } from "../components/ui/Toast";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { Field } from "../components/ui/Field";
import { Select } from "../components/ui/Select";
import { TimeSeriesChart, type TimePoint } from "../components/charts/TimeSeriesChart";
import { DailyRangeChart, type DayRangePoint } from "../components/charts/DailyRangeChart";
import { GrowthChart, type GrowthPoint } from "../components/charts/GrowthChart";
import { DailyBars, type DayBarPoint } from "../components/charts/DailyBars";

interface Lectura {
  hora: string;
  temp: number;
  ph: number;
  o2: number;
}

const TEMP: TimePoint[] = [
  { t: "2026-11-06T10:00:00Z", v: 12.1 },
  { t: "2026-11-06T11:00:00Z", v: 12.8 },
  { t: "2026-11-06T12:00:00Z", v: 13.5 },
  { t: "2026-11-06T13:00:00Z", v: 14.2 },
  { t: "2026-11-06T14:00:00Z", v: 15.1 },
  { t: "2026-11-06T15:00:00Z", v: 15.9 },
  { t: "2026-11-06T16:00:00Z", v: 16.4 },
  { t: "2026-11-06T17:00:00Z", v: 16.1 },
  { t: "2026-11-06T18:00:00Z", v: 15.2 },
  { t: "2026-11-06T19:00:00Z", v: 14.0 },
  { t: "2026-11-06T20:00:00Z", v: 13.1 },
  { t: "2026-11-06T21:00:00Z", v: 12.4 },
];

const PH: TimePoint[] = [
  { t: "2026-11-06T10:00:00Z", v: 7.05 },
  { t: "2026-11-06T11:00:00Z", v: 7.1 },
  { t: "2026-11-06T12:00:00Z", v: 7.2 },
  { t: "2026-11-06T13:00:00Z", v: 7.15 },
  { t: "2026-11-06T14:00:00Z", v: 7.3 },
  { t: "2026-11-06T15:00:00Z", v: 7.25 },
  { t: "2026-11-06T16:00:00Z", v: 7.4 },
  { t: "2026-11-06T17:00:00Z", v: 7.35 },
  { t: "2026-11-06T18:00:00Z", v: 7.2 },
  { t: "2026-11-06T19:00:00Z", v: 7.1 },
  { t: "2026-11-06T20:00:00Z", v: 7.0 },
  { t: "2026-11-06T21:00:00Z", v: 6.95 },
];

const O2: TimePoint[] = [
  { t: "2026-11-06T10:00:00Z", v: 8.2 },
  { t: "2026-11-06T11:00:00Z", v: 7.9 },
  { t: "2026-11-06T12:00:00Z", v: 7.4 },
  { t: "2026-11-06T13:00:00Z", v: 6.8 },
  { t: "2026-11-06T14:00:00Z", v: 6.1 },
  { t: "2026-11-06T15:00:00Z", v: 5.5 },
  { t: "2026-11-06T16:00:00Z", v: 5.0 },
  { t: "2026-11-06T17:00:00Z", v: 4.6 },
  { t: "2026-11-06T18:00:00Z", v: 4.4 },
  { t: "2026-11-06T19:00:00Z", v: 4.8 },
  { t: "2026-11-06T20:00:00Z", v: 5.6 },
  { t: "2026-11-06T21:00:00Z", v: 6.5 },
];

const DIARIO: DayRangePoint[] = [
  { dia: "2026-10-31T10:00:00Z", min: 11.2, avg: 13.0, max: 15.1 },
  { dia: "2026-11-01T10:00:00Z", min: 11.5, avg: 13.4, max: 15.6 },
  { dia: "2026-11-02T10:00:00Z", min: 10.8, avg: 12.9, max: 14.9 },
  { dia: "2026-11-03T10:00:00Z", min: 11.0, avg: 13.2, max: 15.3 },
  { dia: "2026-11-04T10:00:00Z", min: 12.0, avg: 14.1, max: 16.2 },
  { dia: "2026-11-05T10:00:00Z", min: 12.3, avg: 14.4, max: 16.6 },
  { dia: "2026-11-06T10:00:00Z", min: 12.1, avg: 14.3, max: 16.4 },
];

const CRECIMIENTO: GrowthPoint[] = [
  { t: "2026-09-01T10:00:00Z", peso: 8 },
  { t: "2026-09-15T10:00:00Z", peso: 14 },
  { t: "2026-10-01T10:00:00Z", peso: 21 },
  { t: "2026-10-15T10:00:00Z", peso: 30 },
  { t: "2026-11-01T10:00:00Z", peso: 38 },
  { t: "2026-11-06T10:00:00Z", peso: 45, proyeccion: 45 },
  { t: "2027-02-01T10:00:00Z", proyeccion: 250 },
];

const MORTALIDAD: DayBarPoint[] = [
  { dia: "2026-10-31T10:00:00Z", valor: 0 },
  { dia: "2026-11-01T10:00:00Z", valor: 1 },
  { dia: "2026-11-02T10:00:00Z", valor: 0 },
  { dia: "2026-11-03T10:00:00Z", valor: 2 },
  { dia: "2026-11-04T10:00:00Z", valor: 0 },
  { dia: "2026-11-05T10:00:00Z", valor: 0 },
  { dia: "2026-11-06T10:00:00Z", valor: 1 },
];

const LECTURAS: Lectura[] = [
  { hora: "2026-11-06T19:00:00Z", temp: 14.0, ph: 7.1, o2: 4.8 },
  { hora: "2026-11-06T20:00:00Z", temp: 13.1, ph: 7.0, o2: 5.6 },
  { hora: "2026-11-06T21:00:00Z", temp: 12.4, ph: 6.95, o2: 6.5 },
];

const columnasLecturas: Column<Lectura>[] = [
  { key: "hora", header: "Hora", render: (r) => <span className="font-mono tabular-nums">{r.hora}</span> },
  { key: "temp", header: "Temp (°C)", numeric: true, render: (r) => <span className="font-mono tabular-nums">{r.temp}</span> },
  { key: "ph", header: "pH", numeric: true, render: (r) => <span className="font-mono tabular-nums">{r.ph}</span> },
  { key: "o2", header: "O2 (mg/L)", numeric: true, render: (r) => <span className="font-mono tabular-nums">{r.o2}</span> },
];

const VACIO = "Aún no llegan lecturas de este estanque. Llegan cuando el celular sincroniza.";

export function Kit() {
  const { notify } = useToast();
  const [confirma, setConfirma] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1>Kit de componentes</h1>
          <p className="text-body text-ink-muted">
            Galería de la interfaz del panel con datos de muestra.
          </p>
        </div>
        <Button>Guardar cambios</Button>
      </header>

      <Card title="Botones">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary">Descargar CSV</Button>
          <Button variant="secondary" loading>
            Guardando
          </Button>
          <Button variant="quiet">Ver detalle</Button>
        </div>
      </Card>

      <Card title="Estados">
        <div className="flex flex-wrap gap-2">
          <StatusBadge status="ok" />
          <StatusBadge status="advertencia" />
          <StatusBadge status="critico" />
        </div>
      </Card>

      <Card title="Rangos de Demo Tanque 1">
        <div className="flex flex-col gap-4">
          <RangeBar
            label="Temperatura"
            value={14.2}
            unit="°C"
            optimo_min={10}
            optimo_max={15}
            critico_min={8}
            critico_max={18}
          />
          <RangeBar
            label="pH"
            value={7.4}
            unit=""
            optimo_min={6.8}
            optimo_max={7.2}
            critico_min={6.5}
            critico_max={8.5}
          />
          <RangeBar
            label="Oxígeno"
            value={4.6}
            unit="mg/L"
            optimo_min={6}
            optimo_max={9}
            critico_min={4}
            critico_max={null}
          />
          <RangeBar
            label="Temperatura pico"
            value={17.9}
            unit="°C"
            optimo_min={10}
            optimo_max={15}
            critico_min={8}
            critico_max={17}
          />
        </div>
      </Card>

      <Card title="Números">
        <div className="flex flex-wrap gap-6">
          <Stat label="Biomasa" value="128,4" unit="kg" />
          <Stat label="Supervivencia" value="96,2" unit="%" />
          <Stat label="Días de cultivo" value="84" />
        </div>
      </Card>

      <Card title="Tabla de lecturas">
        <DataTable
          columns={columnasLecturas}
          data={LECTURAS}
          keyOf={(r) => r.hora}
          emptyText={VACIO}
        />
      </Card>

      <Card title="Tabla vacía">
        <DataTable
          columns={columnasLecturas}
          data={[]}
          keyOf={(r) => r.hora}
          emptyText={VACIO}
        />
      </Card>

      <Card title="Cargando">
        <div className="flex flex-col gap-3">
          <Skeleton rows={3} />
          <SlowServerNotice active />
        </div>
      </Card>

      <Card title="Vacío y error">
        <div className="flex flex-col gap-4">
          <EmptyState
            message={VACIO}
            action={<Button variant="secondary">Sincronizar ahora</Button>}
          />
          <ErrorState
            detalle="El servidor respondió con un error. Intenta de nuevo."
            onRetry={() => notify("Reintentando la carga")}
          />
        </div>
      </Card>

      <Card
        title="Avisos y confirmación"
        action={
          <Button variant="secondary" onClick={() => notify("Hallazgo nuevo en Demo Tanque 2")}>
            Mostrar aviso
          </Button>
        }
      >
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setConfirma(true)}>
            Dar de baja
          </Button>
        </div>
        <ConfirmDialog
          open={confirma}
          title="Dar de baja el dispositivo"
          message="El dispositivo deja de recibir lecturas. Puedes activarlo de nuevo después."
          confirmLabel="Dar de baja"
          onConfirm={() => notify("Dispositivo dado de baja")}
          onClose={() => setConfirma(false)}
        />
      </Card>

      <Card title="Formulario">
        <div className="flex max-w-md flex-col gap-4">
          <Field id="kit-documento" label="Documento" placeholder="12345678" />
          <Field
            id="kit-clave"
            label="Clave"
            type="password"
            defaultValue="corta"
            error="La clave debe tener entre 8 y 72 caracteres."
          />
          <Select
            id="kit-tipo"
            label="Tipo de estanque"
            options={[
              { value: "tanque", label: "Tanque" },
              { value: "jaula", label: "Jaula" },
            ]}
            defaultValue="tanque"
          />
        </div>
      </Card>

      <Card title="Temperatura del agua">
        <TimeSeriesChart
          title="Temperatura"
          data={TEMP}
          unit="°C"
          optimoMin={10}
          optimoMax={15}
          criticoMin={8}
          criticoMax={18}
          emptyText={VACIO}
        />
      </Card>

      <Card title="pH del agua">
        <TimeSeriesChart
          title="pH"
          data={PH}
          unit=""
          optimoMin={6.8}
          optimoMax={7.2}
          criticoMin={6.5}
          criticoMax={8.5}
          emptyText={VACIO}
        />
      </Card>

      <Card title="Oxígeno disuelto">
        <TimeSeriesChart
          title="Oxígeno"
          data={O2}
          unit="mg/L"
          optimoMin={6}
          optimoMax={9}
          criticoMin={4}
          criticoMax={null}
          emptyText={VACIO}
        />
      </Card>

      <Card title="Gráfico vacío">
        <TimeSeriesChart
          title="Temperatura"
          data={[]}
          unit="°C"
          optimoMin={10}
          optimoMax={15}
          criticoMin={8}
          criticoMax={18}
          emptyText={VACIO}
        />
      </Card>

      <Card title="Promedio diario">
        <DailyRangeChart title="Temperatura diaria" data={DIARIO} unit="°C" emptyText={VACIO} />
      </Card>

      <Card title="Curva de crecimiento">
        <GrowthChart
          title="Peso del lote"
          data={CRECIMIENTO}
          fechaObjetivo="2027-02-01T10:00:00Z"
          emptyText={VACIO}
        />
      </Card>

      <Card title="Mortalidad por día">
        <DailyBars title="Mortalidad" data={MORTALIDAD} unit="peces" emptyText={VACIO} />
      </Card>
    </div>
  );
}
