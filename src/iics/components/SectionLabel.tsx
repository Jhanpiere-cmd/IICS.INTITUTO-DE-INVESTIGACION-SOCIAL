/**
 * IICS / Archivo negro: etiqueta monoespaciada, pequeña y precisa para orientar la lectura sin añadir decoración.
 */
type SectionLabelProps = {
  index: string;
  children: React.ReactNode;
};

export function SectionLabel({ index, children }: SectionLabelProps) {
  return (
    <div className="section-label">
      <span className="section-label__index">{index}</span>
      <span>{children}</span>
    </div>
  );
}
