import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const key = env.match(/VITE_GEMINI_API_KEY=([^\s]+)/)[1];

async function listProModels() {
    console.log("Fetching models with API Key...");
    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        const data = await res.json();
        
        if (data.error) {
            console.error("API Error:", data.error.message);
            return;
        }

        const proModels = data.models.filter(m => m.name.toLowerCase().includes('pro'));
        
        console.log("\n--- Pro Models Methods ---");
        for (const m of proModels) {
            const id = m.name.split('/').pop();
            const hasStream = m.supportedMethods.includes('streamGenerateContent');
            console.log(`Model: ${id} | Streaming: ${hasStream ? '✅ YES' : '❌ NO'}`);
            
            if (hasStream) {
                // Test a dummy stream
                console.log(`  Testing stream for ${id}...`);
                const sRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${id}:streamGenerateContent?alt=sse&key=${key}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: "hi" }] }] })
                });
                console.log(`  Status: ${sRes.status}`);
            }
        }
    } catch (e) {
        console.error("Error:", e.message);
    }
}

listProModels();
