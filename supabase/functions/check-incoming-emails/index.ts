import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { ImapClient } from "jsr:@workingdevshero/deno-imap"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    )

    // Credenciales (usando las mismas que en el envío por ahora)
    const gmailUser = "equipodecomunicacionesacs@gmail.com"
    const gmailPass = "veiv odwh wpzh papy"

    console.log("Connecting to IMAP via deno-imap...")
    
    // Configuración de conexión IMAP
    const client = new ImapClient({
        host: "imap.gmail.com",
        port: 993,
        user: gmailUser,
        pass: gmailPass,
        tls: true
    })

    await client.connect()
    console.log("Connected to IMAP")

    // Seleccionar INBOX
    await client.selectMailbox("INBOX")
    
    // Buscar correos del último día
    const today = new Date()
    today.setDate(today.getDate() - 1)
    
    // El protocolo IMAP usa formato DD-Mon-YYYY
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    const imapDate = `${today.getDate()}-${months[today.getMonth()]}-${today.getFullYear()}`
    
    // Buscar correos no leídos o simplemente los últimos
    const uids = await client.search([["SINCE", imapDate]])
    console.log(`Found ${uids.length} messages since ${imapDate}`)

    const newEmails = []
    
    // Procesar los últimos 10 mensajes encontrados
    const lastUIDs = uids.slice(-10).reverse()
    
    for (const uid of lastUIDs) {
        const messages = await client.fetch(uid, {
            envelope: true,
            body: { part: "" } // Obtener todo el cuerpo
        })

        if (!messages || messages.length === 0) continue
        const msg = messages[0]

        const envelope = msg.envelope
        if (!envelope) continue

        const subject = envelope.subject || "Sin asunto"
        const from = envelope.from?.[0]
        if (!from) continue

        const fromEmail = `${from.mailbox}@${from.host}`
        const fromName = from.name || fromEmail
        const date = envelope.date ? new Date(envelope.date) : new Date()
        
        // El cuerpo viene en la parte "" (vacía) por defecto o como text/html
        const body = (msg.body as any)?.content || "Sin contenido"

        // Verificar si ya existe en la base de datos para no duplicar
        const { data: existing } = await supabase
            .from("email_inbox")
            .select("id")
            .eq("from_email", fromEmail)
            .eq("subject", subject)
            .eq("received_at", date.toISOString())
            .maybeSingle()

        if (!existing) {
            const { data: inserted, error: insertError } = await supabase
                .from("email_inbox")
                .insert({
                    from_email: fromEmail,
                    from_name: fromName,
                    subject: subject,
                    body_html: body,
                    received_at: date.toISOString(),
                    is_read: false
                })
                .select()
                .single()

            if (!insertError) {
                newEmails.push(inserted)
            }
        }
    }

    await client.disconnect()

    return new Response(JSON.stringify({ 
        success: true, 
        newCount: newEmails.length,
        message: `Sincronización completada. ${newEmails.length} nuevos correos.` 
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })

  } catch (error: any) {
    console.error("IMAP ERROR:", error.message)
    return new Response(JSON.stringify({ 
        error: error.message,
        success: false
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
  }
})
