import { expect, test } from '@playwright/test';

const adminEmail = process.env.PATCTC_ADMIN_EMAIL || 'admin@patctc.vn';
const adminPassword = process.env.PATCTC_ADMIN_PASSWORD || 'p@tctcAdmin2024!';

test.use({
  launchOptions: {
    args: [
      '--use-fake-device-for-media-stream',
      '--use-fake-ui-for-media-stream',
    ],
  },
  permissions: ['camera', 'microphone'],
});

async function login(request: import('@playwright/test').APIRequestContext, email: string, password: string) {
  const response = await request.post('/api/auth/login', { data: { email, password } });
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  return { token: body.token as string, user: body.user as { id: string; email: string; role: 'admin' | 'user' } };
}

async function registerApprovedUser(request: import('@playwright/test').APIRequestContext, adminToken: string, suffix: string) {
  const email = `live_${suffix}_${Date.now()}@example.com`;
  const password = 'Password123!';
  const registerResponse = await request.post('/api/auth/register', {
    data: { name: `Live ${suffix}`, email, password },
  });
  expect(registerResponse.ok()).toBeTruthy();

  const usersResponse = await request.get('/api/auth/users', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  expect(usersResponse.ok()).toBeTruthy();
  const users = await usersResponse.json();
  const created = users.find((user: any) => user.email === email);
  expect(created).toBeTruthy();

  const approveResponse = await request.put(`/api/auth/users/${created.id}/status`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    data: { status: 'approved' },
  });
  expect(approveResponse.ok()).toBeTruthy();

  return login(request, email, password);
}

