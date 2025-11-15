#!/usr/bin/env bun

/**
 * Shows a specific example of the line segments transformation
 * Uses the exact example from the user's request
 */

import { getDb, closeDb } from './db';

async function showSpecificExample() {
  console.log('='.repeat(80));
  console.log('SPECIFIC EXAMPLE: Line Segments Transformation');
  console.log('='.repeat(80) + '\n');

  try {
    const db = getDb();

    // Example: Find a segment with exactly 3 points (like the user's example)
    const [segment] = await db`
      SELECT 
        scs.id,
        scs.segment_index,
        scs.coordinates,
        sc.cable_id,
        sc.name as cable_name
      FROM infrastructure_segments scs
      JOIN infrastructure sc ON scs.cable_id = sc.id
      WHERE jsonb_array_length(scs.coordinates) = 3
      LIMIT 1
    `;

    if (!segment) {
      console.log('⚠️  No segment with 3 points found.');
      console.log('💡 Trying to find any segment with line segments...\n');
      
      // Try to find any segment that has line segments
      const [anySegment] = await db`
        SELECT 
          scs.id,
          scs.segment_index,
          scs.coordinates,
          sc.cable_id,
          sc.name as cable_name
        FROM infrastructure_segments scs
        JOIN infrastructure sc ON scs.cable_id = sc.id
        WHERE EXISTS (
          SELECT 1 FROM submarine_cable_line_segments scls 
          WHERE scls.segment_id = scs.id
        )
        LIMIT 1
      `;

      if (anySegment) {
        await showSegmentExample(anySegment);
      } else {
        console.log('❌ No segments with line segments found.');
        console.log('💡 Run "bun run populate:line-segments" to populate line segments first.');
      }
      return;
    }

    await showSegmentExample(segment);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await closeDb();
  }
}

async function showSegmentExample(segment: any) {
  const db = getDb();
  
  const coordinates = segment.coordinates as number[][];
  
  console.log('📋 SEGMENT INFORMATION');
  console.log('─'.repeat(80));
  console.log(`Cable: ${segment.cable_name}`);
  console.log(`Cable ID: ${segment.cable_id}`);
  console.log(`Segment Index: ${segment.segment_index}`);
  console.log(`Segment DB ID: ${segment.id}`);
  console.log(`Number of coordinate points: ${coordinates.length}`);
  console.log();

  console.log('📊 ORIGINAL SEGMENT DATA');
  console.log('─'.repeat(80));
  console.log('Coordinates array:');
  console.log(JSON.stringify(coordinates, null, 2));
  console.log();

  // Get line segments
  const lineSegments = await db`
    SELECT * FROM submarine_cable_line_segments
    WHERE segment_id = ${segment.id}
    ORDER BY line_index
  `;

  console.log('🔗 TRANSFORMED LINE SEGMENTS');
  console.log('─'.repeat(80));
  console.log(`Expected: ${coordinates.length} points = ${coordinates.length - 1} line segments`);
  console.log(`Found: ${lineSegments.length} line segments\n`);

  if (lineSegments.length === 0) {
    console.log('⚠️  No line segments found for this segment.');
    console.log('💡 Run "bun run populate:line-segments" to populate them.\n');
    
    // Show what it WOULD look like
    console.log('📝 EXPECTED TRANSFORMATION (what it should look like):');
    console.log('─'.repeat(80));
    for (let i = 0; i < coordinates.length - 1; i++) {
      const start = coordinates[i];
      const end = coordinates[i + 1];
      console.log(`\nLine Segment ${i}:`);
      console.log(`  [${start[0]}, ${start[1]}] to [${end[0]}, ${end[1]}]`);
    }
    return;
  }

  // Show actual line segments
  lineSegments.forEach((line: any) => {
    console.log(`\nLine Segment ${line.line_index}:`);
    console.log(`  Start Point: [${line.start_longitude}, ${line.start_latitude}]`);
    console.log(`  End Point:   [${line.end_longitude}, ${line.end_latitude}]`);
    console.log(`  → [${line.start_longitude}, ${line.start_latitude}] to [${line.end_longitude}, ${line.end_latitude}]`);
  });

  // Verify the transformation
  console.log('\n' + '─'.repeat(80));
  console.log('✅ VERIFICATION');
  console.log('─'.repeat(80));
  
  let allMatch = true;
  for (let i = 0; i < lineSegments.length; i++) {
    const line = lineSegments[i];
    const expectedStart = coordinates[i];
    const expectedEnd = coordinates[i + 1];
    
    const startMatches = 
      Math.abs(line.start_longitude - expectedStart[0]) < 0.000001 &&
      Math.abs(line.start_latitude - expectedStart[1]) < 0.000001;
    
    const endMatches = 
      Math.abs(line.end_longitude - expectedEnd[0]) < 0.000001 &&
      Math.abs(line.end_latitude - expectedEnd[1]) < 0.000001;
    
    if (!startMatches || !endMatches) {
      allMatch = false;
      console.log(`❌ Line ${i} mismatch!`);
    }
  }
  
  if (allMatch) {
    console.log('✅ All line segments match the original coordinates perfectly!');
  }

  // Show database record example
  console.log('\n' + '─'.repeat(80));
  console.log('📄 DATABASE RECORD EXAMPLE (First Line Segment)');
  console.log('─'.repeat(80));
  const firstLine = lineSegments[0];
  console.log(JSON.stringify({
    id: firstLine.id,
    segment_id: firstLine.segment_id,
    line_index: firstLine.line_index,
    start_longitude: firstLine.start_longitude,
    start_latitude: firstLine.start_latitude,
    end_longitude: firstLine.end_longitude,
    end_latitude: firstLine.end_latitude
  }, null, 2));

  console.log('\n' + '='.repeat(80) + '\n');
}

showSpecificExample();

