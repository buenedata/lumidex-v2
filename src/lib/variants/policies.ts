// Set Policy Management System
// Handles CRUD operations for variant policies and exceptions

import { createClient } from '@/lib/supabase/server';
import type { 
  SetPolicy, 
  RarityMapping, 
  CardVariantException, 
  Era, 
  RarePolicy,
  UIVariantType 
} from '@/types/variants';

// Database row types
interface SetPolicyRow {
  set_id: string;
  has_standard_reverse: boolean;
  has_pokeball_reverse: boolean;
  has_masterball_reverse: boolean;
  has_first_edition: boolean;
  rare_policy: string;
  era: string;
  special_rules: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Input types for creating/updating policies
export interface CreateSetPolicyInput {
  setId: string;
  hasStandardReverse?: boolean;
  hasPokeballReverse?: boolean;
  hasMasterballReverse?: boolean;
  hasFirstEdition?: boolean;
  rarePolicy?: RarePolicy;
  era?: Era;
  specialRules?: Record<string, any>;
}

export interface UpdateSetPolicyInput extends Partial<CreateSetPolicyInput> {
  setId: string;
}

export interface CreateRarityMappingInput {
  rarity: string;
  era: Era;
  allowedVariants: UIVariantType[];
  forceVariants?: UIVariantType[];
  excludeVariants?: UIVariantType[];
}

export interface CreateCardExceptionInput {
  setId: string;
  cardNumber: string;
  exceptionType: 'force' | 'exclude' | 'override';
  variantChanges: Record<string, any>;
  reason?: string;
}

/**
 * Set Policy Management
 */
export class SetPolicyManager {
  /**
   * Get all set policies
   */
  static async getAllPolicies(): Promise<SetPolicy[]> {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('tcg_set_policies')
      .select('*')
      .order('set_id');
    
    if (error) {
      throw new Error(`Failed to fetch set policies: ${error.message}`);
    }
    
    return (data as SetPolicyRow[]).map(row => ({
      setId: row.set_id,
      hasStandardReverse: row.has_standard_reverse,
      hasPokeballReverse: row.has_pokeball_reverse,
      hasMasterballReverse: row.has_masterball_reverse,
      hasFirstEdition: row.has_first_edition,
      rarePolicy: row.rare_policy as RarePolicy,
      era: row.era as Era,
      specialRules: row.special_rules || {}
    }));
  }

  /**
   * Get policy for a specific set
   */
  static async getPolicy(setId: string): Promise<SetPolicy | null> {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('tcg_set_policies')
      .select('*')
      .eq('set_id', setId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        // No policy found
        return null;
      }
      throw new Error(`Failed to fetch set policy: ${error.message}`);
    }
    
    const row = data as SetPolicyRow;
    return {
      setId: row.set_id,
      hasStandardReverse: row.has_standard_reverse,
      hasPokeballReverse: row.has_pokeball_reverse,
      hasMasterballReverse: row.has_masterball_reverse,
      hasFirstEdition: row.has_first_edition,
      rarePolicy: row.rare_policy as RarePolicy,
      era: row.era as Era,
      specialRules: row.special_rules || {}
    };
  }

  /**
   * Create a new set policy
   */
  static async createPolicy(input: CreateSetPolicyInput): Promise<SetPolicy> {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('tcg_set_policies')
      .insert({
        set_id: input.setId,
        has_standard_reverse: input.hasStandardReverse ?? true,
        has_pokeball_reverse: input.hasPokeballReverse ?? false,
        has_masterball_reverse: input.hasMasterballReverse ?? false,
        has_first_edition: input.hasFirstEdition ?? false,
        rare_policy: input.rarePolicy ?? 'auto',
        era: input.era ?? 'Sword & Shield',
        special_rules: input.specialRules ?? {}
      })
      .select()
      .single();
    
    if (error) {
      throw new Error(`Failed to create set policy: ${error.message}`);
    }
    
    const row = data as SetPolicyRow;
    return {
      setId: row.set_id,
      hasStandardReverse: row.has_standard_reverse,
      hasPokeballReverse: row.has_pokeball_reverse,
      hasMasterballReverse: row.has_masterball_reverse,
      hasFirstEdition: row.has_first_edition,
      rarePolicy: row.rare_policy as RarePolicy,
      era: row.era as Era,
      specialRules: row.special_rules || {}
    };
  }

