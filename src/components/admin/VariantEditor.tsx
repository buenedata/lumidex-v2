'use client';

import { useState, useEffect } from 'react';
import { Field, Select, Textarea } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import type { 
  AdminCardSearchResult, 
  CustomCardVariant, 
  CreateCustomVariantInput,
  UpdateCustomVariantInput,
  CustomVariantType 
} from '@/types/custom-variants';
import { CUSTOM_VARIANT_TYPE_NAMES, STANDARD_VARIANT_NAMES } from '@/types/custom-variants';

interface VariantEditorProps {
  card: AdminCardSearchResult;
  variant?: CustomCardVariant | null;
  onSave: () => void;
  onCancel: () => void;
  className?: string;
}

export function VariantEditor({ card, variant, onSave, onCancel, className }: VariantEditorProps) {
  const [formData, setFormData] = useState({
    variant_name: '',
    variant_type: 'custom' as CustomVariantType,
    display_name: '',
    description: '',
    source_product: '',
    price_usd: '',
    price_eur: '',
    replaces_standard_variant: ''
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form data when variant changes
  useEffect(() => {
    if (variant) {
      setFormData({
        variant_name: variant.variant_name,
        variant_type: variant.variant_type,
        display_name: variant.display_name,
        description: variant.description,
        source_product: variant.source_product || '',
        price_usd: variant.price_usd?.toString() || '',
        price_eur: variant.price_eur?.toString() || '',
        replaces_standard_variant: variant.replaces_standard_variant || ''
      });
    } else {
      setFormData({
        variant_name: '',
        variant_type: 'custom',
        display_name: '',
        description: '',
        source_product: '',
        price_usd: '',
        price_eur: '',
        replaces_standard_variant: ''
      });
    }
    setErrors({});
  }, [variant]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.variant_name.trim()) {
      newErrors.variant_name = 'Variant name is required';
    }

    if (!formData.display_name.trim()) {
      newErrors.display_name = 'Display name is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (formData.price_usd && isNaN(parseFloat(formData.price_usd))) {
      newErrors.price_usd = 'Invalid price format';
    }

    if (formData.price_eur && isNaN(parseFloat(formData.price_eur))) {
      newErrors.price_eur = 'Invalid price format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setSaving(true);

      const payload = variant 
        ? ({
            variant_name: formData.variant_name,
            variant_type: formData.variant_type,
            display_name: formData.display_name,
            description: formData.description,
            source_product: formData.source_product || undefined,
            price_usd: formData.price_usd ? parseFloat(formData.price_usd) : undefined,
            price_eur: formData.price_eur ? parseFloat(formData.price_eur) : undefined,
            replaces_standard_variant: formData.replaces_standard_variant || undefined
          } as UpdateCustomVariantInput)
        : ({
            card_id: card.id,
            variant_name: formData.variant_name,
            variant_type: formData.variant_type,
            display_name: formData.display_name,
            description: formData.description,
            source_product: formData.source_product || undefined,
            price_usd: formData.price_usd ? parseFloat(formData.price_usd) : undefined,
            price_eur: formData.price_eur ? parseFloat(formData.price_eur) : undefined,
            replaces_standard_variant: formData.replaces_standard_variant || undefined
          } as CreateCustomVariantInput);

      const url = variant 
        ? `/api/admin/variants/custom?id=${variant.id}`
        : '/api/admin/variants/custom';
      
      const method = variant ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (result.success) {
        onSave();
      } else {
        setErrors({ submit: result.error || 'Failed to save variant' });
      }
    } catch (error) {
      console.error('Error saving variant:', error);
      setErrors({ submit: 'An error occurred while saving' });
    } finally {
      setSaving(false);
    }
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-6', className)}>
      {/* Card Info */}
      <div className="bg-panel2 p-4 rounded-lg">
        <h4 className="font-medium text-text mb-2">Creating variant for:</h4>
        <div className="flex items-center gap-3">
          {card.images?.small && (
            <img
              src={card.images.small}
              alt={card.name}
              className="w-16 h-auto rounded"
            />
          )}
          <div>
            <p className="font-medium text-text">{card.name}</p>
            <p className="text-sm text-muted">#{card.number} • {card.set_name}</p>
          </div>
        </div>
      </div>

      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field
          label="Variant Name"
          type="text"
          value={formData.variant_name}
          onChange={(e) => updateFormData('variant_name', e.target.value)}
          placeholder="e.g., rev_holo_pokeball_collection"
          error={errors.variant_name}
          required
        />

        <Select
          label="Variant Type"
          value={formData.variant_type}
          onChange={(e) => updateFormData('variant_type', e.target.value)}
          error={errors.variant_type}
          required
        >
          {Object.entries(CUSTOM_VARIANT_TYPE_NAMES).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </Select>
      </div>

      <Field
        label="Display Name"
        type="text"
        value={formData.display_name}
        onChange={(e) => updateFormData('display_name', e.target.value)}
        placeholder="e.g., Reverse Holo (Poké Ball Collection)"
        error={errors.display_name}
        required
      />

      <Textarea
        label="Description"
        value={formData.description}
        onChange={(e) => updateFormData('description', e.target.value)}
        placeholder="Describe where this variant comes from and what makes it special..."
        rows={3}
        error={errors.description}
        required
      />

      <Field
        label="Source Product"
        type="text"
        value={formData.source_product}
        onChange={(e) => updateFormData('source_product', e.target.value)}
        placeholder="e.g., Victini Illustration Collection"
        error={errors.source_product}
      />

      {/* Pricing */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field
          label="Price (USD)"
          type="number"
          step="0.01"
          value={formData.price_usd}
          onChange={(e) => updateFormData('price_usd', e.target.value)}
          placeholder="0.00"
          error={errors.price_usd}
        />

        <Field
          label="Price (EUR)"
          type="number"
          step="0.01"
          value={formData.price_eur}
          onChange={(e) => updateFormData('price_eur', e.target.value)}
          placeholder="0.00"
          error={errors.price_eur}
        />
      </div>

      {/* Standard Variant Replacement */}
      <Select
        label="Replaces Standard Variant"
        value={formData.replaces_standard_variant}
        onChange={(e) => updateFormData('replaces_standard_variant', e.target.value)}
        error={errors.replaces_standard_variant}
      >
        <option value="">Don't replace any standard variant</option>
        {STANDARD_VARIANT_NAMES.map(variant => (
          <option key={variant} value={variant}>{variant}</option>
        ))}
      </Select>

      {/* Error Display */}
      {errors.submit && (
        <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm">
          {errors.submit}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={saving}
        >
          {saving ? 'Saving...' : variant ? 'Update Variant' : 'Create Variant'}
        </Button>
      </div>
    </form>
  );
}