import { getSupabase } from './supabase-client.js';
import { hasLegacyData, loadFromCache, markMigrated, isMigrated } from './local-cache.js';

// snake_case ↔ camelCase mapping
const camelToSnake = {
  milestoneId: 'milestone_id',
  startDate: 'start_date',
  endDate: 'end_date',
  sourceType: 'source_type',
  sourceId: 'source_id',
  targetType: 'target_type',
  targetId: 'target_id',
  targetTitle: 'target_title',
  taskId: 'task_id',
  habitId: 'habit_id',
  completedAt: 'completed_at',
  desc: 'description',
};

function toSnake(obj) {
  const result = {};
  for (const [k, v] of Object.entries(obj)) {
    result[camelToSnake[k] || k] = v;
  }
  return result;
}

// Collection → table mapping
const collectionToTable = {
  tasks: 'tasks',
  papers: 'papers',
  memos: 'memos',
  habits: 'habits',
  habitLogs: 'habit_logs',
  milestones: 'milestones',
  pomoTasks: 'pomo_tasks',
  pomoRecords: 'pomo_records',
  finances: 'finances',
  links: 'links',
};

export async function migrateLocalDataIfNeeded(userId) {
  if (isMigrated()) return;
  if (!hasLegacyData()) {
    markMigrated();
    return;
  }

  const cached = loadFromCache();
  if (!cached) {
    markMigrated();
    return;
  }

  const supabase = getSupabase();
  const collections = ['tasks', 'papers', 'memos', 'habits', 'habitLogs', 'milestones', 'pomoTasks', 'pomoRecords', 'finances', 'links'];

  for (const col of collections) {
    const items = cached[col];
    if (!items || !items.length) continue;
    const table = collectionToTable[col];
    const rows = items.map((item) => {
      const snaked = toSnake(item);
      snaked.user_id = userId;
      // habitLogs use `id` as habit_id in the original schema
      if (col === 'habitLogs') {
        snaked.habit_id = snaked.id;
        delete snaked.id;
        // Generate a new id for the row
        snaked.id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 12) + Date.now().toString(36);
      }
      return snaked;
    });

    const { error } = await supabase.from(table).upsert(rows, { onConflict: 'id' });
    if (error) console.error(`Migration error for ${table}:`, error);
  }

  markMigrated();
  console.log('Data migration completed');
}
