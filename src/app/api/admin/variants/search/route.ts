import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAccess } from '@/lib/admin/auth';
import { CustomVariantManager } from '@/lib/admin/custom-variants';
import type { AdminCardSearchFilters } from '@/types/custom-variants';

/**
 * GET /api/admin/variants/search
 * Search cards for admin variant management
 */
export async function GET(request: NextRequest) {
  try {
    // Check admin access
    const { isAdmin } = await checkAdminAccess();
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const filters: AdminCardSearchFilters = {};

    // Parse search parameters
    const query = searchParams.get('query');
    if (query) filters.query = query;

    const setId = searchParams.get('set_id');
    if (setId) filters.set_id = setId;

    const rarity = searchParams.get('rarity');
    if (rarity) filters.rarity = rarity;

    const hasCustomVariants = searchParams.get('has_custom_variants');
    if (hasCustomVariants !== null) {
      filters.has_custom_variants = hasCustomVariants === 'true';
    }

    const results = await CustomVariantManager.searchCards(filters);

    return NextResponse.json({
      success: true,
      data: results
    });

  } catch (error) {
    console.error('Error in admin variant search:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}