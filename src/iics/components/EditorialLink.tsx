/**
 * IICS / Archivo negro: enlaces editoriales con flecha tipográfica y una transición breve, sin iconos decorativos.
 */
type EditorialLinkProps = {
  href: string;
  children: React.ReactNode;
  variant?: "default" | "solid";
  onClick?: () => void;
};

export function EditorialLink({ href, children, variant = "default", onClick }: EditorialLinkProps) {
  return (
    <a className={`editorial-link editorial-link--${variant}`} href={href} onClick={onClick}>
      <span>{children}</span>
      <span className="editorial-link__arrow" aria-hidden="true">→</span>
    </a>
  );
}
