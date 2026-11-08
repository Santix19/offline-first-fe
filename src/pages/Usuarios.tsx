// User administration, open to the productor only. The temporary password is shown
// exactly once (the server only keeps its hash) and copied to the clipboard on request.
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { CircleCheck, Users, X } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { DataTable, type Column } from "../components/ui/DataTable";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { Skeleton } from "../components/ui/Skeleton";
import { SlowServerNotice } from "../components/ui/SlowServerNotice";
import { useSession } from "../api/session";
import { useResetTemporaryPassword, useUpdateUser, useUsers } from "../api/queries";
import { FadeUp, MaskedText } from "../motion/Motion";
import { duration, ease } from "../motion/presets";
import type { UserRole } from "../api/types";

/** The server's Spanish `detalle` when it is an ApiError; a local fallback when not. */
function errorDetalle(err: unknown, texto: string): string {
  const detalle = (err as { detalle?: unknown } | null | undefined)?.detalle;
  return typeof detalle === "string" && detalle !== "" ? detalle : texto;
}

const USUARIOS_VACIOS =
  "Aún no hay usuarios registrados. Se crean desde la app del celular.";

interface UsuarioRow {
  id: string;
  nombre: string;
  documento: string;
  rol: UserRole;
  activo: boolean;
}

interface CambioActivo {
  usuario: UsuarioRow;
  activar: boolean;
}

interface ClaveTemporalVista {
  usuario: UsuarioRow;
  clave: string;
}

export default function Usuarios() {
  const session = useSession();
  const users = useUsers();
  const updateUser = useUpdateUser();
  const resetClave = useResetTemporaryPassword();

  const [detalle, setDetalle] = useState<string | null>(null);
  const [pendiente, setPendiente] = useState<string | null>(null);
  const reduce = useReducedMotion();
  const [cambioActivo, setCambioActivo] = useState<CambioActivo | null>(null);
  const [claveVista, setClaveVista] = useState<ClaveTemporalVista | null>(null);

  const filas: UsuarioRow[] = (users.data ?? []).map((usuario) => ({
    id: usuario.id,
    nombre: usuario.nombre,
    documento: usuario.documento,
    rol: usuario.rol,
    activo: usuario.activo,
  }));

  function cambiarRol(usuario: UsuarioRow, rol: UserRole) {
    setDetalle(null);
    setPendiente(usuario.id);
    updateUser.mutate(
      { id: usuario.id, body: { rol } },
      {
        onSuccess: () => setPendiente(null),
        onError: (err) => {
          setPendiente(null);
          setDetalle(errorDetalle(err, "No se pudo cambiar el rol."));
        },
      },
    );
  }

  function confirmarActivo(activar: boolean) {
    if (!cambioActivo) return;
    setDetalle(null);
    setPendiente(cambioActivo.usuario.id);
    updateUser.mutate(
      { id: cambioActivo.usuario.id, body: { activo: activar } },
      {
        onSuccess: () => {
          setPendiente(null);
          setCambioActivo(null);
        },
        onError: (err) => {
          setPendiente(null);
          setCambioActivo(null);
          setDetalle(errorDetalle(err, "No se pudo actualizar el usuario."));
        },
      },
    );
  }

  function pedirClaveTemporal(usuario: UsuarioRow) {
    setDetalle(null);
    setPendiente(usuario.id);
    resetClave.mutate(usuario.id, {
      onSuccess: (respuesta) => {
        setPendiente(null);
        setClaveVista({ usuario, clave: respuesta.clave_temporal });
      },
      onError: (err) => {
        setPendiente(null);
        setDetalle(errorDetalle(err, "No se pudo generar la clave temporal."));
      },
    });
  }

  const columnas: Column<UsuarioRow>[] = [
    {
      key: "nombre",
      header: "Nombre",
      render: (usuario) => (
        <span className="inline-flex items-center gap-1">
          <Users size={16} strokeWidth={1.5} aria-hidden="true" className="shrink-0 text-ink-emphasis" />
          {usuario.nombre}
        </span>
      ),
    },
    {
      key: "documento",
      header: "Documento",
      render: (usuario) => <span className="num font-mono tabular-nums">{usuario.documento}</span>,
    },
    {
      key: "rol",
      header: "Rol",
      render: (usuario) => (
        <select
          value={usuario.rol}
          disabled={usuario.id === session.usuario?.id}
          title={usuario.id === session.usuario?.id ? "El productor no cambia su propio rol" : undefined}
          onChange={(e) => cambiarRol(usuario, e.target.value as UserRole)}
          aria-label={`Rol de ${usuario.nombre}`}
          className="min-h-[var(--button-height)] rounded-[var(--radius-small)] border border-hairline bg-surface px-3 text-body text-ink"
        >
          <option value="productor">Productor</option>
          <option value="cuidador">Cuidador</option>
        </select>
      ),
    },
    {
      key: "activo",
      header: "Estado",
      render: (usuario) =>
        usuario.activo ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-ok px-2 py-0.5 text-caption text-ok-fg">
            <CircleCheck size={14} strokeWidth={1.5} aria-hidden="true" />
            <span>Activo</span>
          </span>
        ) : (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-caption text-ink-muted">
            <X size={14} strokeWidth={1.5} aria-hidden="true" />
            <span>Desactivado</span>
          </span>
        ),
    },
    {
      key: "acciones",
      header: "Acciones",
      render: (usuario) => (
        <div className="flex flex-wrap gap-2">
          {usuario.activo ? (
            <Button
              variant="secondary"
              loading={pendiente === usuario.id && updateUser.isPending}
              onClick={() => setCambioActivo({ usuario, activar: false })}
            >
              Desactivar
            </Button>
          ) : (
            <Button
              variant="secondary"
              loading={pendiente === usuario.id && updateUser.isPending}
              onClick={() => setCambioActivo({ usuario, activar: true })}
            >
              Activar
            </Button>
          )}
          <Button
            variant="secondary"
            loading={pendiente === usuario.id && resetClave.isPending}
            onClick={() => pedirClaveTemporal(usuario)}
          >
            Clave temporal
          </Button>
        </div>
      ),
    },
  ];

  if (!session.isProductor) {
    return (
      <div className="flex flex-col gap-6">
        <MaskedText as="h1" text="Usuarios" />
        <Card>
          <EmptyState message="Solo el productor administra usuarios." />
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start gap-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-small)] bg-accent-soft text-ink-emphasis">
          <Users size={20} strokeWidth={1.5} aria-hidden="true" />
        </span>
        <div>
          <MaskedText as="h1" text="Usuarios" />
          <p className="text-body text-ink-muted">
            Personas que entran al panel y a la app del celular.
          </p>
        </div>
      </header>

      <FadeUp delay={0}>
      <Card title="Usuarios">
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
        {users.isLoading ? (
          <div className="flex flex-col gap-3">
            <Skeleton rows={3} />
            <SlowServerNotice active={users.isLoading} />
          </div>
        ) : users.isError ? (
          <ErrorState
            detalle={errorDetalle(users.error, "No se pudo cargar los usuarios.")}
            onRetry={() => users.refetch()}
          />
        ) : (
          <DataTable
            columns={columnas}
            data={filas}
            keyOf={(usuario) => usuario.id}
            emptyText={USUARIOS_VACIOS}
          />
        )}
      </Card>
      </FadeUp>

      <ConfirmDialog
        open={cambioActivo !== null}
        title={
          cambioActivo
            ? cambioActivo.activar
              ? `Activar ${cambioActivo.usuario.nombre}`
              : `Desactivar ${cambioActivo.usuario.nombre}`
            : ""
        }
        message={
          cambioActivo
            ? cambioActivo.activar
              ? "El usuario vuelve a poder entrar con su clave."
              : "El usuario deja de poder entrar con su clave. Puedes activarlo de nuevo después."
            : ""
        }
        confirmLabel={cambioActivo ? (cambioActivo.activar ? "Activar" : "Desactivar") : ""}
        onConfirm={() => confirmarActivo(cambioActivo !== null && cambioActivo.activar)}
        onClose={() => setCambioActivo(null)}
      />

      <PasswordDialog clave={claveVista} onClose={() => setClaveVista(null)} />
    </div>
  );
}

