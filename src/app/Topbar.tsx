import { Link, useLocation } from "react-router";
import { Bell, Menu } from "lucide-react";

const ETIQUETAS: Record<string, string> = {
  "/": "Inicio",
  "/alertas": "Alertas",
  "/dispositivos": "Dispositivos",
  "/parametros": "Parámetros",
  "/usuarios": "Usuarios",
  "/kit": "Kit",
};

function etiquetaDeRuta(pathname: string): string {
  if (pathname.startsWith("/estanques/")) return "Estanque";
  if (pathname.startsWith("/lotes/")) return "Lote";
  return ETIQUETAS[pathname] ?? "Panel";
}

interface TopbarProps {
  enVivo: boolean;
  pendientes: number;
  onAbrirMenu: () => void;
}

export function Topbar({ enVivo, pendientes, onAbrirMenu }: TopbarProps) {
  const { pathname } = useLocation();
  const pagina = etiquetaDeRuta(pathname);
  // avoid-ai-design-ignore: K3 the one glass surface: sticky topbar over scrolling content (DESIGN.md §0, glass rule)
  return (
    <header className="sticky top-0 z-30 flex h-20 items-center gap-2 border-b border-hairline bg-field px-[var(--gutter)]">
      <button
        type="button"
        onClick={onAbrirMenu}
        aria-label="Abrir menú"
        title="Abrir menú"
        className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-small)] text-ink-muted transition-colors duration-[var(--dur-micro)] hover:bg-surface-2 hover:text-ink lg:hidden"
      >
        <Menu size={20} strokeWidth={1.5} aria-hidden="true" />
      </button>

      <nav aria-label="Ruta" className="min-w-0 flex-1">
        <ol className="flex items-center gap-2 text-caption">
          <li className="hidden text-ink-faint sm:block">La Cocha</li>
          <li aria-hidden="true" className="hidden text-ink-faint sm:block">
            /
          </li>
          <li className="truncate font-medium text-ink">{pagina}</li>
        </ol>
      </nav>

      <span className="flex shrink-0 items-center gap-2" title={enVivo ? "En vivo" : "Sin conexión"}>
        <span className="relative flex size-2">
          {enVivo ? (
            <span
              aria-hidden="true"
              className="absolute inline-flex size-full animate-ping rounded-full bg-cta opacity-60 motion-reduce:hidden"
            />
          ) : null}
          <span
            aria-hidden="true"
            className={`relative inline-flex size-2 rounded-full ${enVivo ? "bg-cta" : "bg-ink-faint"}`}
          />
        </span>
        <span className="text-caption text-ink-muted">{enVivo ? "En vivo" : "Sin conexión"}</span>
      </span>

      <Link
        to="/alertas"
        aria-label={pendientes > 0 ? `Alertas, ${pendientes} pendientes` : "Alertas"}
        title={pendientes > 0 ? `Alertas, ${pendientes} pendientes` : "Alertas"}
        className="relative grid size-10 shrink-0 place-items-center rounded-[var(--radius-small)] text-ink-muted transition-colors duration-[var(--dur-micro)] hover:bg-surface-2 hover:text-ink"
      >
        <Bell size={20} strokeWidth={1.5} aria-hidden="true" />
        {pendientes > 0 ? (
          <span className="absolute right-0.5 top-0.5 grid min-w-5 place-items-center rounded-full bg-critico px-1 font-mono text-caption font-medium leading-5 text-critico-fg">
            {pendientes > 99 ? "99+" : pendientes}
          </span>
        ) : null}
      </Link>
    </header>
  );
}
