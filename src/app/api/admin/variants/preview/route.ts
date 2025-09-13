import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAccess } from '@/lib/admin/auth';
import { CustomVariantManager } from '@/lib/admin/custom-variants';

/**
 * GET /api/admin/variants/preview?card_id=xxx
 * Preview how variants will appear for a card
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
    const cardId = searchParams.get('card_id');

    if (!cardId) {
      return NextResponse.json(
        { error: 'card_id parameter is required' },
        { status: 400 }
      );
    }

    const preview = await CustomVariantManager.previewVariants(cardId);

    return NextResponse.json({
      success: true,
      data: preview
    });

  } catch (error) {
    console.error('Error getting variant preview:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}