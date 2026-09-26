const authSection = document.getElementById('authSection');
const taskSection = document.getElementById('taskSection');
const authForm = document.getElementById('authForm');
const nameField = document.getElementById('nameField');
const authSubmitBtn = document.getElementById('authSubmitBtn');
const logoutBtn = document.getElementById('logoutBtn');
const welcomeName = document.getElementById('welcomeName');
const taskForm = document.getElementById('taskForm');
const taskIdInput = document.getElementById('taskId');
const tasksList = document.getElementById('tasksList');
const pendingCount = document.getElementById('pendingCount');
const completedCount = document.getElementById('completedCount');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const tabs = [...document.querySelectorAll('.tab')];
const filters = [...document.querySelectorAll('.filter')];
const tokenKey = 'tmAuthToken';
const DEFAULT_USER = {
  name: 'Demo Admin',
  email: 'admin@taskmanager.com',
  password: 'admin123',
};

const state = {
  authMode: 'login',
  user: null,
  token: localStorage.getItem(tokenKey) || '',
  tasks: [],
  filter: 'all',
};

function showToast(message, isError = false) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast ${isError ? 'error' : 'success'}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2600);
}

function setMode(mode) {
  state.authMode = mode;
  tabs.forEach((tab) => tab.classList.toggle('active', tab.dataset.mode === mode));
  nameField.classList.toggle('hidden', mode !== 'register');
  authSubmitBtn.textContent = mode === 'register' ? 'Create account' : 'Login';

  if (mode === 'login') {
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    if (emailInput && !emailInput.value) emailInput.value = DEFAULT_USER.email;
    if (passwordInput && !passwordInput.value) passwordInput.value = DEFAULT_USER.password;
  }
}

function formatDate(dateString) {
  if (!dateString) return 'No due date';
  return new Date(dateString).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function renderTasks() {
  const filteredTasks = state.tasks.filter((task) => {
    if (state.filter === 'pending') return task.status !== 'completed';
    if (state.filter === 'completed') return task.status === 'completed';
    return true;
  });

  if (!filteredTasks.length) {
    tasksList.innerHTML = '<div class="task-empty">No tasks match this filter yet.</div>';
    return;
  }

  const totalPending = state.tasks.filter((task) => task.status !== 'completed').length;
  const totalCompleted = state.tasks.filter((task) => task.status === 'completed').length;
  pendingCount.textContent = `${totalPending} pending`;
  completedCount.textContent = `${totalCompleted} done`;

  tasksList.innerHTML = filteredTasks
    .map(
      (task) => `
        <article class="task-card">
          <div class="task-card-header">
            <div>
              <h4>${task.title}</h4>
              <div class="task-meta">
                <span class="badge ${task.priority}">${task.priority}</span>
                <span class="badge status-${task.status}">${task.status.replace('-', ' ')}</span>
              </div>
            </div>
            <div class="task-date">${formatDate(task.due_date)}</div>
          </div>
          <p>${task.description || 'No description provided.'}</p>
          <div class="task-actions">
            <div class="task-meta">
              <span class="badge">Updated ${new Date(task.updated_at).toLocaleDateString()}</span>
            </div>
            <div>
              <button class="mini" data-action="toggle" data-id="${task.id}">
                ${task.status === 'completed' ? 'Reopen' : 'Complete'}
              </button>
              <button class="mini" data-action="edit" data-id="${task.id}">Edit</button>
              <button class="mini danger" data-action="delete" data-id="${task.id}">Delete</button>
            </div>
          </div>
        </article>
      `
    )
    .join('');
}

async function api(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }

  const response = await fetch(path, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'Request failed.');
  }

  return data;
}

async function loadTasks() {
  try {
    const tasks = await api('/api/tasks');
    state.tasks = tasks;
    renderTasks();
  } catch (error) {
    showToast(error.message, true);
  }
}

