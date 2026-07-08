import type { FastifyInstance } from 'fastify';
import {
  ClassroomSessionManager,
  type DemoLogin,
  type DeviceConnectionStatus,
  type JoinHeadsetRequest,
  type StudentProgress,
  type TeacherCommand,
} from '../../../packages/classroom-sync/src/index';

/**
 * Robotree VR Smart Classroom — local-first classroom control API.
 * REST + snapshot polling (clients poll every 2s).
 *
 * TODO: add a WebSocket channel at /v1/robotree/sessions/:sessionId/live
 * ({ type: "teacher.command" | "headset.joined" | "headset.progress" |
 *    "session.snapshot" | "error", payload: {} }) once @fastify/websocket
 * is added; REST polling covers the demo without new dependencies.
 */

const manager = new ClassroomSessionManager();

type SessionParams = { sessionId: string };
type DeviceParams = { sessionId: string; deviceId: string };

export function registerRobotreeRoutes(app: FastifyInstance): void {
  app.post<{ Body: { login: DemoLogin } }>('/v1/robotree/sessions', async (req, reply) => {
    const login = req.body?.login;
    if (!login?.teacherName || !login?.schoolName) {
      reply.code(400);
      return { code: 'INVALID_LOGIN', message: 'teacherName and schoolName are required' };
    }
    reply.code(201);
    return manager.createSession(login);
  });

  app.get<{ Params: SessionParams }>('/v1/robotree/sessions/:sessionId', async (req, reply) => {
    const session = manager.getSession(req.params.sessionId);
    if (!session) {
      reply.code(404);
      return { code: 'NOT_FOUND', message: 'Classroom session not found' };
    }
    return manager.getSnapshot(session.id);
  });

  app.post<{ Params: SessionParams }>('/v1/robotree/sessions/:sessionId/open', async (req, reply) =>
    guarded(reply, () => manager.openSession(req.params.sessionId)),
  );

  app.post<{ Params: SessionParams; Body: JoinHeadsetRequest }>(
    '/v1/robotree/sessions/:sessionId/join-headset',
    async (req, reply) =>
      guarded(reply, () => manager.joinHeadset(req.params.sessionId, req.body ?? {})),
  );

  app.post<{ Params: SessionParams; Body: { count?: number } }>(
    '/v1/robotree/sessions/:sessionId/simulate-headsets',
    async (req, reply) =>
      guarded(reply, () =>
        manager.simulateHeadsets(req.params.sessionId, req.body?.count ?? 10),
      ),
  );

  app.post<{
    Params: SessionParams;
    Body: { selectedClass?: string; subject?: string; chapter?: string; activityId?: string };
  }>('/v1/robotree/sessions/:sessionId/select-content', async (req, reply) =>
    guarded(reply, () =>
      manager.selectContent(
        req.params.sessionId,
        req.body?.selectedClass,
        req.body?.subject,
        req.body?.chapter,
        req.body?.activityId,
      ),
    ),
  );

  app.post<{ Params: DeviceParams; Body: { selected: boolean } }>(
    '/v1/robotree/sessions/:sessionId/device/:deviceId/select',
    async (req, reply) =>
      guarded(reply, () =>
        manager.selectDevice(req.params.sessionId, req.params.deviceId, req.body?.selected ?? true),
      ),
  );

  app.post<{ Params: DeviceParams; Body: { status: DeviceConnectionStatus } }>(
    '/v1/robotree/sessions/:sessionId/device/:deviceId/status',
    async (req, reply) =>
      guarded(reply, () =>
        manager.updateDeviceStatus(req.params.sessionId, req.params.deviceId, req.body.status),
      ),
  );

  app.post<{ Params: SessionParams; Body: TeacherCommand }>(
    '/v1/robotree/sessions/:sessionId/command',
    async (req, reply) =>
      guarded(reply, () => manager.sendTeacherCommand(req.params.sessionId, req.body)),
  );

  app.post<{ Params: SessionParams; Body: Partial<StudentProgress> & { deviceId: string } }>(
    '/v1/robotree/sessions/:sessionId/progress',
    async (req, reply) =>
      guarded(reply, () =>
        manager.submitProgress(req.params.sessionId, req.body.deviceId, req.body),
      ),
  );

  app.get<{ Params: SessionParams }>(
    '/v1/robotree/sessions/:sessionId/progress-summary',
    async (req, reply) => guarded(reply, () => manager.getProgressSummary(req.params.sessionId)),
  );

  app.post<{ Params: SessionParams }>('/v1/robotree/sessions/:sessionId/end', async (req, reply) =>
    guarded(reply, () => manager.endSession(req.params.sessionId)),
  );
}

function guarded<T>(reply: { code: (status: number) => unknown }, fn: () => T) {
  try {
    return fn();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    reply.code(message.includes('not found') ? 404 : 400);
    return { code: 'ROBOTREE_ERROR', message };
  }
}
