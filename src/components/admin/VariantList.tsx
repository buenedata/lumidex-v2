'use client';

import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import { cn } from '@/lib/utils';
import type { CustomCardVariant } from '@/types/custom-variants';
import { getCustomVariantTypeName } from '@/types/custom-variants';

interface VariantListProps {
  variants: CustomCardVariant[];
  loading?: boolean;
  onEdit: (variant: CustomCardVariant) => void;
  onDelete: (variantId: number) => void;
  onToggle: (variantId: number, isActive: boolean) => void;
  className?: string;
}

export function VariantList({
  variants,
  loading,
  onEdit,
  onDelete,
  onToggle,
  className
}: VariantListProps) {
  if (loading) {
    return (
      <div className={cn('space-y-3', className)}>
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="p-4 skeleton rounded-lg h-32" />
        ))}
      </div>
    );
  }

  if (variants.length === 0) {
    return (
      <div className={cn('text-center py-8', className)}>
        <div className="w-12 h-12 mx-auto mb-3 text-muted opacity-50">
          <VariantIcon />
        </div>
        <p className="text-muted">No custom variants created yet</p>
        <p className="text-sm text-muted mt-1">
          Create a custom variant to override or add special variants for this card
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {variants.map((variant) => (
        <VariantCard
          key={variant.id}
          variant={variant}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggle={onToggle}
        />
      ))}
    </div>
  );
}

interface VariantCardProps {
  variant: CustomCardVariant;
  onEdit: (variant: CustomCardVariant) => void;
  onDelete: (variantId: number) => void;
  onToggle: (variantId: number, isActive: boolean) => void;
}

function VariantCard({ variant, onEdit, onDelete, onToggle }: VariantCardProps) {
  const formatPrice = (price?: number, currency?: string) => {
    if (!price) return null;
    const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '';
    return `${symbol}${price.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric'
    });
  };

  return (
    <div className={cn(
      'p-4 border rounded-lg transition-colors',
      variant.is_active 
        ? 'border-border bg-panel hover:bg-panel2' 
        : 'border-border/50 bg-panel/50 opacity-60'
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-text truncate">{variant.display_name}</h4>
            <span className={cn(
              'px-2 py-1 text-xs rounded-full',
              variant.variant_type === 'reverse_holo_pokeball' && 'bg-red-500/20 text-red-300',
              variant.variant_type === 'reverse_holo_masterball' && 'bg-pink-500/20 text-pink-300',
              variant.variant_type === 'special_edition' && 'bg-purple-500/20 text-purple-300',
              variant.variant_type === 'promo' && 'bg-yellow-500/20 text-yellow-300',
              variant.variant_type === 'custom' && 'bg-gray-500/20 text-gray-300'
            )}>
              {getCustomVariantTypeName(variant.variant_type)}
            </span>
            {!variant.is_active && (
              <span className="px-2 py-1 bg-gray-500/20 text-gray-400 rounded text-xs">
                Inactive
              </span>
            )}
          </div>
          
          <p className="text-sm text-muted mb-2 line-clamp-2">
            {variant.description}
          </p>
          
          <div className="flex items-center gap-4 text-xs text-muted">
            <span>ID: {variant.variant_name}</span>
            {variant.source_product && (
              <span>Product: {variant.source_product}</span>
            )}
            <span>Created: {formatDate(variant.created_at)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 ml-4">
          <Switch
            checked={variant.is_active}
            onChange={(checked) => onToggle(variant.id, checked)}
            size="sm"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(variant)}
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(variant.id)}
            className="text-danger hover:text-danger"
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Additional Details */}
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div className="flex items-center gap-4 text-sm">
          {variant.price_usd && (
            <span className="text-green-400">
              {formatPrice(variant.price_usd, 'USD')}
            </span>
          )}
          {variant.price_eur && (
            <span className="text-blue-400">
              {formatPrice(variant.price_eur, 'EUR')}
            </span>
          )}
          {!variant.price_usd && !variant.price_eur && (
            <span className="text-muted text-xs">No pricing set</span>
          )}
        </div>

        {variant.replaces_standard_variant && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted">Replaces:</span>
            <span className="px-2 py-1 bg-orange-500/20 text-orange-300 rounded">
              {variant.replaces_standard_variant}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// Simple variant icon
function VariantIcon() {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={1.5} 
        d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" 
      />
    </svg>
  );
}