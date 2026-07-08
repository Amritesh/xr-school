import type { Metadata } from 'next';
import './robotree.css';

export const metadata: Metadata = {
  title: 'Robotree VR Smart Classroom',
  description: 'Centralized VR classroom control — one teacher tablet, many headsets.',
};

export default function RobotreeLayout({ children }: { children: React.ReactNode }) {
  return <div className="rt-root">{children}</div>;
}
