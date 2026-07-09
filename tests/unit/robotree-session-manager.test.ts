import { beforeEach, describe, expect, it } from 'vitest';
import {
  ClassroomSessionManager,
  DEMO_ACTIVITIES,
  type ClassroomSession,
  type DemoLogin,
} from '../../packages/classroom-sync/src/index';

const LOGIN: DemoLogin = {
  teacherName: 'Demo Teacher',
  schoolName: 'Green Valley Public School',
  schoolCode: 'GVPS-01',
  selectedClass: 'class-8',
};

describe('Robotree classroom session manager', () => {
  let manager: ClassroomSessionManager;
  let session: ClassroomSession;

  beforeEach(() => {
    manager = new ClassroomSessionManager();
    session = manager.createSession(LOGIN);
  });

  function selectDemoContent() {
    manager.selectContent(session.id, 'class-8', 'physics', 'circuit', 'circuit');
  }

  it('offers only the original implemented demos as classroom activities', () => {
    expect(DEMO_ACTIVITIES.map((activity) => activity.id)).toEqual([
      'pollination',
      'circuit',
      'c9-ch01-a02-states-of-matter',
      'c6-ch01-a01-sources-of-food',
      'c5-ch07-a03-soluble-and-insoluble-substances',
      'c5-ch03-a02-introduction-of-digestive-system',
      'c7-ch10-a02-the-breathing-process-in-human',
      'c8-ch10-a02-the-effects-of-force-on-object-s-motion-and-shape',
      'c10-ch02-a01-introduction-to-acids-and-bases-and-litmus-test',
    ]);
    expect(DEMO_ACTIVITIES.every((activity) => activity.simulationHref === `/simulations/${activity.id}`)).toBe(true);
  });

  it('creates a session in open state with a join code', () => {
    expect(session.status).toBe('open');
    expect(session.joinCode).toMatch(/^[A-Z0-9]{6}$/);
    expect(session.teacherName).toBe('Demo Teacher');
    expect(session.selectedClass).toBe('class-8');
    expect(session.devices).toHaveLength(0);
    expect(manager.getSession(session.joinCode)?.id).toBe(session.id);
  });

  it('simulates 10 headsets with sequential labels', () => {
    const devices = manager.simulateHeadsets(session.id, 10);
    expect(devices).toHaveLength(10);
    expect(manager.getSession(session.id)?.devices).toHaveLength(10);
    expect(devices[0].label).toBe('Headset 1');
    expect(devices[9].label).toBe('Headset 10');
    expect(devices.some((d) => d.status === 'batteryLow')).toBe(true);
    expect(devices.some((d) => d.status === 'offline')).toBe(true);
  });

  it('selects class, subject, chapter and activity', () => {
    selectDemoContent();
    const updated = manager.getSession(session.id)!;
    expect(updated.selectedClass).toBe('class-8');
    expect(updated.selectedSubject).toBe('physics');
    expect(updated.selectedChapter).toBe('circuit');
    expect(updated.selectedActivity?.id).toBe('circuit');
    expect(updated.selectedActivity?.totalSteps).toBeGreaterThan(0);
  });

  it('startAll assigns the activity to all connected devices', () => {
    manager.simulateHeadsets(session.id, 4);
    selectDemoContent();
    manager.sendTeacherCommand(session.id, { type: 'startAll' });
    const updated = manager.getSession(session.id)!;
    expect(updated.status).toBe('running');
    const startable = updated.devices.filter(
      (d) => d.status === 'connected' || d.status === 'batteryLow',
    );
    expect(startable.length).toBeGreaterThan(0);
    for (const device of startable) {
      expect(device.currentActivityId).toBe('circuit');
    }
  });

  it('startSelected assigns the activity only to selected devices', () => {
    manager.simulateHeadsets(session.id, 2);
    selectDemoContent();
    const [first, second] = manager.getSession(session.id)!.devices;
    manager.selectDevice(session.id, first.id, true);
    manager.sendTeacherCommand(session.id, { type: 'startSelected' });
    expect(first.currentActivityId).toBe('circuit');
    expect(second.currentActivityId).toBeUndefined();
  });

  it('pauseAll changes the session status to paused', () => {
    manager.simulateHeadsets(session.id, 2);
    selectDemoContent();
    manager.sendTeacherCommand(session.id, { type: 'startAll' });
    manager.sendTeacherCommand(session.id, { type: 'pauseAll' });
    const updated = manager.getSession(session.id)!;
    expect(updated.status).toBe('paused');
    expect(updated.progress.every((p) => p.status === 'paused')).toBe(true);
  });

  it('resumeAll returns a paused session and its progress to running', () => {
    manager.simulateHeadsets(session.id, 2);
    selectDemoContent();
    manager.sendTeacherCommand(session.id, { type: 'startAll' });
    manager.sendTeacherCommand(session.id, { type: 'pauseAll' });
    manager.sendTeacherCommand(session.id, { type: 'resumeAll' });
    const updated = manager.getSession(session.id)!;
    expect(updated.status).toBe('running');
    expect(updated.progress.every((p) => p.status === 'running')).toBe(true);
  });

  it('joinHeadset stores the battery level reported by the device', () => {
    const device = manager.joinHeadset(session.id, { batteryPercent: 67 });
    expect(device.batteryPercent).toBe(67);
    const fallback = manager.joinHeadset(session.id);
    expect(fallback.batteryPercent).toBe(100);
  });

  it('stopAll changes the session status and resets running activities', () => {
    manager.simulateHeadsets(session.id, 2);
    selectDemoContent();
    manager.sendTeacherCommand(session.id, { type: 'startAll' });
    manager.sendTeacherCommand(session.id, { type: 'stopAll' });
    const updated = manager.getSession(session.id)!;
    expect(updated.status).toBe('stopped');
    expect(updated.devices.every((d) => d.currentActivityId === undefined)).toBe(true);
    expect(updated.progress.every((p) => p.status === 'stopped')).toBe(true);
  });

  it('syncContent marks reachable devices back to connected', () => {
    manager.simulateHeadsets(session.id, 8);
    const before = manager.getSession(session.id)!.devices;
    expect(before.some((d) => d.status === 'batteryLow')).toBe(true);
    manager.sendTeacherCommand(session.id, { type: 'syncContent' });
    const after = manager.getSession(session.id)!.devices;
    for (const device of after) {
      expect(['connected', 'offline']).toContain(device.status);
    }
  });

  it('progress summary counts running and completed devices', () => {
    manager.simulateHeadsets(session.id, 2);
    selectDemoContent();
    const [first, second] = manager.getSession(session.id)!.devices;
    manager.sendTeacherCommand(session.id, { type: 'startAll' });
    manager.submitProgress(session.id, first.id, {
      activityId: 'circuit',
      currentStepIndex: 6,
      totalSteps: 6,
      scorePercent: 90,
    });
    manager.submitProgress(session.id, second.id, {
      activityId: 'circuit',
      currentStepIndex: 2,
      answersSubmitted: 3,
    });
    const summary = manager.getProgressSummary(session.id);
    expect(summary.totalDevices).toBe(2);
    expect(summary.completedCount).toBe(1);
    expect(summary.runningCount).toBe(1);
    expect(summary.totalAnswersSubmitted).toBe(3);
    expect(summary.averageScorePercent).toBe(90);
  });

  it('batteryLow device is visible and still controllable', () => {
    manager.simulateHeadsets(session.id, 1);
    const device = manager.getSession(session.id)!.devices[0];
    manager.updateDeviceStatus(session.id, device.id, 'batteryLow');
    selectDemoContent();
    manager.sendTeacherCommand(session.id, { type: 'startAll' });
    const updated = manager.getSession(session.id)!.devices[0];
    expect(updated.status).toBe('batteryLow');
    expect(updated.currentActivityId).toBe('circuit');
  });

  it('offline device does not start the activity', () => {
    manager.simulateHeadsets(session.id, 1);
    const device = manager.getSession(session.id)!.devices[0];
    manager.updateDeviceStatus(session.id, device.id, 'offline');
    selectDemoContent();
    manager.sendTeacherCommand(session.id, { type: 'startAll' });
    const updated = manager.getSession(session.id)!.devices[0];
    expect(updated.currentActivityId).toBeUndefined();
    expect(manager.getSession(session.id)!.status).toBe('running');
  });

  it('endDemo command and endSession set the session to ended', () => {
    manager.sendTeacherCommand(session.id, { type: 'endDemo' });
    expect(manager.getSession(session.id)!.status).toBe('ended');
    const other = manager.createSession(LOGIN);
    manager.endSession(other.id);
    expect(manager.getSession(other.id)!.status).toBe('ended');
  });

  it('restoreSession rehydrates a stored session so a fresh manager can continue it', () => {
    manager.simulateHeadsets(session.id, 3);
    selectDemoContent();
    const stored = JSON.parse(JSON.stringify(manager.getSession(session.id))) as ClassroomSession;

    const fresh = new ClassroomSessionManager();
    fresh.restoreSession(stored);
    const device = fresh.joinHeadset(stored.id);
    expect(device.label).toBe('Headset 4');
    fresh.sendTeacherCommand(stored.id, { type: 'startAll' });
    expect(fresh.getSession(stored.id)!.status).toBe('running');
    expect(fresh.getSession(stored.id)!.selectedActivity?.id).toBe('circuit');
  });

  it('starting without a selected activity throws a clear error', () => {
    manager.simulateHeadsets(session.id, 1);
    expect(() => manager.sendTeacherCommand(session.id, { type: 'startAll' })).toThrow(
      /No activity selected/,
    );
  });
});
