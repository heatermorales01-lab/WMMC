'use client';
/**
 * MoneyInput — input de dinero con formato visual automático.
 * Muestra "20 000" mientras el usuario escribe, pero el valor interno
 * que se pasa a onChange es siempre un número limpio.
 */
import { useState, useRef } from 'react';

interface MoneyInputProps {
  value: string | number;
  onChange: (raw: string) => void;   // string del número sin formato, ej: "20000"
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

function formatDisplay(raw: string): string {
  // Elimina todo lo que no sea dígito
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  // Formato con espacio como separador de miles (convención costarricense)
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0'); // \u00a0 = non-breaking space
}

export function MoneyInput({ value, onChange, placeholder = '0', className = '', disabled }: MoneyInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);

  const rawValue = String(value).replace(/\D/g, '');
  const displayValue = focused
    ? formatDisplay(rawValue)   // mientras escribe, muestra formateado
    : rawValue ? formatDisplay(rawValue) : '';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '');
    onChange(digits);
  };

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm select-none pointer-events-none">
        ₡
      </span>
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        className={`input pl-7 ${className}`}
        value={displayValue}
        onChange={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        disabled={disabled}
      />
    </div>
  );
}
