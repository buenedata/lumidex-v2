'use client';

import { Fragment } from 'react';
import { Dialog as HeadlessDialog, Transition } from '@headlessui/react';
import { Button } from './Button';
import { cn } from '@/lib/utils';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  preventClose?: boolean;
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  className,
  size = 'md',
  preventClose = false,
}: DialogProps) {
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full mx-4',
  };

  return (
    <Transition appear show={open} as={Fragment}>
      <HeadlessDialog 
        as="div" 
        className="relative z-50" 
        onClose={preventClose ? () => {} : onClose}
      >
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>

        {/* Dialog Container */}
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <HeadlessDialog.Panel 
                className={cn(
                  'w-full transform overflow-hidden panel p-0 text-left align-middle shadow-xl transition-all',
                  sizeClasses[size],
                  className
                )}
              >
                {/* Header */}
                {(title || description) && (
                  <div className="px-6 py-4 border-b border-border">
                    <div className="flex items-start justify-between">
                      <div>
                        {title && (
                          <HeadlessDialog.Title
                            as="h3"
                            className="text-lg font-semibold text-text"
                          >
                            {title}
                          </HeadlessDialog.Title>
                        )}
                        {description && (
                          <HeadlessDialog.Description className="mt-1 text-sm text-muted">
                            {description}
                          </HeadlessDialog.Description>
                        )}
                      </div>
                      {!preventClose && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm ml-4 p-1"
                          onClick={onClose}
                          aria-label="Close dialog"
                        >
                          <XMarkIcon className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Content */}
                <div className="px-6 py-4">
                  {children}
                </div>
              </HeadlessDialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </HeadlessDialog>
    </Transition>
  );
}

export interface AlertDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  variant?: 'danger' | 'warning' | 'info';
  loading?: boolean;
}

export function AlertDialog({
  open,
  onClose,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  variant = 'info',
  loading = false,
}: AlertDialogProps) {
  const handleConfirm = () => {
    onConfirm();
  };

  const iconColors = {
    danger: 'text-danger',
    warning: 'text-warning',
    info: 'text-brand2',
  };

  const buttonVariants = {
    danger: 'danger' as const,
    warning: 'primary' as const,
    info: 'primary' as const,
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="sm"
      preventClose={loading}
    >
      <div className="flex items-start space-x-4">
        {/* Icon */}
        <div className={cn('flex-shrink-0 mt-1', iconColors[variant])}>
          {variant === 'danger' && <ExclamationTriangleIcon className="h-6 w-6" />}
          {variant === 'warning' && <ExclamationTriangleIcon className="h-6 w-6" />}
          {variant === 'info' && <InformationCircleIcon className="h-6 w-6" />}
        </div>

        {/* Content */}
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-text mb-2">
            {title}
          </h3>
          {description && (
            <p className="text-sm text-muted mb-6">
              {description}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3">
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={loading}
            >
              {cancelText}
            </Button>
            <Button
              variant={buttonVariants[variant]}
              onClick={handleConfirm}
              loading={loading}
            >
              {confirmText}
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}

export interface FormDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  submitText?: string;
  cancelText?: string;
  onSubmit: (formData: FormData) => void | Promise<void>;
  children: React.ReactNode;
  loading?: boolean;
  submitDisabled?: boolean;
}

export function FormDialog({
  open,
  onClose,
  title,
  description,
  submitText = 'Submit',
  cancelText = 'Cancel',
  onSubmit,
  children,
  loading = false,
  submitDisabled = false,
}: FormDialogProps) {
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    await onSubmit(formData);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      preventClose={loading}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {children}

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-border">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={loading}
            disabled={submitDisabled}
          >
            {submitText}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

// Icons
function XMarkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function ExclamationTriangleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  );
}

function InformationCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}