#!/usr/bin/env bun

/**
 * Populate line segments table from existing segments
 * This script extracts individual line segments (start/end points) from each segment
 */

import { initSchema, populateLineSegmentsForAllSegments, closeDb } from './db';

async function main() {
  console.log('🚀 Starting line segments population...\n');

  try {
    // Initialize schema (creates table if it doesn't exist)
    console.log('📋 Initializing database schema...');
    await initSchema();
    console.log('✅ Schema initialized\n');

    // Populate line segments
    console.log('📊 Extracting line segments from all segments...\n');
    const result = await populateLineSegmentsForAllSegments();

    console.log('\n✅ Population completed!');
    console.log(`   Processed segments: ${result.processed}`);
    console.log(`   Total line segments created: ${result.totalLines}`);
    if (result.errors > 0) {
      console.log(`   Errors: ${result.errors}`);
    }

  } catch (error) {
    console.error('❌ Population failed:', error);
    process.exit(1);
  } finally {
    await closeDb();
  }
}

main();

