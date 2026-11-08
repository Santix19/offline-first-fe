// Parameter ranges, feeding rates and temperature factors, in read-only tables.
// Every row keeps its `fuente` visible: these values are reference values the
// productor can change in the database, not from the panel.
import { FlaskConical, SlidersHorizontal, Thermometer, Wind } from "lucide-react";
import { Card } from "../components/ui/Card";
import { DataTable, type Column } from "../components/ui/DataTable";
import { ErrorState } from "../components/ui/ErrorState";
import { Skeleton } from "../components/ui/Skeleton";
import { SlowServerNotice } from "../components/ui/SlowServerNotice";
import { useParameters } from "../api/queries";
import type { FactorResponse, RangeResponse, RateResponse } from "../api/types";
import { formatNumber } from "../lib/format";
import { FadeUp, MaskedText } from "../motion/Motion";

/** No noisy trailing zeros: integers render as integers. */
function num(value: number): string {
  return formatNumber(value, Number.isInteger(value) ? 0 : 1);
}

/** "10 a 15" or, without an upper bound, "6 o menos". Numbers always through format.ts. */
function optimumText(range: RangeResponse): string {
  if (range.optimo_max === null) return `${num(range.optimo_min)} o menos`;
  return `${num(range.optimo_min)} a ${num(range.optimo_max)}`;
}

function criticalText(range: RangeResponse): string {
  if (range.critico_max === null) return `Menor que ${num(range.critico_min)}`;
  return `Menor que ${num(range.critico_min)} o mayor que ${num(range.critico_max)}`;
}

function iconoVariable(variable: string) {
  if (variable === "temp_c") return Thermometer;
  if (variable === "ph") return FlaskConical;
  if (variable === "oxigeno_mg_l") return Wind;
  return SlidersHorizontal;
}

const RANGOS_VACIOS =
  "Aún no hay rangos de parámetros. Llegan con la configuración inicial de la base de datos.";
const TASAS_VACIAS =
  "Aún no hay tasas de alimentación cargadas. Llegan con la tabla de la base de datos.";
const FACTORES_VACIOS =
  "Aún no hay factores de temperatura cargados. Llegan con la tabla de la base de datos.";

export default function Parametros() {
  const parameters = useParameters();

  const columnasRangos: Column<RangeResponse>[] = [
    {
      key: "nombre",
      header: "Variable",
      render: (rango) => {
        const Icono = iconoVariable(rango.variable);
        return (
          <span className="inline-flex items-center gap-1">
            <Icono size={16} strokeWidth={1.5} aria-hidden="true" className="shrink-0 text-ink-emphasis" />
            {rango.nombre}
          </span>
        );
      },
    },
    {
      key: "unidad",
      header: "Unidad",
      render: (rango) =>
        rango.unidad.trim() === "" ? (
          <span className="text-ink-muted">Sin unidad</span>
        ) : (
          <span className="font-mono tabular-nums">{rango.unidad.trim()}</span>
        ),
    },
    {
      key: "optimo",
      header: "Rango óptimo",
      numeric: true,
      render: (rango) => <span className="tabular-nums">{optimumText(rango)}</span>,
    },
    {
      key: "critico",
      header: "Rango crítico",
      numeric: true,
      render: (rango) => <span className="tabular-nums">{criticalText(rango)}</span>,
    },
    {
      key: "fuente",
      header: "Fuente",
      render: (rango) => <span className="text-caption text-ink-muted">{rango.fuente}</span>,
    },
  ];

  const columnasTasas: Column<RateResponse>[] = [
    {
      key: "peso_hasta_g",
      header: "Peso hasta (g)",
      numeric: true,
      render: (tasa) => (tasa.peso_hasta_g === null ? "Sin tope" : <span className="font-mono tabular-nums">{num(tasa.peso_hasta_g)}</span>),
    },
    {
      key: "tasa_pct",
      header: "Tasa (% del peso)",
      numeric: true,
      render: (tasa) => <span className="font-mono tabular-nums">{num(tasa.tasa_pct)}</span>,
    },
    {
      key: "fuente",
      header: "Fuente",
      render: (tasa) => <span className="text-caption text-ink-muted">{tasa.fuente}</span>,
    },
  ];

  const columnasFactores: Column<FactorResponse>[] = [
    {
      key: "temp_hasta_c",
      header: "Temperatura hasta (°C)",
      numeric: true,
      render: (factor) => (factor.temp_hasta_c === null ? "Sin tope" : <span className="font-mono tabular-nums">{num(factor.temp_hasta_c)}</span>),
    },
    {
      key: "factor",
      header: "Factor sobre la tasa",
      numeric: true,
      render: (factor) => (
        <span className="font-mono tabular-nums">{formatNumber(factor.factor, Number.isInteger(factor.factor) ? 0 : 2)}</span>
      ),
    },
    {
      key: "fuente",
      header: "Fuente",
      render: (factor) => <span className="text-caption text-ink-muted">{factor.fuente}</span>,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start gap-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-small)] bg-accent-soft text-ink-emphasis">
          <SlidersHorizontal size={20} strokeWidth={1.5} aria-hidden="true" />
        </span>
        <div>
          <MaskedText as="h1" text="Parámetros" />
          <p className="text-body text-ink-muted">
            Rangos y tablas con los que el panel compara lecturas y calcula la alimentación.
          </p>
        </div>
      </header>

      {parameters.isLoading ? (
        <div className="flex flex-col gap-6">
          <Card title="Rangos">
            <div className="flex flex-col gap-3">
              <Skeleton rows={4} />
              <SlowServerNotice active={parameters.isLoading} />
            </div>
          </Card>
          <Card title="Tasas de alimentación">
            <Skeleton rows={4} />
          </Card>
        </div>
      ) : parameters.isError ? (
        <Card title="Parámetros">
          <ErrorState
            detalle={
              parameters.error instanceof Error
                ? parameters.error.message
                : "No se pudo cargar los parámetros."
            }
            onRetry={() => parameters.refetch()}
          />
        </Card>
      ) : (
        <>
          <p className="text-caption text-ink-muted">
            Estos valores cambian en la base de datos, no aquí.
          </p>

          <FadeUp delay={0}>
          <Card title="Rangos">
            <DataTable
              columns={columnasRangos}
              data={parameters.data?.rangos ?? []}
              keyOf={(rango) => rango.variable}
              emptyText={RANGOS_VACIOS}
            />
          </Card>
          </FadeUp>

          <FadeUp delay={0.06}>
          <Card title="Tasas de alimentación">
            <DataTable
              columns={columnasTasas}
              data={parameters.data?.tasas_alimentacion ?? []}
              keyOf={(tasa) => `tasa-${tasa.orden}`}
              emptyText={TASAS_VACIAS}
            />
          </Card>
          </FadeUp>

          <FadeUp delay={0.12}>
          <Card title="Factores de temperatura">
            <DataTable
              columns={columnasFactores}
              data={parameters.data?.factores_temperatura ?? []}
              keyOf={(factor) => `factor-${factor.orden}`}
              emptyText={FACTORES_VACIOS}
            />
          </Card>
          </FadeUp>
        </>
      )}
    </div>
  );
}
