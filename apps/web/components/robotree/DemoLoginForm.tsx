'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSession, saveDemoLogin } from '@/lib/robotreeClient';
import { DEMO_CLASSES } from '@/lib/robotreeTypes';

export function DemoLoginForm() {
  const router = useRouter();
  const [teacherName, setTeacherName] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startDemo(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const session = await createSession({
        teacherName: teacherName.trim() || 'Demo Teacher',
        schoolName: schoolName.trim() || 'Robotree Demo School',
        schoolCode: (schoolName.trim() || 'RBT-DEMO').slice(0, 12).toUpperCase(),
        selectedClass,
      });
      saveDemoLogin(
        {
          teacherName: session.teacherName,
          schoolName: session.schoolName,
          schoolCode: session.schoolCode,
          selectedClass,
        },
        session.id,
      );
      router.push('/robotree/dashboard');
    } catch (err) {
      setError(
        err instanceof Error
          ? `${err.message} — could not reach the classroom API.`
          : 'Could not start the demo session.',
      );
      setBusy(false);
    }
  }

  return (
    <form className="rt-login-card" onSubmit={startDemo}>
      <span className="rt-pill rt-pill-green" style={{ marginBottom: '0.9rem' }}>
        Demo Login
      </span>
      <h1 className="rt-title" style={{ fontSize: '1.5rem' }}>
        Robotree VR Smart Classroom
      </h1>
      <p className="rt-note" style={{ marginBottom: '1.3rem' }}>
        One teacher tablet controls every headset in the room over local Wi-Fi. No account needed
        for the demo.
      </p>

      <div className="rt-field">
        <label htmlFor="rt-teacher">Teacher Name</label>
        <input
          id="rt-teacher"
          value={teacherName}
          onChange={(e) => setTeacherName(e.target.value)}
          placeholder="e.g. Anita Sharma"
          autoComplete="name"
        />
      </div>
      <div className="rt-field">
        <label htmlFor="rt-school">School Name / School Code</label>
        <input
          id="rt-school"
          value={schoolName}
          onChange={(e) => setSchoolName(e.target.value)}
          placeholder="e.g. Green Valley Public School"
        />
      </div>
      <div className="rt-field">
        <label htmlFor="rt-class">Class</label>
        <select id="rt-class" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
          <option value="">Choose later on the dashboard</option>
          {DEMO_CLASSES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <p className="rt-note" style={{ color: 'var(--rt-red)', marginBottom: '0.8rem' }}>
          {error}
        </p>
      ) : null}

      <button type="submit" className="rt-btn rt-btn-primary" disabled={busy} style={{ width: '100%' }}>
        {busy ? 'Starting…' : '▶ Start Demo'}
      </button>
    </form>
  );
}
