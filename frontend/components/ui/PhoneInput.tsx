'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, Check, Search } from 'lucide-react';
import {
  AsYouType,
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  isValidPhoneNumber,
  type CountryCode,
} from 'libphonenumber-js';

/**
 * Champ téléphone international basé sur libphonenumber-js :
 * - liste COMPLÈTE des pays (getCountries) avec indicatif réel (getCountryCallingCode) ;
 * - noms de pays localisés via Intl.DisplayNames (fr) ;
 * - formatage « au fil de la frappe » propre à chaque pays (AsYouType) ;
 * - validation réelle par pays (isValidPhoneNumber) ;
 * - sortie normalisée E.164 via parsePhoneNumberFromString (gère le 0 de tête national, etc.).
 */
export interface CountryOption {
  code: CountryCode; // ISO alpha-2
  name: string;
  dial: string; // indicatif, ex "+352"
  flag: string; // emoji drapeau
}

// Pays mis en avant en tête de liste (marché principal), le reste alphabétique.
const PRIORITY_CODES: CountryCode[] = ['LU', 'FR', 'BE', 'DE', 'NL', 'CH', 'ES', 'IT', 'PT', 'GB'];

/** Drapeau emoji dérivé du code ISO alpha-2 (indicateurs régionaux). */
function flagOf(code: string): string {
  return code
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

/** Noms de pays localisés (français) ; repli sur le code si indisponible. */
const regionNames: Intl.DisplayNames | null = (() => {
  try {
    return new Intl.DisplayNames(['fr'], { type: 'region' });
  } catch {
    return null;
  }
})();

function nameOf(code: string): string {
  try {
    return regionNames?.of(code) ?? code;
  } catch {
    return code;
  }
}

/** Construit la liste complète des pays une seule fois. */
function buildCountries(): CountryOption[] {
  const all: CountryOption[] = getCountries()
    .map((code) => {
      let dial = '';
      try {
        dial = `+${getCountryCallingCode(code)}`;
      } catch {
        dial = '';
      }
      return { code, name: nameOf(code), dial, flag: flagOf(code) };
    })
    .filter((c) => c.dial);

  const priority = PRIORITY_CODES.map((pc) => all.find((c) => c.code === pc)).filter(
    Boolean,
  ) as CountryOption[];
  const rest = all
    .filter((c) => !PRIORITY_CODES.includes(c.code))
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'));

  return [...priority, ...rest];
}

export const COUNTRIES: CountryOption[] = buildCountries();

const DEFAULT_COUNTRY: CountryOption =
  COUNTRIES.find((c) => c.code === 'LU') ?? COUNTRIES[0];

function onlyDigits(s: string): string {
  return (s || '').replace(/\D/g, '');
}

/** Découpe une valeur E.164 en { country, national } via libphonenumber. */
function parseValue(value: string): { country: CountryOption; national: string } {
  if (!value) return { country: DEFAULT_COUNTRY, national: '' };
  try {
    const pn = parsePhoneNumberFromString(value.startsWith('+') ? value : `+${onlyDigits(value)}`);
    if (pn && pn.country) {
      const country = COUNTRIES.find((c) => c.code === pn.country) ?? DEFAULT_COUNTRY;
      return { country, national: pn.nationalNumber as string };
    }
  } catch {
    /* ignore */
  }
  return { country: DEFAULT_COUNTRY, national: onlyDigits(value.replace(/^\+?\d{1,4}/, '')) };
}

/** Numéro E.164 normalisé pour un pays + saisie nationale (repli concaténation si incomplet). */
function toE164(country: CountryOption, raw: string): { e164: string; valid: boolean } {
  const digits = onlyDigits(raw);
  try {
    const pn = parsePhoneNumberFromString(digits, country.code);
    if (pn) return { e164: pn.number, valid: pn.isValid() };
  } catch {
    /* ignore */
  }
  return { e164: `${country.dial}${digits}`, valid: false };
}

/** Validation réelle d'un numéro E.164 (utilisée par les formulaires). */
export function isPlausiblePhone(e164: string): boolean {
  try {
    if (isValidPhoneNumber(e164)) return true;
  } catch {
    /* ignore */
  }
  // Repli permissif : longueur nationale plausible (numéros incomplets tolérés côté saisie).
  const d = onlyDigits(e164);
  return d.length >= 8 && d.length <= 15;
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
  placeholder,
  disabled,
  required,
  className,
  error,
}: PhoneInputProps) {
  const parsed = parseValue(value);
  const [country, setCountry] = React.useState<CountryOption>(parsed.country);
  const [national, setNational] = React.useState<string>(parsed.national);
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const rootRef = React.useRef<HTMLDivElement>(null);

  // Resynchronise si la valeur externe change (reset de formulaire, préremplissage…).
  React.useEffect(() => {
    const cur = toE164(country, national).e164;
    if (value && value !== cur) {
      const p = parseValue(value);
      setCountry(p.country);
      setNational(p.national);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const emit = (c: CountryOption, digits: string) => {
    const { e164, valid } = toE164(c, digits);
    onChange(e164, valid);
  };

  const handleCountry = (c: CountryOption) => {
    setCountry(c);
    setOpen(false);
    setQuery('');
    emit(c, national);
  };

  const handleNational = (raw: string) => {
    const digits = onlyDigits(raw).slice(0, 15);
    setNational(digits);
    emit(country, digits);
  };

  // Affichage formaté « au fil de la frappe », style Uber : on formate le numéro complet en
  // international (AsYouType gère chaque pays) puis on retire l'indicatif (déjà dans le sélecteur).
  // Cela formate correctement le national saisi SANS le 0 de tête (ex FR +33 « 6 12 34 56 78 »).
  const displayValue = React.useMemo(() => {
    const digits = onlyDigits(national);
    if (!digits) return '';
    try {
      const full = new AsYouType().input(`${country.dial}${digits}`);
      return full.startsWith(country.dial)
        ? full.slice(country.dial.length).trimStart()
        : full;
    } catch {
      return digits;
    }
  }, [country.dial, national]);

  const nationalExample = placeholder ?? (country.code === 'FR' ? '6 12 34 56 78' : '621 123 456');

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.dial.includes(q) ||
        c.code.toLowerCase().includes(q),
    );
  }, [query]);

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

        <input
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          disabled={disabled}
          required={required}
          placeholder={nationalExample}
          value={displayValue}
          onChange={(e) => handleNational(e.target.value)}
          className="flex-1 min-w-0 bg-transparent px-3 py-2 placeholder:text-muted-foreground focus:outline-none"
        />
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-card shadow-lg">
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un pays…"
              aria-label="Rechercher un pays"
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
          <ul role="listbox" className="max-h-60 overflow-y-auto py-1">
            {filtered.map((c) => {
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
            {filtered.length === 0 && (
              <li className="px-3 py-3 text-sm text-muted-foreground">Aucun pays trouvé</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

export default PhoneInput;
