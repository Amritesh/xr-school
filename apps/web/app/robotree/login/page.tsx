import Link from 'next/link';
import { DemoLoginForm } from '@/components/robotree/DemoLoginForm';

export default function RobotreeLoginPage() {
  return (
    <div className="rt-login-wrap">
      <div style={{ display: 'grid', gap: '0.9rem', justifyItems: 'center' }}>
        <DemoLoginForm />
        <p className="rt-note">
          Joining as a headset? Open <Link href="/robotree/headset" className="rt-code">/robotree/headset</Link>{' '}
          on the device. · <Link href="/robotree/admin" style={{ textDecoration: 'underline' }}>Admin panel</Link>
        </p>
      </div>
    </div>
  );
}
