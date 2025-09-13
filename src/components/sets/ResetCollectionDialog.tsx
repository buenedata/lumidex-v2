'use client';

import React from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';

interface ResetCollectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  setName: string;
  isLoading?: boolean;
  collectionStats?: {
    collectedCards: number;
    totalQuantity: number;
  };
}

export function ResetCollectionDialog({
  isOpen,
  onClose,
  onConfirm,
  setName,
  isLoading = false,
  collectionStats,
}: ResetCollectionDialogProps) {
  const handleConfirm = () => {
    onConfirm();
    // Don't close immediately - let the parent handle closing after success/error
  };

  const hasCollection = collectionStats && (collectionStats.collectedCards > 0 || collectionStats.totalQuantity > 0);

  return (
    <Dialog open={isOpen} onClose={onClose} title="Reset Collection">
      <div className="space-y-4">
        {/* Warning Icon */}
        <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
          <svg
            className="w-6 h-6 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 18.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>

        {/* Content */}
        <div className="text-center space-y-3">
          <h3 className="text-lg font-semibold text-text">
            Reset Collection for "{setName}"?
          </h3>
          
          <div className="text-sm text-muted space-y-2">
            <p>
              This will permanently remove <strong>all cards</strong> from your collection for this set.
            </p>
            
            {hasCollection && collectionStats && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="font-medium text-red-800 mb-1">
                  You currently have:
                </p>
                <ul className="text-red-700 space-y-1">
                  <li>• {collectionStats.collectedCards} unique cards collected</li>
                  <li>• {collectionStats.totalQuantity} total cards in collection</li>
                </ul>
              </div>
            )}
            
            {!hasCollection && (
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-gray-600">
                  You don't have any cards from this set in your collection yet.
                </p>
              </div>
            )}
            
            <p className="font-medium text-red-600">
              This action cannot be undone.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1"
          >
            Cancel
          </Button>
          
          <Button
            variant="danger"
            onClick={handleConfirm}
            loading={isLoading}
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? 'Resetting...' : 'Reset Collection'}
          </Button>
        </div>

        {/* Additional Info */}
        <div className="pt-2 border-t border-border">
          <p className="text-xs text-muted text-center">
            Tip: Your master set preference will be preserved after resetting.
          </p>
        </div>
      </div>
    </Dialog>
  );
}

export default ResetCollectionDialog;