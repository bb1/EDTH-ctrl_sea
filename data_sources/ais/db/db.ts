// Bun and Node.js global type declarations
declare const Bun: {
  env: Record<string, string | undefined>;
  file(path: string): {
    exists(): Promise<boolean>;
    text(): Promise<string>;
  };
};

// ImportMeta.dir is provided by Bun runtime

/**
 * Database connection utility for AIS messages
 * Uses PostgreSQL via the 'postgres' package (Bun-compatible)
 */

import postgres from 'postgres';

// Helper function to get environment variables (works in both Bun and Node.js)
function getEnv(key: string, defaultValue: string): string {
  if (typeof Bun !== 'undefined' && Bun.env) {
    return Bun.env[key] || defaultValue;
  }
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key] || defaultValue;
  }
  return defaultValue;
}

// Database connection configuration
const DB_HOST = getEnv('POSTGRES_HOST', 'localhost');
const DB_PORT = parseInt(getEnv('POSTGRES_PORT', '5432'), 10);
const DB_USER = getEnv('POSTGRES_USER', 'postgres');
const DB_PASSWORD = getEnv('POSTGRES_PASSWORD', '');
const DB_NAME = getEnv('POSTGRES_DB', 'postgres');

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
    console.log(`✅ Connected to PostgreSQL database at ${connectionString}`);
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

  // Remove SQL comments and split by semicolons to execute each statement
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
 * AIS Message types
 */
export interface AISMessageMetadata {
  MMSI: number;
  MMSI_String: number;
  ShipName: string;
  latitude: number;
  longitude: number;
  Latitude?: number;
  Longitude?: number;
  time_utc: string;
  MessageType?: number;
  messageType?: number;
  CallSign?: string;
  Callsign?: string;
  ShipType?: number;
  VesselType?: number;
  DimensionToBow?: number;
  DimensionToStern?: number;
  DimensionToPort?: number;
  DimensionToStarboard?: number;
}

export interface AISMessage {
  MessageType: string;
  Message: Record<string, any>;
  MetaData: AISMessageMetadata;
}

const POSITION_MESSAGE_TYPES = new Set<number>([1, 2, 3, 18, 19, 27]);
const SHIP_METADATA_MESSAGE_TYPES = new Set<number>([5, 24]);
const POSITION_MESSAGE_NAMES = new Set<string>([
  'PositionReport',
  'PositionReportClassA',
  'PositionReportClassAAssignedSchedule',
  'PositionReportClassAResponseToInterrogation',
  'StandardClassBCSPositionReport',
  'ExtendedClassBPositionReport',
  'LongRangeAISBroadcastMessage',
]);
const SHIP_METADATA_MESSAGE_NAMES = new Set<string>([
  'ShipStaticData',
  'ShipStaticDataPartA',
  'ShipStaticDataPartB',
  'StaticDataReport',
  'VoyageRelatedData',
]);

type MessagePayload = Record<string, any> | null;

function pickNumber(...values: unknown[]): number | null {
  for (const value of values) {
    if (typeof value === 'number' && !Number.isNaN(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
  }
  return null;
}

function pickString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.length > 0) {
        return trimmed;
      }
    }
  }
  return null;
}

