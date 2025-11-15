import { NextResponse } from 'next/server'

export async function GET() {
  // Return empty array - ships will come from real data sources
  return NextResponse.json([])
}
