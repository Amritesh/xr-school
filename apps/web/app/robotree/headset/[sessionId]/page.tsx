'use client';

import { useParams } from 'next/navigation';
import { RobotreeShell } from '@/components/robotree/RobotreeShell';
import { StudentHeadsetView } from '@/components/robotree/StudentHeadsetView';

export default function RobotreeHeadsetSessionPage() {
  const params = useParams<{ sessionId: string }>();
  return (
    <RobotreeShell meta={<span className="rt-pill rt-pill-blue">Headset Client</span>}>
      <StudentHeadsetView sessionId={params.sessionId} />
    </RobotreeShell>
  );
}
