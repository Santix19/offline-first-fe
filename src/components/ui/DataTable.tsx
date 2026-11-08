import { useState, type ReactNode } from "react";
import { StaggerItem } from "../../motion/Motion";

export interface Column<T> {
  key: string;
  header: string;
  numeric?: boolean;
  render: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyOf: (row: T, index: number) => string;
  emptyText: string;
  /** Rows shown before "Ver todo (N)". Default 8: a history table lists, it does not dump. */
  maxRows?: number;
}

/** Rows stagger in on first render (capped at 8); hover tint is a CSS state change. */
export function DataTable<T>({ columns, data, keyOf, emptyText, maxRows = 8 }: DataTableProps<T>) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? data : data.slice(0, maxRows);
  const hidden = data.length - visible.length;
  return (
    <div className="flex flex-col gap-2">
    <div className="overflow-x-auto rounded-[var(--radius-cards)] border border-hairline bg-surface">
      <table className="w-full border-collapse text-body">
        <thead className="sticky top-0 bg-surface-2">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={`border-b border-hairline px-4 py-2 text-caption font-medium text-ink-muted ${
                  col.numeric ? "text-right" : "text-left"
                }`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-6 text-center text-caption text-ink-muted"
              >
                {emptyText}
              </td>
            </tr>
          ) : (
            visible.map((row, i) => (
              <StaggerItem
                key={keyOf(row, i)}
                as="tr"
                index={i}
                className="border-b border-hairline transition-colors duration-[var(--dur-state)] ease-out last:border-b-0 hover:bg-surface-2"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-2 text-ink ${col.numeric ? "num font-mono text-right" : "text-left"}`}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </StaggerItem>
            ))
          )}
        </tbody>
      </table>
    </div>
      {hidden > 0 || expanded ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="link-draw self-start text-caption font-medium text-ink-emphasis"
        >
          {expanded ? "Ver menos" : `Ver todo (${data.length})`}
        </button>
      ) : null}
    </div>
  );
}