  /**
   * Update an existing set policy
   */
  static async updatePolicy(input: UpdateSetPolicyInput): Promise<SetPolicy> {
    const supabase = createClient();
    
    const updateData: Record<string, any> = {};
    if (input.hasStandardReverse !== undefined) updateData.has_standard_reverse = input.hasStandardReverse;
    if (input.hasPokeballReverse !== undefined) updateData.has_pokeball_reverse = input.hasPokeballReverse;
    if (input.hasMasterballReverse !== undefined) updateData.has_masterball_reverse = input.hasMasterballReverse;
    if (input.hasFirstEdition !== undefined) updateData.has_first_edition = input.hasFirstEdition;
    if (input.rarePolicy !== undefined) updateData.rare_policy = input.rarePolicy;
    if (input.era !== undefined) updateData.era = input.era;
    if (input.specialRules !== undefined) updateData.special_rules = input.specialRules;
    
    const { data, error } = await supabase
      .from('tcg_set_policies')
      .update(updateData)
      .eq('set_id', input.setId)
      .select()
      .single();
    
    if (error) {
      throw new Error(`Failed to update set policy: ${error.message}`);
    }
    
    const row = data as SetPolicyRow;
    return {
      setId: row.set_id,
      hasStandardReverse: row.has_standard_reverse,
      hasPokeballReverse: row.has_pokeball_reverse,
      hasMasterballReverse: row.has_masterball_reverse,
      hasFirstEdition: row.has_first_edition,
      rarePolicy: row.rare_policy as RarePolicy,
      era: row.era as Era,
      specialRules: row.special_rules || {}
    };
  }

  /**
   * Delete a set policy
   */
  static async deletePolicy(setId: string): Promise<void> {
    const supabase = createClient();
    
    const { error } = await supabase
      .from('tcg_set_policies')
      .delete()
      .eq('set_id', setId);
    
    if (error) {
      throw new Error(`Failed to delete set policy: ${error.message}`);
    }
  }

  /**
   * Get policies by era
   */
  static async getPoliciesByEra(era: Era): Promise<SetPolicy[]> {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('tcg_set_policies')
      .select('*')
      .eq('era', era)
      .order('set_id');
    
    if (error) {
      throw new Error(`Failed to fetch policies by era: ${error.message}`);
    }
    
    return (data as SetPolicyRow[]).map(row => ({
      setId: row.set_id,
      hasStandardReverse: row.has_standard_reverse,
      hasPokeballReverse: row.has_pokeball_reverse,
      hasMasterballReverse: row.has_masterball_reverse,
      hasFirstEdition: row.has_first_edition,
      rarePolicy: row.rare_policy as RarePolicy,
      era: row.era as Era,
      specialRules: row.special_rules || {}
    }));
  }

  /**
   * Bulk create policies for multiple sets
   */
  static async createBulkPolicies(policies: CreateSetPolicyInput[]): Promise<SetPolicy[]> {
    const supabase = createClient();
    
    const insertData = policies.map(policy => ({
      set_id: policy.setId,
      has_standard_reverse: policy.hasStandardReverse ?? true,
      has_pokeball_reverse: policy.hasPokeballReverse ?? false,
      has_masterball_reverse: policy.hasMasterballReverse ?? false,
      has_first_edition: policy.hasFirstEdition ?? false,
      rare_policy: policy.rarePolicy ?? 'auto',
      era: policy.era ?? 'modern',
      special_rules: policy.specialRules ?? {}
    }));
    
    const { data, error } = await supabase
      .from('tcg_set_policies')
      .insert(insertData)
      .select();
    
    if (error) {
      throw new Error(`Failed to create bulk policies: ${error.message}`);
    }
    
    return (data as SetPolicyRow[]).map(row => ({
      setId: row.set_id,
      hasStandardReverse: row.has_standard_reverse,
      hasPokeballReverse: row.has_pokeball_reverse,
      hasMasterballReverse: row.has_masterball_reverse,
      hasFirstEdition: row.has_first_edition,
      rarePolicy: row.rare_policy as RarePolicy,
      era: row.era as Era,
      specialRules: row.special_rules || {}
    }));
  }
}