function getMessageTypeId(message: AISMessage): number | null {
  const meta = message.MetaData as Record<string, any>;
  const candidates = [
    meta?.MessageType,
    meta?.messageType,
    (message.Message as Record<string, any>)?.MessageType,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'number' && !Number.isNaN(candidate)) {
      return candidate;
    }
    if (typeof candidate === 'string') {
      const parsed = Number(candidate);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}

function isPositionMessage(typeId: number | null, typeName: string) {
  if (typeId !== null && POSITION_MESSAGE_TYPES.has(typeId)) {
    return true;
  }
  return POSITION_MESSAGE_NAMES.has(typeName);
}

function isShipMetadataMessage(typeId: number | null, typeName: string) {
  if (typeId !== null && SHIP_METADATA_MESSAGE_TYPES.has(typeId)) {
    return true;
  }
  return SHIP_METADATA_MESSAGE_NAMES.has(typeName);
}

function getPositionPayload(message: AISMessage): MessagePayload {
  const payloads = [
    message.Message?.PositionReport,
    message.Message?.PositionReportClassA,
    message.Message?.PositionReportClassAAssignedSchedule,
    message.Message?.PositionReportClassAResponseToInterrogation,
    message.Message?.StandardClassBCSPositionReport,
    message.Message?.ExtendedClassBPositionReport,
    message.Message?.LongRangeAISBroadcastMessage,
  ];

  for (const payload of payloads) {
    if (payload) {
      return payload;
    }
  }
  return null;
}

function getShipMetadataPayload(message: AISMessage): MessagePayload {
  const payloads = [
    message.Message?.ShipStaticData,
    message.Message?.ShipStaticDataPartA,
    message.Message?.ShipStaticDataPartB,
    message.Message?.StaticDataReport,
    message.Message?.VoyageRelatedData,
  ];

  for (const payload of payloads) {
    if (payload) {
      return payload;
    }
  }
  return null;
}

/**
 * Insert AIS object message into database
 */
export async function insertObject(
  message: AISMessage
): Promise<string | null> {
  const db = getDb();
  const metadata = message.MetaData as Record<string, any>;
  const objectName = pickString(
    metadata.ShipName,
    metadata.shipName,
    metadata.Name,
    metadata.VesselName
  );
  const messageTypeId = getMessageTypeId(message);
  const shouldInsertPosition = isPositionMessage(
    messageTypeId,
    message.MessageType
  );
  const shouldInsertShipMetadata = isShipMetadataMessage(
    messageTypeId,
    message.MessageType
  );

  if (!shouldInsertPosition && !shouldInsertShipMetadata) {
    return null;
  }

  // Parse time_utc string to timestamp
  const timeUtc = new Date(message.MetaData.time_utc);

  // Insert into main object table or reuse existing entry for this MMSI
  const existing = await db<{
    id: string;
    object_name: string | null;
  }[]>`
    SELECT id, object_name
    FROM object
    WHERE mmsi = ${message.MetaData.MMSI}
    ORDER BY created_at ASC
    LIMIT 1
  `;

  let objectId: string;

  if (existing.length > 0) {
    objectId = existing[0].id;

    // Populate vessel name if we just learned it
    if (objectName && !existing[0].object_name) {
      await db`
        UPDATE object
        SET object_name = ${objectName}
        WHERE id = ${objectId}
      `;
    }
  } else {
    const [inserted] = await db`
      INSERT INTO object (
        mmsi,
        object_name
      ) VALUES (
        ${message.MetaData.MMSI},
        ${objectName}
      )
      RETURNING id
    `;
    objectId = inserted.id;
  }

  // Extract and insert into specialized tables based on message type
  if (shouldInsertPosition) {
    const pr = getPositionPayload(message) ?? {};
    const latitude = pickNumber(
      pr.Latitude,
      pr.Lat,
      metadata.latitude,
      metadata.Latitude
    );
    const longitude = pickNumber(
      pr.Longitude,
      pr.Lon,
      pr.Long,
      metadata.longitude,
      metadata.Longitude
    );

    if (latitude === null || longitude === null) {
      console.warn(
        `Skipping position report insert due to missing coordinates (MMSI: ${message.MetaData.MMSI})`
      );
    } else {
      await db`
        INSERT INTO position_reports (
          object_id,
          mmsi,
          location,
          time_utc,
          cog,
          sog,
          true_heading,
          navigational_status,
          rate_of_turn,
          position_accuracy,
          raim,
          special_manoeuvre_indicator,
          timestamp,
          communication_state
        ) VALUES (
          ${objectId},
          ${message.MetaData.MMSI},
          ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326),
          ${timeUtc},
          ${pr.Cog ?? null},
          ${pr.Sog ?? null},
          ${pr.TrueHeading ?? null},
          ${pr.NavigationalStatus ?? null},
          ${pr.RateOfTurn ?? null},
          ${pr.PositionAccuracy ?? null},
          ${pr.Raim ?? null},
          ${pr.SpecialManoeuvreIndicator ?? null},
          ${pr.Timestamp ?? null},
          ${pr.CommunicationState ?? null}
        )
      `;
    }
  }

  if (shouldInsertShipMetadata) {
    const shipStatic = getShipMetadataPayload(message) ?? {};
    const shipName = pickString(
      shipStatic.ShipName,
      shipStatic.Name,
      metadata.ShipName
    );
    const callsign = pickString(
      shipStatic.CallSign,
      shipStatic.Callsign,
      metadata.CallSign,
      metadata.Callsign
    );
    const shipType = pickNumber(
      shipStatic.Type,
      shipStatic.ShipType,
      shipStatic.VesselType,
      metadata.ShipType,
      metadata.VesselType
    );
    const dimensionToBow = pickNumber(
      shipStatic.DimensionToBow,
      shipStatic.Dimension?.ToBow,
      shipStatic.Dimension?.Bow,
      metadata.DimensionToBow
    );
    const dimensionToStern = pickNumber(
      shipStatic.DimensionToStern,
      shipStatic.Dimension?.ToStern,
      shipStatic.Dimension?.Stern,
      metadata.DimensionToStern
    );
    const dimensionToPort = pickNumber(
      shipStatic.DimensionToPort,
      shipStatic.Dimension?.ToPort,
      shipStatic.Dimension?.Port,
      metadata.DimensionToPort
    );
    const dimensionToStarboard = pickNumber(
      shipStatic.DimensionToStarboard,
      shipStatic.Dimension?.ToStarboard,
      shipStatic.Dimension?.Starboard,
      metadata.DimensionToStarboard
    );

    await db`
      INSERT INTO ship_metadata (
        object_id,
        mmsi,
        ship_name,
        callsign,
        ship_type,
        dimension_to_bow,
        dimension_to_stern,
        dimension_to_port,
        dimension_to_starboard
      ) VALUES (
        ${objectId},
        ${message.MetaData.MMSI},
        ${shipName},
        ${callsign},
        ${shipType},
        ${dimensionToBow},
        ${dimensionToStern},
        ${dimensionToPort},
        ${dimensionToStarboard}
      )
      ON CONFLICT (mmsi) DO UPDATE SET
        object_id = EXCLUDED.object_id,
        ship_name = COALESCE(EXCLUDED.ship_name, ship_metadata.ship_name),
        callsign = COALESCE(EXCLUDED.callsign, ship_metadata.callsign),
        ship_type = COALESCE(EXCLUDED.ship_type, ship_metadata.ship_type),
        dimension_to_bow = COALESCE(EXCLUDED.dimension_to_bow, ship_metadata.dimension_to_bow),
        dimension_to_stern = COALESCE(EXCLUDED.dimension_to_stern, ship_metadata.dimension_to_stern),
        dimension_to_port = COALESCE(EXCLUDED.dimension_to_port, ship_metadata.dimension_to_port),
        dimension_to_starboard = COALESCE(EXCLUDED.dimension_to_starboard, ship_metadata.dimension_to_starboard),
        updated_at = NOW()
    `;
  }

  return objectId;
}

/**
 * Get recent position reports
 */
export async function getRecentPositionReports(hours: number = 24) {
  const db = getDb();

  return await db`
    SELECT * FROM recent_position_reports
    WHERE time_utc >= NOW() - INTERVAL ${hours} HOUR
    ORDER BY time_utc DESC
  `;
}

/**
 * Get position reports for a specific MMSI
 */
export async function getPositionReportsByMMSI(
  mmsi: number,
  limit: number = 100
) {
  const db = getDb();

  return await db`
    SELECT * FROM position_reports
    WHERE mmsi = ${mmsi}
    ORDER BY time_utc DESC
    LIMIT ${limit}
  `;
}

/**
 * Get messages within a geographic bounding box
 */
export async function getMessagesInBoundingBox(
  minLat: number,
  maxLat: number,
  minLon: number,
  maxLon: number,
  hours: number = 24
) {
  const db = getDb();

  return await db`
    SELECT * FROM position_reports
    WHERE ST_Intersects(
        location,
        ST_MakeEnvelope(${minLon}, ${minLat}, ${maxLon}, ${maxLat}, 4326)
      )
      AND time_utc >= NOW() - INTERVAL ${hours} HOUR
    ORDER BY time_utc DESC
  `;
}
