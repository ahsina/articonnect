'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, Check } from 'lucide-react';

/**
 * Liste des pays (indicatifs). Ordre imposé : LU, FR, BE, DE, NL, CH, ES, IT, PT, GB
 * puis le reste par ordre alphabétique. Chaque option affiche « drapeau Nom +indicatif ».
 */
export interface CountryOption {
  code: string; // ISO alpha-2 (pour la clé/le drapeau)
  name: string;
  dial: string; // indicatif, ex "+352"
  flag: string; // emoji drapeau
}

const PRIORITY: CountryOption[] = [
  { code: 'LU', name: 'Luxembourg', dial: '+352', flag: '🇱🇺' },
  { code: 'FR', name: 'France', dial: '+33', flag: '🇫🇷' },
  { code: 'BE', name: 'Belgique', dial: '+32', flag: '🇧🇪' },
  { code: 'DE', name: 'Allemagne', dial: '+49', flag: '🇩🇪' },
  { code: 'NL', name: 'Pays-Bas', dial: '+31', flag: '🇳🇱' },
  { code: 'CH', name: 'Suisse', dial: '+41', flag: '🇨🇭' },
  { code: 'ES', name: 'Espagne', dial: '+34', flag: '🇪🇸' },
  { code: 'IT', name: 'Italie', dial: '+39', flag: '🇮🇹' },
  { code: 'PT', name: 'Portugal', dial: '+351', flag: '🇵🇹' },
  { code: 'GB', name: 'Royaume-Uni', dial: '+44', flag: '🇬🇧' },
];

const OTHERS: CountryOption[] = [
  { code: 'AT', name: 'Autriche', dial: '+43', flag: '🇦🇹' },
  { code: 'CA', name: 'Canada', dial: '+1', flag: '🇨🇦' },
  { code: 'DK', name: 'Danemark', dial: '+45', flag: '🇩🇰' },
  { code: 'FI', name: 'Finlande', dial: '+358', flag: '🇫🇮' },
  { code: 'GR', name: 'Grèce', dial: '+30', flag: '🇬🇷' },
  { code: 'IE', name: 'Irlande', dial: '+353', flag: '🇮🇪' },
  { code: 'MA', name: 'Maroc', dial: '+212', flag: '🇲🇦' },
  { code: 'NO', name: 'Norvège', dial: '+47', flag: '🇳🇴' },
  { code: 'PL', name: 'Pologne', dial: '+48', flag: '🇵🇱' },
  { code: 'SE', name: 'Suède', dial: '+46', flag: '🇸🇪' },
  { code: 'US', name: 'États-Unis', dial: '+1', flag: '🇺🇸' },
];

export const COUNTRIES: CountryOption[] = [...PRIORITY, ...OTHERS];

// Indicatifs triés du plus long au plus court : on matche le préfixe le plus long en premier.
const DIALS_BY_LENGTH = [...COUNTRIES]
  .map((c) => c.dial)
  .sort((a, b) => b.length - a.length);

const DEFAULT_COUNTRY =
  COUNTRIES.find((c) => c.code === 'LU') ?? COUNTRIES[0];

/** Ne conserve que les chiffres. */
function onlyDigits(s: string): string {
  return (s || '').replace(/\D/g, '');
}

/**
 * Découpe une chaîne E.164 (ou approchante) en { country, national }.
 * Trouve le pays dont l'indicatif est le préfixe le plus long.
 */
function parseE164(value: string): { country: CountryOption; national: string } {
  if (!value) return { country: DEFAULT_COUNTRY, national: '' };
  const normalized = value.startsWith('+') ? value : `+${onlyDigits(value)}`;
  for (const dial of DIALS_BY_LENGTH) {
    if (normalized.startsWith(dial)) {
      const country =
        COUNTRIES.find((c) => c.dial === dial) ?? DEFAULT_COUNTRY;
      return { country, national: onlyDigits(normalized.slice(dial.length)) };
    }
  }
  return { country: DEFAULT_COUNTRY, national: onlyDigits(normalized) };
}

