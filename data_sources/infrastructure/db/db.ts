// Bun and Node.js global type declarations
declare const Bun: {
  env: Record<string, string | undefined>;
  file(path: string): {
    exists(): Promise<boolean>;
    text(): Promise<string>;
  };
};

/**
 * Database connection utility for submarine cables infrastructure
 * Uses PostgreSQL via the 'postgres' package (Bun-compatible)
 */

import postgres from 'postgres';

// Database connection configuration
const DB_HOST = Bun.env.POSTGRES_HOST || 'localhost';
const DB_PORT = parseInt(Bun.env.POSTGRES_PORT || '5432', 10);
const DB_USER = Bun.env.POSTGRES_USER || 'postgres';
const DB_PASSWORD = Bun.env.POSTGRES_PASSWORD || '';
const DB_NAME = Bun.env.POSTGRES_DB || 'postgres';

// Connection string
const connectionString = `postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;

// Create PostgreSQL client
let sql: ReturnType<typeof postgres> | null = null;

/**
 * Get or create database connection
 */
export function getDb() {
  if (!sql) {
    sql = postgres(connectionString, {
      max: 10, // Maximum number of connections
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }
  return sql;
}

/**
 * Close database connection
 */
export async function closeDb() {
  if (sql) {
    await sql.end();
    sql = null;
  }
}

/**
 * Initialize database schema
 * Run this once to create tables
 */
export async function initSchema() {
  const db = getDb();

  // Read schema file - schema.sql is in the same directory
  const schemaPath = new URL('./schema.sql', import.meta.url).pathname;
  const schemaFile = Bun.file(schemaPath);

  if (!(await schemaFile.exists())) {
    throw new Error(`Schema file not found: ${schemaPath}`);
  }

  const schema = await schemaFile.text();

  // Remove SQL comments, split by semicolons, and execute each statement
  const statements = schema
    .split('\n')
    .map((line) => line.replace(/--.*$/, '').trimEnd())
    .join('\n')
    .split(';')
    .map((s: string) => s.trim())
    .filter((s: string) => s.length > 0);

  for (const statement of statements) {
    if (statement.length === 0) continue;

    try {
      await db.unsafe(statement);
    } catch (error) {
      // Ignore "already exists" errors
      if (
        error instanceof Error &&
        !error.message.includes('already exists') &&
        !error.message.includes('duplicate') &&
        !error.message.includes('relation') &&
        !error.message.includes('function') &&
        !error.message.includes('trigger')
      ) {
        console.error('Error executing schema statement:', error);
        console.error('Statement:', statement.substring(0, 100));
      }
    }
  }

  console.log('✅ Database schema initialized');
}

/**
 * Submarine Cable types
 */
export interface SubmarineCableFeature {
  type: string;
  properties: {
    id: string;
    name: string;
    color: string;
    feature_id: string;
    coordinates: [number, number]; // [longitude, latitude]
  };
  geometry: {
    type: string;
    coordinates: number[][][]; // MultiLineString: [[[lon, lat], [lon, lat], ...]]
  };
}

export interface SubmarineCableGeoJSON {
  type: string;
  name: string;
  crs: {
    type: string;
    properties: {
      name: string;
    };
  };
  features: SubmarineCableFeature[];
}

/**
 * Insert submarine cable into database (metadata only)
 */
export async function insertSubmarineCable(
  feature: SubmarineCableFeature
): Promise<number> {
  const db = getDb();

  // Validate required fields
  if (!feature.properties.id) {
    throw new Error(`Missing id for cable: ${feature.properties.name || 'unknown'}`);
  }
  if (!feature.properties.name) {
    throw new Error(`Missing name for cable: ${feature.properties.id}`);
  }
  if (!feature.properties.feature_id) {
    throw new Error(`Missing feature_id for cable: ${feature.properties.id}`);
  }
  if (!feature.properties.coordinates || feature.properties.coordinates.length < 2) {
    throw new Error(`Missing or invalid coordinates for cable: ${feature.properties.id}`);
  }

  const cableId = String(feature.properties.id || '');
  const name = String(feature.properties.name || '');
  const color = feature.properties.color ? String(feature.properties.color) : null;
  const featureId = String(feature.properties.feature_id || '');
  const longitude = Number(feature.properties.coordinates[0]);
  const latitude = Number(feature.properties.coordinates[1]);

  // Additional validation
  if (!cableId || cableId === 'undefined') {
    throw new Error(`Invalid id for cable: ${feature.properties.name || 'unknown'}`);
  }
  if (!name || name === 'undefined') {
    throw new Error(`Invalid name for cable: ${cableId}`);
  }
  if (!featureId || featureId === 'undefined') {
    throw new Error(`Invalid feature_id for cable: ${cableId}`);
  }
  if (isNaN(longitude) || longitude === undefined || longitude === null) {
    throw new Error(`Invalid longitude for cable: ${cableId} (value: ${feature.properties.coordinates[0]})`);
  }
  if (isNaN(latitude) || latitude === undefined || latitude === null) {
    throw new Error(`Invalid latitude for cable: ${cableId} (value: ${feature.properties.coordinates[1]})`);
  }

  const [result] = await db`
    INSERT INTO infrastructure (
      cable_id,
      name,
      color,
      feature_id,
      representative_longitude,
      representative_latitude
    ) VALUES (
      ${cableId},
      ${name},
      ${color},
      ${featureId},
      ${longitude},
      ${latitude}
    )
    ON CONFLICT (cable_id) DO UPDATE SET
      name = EXCLUDED.name,
      color = EXCLUDED.color,
      feature_id = EXCLUDED.feature_id,
      representative_longitude = EXCLUDED.representative_longitude,
      representative_latitude = EXCLUDED.representative_latitude,
      updated_at = NOW()
    RETURNING id
  `;

  return result.id;
}

/**
 * Insert cable segments into database
 */
export async function insertCableSegments(
  cableId: number,
  segments: number[][][] // Array of LineString arrays
): Promise<void> {
  const db = getDb();

  // Delete existing segments for this cable (in case of update)
  await db`
    DELETE FROM infrastructure_segments WHERE cable_id = ${cableId}
  `;

  // Insert each segment
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    await db`
      INSERT INTO infrastructure_segments (
        cable_id,
        segment_index,
        coordinates
      ) VALUES (
        ${cableId},
        ${i},
        ${JSON.stringify(segment)}::jsonb
      )
    `;
  }
}

/**
 * Insert submarine cable with all its segments
 */
export async function insertSubmarineCableWithSegments(
  feature: SubmarineCableFeature
): Promise<number> {
  // First insert the cable metadata
  const cableId = await insertSubmarineCable(feature);
  
  // Then insert all segments
  await insertCableSegments(cableId, feature.geometry.coordinates);
  
  return cableId;
}

/**
 * Extract line segments from a segment's coordinates
 * Converts [A, B, C] into [A→B, B→C]
 */
function extractLineSegments(coordinates: number[][]): Array<{
  start: [number, number];
  end: [number, number];
}> {
  const lineSegments: Array<{ start: [number, number]; end: [number, number] }> = [];
  
  if (!coordinates || coordinates.length < 2) {
    return lineSegments; // Return empty array if not enough coordinates
  }
  
  for (let i = 0; i < coordinates.length - 1; i++) {
    const start = coordinates[i];
    const end = coordinates[i + 1];
    
    // Validate coordinates
    if (!start || start.length < 2 || start[0] === undefined || start[1] === undefined) {
      continue; // Skip invalid start point
    }
    if (!end || end.length < 2 || end[0] === undefined || end[1] === undefined) {
      continue; // Skip invalid end point
    }
    
    lineSegments.push({
      start: [Number(start[0]), Number(start[1])],
      end: [Number(end[0]), Number(end[1])],
    });
  }
  
  return lineSegments;
}

/**
 * Insert line segments for a given segment
 */
export async function insertLineSegmentsForSegment(segmentId: number): Promise<number> {
  const db = getDb();
  
  // Get the segment
  const [segment] = await db`
    SELECT coordinates FROM infrastructure_segments WHERE id = ${segmentId}
  `;
  
  if (!segment) {
    throw new Error(`Segment ${segmentId} not found`);
  }
  
  // Parse coordinates - they may be stored as JSON string or already parsed
  let coordinates: number[][];
  if (typeof segment.coordinates === 'string') {
    coordinates = JSON.parse(segment.coordinates);
  } else {
    coordinates = segment.coordinates as number[][];
  }
  
  const lineSegments = extractLineSegments(coordinates);
  
  // Delete existing line segments for this segment (in case of update)
  await db`
    DELETE FROM submarine_cable_line_segments WHERE segment_id = ${segmentId}
  `;
  
  // Insert each line segment
  for (let i = 0; i < lineSegments.length; i++) {
    const line = lineSegments[i];
    
    // Validate and convert coordinates
    const startLon = Number(line.start[0]);
    const startLat = Number(line.start[1]);
    const endLon = Number(line.end[0]);
    const endLat = Number(line.end[1]);
    
    if (isNaN(startLon) || startLon === undefined || startLon === null) {
      throw new Error(`Invalid start longitude for segment ${segmentId}, line ${i}: ${line.start[0]}`);
    }
    if (isNaN(startLat) || startLat === undefined || startLat === null) {
      throw new Error(`Invalid start latitude for segment ${segmentId}, line ${i}: ${line.start[1]}`);
    }
    if (isNaN(endLon) || endLon === undefined || endLon === null) {
      throw new Error(`Invalid end longitude for segment ${segmentId}, line ${i}: ${line.end[0]}`);
    }
    if (isNaN(endLat) || endLat === undefined || endLat === null) {
      throw new Error(`Invalid end latitude for segment ${segmentId}, line ${i}: ${line.end[1]}`);
    }
    
    await db`
      INSERT INTO submarine_cable_line_segments (
        segment_id,
        line_index,
        start_longitude,
        start_latitude,
        end_longitude,
        end_latitude
      ) VALUES (
        ${segmentId},
        ${i},
        ${startLon},
        ${startLat},
        ${endLon},
        ${endLat}
      )
    `;
  }
  
  return lineSegments.length;
}

/**
 * Populate line segments for all existing segments
 */
export async function populateLineSegmentsForAllSegments(): Promise<{
  processed: number;
  totalLines: number;
  errors: number;
}> {
  const db = getDb();
  
  // Get all segments
  const segments = await db`
    SELECT id FROM infrastructure_segments ORDER BY id
  `;
  
  let processed = 0;
  let totalLines = 0;
  let errors = 0;
  
  for (const segment of segments) {
    try {
      const lineCount = await insertLineSegmentsForSegment(segment.id);
      totalLines += lineCount;
      processed++;
      
      if (processed % 100 === 0) {
        console.log(`  Processed ${processed}/${segments.length} segments...`);
      }
    } catch (error) {
      errors++;
      console.error(`  Error processing segment ${segment.id}:`, error);
    }
  }
  
  return { processed, totalLines, errors };
}

/**
 * Get line segments for a segment
 */
export async function getLineSegmentsForSegment(segmentId: number) {
  const db = getDb();
  
  return await db`
    SELECT * FROM submarine_cable_line_segments
    WHERE segment_id = ${segmentId}
    ORDER BY line_index
  `;
}

/**
 * Get all line segments for a cable
 */
export async function getLineSegmentsForCable(cableId: string) {
  const db = getDb();
  
  return await db`
    SELECT 
      scls.*,
      scs.segment_index,
      sc.cable_id,
      sc.name as cable_name
    FROM submarine_cable_line_segments scls
    JOIN infrastructure_segments scs ON scls.segment_id = scs.id
    JOIN infrastructure sc ON scs.cable_id = sc.id
    WHERE sc.cable_id = ${cableId}
    ORDER BY scs.segment_index, scls.line_index
  `;
}

/**
 * Get all submarine cables
 */
export async function getAllSubmarineCables() {
  const db = getDb();

  return await db`
    SELECT * FROM infrastructure
    ORDER BY name
  `;
}

/**
 * Get submarine cable by ID
 */
export async function getSubmarineCableById(cableId: string) {
  const db = getDb();

  const [result] = await db`
    SELECT * FROM infrastructure
    WHERE cable_id = ${cableId}
  `;

  return result;
}

/**
 * Get all segments for a cable by cable database ID
 */
export async function getCableSegmentsByCableId(cableDbId: number) {
  const db = getDb();

  return await db`
    SELECT * FROM infrastructure_segments
    WHERE cable_id = ${cableDbId}
    ORDER BY segment_index
  `;
}

/**
 * Get all segments for a cable by cable_id (string identifier)
 */
export async function getCableSegmentsByCableIdString(cableId: string) {
  const db = getDb();

  return await db`
    SELECT scs.* 
    FROM infrastructure_segments scs
    JOIN infrastructure sc ON scs.cable_id = sc.id
    WHERE sc.cable_id = ${cableId}
    ORDER BY scs.segment_index
  `;
}

/**
 * Get cable with all its segments
 */
export async function getCableWithSegments(cableId: string) {
  const db = getDb();

  const cable = await getSubmarineCableById(cableId);
  if (!cable) return null;

  const segments = await getCableSegmentsByCableIdString(cableId);

  return {
    ...cable,
    segments: segments.map(s => ({
      segment_index: s.segment_index,
      coordinates: s.coordinates
    }))
  };
}

/**
 * Get submarine cables summary
 */
export async function getSubmarineCablesSummary() {
  const db = getDb();

  return await db`
    SELECT * FROM infrastructure_summary
  `;
}

/**
 * Get cables within a geographic bounding box
 * (based on representative point)
 */
export async function getCablesInBoundingBox(
  minLat: number,
  maxLat: number,
  minLon: number,
  maxLon: number
) {
  const db = getDb();

  return await db`
    SELECT * FROM infrastructure
    WHERE representative_latitude BETWEEN ${minLat} AND ${maxLat}
      AND representative_longitude BETWEEN ${minLon} AND ${maxLon}
    ORDER BY name
  `;
}

/**
 * Search cables by name
 */
export async function searchCablesByName(searchTerm: string, limit: number = 50) {
  const db = getDb();

  return await db`
    SELECT * FROM infrastructure
    WHERE name ILIKE ${`%${searchTerm}%`}
    ORDER BY name
    LIMIT ${limit}
  `;
}
