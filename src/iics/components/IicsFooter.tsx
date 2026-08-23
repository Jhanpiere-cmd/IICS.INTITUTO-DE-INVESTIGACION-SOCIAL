/**
 * IICS / Archivo negro: footer de navegación institucional; debe orientar hacia contenidos reales y no simular presencia social.
 */
export function IicsFooter() {
  return (
    <footer className="site-footer internal-footer" id="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <img src="/iics-assets/iics-logo-siglas.png" alt="IICS" />
          <p>Instituto de Investigación Científica Social.<br />Cajamarca, Perú.</p>
        </div>
        <div className="footer-links">
          <div>
            <span className="footer-heading">Explorar</span>
            <a href="/">Inicio</a>
            <a href="/#investigacion">Investigación</a>
            <a href="/#observatorio">Observatorio</a>
          </div>
          <div>
            <span className="footer-heading">Archivo</span>
            <a href="/#publicaciones">Publicaciones</a>
            <a href="/#documentales">Documentales</a>
            <a href="/#nosotros">Nosotros</a>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© IICS</span>
        <span>Investigación social desde Cajamarca</span>
      </div>
    </footer>
  );
}
