'use client';

import { useState } from 'react';
import { CardTileWithCollectionButtons } from '@/components/cards/CardTileWithCollectionButtons';
import { CardDetailsModal } from '@/components/cards/CardDetailsModal';
import type { TCGCard } from '@/lib/db/queries';
import type { PriceSource } from '@/lib/variants/mapper';
import type { CurrencyCode } from '@/types';

interface CardsGridProps {
  cards: TCGCard[];
  priceSource: PriceSource;
  userCurrency?: CurrencyCode;
}

export function CardsGrid({ cards, priceSource, userCurrency }: CardsGridProps) {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
  };

  const handleWishlistChange = () => {
    console.log('Wishlist updated');
  };

  if (cards.length === 0) {
    return <EmptyState />;
  }

  return (
    <>
      <div className="grid-cards">
        {cards.map((card) => (
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
            }}
            priceSource={priceSource}
            userCurrency={userCurrency}
            onClick={handleCardClick}
          />
        ))}
      </div>

      {/* Card Details Modal */}
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

function EmptyState() {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <CardIcon />
      </div>
      
      <h3 className="text-lg font-medium text-text mb-2">No cards found</h3>
      <p className="text-muted mb-6">
        Try adjusting your search criteria or browse all cards
      </p>
      
      <div className="space-y-2 text-sm text-muted">
        <p>To load cards data, run the ingestion script:</p>
        <code className="bg-panel2 px-2 py-1 rounded font-mono">
          npm run ingest:cards
        </code>
      </div>
    </div>
  );
}

// Card Icon component
function CardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}