import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  Table, 
  TableRow, 
  TableCell, 
  WidthType, 
  BorderStyle, 
  AlignmentType, 
  HeadingLevel,
  Header,
  Footer,
  VerticalAlign,
  ShadingType,
  ImageRun
} from 'docx';
import { saveAs } from 'file-saver';

interface TableCellStyles {
  fill?: string;
  bold?: boolean;
  color?: string;
  alignment?: any;
  size?: number;
}

interface DocxSection {
  heading?: string;
  text?: string;
  type?: 'paragraph' | 'table' | 'header' | 'bullet' | 'divider' | 'image';
  rows?: (string | { text: string; styles?: TableCellStyles })[][];
  bullets?: string[];
  image?: {
    data: ArrayBuffer | string;
    type?: 'png' | 'jpg' | 'gif' | 'bmp';
    width: number;
    height: number;
  };
}

interface DocxData {
  title: string;
  sections: DocxSection[];
  author?: string;
  skipSave?: boolean;
}

const parseMarkdownToTextRuns = (text: string): TextRun[] => {
  const runs: TextRun[] = [];
  // Soporte básico para **bold**, *italic*, y `code`
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);
  
  parts.forEach(part => {
    if (part.startsWith('**') && part.endsWith('**')) {
      runs.push(new TextRun({ text: part.slice(2, -2), bold: true }));
    } else if (part.startsWith('*') && part.endsWith('*')) {
      runs.push(new TextRun({ text: part.slice(1, -1), italics: true }));
    } else if (part.startsWith('`') && part.endsWith('`')) {
      runs.push(new TextRun({ text: part.slice(1, -1), font: 'Courier New', color: '0088ff' }));
    } else if (part) {
      runs.push(new TextRun({ text: part }));
    }
  });
  
  return runs;
};

export const generateProfessionalDocx = async (data: DocxData): Promise<Blob> => {
  const { title, sections, author = 'HOYR AI - Sistema SGR-ACS' } = data;

  const doc = new Document({
    creator: author,
    title: title,
    description: 'Documento generado automáticamente por HOYR AI',
    sections: [
      {
        properties: {},
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'SISTEMA DE GESTIÓN DE REVISTA - ACS',
                    bold: true,
                    size: 20,
                    color: '2563EB',
                  }),
                ],
                alignment: AlignmentType.RIGHT,
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Generado por HOYR AI el ${new Date().toLocaleDateString('es-ES')} | Página `,
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
        },
        children: [
          // Título principal
          new Paragraph({
            text: title.toUpperCase(),
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),

          ...sections.flatMap((section) => {
            const elements: any[] = [];

            if (section.heading) {
              elements.push(
                new Paragraph({
                  text: section.heading,
                  heading: HeadingLevel.HEADING_2,
                  spacing: { before: 240, after: 120 },
                })
              );
            }

            if (section.type === 'divider') {
              elements.push(
                new Paragraph({
                  border: {
                    bottom: { color: 'E5E7EB', space: 1, style: BorderStyle.SINGLE, size: 6 }
                  },
                  spacing: { before: 200, after: 200 }
                })
              );
            }

            if (section.type === 'table' && section.rows) {
              const table = new Table({
                width: {
                  size: 100,
                  type: WidthType.PERCENTAGE,
                },
                rows: section.rows.map((row, rowIndex) => 
                  new TableRow({
                    children: row.map((cell) => {
                      const isHeader = rowIndex === 0;
                      const cellValue = typeof cell === 'object' ? cell.text : cell;
                      const cellStyles = typeof cell === 'object' ? cell.styles : {};

                      return new TableCell({
                        shading: {
                          fill: cellStyles?.fill || (isHeader ? 'F3F4F6' : undefined),
                          type: ShadingType.CLEAR,
                          color: 'auto',
                        },
                        verticalAlign: VerticalAlign.CENTER,
                        children: [
                          new Paragraph({ 
                            children: [
                              new TextRun({
                                text: cellValue,
                                color: cellStyles?.color || (isHeader ? '111827' : '374151'),
                                bold: cellStyles?.bold !== undefined ? cellStyles.bold : isHeader,
                                size: cellStyles?.size || 18,
                              })
                            ],
                            spacing: { before: 120, after: 120 },
                            alignment: cellStyles?.alignment || (isHeader ? AlignmentType.CENTER : AlignmentType.LEFT)
                          })
                        ],
                        borders: {
                          top: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
                          bottom: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
                          left: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
                          right: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
                        }
                      });
                    }),
                  })
                ),
              });
              elements.push(table);
            } 
            else if (section.type === 'image' && section.image) {
              elements.push(
                new Paragraph({
                  children: [
                    new ImageRun({
                      data: section.image.data,
                      type: section.image.type || 'png',
                      transformation: {
                        width: section.image.width,
                        height: section.image.height,
                      },
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 200 },
                })
              );
            } 
            else if (section.bullets) {
              section.bullets.forEach((bullet) => {
                elements.push(
                  new Paragraph({
                    children: parseMarkdownToTextRuns(bullet),
                    bullet: { level: 0 },
                    spacing: { after: 120 },
                  })
                );
              });
            }
            else if (section.text) {
              const lines = section.text.split('\n');
              lines.forEach((line) => {
                if (line.trim()) {
                  elements.push(
                    new Paragraph({
                      children: parseMarkdownToTextRuns(line),
                      spacing: { after: 200 },
                    })
                  );
                }
              });
            }

            return elements;
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  if (!data.skipSave) {
    saveAs(blob, `${title.replace(/\s+/g, '_')}_${Date.now()}.docx`);
  }
  return blob;
};
