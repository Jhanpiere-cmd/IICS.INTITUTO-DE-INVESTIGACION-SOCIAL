import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const body = await req.json()
    console.log("RECEIVED BODY:", JSON.stringify(body))

    const { participantIds, type, eventTitle, customMessage, flyerUrl } = body
    
    if (!participantIds || participantIds.length === 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        successCount: 0, 
        totalCount: 0, 
        results: [],
        message: "No se proporcionaron IDs de participantes"
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    const gmailUser = "equipodecomunicacionesacs@gmail.com"
    const gmailPass = "veiv odwh wpzh papy"

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    )

    const { data: participants, error: dbError } = await supabase
      .from("event_participants")
      .select("id, full_name, email, certificate_url")
      .in("id", participantIds)

    console.log("DB RESULT:", JSON.stringify({ count: participants?.length, error: dbError }))

    if (dbError || !participants) throw new Error("Error al obtener participantes: " + (dbError?.message || "null"))

    const client = new SmtpClient()
    await client.connectTLS({
      hostname: "smtp.gmail.com",
      port: 465,
      username: gmailUser,
      password: gmailPass,
    })

    const results = []
    let successCount = 0

    const STICH_ULTRA_STYLE = `
      margin: 0;
      padding: 0;
      background-color: #050505;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #E0E0E0;
    `

    for (const p of participants) {
      console.log(`PROCESSING: ${p.full_name} (${p.email})`)
      if (!p.email) {
        results.push({ name: p.full_name, status: "error", error: "Participante no tiene correo registrado" })
        continue
      }

      const subject = type === "certificate" 
        ? `🎓 Certificado: ${eventTitle}` 
        : `📢 Mensaje de ACS: ${eventTitle}`
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subject}</title>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
          <style>
            @media only screen and (max-width: 600px) {
              .container { width: 100% !important; padding: 20px !important; }
              .header { padding: 30px 20px !important; }
            }
          </style>
        </head>
        <body style="${STICH_ULTRA_STYLE}">
          <div style="background-color: #050505; width: 100%; table-layout: fixed;">
            <div class="container" style="max-width: 600px; margin: 0 auto; background-color: #0A0A0A; border: 1px solid #1A1A1A; border-radius: 12px; overflow: hidden; margin-top: 40px; margin-bottom: 40px; box-shadow: 0 20px 50px rgba(0,0,0,0.5);">
              
              <!-- Top Glow Bar -->
              <div style="height: 4px; background: linear-gradient(90deg, #4F46E5 0%, #10B981 100%);"></div>

              ${flyerUrl ? `
              <!-- Flyer Section -->
              <div style="width: 100%; line-height: 0;">
                <img src="${flyerUrl}" alt="Flyer del Evento" style="width: 100%; height: auto; display: block; filter: contrast(1.1) brightness(0.9);">
              </div>
              ` : ''}

              <!-- Content Body -->
              <div style="padding: 40px 30px; border-top: 1px solid #1A1A1A;">
                <div style="text-align: center; margin-bottom: 30px;">
                  <img src="https://revista-acs.com/wp-content/uploads/2023/06/logo-revista-ACS.png" alt="ACS Logo" style="height: 32px; margin-bottom: 24px; filter: brightness(1.2);">
                  <p style="color: #6366F1; font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: 0.2em; margin-bottom: 8px;">Sistema de Gestión ACS</p>
                  <h1 style="color: #FFFFFF; font-size: 26px; font-weight: 800; margin: 0; letter-spacing: -0.025em; line-height: 1.2;">
                    ${type === 'certificate' ? `¡Felicidades, ${p.full_name.split(' ')[0]}!` : `Hola, ${p.full_name.split(' ')[0]}`}
                  </h1>
                </div>

                <div style="background-color: #111111; border: 1px solid #1A1A1A; padding: 24px; border-radius: 8px; margin-bottom: 30px;">
                  <p style="color: #A1A1AA; font-size: 15px; line-height: 1.6; margin: 0; text-align: center;">
                    ${type === 'certificate' 
                      ? `Tu certificado de participación en <strong>${eventTitle}</strong> ya está disponible y listo para descargar.`
                      : (customMessage || `Te escribimos en relación al evento: <strong>${eventTitle}</strong>.`).replace(/\n/g, '<br>')
                    }
                  </p>
                </div>

                ${type === 'certificate' ? `
                <div style="text-align: center; margin-top: 40px;">
                  <a href="${p.certificate_url}" style="background: linear-gradient(135deg, #4F46E5 0%, #3730A3 100%); color: #FFFFFF; padding: 18px 36px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; display: inline-block; border: 1px solid #6366F1; box-shadow: 0 10px 30px rgba(79, 70, 229, 0.3);">
                    Descargar Certificado PDF
                  </a>
                  <p style="color: #52525B; font-size: 12px; margin-top: 24px;">
                    Enlace de respaldo:<br>
                    <a href="${p.certificate_url}" style="color: #6366F1; text-decoration: none;">${p.certificate_url}</a>
                  </p>
                </div>
                ` : ''}

                <div style="margin-top: 40px; padding-top: 30px; border-top: 1px solid #1A1A1A; text-align: center;">
                  <p style="color: #52525B; font-size: 12px; line-height: 1.5;">
                    Revista ACS - Asociación Civil de Sociología<br>
                    Cajamarca, Perú &bull; ${new Date().getFullYear()}
                  </p>
                </div>
              </div>

              <!-- Bottom Glow Bar -->
              <div style="height: 1px; background: linear-gradient(90deg, transparent 0%, #1A1A1A 50%, transparent 100%);"></div>
            </div>
          </div>
        </body>
        </html>
      `

      try {
        await client.send({
          from: gmailUser,
          to: p.email,
          subject: subject,
          content: htmlContent,
          html: htmlContent,
        })
        successCount++
        
        await supabase.from("email_logs").insert({
          recipient_email: p.email,
          recipient_name: p.full_name,
          subject: subject,
          message_body: htmlContent,
          status: "sent",
          type: type,
          attachments: type === "certificate" ? [{ name: "Certificado.pdf", url: p.certificate_url, type: "application/pdf" }] : []
        })

        results.push({ name: p.full_name, email: p.email, status: "sent" })
      } catch (e: any) {
        console.error(`SEND ERROR for ${p.full_name}:`, e.message)
        results.push({ name: p.full_name, status: "error", error: e.message })
      }
      await new Promise(r => setTimeout(r, 500))
    }

    await client.close()

    return new Response(JSON.stringify({ 
      success: successCount > 0, 
      successCount, 
      totalCount: participants.length, 
      results
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })

  } catch (error: any) {
    console.error("GLOBAL ERROR:", error.message)
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false,
      successCount: 0,
      totalCount: 0,
      results: [{ name: "Error Global", status: "error", error: error.message }]
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
  }
})
