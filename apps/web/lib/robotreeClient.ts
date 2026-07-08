import type {
  ClassroomSession,
  ClassroomStateSnapshot,
  DemoLogin,
  DeviceConnectionStatus,
  HeadsetDevice,
  JoinHeadsetRequest,
  ProgressSummary,
  StudentProgress,
  TeacherCommand,
} from './robotreeTypes';

/**
 * REST client for the Robotree classroom API.
 * Defaults to the same-origin Next.js route handlers, so one deployed URL
 * serves both apps (teacher tablet and headsets) with no separate server.
 * Set NEXT_PUBLIC_ROBOTREE_API_URL to target the standalone Fastify API
 * (e.g. http://<teacher-ip>:3001) instead.
 *
 * Realtime strategy: snapshot polling every 2 seconds.
 * TODO: upgrade to the /live WebSocket channel and keep polling as fallback.
 */

const DEMO_LOGIN_KEY = 'robotree.demoLogin';
const SESSION_KEY = 'robotree.sessionId';

export function robotreeApiBase(): string {
  return process.env.NEXT_PUBLIC_ROBOTREE_API_URL ?? '';
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${robotreeApiBase()}/v1/robotree${path}`, {
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    ...init,
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body?.message ?? `Robotree API error (${response.status})`);
  }
  return body as T;
}

export function createSession(login: DemoLogin): Promise<ClassroomSession> {
  return request('/sessions', { method: 'POST', body: JSON.stringify({ login }) });
}

export function getSnapshot(sessionId: string): Promise<ClassroomStateSnapshot> {
  return request(`/sessions/${encodeURIComponent(sessionId)}`);
}

export function openSession(sessionId: string): Promise<ClassroomSession> {
  return request(`/sessions/${sessionId}/open`, { method: 'POST' });
}

export function joinHeadset(
  sessionId: string,
  body: JoinHeadsetRequest = {},
): Promise<HeadsetDevice> {
  return request(`/sessions/${encodeURIComponent(sessionId)}/join-headset`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function simulateHeadsets(sessionId: string, count = 10): Promise<HeadsetDevice[]> {
  return request(`/sessions/${sessionId}/simulate-headsets`, {
    method: 'POST',
    body: JSON.stringify({ count }),
  });
}

export function selectContent(
  sessionId: string,
  selection: { selectedClass?: string; subject?: string; chapter?: string; activityId?: string },
): Promise<ClassroomSession> {
  return request(`/sessions/${sessionId}/select-content`, {
    method: 'POST',
    body: JSON.stringify(selection),
  });
}

export function selectDevice(
  sessionId: string,
  deviceId: string,
  selected: boolean,
): Promise<HeadsetDevice> {
  return request(`/sessions/${sessionId}/device/${deviceId}/select`, {
    method: 'POST',
    body: JSON.stringify({ selected }),
  });
}

export function updateDeviceStatus(
  sessionId: string,
  deviceId: string,
  status: DeviceConnectionStatus,
): Promise<HeadsetDevice> {
  return request(`/sessions/${sessionId}/device/${deviceId}/status`, {
    method: 'POST',
    body: JSON.stringify({ status }),
  });
}

export function sendCommand(
  sessionId: string,
  command: TeacherCommand,
): Promise<ClassroomSession> {
  return request(`/sessions/${sessionId}/command`, {
    method: 'POST',
    body: JSON.stringify(command),
  });
}

export function submitProgress(
  sessionId: string,
  progress: Partial<StudentProgress> & { deviceId: string },
): Promise<StudentProgress> {
  return request(`/sessions/${sessionId}/progress`, {
    method: 'POST',
    body: JSON.stringify(progress),
  });
}

export function getProgressSummary(sessionId: string): Promise<ProgressSummary> {
  return request(`/sessions/${sessionId}/progress-summary`);
}

export function endSession(sessionId: string): Promise<ClassroomSession> {
  return request(`/sessions/${sessionId}/end`, { method: 'POST' });
}

/* Demo login persistence (no real authentication in this version). */

export function saveDemoLogin(login: DemoLogin, sessionId: string): void {
  localStorage.setItem(DEMO_LOGIN_KEY, JSON.stringify(login));
  localStorage.setItem(SESSION_KEY, sessionId);
}

export function loadDemoLogin(): { login: DemoLogin; sessionId: string } | null {
  try {
    const login = localStorage.getItem(DEMO_LOGIN_KEY);
    const sessionId = localStorage.getItem(SESSION_KEY);
    if (!login || !sessionId) return null;
    return { login: JSON.parse(login) as DemoLogin, sessionId };
  } catch {
    return null;
  }
}

export function clearDemoLogin(): void {
  localStorage.removeItem(DEMO_LOGIN_KEY);
  localStorage.removeItem(SESSION_KEY);
}
