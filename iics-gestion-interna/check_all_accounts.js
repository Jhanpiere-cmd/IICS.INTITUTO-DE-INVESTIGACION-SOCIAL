
const https = require('https');

const ACCESS_TOKEN = 'EAATzZCGyTEREBQymcZBk802c7ZAWGcXOinQZARgoIVTvN5GXrMTxA5cXT5cgxHFuwb7ZAAUodDLhhbIoqPBFay19RVjFHH3jrFh1j4qICHt7hKcexHUaql7P5odW2Y1EmdKbmoL4tZCBJW16rsh47P1Gg9iKO9SpESZBHFddE466qA4EzuE1XHxD37HJKx41Xna';

function get(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        }).on('error', reject);
    });
}

async function check() {
    console.log('--- Verificando Cuentas Gestionadas ---');
    const data = await get(`https://graph.facebook.com/v22.0/me/accounts?access_token=${ACCESS_TOKEN}`);
    
    if (data.error) {
        console.error('Error:', data.error);
        return;
    }

    if (!data.data || data.data.length === 0) {
        console.log('No se encontraron paginas gestionadas para este token.');
        return;
    }

    data.data.forEach(page => {
        console.log(`Pagina: ${page.name}`);
        console.log(`ID: ${page.id}`);
        console.log(`Token disponible: ${page.access_token ? 'SI' : 'NO'}`);
        console.log('---');
    });

    console.log('--- Configurado en .env ---');
    console.log('PAGE_ID: 484422738088449');
}

check();
