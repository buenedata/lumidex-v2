/**
 * Era Detection and Mapping Logic
 * 
 * Maps Pokemon TCG sets to their respective eras based on set.series and releaseDate.
 * Based on filesforinspiration/variant-rule-engine/era-mapping.ts
 */

import type { Era, CardInput } from '@/types/card-variants';

/**
 * Series-based era mapping (primary detection method)
 */
const SERIES_ERA_MAP: Record<string, Era> = {
  // WotC Era (1998-2003)
  "Base": "WotC",
  "Jungle": "WotC", 
  "Fossil": "WotC",
  "Team Rocket": "WotC",
  "Gym Heroes": "WotC",
  "Gym Challenge": "WotC",
  "Neo Genesis": "WotC",
  "Neo Discovery": "WotC", 
  "Neo Revelation": "WotC",
  "Neo Destiny": "WotC",
  "Legendary Collection": "WotC",
  "Expedition Base Set": "WotC",
  "Aquapolis": "WotC",
  "Skyridge": "WotC",
  
  // EX Era (2003-2007)
  "Ruby & Sapphire": "EX",
  "Sandstorm": "EX",
  "Dragon": "EX",
  "Team Magma vs Team Aqua": "EX",
  "Hidden Legends": "EX",
  "FireRed & LeafGreen": "EX",
  "Team Rocket Returns": "EX",
  "Deoxys": "EX",
  "Emerald": "EX",
  "Unseen Forces": "EX",
  "Delta Species": "EX",
  "Legend Maker": "EX",
  "Holon Phantoms": "EX",
  "Crystal Guardians": "EX",
  "Dragon Frontiers": "EX",
  "Power Keepers": "EX",
  
  // DP Era (2007-2009)
  "Diamond & Pearl": "DP",
  "Mysterious Treasures": "DP",
  "Secret Wonders": "DP",
  "Great Encounters": "DP",
  "Majestic Dawn": "DP",
  "Legends Awakened": "DP",
  "Stormfront": "DP",
  "Platinum": "DP",
  "Rising Rivals": "DP",
  "Supreme Victors": "DP",
  "Arceus": "DP",
  
  // HGSS Era (2010-2011)
  "HeartGold & SoulSilver": "HGSS",
  "HS—Unleashed": "HGSS",
  "HS—Undaunted": "HGSS",
  "HS—Triumphant": "HGSS",
  "Call of Legends": "HGSS",
  
  // Black & White Era (2011-2013)
  "Black & White": "Black & White",
  "Emerging Powers": "Black & White",
  "Noble Victories": "Black & White",
  "Next Destinies": "Black & White",
  "Dark Explorers": "Black & White",
  "Dragons Exalted": "Black & White",
  "Dragon Vault": "Black & White",
  "Boundaries Crossed": "Black & White",
  "Plasma Storm": "Black & White",
  "Plasma Freeze": "Black & White",
  "Plasma Blast": "Black & White",
  "Legendary Treasures": "Black & White",
  
  // XY Era (2014-2016)
  "XY": "XY",
  "Flashfire": "XY",
  "Furious Fists": "XY",
  "Phantom Forces": "XY",
  "Primal Clash": "XY",
  "Roaring Skies": "XY",
  "Ancient Origins": "XY",
  "BREAKthrough": "XY",
  "BREAKpoint": "XY",
  "Generations": "XY",
  "Fates Collide": "XY",
  "Steam Siege": "XY",
  "Evolutions": "XY",
  
  // Sun & Moon Era (2017-2019)
  "Sun & Moon": "Sun & Moon",
  "Guardians Rising": "Sun & Moon",
  "Burning Shadows": "Sun & Moon",
  "Crimson Invasion": "Sun & Moon",
  "Ultra Prism": "Sun & Moon",
  "Forbidden Light": "Sun & Moon",
  "Celestial Storm": "Sun & Moon",
  "Dragon Majesty": "Sun & Moon",
  "Lost Thunder": "Sun & Moon",
  "Team Up": "Sun & Moon",
  "Detective Pikachu": "Sun & Moon",
  "Unbroken Bonds": "Sun & Moon",
  "Unified Minds": "Sun & Moon",
  "Hidden Fates": "Sun & Moon",
  "Cosmic Eclipse": "Sun & Moon",
  
  // Sword & Shield Era (2020-2022)
  "Sword & Shield": "Sword & Shield",
  "Rebel Clash": "Sword & Shield",
  "Darkness Ablaze": "Sword & Shield",
  "Champion's Path": "Sword & Shield",
  "Vivid Voltage": "Sword & Shield",
  "Shining Fates": "Sword & Shield",
  "Battle Styles": "Sword & Shield",
  "Chilling Reign": "Sword & Shield",
  "Evolving Skies": "Sword & Shield",
  "Celebrations": "Sword & Shield",
  "Fusion Strike": "Sword & Shield",
  "Brilliant Stars": "Sword & Shield",
  "Astral Radiance": "Sword & Shield",
  "Pokémon GO": "Sword & Shield",
  "Lost Origin": "Sword & Shield",
  "Silver Tempest": "Sword & Shield",
  "Crown Zenith": "Sword & Shield",
  
  // Scarlet & Violet Era (2023-Present)
  "Scarlet & Violet": "Scarlet & Violet",
  "Paldea Evolved": "Scarlet & Violet",
  "Obsidian Flames": "Scarlet & Violet",
  "151": "Scarlet & Violet",
  "Paradox Rift": "Scarlet & Violet",
  "Paldean Fates": "Scarlet & Violet",
  "Temporal Forces": "Scarlet & Violet",
  "Twilight Masquerade": "Scarlet & Violet",
  "Shrouded Fable": "Scarlet & Violet",
  "Stellar Crown": "Scarlet & Violet",
  "Surging Sparks": "Scarlet & Violet"
};

