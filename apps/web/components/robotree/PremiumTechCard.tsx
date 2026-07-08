export function PremiumTechCard({
  icon,
  title,
  actions,
  children,
}: {
  icon?: string;
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rt-card">
      <div className="rt-card-title" style={{ justifyContent: 'space-between' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.55rem' }}>
          {icon ? (
            <span className="rt-card-icon" aria-hidden>
              {icon}
            </span>
          ) : null}
          {title}
        </span>
        {actions}
      </div>
      {children}
    </section>
  );
}
