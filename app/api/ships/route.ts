import { NextResponse } from 'next/server';
import { getDb, closeDb } from '../../../data_sources/ais/db/db';
import { getVesselClassification, getFlagFromMMSI } from '../../../app/lib/utils';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dataSource = searchParams.get('dataSource') || 'real';

  try {
    if (dataSource === 'synthetic') {
      // Return empty array for synthetic - synthetic data comes from trajectory endpoint
      return NextResponse.json([]);
    }

    // Query real data from postgres
    const db = getDb();

    // Get the most recent position report for each MMSI, joined with ship metadata
    const ships = await db`
      SELECT DISTINCT ON (pr.mmsi)
        pr.mmsi,
        COALESCE(sm.ship_name, o.object_name, 'Unknown') as ship_name,
        ST_Y(pr.location) as latitude,
        ST_X(pr.location) as longitude,
        pr.sog as velocity,
        pr.time_utc as last_position_time,
        pr.cog as course,
        sm.ship_type
      FROM position_reports pr
      JOIN object o ON pr.object_id = o.id
      LEFT JOIN ship_metadata sm ON pr.mmsi = sm.mmsi
      WHERE pr.time_utc >= NOW() - INTERVAL '24 hours'
        AND (
          sm.ship_type IS NULL
          OR NOT (
            sm.ship_type IN (0, 38, 39, 99)
            OR sm.ship_type BETWEEN 1 AND 19
          )
        )
      ORDER BY pr.mmsi, pr.time_utc DESC
    `;

    // Transform to Ship format
    const transformedShips = ships.map((ship: any, index: number) => ({
      id: index + 1,
      mmsi: ship.mmsi.toString(),
      name: ship.ship_name || 'Unknown',
      flag: getFlagFromMMSI(ship.mmsi),
      origin: 'Unknown',
      destination: 'Unknown',
      lat: parseFloat(ship.latitude) || 0,
      long: parseFloat(ship.longitude) || 0,
      velocity: parseFloat(ship.velocity) || 0,
      risk_percentage: 0,
      last_position_time:
        ship.last_position_time?.toISOString() || new Date().toISOString(),
      data_source: 'AIS' as const,
      classification: getVesselClassification(ship.ship_type),
    }));

    return NextResponse.json(transformedShips);
  } catch (error) {
    console.error('Error fetching ships:', error);
    // Return empty array on error
    return NextResponse.json([]);
  } finally {
    try {
      await closeDb();
    } catch (closeError) {
      console.error('Error closing database:', closeError);
    }
  }
}
