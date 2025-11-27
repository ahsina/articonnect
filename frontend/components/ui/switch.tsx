import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, label, description, id, checked, onChange, disabled, ...props }, ref) => {
    const generatedId = React.useId();
    const switchId = id || generatedId;
    const descriptionId = `${switchId}-description`;

    return (
      <div className="flex items-center justify-between">
        {(label || description) && (
          <div className="flex-1 mr-4">
            {label && (
              <label
                htmlFor={switchId}
                className={cn(
                  'text-sm font-medium',
                  disabled ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 cursor-pointer',
                )}
              >
                {label}
              </label>
            )}
            {description && (
              <p id={descriptionId} className="text-sm text-gray-500 mt-0.5">
                {description}
              </p>
            )}
          </div>
        )}
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          aria-describedby={description ? descriptionId : undefined}
          disabled={disabled}
          onClick={() => {
            if (!disabled && onChange) {
              const syntheticEvent = {
                target: { checked: !checked },
                currentTarget: { checked: !checked },
              } as React.ChangeEvent<HTMLInputElement>;
              onChange(syntheticEvent);
            }
          }}
          className={cn(
            'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent',
            'transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
            checked ? 'bg-blue-600' : 'bg-gray-200',
            disabled && 'opacity-50 cursor-not-allowed',
            className,
          )}
        >
          <span
            className={cn(
              'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0',
              'transition duration-200 ease-in-out',
              checked ? 'translate-x-5' : 'translate-x-0',
            )}
          />
        </button>
        <input
          type="checkbox"
          id={switchId}
          ref={ref}
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className="sr-only"
          {...props}
        />
      </div>
    );
  },
);
Switch.displayName = 'Switch';

export { Switch };