/**
 * Rarity Mapping Management
 */
export class RarityMappingManager {
  /**
   * Get all rarity mappings
   */
  static async getAllMappings(): Promise<RarityMapping[]> {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('rarity_variant_mappings')
      .select('*')
      .order('era', { ascending: true })
      .order('rarity', { ascending: true });
    
    if (error) {
      throw new Error(`Failed to fetch rarity mappings: ${error.message}`);
    }
    
    return data.map(row => ({
      rarity: row.rarity,
      era: row.era as Era,
      allowedVariants: row.allowed_variants as UIVariantType[],
      forceVariants: row.force_variants as UIVariantType[],
      excludeVariants: row.exclude_variants as UIVariantType[]
    }));
  }

  /**
   * Get rarity mappings for specific era
   */
  static async getMappingsByEra(era: Era): Promise<RarityMapping[]> {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('rarity_variant_mappings')
      .select('*')
      .eq('era', era)
      .order('rarity');
    
    if (error) {
      throw new Error(`Failed to fetch rarity mappings: ${error.message}`);
    }
    
    return data.map(row => ({
      rarity: row.rarity,
      era: row.era as Era,
      allowedVariants: row.allowed_variants as UIVariantType[],
      forceVariants: row.force_variants as UIVariantType[],
      excludeVariants: row.exclude_variants as UIVariantType[]
    }));
  }

  /**
   * Create a new rarity mapping
   */
  static async createMapping(input: CreateRarityMappingInput): Promise<RarityMapping> {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('rarity_variant_mappings')
      .insert({
        rarity: input.rarity,
        era: input.era,
        allowed_variants: input.allowedVariants,
        force_variants: input.forceVariants ?? [],
        exclude_variants: input.excludeVariants ?? []
      })
      .select()
      .single();
    
    if (error) {
      throw new Error(`Failed to create rarity mapping: ${error.message}`);
    }
    
    return {
      rarity: data.rarity,
      era: data.era as Era,
      allowedVariants: data.allowed_variants as UIVariantType[],
      forceVariants: data.force_variants as UIVariantType[],
      excludeVariants: data.exclude_variants as UIVariantType[]
    };
  }

  /**
   * Update a rarity mapping
   */
  static async updateMapping(
    rarity: string, 
    era: Era, 
    input: Partial<CreateRarityMappingInput>
  ): Promise<RarityMapping> {
    const supabase = createClient();
    
    const updateData: Record<string, any> = {};
    if (input.allowedVariants !== undefined) updateData.allowed_variants = input.allowedVariants;
    if (input.forceVariants !== undefined) updateData.force_variants = input.forceVariants;
    if (input.excludeVariants !== undefined) updateData.exclude_variants = input.excludeVariants;
    
    const { data, error } = await supabase
      .from('rarity_variant_mappings')
      .update(updateData)
      .eq('rarity', rarity)
      .eq('era', era)
      .select()
      .single();
    
    if (error) {
      throw new Error(`Failed to update rarity mapping: ${error.message}`);
    }
    
    return {
      rarity: data.rarity,
      era: data.era as Era,
      allowedVariants: data.allowed_variants as UIVariantType[],
      forceVariants: data.force_variants as UIVariantType[],
      excludeVariants: data.exclude_variants as UIVariantType[]
    };
  }

  /**
   * Delete a rarity mapping
   */
  static async deleteMapping(rarity: string, era: Era): Promise<void> {
    const supabase = createClient();
    
    const { error } = await supabase
      .from('rarity_variant_mappings')
      .delete()
      .eq('rarity', rarity)
      .eq('era', era);
    
    if (error) {
      throw new Error(`Failed to delete rarity mapping: ${error.message}`);
    }
  }
}

/**
 * Card Exception Management
 */
