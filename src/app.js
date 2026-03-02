import { qs, toast, esc } from './utils/dom.js';
import { uuid } from './utils/id.js';
import { today } from './utils/date.js';
import { expCats, incCats, reimCats } from './utils/money.js';
import { openModal, closeModal } from './components/modal.js';
import { initSidebar } from './components/sidebar.js';
import { toggleTheme } from './components/theme.js';
import { dataService } from './data/data-service.js';
import { syncLinks, cleanLinks, renderBacklinksHTML, initAutocomplete } from './features/zettelkasten.js';
import { renderGraph } from './features/knowledge-graph.js';
import { generateWeeklyReport, copyReport } from './features/weekly-report.js';
import { selectPomo, startPomo, stopPomo, setDuration } from './features/pomodoro-timer.js';
import { enterZen, exitZen } from './features/zen-mode.js';
import { renderDash } from './views/dashboard.js';
import { renderTasks, renderTopo, renderCal, changeMonth, populateTaskOptions } from './views/tasks.js';
import { renderHabits } from './views/habits.js';
import { renderPapers, renderMemos, viewMemoDetail } from './views/library.js';
import { renderMilestones } from './views/milestones.js';
import { renderPomo } from './views/focus.js';
import { renderFinance } from './views/finance.js';
import { signOut } from './auth/auth-service.js';

export function renderAll() {
  [renderDash, renderTasks, renderTopo, renderCal, renderHabits, renderPapers, renderMemos, renderGraph, renderMilestones, renderPomo, renderFinance].forEach((fn) => {
    try { fn(); } catch (e) { console.error(fn.name, e); }
  });
}

// ===== Subtask Management =====
let currentSubtasks = [];

function renderSubtaskEditor() {
  const list = qs('#subtaskList');
  if (!list) return;
  list.innerHTML = currentSubtasks.map((st, i) =>
    '<div style="display:flex;align-items:center;gap:8px;padding:4px 0"><input type="checkbox" ' + (st.done ? 'checked' : '') + ' data-action="toggleSubtaskEditor" data-idx="' + i + '" style="width:auto"><span style="flex:1;' + (st.done ? 'text-decoration:line-through;opacity:.6' : '') + '">' + esc(st.title) + '</span><button type="button" class="btn-icon" data-action="removeSubtask" data-idx="' + i + '" style="font-size:0.8rem">✕</button></div>'
  ).join('');
}

function addSubtask() {
  const inp = qs('#subtaskInput');
  if (!inp) return;
  const title = inp.value.trim();
  if (!title) return;
  currentSubtasks.push({ id: uuid(), title, done: false });
  inp.value = '';
  renderSubtaskEditor();
}

function removeSubtask(idx) {
  currentSubtasks.splice(idx, 1);
  renderSubtaskEditor();
}

function toggleSubtaskInEditor(idx) {
  currentSubtasks[idx].done = !currentSubtasks[idx].done;
  renderSubtaskEditor();
}

function toggleSubtaskInList(taskId, subtaskId) {
  const data = dataService.getData();
  const t = data.tasks.find((x) => x.id === taskId);
  if (!t) return;
  const subs = t.subtasks || [];
  const st = subs.find((s) => s.id === subtaskId);
  if (st) {
    st.done = !st.done;
    dataService.upsert('tasks', t);
    renderAll();
  }
}

function switchTab(v, t, btn) {
  const viewEl = qs('#view-' + v);
  if (!viewEl) return;
  viewEl.querySelectorAll('.tab').forEach((b) => b.classList.remove('active'));
  btn.classList.add('active');
  viewEl.querySelectorAll('.tab-pane').forEach((p) => p.classList.remove('active'));
  qs('#pane-' + v + '-' + t).classList.add('active');
}

function exportData() {
  const data = dataService.getData();
  const b = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const u = URL.createObjectURL(b);
  const a = document.createElement('a');
  a.href = u;
  a.download = 'TaskFlowPro_' + today() + '.json';
  a.click();
  URL.revokeObjectURL(u);
}

