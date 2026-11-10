import type { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from 'react';

export function PageHeader({ title, description, actions, className = '' }: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 ${className}`}>
      <div className="min-w-0">
        <h1 className="text-[26px] font-normal leading-9 tracking-[-0.01em]">{title}</h1>
        {description && <p className="mt-1 text-sm text-on-surface-variant">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 pb-1">{actions}</div>}
    </div>
  );
}

/** Google-style data table primitives. Wrap in a Card for the container. */
export function Table({ children, className = '', ...rest }: { children: ReactNode } & HTMLAttributes<HTMLTableElement>) {
  return (
    <table className={`w-full border-collapse text-sm ${className}`} {...rest}>
      {children}
    </table>
  );
}

export function Th({ children, className = '', ...rest }: { children?: ReactNode } & ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      scope="col"
      className={`whitespace-nowrap border-b border-outline-variant px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-on-surface-variant ${className}`}
      {...rest}
    >
      {children}
    </th>
  );
}

export function Tr({ children, className = '', ...rest }: { children: ReactNode } & HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={`border-b border-outline-variant/60 transition-colors last:border-0 hover:bg-surface-container-high/60 ${className}`} {...rest}>
      {children}
    </tr>
  );
}

export function Td({ children, className = '', ...rest }: { children?: ReactNode } & TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={`px-4 py-3 align-middle text-on-surface ${className}`} {...rest}>
      {children}
    </td>
  );
}
