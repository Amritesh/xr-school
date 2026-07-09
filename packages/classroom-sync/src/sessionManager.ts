import { findActivity } from './demoContent';
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
} from './types';

/**
 * In-memory classroom session manager for the Robotree demo.
 * One teacher tablet controls many headset clients over local Wi-Fi.
 *
 * TODO: replace in-memory store with persistent local/cloud storage.
 */

const STARTABLE_STATUSES: DeviceConnectionStatus[] = ['connected', 'batteryLow'];

function now(): string {
  return new Date().toISOString();
}

function randomToken(length: number): string {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let token = '';
  for (let i = 0; i < length; i += 1) {
    token += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return token;
}

export class ClassroomSessionManager {
  private sessions = new Map<string, ClassroomSession>();

  private deviceCounter = new Map<string, number>();

  createSession(login: DemoLogin): ClassroomSession {
    const id = `rt-${randomToken(8).toLowerCase()}`;
    const session: ClassroomSession = {
      id,
      joinCode: randomToken(6),
      schoolCode: login.schoolCode,
      schoolName: login.schoolName,
      teacherName: login.teacherName,
      selectedClass: login.selectedClass || undefined,
      mode: 'instructorLed',
      status: 'open',
      devices: [],
      progress: [],
      currentStepIndex: 0,
      createdAt: now(),
      updatedAt: now(),
    };
    this.sessions.set(id, session);
    this.deviceCounter.set(id, 0);
    return session;
  }

  /**
   * Rehydrates a session loaded from external storage (e.g. Redis on a
   * serverless host) so a fresh manager instance can operate on it.
   */
  restoreSession(session: ClassroomSession): void {
    this.sessions.set(session.id, session);
    this.deviceCounter.set(session.id, session.devices.length);
  }

  /** Looks a session up by id or by join code (headsets type the short code). */
  getSession(sessionId: string): ClassroomSession | undefined {
    const direct = this.sessions.get(sessionId);
    if (direct) return direct;
    const code = sessionId.trim().toUpperCase();
    for (const session of this.sessions.values()) {
      if (session.joinCode === code) return session;
    }
    return undefined;
  }

  openSession(sessionId: string): ClassroomSession {
    const session = this.requireSession(sessionId);
    session.status = 'open';
    session.updatedAt = now();
    return session;
  }

  joinHeadset(sessionId: string, request: JoinHeadsetRequest = {}): HeadsetDevice {
    const session = this.requireSession(sessionId);
    const count = (this.deviceCounter.get(session.id) ?? 0) + 1;
    this.deviceCounter.set(session.id, count);
    const device: HeadsetDevice = {
      id: `hs-${session.id}-${count}`,
      label: request.label ?? `Headset ${count}`,
      deviceType: request.deviceType ?? 'vrHeadset',
      status: 'connected',
      // Devices report their real battery when the browser exposes it.
      batteryPercent: request.batteryPercent ?? 100,
      selected: false,
      currentStepIndex: 0,
      lastSeenAt: now(),
    };
    session.devices.push(device);
    session.updatedAt = now();
    return device;
  }

  simulateHeadsets(sessionId: string, count: number): HeadsetDevice[] {
    const session = this.requireSession(sessionId);
    const created: HeadsetDevice[] = [];
    for (let i = 0; i < count; i += 1) {
      const device = this.joinHeadset(session.id);
      // Deterministic variety so the demo grid shows realistic states.
      const position = session.devices.length - 1;
      if (position % 4 === 2) {
        device.status = 'batteryLow';
        device.batteryPercent = 12 + position;
      } else if (position % 8 === 3) {
        device.status = 'offline';
      }
      created.push(device);
    }
    return created;
  }

  updateDeviceStatus(
    sessionId: string,
    deviceId: string,
    status: DeviceConnectionStatus,
  ): HeadsetDevice {
    const session = this.requireSession(sessionId);
    const device = this.requireDevice(session, deviceId);
    device.status = status;
    if (status === 'batteryLow') device.batteryPercent = Math.min(device.batteryPercent, 15);
    device.lastSeenAt = now();
    session.updatedAt = now();
    return device;
  }

  selectDevice(sessionId: string, deviceId: string, selected: boolean): HeadsetDevice {
    const session = this.requireSession(sessionId);
    const device = this.requireDevice(session, deviceId);
    device.selected = selected;
    session.updatedAt = now();
    return device;
  }

  selectContent(
    sessionId: string,
    selectedClass?: string,
    subject?: string,
    chapter?: string,
    activityId?: string,
  ): ClassroomSession {
    const session = this.requireSession(sessionId);
    if (selectedClass !== undefined) session.selectedClass = selectedClass;
    if (subject !== undefined) session.selectedSubject = subject;
    if (chapter !== undefined) session.selectedChapter = chapter;
    if (activityId !== undefined) {
      session.selectedActivity = findActivity(activityId);
    }
    session.updatedAt = now();
    return session;
  }

  sendTeacherCommand(sessionId: string, command: TeacherCommand): ClassroomSession {
    const session = this.requireSession(sessionId);
    switch (command.type) {
      case 'startAll':
        this.startDevices(session, session.devices);
        break;
      case 'startSelected':
        this.startDevices(
          session,
          session.devices.filter((d) =>
            command.deviceIds ? command.deviceIds.includes(d.id) : d.selected,
          ),
        );
        break;
      case 'pauseAll':
        session.status = 'paused';
        for (const entry of session.progress) {
          if (entry.status === 'running') entry.status = 'paused';
        }
        break;
      case 'resumeAll':
        session.status = 'running';
        for (const entry of session.progress) {
          if (entry.status === 'paused') entry.status = 'running';
        }
        break;
      case 'stopAll':
        session.status = 'stopped';
        for (const device of session.devices) {
          device.currentActivityId = undefined;
          device.currentStepIndex = 0;
        }
        for (const entry of session.progress) {
          if (entry.status === 'running' || entry.status === 'paused') entry.status = 'stopped';
        }
        break;
      case 'syncContent':
        for (const device of session.devices) {
          if (device.status === 'offline') continue;
          device.status = 'syncing';
          // Demo shortcut: syncing resolves immediately.
          device.status = 'connected';
          device.lastSeenAt = now();
        }
        break;
      case 'selectContent':
        this.selectContent(
          session.id,
          command.selectedClass,
          command.selectedSubject,
          command.selectedChapter,
          command.activityId,
        );
        break;
      case 'setMode':
        if (command.mode) session.mode = command.mode;
        break;
      case 'endDemo':
        session.status = 'ended';
        break;
    }
    session.updatedAt = now();
    return session;
  }

  submitProgress(
    sessionId: string,
    deviceId: string,
    progress: Partial<StudentProgress>,
  ): StudentProgress {
    const session = this.requireSession(sessionId);
    const device = this.requireDevice(session, deviceId);
    const activityId = progress.activityId ?? device.currentActivityId ?? '';
    let entry = session.progress.find((p) => p.deviceId === deviceId && p.activityId === activityId);
    if (!entry) {
      entry = {
        deviceId,
        activityId,
        status: 'running',
        currentStepIndex: 0,
        totalSteps: findActivity(activityId)?.totalSteps ?? 0,
        answersSubmitted: 0,
        lastUpdatedAt: now(),
      };
      session.progress.push(entry);
    }
    if (progress.status !== undefined) entry.status = progress.status;
    if (progress.currentStepIndex !== undefined) {
      entry.currentStepIndex = progress.currentStepIndex;
      device.currentStepIndex = progress.currentStepIndex;
    }
    if (progress.totalSteps !== undefined) entry.totalSteps = progress.totalSteps;
    if (progress.answersSubmitted !== undefined) entry.answersSubmitted = progress.answersSubmitted;
    if (progress.scorePercent !== undefined) entry.scorePercent = progress.scorePercent;
    if (entry.totalSteps > 0 && entry.currentStepIndex >= entry.totalSteps) {
      entry.status = 'completed';
    }
    entry.lastUpdatedAt = now();
    device.lastSeenAt = now();
    session.updatedAt = now();
    return entry;
  }

  getSnapshot(sessionId: string): ClassroomStateSnapshot {
    const session = this.requireSession(sessionId);
    return {
      session,
      summary: this.getProgressSummary(session.id),
      serverTime: now(),
    };
  }

  getProgressSummary(sessionId: string): ProgressSummary {
    const session = this.requireSession(sessionId);
    const entries = session.progress;
    const scores = entries
      .map((e) => e.scorePercent)
      .filter((s): s is number => typeof s === 'number');
    return {
      sessionId: session.id,
      totalDevices: session.devices.length,
      connectedDevices: session.devices.filter((d) => d.status !== 'offline').length,
      runningCount: entries.filter((e) => e.status === 'running').length,
      pausedCount: entries.filter((e) => e.status === 'paused').length,
      completedCount: entries.filter((e) => e.status === 'completed').length,
      stoppedCount: entries.filter((e) => e.status === 'stopped').length,
      totalAnswersSubmitted: entries.reduce((sum, e) => sum + e.answersSubmitted, 0),
      averageScorePercent: scores.length
        ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
        : undefined,
      entries,
    };
  }

  endSession(sessionId: string): ClassroomSession {
    const session = this.requireSession(sessionId);
    session.status = 'ended';
    session.updatedAt = now();
    return session;
  }

  private startDevices(session: ClassroomSession, candidates: HeadsetDevice[]): void {
    const activity = session.selectedActivity;
    if (!activity) {
      throw new Error('No activity selected. Pick class, subject, chapter and activity first.');
    }
    session.status = 'running';
    for (const device of candidates) {
      if (!STARTABLE_STATUSES.includes(device.status)) continue;
      device.currentActivityId = activity.id;
      device.currentStepIndex = 0;
      this.submitProgress(session.id, device.id, {
        activityId: activity.id,
        status: 'running',
        currentStepIndex: 0,
        totalSteps: activity.totalSteps,
      });
    }
  }

  private requireSession(sessionId: string): ClassroomSession {
    const session = this.getSession(sessionId);
    if (!session) throw new Error(`Classroom session not found: ${sessionId}`);
    return session;
  }

  private requireDevice(session: ClassroomSession, deviceId: string): HeadsetDevice {
    const device = session.devices.find((d) => d.id === deviceId);
    if (!device) throw new Error(`Device not found in session ${session.id}: ${deviceId}`);
    return device;
  }
}
