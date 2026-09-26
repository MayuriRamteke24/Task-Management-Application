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

const STORAGE = {
  users: 'taskManagerUsers',
  currentUser: 'taskManagerCurrentUser',
  tasks: 'taskManagerTasks',
};

const DEFAULT_USER = {
  name: 'Demo Admin',
  email: 'admin@taskmanager.com',
  password: 'admin123',
};

const state = {
  authMode: 'login',
  user: null,
  tasks: [],
  filter: 'all',
};

function ensureDefaultUser() {
  const users = loadUsers();
  if (!users.some((user) => user.email === DEFAULT_USER.email)) {
    users.push({ name: DEFAULT_USER.name, email: DEFAULT_USER.email, password: DEFAULT_USER.password });
    saveUsers(users);
  }
}

function loadUsers() {
  return JSON.parse(localStorage.getItem(STORAGE.users) || '[]');
}

function saveUsers(users) {
  localStorage.setItem(STORAGE.users, JSON.stringify(users));
}

function loadTasks() {
  const allTasks = JSON.parse(localStorage.getItem(STORAGE.tasks) || '[]');
  return allTasks.filter((task) => task.userEmail === state.user?.email);
}

function saveTasks(tasks) {
  const allTasks = JSON.parse(localStorage.getItem(STORAGE.tasks) || '[]');
  const filtered = allTasks.filter((task) => task.userEmail !== state.user?.email);
  localStorage.setItem(STORAGE.tasks, JSON.stringify([...filtered, ...tasks]));
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

function showToast(message, isError = false) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast ${isError ? 'error' : 'success'}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}

