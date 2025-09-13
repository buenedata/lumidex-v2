'use client';

import { useState, useEffect } from 'react';
import { Field } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import type { AdminCardSearchResult, AdminCardSearchFilters } from '@/types/custom-variants';

interface CardSearchProps {
  onCardSelect: (card: AdminCardSearchResult) => void;
  selectedCard: AdminCardSearchResult | null;
  className?: string;
}

export function CardSearch({ onCardSelect, selectedCard, className }: CardSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<AdminCardSearchFilters>({});
  const [results, setResults] = useState<AdminCardSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      setLoading(true);
      setHasSearched(true);
      
      const params = new URLSearchParams();
      params.append('query', searchQuery.trim());
      
      if (filters.set_id) params.append('set_id', filters.set_id);
      if (filters.rarity) params.append('rarity', filters.rarity);
      if (filters.has_custom_variants !== undefined) {
        params.append('has_custom_variants', filters.has_custom_variants.toString());
      }

      const response = await fetch(`/api/admin/variants/search?${params}`);
      const result = await response.json();

      if (result.success) {
        setResults(result.data);
      } else {
        console.error('Search failed:', result.error);
        setResults([]);
      }
    } catch (error) {
      console.error('Error searching cards:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setResults([]);
    setHasSearched(false);
    setFilters({});
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search Input */}
      <div className="flex gap-2">
        <Field
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Search by card name or number (e.g., 'Victini 12')"
          className="flex-1"
        />
        <Button
          onClick={handleSearch}
          disabled={!searchQuery.trim() || loading}
          variant="primary"
        >
          {loading ? 'Searching...' : 'Search'}
        </Button>
        {(searchQuery || hasSearched) && (
          <Button
            onClick={clearSearch}
            variant="ghost"
          >
            Clear
          </Button>
        )}
      </div>

      {/* Search Results */}
      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="p-3 skeleton rounded-lg h-20" />
          ))}
        </div>
      )}

      {!loading && hasSearched && results.length === 0 && (
        <div className="text-center py-8 text-muted">
          <p>No cards found matching your search.</p>
          <p className="text-sm mt-1">Try searching by card name or number.</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {results.map((card) => (
            <CardSearchResult
              key={card.id}
              card={card}
              isSelected={selectedCard?.id === card.id}
              onSelect={() => onCardSelect(card)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface CardSearchResultProps {
  card: AdminCardSearchResult;
  isSelected: boolean;
  onSelect: () => void;
}

function CardSearchResult({ card, isSelected, onSelect }: CardSearchResultProps) {
  const customVariantCount = card.custom_variants?.length || 0;
  
  return (
    <div
      className={cn(
        'p-3 border rounded-lg cursor-pointer transition-colors',
        isSelected 
          ? 'border-primary bg-primary/10' 
          : 'border-border hover:bg-panel2'
      )}
      onClick={onSelect}
    >
      <div className="flex items-center gap-3">
        {/* Card Image */}
        {card.images?.small && (
          <img
            src={card.images.small}
            alt={card.name}
            className="w-12 h-auto rounded"
          />
        )}
        
        {/* Card Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-text truncate">{card.name}</h4>
            {customVariantCount > 0 && (
              <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs">
                +{customVariantCount} custom
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm text-muted mt-1">
            <span>#{card.number}</span>
            <span>{card.set_name}</span>
            <span>{card.rarity}</span>
          </div>
        </div>

        {/* Selection Indicator */}
        {isSelected && (
          <div className="w-3 h-3 bg-primary rounded-full" />
        )}
      </div>
    </div>
  );
}