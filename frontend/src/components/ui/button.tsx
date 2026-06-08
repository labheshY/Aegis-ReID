"use client";

import React from 'react';
import { cn } from '../../lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'outline' | 'danger';
  size?: 'sm' | 'md';
}

const variantClasses: Record<string, string> = {
  primary:
    'bg-[color:var(--surface-solid)] text-[color:var(--fg)] border border-[color:var(--border)] shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-glow)] hover:scale-[1.02] transform-gpu transition duration-250',
  ghost: 'bg-transparent hover:bg-[color:var(--glass-hover)] text-[color:var(--fg-muted)] border-transparent',
  outline: 'bg-transparent border border-[color:var(--border)] text-[color:var(--fg)] hover:bg-[color:var(--glass)]',
  danger:
    'bg-[color:var(--alert-muted)] text-[color:var(--alert)] border border-[color:var(--alert)] hover:scale-[1.02] transition duration-200',
};

const sizeClasses: Record<string, string> = {
  sm: 'px-6 py-3 text-sm',
  md: 'px-8 py-4 text-sm',
};

export const Button: React.FC<ButtonProps> = ({
  className,
  variant = 'primary',
  size = 'md',
  children,
  ...props
}) => {
  return (
    <button
      {...props}
      className={cn(
        'inline-flex items-center justify-center gap-3 rounded-xl font-medium disabled:opacity-50 disabled:pointer-events-none will-change-transform',
        'transition-transform transition-colors duration-250 ease-[var(--ease)]',
        variantClasses[variant],
        sizeClasses[size],
        'focus:outline-none focus:ring-2 focus:ring-[color:var(--primary-glow)] focus:ring-offset-2',
        className
      )}
    >
      {children}
    </button>
  );
};

export default Button;
