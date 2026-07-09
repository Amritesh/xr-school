'use client';

import type { HeadsetDevice } from '@/lib/robotreeTypes';
import { DeviceStatusPill } from './StatusPill';

function batteryIcon(percent: number): string {
  if (percent <= 20) return '🪫';
  return '🔋';
}

export function HeadsetDeviceCard({
  device,
  onToggleSelect,
}: {
  device: HeadsetDevice;
  onToggleSelect: (deviceId: string, selected: boolean) => void;
}) {
  const offline = device.status === 'offline';
  return (
    <button
      type="button"
      className={[
        'rt-device',
        device.selected ? 'rt-device-selected' : '',
        offline ? 'rt-device-offline' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={() => onToggleSelect(device.id, !device.selected)}
      aria-pressed={device.selected}
    >
      <div className="rt-device-head">
        <span className="rt-device-label">
          <span aria-hidden>🥽</span>
          {device.label}
        </span>
        <DeviceStatusPill status={device.status} />
      </div>
      <div className="rt-device-meta">
        <span className="rt-battery">
          <span aria-hidden>{batteryIcon(device.batteryPercent)}</span>
          {device.batteryPercent}%
        </span>
        <span>{device.currentActivityId ? `Phase ${device.currentStepIndex} done` : 'Idle'}</span>
      </div>
      <span className="rt-note" style={{ fontSize: '0.72rem' }}>
        {device.selected ? '✓ Selected for targeted start' : 'Tap to select'}
      </span>
    </button>
  );
}
