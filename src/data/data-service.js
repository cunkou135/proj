import { getSupabase } from './supabase-client.js';
import { loadFromCache, saveToCache } from './local-cache.js';
import { subscribeRealtime, unsubscribeAll } from './realtime.js';

// In-memory data store
let data = {
  tasks: [], papers: [], memos: [], habits: [], habitLogs: [],
  milestones: [], pomoTasks: [], pomoRecords: [], finances: [], links: [],
};

let userId = null;
let listeners = [];
let pendingOps = [];
let online = navigator.onLine;

// snake_case ↔ camelCase helpers
const snakeToCamel = {
  milestone_id: 'milestoneId',
  start_date: 'startDate',
  end_date: 'endDate',
  source_type: 'sourceType',
  source_id: 'sourceId',
  target_type: 'targetType',
  target_id: 'targetId',
  target_title: 'targetTitle',
  task_id: 'taskId',
  habit_id: 'habitId',
  completed_at: 'completedAt',
  description: 'desc',
  created_at: '_createdAt',
  user_id: '_userId',
};

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

function toCamel(obj) {
  if (!obj) return obj;
  const result = {};
  for (const [k, v] of Object.entries(obj)) {
    const ck = snakeToCamel[k] || k;
    if (ck === '_userId') continue; // strip user_id
    if (ck === '_createdAt') continue; // strip created_at
    result[ck] = v;
  }
  return result;
}

function toSnake(obj) {
  const result = {};
  for (const [k, v] of Object.entries(obj)) {
    result[camelToSnake[k] || k] = v;
  }
  return result;
}

// Collection → table name
const collectionTable = {
  tasks: 'tasks', papers: 'papers', memos: 'memos',
  habits: 'habits', habitLogs: 'habit_logs', milestones: 'milestones',
  pomoTasks: 'pomo_tasks', pomoRecords: 'pomo_records',
  finances: 'finances', links: 'links',
};

function notifyListeners() {
  listeners.forEach((fn) => { try { fn(); } catch (e) { console.error(e); } });
}

// Flush pending ops when back online
function flushPending() {
  if (!pendingOps.length || !online) return;
  const ops = [...pendingOps];
  pendingOps = [];
  savePendingToStorage();
  ops.forEach(async (op) => {
    try {
      if (op.type === 'upsert') {
        await remoteUpsert(op.collection, op.item);
      } else if (op.type === 'remove') {
        await remoteRemove(op.collection, op.id);
      } else if (op.type === 'replaceLinks') {
        await remoteReplaceLinks(op.sourceType, op.sourceId, op.newLinks);
      }
    } catch (e) {
      console.error('Flush pending op error:', e);
    }
  });
}

function savePendingToStorage() {
  try {
    localStorage.setItem('tf_pro_pending', JSON.stringify(pendingOps));
  } catch (e) { /* ignore */ }
}

function loadPendingFromStorage() {
  try {
    const raw = localStorage.getItem('tf_pro_pending');
    if (raw) pendingOps = JSON.parse(raw);
  } catch (e) { /* ignore */ }
}

async function remoteUpsert(collection, item) {
  const supabase = getSupabase();
  const table = collectionTable[collection];
  const row = toSnake(item);
  row.user_id = userId;
  const { error } = await supabase.from(table).upsert(row, { onConflict: 'id' });
  if (error) console.error(`Upsert error (${table}):`, error);
}

async function remoteRemove(collection, id) {
  const supabase = getSupabase();
  const table = collectionTable[collection];
  const { error } = await supabase.from(table).delete().eq('id', id).eq('user_id', userId);
  if (error) console.error(`Delete error (${table}):`, error);
}

async function remoteReplaceLinks(sourceType, sourceId, newLinks) {
  const supabase = getSupabase();
  // Delete existing links for this source
  await supabase.from('links').delete()
    .eq('user_id', userId)
    .eq('source_type', sourceType)
    .eq('source_id', sourceId);
  // Insert new links
  if (newLinks.length) {
    const rows = newLinks.map((l) => {
      const r = toSnake(l);
      r.user_id = userId;
      return r;
    });
    const { error } = await supabase.from('links').insert(rows);
    if (error) console.error('Replace links error:', error);
  }
}

// Handle realtime changes from other devices
function handleRealtimeChange(collection, eventType, newRec, oldRec) {
  const item = toCamel(newRec || oldRec);
  if (eventType === 'DELETE') {
    data[collection] = data[collection].filter((x) => x.id !== item.id);
  } else if (eventType === 'INSERT') {
    if (!data[collection].find((x) => x.id === item.id)) {
      data[collection].push(item);
    }
  } else if (eventType === 'UPDATE') {
    const idx = data[collection].findIndex((x) => x.id === item.id);
    if (idx > -1) data[collection][idx] = item;
    else data[collection].push(item);
  }
  saveToCache(data);
  notifyListeners();
}

export const dataService = {
  getData() {
    return data;
  },

  async init(uid) {
    userId = uid;
    loadPendingFromStorage();

    // Try loading from Supabase
    const supabase = getSupabase();
    const collections = Object.keys(collectionTable);

    for (const col of collections) {
      const table = collectionTable[col];
      const { data: rows, error } = await supabase.from(table).select('*').eq('user_id', uid);
      if (!error && rows) {
        data[col] = rows.map(toCamel);
      }
    }

    // Cache locally
    saveToCache(data);

    // Subscribe to realtime
    subscribeRealtime(uid, handleRealtimeChange);

    // Flush any pending ops
    if (online) flushPending();

    // Listen for online/offline
    window.addEventListener('online', () => { online = true; flushPending(); });
    window.addEventListener('offline', () => { online = false; });

    notifyListeners();
  },

  // Init from localStorage only (no Supabase)
  initLocal() {
    const cached = loadFromCache();
    if (cached) {
      data = { ...data, ...cached };
      if (!data.finances) data.finances = [];
      if (!data.links) data.links = [];
    }
  },

  // Save to localStorage only (no Supabase)
  saveLocal() {
    saveToCache(data);
  },

  async upsert(collection, item) {
    // Update in-memory
    const idx = data[collection].findIndex((x) => x.id === item.id);
    if (idx > -1) data[collection][idx] = { ...data[collection][idx], ...item };
    else data[collection].push(item);

    // Persist locally
    saveToCache(data);

    // Persist to Supabase (or queue)
    if (userId) {
      if (online) {
        await remoteUpsert(collection, item);
      } else {
        pendingOps.push({ type: 'upsert', collection, item });
        savePendingToStorage();
      }
    }
  },

  async remove(collection, id) {
    data[collection] = data[collection].filter((x) => x.id !== id);
    saveToCache(data);

    if (userId) {
      if (online) {
        await remoteRemove(collection, id);
      } else {
        pendingOps.push({ type: 'remove', collection, id });
        savePendingToStorage();
      }
    }
  },

  async replaceLinks(sourceType, sourceId, newLinks) {
    // In-memory already updated by zettelkasten.js
    saveToCache(data);

    if (userId) {
      if (online) {
        await remoteReplaceLinks(sourceType, sourceId, newLinks);
      } else {
        pendingOps.push({ type: 'replaceLinks', sourceType, sourceId, newLinks });
        savePendingToStorage();
      }
    }
  },

  onChange(listener) {
    listeners.push(listener);
    return () => { listeners = listeners.filter((l) => l !== listener); };
  },

  isOnline() {
    return online;
  },

  teardown() {
    unsubscribeAll();
    userId = null;
  },
};
