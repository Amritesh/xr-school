import type { ClassroomSessionStatus, DeviceConnectionStatus } from '@/lib/robotreeTypes';

const DEVICE_LABELS: Record<DeviceConnectionStatus, { label: string; tone: string }> = {
  connected: { label: 'Connected', tone: 'rt-pill-green' },
  batteryLow: { label: 'Battery Low', tone: 'rt-pill-amber' },
  offline: { label: 'Offline', tone: 'rt-pill-red' },
  syncing: { label: 'Syncing', tone: 'rt-pill-blue' },
};

const SESSION_LABELS: Record<ClassroomSessionStatus, { label: string; tone: string }> = {
  draft: { label: 'Draft', tone: '' },
  open: { label: 'Open', tone: 'rt-pill-blue' },
  running: { label: 'Running', tone: 'rt-pill-green' },
  paused: { label: 'Paused', tone: 'rt-pill-amber' },
  stopped: { label: 'Stopped', tone: 'rt-pill-red' },
  ended: { label: 'Ended', tone: '' },
};

export function DeviceStatusPill({ status }: { status: DeviceConnectionStatus }) {
  const { label, tone } = DEVICE_LABELS[status];
  return <span className={`rt-pill ${tone}`}>{label}</span>;
}

export function SessionStatusPill({ status }: { status: ClassroomSessionStatus }) {
  const { label, tone } = SESSION_LABELS[status];
  return <span className={`rt-pill ${tone}`}>{label}</span>;
}