// ===== Task CRUD =====
function openTaskModal() {
  qs('#taskId').value = '';
  qs('#taskTitle').value = '';
  qs('#taskDesc').value = '';
  qs('#taskDeadline').value = '';
  qs('#taskStatus').value = 'todo';
  qs('#taskPriority').value = 'medium';
  qs('#taskModalTitle').innerText = '新建待办事项';
  qs('#taskBacklinks').innerHTML = '';
  currentSubtasks = [];
  renderSubtaskEditor();
  populateTaskOptions();
  openModal('taskModal');
}

function saveTask(e) {
  e.preventDefault();
  const id = qs('#taskId').value || uuid();
  const t = {
    id,
    title: qs('#taskTitle').value,
    desc: qs('#taskDesc').value || '',
    status: qs('#taskStatus').value,
    priority: qs('#taskPriority').value,
    deadline: qs('#taskDeadline').value,
    milestoneId: qs('#taskMilestone').value,
    deps: Array.from(qs('#taskDependsOn').selectedOptions).map((o) => o.value),
    subtasks: currentSubtasks,
  };
  dataService.upsert('tasks', t);
  syncLinks('task', id);
  closeModal('taskModal');
  renderAll();
  toast('待办已保存');
}

function editTask(id) {
  const data = dataService.getData();
  const t = data.tasks.find((x) => x.id === id);
  if (!t) return;
  qs('#taskModalTitle').innerText = '编辑待办事项';
  populateTaskOptions();
  qs('#taskId').value = t.id;
  qs('#taskTitle').value = t.title;
  qs('#taskDesc').value = t.desc || '';
  qs('#taskStatus').value = t.status;
  qs('#taskPriority').value = t.priority;
  qs('#taskDeadline').value = t.deadline || '';
  qs('#taskMilestone').value = t.milestoneId || '';
  Array.from(qs('#taskDependsOn').options).forEach((o) => (o.selected = (t.deps || []).includes(o.value)));
  currentSubtasks = JSON.parse(JSON.stringify(t.subtasks || []));
  renderSubtaskEditor();
  qs('#taskBacklinks').innerHTML = renderBacklinksHTML('task', id);
  openModal('taskModal');
}

function delTask(id) {
  if (confirm('删除该待办？')) {
    cleanLinks('task', id);
    dataService.remove('tasks', id);
    renderAll();
  }
}

function toggleTask(id) {
  const data = dataService.getData();
  const t = data.tasks.find((x) => x.id === id);
  if (t) {
    t.status = t.status === 'done' ? 'todo' : 'done';
    dataService.upsert('tasks', t);
    renderAll();
  }
}

// ===== Habits CRUD =====
function saveHabit(e) {
  e.preventDefault();
  const habit = { id: uuid(), name: qs('#habitName').value, color: qs('#habitColor').value };
  dataService.upsert('habits', habit);
  qs('#habitName').value = '';
  closeModal('habitModal');
  renderAll();
}

function delHabit(id) {
  if (confirm('删除习惯？')) {
    dataService.remove('habits', id);
    renderAll();
  }
}

function toggleHabitLog(hId, date) {
  const data = dataService.getData();
  const i = data.habitLogs.findIndex((l) => l.habitId === hId && l.date === date);
  if (i > -1) {
    const log = data.habitLogs[i];
    dataService.remove('habitLogs', log.id);
    data.habitLogs.splice(i, 1);
  } else {
    const log = { id: uuid(), habitId: hId, date };
    data.habitLogs.push(log);
    dataService.upsert('habitLogs', log);
  }
  renderHabits();
  renderDash();
}

