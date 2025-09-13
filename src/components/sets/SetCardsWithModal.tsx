'use client';

import { useState, useEffect } from 'react';
import { CardTileWithCollectionButtons } from '@/components/cards/CardTileWithCollectionButtons';
import { CardDetailsModal } from '@/components/cards/CardDetailsModal';
import type { PriceSource } from '@/components/ui/PriceSourceToggle';
import type { CurrencyCode, UserPreferences } from '@/types';
import type { CardWithPrices } from '@/types/pricing';
import { useCurrencyOptional } from '@/lib/currency/context';

interface SetCard {
  id: string;
  name: string;
  number: string;
  rarity: string | null;
  types: string[] | null;
  hp: string | null;
  supertype: string | null;
  set_id: string | null;
  images: {
    small?: string;
    large?: string;
  } | null;
}

interface SetCardsWithModalProps {
  cards: SetCard[];
  priceSource?: PriceSource;
  userCurrency?: CurrencyCode;
}

export function SetCardsWithModal({
  cards,
  priceSource = 'cardmarket',
  userCurrency
}: SetCardsWithModalProps) {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cardsWithPrices, setCardsWithPrices] = useState<(SetCard | CardWithPrices)[]>(cards);
  const [pricesLoading, setPricesLoading] = useState(false);
  const currencyContext = useCurrencyOptional();

  // Fetch prices for all cards when component mounts or preferences change
  useEffect(() => {
    async function fetchCardPrices() {
      if (cards.length === 0) return;

      setPricesLoading(true);
      try {
        const userPreferences: UserPreferences = {
          preferred_currency: userCurrency || currencyContext?.userCurrency || 'EUR',
          preferred_price_source: priceSource || currencyContext?.priceSource || 'cardmarket'
        };

        const cardIds = cards.map(card => card.id);
        
        // Split card IDs into batches of 100 (API limit)
        const batchSize = 100;
        const batches: string[][] = [];
        for (let i = 0; i < cardIds.length; i += batchSize) {
          batches.push(cardIds.slice(i, i + batchSize));
        }
        
        console.log(`Fetching prices for ${cardIds.length} cards in ${batches.length} batches`);
        
        // Fetch all batches concurrently
        const batchPromises = batches.map(async (batch, index) => {
          const requestBody = {
            cardIds: batch,
            // Use forcePreferences as fallback if provided (from server-side user preferences)
            ...(userPreferences && { forcePreferences: userPreferences })
          };
          
          console.log(`Batch ${index + 1}/${batches.length}: ${batch.length} cards`);
          
          const response = await fetch('/api/cards/prices', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`Batch ${index + 1} API error:`, response.status, errorText);
            throw new Error(`Failed to fetch prices for batch ${index + 1}: ${response.status} - ${errorText}`);
          }

          const apiResponse = await response.json();
          
          if (!apiResponse.success) {
            console.error(`Batch ${index + 1} response not successful:`, apiResponse);
            throw new Error(`Batch ${index + 1} API response indicates failure`);
          }

          return apiResponse.data;
        });
        
        // Wait for all batches to complete
        const batchResults = await Promise.all(batchPromises);
        
        // Flatten all batch results into single array
        const cardsWithPriceData = batchResults.flat();
        
        console.log(`Successfully fetched prices for ${cardsWithPriceData.length} cards`);
        
        // Merge price data with original card data
        const mergedCards = cards.map(card => {
          const priceCard = cardsWithPriceData.find((p: any) => p.id === card.id);
          if (priceCard) {
            return {
              ...card,
              ...priceCard
            };
          }
          return card;
        });

        setCardsWithPrices(mergedCards);
      } catch (error) {
        console.error('Error fetching card prices:', error);
        // Keep original cards without price data on error
        setCardsWithPrices(cards);
      } finally {
        setPricesLoading(false);
      }
    }

    fetchCardPrices();
  }, [cards, priceSource, userCurrency, currencyContext?.userCurrency, currencyContext?.priceSource]);

  const handleCardClick = (cardId: string) => {
    setSelectedCardId(cardId);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedCardId(null);
  };

  const handleCollectionChange = (cardId: string, collectionData: any) => {
    console.log('Collection updated:', { cardId, collectionData });
    // Could trigger a refresh or update local state here if needed
  };

  const handleWishlistChange = () => {
    console.log('Wishlist updated');
    // Could trigger a refresh or update local state here if needed
  };

  if (cards.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 text-muted opacity-50">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-text mb-2">No cards found</h3>
        <p className="text-muted">This set doesn't have any cards loaded yet.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid-cards">
        {cardsWithPrices.map((card) => (
          <CardTileWithCollectionButtons
            key={card.id}
            card={{
              id: card.id,
              name: card.name,
              number: card.number,
              rarity: card.rarity ?? undefined,
              types: card.types ?? undefined,
              hp: card.hp ? parseInt(card.hp, 10) : undefined,
              supertype: card.supertype ?? undefined,
              set_id: card.set_id ?? undefined,
              images: card.images || undefined,
              // Include price_data if available
              ...('price_data' in card ? { price_data: card.price_data } : {})
            }}
            priceSource={priceSource}
            userCurrency={userCurrency}
            disabled={pricesLoading}
            onClick={handleCardClick}
          />
        ))}
      </div>

      {pricesLoading && (
        <div className="text-center py-4">
          <div className="inline-flex items-center gap-2 text-sm text-muted">
            <div className="w-4 h-4 border-2 border-brand2 border-t-transparent rounded-full animate-spin" />
            Loading prices...
          </div>
        </div>
      )}

      <CardDetailsModal
        cardId={selectedCardId}
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onCollectionChange={handleCollectionChange}
        onWishlistChange={handleWishlistChange}
      />
    </>
  );
}