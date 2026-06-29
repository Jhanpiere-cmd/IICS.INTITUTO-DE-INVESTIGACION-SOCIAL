import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const key = env.match(/VITE_GEMINI_API_KEY=([^\s]+)/)[1];

async function checkStreamingSupport() {
    console.log("Checking streaming support for Gemini models...");
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        const data = await response.json();
        
        const models = data.models || [];
        const proModels = models.filter(m => m.name.toLowerCase().includes('pro'));
        
        console.log("Found Pro models and their methods:");
        proModels.forEach(m => {
            console.log(`- ${m.name}:`);
            console.log(`  Methods: ${m.supportedMethods.join(', ')}`);
        });

        // Test streaming specifically for gemini-1.5-pro
        const testId = "gemini-1.5-pro";
        console.log(`\nTesting STREAMING for: ${testId}...`);
        const streamResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${testId}:streamGenerateContent?alt=sse&key=${key}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: "Hola" }] }] })
        });
        
        console.log(`Streaming status for ${testId}:`, streamResponse.status);
        if (streamResponse.status === 200) {
            console.log(`✅ ${testId} supports streaming!`);
        } else {
            const errData = await streamResponse.json().catch(() => ({}));
            console.error(`❌ ${testId} streaming failed:`, errData.error?.message || streamResponse.statusText);
        }

        // Check if there is a 'latest' or specific version
        const latestId = proModels.find(m => m.name.includes('latest'))?.name.split('/').pop();
        if (latestId) {
             console.log(`\nTesting STREAMING for: ${latestId}...`);
             const latestRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${latestId}:streamGenerateContent?alt=sse&key=${key}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: "Hola" }] }] })
             });
             console.log(`Streaming status for ${latestId}:`, latestRes.status);
        }

    } catch (error) {
        console.error("Error:", error.message);
    }
}

checkStreamingSupport();