// ===== Papers CRUD =====
function savePaper(e) {
  e.preventDefault();
  const id = qs('#paperId').value || uuid();
  const p = {
    id,
    title: qs('#paperTitle').value,
    authors: qs('#paperAuthors').value,
    year: qs('#paperYear').value,
    source: qs('#paperSource').value,
    url: qs('#paperUrl').value,
    status: qs('#paperStatus').value,
    rating: Number(qs('#paperRating').value),
    tags: qs('#paperTags').value,
    notes: qs('#paperNotes').value,
  };
  dataService.upsert('papers', p);
  syncLinks('paper', id);
  closeModal('paperModal');
  renderPapers();
}

function editPaper(id) {
  const data = dataService.getData();
  const p = data.papers.find((x) => x.id === id);
  if (!p) return;
  qs('#paperId').value = p.id;
  qs('#paperTitle').value = p.title;
  qs('#paperAuthors').value = p.authors || '';
  qs('#paperYear').value = p.year || '';
  qs('#paperSource').value = p.source || '';
  qs('#paperUrl').value = p.url || '';
  qs('#paperStatus').value = p.status;
  qs('#paperRating').value = p.rating || 0;
  qs('#paperTags').value = p.tags || '';
  qs('#paperNotes').value = p.notes || '';
  qs('#paperBacklinks').innerHTML = renderBacklinksHTML('paper', id);
  openModal('paperModal');
}

function delPaper(id) {
  if (confirm('删除论文？')) {
    cleanLinks('paper', id);
    dataService.remove('papers', id);
    renderPapers();
  }
}

// ===== Memos CRUD =====
function saveMemo(e) {
  e.preventDefault();
  const id = qs('#memoId').value || uuid();
  const m = { id, title: qs('#memoTitle').value, tags: qs('#memoTags').value, content: qs('#memoContent').value };
  dataService.upsert('memos', m);
  syncLinks('memo', id);
  closeModal('memoModal');
  renderMemos();
}

function editMemo(id) {
  const data = dataService.getData();
  const m = data.memos.find((x) => x.id === id);
  if (!m) return;
  qs('#memoId').value = m.id;
  qs('#memoTitle').value = m.title;
  qs('#memoTags').value = m.tags || '';
  qs('#memoContent').value = m.content || '';
  openModal('memoModal');
}

function delMemo(id) {
  if (confirm('删除备忘？')) {
    cleanLinks('memo', id);
    dataService.remove('memos', id);
    renderMemos();
  }
}

function viewMemo(id) {
  viewMemoDetail(id);
  openModal('memoDetailModal');
}

// ===== Milestones CRUD =====
function saveMilestone(e) {
  e.preventDefault();
  const id = qs('#milestoneId').value || uuid();
  const m = {
    id,
    name: qs('#msName').value,
    desc: qs('#milestoneDesc').value,
    startDate: qs('#msStart').value,
    endDate: qs('#msEnd').value,
    color: qs('#msColor').value,
    status: qs('#msStatus').value,
  };
  dataService.upsert('milestones', m);
  closeModal('milestoneModal');
  renderAll();
}

function editMilestone(id) {
  const data = dataService.getData();
  const m = data.milestones.find((x) => x.id === id);
  if (!m) return;
  qs('#milestoneId').value = m.id;
  qs('#msName').value = m.name;
  qs('#milestoneDesc').value = m.desc || '';
  qs('#msStart').value = m.startDate || '';
  qs('#msEnd').value = m.endDate || '';
  qs('#msColor').value = m.color;
  qs('#msStatus').value = m.status;
  openModal('milestoneModal');
}

function delMilestone(id) {
  if (confirm('删除里程碑？')) {
    dataService.remove('milestones', id);
    renderAll();
  }
}

// ===== Pomodoro CRUD =====
function savePomoTask(e) {
  e.preventDefault();
  const n = qs('#pomoTaskName').value;
  if (n) {
    dataService.upsert('pomoTasks', { id: uuid(), title: n });
    qs('#pomoTaskName').value = '';
    closeModal('pomoTaskModal');
    renderPomo();
  }
}

function delPomoTask(id) {
  if (confirm('删除？')) {
    dataService.remove('pomoTasks', id);
    renderPomo();
  }
}

