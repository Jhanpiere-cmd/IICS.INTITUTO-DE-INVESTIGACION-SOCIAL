/**
 * IICS / Archivo negro: navegación institucional sticky, compacta y silenciosa; el logo adjunto es la marca principal.
 */
import { useEffect, useState } from "react";

const navigation = [
  { label: "Inicio", href: "/", key: "inicio" },
  { label: "Investigación", href: "/#investigacion" },
  { label: "Observatorio", href: "/#observatorio" },
  { label: "Formación", href: "/#formacion" },
  { label: "Documentales", href: "/#documentales" },
  { label: "Publicaciones", href: "/#publicaciones", key: "publicaciones" },
  { label: "Nosotros", href: "/#nosotros", key: "nosotros" },
];

export function IicsHeader({ current }: { current?: string }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`site-header ${scrolled ? "site-header--scrolled" : ""}`}>
      <div className="header-inner">
        <a className="brand-lockup" href="/" aria-label="IICS, volver al inicio">
          <img src="/iics-assets/iics-logo-siglas.png" alt="IICS" className="brand-lockup__logo" />
          <span className="brand-lockup__name">
            Instituto de Investigación
            <br />
            Científica Social
          </span>
        </a>

        <nav className="desktop-nav" aria-label="Navegación principal">
          {navigation.map((item) => (
            <a key={item.href} className={current === item.key ? "header-nav-link header-nav-link--active" : "header-nav-link"} href={item.href} aria-current={current === item.key ? "page" : undefined}>{item.label}</a>
          ))}
        </nav>

        <a className={`header-portal ${current === "portal" ? "header-portal--active" : ""}`} href="/portal">Portal <span aria-hidden="true">↗</span></a>

        <button
          className="mobile-menu-button"
          type="button"
          aria-expanded={menuOpen}
          aria-controls="mobile-nav"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? "Cerrar" : "Menú"}
        </button>
      </div>

      <nav id="mobile-nav" className={`mobile-nav ${menuOpen ? "mobile-nav--open" : ""}`} aria-label="Navegación móvil">
        {navigation.map((item) => (
          <a key={item.href} className={current === item.key ? "mobile-nav__link mobile-nav__link--active" : "mobile-nav__link"} href={item.href} aria-current={current === item.key ? "page" : undefined} onClick={() => setMenuOpen(false)}>{item.label}</a>
        ))}
        <a href="/portal" onClick={() => setMenuOpen(false)}>Portal <span aria-hidden="true">↗</span></a>
      </nav>
    </header>
  );
}
