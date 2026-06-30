import React, { useEffect, useRef, useCallback } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  title?: string;
  description?: string;
  cancelText?: string;
  deleteText?: string;
  isLoading?: boolean;
  onCancel: () => void;
  onDelete: () => void;
}

/**
 * DeleteConfirmationModal - Production-ready delete confirmation dialog
 * 
 * Features:
 * - Solid opaque backdrop (non-translucent)
 * - Full accessibility (ARIA, focus trap, keyboard navigation)
 * - Smooth animations (fade + scale)
 * - Responsive design (mobile/desktop)
 * - Escape key and backdrop click handling
 * - Warning icon with destructive styling
 */
export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  title = 'Delete Task?',
  description = 'This will permanently remove this task and all associated checklists and attachments. This action cannot be undone.',
  cancelText = 'Cancel',
  deleteText = 'Delete Task',
  isLoading = false,
  onCancel,
  onDelete,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const deleteButtonRef = useRef<HTMLButtonElement>(null);

  // Focus trap: Keep focus inside modal
  useEffect(() => {
    if (!isOpen) return;

    const focusableElements = modalRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (!focusableElements || focusableElements.length === 0) return;

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Tab key: cycle through focusable elements
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
      // Escape key: close modal
      else if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };

    // Focus cancel button initially for better UX
    setTimeout(() => cancelButtonRef.current?.focus(), 50);

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onCancel]);

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="presentation"
    >
      {/* Solid opaque backdrop */}
      <div
        className="absolute inset-0 bg-black/70"
        aria-hidden="true"
        onClick={handleBackdropClick}
      />

      {/* Modal container */}
      <div
        ref={modalRef}
        className="relative z-50 w-full max-w-md mx-4 bg-white rounded-lg shadow-2xl transform transition-all duration-300 ease-out animate-in fade-in zoom-in-95 sm:max-w-md"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-modal-title"
        aria-describedby="delete-modal-description"
      >
        {/* Header section with icon */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-start gap-4">
            {/* Warning icon */}
            <div className="flex-shrink-0 pt-1">
              <AlertTriangle className="w-6 h-6 text-red-500" aria-hidden="true" />
            </div>

            {/* Title and description */}
            <div className="flex-1">
              <h2
                id="delete-modal-title"
                className="text-lg font-bold text-gray-900 leading-tight"
              >
                {title}
              </h2>
              <p
                id="delete-modal-description"
                className="mt-2 text-sm text-gray-600 leading-relaxed"
              >
                {description}
              </p>
            </div>

            {/* Close button (X) - optional accessibility enhancement */}
            <button
              type="button"
              onClick={onCancel}
              className="flex-shrink-0 inline-flex text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 rounded-md p-1 transition-colors"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Button section */}
        <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          {/* Delete button - destructive primary action */}
          <button
            ref={deleteButtonRef}
            type="button"
            onClick={onDelete}
            disabled={isLoading}
            className="w-full sm:w-auto px-4 py-2.5 bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:bg-red-400 text-white font-medium text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200 cursor-pointer disabled:cursor-not-allowed"
            aria-label={`${deleteText}${isLoading ? ' (processing)' : ''}`}
          >
            {isLoading ? (
              <span className="flex items-center gap-2 justify-center">
                <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Deleting...
              </span>
            ) : (
              deleteText
            )}
          </button>

          {/* Cancel button - secondary action */}
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="w-full sm:w-auto px-4 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 active:bg-gray-100 text-gray-900 font-medium text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelText}
          </button>
        </div>
      </div>

      {/* Tailwind animation keyframes injection */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes zoomIn95 {
          from {
            transform: scale(0.95);
          }
          to {
            transform: scale(1);
          }
        }

        .animate-in {
          animation: fadeIn 300ms ease-out, zoomIn95 300ms ease-out;
        }

        .fade-in {
          animation: fadeIn 300ms ease-out forwards;
        }

        .zoom-in-95 {
          animation: zoomIn95 300ms ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default DeleteConfirmationModal;
