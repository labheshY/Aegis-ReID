"use client";

import React from 'react';
import { cn } from '../../lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
}

export const Card: React.FC<CardProps> = ({
  title,
  description,
  children,
  className,
  ...props
}) => {
  return (
    <div
      {...props}
      className={cn(
        'rounded-xl p-6 bg-[color:var(--surface)] backdrop-blur-md border border-[color:var(--border)] shadow-[var(--shadow-md)]',
        className
      )}
    >
      {title && (
        <div className="mb-4">
          <div className="font-display text-lg tracking-[var(--tracking-tight)] text-[color:var(--fg)]">{title}</div>
          {description && (
            <p className="mt-1 text-sm text-[color:var(--fg-muted)] tracking-[var(--tracking-wide)]">{description}</p>
          )}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
};

export default Card;
