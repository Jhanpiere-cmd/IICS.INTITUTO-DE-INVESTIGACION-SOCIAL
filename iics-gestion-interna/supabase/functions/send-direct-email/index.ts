import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts"

// POLYFILL para Deno.writeAll (eliminado en versiones recientes de Deno/Supabase)
// @ts-ignore: Deno.writeAll might be missing
if (typeof Deno.writeAll !== 'function') {
  // @ts-ignore
  Deno.writeAll = async (w: any, data: Uint8Array) => {
    let nwritten = 0;
    while (nwritten < data.length) {
      const n = await w.write(data.subarray(nwritten));
      if (n === null || n === 0) break;
      nwritten += n;
    }
  };
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const body = await req.json()
    console.log("LOG V3: Petición recibida")

    const { to, subject, html, attachments } = body

    if (!to || !subject || !html) {
      throw new Error("Faltan parámetros: destinatario, asunto o mensaje")
    }

    const recipientEmail = Array.isArray(to) ? to[0] : to
    console.log(`LOG V3: Enviando a ${recipientEmail}`)

    const gmailUser = "equipodecomunicacionesacs@gmail.com"
    const gmailPass = "veiv odwh wpzh papy"

    const client = new SmtpClient()
    
    try {
      console.log("LOG V3: Conectando a Gmail (Puerto 465)...")
      await client.connectTLS({
        hostname: "smtp.gmail.com",
        port: 465,
        username: gmailUser,
        password: gmailPass,
      })
      console.log("LOG V3: Conexión establecida")
    } catch (smtpErr: any) {
      console.error("LOG V3: Error conexión:", smtpErr.message)
      throw new Error(`Fallo en conexión SMTP (465): ${smtpErr.message}`)
    }

    const mailOptions: any = {
      from: gmailUser,
      to: recipientEmail,
      subject: subject,
      content: html,
      html: html,
    }

    if (attachments && Array.isArray(attachments)) {
      mailOptions.attachments = attachments.map((file: any) => ({
        filename: file.name,
        content: file.content,
        encoding: 'base64',
        contentType: file.type
      }))
    }

    console.log("LOG V3: Ejecutando send...")
    await client.send(mailOptions)
    console.log("LOG V3: ¡Enviado!")
    
    // Registro opcional en base de datos
    try {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      )

      await supabase.from("email_logs").insert({
        recipient_email: recipientEmail,
        recipient_name: String(recipientEmail).split('@')[0],
        subject: subject,
        message_body: html,
        status: "sent",
        type: "chatbot",
        attachments: Array.isArray(attachments) ? attachments.map((a: any) => ({ name: a.name, type: a.type })) : []
      })
    } catch (dbErr: any) {
      console.warn("LOG V3: Error log DB:", dbErr.message)
    }

    await client.close()

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Correo enviado correctamente",
      version: "V3-Polyfill"
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })

  } catch (error: any) {
    console.error("LOG V3: ERROR:", error.message)
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false,
      version: "V3-Polyfill"
    }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  }
})
