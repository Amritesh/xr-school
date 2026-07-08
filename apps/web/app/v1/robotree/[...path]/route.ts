import { NextResponse, type NextRequest } from 'next/server';
import {
  ClassroomSessionManager,
  type ClassroomSession,
  type DemoLogin,
} from '../../../../../../packages/classroom-sync/src/index';
import { loadSession, saveSession } from '@/lib/server/robotreeStore';

/**
 * Robotree classroom API served by Next.js itself (same-origin), so the
 * whole demo deploys as one web app — locally, on the LAN, or on Vercel.
 * Mirrors the Fastify routes in apps/api/src/robotree.ts.
 *
 * Note: on serverless hosts, configure the shared Redis store (see
 * lib/server/robotreeStore.ts) so all instances see the same sessions.
 */

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ path: string[] }> };

function json(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

function notFound(message: string): NextResponse {
  return json({ code: 'NOT_FOUND', message }, 404);
}

async function readBody(request: NextRequest): Promise<Record<string, unknown>> {
  try {
    return ((await request.json()) as Record<string, unknown>) ?? {};
  } catch {
    return {};
  }
}

/** Hydrates the session into a fresh manager, runs the operation, persists. */
async function withSession(
  idOrJoinCode: string,
  operation: (manager: ClassroomSessionManager, sessionId: string) => unknown,
): Promise<NextResponse> {
  const session = await loadSession(idOrJoinCode);
  if (!session) return notFound('Classroom session not found');
  const manager = new ClassroomSessionManager();
  manager.restoreSession(session);
  try {
    const result = operation(manager, session.id);
    await saveSession(manager.getSession(session.id) as ClassroomSession);
    return json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return json({ code: 'ROBOTREE_ERROR', message }, message.includes('not found') ? 404 : 400);
  }
}

export async function GET(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const { path } = await context.params;
  // GET /v1/robotree/sessions/:sessionId
  if (path[0] === 'sessions' && path.length === 2) {
    return withSession(path[1], (m, id) => m.getSnapshot(id));
  }
  // GET /v1/robotree/sessions/:sessionId/progress-summary
  if (path[0] === 'sessions' && path.length === 3 && path[2] === 'progress-summary') {
    return withSession(path[1], (m, id) => m.getProgressSummary(id));
  }
  return notFound('Unknown robotree route');
}

export async function POST(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const { path } = await context.params;
  if (path[0] !== 'sessions') return notFound('Unknown robotree route');
  const body = await readBody(request);

  // POST /v1/robotree/sessions
  if (path.length === 1) {
    const login = body.login as DemoLogin | undefined;
    if (!login?.teacherName || !login?.schoolName) {
      return json({ code: 'INVALID_LOGIN', message: 'teacherName and schoolName are required' }, 400);
    }
    const manager = new ClassroomSessionManager();
    const session = manager.createSession(login);
    await saveSession(session);
    return json(session, 201);
  }

  const sessionId = path[1];

  // POST /v1/robotree/sessions/:sessionId/device/:deviceId/(select|status)
  if (path.length === 5 && path[2] === 'device') {
    const deviceId = path[3];
    if (path[4] === 'select') {
      return withSession(sessionId, (m, id) =>
        m.selectDevice(id, deviceId, (body.selected as boolean | undefined) ?? true),
      );
    }
    if (path[4] === 'status') {
      return withSession(sessionId, (m, id) =>
        m.updateDeviceStatus(id, deviceId, body.status as never),
      );
    }
    return notFound('Unknown robotree route');
  }

  if (path.length !== 3) return notFound('Unknown robotree route');

  switch (path[2]) {
    case 'open':
      return withSession(sessionId, (m, id) => m.openSession(id));
    case 'join-headset':
      return withSession(sessionId, (m, id) => m.joinHeadset(id, body));
    case 'simulate-headsets':
      return withSession(sessionId, (m, id) =>
        m.simulateHeadsets(id, (body.count as number | undefined) ?? 10),
      );
    case 'select-content':
      return withSession(sessionId, (m, id) =>
        m.selectContent(
          id,
          body.selectedClass as string | undefined,
          body.subject as string | undefined,
          body.chapter as string | undefined,
          body.activityId as string | undefined,
        ),
      );
    case 'command':
      return withSession(sessionId, (m, id) => m.sendTeacherCommand(id, body as never));
    case 'progress':
      return withSession(sessionId, (m, id) =>
        m.submitProgress(id, body.deviceId as string, body as never),
      );
    case 'end':
      return withSession(sessionId, (m, id) => m.endSession(id));
    default:
      return notFound('Unknown robotree route');
  }
}
