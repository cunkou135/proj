import { getSupabase } from './supabase-client.js';

let channels = [];

// Table name → JS collection name mapping
const tableToCollection = {
  tasks: 'tasks',
  papers: 'papers',
  memos: 'memos',
  habits: 'habits',
  habit_logs: 'habitLogs',
  milestones: 'milestones',
  pomo_tasks: 'pomoTasks',
  pomo_records: 'pomoRecords',
  finances: 'finances',
  links: 'links',
};

const tables = Object.keys(tableToCollection);

export function subscribeRealtime(userId, onDataChange) {
  const supabase = getSupabase();
  unsubscribeAll();

  tables.forEach((table) => {
    const channel = supabase
      .channel(`realtime-${table}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const collection = tableToCollection[table];
          onDataChange(collection, payload.eventType, payload.new, payload.old);
        },
      )
      .subscribe();
    channels.push(channel);
  });
}

export function unsubscribeAll() {
  const supabase = getSupabase();
  channels.forEach((ch) => supabase.removeChannel(ch));
  channels = [];
}
