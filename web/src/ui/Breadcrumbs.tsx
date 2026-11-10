import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';

export interface Crumb { label: string; icon?: ReactNode; onClick?: () => void; href?: string }

export function Breadcrumbs({ items, renderLink }: { items: Crumb[]; renderLink?: (c: Crumb, cls: string, content: ReactNode) => ReactNode }) {
  const cls = 'state-layer inline-flex max-w-[16rem] items-center gap-1.5 truncate rounded-full px-3 py-1.5 text-sm';
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-0.5">
        {items.map((c, i) => {
          const last = i === items.length - 1;
          const content = <>{c.icon}<span className="truncate">{c.label}</span></>;
          return (
            <li key={i} className="flex items-center gap-0.5">
              {i > 0 && <ChevronRight className="h-4 w-4 shrink-0 text-on-surface-variant" aria-hidden />}
              {last ? (
                <span aria-current="page" className={`${cls} font-medium text-on-surface`}>{content}</span>
              ) : renderLink ? renderLink(c, `${cls} text-on-surface-variant`, content) : (
                <button type="button" onClick={c.onClick} className={`${cls} text-on-surface-variant`}>{content}</button>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