function renderTasks() {
  state.tasks = loadTasks();
  const filteredTasks = state.tasks.filter((task) => {
    if (state.filter === 'pending') return task.status !== 'completed';
    if (state.filter === 'completed') return task.status === 'completed';
    return true;
  });

  if (!filteredTasks.length) {
    tasksList.innerHTML = '<div class="task-empty">No tasks match this filter yet.</div>';
  } else {
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
              <div class="task-date">${formatDate(task.dueDate)}</div>
            </div>
            <p>${task.description || 'No description provided.'}</p>
            <div class="task-actions">
              <div class="task-meta">
                <span class="badge">Updated ${new Date(task.updatedAt).toLocaleDateString()}</span>
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

  const totalPending = state.tasks.filter((task) => task.status !== 'completed').length;
  const totalCompleted = state.tasks.filter((task) => task.status === 'completed').length;
  pendingCount.textContent = `${totalPending} pending`;
  completedCount.textContent = `${totalCompleted} done`;
}

function resetTaskForm() {
  taskForm.reset();
  document.getElementById('taskStatus').value = 'pending';
  document.getElementById('taskPriority').value = 'medium';
  taskIdInput.value = '';
  cancelEditBtn.classList.add('hidden');
  document.getElementById('taskFormTitle').textContent = 'Create new task';
}

function loadCurrentUser() {
  ensureDefaultUser();
  const user = JSON.parse(localStorage.getItem(STORAGE.currentUser) || 'null');
  state.user = user;

  if (!user) {
    authSection.classList.remove('hidden');
    taskSection.classList.add('hidden');
    logoutBtn.classList.add('hidden');
    window.location.hash = 'login';
    return;
  }

  welcomeName.textContent = `${user.name}'s dashboard`;
  authSection.classList.add('hidden');
  taskSection.classList.remove('hidden');
  logoutBtn.classList.remove('hidden');
  window.location.hash = 'tasks';
  renderTasks();
}

function handleAuthSubmit(event) {
  event.preventDefault();
  ensureDefaultUser();

  const formData = new FormData(authForm);
  let email = String(formData.get('email') || '').trim().toLowerCase();
  let password = String(formData.get('password') || '');

  if (state.authMode === 'login') {
    if (!email) email = DEFAULT_USER.email;
    if (!password) password = DEFAULT_USER.password;
  }

  const users = loadUsers();

  if (state.authMode === 'register') {
    const name = String(formData.get('name') || '').trim();
    if (!name || !email || !password) {
      showToast('Please complete all fields.', true);
      return;
    }

    if (users.some((user) => user.email === email)) {
      showToast('This email already exists.', true);
      return;
    }

    const newUser = { name, email, password };
    users.push(newUser);
    saveUsers(users);
    localStorage.setItem(STORAGE.currentUser, JSON.stringify(newUser));
    state.user = newUser;
    authForm.reset();
    loadCurrentUser();
    showToast('Account created successfully.');
    return;
  }

  const found = users.find((user) => user.email === email && user.password === password);
  if (!found) {
    showToast('Wrong email or password.', true);
    return;
  }

  localStorage.setItem(STORAGE.currentUser, JSON.stringify(found));
  state.user = found;
  authForm.reset();
  loadCurrentUser();
}

function handleTaskSubmit(event) {
  event.preventDefault();

  const tasks = JSON.parse(localStorage.getItem(STORAGE.tasks) || '[]');
  const payload = {
    id: taskIdInput.value || Date.now().toString(),
    userEmail: state.user.email,
    title: document.getElementById('taskTitle').value.trim(),
    description: document.getElementById('taskDescription').value.trim(),
    priority: document.getElementById('taskPriority').value,
    status: document.getElementById('taskStatus').value,
    dueDate: document.getElementById('taskDueDate').value,
    updatedAt: new Date().toISOString(),
  };

  if (!payload.title) {
    showToast('Task title is required.', true);
    return;
  }

  const isEdit = Boolean(taskIdInput.value);

  if (isEdit) {
    const index = tasks.findIndex((task) => task.id === payload.id && task.userEmail === state.user.email);
    if (index !== -1) {
      tasks[index] = { ...tasks[index], ...payload };
    }
  } else {
    payload.createdAt = new Date().toISOString();
    tasks.push(payload);
  }

  localStorage.setItem(STORAGE.tasks, JSON.stringify(tasks));
  resetTaskForm();
  renderTasks();
  showToast(isEdit ? 'Task updated successfully.' : 'Task created successfully.');
}

function handleTaskAction(event) {
  const actionTarget = event.target.closest('[data-action]');
  if (!actionTarget) return;

  const taskId = actionTarget.dataset.id;
  const tasks = JSON.parse(localStorage.getItem(STORAGE.tasks) || '[]');
  const task = tasks.find((item) => item.id === taskId && item.userEmail === state.user.email);
  if (!task) return;

  if (actionTarget.dataset.action === 'delete') {
    const updated = tasks.filter((item) => !(item.id === taskId && item.userEmail === state.user.email));
    localStorage.setItem(STORAGE.tasks, JSON.stringify(updated));
    renderTasks();
    showToast('Task deleted.');
    return;
  }

  if (actionTarget.dataset.action === 'toggle') {
    const updated = tasks.map((item) => {
      if (item.id === taskId && item.userEmail === state.user.email) {
        return { ...item, status: item.status === 'completed' ? 'pending' : 'completed', updatedAt: new Date().toISOString() };
      }
      return item;
    });
    localStorage.setItem(STORAGE.tasks, JSON.stringify(updated));
    renderTasks();
    showToast('Task status updated.');
    return;
  }

  if (actionTarget.dataset.action === 'edit') {
    taskIdInput.value = task.id;
    document.getElementById('taskTitle').value = task.title;
    document.getElementById('taskDescription').value = task.description || '';
    document.getElementById('taskPriority').value = task.priority;
    document.getElementById('taskStatus').value = task.status;
    document.getElementById('taskDueDate').value = task.dueDate || '';
    cancelEditBtn.classList.remove('hidden');
    document.getElementById('taskFormTitle').textContent = 'Update task';
    document.getElementById('taskTitle').focus();
  }
}

function setupEvents() {
  tabs.forEach((tab) => tab.addEventListener('click', () => setMode(tab.dataset.mode)));

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
    localStorage.removeItem(STORAGE.currentUser);
    state.user = null;
    authForm.reset();
    window.location.hash = 'login';
    loadCurrentUser();
  });
}

function attachToastStyles() {
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
      z-index: 50;
    }
    .toast.success { background: #15803d; }
    .toast.error { background: #b91c1c; }
  `;
  document.head.appendChild(style);
}

attachToastStyles();
setupEvents();
setMode('login');
loadCurrentUser();