// ===== Finance CRUD =====
function updateFinCats() {
  const t = qs('#finType').value;
  const cats = t === 'income' ? incCats : t === 'reimburse' ? reimCats : expCats;
  qs('#finCat').innerHTML = cats.map((c) => '<option value="' + c + '">' + c + '</option>').join('');
  qs('#finReimburseRow').style.display = t === 'reimburse' ? 'block' : 'none';
}

function openFinModal() {
  qs('#finId').value = '';
  qs('#finType').value = 'expense';
  qs('#finAmount').value = '';
  qs('#finDesc').value = '';
  qs('#finDate').value = today();
  qs('#finReimbursed').checked = false;
  qs('#finModalTitle').innerText = '记一笔';
  updateFinCats();
  openModal('finModal');
}

function saveFinance(e) {
  e.preventDefault();
  const id = qs('#finId').value || uuid();
  const f = {
    id,
    type: qs('#finType').value,
    amount: Number(qs('#finAmount').value),
    category: qs('#finCat').value,
    desc: qs('#finDesc').value,
    date: qs('#finDate').value,
    reimbursed: qs('#finReimbursed').checked,
  };
  dataService.upsert('finances', f);
  closeModal('finModal');
  renderFinance();
  toast('已保存');
}

function editFin(id) {
  const data = dataService.getData();
  const f = data.finances.find((x) => x.id === id);
  if (!f) return;
  qs('#finModalTitle').innerText = '编辑账单';
  qs('#finId').value = f.id;
  qs('#finType').value = f.type;
  updateFinCats();
  qs('#finAmount').value = f.amount;
  qs('#finCat').value = f.category || '';
  qs('#finDesc').value = f.desc || '';
  qs('#finDate').value = f.date || '';
  qs('#finReimbursed').checked = !!f.reimbursed;
  openModal('finModal');
}

function delFin(id) {
  if (confirm('删除该记录？')) {
    dataService.remove('finances', id);
    renderFinance();
  }
}

// ===== Entity navigation =====
function openEntity(type, id) {
  if (type === 'paper') editPaper(id);
  else if (type === 'memo') viewMemo(id);
  else if (type === 'task') editTask(id);
}

// ===== Global Event Delegation =====
function setupEventDelegation() {
  document.addEventListener('click', (e) => {
    const target = e.target.closest('[data-action]');
    if (!target) return;
    const action = target.getAttribute('data-action');
    const id = target.getAttribute('data-id');
    const habitId = target.getAttribute('data-habit-id');
    const date = target.getAttribute('data-date');
    const entityType = target.getAttribute('data-entity-type');
    const entityId = target.getAttribute('data-entity-id');
    const idx = target.getAttribute('data-idx');
    const subtaskId = target.getAttribute('data-subtask-id');
    const taskId = target.getAttribute('data-task-id');

    e.stopPropagation();
    switch (action) {
      case 'editTask': editTask(id); break;
      case 'delTask': delTask(id); break;
      case 'toggleTask': toggleTask(id); break;
      case 'toggleHabit': toggleHabitLog(habitId, date); break;
      case 'delHabit': delHabit(id); break;
      case 'editPaper': editPaper(id); break;
      case 'delPaper': delPaper(id); break;
      case 'viewMemo': viewMemo(id); break;
      case 'editMemo': editMemo(id); break;
      case 'delMemo': delMemo(id); break;
      case 'editMilestone': editMilestone(id); break;
      case 'delMilestone': delMilestone(id); break;
      case 'selectPomo': selectPomo(id); break;
      case 'delPomo': delPomoTask(id); break;
      case 'editFin': editFin(id); break;
      case 'delFin': delFin(id); break;
      case 'openEntity': openEntity(entityType, entityId); break;
      case 'toggleSubtaskEditor': toggleSubtaskInEditor(Number(idx)); break;
      case 'removeSubtask': removeSubtask(Number(idx)); break;
      case 'toggleSubtaskList': toggleSubtaskInList(taskId, subtaskId); break;
    }
  });

  // Also handle wiki-link and backlink clicks
  document.addEventListener('click', (e) => {
    const wl = e.target.closest('.wiki-link[data-entity-type]');
    if (wl) {
      openEntity(wl.getAttribute('data-entity-type'), wl.getAttribute('data-entity-id'));
      return;
    }
    const bl = e.target.closest('.backlink-item[data-entity-type]');
    if (bl) {
      openEntity(bl.getAttribute('data-entity-type'), bl.getAttribute('data-entity-id'));
      return;
    }
    const gn = e.target.closest('.graph-node[data-entity-type]');
    if (gn) {
      openEntity(gn.getAttribute('data-entity-type'), gn.getAttribute('data-entity-id'));
    }
  });

  // Checkbox change events
  document.addEventListener('change', (e) => {
    const target = e.target.closest('[data-action]');
    if (!target) return;
    const action = target.getAttribute('data-action');
    if (action === 'toggleTask') {
      toggleTask(target.getAttribute('data-id'));
    } else if (action === 'toggleHabit') {
      toggleHabitLog(target.getAttribute('data-habit-id'), target.getAttribute('data-date'));
    } else if (action === 'toggleSubtaskEditor') {
      toggleSubtaskInEditor(Number(target.getAttribute('data-idx')));
    } else if (action === 'toggleSubtaskList') {
      toggleSubtaskInList(target.getAttribute('data-task-id'), target.getAttribute('data-subtask-id'));
    }
  });
}

