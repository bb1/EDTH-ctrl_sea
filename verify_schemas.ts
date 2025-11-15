#!/usr/bin/env bun

/**
 * Verify that all database schemas are created correctly
 */

import { getDb, closeDb } from './data_sources/infrastructure/db/db';
import { getDb as getAisDb, closeDb as closeAisDb } from './data_sources/ais/db/db';

async function verifyInfrastructureSchema() {
  console.log('\n📋 Verifying Infrastructure Schema...\n');
  
  const db = getDb();
  
  try {
    // Check if infrastructure table exists
    const [infrastructureTable] = await db`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'infrastructure'
      ) as exists
    `;
    
    console.log(`✅ infrastructure table: ${infrastructureTable.exists ? 'EXISTS' : '❌ MISSING'}`);
    
    // Check if infrastructure_segments table exists
    const [segmentsTable] = await db`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'infrastructure_segments'
      ) as exists
    `;
    
    console.log(`✅ infrastructure_segments table: ${segmentsTable.exists ? 'EXISTS' : '❌ MISSING'}`);
    
    // Check if submarine_cable_line_segments table exists
    const [lineSegmentsTable] = await db`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'submarine_cable_line_segments'
      ) as exists
    `;
    
    console.log(`✅ submarine_cable_line_segments table: ${lineSegmentsTable.exists ? 'EXISTS' : '❌ MISSING'}`);
    
    // Check if infrastructure_summary view exists
    const [summaryView] = await db`
      SELECT EXISTS (
        SELECT FROM information_schema.views 
        WHERE table_schema = 'public' 
        AND table_name = 'infrastructure_summary'
      ) as exists
    `;
    
    console.log(`✅ infrastructure_summary view: ${summaryView.exists ? 'EXISTS' : '❌ MISSING'}`);
    
    // Get column information for infrastructure table
    if (infrastructureTable.exists) {
      const columns = await db`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'infrastructure'
        ORDER BY ordinal_position
      `;
      
      console.log(`\n📊 infrastructure table columns (${columns.length}):`);
      columns.forEach((col: any) => {
        console.log(`   - ${col.column_name} (${col.data_type})`);
      });
    }
    
    // Count records if tables exist
    if (infrastructureTable.exists) {
      const [count] = await db`SELECT COUNT(*) as count FROM infrastructure`;
      console.log(`\n📈 Records in infrastructure: ${count.count}`);
    }
    
    if (segmentsTable.exists) {
      const [count] = await db`SELECT COUNT(*) as count FROM infrastructure_segments`;
      console.log(`📈 Records in infrastructure_segments: ${count.count}`);
    }
    
    if (lineSegmentsTable.exists) {
      const [count] = await db`SELECT COUNT(*) as count FROM submarine_cable_line_segments`;
      console.log(`📈 Records in submarine_cable_line_segments: ${count.count}`);
    }
    
  } catch (error) {
    console.error('❌ Error verifying infrastructure schema:', error);
  }
}

async function verifyAisSchema() {
  console.log('\n📋 Verifying AIS Schema...\n');
  
  const db = getAisDb();
  
  try {
    // Check if ais_messages table exists
    const [aisMessagesTable] = await db`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'ais_messages'
      ) as exists
    `;
    
    console.log(`✅ ais_messages table: ${aisMessagesTable.exists ? 'EXISTS' : '❌ MISSING'}`);
    
    // Check if position_reports table exists
    const [positionReportsTable] = await db`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'position_reports'
      ) as exists
    `;
    
    console.log(`✅ position_reports table: ${positionReportsTable.exists ? 'EXISTS' : '❌ MISSING'}`);
    
    // Check if data_link_management_messages table exists
    const [dlmTable] = await db`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'data_link_management_messages'
      ) as exists
    `;
    
    console.log(`✅ data_link_management_messages table: ${dlmTable.exists ? 'EXISTS' : '❌ MISSING'}`);
    
    // Check if recent_position_reports view exists
    const [recentView] = await db`
      SELECT EXISTS (
        SELECT FROM information_schema.views 
        WHERE table_schema = 'public' 
        AND table_name = 'recent_position_reports'
      ) as exists
    `;
    
    console.log(`✅ recent_position_reports view: ${recentView.exists ? 'EXISTS' : '❌ MISSING'}`);
    
    // Get column information for ais_messages table
    if (aisMessagesTable.exists) {
      const columns = await db`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'ais_messages'
        ORDER BY ordinal_position
      `;
      
      console.log(`\n📊 ais_messages table columns (${columns.length}):`);
      columns.forEach((col: any) => {
        console.log(`   - ${col.column_name} (${col.data_type})`);
      });
    }
    
    // Count records if tables exist
    if (aisMessagesTable.exists) {
      const [count] = await db`SELECT COUNT(*) as count FROM ais_messages`;
      console.log(`\n📈 Records in ais_messages: ${count.count}`);
    }
    
    if (positionReportsTable.exists) {
      const [count] = await db`SELECT COUNT(*) as count FROM position_reports`;
      console.log(`📈 Records in position_reports: ${count.count}`);
    }
    
  } catch (error) {
    console.error('❌ Error verifying AIS schema:', error);
  }
}

async function main() {
  console.log('🔍 Database Schema Verification\n');
  console.log('='.repeat(80));
  
  try {
    await verifyInfrastructureSchema();
    await verifyAisSchema();
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ Schema verification completed!\n');
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  } finally {
    await closeDb();
    await closeAisDb();
  }
}

main();

