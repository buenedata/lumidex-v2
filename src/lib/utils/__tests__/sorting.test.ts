// Simple test to verify sorting logic
import { sortCards } from '../sorting';

// Mock card data for testing
const mockCards = [
  {
    id: '1',
    name: 'Pikachu',
    number: '025',
    price_data: {
      preferred_source_prices: { trendPrice: 10.50 }
    }
  },
  {
    id: '2', 
    name: 'Charizard',
    number: '006',
    price_data: {
      preferred_source_prices: { trendPrice: 150.00 }
    }
  },
  {
    id: '3',
    name: 'Blastoise',
    number: '009',
    price_data: {
      preferred_source_prices: { trendPrice: 75.25 }
    }
  },
  {
    id: '4',
    name: 'Alakazam',
    number: '065',
    price_data: {
      preferred_source_prices: { trendPrice: 25.00 }
    }
  }
];

// Test sorting by number
const sortedByNumberAsc = sortCards(mockCards, 'number', 'asc');
console.log('Sorted by number (ascending):', sortedByNumberAsc.map(c => `${c.number} - ${c.name}`));

const sortedByNumberDesc = sortCards(mockCards, 'number', 'desc');
console.log('Sorted by number (descending):', sortedByNumberDesc.map(c => `${c.number} - ${c.name}`));

// Test sorting by name
const sortedByNameAsc = sortCards(mockCards, 'name', 'asc');
console.log('Sorted by name (ascending):', sortedByNameAsc.map(c => c.name));

const sortedByNameDesc = sortCards(mockCards, 'name', 'desc');
console.log('Sorted by name (descending):', sortedByNameDesc.map(c => c.name));

// Test sorting by price
const sortedByPriceAsc = sortCards(mockCards, 'price', 'asc');
console.log('Sorted by price (ascending):', sortedByPriceAsc.map(c => `${c.name} - $${c.price_data?.preferred_source_prices?.trendPrice}`));

const sortedByPriceDesc = sortCards(mockCards, 'price', 'desc');
console.log('Sorted by price (descending):', sortedByPriceDesc.map(c => `${c.name} - $${c.price_data?.preferred_source_prices?.trendPrice}`));

// Test no sorting
const noSort = sortCards(mockCards, null, 'asc');
console.log('No sorting (original order):', noSort.map(c => c.name));

export {}; // Make this a module