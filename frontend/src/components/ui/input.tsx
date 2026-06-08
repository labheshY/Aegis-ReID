"use client";

import React from 'react';
import { cn } from '../../lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input: React.FC<InputProps> = ({ label, className, ...props }) => {
  return (
    <label className={cn('block w-full')}>{label && <div className="text-xs text-[color:var(--fg-muted)] mb-2 tracking-[var(--tracking-wide)]">{label}</div>}
      <input
        {...props}
        className={cn(
          'w-full px-6 py-3 rounded-lg bg-[color:var(--glass)] border border-[color:var(--border)] text-sm text-[color:var(--fg)] placeholder:text-[color:var(--fg-muted)] outline-none',
          'transition duration-200 ease-[var(--ease)] transform-gpu',
          'focus:ring-4 focus:ring-[color:var(--primary-glow)] focus:border-[color:var(--primary-glow)]',
          className
        )}
      />
    </label>
  );
};

export default Input;
