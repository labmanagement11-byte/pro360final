#!/usr/bin/env node

/**
 * Script para debuggear el estado actual del checklist
 * Mostrará exactamente qué datos hay en las tablas
 */

const { createClient } = require('@supabase/supabase-js');

// Hardcoded values from .env.local
const supabaseUrl = 'https://hecvlywrahigujakkguw.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlY3ZseXdyYWhpZ3VqYWtrZ3V3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjcyMzg2NCwiZXhwIjoyMDgyMjk5ODY0fQ.ZgmvGtXXCSNJ51RsHBe0vBONP6TaZ_pAW5fcRJchSCA';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function debugChecklist() {
  try {
    console.log('\n🔍 DEBUGGING CHECKLIST DATA\n');
    console.log('═'.repeat(60));

    // 1. Ver todas las asignaciones de calendario
    console.log('\n📋 CALENDAR_ASSIGNMENTS:');
    const { data: assignments } = await supabase
      .from('calendar_assignments')
      .select('id, employee, house, type, completed')
      .order('created_at', { ascending: false })
      .limit(5);

    if (assignments) {
      assignments.forEach(a => {
        console.log(`  ID: ${a.id} | Employee: ${a.employee} | House: ${a.house} | Type: ${a.type} | Completed: ${a.completed}`);
      });
    }

    // 2. Ver tabla cleaning_checklist completa
    console.log('\n🧹 CLEANING_CHECKLIST (últimos 50):');
    const { data: checklistItems } = await supabase
      .from('cleaning_checklist')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (checklistItems) {
      console.log(`  Total registros: ${checklistItems.length}`);
      
      // Agrupar por assignment_id
      const byAssignment = {};
      checklistItems.forEach(item => {
        const key = item.calendar_assignment_id_bigint || 'NULL';
        if (!byAssignment[key]) byAssignment[key] = [];
        byAssignment[key].push(item);
      });

      Object.entries(byAssignment).forEach(([assignId, items]) => {
        console.log(`\n  📌 Assignment ID: ${assignId}`);
        console.log(`     Items: ${items.length}`);
        items.slice(0, 5).forEach(item => {
          console.log(`       - ${item.task?.substring(0, 50)} | Completed: ${item.completed} | Employee: ${item.employee}`);
        });
        if (items.length > 5) console.log(`       ... y ${items.length - 5} más`);
      });
    }

    // 3. Ver tabla legacy (si existe)
    console.log('\n📋 CHECKLIST LEGACY (últimos 20):');
    const { data: legacyItems } = await supabase
      .from('checklist')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (legacyItems) {
      console.log(`  Total registros: ${legacyItems.length}`);
      legacyItems.slice(0, 5).forEach(item => {
        console.log(`    - ${item.item?.substring(0, 50)} | Complete: ${item.complete} | House: ${item.house}`);
      });
    }

    console.log('\n' + '═'.repeat(60));
    console.log('\n✅ Debug completado');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugChecklist();
