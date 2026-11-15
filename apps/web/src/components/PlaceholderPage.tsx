import type { ReactNode } from 'react';

export function PlaceholderPage({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <section aria-labelledby="page-title" className="flex flex-col gap-3 py-4">
      <h1 id="page-title" className="text-2xl font-bold">
        {title}
      </h1>
      <p className="text-muted">{description}</p>
      {children}
    </section>
  );
}