export class CardExceptionManager {
  /**
   * Get all exceptions for a set
   */
  static async getSetExceptions(setId: string): Promise<CardVariantException[]> {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('card_variant_exceptions')
      .select('*')
      .eq('set_id', setId)
      .order('card_number');
    
    if (error) {
      throw new Error(`Failed to fetch card exceptions: ${error.message}`);
    }
    
    return data.map(row => ({
      setId: row.set_id,
      cardNumber: row.card_number,
      exceptionType: row.exception_type as 'force' | 'exclude' | 'override',
      variantChanges: row.variant_changes,
      reason: row.reason || undefined
    }));
  }

  /**
   * Get exceptions for a specific card
   */
  static async getCardExceptions(setId: string, cardNumber: string): Promise<CardVariantException[]> {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('card_variant_exceptions')
      .select('*')
      .eq('set_id', setId)
      .eq('card_number', cardNumber);
    
    if (error) {
      throw new Error(`Failed to fetch card exceptions: ${error.message}`);
    }
    
    return data.map(row => ({
      setId: row.set_id,
      cardNumber: row.card_number,
      exceptionType: row.exception_type as 'force' | 'exclude' | 'override',
      variantChanges: row.variant_changes,
      reason: row.reason || undefined
    }));
  }

  /**
   * Create a new card exception
   */
  static async createException(input: CreateCardExceptionInput): Promise<CardVariantException> {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('card_variant_exceptions')
      .insert({
        set_id: input.setId,
        card_number: input.cardNumber,
        exception_type: input.exceptionType,
        variant_changes: input.variantChanges,
        reason: input.reason
      })
      .select()
      .single();
    
    if (error) {
      throw new Error(`Failed to create card exception: ${error.message}`);
    }
    
    return {
      setId: data.set_id,
      cardNumber: data.card_number,
      exceptionType: data.exception_type as 'force' | 'exclude' | 'override',
      variantChanges: data.variant_changes,
      reason: data.reason || undefined
    };
  }

  /**
   * Update a card exception
   */
  static async updateException(
    setId: string, 
    cardNumber: string, 
    exceptionType: string,
    input: Partial<CreateCardExceptionInput>
  ): Promise<CardVariantException> {
    const supabase = createClient();
    
    const updateData: Record<string, any> = {};
    if (input.variantChanges !== undefined) updateData.variant_changes = input.variantChanges;
    if (input.reason !== undefined) updateData.reason = input.reason;
    
    const { data, error } = await supabase
      .from('card_variant_exceptions')
      .update(updateData)
      .eq('set_id', setId)
      .eq('card_number', cardNumber)
      .eq('exception_type', exceptionType)
      .select()
      .single();
    
    if (error) {
      throw new Error(`Failed to update card exception: ${error.message}`);
    }
    
    return {
      setId: data.set_id,
      cardNumber: data.card_number,
      exceptionType: data.exception_type as 'force' | 'exclude' | 'override',
      variantChanges: data.variant_changes,
      reason: data.reason || undefined
    };
  }

  /**
   * Delete a card exception
   */
  static async deleteException(
    setId: string, 
    cardNumber: string, 
    exceptionType: string
  ): Promise<void> {
    const supabase = createClient();
    
    const { error } = await supabase
      .from('card_variant_exceptions')
      .delete()
      .eq('set_id', setId)
      .eq('card_number', cardNumber)
      .eq('exception_type', exceptionType);
    
    if (error) {
      throw new Error(`Failed to delete card exception: ${error.message}`);
    }
  }

  /**
   * Bulk create exceptions for multiple cards
   */
  static async createBulkExceptions(exceptions: CreateCardExceptionInput[]): Promise<CardVariantException[]> {
    const supabase = createClient();
    
    const insertData = exceptions.map(exception => ({
      set_id: exception.setId,
      card_number: exception.cardNumber,
      exception_type: exception.exceptionType,
      variant_changes: exception.variantChanges,
      reason: exception.reason
    }));
    
    const { data, error } = await supabase
      .from('card_variant_exceptions')
      .insert(insertData)
      .select();
    
    if (error) {
      throw new Error(`Failed to create bulk exceptions: ${error.message}`);
    }
    
    return data.map(row => ({
      setId: row.set_id,
      cardNumber: row.card_number,
      exceptionType: row.exception_type as 'force' | 'exclude' | 'override',
      variantChanges: row.variant_changes,
      reason: row.reason || undefined
    }));
  }
}