async function loadUser() {
  if (!state.token) {
    authSection.classList.remove('hidden');
    taskSection.classList.add('hidden');
    logoutBtn.classList.add('hidden');
    return;
  }

  try {
    const { user } = await api('/api/me');
    state.user = user;
    welcomeName.textContent = `${user.name}'s dashboard`;
    authSection.classList.add('hidden');
    taskSection.classList.remove('hidden');
    logoutBtn.classList.remove('hidden');
    await loadTasks();
    connectRealtime();
  } catch (error) {
    localStorage.removeItem(tokenKey);
    state.token = '';
    showToast('Session expired. Please log in again.', true);
    loadUser();
  }
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  const formData = new FormData(authForm);
  const payload = {
    email: formData.get('email'),
    password: formData.get('password'),
  };

  if (state.authMode === 'register') {
    payload.name = formData.get('name');
  }

  try {
    const endpoint = state.authMode === 'register' ? '/api/register' : '/api/login';
    const result = await api(endpoint, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    state.token = result.token;
    state.user = result.user;
    localStorage.setItem(tokenKey, result.token);
    authForm.reset();
    await loadUser();
  } catch (error) {
    showToast(error.message, true);
  }
}

function resetTaskForm() {
  taskForm.reset();
  document.getElementById('taskStatus').value = 'pending';
  document.getElementById('taskPriority').value = 'medium';
  taskIdInput.value = '';
  cancelEditBtn.classList.add('hidden');
  document.getElementById('taskFormTitle').textContent = 'Create new task';
}

async function handleTaskSubmit(event) {
  event.preventDefault();

  const payload = {
    title: document.getElementById('taskTitle').value,
    description: document.getElementById('taskDescription').value,
    priority: document.getElementById('taskPriority').value,
    status: document.getElementById('taskStatus').value,
    dueDate: document.getElementById('taskDueDate').value,
  };

  try {
    const taskId = taskIdInput.value;
    if (taskId) {
      await api(`/api/tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      showToast('Task updated successfully.');
    } else {
      await api('/api/tasks', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      showToast('Task created successfully.');
    }

    resetTaskForm();
    await loadTasks();
  } catch (error) {
    showToast(error.message, true);
  }
}

async function handleTaskAction(event) {
  const actionTarget = event.target.closest('[data-action]');
  if (!actionTarget) return;

  const taskId = Number(actionTarget.dataset.id);
  const action = actionTarget.dataset.action;
  const task = state.tasks.find((item) => item.id === taskId);

  if (!task) return;

  try {
    if (action === 'delete') {
      await api(`/api/tasks/${taskId}`, { method: 'DELETE' });
      showToast('Task deleted.');
      await loadTasks();
      return;
    }

    if (action === 'toggle') {
      await api(`/api/tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: task.title,
          description: task.description,
          priority: task.priority,
          status: task.status === 'completed' ? 'pending' : 'completed',
          dueDate: task.due_date,
        }),
      });
      showToast('Task status updated.');
      await loadTasks();
      return;
    }

    if (action === 'edit') {
      taskIdInput.value = task.id;
      document.getElementById('taskTitle').value = task.title;
      document.getElementById('taskDescription').value = task.description || '';
      document.getElementById('taskPriority').value = task.priority;
      document.getElementById('taskStatus').value = task.status;
      document.getElementById('taskDueDate').value = task.due_date || '';
      cancelEditBtn.classList.remove('hidden');
      document.getElementById('taskFormTitle').textContent = 'Update task';
      document.getElementById('taskTitle').focus();
    }
  } catch (error) {
    showToast(error.message, true);
  }
}

function connectRealtime() {
  if (window.__taskStream) {
    window.__taskStream.close();
  }

  const stream = new EventSource('/api/events');
  window.__taskStream = stream;

  stream.onmessage = async (event) => {
    const message = JSON.parse(event.data);
    if (message.type === 'connected') return;
    await loadTasks();
  };

  stream.onerror = () => {
    stream.close();
  };
}

function setupEvents() {
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => setMode(tab.dataset.mode));
  });

  filters.forEach((button) => {
    button.addEventListener('click', () => {
      state.filter = button.dataset.filter;
      filters.forEach((filter) => filter.classList.toggle('active', filter === button));
      renderTasks();
    });
  });

  authForm.addEventListener('submit', handleAuthSubmit);
  taskForm.addEventListener('submit', handleTaskSubmit);
  tasksList.addEventListener('click', handleTaskAction);
  cancelEditBtn.addEventListener('click', resetTaskForm);
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem(tokenKey);
    state.token = '';
    state.user = null;
    state.tasks = [];
    renderTasks();
    authForm.reset();
    loadUser();
  });
}

function initializeStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .toast {
      position: fixed;
      right: 24px;
      bottom: 24px;
      padding: 12px 16px;
      border-radius: 12px;
      background: #111827;
      color: white;
      box-shadow: 0 18px 40px rgba(15, 23, 42, 0.2);
      z-index: 10;
    }
    .toast.success { background: #15803d; }
    .toast.error { background: #b91c1c; }
  `;
  document.head.appendChild(style);
}

initializeStyles();
setupEvents();
setMode('login');
loadUser();