/**
 * Set ID specific overrides for special cases
 */
const SET_ID_ERA_OVERRIDES: Record<string, Era> = {
  // Special sets that don't follow normal series naming
  "cel25": "Sword & Shield",     // Celebrations (technically S&S era)
  "mcd19": "Sun & Moon",         // McDonald's 2019 (S&M era promo)
  "tk1a": "XY",                  // XY Trainer Kit Latias
  "tk1b": "XY",                  // XY Trainer Kit Latios
  "sv3pt5": "Scarlet & Violet",  // 151 set (S&V era)
  "sv8pt5": "Scarlet & Violet",  // Prismatic Evolutions (S&V era)
  
  // Promo sets by era
  "sve": "Scarlet & Violet",     // S&V English Promos
  "swshp": "Sword & Shield",     // S&S English Promos  
  "smp": "Sun & Moon",           // S&M English Promos
  "xyp": "XY",                   // XY English Promos
  "bwp": "Black & White",        // B&W English Promos
  "hsp": "HGSS",                 // HGSS English Promos
  "dpp": "DP",                   // DP English Promos
  
  // Japanese sets (if needed for reference)
  "s1a": "Sword & Shield",       // VMAX Rising
  "s4a": "Sword & Shield",       // Shiny Star V
};

/**
 * Date-based era detection (fallback method)
 */
function getEraByDate(releaseDate: string): Era {
  const date = new Date(releaseDate);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  
  // Use precise transition dates
  if (year >= 2023) return "Scarlet & Violet";
  if (year >= 2020) return "Sword & Shield";
  if (year >= 2017) return "Sun & Moon";
  if (year >= 2014) return "XY";
  if (year >= 2011 || (year === 2011 && month >= 4)) return "Black & White";
  if (year >= 2010) return "HGSS";
  if (year >= 2007) return "DP";
  if (year >= 2003 || (year === 2003 && month >= 7)) return "EX";
  
  return "WotC";
}

/**
 * Main era detection function
 */
export function detectEra(card: CardInput): Era {
  const { set } = card;
  
  // Try series-based detection first (most reliable)
  if (SERIES_ERA_MAP[set.series]) {
    return SERIES_ERA_MAP[set.series];
  }
  
  // Check set ID overrides for special cases
  if (SET_ID_ERA_OVERRIDES[set.id.toLowerCase()]) {
    return SET_ID_ERA_OVERRIDES[set.id.toLowerCase()];
  }
  
  // Fall back to date-based detection
  return getEraByDate(set.releaseDate);
}

/**
 * Check if set supports reverse holo by default
 */
export function hasReverseHoloDefault(era: Era, releaseDate: string): boolean {
  // Special case: Legendary Collection introduced reverse holo in WotC era
  if (era === "WotC") {
    const date = new Date(releaseDate);
    const legendaryCollectionDate = new Date("2002/05/24");
    return date >= legendaryCollectionDate;
  }
  
  // All eras from EX onward have reverse holo by default
  return true;
}

/**
 * Check if era supports 1st Edition variants
 */
export function has1stEditionVariants(era: Era): boolean {
  return era === "WotC";
}

/**
 * Check if this is Scarlet & Violet era with single-star rare holo rule
 */
export function isScarletVioletSingleStarHolo(era: Era, rarity: string): boolean {
  return era === "Scarlet & Violet" && rarity === "Rare";
}

/**
 * Check if set/era combination supports special pattern variants
 */
export function hasSpecialPatterns(era: Era, setId: string): boolean {
  // Special sets with pattern variants (Pokeball, Masterball)
  const specialSets = ["sv8pt5", "zsv10pt5", "rsv10pt5"]; // Prismatic Evolutions, Black Bolt, White Flare
  return specialSets.includes(setId.toLowerCase());
}

/**
 * Get era transition dates for debugging/validation
 */
export function getEraTransitionDates(): Record<Era, { start: string; end?: string }> {
  return {
    "WotC": { start: "1998/10/20", end: "2003/07/17" },
    "EX": { start: "2003/07/18", end: "2007/04/30" },
    "DP": { start: "2007/05/01", end: "2010/02/09" },
    "HGSS": { start: "2010/02/10", end: "2011/04/24" },
    "Black & White": { start: "2011/04/25", end: "2014/02/04" },
    "XY": { start: "2014/02/05", end: "2017/02/02" },
    "Sun & Moon": { start: "2017/02/03", end: "2020/02/06" },
    "Sword & Shield": { start: "2020/02/07", end: "2023/03/30" },
    "Scarlet & Violet": { start: "2023/03/31" }
  };
}

/**
 * Check if set supports Pokeball pattern variants
 */
export function hasPokeballPattern(era: Era, setId: string): boolean {
  return hasSpecialPatterns(era, setId);
}

/**
 * Check if set supports Masterball pattern variants
 */
export function hasMasterballPattern(era: Era, setId: string): boolean {
  return hasSpecialPatterns(era, setId);
}