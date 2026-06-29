import { googleAuthService } from './googleAuth';

export const googleDocsService = {
  /**
   * Crea un nuevo documento de Google Docs
   */
  async createDocument(title: string) {
    const token = await googleAuthService.getValidToken();
    if (!token) throw new Error('No Google connection. Please connect your Google account.');

    const response = await fetch('https://docs.googleapis.com/v1/documents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    
    return data; // Retorna { documentId, title, ... }
  },

  async insertText(documentId: string, text: string) {
    const token = await googleAuthService.getValidToken();
    if (!token) throw new Error('No Google connection');

    // Parse Markdown to Google Docs Requests
    // Se debe insertar de atrÃ¡s hacia adelante para que los Ã­ndices no se desplacen,
    // o insertarlo todo crudo y luego aplicar estilos?
    // MÃ¡s fÃ¡cil: crear las peticiones secuencialmente pero pre-procesando el texto.
    const requests: any[] = [];
    let currentIndex = 1; // Google Docs starting index is 1

    const lines = text.split('\n');

    for (const line of lines) {
      let isHeading1 = false;
      let isHeading2 = false;
      let isHeading3 = false;
      let isBullet = false;
      
      let rawLine = line.trimRight(); // Keep left spaces, trim right
      
      if (rawLine.startsWith('# ')) {
        isHeading1 = true;
        rawLine = rawLine.substring(2);
      } else if (rawLine.startsWith('## ')) {
        isHeading2 = true;
        rawLine = rawLine.substring(3);
      } else if (rawLine.startsWith('### ')) {
        isHeading3 = true;
        rawLine = rawLine.substring(4);
      } else if (rawLine.startsWith('- ') || rawLine.startsWith('* ')) {
        isBullet = true;
        rawLine = rawLine.substring(2);
      }

      // Procesar negritas **texto**
      const boldSpans: {start: number, end: number}[] = [];
      while (true) {
        const match = /\*\*(.*?)\*\*/.exec(rawLine);
        if (!match) break;
        const start = match.index;
        const innerText = match[1];
        boldSpans.push({ start: currentIndex + start, end: currentIndex + start + innerText.length });
        // Reemplazar quitando los asteriscos
        rawLine = rawLine.slice(0, start) + innerText + rawLine.slice(start + match[0].length);
      }

      const lineText = rawLine + '\n';
      const startIndex = currentIndex;
      const endIndex = currentIndex + lineText.length;

      // 1. Insert Text
      requests.push({
        insertText: {
          location: { index: startIndex },
          text: lineText
        }
      });

      // 2. Apply Paragraph Style
      if (isHeading1 || isHeading2 || isHeading3) {
        requests.push({
          updateParagraphStyle: {
            range: { startIndex, endIndex },
            paragraphStyle: { 
              namedStyleType: isHeading1 ? 'HEADING_1' : isHeading2 ? 'HEADING_2' : 'HEADING_3' 
            },
            fields: 'namedStyleType'
          }
        });
      }

      // 3. Apply Bullet Style
      if (isBullet) {
        requests.push({
          createParagraphBullets: {
            range: { startIndex, endIndex },
            bulletPreset: 'BULLET_DISC_CIRCLE_SQUARE'
          }
        });
      }

      // 4. Apply Bold Styles
      boldSpans.forEach(span => {
        requests.push({
          updateTextStyle: {
            range: { startIndex: span.start, endIndex: span.end },
            textStyle: { bold: true },
            fields: 'bold'
          }
        });
      });

      currentIndex = endIndex;
    }

    // Ejecutar BatchUpdate
    const response = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ requests })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    
    return data;
  },

  /**
   * Genera la URL pública del documento
   */
  getDocUrl(documentId: string) {
    return `https://docs.google.com/document/d/${documentId}/edit`;
  },

  /**
   * Crea un documento y le inserta contenido de una vez
   */
  async createFullDocument(title: string, content: string) {
    const doc = await this.createDocument(title);
    if (content) {
      await this.insertText(doc.documentId, content);
    }
    return {
      ...doc,
      documentUrl: this.getDocUrl(doc.documentId)
    };
  }
};
