import { NextResponse } from 'next/server'

export async function GET() {
  // Return empty array - alerts will be generated dynamically from trajectory animation
  return NextResponse.json([])
}
