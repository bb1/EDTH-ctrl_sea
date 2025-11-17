/**
 * Centralized database connection utility for API routes
 * Uses PostgreSQL via the 'postgres' package (Bun-compatible)
 * Implements connection pooling for efficient connection reuse
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

// Create PostgreSQL client with connection pooling
let pgClient: ReturnType<typeof postgres> | null = null;
let isInitialized = false;

/**
 * Get or create database connection pool
 * The pool is reused across all requests for better performance
 * Connections are automatically managed by the postgres library
 */
export function getDb() {
  if (!pgClient) {
    pgClient = postgres(connectionString, {
      max: 20, // Maximum number of connections in the pool
      idle_timeout: 30, // Close idle connections after 30 seconds
      connect_timeout: 10, // Connection timeout in seconds
      max_lifetime: 60 * 30, // Maximum lifetime of a connection in seconds (30 minutes)
      prepare: true, // Enable prepared statements for better performance
    });
    
    // Only log once when the pool is first created
    if (!isInitialized) {
      // Mask password in log for security
      const maskedConnectionString = connectionString.replace(
        /:\w+@/,
        ':***@'
      );
      console.log(`✅ Created PostgreSQL connection pool at ${maskedConnectionString}`);
      isInitialized = true;
    }
  }
  return pgClient;
}

/**
 * Close database connection pool
 * Note: This should typically only be called during application shutdown
 * or in scripts. API routes should NOT call this to allow connection reuse.
 */
export async function closeDb() {
  if (pgClient) {
    await pgClient.end();
    pgClient = null;
    isInitialized = false;
  }
}

