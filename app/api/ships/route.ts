import { NextResponse } from 'next/server';
import { getDb, closeDb } from '../../../data_sources/ais/db/db';
import { getVesselClassification, getFlagFromMMSI } from '../../../app/lib/utils';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dataSource = searchParams.get('dataSource') || 'real';
  
  // Get filter parameters
  const flag = searchParams.get('flag') || '';
  const shipName = searchParams.get('shipName') || '';
  const destination = searchParams.get('destination') || '';
  const classification = searchParams.get('classification') || '';
  const mmsi = searchParams.get('mmsi') || '';

  try {
    if (dataSource === 'synthetic') {
      // For synthetic data, read from file directly
      try {
        let fileContent: string;
        
        if (typeof Bun !== 'undefined') {
          const file = Bun.file('data_sources/ais/db_synthetic/synthetic_data.json');
          fileContent = await file.text();
        } else {
          const { readFile } = await import('fs/promises');
          const { join } = await import('path');
          const filePath = join(process.cwd(), 'data_sources', 'ais', 'db_synthetic', 'synthetic_data.json');
          fileContent = await readFile(filePath, 'utf-8');
        }
        
        const data = JSON.parse(fileContent);
        
        // Group trajectory points by MMSI and create ships
        const shipsMap = new Map<number, any>();
        data.forEach((item: any) => {
          const pointMmsi = item.MetaData?.MMSI;
          if (!pointMmsi || !item.MetaData?.latitude || !item.MetaData?.longitude) {
            return;
          }
          
          if (!shipsMap.has(pointMmsi)) {
            const shipFlag = getFlagFromMMSI(pointMmsi);
            const shipClassification = getVesselClassification(item.MetaData?.ship_type);
            
            shipsMap.set(pointMmsi, {
              id: pointMmsi,
              mmsi: pointMmsi.toString(),
              name: item.MetaData?.ship_name || 'Unknown',
              flag: shipFlag,
              origin: 'Unknown',
              destination: 'Unknown',
              lat: item.MetaData.latitude,
              long: item.MetaData.longitude,
              velocity: 0,
              risk_percentage: 0,
              last_position_time: item.MetaData.time_utc || new Date().toISOString(),
              data_source: 'AIS' as const,
              classification: shipClassification,
            });
          } else {
            // Update ship with latest position
            const ship = shipsMap.get(pointMmsi)!;
            if (item.MetaData.latitude && item.MetaData.longitude) {
              ship.lat = item.MetaData.latitude;
              ship.long = item.MetaData.longitude;
            }
            if (item.MetaData.time_utc) {
              ship.last_position_time = item.MetaData.time_utc;
            }
          }
        });
        
        let syntheticShips = Array.from(shipsMap.values());
        
        // Apply filters
        if (flag) {
          syntheticShips = syntheticShips.filter(s => s.flag === flag);
        }
        if (shipName) {
          const nameLower = shipName.toLowerCase();
          syntheticShips = syntheticShips.filter(s => s.name.toLowerCase().includes(nameLower));
        }
        if (destination) {
          syntheticShips = syntheticShips.filter(s => s.destination === destination);
        }
        if (classification) {
          syntheticShips = syntheticShips.filter(s => s.classification === classification);
        }
        if (mmsi) {
          syntheticShips = syntheticShips.filter(s => s.mmsi.includes(mmsi));
        }
        
        return NextResponse.json(syntheticShips);
      } catch (error) {
        console.error('Error fetching synthetic ships:', error);
      }
      return NextResponse.json([]);
    }

    // Query real data from postgres
    const db = getDb();

    // Get the most recent position report for each MMSI, joined with ship metadata
    // Apply MMSI filter in SQL if provided
    let ships;
    if (mmsi) {
      ships = await db`
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
        WHERE pr.time_utc >= NOW() - INTERVAL '1 hour'
          AND (sm.ship_type IS NULL OR NOT (sm.ship_type IN (0, 38, 39, 99) OR sm.ship_type BETWEEN 1 AND 19))
          AND pr.mmsi::text LIKE ${'%' + mmsi + '%'}
        ORDER BY pr.mmsi, pr.time_utc DESC
      `;
    } else {
      ships = await db`
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
        WHERE pr.time_utc >= NOW() - INTERVAL '6 hour'
          AND (sm.ship_type IS NULL OR NOT (sm.ship_type IN (0, 38, 39, 99) OR sm.ship_type BETWEEN 1 AND 19))
        ORDER BY pr.mmsi, pr.time_utc DESC
      `;
    }

    // Transform to Ship format
    let transformedShips = ships.map((ship: any, index: number) => ({
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

    // Apply remaining filters (flag, shipName, destination, classification)
    // These are applied in memory since they depend on computed values
    if (flag) {
      transformedShips = transformedShips.filter(s => s.flag === flag);
    }
    if (shipName) {
      const nameLower = shipName.toLowerCase();
      transformedShips = transformedShips.filter(s => s.name.toLowerCase().includes(nameLower));
    }
    if (destination) {
      transformedShips = transformedShips.filter(s => s.destination === destination);
    }
    if (classification) {
      transformedShips = transformedShips.filter(s => s.classification === classification);
    }

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
