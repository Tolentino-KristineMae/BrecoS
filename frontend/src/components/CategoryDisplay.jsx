/**
 * Renders a category with logo + name together.
 * If no logo is available, shows name only.
 */
export default function CategoryDisplay({ name, logoUrl, fallback = '—' }) {
  if (!name) return <span>{fallback}</span>;

  if (logoUrl) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <img
          src={logoUrl}
          alt={name}
          style={{ height: 16, width: 'auto', maxWidth: 56, objectFit: 'contain', flexShrink: 0 }}
        />
        <span>{name}</span>
      </span>
    );
  }

  return <span>{name}</span>;
}
