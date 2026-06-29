/**
 * Generador de Plantillas de Correo SGR-ACS
 * Transforma contenido Markdown en HTML enriquecido con estética Cyber-Deep Tech.
 */

export const generateEmailHtml = (title: string, content: string): string => {
    // 1. Procesar Markdown básico a HTML
    const processedContent = markdownToHtml(content);

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;700&family=JetBrains+Mono&display=swap');
        
        body {
            background-color: #050505;
            color: #e0e0e0;
            font-family: 'Outfit', -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif;
            margin: 0;
            padding: 0;
            line-height: 1.6;
        }
        
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #0a0a0a;
            border: 1px solid #1a1a1a;
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(90deg, #001a33 0%, #000000 100%);
            padding: 40px 30px;
            text-align: center;
            border-bottom: 2px solid #0088ff;
            position: relative;
        }
        
        .logo {
            font-size: 24px;
            font-weight: 700;
            letter-spacing: 5px;
            color: #fff;
            text-transform: uppercase;
            margin: 0;
        }
        
        .accent-bar {
            height: 2px;
            background: linear-gradient(90deg, #0088ff, #ff0088);
            width: 100%;
        }
        
        .content {
            padding: 40px 30px;
        }
        
        h1, h2, h3 {
            color: #0088ff;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        p {
            margin-bottom: 20px;
            font-size: 15px;
            color: #cccccc;
        }
        
        /* Estilos para Tablas Markdown */
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 25px 0;
            font-family: 'JetBrains Mono', monospace;
            font-size: 12px;
            background-color: #111;
            border: 1px solid #333;
        }
        
        th {
            background-color: #001a33;
            color: #0088ff;
            text-align: left;
            padding: 12px;
            border: 1px solid #333;
            text-transform: uppercase;
        }
        
        td {
            padding: 10px;
            border: 1px solid #222;
            color: #aaa;
        }
        
        tr:nth-child(even) {
            background-color: #0d0d0d;
        }
        
        .footer {
            background-color: #000;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #1a1a1a;
            font-size: 11px;
            color: #444;
        }
        
        .footer p {
            margin: 5px 0;
            font-family: 'JetBrains Mono', monospace;
        }
        
        .button {
            display: inline-block;
            padding: 12px 25px;
            background-color: #0088ff;
            color: #000;
            text-decoration: none;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 2px;
            font-size: 12px;
            margin: 20px 0;
        }
        
        .quote {
            border-left: 3px solid #ff0088;
            padding-left: 15px;
            margin: 20px 0;
            font-style: italic;
            color: #888;
        }

        .highlight {
            color: #00ff88;
            font-weight: bold;
        }

        .birthday-card {
            border: 2px solid #ff0088;
            padding: 30px;
            background: linear-gradient(135deg, #0a0a0a 0%, #111 100%);
            text-align: center;
            position: relative;
            box-shadow: 0 0 20px rgba(255, 0, 136, 0.2);
        }

        .birthday-title {
            font-size: 28px;
            font-weight: 800;
            color: #fff;
            text-transform: uppercase;
            letter-spacing: -1px;
            margin-bottom: 10px;
        }

        .birthday-glow {
            color: #ff0088;
            text-shadow: 0 0 10px rgba(255, 0, 136, 0.5);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="logo">SGR-ACS</h1>
            <div style="font-size: 10px; color: #0088ff; letter-spacing: 3px; margin-top: 5px;">TACTICAL_COMMUNICATION_WAVE</div>
        </div>
        <div class="accent-bar"></div>
        <div class="content">
            <h2>${title}</h2>
            ${processedContent}
        </div>
        <div class="footer">
            <p>© ${new Date().getFullYear()} SISTEMA GENERAL DE REVISTA ACS</p>
            <p>S/N_SECURE_NODE_X100 | INTEGRIDAD ACADÉMICA</p>
            <p style="color: #666; font-size: 9px; margin-top: 15px;">Este es un mensaje generado automáticamente por el núcleo HOYR. Por favor, no responda directamente a este correo sin verificar los protocolos institucionales.</p>
        </div>
    </div>
</body>
</html>
    `;
};

/**
 * Conversor simple de Markdown a HTML optimizado para correos.
 * Soporta: Negritas, Listas, Tablas, Saltos de línea, Citas.
 */
function markdownToHtml(md: string): string {
    let html = md;

    // 1. Limpiar espacios extra
    html = html.trim();

    // 2. Tablas Markdown (Protocolo Crítico)
    // Busca patrones de tablas | col 1 | col 2 | ...
    const tableRegex = /^\|(.+)\|\n\|([\s\-\|:]+)\|\n((?:\|.+\|\n?)+)/gm;
    html = html.replace(tableRegex, (match, header, separator, body) => {
        const headers = header.split('|').map(h => h.trim()).filter(Boolean);
        const rows = body.trim().split('\n').map(row => 
            row.split('|').map(cell => cell.trim()).filter(Boolean)
        );

        let tableHtml = '<table><thead><tr>';
        headers.forEach(h => { tableHtml += `<th>${h}</th>`; });
        tableHtml += '</tr></thead><tbody>';
        
        rows.forEach(cells => {
            tableHtml += '<tr>';
            cells.forEach(c => { tableHtml += `<td>${c}</td>`; });
            tableHtml += '</tr>';
        });

        tableHtml += '</tbody></table>';
        return tableHtml;
    });

    // 3. Negritas
    html = html.replace(/\*\*(.*?)\*\*/g, '<span class="highlight">$1</span>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // 4. Listas
    html = html.replace(/^\s*[-*]\s+(.*)/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
    // Limpiar nesting excesivo de <ul> 
    html = html.replace(/<\/ul>\n<ul>/g, '\n');

    // 5. Citas
    html = html.replace(/^>\s+(.*)/gm, '<div class="quote">$1</div>');

    // 6. Títulos
    html = html.replace(/^### (.*)/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.*)/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.*)/gm, '<h1>$1</h1>');

    // 7. Saltos de línea a P
    const paragraphs = html.split('\n\n');
    html = paragraphs.map(p => {
        if (p.trim().startsWith('<h') || p.trim().startsWith('<table') || p.trim().startsWith('<ul')) return p;
        return `<p>${p.replace(/\n/g, '<br>')}</p>`;
    }).join('\n');

    return html;
}

/**
 * Genera el HTML para un saludo de cumpleaños con estética Cyber-Deep Tech.
 */
export const generateBirthdayEmailTemplate = (name: string, senderName: string = 'Dirección ACS'): string => {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;800&family=JetBrains+Mono&display=swap');
        
        body { 
            background-color: #050505; 
            color: #e0e0e0; 
            font-family: 'Outfit', sans-serif; 
            margin: 0; 
            padding: 40px 20px; 
        }

        .card {
            max-width: 500px;
            margin: 0 auto;
            background: #0a0a0a;
            border: 2px solid #ff0088;
            position: relative;
            padding: 50px 30px;
            text-align: center;
            box-shadow: 0 0 40px rgba(255, 0, 136, 0.15);
        }

        .header-status {
            font-family: 'JetBrains Mono', monospace;
            font-size: 10px;
            color: #ff0088;
            letter-spacing: 4px;
            margin-bottom: 30px;
            text-transform: uppercase;
        }

        .title {
            font-size: 36px;
            font-weight: 800;
            color: #fff;
            text-transform: uppercase;
            letter-spacing: -1px;
            line-height: 1;
            margin: 0 0 20px 0;
        }

        .name {
            color: #ff0088;
            text-shadow: 0 0 10px rgba(255, 0, 136, 0.4);
        }

        .message {
            font-size: 16px;
            color: #aaaaaa;
            line-height: 1.6;
            margin-bottom: 40px;
        }

        .footer {
            border-top: 1px solid #1a1a1a;
            padding-top: 30px;
            font-family: 'JetBrains Mono', monospace;
            font-size: 9px;
            color: #444;
            letter-spacing: 2px;
        }

        .accent-dot {
            width: 6px;
            height: 6px;
            background: #ff0088;
            display: inline-block;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="header-status">// PROTOCOLO_ANIVERSARIO: ACTIVO //</div>
        
        <h1 class="title">¡FELICIDADES,<br><span class="name">${name.toUpperCase()}</span>!</h1>
        
        <div class="accent-dot"></div>
        
        <p class="message">
            Hoy celebramos un nuevo ciclo en tu trayectoria dentro del ecosistema ACS. Tu aporte técnico y personal es fundamental para la integridad de nuestra misión.<br><br>
            Que este año sea el despliegue de nuevos éxitos y crecimiento constante.
        </p>
        
        <div class="footer">
            SGR-ACS // TACTICAL_COMMUNICATION_NODE<br>
            GENERADO_POR: ${senderName.toUpperCase()} // HOYR_AI_CORE
        </div>
    </div>
</body>
</html>
    `;
};
