import { NextResponse } from 'next/server'
import { mockInfrastructure } from '../../lib/mockData'

export async function GET() {
  return NextResponse.json(mockInfrastructure)
}
