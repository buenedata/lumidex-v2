'use client';

import { useState, useEffect } from 'react';
import { Panel } from '@/components/ui/Panel';
import { Field } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { cn } from '@/lib/utils';
import { CardSearch } from './CardSearch';
import { VariantEditor } from './VariantEditor';
import { VariantList } from './VariantList';
import type { 
  AdminCardSearchResult, 
  CustomCardVariant,
  VariantPreview 
} from '@/types/custom-variants';

interface VariantManagerProps {
  className?: string;
}

export function VariantManager({ className }: VariantManagerProps) {
  const [selectedCard, setSelectedCard] = useState<AdminCardSearchResult | null>(null);
  const [customVariants, setCustomVariants] = useState<CustomCardVariant[]>([]);
  const [variantPreview, setVariantPreview] = useState<VariantPreview | null>(null);
  const [showVariantEditor, setShowVariantEditor] = useState(false);
  const [editingVariant, setEditingVariant] = useState<CustomCardVariant | null>(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    total_custom_variants: 0,
    active_custom_variants: 0,
    cards_with_custom_variants: 0
  });

  // Load statistics on mount
  useEffect(() => {
    loadStatistics();
  }, []);

  // Load custom variants when card is selected
  useEffect(() => {
    if (selectedCard) {
      loadCardVariants(selectedCard.id);
      loadVariantPreview(selectedCard.id);
    }
  }, [selectedCard]);

  const loadStatistics = async () => {
    try {
      // We'll implement stats endpoint later
      setStats({
        total_custom_variants: 0,
        active_custom_variants: 0,
        cards_with_custom_variants: 0
      });
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  };

  const loadCardVariants = async (cardId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/variants/custom?card_id=${cardId}`);
      const result = await response.json();
      
      if (result.success) {
        setCustomVariants(result.data);
      }
    } catch (error) {
      console.error('Error loading custom variants:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadVariantPreview = async (cardId: string) => {
    try {
      const response = await fetch(`/api/admin/variants/preview?card_id=${cardId}`);
      const result = await response.json();
      
      if (result.success) {
        setVariantPreview(result.data);
      }
    } catch (error) {
      console.error('Error loading variant preview:', error);
    }
  };

  const handleCreateVariant = () => {
    setEditingVariant(null);
    setShowVariantEditor(true);
  };

  const handleEditVariant = (variant: CustomCardVariant) => {
    setEditingVariant(variant);
    setShowVariantEditor(true);
  };

  const handleVariantSaved = () => {
    setShowVariantEditor(false);
    setEditingVariant(null);
    if (selectedCard) {
      loadCardVariants(selectedCard.id);
      loadVariantPreview(selectedCard.id);
    }
    loadStatistics();
  };

  const handleDeleteVariant = async (variantId: number) => {
    if (!confirm('Are you sure you want to delete this custom variant?')) return;

    try {
      const response = await fetch(`/api/admin/variants/custom?id=${variantId}`, {
        method: 'DELETE'
      });

      if (response.ok && selectedCard) {
        loadCardVariants(selectedCard.id);
        loadVariantPreview(selectedCard.id);
        loadStatistics();
      }
    } catch (error) {
      console.error('Error deleting variant:', error);
    }
  };

  const handleToggleVariant = async (variantId: number, isActive: boolean) => {
    try {
      const response = await fetch(`/api/admin/variants/custom?id=${variantId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: isActive })
      });

      if (response.ok && selectedCard) {
        loadCardVariants(selectedCard.id);
        loadVariantPreview(selectedCard.id);
        loadStatistics();
      }
    } catch (error) {
      console.error('Error toggling variant:', error);
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text">Custom Variant Manager</h2>
          <p className="text-muted">Create and manage custom card variants for special products</p>
        </div>
        
        <div className="flex items-center gap-4 text-sm text-muted">
          <span>Active: {stats.active_custom_variants}</span>
          <span>Total: {stats.total_custom_variants}</span>
          <span>Cards: {stats.cards_with_custom_variants}</span>
        </div>
      </div>

      {/* Card Search */}
      <Panel>
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-text">Search Cards</h3>
          <CardSearch onCardSelect={setSelectedCard} selectedCard={selectedCard} />
        </div>
      </Panel>

      {/* Selected Card Details */}
      {selectedCard && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card Info & Variant Preview */}
          <Panel>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-text">Card Details</h3>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleCreateVariant}
                >
                  Create Custom Variant
                </Button>
              </div>
              
              <div className="flex items-start gap-4">
                {selectedCard.images?.small && (
                  <img
                    src={selectedCard.images.small}
                    alt={selectedCard.name}
                    className="w-24 h-auto rounded-lg"
                  />
                )}
                <div className="flex-1">
                  <h4 className="font-medium text-text">{selectedCard.name}</h4>
                  <p className="text-sm text-muted">#{selectedCard.number}</p>
                  <p className="text-sm text-muted">{selectedCard.set_name}</p>
                  <p className="text-sm text-muted">{selectedCard.rarity}</p>
                </div>
              </div>

              {/* Variant Preview */}
              {variantPreview && (
                <div className="border-t border-border pt-4">
                  <h4 className="font-medium text-text mb-3">Variant Preview</h4>
                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="text-muted">Standard variants:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {variantPreview.standard_variants.map(variant => (
                          <span key={variant} className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs">
                            {variant}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <span className="text-muted">Will display:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {variantPreview.display_variants.map(variant => (
                          <span key={variant} className="px-2 py-1 bg-green-500/20 text-green-300 rounded text-xs">
                            {variant}
                          </span>
                        ))}
                        {variantPreview.custom_variants.map(variant => (
                          <span key={variant.id} className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs">
                            {variant.display_name}
                          </span>
                        ))}
                      </div>
                    </div>

                    {variantPreview.hidden_variants.length > 0 && (
                      <div>
                        <span className="text-muted">Hidden by custom:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {variantPreview.hidden_variants.map(variant => (
                            <span key={variant} className="px-2 py-1 bg-red-500/20 text-red-300 rounded text-xs line-through">
                              {variant}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Panel>

          {/* Custom Variants List */}
          <Panel>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-text">
                Custom Variants ({customVariants.length})
              </h3>
              
              <VariantList
                variants={customVariants}
                loading={loading}
                onEdit={handleEditVariant}
                onDelete={handleDeleteVariant}
                onToggle={handleToggleVariant}
              />
            </div>
          </Panel>
        </div>
      )}

      {/* Variant Editor Dialog */}
      <Dialog
        open={showVariantEditor}
        onClose={() => setShowVariantEditor(false)}
        title={editingVariant ? 'Edit Custom Variant' : 'Create Custom Variant'}
        size="lg"
      >
        {selectedCard && (
          <VariantEditor
            card={selectedCard}
            variant={editingVariant}
            onSave={handleVariantSaved}
            onCancel={() => setShowVariantEditor(false)}
          />
        )}
      </Dialog>
    </div>
  );
}