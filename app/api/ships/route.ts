import { NextResponse } from 'next/server'
import { mockShips } from '../../lib/mockData'

export async function GET() {
  return NextResponse.json(mockShips)
}
