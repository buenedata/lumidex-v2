/**
 * API Route: Update Exchange Rates
 * 
 * This API route triggers the exchange rate update job.
 * Can be called manually or via cron/webhook.
 * 
 * POST /api/jobs/update-exchange-rates
 */

import { NextRequest, NextResponse } from 'next/server';
import { updateExchangeRates, healthCheckExchangeRates } from '@/lib/jobs/update-exchange-rates';

export async function POST(request: NextRequest) {
  try {
    // Optional: Add authentication/authorization here
    // const authHeader = request.headers.get('authorization');
    // if (!isAuthorized(authHeader)) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    console.log('Exchange rate update job triggered via API');
    
    const result = await updateExchangeRates();
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Exchange rates updated successfully',
        data: result
      }, { status: 200 });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Exchange rate update completed with errors',
        data: result
      }, { status: 207 }); // 207 Multi-Status for partial success
    }

  } catch (error) {
    console.error('Exchange rate update API error:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Exchange rate update failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('Exchange rate health check triggered via API');
    
    const healthStatus = await healthCheckExchangeRates();
    
    return NextResponse.json({
      success: true,
      message: 'Health check completed',
      data: healthStatus
    }, { 
      status: healthStatus.healthy ? 200 : 503 
    });

  } catch (error) {
    console.error('Exchange rate health check API error:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Health check failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}