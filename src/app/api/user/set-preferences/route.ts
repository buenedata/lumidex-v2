import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/user/set-preferences
 * Get user's set preferences
 * 
 * Query params:
 * - setId: string (optional) - get preference for specific set
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Check authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const setId = searchParams.get('setId');

    let query = supabase
      .from('user_set_preferences')
      .select('*')
      .eq('user_id', user.id);

    if (setId) {
      query = query.eq('set_id', setId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching user set preferences:', error);
      return NextResponse.json(
        { error: 'Failed to fetch set preferences' },
        { status: 500 }
      );
    }

    // If specific setId requested, return single preference or default
    if (setId) {
      const preference = data?.[0];
      return NextResponse.json({
        success: true,
        data: {
          setId,
          isMasterSet: preference?.is_master_set || false,
          exists: !!preference
        }
      });
    }

    // Return all preferences
    return NextResponse.json({
      success: true,
      data: data.map(pref => ({
        setId: pref.set_id,
        isMasterSet: pref.is_master_set,
        createdAt: pref.created_at,
        updatedAt: pref.updated_at
      }))
    });

  } catch (error) {
    console.error('Error in set preferences GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user/set-preferences
 * Update user's set preference
 * 
 * Body:
 * {
 *   setId: string;
 *   isMasterSet: boolean;
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Check authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate request body
    if (!body.setId || typeof body.setId !== 'string') {
      return NextResponse.json(
        { error: 'setId is required and must be a string' },
        { status: 400 }
      );
    }

    if (typeof body.isMasterSet !== 'boolean') {
      return NextResponse.json(
        { error: 'isMasterSet is required and must be a boolean' },
        { status: 400 }
      );
    }

    // Verify that the set exists
    const { data: setData, error: setError } = await supabase
      .from('tcg_sets')
      .select('id')
      .eq('id', body.setId)
      .single();

    if (setError || !setData) {
      return NextResponse.json(
        { error: 'Set not found' },
        { status: 404 }
      );
    }

    // Upsert the preference
    const { data, error } = await supabase
      .from('user_set_preferences')
      .upsert({
        user_id: user.id,
        set_id: body.setId,
        is_master_set: body.isMasterSet
      }, {
        onConflict: 'user_id,set_id'
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating set preference:', error);
      return NextResponse.json(
        { error: 'Failed to update set preference' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        setId: data.set_id,
        isMasterSet: data.is_master_set,
        updatedAt: data.updated_at
      }
    });

  } catch (error) {
    console.error('Error in set preferences POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}