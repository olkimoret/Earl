const BASE = 'https://api.ticktick.com/open/v1';

function getHeaders() {
  return {
    'Authorization': `Bearer ${process.env.TICKTICK_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  };
}

let _projects = null;

async function getProjects() {
  if (_projects) return _projects;
  const res = await fetch(`${BASE}/project`, { headers: getHeaders() });
  if (!res.ok) throw new Error(`TickTick /project error: ${res.status}`);
  _projects = await res.json();
  return _projects;
}

function findProject(projects, name) {
  if (!name) return null;
  const n = String(name).split(/\s*(?:\/|→|>|›)\s*/).pop().toLowerCase().trim();
  return projects.find(p => p.name.toLowerCase().trim() === n) || null;
}

// TickTick needs the task's CURRENT list for updates; find it (inbox first, then all lists in parallel).
async function findCurrentProjectId(projects, taskId, hint) {
  const ids = [...new Set([hint, ...projects.map(p => p.id)].filter(Boolean))];
  const hits = await Promise.all(ids.map(async pid => {
    const r = await fetch(`${BASE}/project/${pid}/task/${taskId}`, { headers: getHeaders() });
    if (!r.ok) return null;
    const t = await r.json().catch(() => null);
    return t?.id ? t.projectId || pid : null;
  }));
  return hits.find(Boolean) || null;
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  let id, title, project, dueDate, priority, content, hintProjectId;
  try {
    ({ id, title, project, dueDate, priority, content, projectId: hintProjectId } = JSON.parse(event.body));
    if (!id) throw new Error('Missing id');
  } catch (err) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request: ' + err.message }) };
  }

  try {
    const headers  = getHeaders();
    const projects = await getProjects();
    const matched  = findProject(projects, project);
    const projectId = matched?.id || null;

    if (project && !matched) {
      console.warn(`[Earl/update-task] List "${project}" not found`);
    }

    const currentProjectId = await findCurrentProjectId(projects, id, hintProjectId);
    if (!currentProjectId) throw new Error(`Task no longer exists in TickTick (completed, deleted, or in Inbox from an older entry)`);

    // Move first if the list changed — the update endpoint can't change lists.
    if (projectId && projectId !== currentProjectId) {
      const mv = await fetch(`${BASE}/task/move`, {
        method: 'POST', headers,
        body: JSON.stringify([{ fromProjectId: currentProjectId, toProjectId: projectId, taskId: id }]),
      });
      if (!mv.ok) throw new Error(`TickTick move ${mv.status}: ${await mv.text()}`);
      console.log('[Earl/update-task] Moved', id, 'to', matched.name);
    }

    const priorityMap = { none: 0, low: 1, medium: 3, high: 5 };
    const due = dueDate ? new Date(dueDate) : null;

    const body = {
      id,
      projectId: projectId || currentProjectId,
      ...(title     && { title }),
      ...(priority  && { priority: priorityMap[priority] ?? 0 }),
      ...(due && !isNaN(due) && { dueDate: due.toISOString() }),
      ...(content !== undefined && { content: content || '' }),
    };

    console.log('[Earl/update-task] Updating task:', JSON.stringify(body, null, 2));

    // TickTick update endpoint requires the task ID in the URL
    const res = await fetch(`${BASE}/task/${id}`, {
      method:  'POST',
      headers,
      body:    JSON.stringify(body),
    });

    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`TickTick update ${res.status}: ${detail}`);
    }

    const updated = await res.json();
    console.log('[Earl/update-task] Updated:', updated.id, updated.title);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, message: 'Task updated' }),
    };

  } catch (err) {
    console.error('[Earl/update-task] Error:', err.message);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
