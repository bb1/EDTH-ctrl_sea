// Bun and Node.js global type declarations
declare const Bun: {
  env: Record<string, string | undefined>;
};

declare const process: {
  exit(code?: number): never;
  on(event: string, callback: () => void): void;
};

/**
 * AIS Stream Client
 * Connects to aisstream.io WebSocket API and streams AIS data
 *
 * Usage: bun data_sources/ais/stream.ts
 */

import { insertObject, initSchema, closeDb } from './db/db';

const API_KEY = Bun.env.AISSTREAM_API_KEY;

if (!API_KEY) {
  console.error(
    '❌ Error: AISSTREAM_API_KEY not found in environment variables'
  );
  console.error('   Make sure you have a .env file with AISSTREAM_API_KEY set');
  process.exit(1);
}

// TypeScript now knows API_KEY is string after the check
const API_KEY_STRING: string = API_KEY;

const WS_URL = 'wss://stream.aisstream.io/v0/stream';

// Bounding box coordinates for the Baltic Sea region
// Format: [latitude, longitude] pairs
// Covers the entire Baltic Sea from Kiel to St. Petersburg
const BOUNDING_BOXES = [
  [
    [53.5, 9.5],   // Southwest corner (near Kiel, Germany)
    [66.0, 30.0],  // Northeast corner (near St. Petersburg, Russia)
  ],
];

interface SubscriptionMessage {
  Apikey: string;
  BoundingBoxes: number[][][];
}

let socket: WebSocket | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 3000; // 3 seconds

function connect(): void {
  console.log('🔌 Connecting to AIS Stream...');

  try {
    socket = new WebSocket(WS_URL);

    socket.onopen = function (_) {
      console.log('✅ Connected to AIS Stream');
      reconnectAttempts = 0; // Reset on successful connection

      const subscriptionMessage: SubscriptionMessage = {
        Apikey: API_KEY_STRING,
        BoundingBoxes: BOUNDING_BOXES,
      };

      console.log('📤 Sending subscription message...');
      console.log(
        `   Bounding Box: [${BOUNDING_BOXES[0][0][0]}, ${BOUNDING_BOXES[0][0][1]}] to [${BOUNDING_BOXES[0][1][0]}, ${BOUNDING_BOXES[0][1][1]}]`
      );

      if (socket) {
        socket.send(JSON.stringify(subscriptionMessage));
      }
      console.log('✅ Subscription sent. Listening for AIS messages...\n');
    };

    socket.onmessage = async function (event: MessageEvent) {
      try {
        const aisMessage = JSON.parse(event.data as string);

        // Save to database
        try {
          const objectId = await insertObject(aisMessage);
          if (objectId) {
            // Extract fields to display
            const metadata = aisMessage.MetaData as Record<string, any>;
            const message = aisMessage.Message as Record<string, any>;
            
            // Get ship name
            const shipName = 
              metadata?.ShipName ?? 
              metadata?.shipName ?? 
              metadata?.Name ?? 
              metadata?.VesselName ??
              message?.ShipStaticData?.ShipName ??
              message?.ShipStaticData?.Name ??
              null;
            
            // Get MMSI
            const mmsi = metadata?.MMSI ?? metadata?.MMSI_String ?? null;
            
            // Get ship type
            const shipType = 
              metadata?.ShipType ?? 
              metadata?.VesselType ??
              message?.ShipStaticData?.Type ??
              message?.ShipStaticData?.ShipType ??
              message?.ShipStaticData?.VesselType ??
              null;
            
            // Get position
            const positionReport = 
              message?.PositionReport ??
              message?.PositionReportClassA ??
              message?.PositionReportClassAAssignedSchedule ??
              message?.PositionReportClassAResponseToInterrogation ??
              message?.StandardClassBCSPositionReport ??
              message?.ExtendedClassBPositionReport ??
              message?.LongRangeAISBroadcastMessage ??
              null;
            
            const latitude = 
              positionReport?.Latitude ?? 
              positionReport?.Lat ??
              metadata?.latitude ??
              metadata?.Latitude ??
              null;
            
            const longitude = 
              positionReport?.Longitude ?? 
              positionReport?.Lon ??
              positionReport?.Long ??
              metadata?.longitude ??
              metadata?.Longitude ??
              null;
            
            // Build display string
            const parts: string[] = [];
            if (shipName) parts.push(`Ship: ${shipName}`);
            if (mmsi) parts.push(`MMSI: ${mmsi}`);
            if (shipType !== null) parts.push(`Type: ${shipType}`);
            if (latitude !== null && longitude !== null) {
              parts.push(`Position: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
            }
            
            console.log(`💾 ${parts.join(' | ')}`);
          }
        } catch (dbError) {
          console.error('❌ Error saving to database:', dbError);
          // Continue processing even if DB write fails
        }
      } catch (error) {
        console.error('❌ Error parsing AIS message:', error);
        console.log('Raw message:', event.data);
      }
    };

    socket.onerror = function (error: Event) {
      console.error('❌ WebSocket error:', error);
    };

    socket.onclose = function (event: CloseEvent) {
      console.log(
        `\n🔌 Connection closed (code: ${event.code}, reason: ${
          event.reason || 'none'
        })`
      );

      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        console.log(
          `🔄 Attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}) in ${
            RECONNECT_DELAY / 1000
          } seconds...`
        );
        setTimeout(connect, RECONNECT_DELAY);
      } else {
        console.error('❌ Max reconnection attempts reached. Exiting.');
        process.exit(1);
      }
    };
  } catch (error) {
    console.error('❌ Failed to create WebSocket connection:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down...');
  if (socket) {
    socket.close();
  }
  await closeDb();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down...');
  if (socket) {
    socket.close();
  }
  await closeDb();
  process.exit(0);
});

// Initialize database and start the connection
async function start() {
  console.log('🚀 Starting AIS Stream client...');

  // Initialize database schema
  try {
    await initSchema();
  } catch (error) {
    console.error('❌ Error initializing database schema:', error);
    console.log('⚠️  Continuing without database initialization...');
  }

  connect();
}

start();
