#!/usr/bin/env bun

/**
 * Demonstration script showing line segments transformation
 * Shows a specific example from the database
 */

import { 
  getDb, 
  closeDb, 
  getCableSegmentsByCableIdString,
  getLineSegmentsForCable 
} from './db';

async function showExample() {
  const cableId = 'asia-united-gateway-east-aug-east';
  
  console.log('='.repeat(80));
  console.log(`EXAMPLE: Line Segments Transformation`);
  console.log(`Cable ID: ${cableId}`);
  console.log('='.repeat(80) + '\n');

  try {
    const db = getDb();

    // Get cable info
    const [cable] = await db`
      SELECT * FROM infrastructure WHERE cable_id = ${cableId}
    `;

    if (!cable) {
      console.error(`❌ Cable "${cableId}" not found in database`);
      console.log('\n💡 Tip: Run "bun run import:cables" first to import the data');
      return;
    }

    console.log(`📋 Cable: ${cable.name}\n`);

    // Get segments
    const segments = await getCableSegmentsByCableIdString(cableId);

    if (segments.length === 0) {
      console.error(`❌ No segments found for cable "${cableId}"`);
      return;
    }

    // Show example with Segment 0 (first segment)
    const exampleSegment = segments[0];
    
    console.log('─'.repeat(80));
    console.log(`📊 ORIGINAL SEGMENT (Segment ${exampleSegment.segment_index})`);
    console.log('─'.repeat(80));
    console.log(`Segment ID: ${exampleSegment.id}`);
    console.log(`Coordinates array (${(exampleSegment.coordinates as number[][]).length} points):`);
    console.log(JSON.stringify(exampleSegment.coordinates, null, 2));
    console.log();

    // Get line segments for this segment
    const lineSegments = await getLineSegmentsForCable(cableId);
    const segmentLines = lineSegments.filter(ls => ls.segment_id === exampleSegment.id);

    console.log('─'.repeat(80));
    console.log(`🔗 TRANSFORMED LINE SEGMENTS (${segmentLines.length} line segments)`);
    console.log('─'.repeat(80));
    
    if (segmentLines.length === 0) {
      console.log('⚠️  No line segments found. Run "bun run populate:line-segments" to populate them.');
    } else {
      segmentLines.forEach((line, idx) => {
        console.log(`\nLine Segment ${line.line_index}:`);
        console.log(`  Start: [${line.start_longitude.toFixed(6)}, ${line.start_latitude.toFixed(6)}]`);
        console.log(`  End:   [${line.end_longitude.toFixed(6)}, ${line.end_latitude.toFixed(6)}]`);
        console.log(`  → Represents: [${line.start_longitude.toFixed(6)}, ${line.start_latitude.toFixed(6)}] to [${line.end_longitude.toFixed(6)}, ${line.end_latitude.toFixed(6)}]`);
      });
    }

    // Show summary for all segments
    console.log('\n' + '─'.repeat(80));
    console.log('📈 SUMMARY FOR ALL SEGMENTS');
    console.log('─'.repeat(80));
    
    for (const segment of segments) {
      const segLines = lineSegments.filter(ls => ls.segment_id === segment.id);
      const coordCount = (segment.coordinates as number[][]).length;
      const lineCount = segLines.length;
      
      console.log(`\nSegment ${segment.segment_index}:`);
      console.log(`  Coordinate points: ${coordCount}`);
      console.log(`  Line segments: ${lineCount}`);
      console.log(`  Formula check: ${coordCount} points = ${lineCount} line segments ${coordCount - 1 === lineCount ? '✅' : '❌'}`);
    }

    // Show database query example
    console.log('\n' + '─'.repeat(80));
    console.log('💻 SQL QUERY EXAMPLE');
    console.log('─'.repeat(80));
    console.log(`
-- Get all line segments for this cable
SELECT 
  scls.line_index,
  scls.start_longitude,
  scls.start_latitude,
  scls.end_longitude,
  scls.end_latitude,
  scs.segment_index
FROM submarine_cable_line_segments scls
JOIN infrastructure_segments scs ON scls.segment_id = scs.id
JOIN infrastructure sc ON scs.cable_id = sc.id
WHERE sc.cable_id = '${cableId}'
ORDER BY scs.segment_index, scls.line_index;
    `);

    // Show raw data example
    if (segmentLines.length > 0) {
      console.log('\n' + '─'.repeat(80));
      console.log('📄 RAW DATABASE RECORD EXAMPLE');
      console.log('─'.repeat(80));
      const firstLine = segmentLines[0];
      console.log(JSON.stringify({
        id: firstLine.id,
        segment_id: firstLine.segment_id,
        line_index: firstLine.line_index,
        start_longitude: firstLine.start_longitude,
        start_latitude: firstLine.start_latitude,
        end_longitude: firstLine.end_longitude,
        end_latitude: firstLine.end_latitude,
        created_at: firstLine.created_at
      }, null, 2));
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await closeDb();
  }

  console.log('\n' + '='.repeat(80) + '\n');
}

showExample();

