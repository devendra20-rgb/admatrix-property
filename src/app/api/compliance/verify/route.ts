import { NextRequest, NextResponse } from 'next/server';
import { validateTrakheesiCompliance } from '@/lib/compliance-engine';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = validateTrakheesiCompliance(body);
    return NextResponse.json({ success: true, result });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Validation failed' }, { status: 400 });
  }
}