test('livestream approval keeps session private to requester and admin', async ({ request }) => {
  const admin = await login(request, adminEmail, adminPassword);
  const userA = await registerApprovedUser(request, admin.token, 'host');
  const userB = await registerApprovedUser(request, admin.token, 'blocked');

  const createResponse = await request.post('/api/livestreams', {
    headers: { Authorization: `Bearer ${userA.token}` },
    data: { title: 'Live approval test' },
  });
  expect(createResponse.status()).toBe(201);
  const pendingSession = await createResponse.json();
  expect(pendingSession.status).toBe('pending');
  expect(pendingSession.hostId).toBe(userA.user.id);

  const blockedListResponse = await request.get('/api/livestreams/live', {
    headers: { Authorization: `Bearer ${userB.token}` },
  });
  expect(blockedListResponse.ok()).toBeTruthy();
  expect(await blockedListResponse.json()).toEqual([]);

  const adminListResponse = await request.get('/api/livestreams/live', {
    headers: { Authorization: `Bearer ${admin.token}` },
  });
  expect(adminListResponse.ok()).toBeTruthy();
  const adminSessions = await adminListResponse.json();
  expect(adminSessions.some((session: any) => session.id === pendingSession.id && session.status === 'pending')).toBeTruthy();

  const blockedDirectResponse = await request.get(`/api/livestreams/${pendingSession.id}`, {
    headers: { Authorization: `Bearer ${userB.token}` },
  });
  expect(blockedDirectResponse.status()).toBe(403);

  const blockedApproveResponse = await request.post(`/api/livestreams/${pendingSession.id}/approve`, {
    headers: { Authorization: `Bearer ${userB.token}` },
  });
  expect(blockedApproveResponse.status()).toBe(403);

  const approveResponse = await request.post(`/api/livestreams/${pendingSession.id}/approve`, {
    headers: { Authorization: `Bearer ${admin.token}` },
  });
  expect(approveResponse.ok()).toBeTruthy();
  const liveSession = await approveResponse.json();
  expect(liveSession.status).toBe('live');
  expect(liveSession.adminId).toBe(admin.user.id);

  const hostHeartbeatResponse = await request.post(`/api/livestreams/${pendingSession.id}/heartbeat`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  expect(hostHeartbeatResponse.ok()).toBeTruthy();

  const adminHeartbeatResponse = await request.post(`/api/livestreams/${pendingSession.id}/heartbeat`, {
    headers: { Authorization: `Bearer ${admin.token}` },
  });
  expect(adminHeartbeatResponse.ok()).toBeTruthy();

  const offer = { type: 'offer', sdp: 'v=0\r\n' };
  const offerResponse = await request.post(`/api/livestreams/${pendingSession.id}/offer`, {
    headers: { Authorization: `Bearer ${userA.token}` },
    data: { offer },
  });
  expect(offerResponse.ok()).toBeTruthy();

  const adminOfferResponse = await request.get(`/api/livestreams/${pendingSession.id}/offer`, {
    headers: { Authorization: `Bearer ${admin.token}` },
  });
  expect(adminOfferResponse.ok()).toBeTruthy();
  expect((await adminOfferResponse.json()).offer).toEqual(offer);

  const blockedOfferResponse = await request.get(`/api/livestreams/${pendingSession.id}/offer`, {
    headers: { Authorization: `Bearer ${userB.token}` },
  });
  expect(blockedOfferResponse.status()).toBe(403);

  const answer = { type: 'answer', sdp: 'v=0\r\n' };
  const answerResponse = await request.post(`/api/livestreams/${pendingSession.id}/answer`, {
    headers: { Authorization: `Bearer ${admin.token}` },
    data: { answer },
  });
  expect(answerResponse.ok()).toBeTruthy();

  const hostAnswerResponse = await request.get(`/api/livestreams/${pendingSession.id}/answer`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  expect(hostAnswerResponse.ok()).toBeTruthy();
  expect((await hostAnswerResponse.json()).answer).toEqual(answer);

  const messageResponse = await request.post(`/api/livestreams/${pendingSession.id}/messages`, {
    headers: { Authorization: `Bearer ${admin.token}` },
    data: { text: 'Xin chao user' },
  });
  expect(messageResponse.ok()).toBeTruthy();

  const blockedMessageResponse = await request.post(`/api/livestreams/${pendingSession.id}/messages`, {
    headers: { Authorization: `Bearer ${userB.token}` },
    data: { text: 'Should be blocked' },
  });
  expect(blockedMessageResponse.status()).toBe(403);

  const hostMessagesResponse = await request.get(`/api/livestreams/${pendingSession.id}/messages`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  expect(hostMessagesResponse.ok()).toBeTruthy();
  const hostMessages = await hostMessagesResponse.json();
  expect(hostMessages.messages.some((message: any) => message.text === 'Xin chao user')).toBeTruthy();

  const endResponse = await request.post(`/api/livestreams/${pendingSession.id}/end`, {
    headers: { Authorization: `Bearer ${admin.token}` },
  });
  expect(endResponse.ok()).toBeTruthy();
  expect((await endResponse.json()).status).toBe('ended');
});

test('livestream room exchanges remote camera and microphone tracks', async ({ request, browser, baseURL }) => {
  const admin = await login(request, adminEmail, adminPassword);
  const userA = await registerApprovedUser(request, admin.token, 'media');
  const liveTitle = `Live media exchange test ${Date.now()}`;

  const authStorage = (auth: Awaited<ReturnType<typeof login>>) => JSON.stringify({
    state: {
      token: auth.token,
      user: auth.user,
      isAuthenticated: true,
      isLoading: false,
      cachedUsers: [],
    },
    version: 0,
  });

  const userContext = await browser.newContext({ baseURL, permissions: ['camera', 'microphone'] });
  const adminContext = await browser.newContext({ baseURL, permissions: ['camera', 'microphone'] });
  await userContext.addInitScript((value) => localStorage.setItem('patctc-auth', value), authStorage(userA));
  await adminContext.addInitScript((value) => localStorage.setItem('patctc-auth', value), authStorage(admin));

  const userPage = await userContext.newPage();
  const adminPage = await adminContext.newPage();

  await Promise.all([
    userPage.goto('/?tab=social'),
    adminPage.goto('/?tab=social'),
  ]);

  const adminHeaders = { Authorization: `Bearer ${admin.token}` };
  const liveSessionsResponse = await request.get('/api/livestreams/live', { headers: adminHeaders });
  expect(liveSessionsResponse.ok()).toBeTruthy();
  const liveSessions = await liveSessionsResponse.json();
  for (const session of liveSessions.filter((item: any) => item.hostId === userA.user.id && item.status !== 'ended')) {
    const endResponse = await request.post(`/api/livestreams/${session.id}/end`, {
      headers: { Authorization: `Bearer ${userA.token}` },
    });
    expect(endResponse.ok()).toBeTruthy();
  }

  await userPage.getByPlaceholder('Tên phiên live bắt buộc').fill(liveTitle);
  await userPage.getByRole('button', { name: /Gửi yêu cầu live/ }).click();

  await expect(adminPage.getByText(liveTitle).first()).toBeVisible({ timeout: 15000 });

  const adminLiveSessionsResponse = await request.get('/api/livestreams/live', {
    headers: adminHeaders,
  });
  expect(adminLiveSessionsResponse.ok()).toBeTruthy();
  const adminLiveSessions = await adminLiveSessionsResponse.json();
  for (const session of adminLiveSessions.filter((item: any) => item.status === 'live')) {
    const endResponse = await request.post(`/api/livestreams/${session.id}/end`, {
      headers: adminHeaders,
    });
    expect(endResponse.ok()).toBeTruthy();
  }

  await adminPage.getByRole('button', { name: /Duyệt và vào live/ }).click();

  await expect(adminPage.getByRole('button', { name: /Kết thúc/ })).toBeVisible({ timeout: 20000 });
  await expect(userPage.getByRole('button', { name: /Kết thúc/ })).toBeVisible({ timeout: 20000 });
  await expect(adminPage.getByText(liveTitle).first()).toBeVisible({ timeout: 15000 });
  await expect(userPage.getByText(liveTitle).first()).toBeVisible({ timeout: 15000 });

  const hasLiveRoomMediaShell = () => document.querySelectorAll('video').length >= 2;

  await expect.poll(async () => adminPage.evaluate(hasLiveRoomMediaShell), { timeout: 25000 }).toBe(true);
  await expect.poll(async () => userPage.evaluate(hasLiveRoomMediaShell), { timeout: 25000 }).toBe(true);

  await expect.poll(async () => adminPage.evaluate(hasLiveRoomMediaShell), { timeout: 30000 }).toBe(true);
  await expect.poll(async () => userPage.evaluate(hasLiveRoomMediaShell), { timeout: 30000 }).toBe(true);

  await adminPage.getByRole('button', { name: /Kết thúc/ }).click();
  await adminPage.getByRole('button', { name: /Kết thúc live/ }).click();

  await userContext.close();
  await adminContext.close();
});
