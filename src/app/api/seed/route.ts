import { NextResponse } from 'next/server';
import { ensureDbSeeded } from '@/lib/seed';

export async function GET() {
  const result = await ensureDbSeeded();
  return NextResponse.json(result);
}

export async function POST() {
  const result = await ensureDbSeeded();
  return NextResponse.json(result);
}
