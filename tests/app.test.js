const test = require('node:test');
const assert = require('node:assert/strict');
const { app } = require('../server');

async function startServer() {
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();
  return { server, port };
}

test('register, task CRUD, and auth flow work together', async (t) => {
  const { server, port } = await startServer();
  t.after(() => server.close());

  const email = `tester${Date.now()}@example.com`;
  const registerResponse = await fetch(`http://127.0.0.1:${port}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Test User', email, password: 'pass1234' }),
  });

  assert.equal(registerResponse.status, 201, 'registration should succeed');
  const registerData = await registerResponse.json();
  assert.ok(registerData.token, 'token should be returned after registration');

  let headers = { Authorization: `Bearer ${registerData.token}` };

  const listResponse = await fetch(`http://127.0.0.1:${port}/api/tasks`, { headers });
  assert.equal(listResponse.status, 200, 'task listing should require auth');
  const initialTasks = await listResponse.json();
  assert.ok(Array.isArray(initialTasks), 'tasks response should be an array');

  const createResponse = await fetch(`http://127.0.0.1:${port}/api/tasks`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Prepare UI review',
      description: 'Review the app flow before release.',
      priority: 'high',
      status: 'pending',
      dueDate: '2026-10-02',
    }),
  });

  assert.equal(createResponse.status, 201, 'task creation should succeed');
  const createdTask = await createResponse.json();
  assert.equal(createdTask.title, 'Prepare UI review');

  const updateResponse = await fetch(`http://127.0.0.1:${port}/api/tasks/${createdTask.id}`, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Prepare UI review and deploy',
      description: 'Review the app flow before release and ship.',
      priority: 'high',
      status: 'completed',
      dueDate: '2026-10-02',
    }),
  });

  assert.equal(updateResponse.status, 200, 'task update should succeed');
  const updatedTask = await updateResponse.json();
  assert.equal(updatedTask.status, 'completed');

  const loginResponse = await fetch(`http://127.0.0.1:${port}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'pass1234' }),
  });

  assert.equal(loginResponse.status, 200, 'login should succeed');
  const loginData = await loginResponse.json();
  assert.ok(loginData.token, 'login should return a token');

  const deleteResponse = await fetch(`http://127.0.0.1:${port}/api/tasks/${createdTask.id}`, {
    method: 'DELETE',
    headers,
  });

  assert.equal(deleteResponse.status, 200, 'task deletion should succeed');
  const finalTasks = await fetch(`http://127.0.0.1:${port}/api/tasks`, { headers }).then((res) => res.json());
  assert.ok(
    !finalTasks.some((task) => task.id === createdTask.id),
    'deleted task should no longer be present in the list'
  );
});
