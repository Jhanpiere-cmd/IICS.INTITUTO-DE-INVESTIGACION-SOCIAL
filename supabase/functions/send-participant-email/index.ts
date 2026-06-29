import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SmtpClient } from 'https://deno.land/x/smtp/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const gmailUser = Deno.env.get('GMAIL_USER') || 'equipodecomunicacionesacs@gmail.com'
    const gmailPass = Deno.env.get('GMAIL_PASS') || 'veiv odwh wpzh papy'

    const { participantIds, type, eventTitle, customMessage } = await req.json()

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const client = new SmtpClient()

    const { data: participants, error: fetchError } = await supabaseAdmin
      .from('event_participants')
      .select('id, full_name, email, certificate_url')
      .in('id', participantIds)

    if (fetchError || !participants) throw new Error('Error buscando participantes')

    const results = []
    let successCount = 0
    
    // Conectar al SMTP de Gmail
    await client.connectTLS({
      hostname: 'smtp.gmail.com',
      port: 465,
      username: gmailUser,
      password: gmailPass,
    })

    for (const p of participants) {
      if (!p.email) {
        results.push({ name: p.full_name, status: 'error', error: 'Sin correo' })
        continue
      }

      let subject = ''
      let html = ''

      if (type === 'certificate') {
        subject = `🎓 Tu Certificado: ${eventTitle}`
        html = `
        <div style="background-color: #f8fafc; padding: 40px 10px; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
            <div style="background-color: #1a365d; background: linear-gradient(135deg, #1e3a8a 0%, #1a365d 100%); padding: 40px 20px; text-align: center;">
              <img src="https://revista-acs.com/wp-content/uploads/2023/06/logo-revista-ACS.png" alt="Revista ACS" style="height: 50px; margin-bottom: 20px;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; text-transform: uppercase;">¡Felicidades ${p.full_name}!</h1>
            </div>
            <div style="padding: 40px 30px; text-align: center;">
              <p style="color: #1e293b; font-size: 18px; line-height: 1.6; font-weight: 500; margin: 0;">
                Adjuntamos tu certificado oficial del evento:<br>
                <strong style="color: #1e3a8a;">${eventTitle}</strong>
              </p>
              <div style="margin: 40px 0;">
                <a href="${p.certificate_url}" style="background-color: #3b82f6; color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 700; display: inline-block;">
                  Descargar Certificado
                </a>
              </div>
            </div>
            <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #94a3b8; font-size: 11px; margin: 0;">&copy; 2024 Revista ACS - Protocolo Automatizado.</p>
            </div>
          </div>
        </div>`
      } else {
        subject = `📢 Recordatorio: ${eventTitle}`
        html = `
        <div style="background-color: #f8fafc; padding: 40px 10px; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
            <div style="background-color: #1a365d; padding: 30px; text-align: center;">
              <h2 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700;">COMUNICADO_IMPORTANTE</h2>
            </div>
            <div style="padding: 40px 30px;">
              <h3 style="color: #1e293b; font-size: 18px; margin-bottom: 20px;">Hola ${p.full_name},</h3>
              <p style="color: #475569; font-size: 15px; line-height: 1.7;">${(customMessage || 'Te esperamos en el evento.').replace(/\n/g, '<br>')}</p>
            </div>
          </div>
        </div>`
      }

      try {
        await client.send({
          from: gmailUser,
          to: p.email,
          subject: subject,
          content: html,
          html: html,
        })

        successCount++
        
        // Registrar en logs y actualizar participante
        await Promise.all([
          supabaseAdmin.from('email_logs').insert({
            recipient_email: p.email,
            recipient_name: p.full_name,
            subject: subject,
            status: 'sent',
            type: type
          }),
          supabaseAdmin.from('event_participants')
            .update({ last_email_sent_at: new Date().toISOString() })
            .eq('id', p.id)
        ])

        results.push({ name: p.full_name, email: p.email, status: 'sent' })
      } catch (e: any) {
        await supabaseAdmin.from('email_logs').insert({
            recipient_email: p.email,
            recipient_name: p.full_name,
            subject: subject,
            status: 'failed',
            type: type,
            error_details: e.message
          })
        results.push({ name: p.full_name, status: 'error', error: e.message })
      }
      
      await new Promise(r => setTimeout(r, 1000))
    }

    await client.close()

    return new Response(
      JSON.stringify({ success: successCount > 0, successCount, totalCount: participants.length, results }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
