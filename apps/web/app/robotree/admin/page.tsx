import { RobotreeShell } from '@/components/robotree/RobotreeShell';
import { PremiumTechCard } from '@/components/robotree/PremiumTechCard';

const ADMIN_SECTIONS = [
  { icon: '📖', title: 'Upload Chapters', note: 'Publish syllabus chapters mapped to classes and subjects.' },
  { icon: '🎯', title: 'Upload Activities', note: 'Attach VR/AR activities, 3D models, quizzes and assessments.' },
  { icon: '🏫', title: 'Manage Schools', note: 'School codes, licences and classroom device inventory.' },
  { icon: '📊', title: 'Reports', note: 'Usage, progress and assessment reports per school and class.' },
  { icon: '☁️', title: 'Cloud Sync', note: 'Sync curriculum and reports with the central Robotree cloud.' },
  { icon: '📦', title: 'Offline Content Packages', note: 'Bundle content for classrooms without internet.' },
];

export default function RobotreeAdminPage() {
  return (
    <RobotreeShell meta={<span className="rt-pill rt-pill-blue">Admin Preview</span>}>
      <span className="rt-eyebrow">Admin Panel</span>
      <h1 className="rt-title">Content &amp; School Administration</h1>
      <p className="rt-subtitle">
        Visual placeholder for the production admin panel. These modules ship with the cloud
        release — the classroom demo runs fully offline without them.
      </p>
      <div className="rt-section rt-grid rt-grid-two">
        {ADMIN_SECTIONS.map((section) => (
          <PremiumTechCard key={section.title} icon={section.icon} title={section.title}>
            <p className="rt-note">{section.note}</p>
            <button type="button" className="rt-btn rt-btn-ghost" disabled style={{ marginTop: '0.8rem' }}>
              Coming soon
            </button>
          </PremiumTechCard>
        ))}
      </div>
    </RobotreeShell>
  );
}
