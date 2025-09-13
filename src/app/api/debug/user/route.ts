import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({
        success: false,
        message: 'No user logged in',
        user: null,
        profile: null
      });
    }
    
    // Get user profile with preferences
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('username, preferred_currency, preferred_price_source')
      .eq('id', user.id)
      .single();
    
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email
      },
      profile: profile,
      error: error
    });
    
  } catch (error) {
    console.error('Error getting user debug info:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error
    });
  }
}