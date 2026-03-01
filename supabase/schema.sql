-- TaskFlow Pro — Supabase Schema
-- Run this SQL in the Supabase SQL Editor

-- ==============================
-- Tables
-- ==============================

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'todo',
  priority TEXT NOT NULL DEFAULT 'medium',
  deadline DATE,
  milestone_id UUID,
  deps UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS papers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  authors TEXT DEFAULT '',
  year TEXT DEFAULT '',
  source TEXT DEFAULT '',
  url TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'unread',
  rating INT DEFAULT 0,
  tags TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS memos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  tags TEXT DEFAULT '',
  content TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#059669',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS habit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, habit_id, date)
);

CREATE TABLE IF NOT EXISTS milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  start_date DATE,
  end_date DATE,
  color TEXT DEFAULT '#4f46e5',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pomo_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pomo_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id UUID REFERENCES pomo_tasks(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS finances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'expense',
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  category TEXT DEFAULT '',
  description TEXT DEFAULT '',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  reimbursed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  source_id UUID NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  target_title TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================
-- Indexes
-- ==============================

CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_papers_user ON papers(user_id);
CREATE INDEX IF NOT EXISTS idx_memos_user ON memos(user_id);
CREATE INDEX IF NOT EXISTS idx_habits_user ON habits(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_logs_user ON habit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_milestones_user ON milestones(user_id);
CREATE INDEX IF NOT EXISTS idx_pomo_tasks_user ON pomo_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_pomo_records_user ON pomo_records(user_id);
CREATE INDEX IF NOT EXISTS idx_finances_user ON finances(user_id);
CREATE INDEX IF NOT EXISTS idx_links_user ON links(user_id);
CREATE INDEX IF NOT EXISTS idx_links_source ON links(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_links_target ON links(target_type, target_id);

-- ==============================
-- Row Level Security (RLS)
-- ==============================

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE memos ENABLE ROW LEVEL SECURITY;
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE pomo_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE pomo_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE finances ENABLE ROW LEVEL SECURITY;
ALTER TABLE links ENABLE ROW LEVEL SECURITY;

-- Helper function for policies
-- Each table gets SELECT, INSERT, UPDATE, DELETE policies

-- tasks
CREATE POLICY "tasks_select" ON tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "tasks_insert" ON tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tasks_update" ON tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "tasks_delete" ON tasks FOR DELETE USING (auth.uid() = user_id);

-- papers
CREATE POLICY "papers_select" ON papers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "papers_insert" ON papers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "papers_update" ON papers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "papers_delete" ON papers FOR DELETE USING (auth.uid() = user_id);

-- memos
CREATE POLICY "memos_select" ON memos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "memos_insert" ON memos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "memos_update" ON memos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "memos_delete" ON memos FOR DELETE USING (auth.uid() = user_id);

-- habits
CREATE POLICY "habits_select" ON habits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "habits_insert" ON habits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "habits_update" ON habits FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "habits_delete" ON habits FOR DELETE USING (auth.uid() = user_id);

-- habit_logs
CREATE POLICY "habit_logs_select" ON habit_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "habit_logs_insert" ON habit_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "habit_logs_update" ON habit_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "habit_logs_delete" ON habit_logs FOR DELETE USING (auth.uid() = user_id);

-- milestones
CREATE POLICY "milestones_select" ON milestones FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "milestones_insert" ON milestones FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "milestones_update" ON milestones FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "milestones_delete" ON milestones FOR DELETE USING (auth.uid() = user_id);

-- pomo_tasks
CREATE POLICY "pomo_tasks_select" ON pomo_tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "pomo_tasks_insert" ON pomo_tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "pomo_tasks_update" ON pomo_tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "pomo_tasks_delete" ON pomo_tasks FOR DELETE USING (auth.uid() = user_id);

-- pomo_records
CREATE POLICY "pomo_records_select" ON pomo_records FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "pomo_records_insert" ON pomo_records FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "pomo_records_update" ON pomo_records FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "pomo_records_delete" ON pomo_records FOR DELETE USING (auth.uid() = user_id);

-- finances
CREATE POLICY "finances_select" ON finances FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "finances_insert" ON finances FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "finances_update" ON finances FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "finances_delete" ON finances FOR DELETE USING (auth.uid() = user_id);

-- links
CREATE POLICY "links_select" ON links FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "links_insert" ON links FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "links_update" ON links FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "links_delete" ON links FOR DELETE USING (auth.uid() = user_id);

-- ==============================
-- Enable Realtime
-- ==============================

ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE papers;
ALTER PUBLICATION supabase_realtime ADD TABLE memos;
ALTER PUBLICATION supabase_realtime ADD TABLE habits;
ALTER PUBLICATION supabase_realtime ADD TABLE habit_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE milestones;
ALTER PUBLICATION supabase_realtime ADD TABLE pomo_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE pomo_records;
ALTER PUBLICATION supabase_realtime ADD TABLE finances;
ALTER PUBLICATION supabase_realtime ADD TABLE links;
