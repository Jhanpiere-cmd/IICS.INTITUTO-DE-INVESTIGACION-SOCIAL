-- Tabla para guardar certificados generados
CREATE TABLE IF NOT EXISTS certificates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  issued_at TIMESTAMP DEFAULT NOW(),
  certificate_code TEXT UNIQUE DEFAULT gen_random_uuid()::text,
  pdf_url TEXT,
  UNIQUE(user_id, course_id)
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_certificates_user ON certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_certificates_course ON certificates(course_id);
CREATE INDEX IF NOT EXISTS idx_certificates_code ON certificates(certificate_code);

-- Comentarios
COMMENT ON TABLE certificates IS 'Certificados de completación de cursos';
COMMENT ON COLUMN certificates.certificate_code IS 'Código único de verificación del certificado';
