import { NextResponse } from 'next/server';
import { getRecentSetsByTCGType, getSeriesByTCGType } from '@/lib/db/queries';

export async function GET() {
  try {
    // Fetch recent sets and series data in parallel
    const [recentSets, seriesByTCG] = await Promise.all([
      getRecentSetsByTCGType(6), // Get 6 recent sets per TCG type
      getSeriesByTCGType()
    ]);

    return NextResponse.json({
      recentSets,
      seriesByTCG
    });
  } catch (error) {
    console.error('Error fetching megamenu data:', error);
    return NextResponse.json(
      { error: 'Failed to load megamenu data' },
      { status: 500 }
    );
  }
}