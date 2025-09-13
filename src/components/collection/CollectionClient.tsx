'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import type { CollectionItem } from '@/lib/db/queries';
import type { PriceSource, VariantName } from '@/lib/variants/mapper';
import { getVariantDisplayName } from '@/lib/variants/mapper';

interface CollectionClientProps {
  items: CollectionItem[];
  userId: string;
  priceSource: PriceSource;
}

export function CollectionClient({ items, userId, priceSource }: CollectionClientProps) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  const handleQuantityChange = async (itemId: number, newQuantity: number) => {
    if (newQuantity < 0) return;
    
    setIsUpdating(`quantity-${itemId}`);
    
    try {
      const response = await fetch('/api/collection/update-quantity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, quantity: newQuantity }),
      });

      if (response.ok) {
        router.refresh();
      } else {
        console.error('Failed to update quantity');
      }
    } catch (error) {
      console.error('Error updating quantity:', error);
    } finally {
      setIsUpdating(null);
    }
  };

  const handleRemoveItem = async (itemId: number) => {
    if (!confirm('Are you sure you want to remove this card from your collection?')) {
      return;
    }

    setIsUpdating(`remove-${itemId}`);
    
    try {
      const response = await fetch('/api/collection/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId }),
      });

      if (response.ok) {
        router.refresh();
      } else {
        console.error('Failed to remove item');
      }
    } catch (error) {
      console.error('Error removing item:', error);
    } finally {
      setIsUpdating(null);
    }
  };

  if (items.length === 0) {
    return <EmptyCollection />;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-6 border-b">
        <h2 className="text-lg font-semibold text-gray-900">Collection Items</h2>
        <p className="text-sm text-gray-600 mt-1">
          {items.length} unique cards in your collection
        </p>
      </div>

      <div className="divide-y divide-gray-200">
        {items.map((item) => (
          <CollectionItem
            key={item.id}
            item={item}
            onQuantityChange={handleQuantityChange}
            onRemove={handleRemoveItem}
            isUpdating={isUpdating}
            priceSource={priceSource}
          />
        ))}
      </div>
    </div>
  );
}

interface CollectionItemProps {
  item: CollectionItem;
  onQuantityChange: (itemId: number, quantity: number) => void;
  onRemove: (itemId: number) => void;
  isUpdating: string | null;
  priceSource: PriceSource;
}

function CollectionItem({ 
  item, 
  onQuantityChange, 
  onRemove, 
  isUpdating, 
  priceSource 
}: CollectionItemProps) {
  const [quantity, setQuantity] = useState(item.quantity);
  const isQuantityUpdating = isUpdating === `quantity-${item.id}`;
  const isRemoving = isUpdating === `remove-${item.id}`;

  const handleQuantitySubmit = () => {
    if (quantity !== item.quantity) {
      onQuantityChange(item.id, quantity);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleQuantitySubmit();
    }
  };

  return (
    <div className="p-6 hover:bg-gray-50 transition-colors">
      <div className="flex items-start space-x-4">
        {/* Card Image */}
        <div className="flex-shrink-0">
          <div className="w-16 h-24 bg-gray-100 rounded overflow-hidden">
            {/* TODO: Fetch and display card image */}
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-8 h-8 bg-gray-300 rounded"></div>
            </div>
          </div>
        </div>

        {/* Card Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-900">
                {item.card_id}
              </h3>
              
              <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                <span>Variant: {getVariantDisplayName(item.variant)}</span>
                {item.condition && (
                  <span>Condition: {item.condition}</span>
                )}
                {item.acquired_at && (
                  <span>
                    Added: {new Date(item.acquired_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'numeric',
                      day: 'numeric'
                    })}
                  </span>
                )}
              </div>

              {item.notes && (
                <p className="mt-2 text-sm text-gray-600">{item.notes}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2 ml-4">
              {/* Quantity Controls */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    const newQty = Math.max(0, quantity - 1);
                    setQuantity(newQty);
                    onQuantityChange(item.id, newQty);
                  }}
                  disabled={isQuantityUpdating || quantity <= 0}
                  className="w-8 h-8 flex items-center justify-center rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  -
                </button>
                
                <input
                  type="number"
                  min="0"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                  onBlur={handleQuantitySubmit}
                  onKeyDown={handleKeyDown}
                  disabled={isQuantityUpdating}
                  className="w-16 px-2 py-1 text-center border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                />
                
                <button
                  onClick={() => {
                    const newQty = quantity + 1;
                    setQuantity(newQty);
                    onQuantityChange(item.id, newQty);
                  }}
                  disabled={isQuantityUpdating}
                  className="w-8 h-8 flex items-center justify-center rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  +
                </button>
              </div>

              {/* Remove Button */}
              <button
                onClick={() => onRemove(item.id)}
                disabled={isRemoving}
                className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                title="Remove from collection"
              >
                {isRemoving ? (
                  <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyCollection() {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
      <div className="w-24 h-24 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
        <svg 
          className="w-12 h-12 text-gray-400" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" 
          />
        </svg>
      </div>
      
      <h3 className="text-lg font-medium text-gray-900 mb-2">Your collection is empty</h3>
      <p className="text-gray-500 mb-6">
        Start building your Pokemon card collection by browsing sets and adding cards you own.
      </p>
      
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <a
          href="/sets"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
        >
          Browse Sets
        </a>
        <a
          href="/cards"
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium"
        >
          Search Cards
        </a>
      </div>
    </div>
  );
}