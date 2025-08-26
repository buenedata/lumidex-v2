import React from 'react';
import { cn } from '@/lib/utils';

export interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helpText?: string;
}

export const Field = React.forwardRef<HTMLInputElement, FieldProps>(
  ({ className, label, error, helpText, id, ...props }, ref) => {
    const fieldId = id || `field-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className="form-group">
        {label && (
          <label htmlFor={fieldId} className="form-label">
            {label}
          </label>
        )}
        <input
          id={fieldId}
          className={cn(
            'field',
            error && 'border-danger focus:border-danger',
            className
          )}
          ref={ref}
          aria-describedby={
            error ? `${fieldId}-error` : helpText ? `${fieldId}-help` : undefined
          }
          aria-invalid={error ? 'true' : 'false'}
          {...props}
        />
        {error && (
          <p id={`${fieldId}-error`} className="form-error">
            {error}
          </p>
        )}
        {helpText && !error && (
          <p id={`${fieldId}-help`} className="text-sm text-muted">
            {helpText}
          </p>
        )}
      </div>
    );
  }
);

Field.displayName = 'Field';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helpText?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, helpText, id, ...props }, ref) => {
    const fieldId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className="form-group">
        {label && (
          <label htmlFor={fieldId} className="form-label">
            {label}
          </label>
        )}
        <textarea
          id={fieldId}
          className={cn(
            'field min-h-[100px] resize-y',
            error && 'border-danger focus:border-danger',
            className
          )}
          ref={ref}
          aria-describedby={
            error ? `${fieldId}-error` : helpText ? `${fieldId}-help` : undefined
          }
          aria-invalid={error ? 'true' : 'false'}
          {...props}
        />
        {error && (
          <p id={`${fieldId}-error`} className="form-error">
            {error}
          </p>
        )}
        {helpText && !error && (
          <p id={`${fieldId}-help`} className="text-sm text-muted">
            {helpText}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helpText?: string;
  children: React.ReactNode;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, helpText, id, children, ...props }, ref) => {
    const fieldId = id || `select-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className="form-group">
        {label && (
          <label htmlFor={fieldId} className="form-label">
            {label}
          </label>
        )}
        <select
          id={fieldId}
          className={cn(
            'field',
            error && 'border-danger focus:border-danger',
            className
          )}
          ref={ref}
          aria-describedby={
            error ? `${fieldId}-error` : helpText ? `${fieldId}-help` : undefined
          }
          aria-invalid={error ? 'true' : 'false'}
          {...props}
        >
          {children}
        </select>
        {error && (
          <p id={`${fieldId}-error`} className="form-error">
            {error}
          </p>
        )}
        {helpText && !error && (
          <p id={`${fieldId}-help`} className="text-sm text-muted">
            {helpText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';