/** Shows the temporary password once, with Copiar. The server only keeps its hash. */
function PasswordDialog({ clave, onClose }: { clave: ClaveTemporalVista | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [copiado, setCopiado] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (clave && !el.open) el.showModal();
    if (!clave && el.open) el.close();
  }, [clave]);

  function copiar() {
    if (!clave) return;
    const avisar = () => {
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 4000);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(clave.clave)
        .then(avisar)
        .catch(() => copiarPorSeleccion(avisar));
    } else {
      copiarPorSeleccion(avisar);
    }
  }

  function copiarPorSeleccion(avisar: () => void) {
    try {
      const input = document.getElementById("clave-temporal-valor") as HTMLInputElement | null;
      if (input) {
        input.select();
        document.execCommand("copy");
        avisar();
      }
    } catch {
      // Clipboard unavailable: the user can still select and copy by hand.
    }
  }

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={onClose}
      aria-label={clave ? `Clave temporal para ${clave.usuario.nombre}` : "Clave temporal"}
      className="rounded-[var(--radius-small)] border border-hairline bg-surface p-5 text-ink backdrop:bg-ink/40"
    >
      {clave ? (
        <motion.div
          initial={{ opacity: 0, scale: reduce ? 1 : 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={
            reduce
              ? { duration: duration.micro }
              : { duration: duration.panel, ease: ease.fluid }
          }
        >
          <h2 className="mb-2">Clave temporal para {clave.usuario.nombre}</h2>
          <p className="mb-4 text-body text-ink-muted">
            Documento <span className="font-mono tabular-nums">{clave.usuario.documento}</span>. Cópiala ahora: no se muestra de nuevo.
          </p>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <input
              id="clave-temporal-valor"
              readOnly
              value={clave.clave}
              aria-label="Clave temporal"
              className="min-h-[var(--button-height)] w-56 rounded-[var(--radius-small)] border border-hairline bg-surface px-3 font-mono text-body tabular-nums text-ink"
            />
            <Button onClick={copiar}>Copiar</Button>
          </div>
          {copiado ? (
            <motion.p
              role="status"
              className="mb-3 text-caption text-ink"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={
                reduce
                  ? { duration: duration.micro }
                  : { duration: duration.state, ease: ease.out }
              }
            >
              Copiada al portapapeles.
            </motion.p>
          ) : null}
          <p className="mb-5 text-caption text-ink-muted">
            Esta clave es temporal: el usuario debe cambiarla en su primer inicio de sesión.
          </p>
          <div className="flex justify-end">
            <Button variant="quiet" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </motion.div>
      ) : null}
    </dialog>
  );
}
