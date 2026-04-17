const BASE = 'https://api.ticktick.com/open/v1';

function getHeaders() {
  return {
    'Authorization': `Bearer ${process.env.TICKTICK_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  };
}

// Cache project list for the lifetime of the Lambda container
let _projects = null;

async function getProjects() {
  if (_projects) return _projects;
  const res = await fetch(`${BASE}/project`, { headers: getHeaders() });
  if (!res.ok) throw new Error(`TickTick /project error: ${res.status}`);
  _projects = await res.json();
  console.log('[Earl/ticktick] Loaded', _projects.length, 'projects from TickTick');
  return _projects;
}

function findProject(projects, name) {
  if (!name) return null;
  const n = name.toLowerCase().trim();
  return projects.find(p => p.name.toLowerCase().trim() === n) || null;
}

export async function createTask({ title, project, tags = [], dueDate, priority = 'none' }) {
  const headers   = getHeaders();
  const projects  = await getProjects();
  const matched   = findProject(projects, project);
  const projectId = matched?.id || null;

  if (project && !matched) {
    console.warn(`[Earl/ticktick] List "${project}" not found — task will go to inbox`);
  }

  const priorityMap = { none: 0, low: 1, medium: 3, high: 5 };

  const body = {
    title,
    projectId,
    tags:     Array.isArray(tags) ? tags : [],
    priority: priorityMap[priority] ?? 0,
    ...(dueDate && { dueDate: new Date(dueDate).toISOString() }),
  };

  console.log('[Earl/ticktick] createTask:', JSON.stringify(body, null, 2));

  const res = await fetch(`${BASE}/task`, {
    method:  'POST',
    headers,
    body:    JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`TickTick createTask ${res.status}: ${detail}`);
  }

  const created = await res.json();
  console.log('[Earl/ticktick] Task created:', created.id, '—', title);
  return created;
}
