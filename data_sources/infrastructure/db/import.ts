#!/usr/bin/env bun

/**
 * Import script for submarine cables data
 * Loads the GeoJSON file and imports all cables into the database
 */

import { 
  initSchema, 
  insertSubmarineCableWithSegments, 
  closeDb, 
  getCableSegmentsByCableId,
  insertLineSegmentsForSegment,
  type SubmarineCableGeoJSON 
} from './db';

async function importCables() {
  console.log('🚀 Starting submarine cables import...\n');

  try {
    // Initialize schema
    console.log('📋 Initializing database schema...');
    await initSchema();
    console.log('✅ Schema initialized\n');

    // Read the JSON file
    const jsonPath = new URL('../internet_cables_coordinates.json', import.meta.url).pathname;
    const jsonFile = Bun.file(jsonPath);

    if (!(await jsonFile.exists())) {
      throw new Error(`JSON file not found: ${jsonPath}`);
    }

    console.log('📖 Reading JSON file...');
    const jsonText = await jsonFile.text();
    const data: SubmarineCableGeoJSON = JSON.parse(jsonText);

    console.log(`📊 Found ${data.features.length} cable features to import\n`);

    // Import each cable
    let imported = 0;
    let errors = 0;

    for (let i = 0; i < data.features.length; i++) {
      const feature = data.features[i];
      
      try {
        const cableDbId = await insertSubmarineCableWithSegments(feature);
        
        // Extract and insert line segments for all segments of this cable
        const segments = await getCableSegmentsByCableId(cableDbId);
        for (const segment of segments) {
          await insertLineSegmentsForSegment(segment.id);
        }
        
        imported++;
        
        // Progress indicator
        if ((i + 1) % 100 === 0) {
          console.log(`  Progress: ${i + 1}/${data.features.length} cables processed...`);
        }
      } catch (error) {
        errors++;
        console.error(`  ❌ Error importing cable "${feature.properties.name}":`, error);
      }
    }

    console.log('\n✅ Import completed!');
    console.log(`   Imported: ${imported} cables`);
    if (errors > 0) {
      console.log(`   Errors: ${errors} cables`);
    }

  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  } finally {
    await closeDb();
  }
}

// Run the import
importCables();