/** Regroupement léger : 3 chiffres puis groupes de 2 (ex "123 45 67 89"). */
function formatNational(digits: string): string {
  const d = onlyDigits(digits);
  if (!d) return '';
  const head = d.slice(0, 3);
  const rest = d.slice(3);
  const groups = rest.match(/.{1,2}/g) || [];
  return [head, ...groups].join(' ');
}

/** Le numéro national est plausible si sa longueur est comprise entre 6 et 14 chiffres. */
export function isPlausiblePhone(e164: string): boolean {
  const { national } = parseE164(e164);
  return national.length >= 6 && national.length <= 14;
}

export interface PhoneInputProps {
  value: string;
  onChange: (e164: string, isValid: boolean) => void;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  error?: boolean;
}

export function PhoneInput({
  value,
  onChange,
  id,
  placeholder = '123 45 67 89',
  disabled,
  required,
  className,
  error,
}: PhoneInputProps) {
  const parsed = parseE164(value);
  const [country, setCountry] = React.useState<CountryOption>(parsed.country);
  const [national, setNational] = React.useState<string>(parsed.national);
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);

  // Resynchronise l'état interne si la valeur externe change (reset de formulaire, etc.)
  React.useEffect(() => {
    const p = parseE164(value);
    const currentE164 = `${country.dial}${national}`;
    if (value !== currentE164) {
      setCountry(p.country);
      setNational(p.national);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Ferme le menu au clic extérieur.
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const emit = (c: CountryOption, digits: string) => {
    const e164 = `${c.dial}${digits}`;
    onChange(e164, digits.length >= 6 && digits.length <= 14);
  };

  const handleCountry = (c: CountryOption) => {
    setCountry(c);
    setOpen(false);
    emit(c, national);
  };

  const handleNational = (raw: string) => {
    const digits = onlyDigits(raw).slice(0, 14);
    setNational(digits);
    emit(country, digits);
  };

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <div
        className={cn(
          'flex h-11 min-h-[44px] w-full items-stretch rounded-lg border-[1.5px] bg-muted text-sm font-medium text-foreground transition-colors duration-200',
          'focus-within:bg-card focus-within:border-foreground',
          error ? 'border-destructive' : 'border-transparent',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      >
        {/* Sélecteur de pays */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label="Indicatif du pays"
          className="flex items-center gap-1.5 pl-3 pr-2 shrink-0 rounded-l-lg hover:bg-accent/40 focus:outline-none"
        >
          <span className="text-base leading-none" aria-hidden="true">
            {country.flag}
          </span>
          <span className="tabular-nums text-muted-foreground">{country.dial}</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>

        <div className="w-px my-2 bg-border" aria-hidden="true" />

        {/* Numéro national */}
        <input
          id={id}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          disabled={disabled}
          required={required}
          placeholder={placeholder}
          value={formatNational(national)}
          onChange={(e) => handleNational(e.target.value)}
          className="flex-1 min-w-0 bg-transparent px-3 py-2 placeholder:text-muted-foreground focus:outline-none"
        />
      </div>

      {/* Menu déroulant des pays */}
      {open && (
        <ul
          role="listbox"
          className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-border bg-card py-1 shadow-lg"
        >
          {COUNTRIES.map((c) => {
            const selected = c.code === country.code;
            return (
              <li key={c.code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => handleCountry(c)}
                  className={cn(
                    'flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-muted',
                    selected && 'bg-muted',
                  )}
                >
                  <span className="text-base leading-none" aria-hidden="true">
                    {c.flag}
                  </span>
                  <span className="flex-1 text-foreground">{c.name}</span>
                  <span className="tabular-nums text-muted-foreground">{c.dial}</span>
                  {selected && <Check className="h-4 w-4 text-foreground" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default PhoneInput;
