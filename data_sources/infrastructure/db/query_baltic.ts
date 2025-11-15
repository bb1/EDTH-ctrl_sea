#!/usr/bin/env bun

/**
 * Query script to find internet cable infrastructure in the Baltic region
 * 
 * Baltic Sea region boundaries:
 * - Latitude: 53°N to 66°N
 * - Longitude: 10°E to 30°E
 * 
 * Usage: bun data_sources/infrastructure/db/query_baltic.ts
 */

import { getDb, closeDb } from './db';

// Baltic Sea region boundaries
const BALTIC_MIN_LAT = 53.0;
const BALTIC_MAX_LAT = 66.0;
const BALTIC_MIN_LON = 10.0;
const BALTIC_MAX_LON = 30.0;

async function queryBalticInfrastructure() {
  console.log('='.repeat(80));
  console.log('🌊 QUERYING BALTIC REGION INFRASTRUCTURE');
  console.log('='.repeat(80));
  console.log(`Region: ${BALTIC_MIN_LAT}°N to ${BALTIC_MAX_LAT}°N, ${BALTIC_MIN_LON}°E to ${BALTIC_MAX_LON}°E\n`);

  try {
    const db = getDb();

    // Query 1: Cables with representative points in Baltic region
    console.log('─'.repeat(80));
    console.log('📍 Cables with representative points in Baltic region:');
    console.log('─'.repeat(80));
    
    const cablesByRepPoint = await db`
      SELECT 
        id,
        cable_id,
        name,
        color,
        representative_latitude,
        representative_longitude,
        created_at
      FROM infrastructure
      WHERE representative_latitude BETWEEN ${BALTIC_MIN_LAT} AND ${BALTIC_MAX_LAT}
        AND representative_longitude BETWEEN ${BALTIC_MIN_LON} AND ${BALTIC_MAX_LON}
      ORDER BY name
    `;

    console.log(`Found ${cablesByRepPoint.length} cables with representative points in Baltic region:\n`);
    
    if (cablesByRepPoint.length > 0) {
      cablesByRepPoint.forEach((cable, idx) => {
        console.log(`${idx + 1}. ${cable.name} (${cable.cable_id})`);
        console.log(`   Location: ${cable.representative_latitude.toFixed(4)}°N, ${cable.representative_longitude.toFixed(4)}°E`);
        console.log(`   Color: ${cable.color || 'N/A'}`);
        console.log();
      });
    } else {
      console.log('No cables found with representative points in this region.\n');
    }

    // Query 2: Cables with segments that pass through Baltic region
    // This is more comprehensive as it checks actual cable paths, not just representative points
    console.log('─'.repeat(80));
    console.log('🔍 Cables with segments passing through Baltic region:');
    console.log('─'.repeat(80));
    
    // Fetch all segments and filter in JavaScript to avoid JSONB query complexity
    const allSegments = await db`
      SELECT 
        iseg.id,
        iseg.cable_id,
        iseg.segment_index,
        iseg.coordinates,
        i.cable_id as cable_id_string,
        i.name,
        i.color,
        i.representative_latitude,
        i.representative_longitude
      FROM infrastructure_segments iseg
      JOIN infrastructure i ON iseg.cable_id = i.id
      ORDER BY i.name, iseg.segment_index
    `;

    // Filter segments that have points in Baltic region
    const cablesWithBalticSegments = new Map<string, {
      id: number;
      cable_id: string;
      name: string;
      color: string | null;
      representative_latitude: number | null;
      representative_longitude: number | null;
      segment_count: number;
      segments: Array<{ segment_index: number; points_in_baltic: number }>;
    }>();

    for (const segment of allSegments) {
      // Parse coordinates - they may be stored as JSON string or already parsed
      let coords: number[][];
      if (typeof segment.coordinates === 'string') {
        try {
          coords = JSON.parse(segment.coordinates);
        } catch (e) {
          continue; // Skip invalid JSON
        }
      } else {
        coords = segment.coordinates as number[][];
      }
      
      if (!Array.isArray(coords)) continue;
      
      const pointsInBaltic = coords.filter((point: number[]) => {
        if (!Array.isArray(point) || point.length < 2) return false;
        const lon = Number(point[0]);
        const lat = Number(point[1]);
        return !isNaN(lon) && !isNaN(lat) &&
               lon >= BALTIC_MIN_LON && lon <= BALTIC_MAX_LON &&
               lat >= BALTIC_MIN_LAT && lat <= BALTIC_MAX_LAT;
      });

      if (pointsInBaltic.length > 0) {
        const cableId = segment.cable_id_string as string;
        if (!cablesWithBalticSegments.has(cableId)) {
          cablesWithBalticSegments.set(cableId, {
            id: segment.cable_id as number,
            cable_id: cableId,
            name: segment.name as string,
            color: segment.color as string | null,
            representative_latitude: segment.representative_latitude as number | null,
            representative_longitude: segment.representative_longitude as number | null,
            segment_count: 0,
            segments: []
          });
        }
        
        const cable = cablesWithBalticSegments.get(cableId)!;
        cable.segment_count++;
        cable.segments.push({
          segment_index: segment.segment_index as number,
          points_in_baltic: pointsInBaltic.length
        });
      }
    }

    const cablesBySegments = Array.from(cablesWithBalticSegments.values())
      .sort((a, b) => a.name.localeCompare(b.name));

    console.log(`Found ${cablesBySegments.length} cables with segments passing through Baltic region:\n`);
    
    if (cablesBySegments.length > 0) {
      cablesBySegments.forEach((cable, idx) => {
        console.log(`${idx + 1}. ${cable.name} (${cable.cable_id})`);
        console.log(`   Representative point: ${cable.representative_latitude?.toFixed(4) || 'N/A'}°N, ${cable.representative_longitude?.toFixed(4) || 'N/A'}°E`);
        console.log(`   Segments in region: ${cable.segment_count}`);
        console.log(`   Color: ${cable.color || 'N/A'}`);
        console.log();
      });

      // Show detailed segment information for the first 3 cables
      console.log('─'.repeat(80));
      console.log('📊 Detailed segment information (first 3 cables):');
      console.log('─'.repeat(80));
      
      for (let i = 0; i < Math.min(3, cablesBySegments.length); i++) {
        const cable = cablesBySegments[i];
        console.log(`\n${i + 1}. ${cable.name} (${cable.cable_id}):`);
        console.log(`   Total segments in Baltic region: ${cable.segment_count}`);
        cable.segments.slice(0, 5).forEach(seg => {
          console.log(`   Segment ${seg.segment_index}: ${seg.points_in_baltic} points in Baltic region`);
        });
        if (cable.segments.length > 5) {
          console.log(`   ... and ${cable.segments.length - 5} more segments`);
        }
      }
    } else {
      console.log('No cables found with segments passing through this region.\n');
    }

    // Query 3: Summary statistics
    console.log('\n' + '─'.repeat(80));
    console.log('📈 Summary Statistics:');
    console.log('─'.repeat(80));
    
    const [totalCables] = await db`
      SELECT COUNT(*) as count FROM infrastructure
    `;
    
    const [totalSegments] = await db`
      SELECT COUNT(*) as count FROM infrastructure_segments
    `;
    
    console.log(`Total cables in database: ${totalCables.count}`);
    console.log(`Total segments in database: ${totalSegments.count}`);
    console.log(`Cables with representative points in Baltic: ${cablesByRepPoint.length}`);
    console.log(`Cables with segments in Baltic: ${cablesBySegments.length}`);

  } catch (error) {
    console.error('❌ Error querying database:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Stack:', error.stack);
    }
  } finally {
    await closeDb();
  }

  console.log('\n' + '='.repeat(80) + '\n');
}

queryBalticInfrastructure();

