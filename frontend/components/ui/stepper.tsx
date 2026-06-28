import * as React from 'react';
import { cn } from '@/lib/utils';

export interface Step {
  id: string | number;
  label: string;
  description?: string;
}

export interface StepperProps {
  steps: Step[];
  currentStep: number;
  onStepClick?: (stepIndex: number) => void;
  allowClickPrevious?: boolean;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

const CheckIcon = () => (
  <svg
    className="h-5 w-5 text-white"
    fill="currentColor"
    viewBox="0 0 20 20"
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
      clipRule="evenodd"
    />
  </svg>
);

const Stepper = ({
  steps,
  currentStep,
  onStepClick,
  allowClickPrevious = true,
  orientation = 'horizontal',
  className,
}: StepperProps) => {
  const isHorizontal = orientation === 'horizontal';

  return (
    <nav className={cn('w-full', className)} aria-label="Étapes">
      <ol
        className={cn(
          'flex',
          isHorizontal ? 'items-center' : 'flex-col space-y-4'
        )}
      >
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isClickable = allowClickPrevious && index < currentStep && onStepClick;

          return (
            <li
              key={step.id}
              className={cn(
                'flex items-center',
                isHorizontal && index < steps.length - 1 && 'flex-1'
              )}
            >
              <div
                className={cn(
                  'flex items-center',
                  isHorizontal ? 'flex-col' : 'flex-row gap-4'
                )}
              >
                {/* Step circle */}
                <button
                  type="button"
                  onClick={() => isClickable && onStepClick(index)}
                  disabled={!isClickable}
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-full border-2 font-medium',
                    'transition-colors duration-200',
                    'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                    isCompleted && 'bg-primary border-blue-600',
                    isCurrent && 'border-blue-600 text-primary bg-card',
                    !isCompleted && !isCurrent && 'border-border text-muted-foreground bg-card',
                    isClickable && 'cursor-pointer hover:bg-primary/10'
                  )}
                  aria-current={isCurrent ? 'step' : undefined}
                  aria-label={`Étape ${index + 1}: ${step.label}${isCompleted ? ' (terminée)' : isCurrent ? ' (en cours)' : ''}`}
                >
                  {isCompleted ? <CheckIcon /> : <span>{index + 1}</span>}
                </button>

                {/* Step label */}
                <div
                  className={cn(
                    isHorizontal ? 'mt-2 text-center' : 'flex flex-col'
                  )}
                >
                  <span
                    className={cn(
                      'text-sm font-medium',
                      (isCompleted || isCurrent) ? 'text-foreground' : 'text-muted-foreground'
                    )}
                  >
                    {step.label}
                  </span>
                  {step.description && (
                    <span className="text-xs text-muted-foreground mt-0.5">
                      {step.description}
                    </span>
                  )}
                </div>
              </div>

              {/* Connector line */}
              {index < steps.length - 1 && isHorizontal && (
                <div
                  className={cn(
                    'flex-1 h-0.5 mx-4',
                    index < currentStep ? 'bg-primary' : 'bg-gray-300'
                  )}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export { Stepper };
