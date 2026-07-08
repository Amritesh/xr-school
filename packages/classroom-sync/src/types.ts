/**
 * Robotree VR Smart Classroom — shared types for local-first classroom sync.
 *
 * TODO: replace in-memory store with persistent local/cloud storage.
 * TODO: add real school authentication.
 */

export type ClassroomMode = 'instructorLed' | 'selfPlay';

export type ClassroomSessionStatus =
  | 'draft'
  | 'open'
  | 'running'
  | 'paused'
  | 'stopped'
  | 'ended';

export type DeviceConnectionStatus = 'connected' | 'offline' | 'batteryLow' | 'syncing';

export type DeviceType = 'vrHeadset' | 'tablet' | 'desktop' | 'unknown';

export type ActivityType = 'vrActivity' | 'arActivity' | 'threeDModel' | 'quiz' | 'assessment';

export type TeacherCommandType =
  | 'startSelected'
  | 'startAll'
  | 'pauseAll'
  | 'stopAll'
  | 'syncContent'
  | 'selectContent'
  | 'setMode'
  | 'endDemo';

export type StudentProgressStatus = 'notStarted' | 'running' | 'paused' | 'completed' | 'stopped';

export interface DemoLogin {
  teacherName: string;
  schoolName: string;
  schoolCode: string;
  selectedClass: string;
}

export interface ClassOption {
  id: string;
  label: string;
  icon: string;
}

export interface SubjectOption {
  id: string;
  label: string;
  icon: string;
}

export interface ChapterOption {
  id: string;
  label: string;
  summary: string;
}

export interface ActivityOption {
  id: string;
  title: string;
  type: ActivityType;
  estimatedMinutes: number;
  totalSteps: number;
  description: string;
}

export interface HeadsetDevice {
  id: string;
  /** Display label such as "Headset 1". */
  label: string;
  deviceType: DeviceType;
  status: DeviceConnectionStatus;
  /** TODO: replace simulated battery with native headset battery API. */
  batteryPercent: number;
  selected: boolean;
  currentActivityId?: string;
  currentStepIndex: number;
  lastSeenAt: string;
}

export interface StudentProgress {
  deviceId: string;
  activityId: string;
  status: StudentProgressStatus;
  currentStepIndex: number;
  totalSteps: number;
  answersSubmitted: number;
  scorePercent?: number;
  lastUpdatedAt: string;
}

export interface ClassroomSession {
  id: string;
  joinCode: string;
  schoolCode: string;
  schoolName: string;
  teacherName: string;
  selectedClass?: string;
  selectedSubject?: string;
  selectedChapter?: string;
  selectedActivity?: ActivityOption;
  mode: ClassroomMode;
  status: ClassroomSessionStatus;
  devices: HeadsetDevice[];
  progress: StudentProgress[];
  currentStepIndex: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProgressSummary {
  sessionId: string;
  totalDevices: number;
  connectedDevices: number;
  runningCount: number;
  pausedCount: number;
  completedCount: number;
  stoppedCount: number;
  totalAnswersSubmitted: number;
  averageScorePercent?: number;
  entries: StudentProgress[];
}

export interface ClassroomStateSnapshot {
  session: ClassroomSession;
  summary: ProgressSummary;
  serverTime: string;
}

export interface CreateRobotreeSessionRequest {
  login: DemoLogin;
}

export interface JoinHeadsetRequest {
  deviceType?: DeviceType;
  label?: string;
}

export interface TeacherCommand {
  type: TeacherCommandType;
  /** Device ids the command targets; used by startSelected. */
  deviceIds?: string[];
  mode?: ClassroomMode;
  selectedClass?: string;
  selectedSubject?: string;
  selectedChapter?: string;
  activityId?: string;
}

export interface HeadsetEvent {
  type: 'teacher.command' | 'headset.joined' | 'headset.progress' | 'session.snapshot' | 'error';
  payload: unknown;
}

export interface AnswerSubmission {
  deviceId: string;
  activityId: string;
  questionIndex: number;
  answer: string;
  correct?: boolean;
}