/**
 * Utility functions for common policy operations
 */
export class PolicyUtils {
  /**
   * Get or create a default policy for a set
   */
  static async getOrCreateDefaultPolicy(setId: string, era: Era = 'Sword & Shield'): Promise<SetPolicy> {
    const existing = await SetPolicyManager.getPolicy(setId);
    if (existing) {
      return existing;
    }
    
    // Create default policy based on era
    const defaultPolicy: CreateSetPolicyInput = {
      setId,
      era,
      hasStandardReverse: true,
      hasPokeballReverse: era === 'Scarlet & Violet',
      hasMasterballReverse: false,
      hasFirstEdition: era === 'WotC',
      rarePolicy: era === 'Scarlet & Violet' ? 'auto' : 'allow_normal'
    };
    
    return SetPolicyManager.createPolicy(defaultPolicy);
  }

  /**
   * Initialize default rarity mappings for an era
   */
  static async initializeDefaultRarityMappings(era: Era): Promise<RarityMapping[]> {
    const existing = await RarityMappingManager.getMappingsByEra(era);
    if (existing.length > 0) {
      return existing;
    }
    
    // Define default mappings based on era
    const defaultMappings = getDefaultRarityMappings(era);
    const createdMappings: RarityMapping[] = [];
    
    for (const mapping of defaultMappings) {
      try {
        const created = await RarityMappingManager.createMapping(mapping);
        createdMappings.push(created);
      } catch (error) {
        console.error(`Failed to create mapping for ${mapping.rarity}:`, error);
      }
    }
    
    return createdMappings;
  }
}

/**
 * Get default rarity mappings for an era
 */
function getDefaultRarityMappings(era: Era): CreateRarityMappingInput[] {
  switch (era) {
    case 'Scarlet & Violet':
      return [
        { rarity: 'Common', era, allowedVariants: ['normal', 'reverse_holo_standard'] },
        { rarity: 'Uncommon', era, allowedVariants: ['normal', 'reverse_holo_standard'] },
        { rarity: 'Rare', era, allowedVariants: ['holo', 'reverse_holo_standard'], forceVariants: ['holo'] },
        { rarity: 'Double Rare', era, allowedVariants: ['holo'], forceVariants: ['holo'] },
        { rarity: 'Ultra Rare', era, allowedVariants: ['holo'], forceVariants: ['holo'] },
        { rarity: 'Special Illustration Rare', era, allowedVariants: ['holo'], forceVariants: ['holo'] },
        { rarity: 'Hyper Rare', era, allowedVariants: ['holo'], forceVariants: ['holo'] },
        { rarity: 'ACE SPEC Rare', era, allowedVariants: ['holo'], forceVariants: ['holo'] }
      ];
      
    case 'Sword & Shield':
    case 'Sun & Moon':
    case 'XY':
    case 'Black & White':
    case 'HGSS':
    case 'DP':
    case 'EX':
      return [
        { rarity: 'Common', era, allowedVariants: ['normal', 'reverse_holo_standard'] },
        { rarity: 'Uncommon', era, allowedVariants: ['normal', 'reverse_holo_standard'] },
        { rarity: 'Rare', era, allowedVariants: ['normal', 'holo', 'reverse_holo_standard'] },
        { rarity: 'Rare Holo', era, allowedVariants: ['holo', 'reverse_holo_standard'], forceVariants: ['holo'] },
        { rarity: 'Ultra Rare', era, allowedVariants: ['holo'], forceVariants: ['holo'] },
        { rarity: 'Secret Rare', era, allowedVariants: ['holo'], forceVariants: ['holo'] }
      ];
      
    case 'WotC':
      return [
        { rarity: 'Common', era, allowedVariants: ['normal', 'first_edition'] },
        { rarity: 'Uncommon', era, allowedVariants: ['normal', 'first_edition'] },
        { rarity: 'Rare', era, allowedVariants: ['normal', 'holo', 'first_edition'] },
        { rarity: 'Rare Holo', era, allowedVariants: ['holo', 'first_edition'], forceVariants: ['holo'] }
      ];
      
    default:
      return [];
  }
}