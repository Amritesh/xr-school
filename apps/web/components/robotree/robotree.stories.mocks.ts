import type {
  ClassroomSession,
  HeadsetDevice,
  ProgressSummary,
  StudentProgress,
} from '@/lib/robotreeTypes';
import { DEMO_ACTIVITIES } from '@/lib/robotreeTypes';

/** Static mocks for Robotree component stories. No real API calls in stories. */

export const MOCK_DEVICES: HeadsetDevice[] = [
  {
    id: 'hs-mock-1',
    label: 'Headset 1',
    deviceType: 'vrHeadset',
    status: 'connected',
    batteryPercent: 93,
    selected: true,
    currentActivityId: 'vr-activity-1',
    currentStepIndex: 2,
    lastSeenAt: '2026-07-08T09:30:00.000Z',
  },
  {
    id: 'hs-mock-2',
    label: 'Headset 2',
    deviceType: 'vrHeadset',
    status: 'connected',
    batteryPercent: 71,
    selected: false,
    currentActivityId: 'vr-activity-1',
    currentStepIndex: 1,
    lastSeenAt: '2026-07-08T09:30:00.000Z',
  },
  {
    id: 'hs-mock-3',
    label: 'Headset 3',
    deviceType: 'vrHeadset',
    status: 'batteryLow',
    batteryPercent: 14,
    selected: false,
    currentActivityId: 'vr-activity-1',
    currentStepIndex: 3,
    lastSeenAt: '2026-07-08T09:30:00.000Z',
  },
  {
    id: 'hs-mock-4',
    label: 'Headset 4',
    deviceType: 'vrHeadset',
    status: 'offline',
    batteryPercent: 58,
    selected: false,
    currentStepIndex: 0,
    lastSeenAt: '2026-07-08T09:12:00.000Z',
  },
];

export const MOCK_PROGRESS: StudentProgress[] = [
  {
    deviceId: 'hs-mock-1',
    activityId: 'vr-activity-1',
    status: 'running',
    currentStepIndex: 2,
    totalSteps: 6,
    answersSubmitted: 1,
    scorePercent: 64,
    lastUpdatedAt: '2026-07-08T09:31:00.000Z',
  },
  {
    deviceId: 'hs-mock-2',
    activityId: 'vr-activity-1',
    status: 'completed',
    currentStepIndex: 6,
    totalSteps: 6,
    answersSubmitted: 3,
    scorePercent: 88,
    lastUpdatedAt: '2026-07-08T09:32:00.000Z',
  },
];

export const MOCK_SESSION: ClassroomSession = {
  id: 'rt-mockdemo',
  joinCode: 'K7M2PX',
  schoolCode: 'GVPS-01',
  schoolName: 'Green Valley Public School',
  teacherName: 'Anita Sharma',
  selectedClass: 'class-8',
  selectedSubject: 'science',
  selectedChapter: 'chapter-2',
  selectedActivity: DEMO_ACTIVITIES[0],
  mode: 'instructorLed',
  status: 'running',
  devices: MOCK_DEVICES,
  progress: MOCK_PROGRESS,
  currentStepIndex: 0,
  createdAt: '2026-07-08T09:00:00.000Z',
  updatedAt: '2026-07-08T09:32:00.000Z',
};

export const MOCK_EMPTY_SESSION: ClassroomSession = {
  ...MOCK_SESSION,
  status: 'open',
  selectedActivity: undefined,
  selectedChapter: undefined,
  devices: [],
  progress: [],
};

export const MOCK_SUMMARY: ProgressSummary = {
  sessionId: 'rt-mockdemo',
  totalDevices: 4,
  connectedDevices: 3,
  runningCount: 1,
  pausedCount: 0,
  completedCount: 1,
  stoppedCount: 0,
  totalAnswersSubmitted: 4,
  averageScorePercent: 76,
  entries: MOCK_PROGRESS,
};

export const MOCK_EMPTY_SUMMARY: ProgressSummary = {
  sessionId: 'rt-mockdemo',
  totalDevices: 0,
  connectedDevices: 0,
  runningCount: 0,
  pausedCount: 0,
  completedCount: 0,
  stoppedCount: 0,
  totalAnswersSubmitted: 0,
  entries: [],
};
