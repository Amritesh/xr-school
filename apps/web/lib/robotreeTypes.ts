/**
 * Robotree VR Smart Classroom — shared types re-exported for the web app.
 * Single source of truth lives in packages/classroom-sync.
 */
export type {
  ActivityOption,
  ActivityType,
  AnswerSubmission,
  ChapterOption,
  ClassOption,
  ClassroomMode,
  ClassroomSession,
  ClassroomSessionStatus,
  ClassroomStateSnapshot,
  CreateRobotreeSessionRequest,
  DemoLogin,
  DeviceConnectionStatus,
  DeviceType,
  HeadsetDevice,
  HeadsetEvent,
  JoinHeadsetRequest,
  ProgressSummary,
  StudentProgress,
  StudentProgressStatus,
  SubjectOption,
  TeacherCommand,
  TeacherCommandType,
} from '@xr-school/classroom-sync';

export {
  DEMO_ACTIVITIES,
  DEMO_CHAPTERS,
  DEMO_CLASSES,
  DEMO_SUBJECTS,
  findActivity,
} from '@xr-school/classroom-sync';
