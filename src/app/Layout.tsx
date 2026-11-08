import { useState } from "react";
import { NavLink, useLocation, useOutlet } from "react-router";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { LogOut, Waves, X, type LucideIcon } from "lucide-react";
import { Topbar } from "./Topbar";
import { LiquidField } from "../three/LiquidField";
import { duration, ease, reducedFade, viewTransition } from "../motion/presets";
import type { UserRole } from "../api/types";

export interface NavItem {
  label: string;
  to: string;
  count?: number;
  icon: LucideIcon;
}

interface LayoutProps {
  nav: NavItem[];
  userName: string;
  rol?: UserRole;
  enVivo: boolean;
  onSalir: () => void;
}

const ROLES: Record<UserRole, string> = {
  productor: "Productor",
  cuidador: "Cuidador",
};

function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "LC";
  return partes
    .slice(0, 2)
    .map((parte) => parte.charAt(0))
    .join("")
    .toUpperCase();
}

function NavCount({ count }: { count: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.span
      key={count}
      initial={{ scale: reduce ? 1 : 1.15 }}
      animate={{ scale: 1 }}
      transition={{ duration: reduce ? duration.micro : duration.state, ease: ease.out }}
      className="num relative grid min-w-6 shrink-0 place-items-center rounded-full bg-critico px-1.5 font-mono text-caption font-medium leading-6 text-critico-fg"
    >
      {count > 99 ? "99+" : count}
    </motion.span>
  );
}

function NavList({
  nav,
  onNavegar,
  grupo,
}: {
  nav: NavItem[];
  onNavegar?: () => void;
  grupo: string;
}) {
  const reduce = useReducedMotion();

  return (
    <LayoutGroup id={grupo}>
      <ul className="flex flex-col gap-1">
        {nav.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === "/"}
                onClick={onNavegar}
                className="relative flex items-center gap-3 rounded-[var(--radius-pill)] px-3 py-2.5 text-ui font-normal transition-colors duration-[var(--dur-state)] hover:bg-nav-raised"
              >
                {({ isActive }) => (
                  <>
                    {isActive ? (
                      <motion.span
                        layoutId={`nav-activo-${grupo}`}
                        aria-hidden="true"
                        className="absolute inset-0 rounded-[var(--radius-pill)] border border-hairline bg-nav-raised"
                        transition={{
                          duration: reduce ? 0 : duration.state,
                          ease: ease.fluid,
                        }}
                      />
                    ) : null}
                    <Icon
                      size={20}
                      strokeWidth={1.5}
                      aria-hidden="true"
                      className={`relative shrink-0 ${
                        isActive ? "text-on-nav" : "text-on-nav-muted"
                      }`}
                    />
                    <span
                      className={`relative min-w-0 flex-1 truncate ${
                        isActive ? "font-medium text-on-nav" : "text-on-nav-muted"
                      }`}
                    >
                      {item.label}
                    </span>
                    {item.count !== undefined && item.count > 0 ? (
                      <NavCount count={item.count} />
                    ) : null}
                  </>
                )}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </LayoutGroup>
  );
}

function Marca({ onNavegar }: { onNavegar?: () => void }) {
  return (
    <NavLink to="/" onClick={onNavegar} className="flex items-center gap-3 px-1">
      <span className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-small)] bg-nav-raised text-on-nav">
        <Waves size={20} strokeWidth={1.5} aria-hidden="true" />
      </span>
      <span className="font-display text-lead font-medium tracking-[-0.02em] text-on-nav">La Cocha</span>
    </NavLink>
  );
}

