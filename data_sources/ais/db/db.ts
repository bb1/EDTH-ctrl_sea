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
  time_utc: string;
}

export interface AISMessage {
  MessageType: string;
  Message: Record<string, any>;
  MetaData: AISMessageMetadata;
}

/**
 * Insert AIS object message into database
 */
export async function insertObject(message: AISMessage): Promise<string> {
  const db = getDb();

  // Parse time_utc string to timestamp
  const timeUtc = new Date(message.MetaData.time_utc);

  // Insert into main object table
  const [result] = await db`
    INSERT INTO object (
      type,
      mmsi,
      object_name,
      time_utc
    ) VALUES (
      ${message.MessageType},
      ${message.MetaData.MMSI},
      ${message.MetaData.ShipName || null},
      ${timeUtc}
    )
    RETURNING id
  `;

  const objectId: string = result.id;

  // Extract and insert into specialized tables based on message type
  if (
    message.MessageType === 'PositionReport' &&
    message.Message.PositionReport
  ) {
    const pr = message.Message.PositionReport;
    const latitude =
      pr.Latitude ??
      message.MetaData.latitude ??
      null;
    const longitude =
      pr.Longitude ??
      message.MetaData.longitude ??
      null;

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
          ${pr.Cog || null},
          ${pr.Sog || null},
          ${pr.TrueHeading || null},
          ${pr.NavigationalStatus || null},
          ${pr.RateOfTurn || null},
          ${pr.PositionAccuracy || null},
          ${pr.Raim || null},
          ${pr.SpecialManoeuvreIndicator || null},
          ${pr.Timestamp || null},
          ${pr.CommunicationState || null}
        )
      `;
    }
  }

  if (
    message.MessageType === 'DataLinkManagementMessage' &&
    message.Message.DataLinkManagementMessage
  ) {
    const dlm = message.Message.DataLinkManagementMessage;
    await db`
      INSERT INTO data_link_management_messages (
        object_id,
        mmsi,
        location,
        time_utc,
        message_id,
        repeat_indicator,
        spare,
        user_id,
        valid
      ) VALUES (
        ${objectId},
        ${message.MetaData.MMSI},
        ST_SetSRID(
          ST_MakePoint(
            ${message.MetaData.longitude ?? null},
            ${message.MetaData.latitude ?? null}
          ),
          4326
        ),
        ${timeUtc},
        ${dlm.MessageID || null},
        ${dlm.RepeatIndicator || null},
        ${dlm.Spare || null},
        ${dlm.UserID || null},
        ${dlm.Valid || null}
      )
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
