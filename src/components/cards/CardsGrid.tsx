import Image from 'next/image';
import Link from 'next/link';
import type { TCGCard } from '@/lib/db/queries';
import type { PriceSource } from '@/lib/variants/mapper';

interface CardsGridProps {
  cards: TCGCard[];
  priceSource: PriceSource;
}

export function CardsGrid({ cards, priceSource }: CardsGridProps) {
  if (cards.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {cards.map((card) => (
        <CardItem key={card.id} card={card} priceSource={priceSource} />
      ))}
    </div>
  );
}

function CardItem({ card, priceSource }: { card: TCGCard; priceSource: PriceSource }) {
  return (
    <Link
      href={`/cards/${card.id}`}
      className="group bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow duration-200 overflow-hidden"
    >
      {/* Card Image */}
      <div className="aspect-[2.5/3.5] bg-gray-50 overflow-hidden">
        {card.images?.small ? (
          <Image
            src={card.images.small}
            alt={card.name}
            width={200}
            height={280}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center p-4">
              <div className="w-12 h-12 bg-gray-200 rounded mx-auto mb-2"></div>
              <p className="text-xs text-gray-500">No image</p>
            </div>
          </div>
        )}
      </div>

      {/* Card Info */}
      <div className="p-3">
        <h3 className="font-medium text-sm text-gray-900 mb-1 line-clamp-2 group-hover:text-blue-600 transition-colors">
          {card.name}
        </h3>
        
        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
          <span>#{card.number}</span>
          {card.rarity && (
            <span className="capitalize">{card.rarity}</span>
          )}
        </div>

        {/* Set Info */}
        <div className="text-xs text-gray-600 mb-2">
          <span className="font-medium">{card.set_id}</span>
        </div>

        {/* Types */}
        {card.types && card.types.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {card.types.slice(0, 2).map((type) => (
              <span
                key={type}
                className="inline-block px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded"
              >
                {type}
              </span>
            ))}
            {card.types.length > 2 && (
              <span className="text-xs text-gray-500">
                +{card.types.length - 2}
              </span>
            )}
          </div>
        )}

        {/* HP and Supertype */}
        <div className="flex items-center justify-between text-xs text-gray-600">
          {card.hp && (
            <span>HP: {card.hp}</span>
          )}
          {card.supertype && (
            <span className="capitalize">{card.supertype}</span>
          )}
        </div>

        {/* TODO: Add pricing display when we have price data */}
        {/* 
        <div className="mt-2 pt-2 border-t border-gray-100">
          <div className="text-xs text-gray-600">
            <span className="font-medium">Market:</span>
            <span className="ml-1">€XX.XX</span>
          </div>
        </div>
        */}
      </div>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-12">
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
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
          />
        </svg>
      </div>
      
      <h3 className="text-lg font-medium text-gray-900 mb-2">No cards found</h3>
      <p className="text-gray-500 mb-6">
        Try adjusting your search criteria or browse all cards
      </p>
      
      <div className="space-y-2 text-sm text-gray-600">
        <p>To load cards data, run the ingestion script:</p>
        <code className="bg-gray-100 px-2 py-1 rounded font-mono">
          npm run ingest:cards
        </code>
      </div>
    </div>
  );
}