function Usuario({
  userName,
  rol,
  onSalir,
}: {
  userName: string;
  rol?: UserRole;
  onSalir: () => void;
}) {
  return (
    <div className="flex items-center gap-3 border-t border-on-nav/10 pt-4">
      <span className="grid size-9 shrink-0 place-items-center rounded-[var(--radius-small)] bg-nav-raised text-caption font-medium text-on-nav">
        {iniciales(userName)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-caption font-medium text-on-nav">{userName}</p>
        <p className="truncate text-caption text-on-nav-muted">{rol ? ROLES[rol] : "Panel"}</p>
      </div>
      <button
        type="button"
        onClick={onSalir}
        aria-label="Salir"
        title="Salir"
        className="grid size-9 shrink-0 place-items-center rounded-[var(--radius-small)] text-on-nav-muted transition-colors duration-[var(--dur-micro)] hover:bg-nav-raised hover:text-on-nav"
      >
        <LogOut size={16} strokeWidth={1.5} aria-hidden="true" />
      </button>
    </div>
  );
}

export function Layout({ nav, userName, rol, enVivo, onSalir }: LayoutProps) {
  const [abierto, setAbierto] = useState(false);
  const pendientes = nav.find((n) => n.to === "/alertas")?.count ?? 0;
  const location = useLocation();
  const outlet = useOutlet();
  const reduce = useReducedMotion();
  const transition = reduce ? reducedFade : viewTransition;

  return (
    <div className="min-h-screen bg-field text-ink">
      <LiquidField intensity={0.35} />
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[1] bg-nav/55" />
      <aside className="fixed left-0 top-0 z-40 hidden h-dvh max-h-dvh w-[var(--sidebar-width)] flex-col justify-between overflow-y-auto bg-nav p-4 lg:flex">
        <div className="flex flex-col gap-6">
          <Marca />
          <nav aria-label="Principal">
            <NavList nav={nav} grupo="nav-escritorio" />
          </nav>
        </div>
        <Usuario userName={userName} rol={rol} onSalir={onSalir} />
      </aside>

      <AnimatePresence>
        {abierto ? (
          <motion.div
            key="fondo-menu"
            aria-hidden="true"
            onClick={() => setAbierto(false)}
            className="fixed inset-0 z-50 bg-nav/60 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: reduce ? duration.micro : duration.panel * 0.6,
              ease: reduce ? undefined : ease.out,
            }}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {abierto ? (
          <motion.div
            key="menu-movil"
            role="dialog"
            aria-label="Menú"
            className="fixed inset-y-0 left-0 z-50 flex w-3/4 max-w-72 flex-col justify-between bg-nav p-4 lg:hidden"
            initial={reduce ? { opacity: 0 } : { x: "-100%" }}
            animate={reduce ? { opacity: 1 } : { x: 0 }}
            exit={reduce ? { opacity: 0 } : { x: "-100%" }}
            transition={{
              duration: reduce ? duration.micro : duration.panel,
              ease: ease.fluid,
            }}
          >
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between gap-2">
                <Marca onNavegar={() => setAbierto(false)} />
                <button
                  type="button"
                  onClick={() => setAbierto(false)}
                  aria-label="Cerrar menú"
                  title="Cerrar menú"
                  className="grid size-9 shrink-0 place-items-center rounded-[var(--radius-small)] text-on-nav-muted transition-colors duration-[var(--dur-micro)] hover:bg-nav-raised hover:text-on-nav"
                >
                  <X size={16} strokeWidth={1.5} aria-hidden="true" />
                </button>
              </div>
              <nav aria-label="Principal">
                <NavList nav={nav} onNavegar={() => setAbierto(false)} grupo="nav-movil" />
              </nav>
            </div>
            <Usuario userName={userName} rol={rol} onSalir={onSalir} />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="relative z-10 overflow-x-clip lg:pl-[var(--sidebar-width)]">
        <Topbar
          enVivo={enVivo}
          pendientes={pendientes}
          onAbrirMenu={() => setAbierto(true)}
        />
        <main className="mx-auto w-full max-w-[var(--content-max)] px-[var(--gutter)] py-6">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={location.pathname} {...transition}>
              {outlet}
            </motion.div>
          </AnimatePresence>
          <footer className="mt-8 border-t border-hairline pt-4 text-caption text-ink-muted">
            Fotos:{' '}
            <a
              href="https://commons.wikimedia.org/wiki/File:Reserva_Forestal_Laguna_La_Cocha_Cerro_Patascoy.jpg"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-4"
            >
              Julianruizp (CC BY-SA 4.0)
            </a>
            {', '}
            <a
              href="https://commons.wikimedia.org/wiki/File:Laguna_de_la_Cocha_o_Lago_Guamuez.jpg"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-4"
            >
              MARIO GUDIÑO (CC BY-SA 4.0)
            </a>
            {', '}
            <a
              href="https://commons.wikimedia.org/wiki/File:Rainbow_Trout_(Oncorhynchus_mykiss).jpg"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-4"
            >
              Liquid Art (CC BY-SA 4.0)
            </a>
            , Wikimedia Commons
          </footer>
        </main>
      </div>
    </div>
  );
}
