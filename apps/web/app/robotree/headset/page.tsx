'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RobotreeShell } from '@/components/robotree/RobotreeShell';
import { getSnapshot } from '@/lib/robotreeClient';

export default function RobotreeHeadsetJoinPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function join(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    try {
      // Accepts either the full session id or the short join code.
      const snapshot = await getSnapshot(trimmed);
      router.push(`/robotree/headset/${snapshot.session.id}`);
    } catch {
      setError('No classroom found for that code. Ask the teacher for the join code.');
      setBusy(false);
    }
  }

  return (
    <RobotreeShell meta={<span className="rt-pill rt-pill-blue">Headset Client</span>}>
      <div className="rt-login-wrap" style={{ minHeight: 'calc(100vh - 10rem)' }}>
        <form className="rt-login-card" onSubmit={join}>
          <span className="rt-pill rt-pill-green" style={{ marginBottom: '0.9rem' }}>
            🥽 Join Classroom
          </span>
          <h1 className="rt-title" style={{ fontSize: '1.4rem' }}>
            Connect this headset
          </h1>
          <p className="rt-note" style={{ marginBottom: '1.2rem' }}>
            Enter the join code or session id shown on the teacher tablet. The headset pairs
            automatically and waits for the teacher to start an activity.
          </p>
          <div className="rt-field">
            <label htmlFor="rt-join-code">Join code / Session id</label>
            <input
              id="rt-join-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. K7M2PX or rt-a1b2c3d4"
              autoCapitalize="characters"
              autoComplete="off"
            />
          </div>
          {error ? (
            <p className="rt-note" style={{ color: 'var(--rt-red)', marginBottom: '0.8rem' }}>
              {error}
            </p>
          ) : null}
          <button type="submit" className="rt-btn rt-btn-primary" disabled={busy} style={{ width: '100%' }}>
            {busy ? 'Joining…' : 'Join as Headset'}
          </button>
        </form>
      </div>
    </RobotreeShell>
  );
}
