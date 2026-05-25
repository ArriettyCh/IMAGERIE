import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface PasswordInputProps {
  id: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  label?: string;
}

export default function PasswordInput({
  id,
  value,
  onChange,
  placeholder = 'Enter password',
  required = false,
  minLength,
  label
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="space-y-3">
      {label && <label htmlFor={id} className="text-[10px] tracking-[0.2em] uppercase font-light text-secondary">{label}</label>}
      <div className="relative group">
        <input
          type={showPassword ? 'text' : 'password'}
          id={id}
          value={value}
          onChange={onChange}
          required={required}
          placeholder={placeholder}
          minLength={minLength}
          className="w-full px-5 py-4 bg-card border-none rounded-2xl text-sm font-light focus:ring-1 focus:ring-foreground/10 transition-all outline-none"
        />
        <button
          type="button"
          className="absolute right-4 top-1/2 -translate-y-1/2 text-secondary hover:text-foreground transition-colors p-2"
          onClick={() => setShowPassword(!showPassword)}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
