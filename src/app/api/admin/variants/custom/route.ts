import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAccess } from '@/lib/admin/auth';
import { CustomVariantManager } from '@/lib/admin/custom-variants';
import type { CreateCustomVariantInput, UpdateCustomVariantInput } from '@/types/custom-variants';

/**
 * GET /api/admin/variants/custom?card_id=xxx
 * Get custom variants for a card
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

    const variants = await CustomVariantManager.getCustomVariants(cardId);

    return NextResponse.json({
      success: true,
      data: variants
    });

  } catch (error) {
    console.error('Error getting custom variants:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/variants/custom
 * Create a new custom variant
 */
export async function POST(request: NextRequest) {
  try {
    // Check admin access
    const { isAdmin } = await checkAdminAccess();
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    
    // Validate required fields
    const requiredFields = ['card_id', 'variant_name', 'variant_type', 'display_name', 'description'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 }
        );
      }
    }

    const input: CreateCustomVariantInput = {
      card_id: body.card_id,
      variant_name: body.variant_name,
      variant_type: body.variant_type,
      display_name: body.display_name,
      description: body.description,
      source_product: body.source_product,
      price_usd: body.price_usd ? parseFloat(body.price_usd) : undefined,
      price_eur: body.price_eur ? parseFloat(body.price_eur) : undefined,
      replaces_standard_variant: body.replaces_standard_variant
    };

    const variant = await CustomVariantManager.createCustomVariant(input);

    return NextResponse.json({
      success: true,
      data: variant
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating custom variant:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/variants/custom?id=xxx
 * Update a custom variant
 */
export async function PUT(request: NextRequest) {
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
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'id parameter is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    
    const input: UpdateCustomVariantInput = {
      variant_name: body.variant_name,
      variant_type: body.variant_type,
      display_name: body.display_name,
      description: body.description,
      source_product: body.source_product,
      price_usd: body.price_usd ? parseFloat(body.price_usd) : undefined,
      price_eur: body.price_eur ? parseFloat(body.price_eur) : undefined,
      replaces_standard_variant: body.replaces_standard_variant,
      is_active: body.is_active
    };

    const variant = await CustomVariantManager.updateCustomVariant(parseInt(id), input);

    return NextResponse.json({
      success: true,
      data: variant
    });

  } catch (error) {
    console.error('Error updating custom variant:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/variants/custom?id=xxx
 * Delete a custom variant
 */
export async function DELETE(request: NextRequest) {
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
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'id parameter is required' },
        { status: 400 }
      );
    }

    await CustomVariantManager.deleteCustomVariant(parseInt(id));

    return NextResponse.json({
      success: true,
      message: 'Custom variant deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting custom variant:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}