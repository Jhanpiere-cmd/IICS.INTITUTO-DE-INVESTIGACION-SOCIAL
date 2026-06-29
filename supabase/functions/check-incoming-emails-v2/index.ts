import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import PostalMime from "https://esm.sh/postal-mime@1.0.15"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

class Pop3Client {
    private conn: Deno.TlsConn | null = null;
    private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
    private encoder = new TextEncoder();
    private decoder = new TextDecoder();

    constructor(private host: string, private port: number) {}

    async connect() {
        this.conn = await Deno.connectTls({ hostname: this.host, port: this.port });
        this.reader = this.conn.readable.getReader();
        await this.readResponse();
    }

    async sendCommand(cmd: string): Promise<string> {
        if (!this.conn || !this.reader) throw new Error("No conectado");
        await this.conn.write(this.encoder.encode(`${cmd}\r\n`));
        return await this.readResponse();
    }

    async readResponse(): Promise<string> {
        if (!this.reader) throw new Error("No conectado");
        let response = "";
        while (true) {
            const { value, done } = await this.reader.read();
            if (done) break;
            const chunk = this.decoder.decode(value);
            response += chunk;
            if (response.includes('\r\n')) break;
        }
        return response.trim();
    }

    async readMultilineResponse(): Promise<string> {
        if (!this.reader) throw new Error("No conectado");
        let response = "";
        const DOT_LINE = '\r\n.\r\n';
        while (true) {
            const { value, done } = await this.reader.read();
            if (done) break;
            response += this.decoder.decode(value);
            if (response.endsWith(DOT_LINE)) break;
            if (response.length > 5 * 1024 * 1024) break; // Límite 5MB para seguridad
        }
        return response.trim();
    }

    async login(user: string, pass: string) {
        await this.sendCommand(`USER ${user}`);
        await this.sendCommand(`PASS ${pass}`);
    }

    async stat(): Promise<number> {
        const res = await this.sendCommand('STAT');
        return parseInt(res.split(' ')[1] || '0');
    }

    async top(id: number): Promise<string> {
        await this.sendCommand(`TOP ${id} 0`);
        return await this.readMultilineResponse();
    }

    async retr(id: number): Promise<string> {
        await this.sendCommand(`RETR ${id}`);
        return await this.readMultilineResponse();
    }

    async quit() {
        try { await this.sendCommand('QUIT'); } finally { if (this.conn) this.conn.close(); }
    }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  const logs: string[] = []
  const addLog = (msg: string) => logs.push(`${new Date().toISOString()}: ${msg}`)

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)
    const gmailUser = "recent:equipodecomunicacionesacs@gmail.com"
    const gmailPass = "veiv odwh wpzh papy"

    addLog("Iniciando Sincronización con Parsing Robusto (PostalMime)...")
    const client = new Pop3Client("pop.gmail.com", 995);
    await client.connect();
    await client.login(gmailUser, gmailPass);

    const count = await client.stat();
    addLog(`Mensajes disponibles en POP3: ${count}`);

    const parser = new PostalMime();
    let newCount = 0;
    
    // Procesamos los últimos 5 mensajes
    const startIdx = Math.max(1, count - 4);

    for (let i = count; i >= startIdx; i--) {
        try {
            // Bajamos solo los headers primero para chequear duplicados rápido
            const headRaw = await client.top(i);
            const parsedHead = await parser.parse(headRaw);
            
            const subject = parsedHead.subject || "Sin asunto";
            const fromEmail = parsedHead.from?.address || "desconocido";
            const fromName = parsedHead.from?.name || fromEmail;
            const receivedAt = parsedHead.date ? new Date(parsedHead.date).toISOString() : new Date().toISOString();

            // Verificar si ya existe
            const { data: existing } = await supabase
                .from("email_inbox")
                .select("id")
                .eq("from_email", fromEmail)
                .eq("subject", subject)
                .eq("received_at", receivedAt)
                .maybeSingle()

            if (!existing) {
                addLog(`Nuevo correo detectado: ${subject}`);
                
                // Bajamos el mensaje completo
                const fullRaw = await client.retr(i);
                const email = await parser.parse(fullRaw);
                
                // Extraer el mejor cuerpo disponible
                const bodyFinal = email.html || email.text || "Sin contenido legible";

                await supabase.from("email_inbox").insert({
                    from_email: fromEmail,
                    from_name: fromName,
                    subject: subject,
                    body_html: bodyFinal,
                    received_at: receivedAt,
                    is_read: false
                })
                newCount++;
            }
        } catch (e) { 
            addLog(`Error procesando mensaje ${i}: ${e.message}`); 
        }
    }

    await client.quit();
    return new Response(JSON.stringify({ success: true, newCount, logs }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })

  } catch (error: any) {
    addLog(`Error crítico: ${error.message}`);
    return new Response(JSON.stringify({ error: error.message, success: false, logs }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
  }
})
