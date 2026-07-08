import Link from 'next/link';

export function RobotreeShell({
  meta,
  children,
}: {
  meta?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="rt-topbar">
        <Link href="/robotree/login" className="rt-brand">
          <span className="rt-brand-mark" aria-hidden>
            🥽
          </span>
          <span className="rt-brand-name">
            <strong>Robotree VR Smart Classroom</strong>
            <small>Centralized classroom control</small>
          </span>
        </Link>
        <div className="rt-topbar-meta">{meta}</div>
      </header>
      <main className="rt-main">{children}</main>
    </>
  );
}