export function initApp(user) {
  // Initialize sidebar navigation
  initSidebar(renderAll);

  // Setup event delegation
  setupEventDelegation();

  // Wire up header buttons
  const reportBtn = qs('#reportBtn');
  if (reportBtn) reportBtn.onclick = generateWeeklyReport;

  const newTaskBtn = qs('#newTaskBtn');
  if (newTaskBtn) newTaskBtn.onclick = openTaskModal;

  const themeBtn = qs('#themeBtn');
  if (themeBtn) themeBtn.onclick = () => { toggleTheme(); renderAll(); };

  const exportBtn = qs('#exportBtn');
  if (exportBtn) exportBtn.onclick = exportData;

  const logoutBtn = qs('#logoutBtn');
  if (logoutBtn) logoutBtn.onclick = async () => {
    dataService.teardown();
    await signOut();
  };

  // Tab buttons
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', function () {
      const viewId = this.closest('.view')?.id?.replace('view-', '');
      const paneId = this.getAttribute('data-pane');
      if (viewId && paneId) switchTab(viewId, paneId, this);
    });
  });

  // Modal close buttons
  document.querySelectorAll('[data-close-modal]').forEach((btn) => {
    btn.addEventListener('click', () => closeModal(btn.getAttribute('data-close-modal')));
  });

  // Modal backdrop click-to-close
  document.querySelectorAll('.modal-backdrop').forEach((backdrop) => {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeModal(backdrop.id);
    });
  });

  // Form submissions
  const taskForm = qs('#taskForm');
  if (taskForm) taskForm.onsubmit = saveTask;

  const habitForm = qs('#habitForm');
  if (habitForm) habitForm.onsubmit = saveHabit;

  const paperForm = qs('#paperForm');
  if (paperForm) paperForm.onsubmit = savePaper;

  const memoForm = qs('#memoForm');
  if (memoForm) memoForm.onsubmit = saveMemo;

  const milestoneForm = qs('#milestoneForm');
  if (milestoneForm) milestoneForm.onsubmit = saveMilestone;

  const pomoTaskForm = qs('#pomoTaskForm');
  if (pomoTaskForm) pomoTaskForm.onsubmit = savePomoTask;

  const finForm = qs('#finForm');
  if (finForm) finForm.onsubmit = saveFinance;

  // Finance type change
  const finType = qs('#finType');
  if (finType) finType.onchange = updateFinCats;

  // Filter changes
  const filterStatus = qs('#filterStatus');
  if (filterStatus) filterStatus.onchange = renderTasks;

  const paperFilter = qs('#paperFilter');
  if (paperFilter) paperFilter.onchange = renderPapers;

  const graphFilter = qs('#graphFilter');
  if (graphFilter) graphFilter.onchange = renderGraph;

  const finTypeFilter = qs('#finTypeFilter');
  if (finTypeFilter) finTypeFilter.onchange = renderFinance;

  const finMonthFilter = qs('#finMonthFilter');
  if (finMonthFilter) finMonthFilter.onchange = renderFinance;

  // Calendar navigation
  const calPrev = qs('#calPrev');
  if (calPrev) calPrev.onclick = () => changeMonth(-1);

  const calNext = qs('#calNext');
  if (calNext) calNext.onclick = () => changeMonth(1);

  // Focus buttons
  const pomoStartBtn = qs('#pomoStartBtn');
  if (pomoStartBtn) pomoStartBtn.onclick = () => startPomo(renderAll);

  const pomoStopBtn = qs('#pomoStopBtn');
  if (pomoStopBtn) pomoStopBtn.onclick = stopPomo;

  // Duration selector buttons
  document.querySelectorAll('.pomo-dur-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.pomo-dur-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const durInput = qs('#pomoDurCustom');
      if (durInput) durInput.value = '';
      setDuration(Number(btn.getAttribute('data-dur')));
    });
  });
  const pomoDurCustom = qs('#pomoDurCustom');
  if (pomoDurCustom) pomoDurCustom.addEventListener('change', () => {
    const v = Number(pomoDurCustom.value);
    if (v >= 1 && v <= 120) {
      document.querySelectorAll('.pomo-dur-btn').forEach((b) => b.classList.remove('active'));
      setDuration(v);
    }
  });

  // Subtask buttons
  const addSubtaskBtn = qs('#addSubtaskBtn');
  if (addSubtaskBtn) addSubtaskBtn.onclick = addSubtask;
  const subtaskInput = qs('#subtaskInput');
  if (subtaskInput) subtaskInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addSubtask(); }
  });

  // Zen mode
  const zenBtn = qs('#zenBtn');
  if (zenBtn) zenBtn.onclick = enterZen;

  const zenExitBtn = qs('.zen-exit-btn');
  if (zenExitBtn) zenExitBtn.onclick = exitZen;

  // New item buttons within views
  const newHabitBtn = qs('#newHabitBtn');
  if (newHabitBtn) newHabitBtn.onclick = () => openModal('habitModal');

  const newPaperBtn = qs('#newPaperBtn');
  if (newPaperBtn) newPaperBtn.onclick = () => openModal('paperModal');

  const newMemoBtn = qs('#newMemoBtn');
  if (newMemoBtn) newMemoBtn.onclick = () => openModal('memoModal');

  const newMilestoneBtn = qs('#newMilestoneBtn');
  if (newMilestoneBtn) newMilestoneBtn.onclick = () => openModal('milestoneModal');

  const newPomoTaskBtn = qs('#newPomoTaskBtn');
  if (newPomoTaskBtn) newPomoTaskBtn.onclick = () => openModal('pomoTaskModal');

  const newFinBtn = qs('#newFinBtn');
  if (newFinBtn) newFinBtn.onclick = openFinModal;

  // Copy report
  const copyReportBtn = qs('#copyReportBtn');
  if (copyReportBtn) copyReportBtn.onclick = copyReport;

  // Wiki autocomplete
  initAutocomplete();

  // Header user info
  if (user) {
    const avatarEl = qs('#userAvatar');
    const nameEl = qs('#userName');
    if (avatarEl && user.user_metadata?.avatar_url) {
      avatarEl.src = user.user_metadata.avatar_url;
      avatarEl.style.display = 'block';
    }
    if (nameEl) {
      nameEl.innerText = user.user_metadata?.user_name || user.email || '';
    }
  }

  // Listen for data changes (realtime)
  dataService.onChange(renderAll);

  // Initial render
  renderAll();
}
