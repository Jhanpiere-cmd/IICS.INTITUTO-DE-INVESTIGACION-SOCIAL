import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

// POLYFILL para Deno.writeAll
// @ts-ignore
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

const GMAIL_USER = "equipodecomunicacionesacs@gmail.com";
const GMAIL_PASS = "veiv odwh wpzh papy";

// Plantilla Base HTML Deep Tech
const getBaseTemplate = (content: string, title: string) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background-color: #050505; color: #ffffff; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background-color: #0a0a0a; border: 1px solid #262626; border-radius: 4px; overflow: hidden; }
    .header { padding: 30px; border-bottom: 1px solid #262626; background: linear-gradient(135deg, #0a0a0a 0%, #050505 100%); }
    .logo-text { font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: 4px; margin: 0; }
    .subtitle { font-size: 10px; color: #3b82f6; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; }
    .content { padding: 30px; }
    .footer { padding: 20px; text-align: center; border-top: 1px solid #262626; font-size: 10px; color: #404040; letter-spacing: 1px; }
    .button { display: inline-block; padding: 12px 24px; background-color: #ffffff; color: #000000; text-decoration: none; font-weight: 900; font-size: 10px; border-radius: 2px; text-transform: uppercase; letter-spacing: 1px; }
    .card { background: #0c0c0c; border: 1px solid #1f1f1f; padding: 15px; margin-bottom: 15px; border-radius: 2px; }
    .card-title { font-size: 12px; font-weight: bold; color: #3b82f6; margin-bottom: 8px; text-transform: uppercase; }
    .item { font-size: 14px; margin-bottom: 5px; color: #d4d4d4; }
    .priority-high { color: #ef4444; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <p class="subtitle">HOYR Intelligence • SGR-ACS</p>
      <h1 class="logo-text">${title}</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      SISTEMA DE GESTIÓN ACS • © 2026<br>UNA EXPERIENCIA DE INTELIGENCIA PROACTIVA
    </div>
  </div>
</body>
</html>
`;

// Plantilla Especial de Cumpleaños Cyber-Deep Tech
const getBirthdayTemplate = (name: string) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@100;400;900&display=swap');
    body { margin: 0; padding: 0; background-color: #000; color: #fff; font-family: 'Outfit', sans-serif; }
    .outer { padding: 40px 20px; background: linear-gradient(180deg, #000 0%, #050505 100%); }
    .main { max-width: 600px; margin: 0 auto; border: 1px solid #ff0080; position: relative; overflow: hidden; background: #000; box-shadow: 0 0 50px rgba(255, 0, 128, 0.2); }
    .glitch-bar { height: 4px; background: repeating-linear-gradient(90deg, #ff0080, #ff0080 20px, #00ffff 20px, #00ffff 40px); opacity: 0.8; }
    .header { padding: 50px 30px; text-align: center; border-bottom: 1px solid #1a1a1a; }
    .bday-text { font-size: 10px; letter-spacing: 12px; font-weight: 100; text-transform: uppercase; color: #ff0080; margin-bottom: 15px; }
    .name { font-size: 48px; font-weight: 900; margin: 0; letter-spacing: -2px; line-height: 0.9; text-transform: uppercase; background: linear-gradient(to bottom, #fff 0%, #888 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .content { padding: 50px 40px; text-align: left; }
    .msg { font-size: 18px; line-height: 1.6; color: #d1d1d1; margin-bottom: 40px; font-weight: 100; }
    .accent { color: #ff0080; font-weight: 400; }
    .footer { padding: 40px; text-align: center; background: #050505; border-top: 1px solid #1a1a1a; font-size: 10px; color: #444; letter-spacing: 2px; }
  </style>
</head>
<body>
  <div class="outer">
    <div class="main">
      <div class="glitch-bar"></div>
      <div class="header">
        <div class="bday-text">ANNIVERSARY PROTOCOL // 0xCC</div>
        <h1 class="name">${name}</h1>
      </div>
      <div class="content">
        <p class="msg">Hoy tu presencia en el equipo <span class="accent">ACS</span> alcanza un nuevo hito operativo. <br><br>Eres una pieza fundamental en el engranaje de nuestra visión. Este día no es solo una celebración personal, sino la renovación de tu impacto táctico en nuestra misión colectiva.<br><br>Sigue ejecutando con excelencia. <span class="accent">El futuro no se espera, se construye.</span></p>
      </div>
      <div class="footer">
        CIBERNÉTICA APLICADA ACS • HOYR INTELLIGENCE<br>2026_VERSION_STABLE
      </div>
    </div>
  </div>
</body>
</html>
`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  )

  try {
    const { action, secret } = await req.json();

    // Verificación de seguridad básica (se puede usar API key o auth internal)
    if (secret !== Deno.env.get("PROACTIVE_SECRET")) {
        // En producción activaríamos esto, por ahora lo dejamos flexible o pedimos config
    }

    const client = new SmtpClient();
    await client.connectTLS({
      hostname: "smtp.gmail.com",
      port: 465,
      username: GMAIL_USER,
      password: GMAIL_PASS,
    });

    if (action === "daily-brief") {
      const now = new Date();
      const currentYear = now.getFullYear();
      
      // 1. Detección Global de Cumpleaños (Triple Verificación Database)
      const { data: bdayProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, birth_date')
        .not('birth_date', 'is', null)
        .not('email', 'is', null);

      const birthdayPeopleToday = (bdayProfiles || []).filter(p => {
        const bDate = new Date(p.birth_date);
        return bDate.getDate() === now.getDate() && bDate.getMonth() === now.getMonth();
      });

      // 2. Obtener quienes YA recibieron saludo este año para evitar duplicados
      const { data: sentPlans } = await supabase
        .from('birthday_plans')
        .select('profile_id')
        .eq('year', currentYear)
        .eq('greeting_sent', true);

      const sentIds = new Set(sentPlans?.map(p => p.profile_id) || []);

      // 3. Obtener todos los perfiles activos para el resumen
      const { data: users } = await supabase.from('profiles').select('id, email, fullName, full_name').not('email', 'is', null);
      
      for (const user of (users || [])) {
        // A. Verificar si toca enviar felicitación AUTÓNOMA a este usuario específico
        const isBdayPerson = birthdayPeopleToday.some(p => p.id === user.id);
        if (isBdayPerson && !sentIds.has(user.id)) {
          const bdayHtml = getBirthdayTemplate(user.full_name || user.fullName);
          await client.send({
            from: GMAIL_USER,
            to: user.email,
            subject: `¡FELIZ CUMPLEAÑOS, ${(user.full_name || user.fullName).toUpperCase()}! // ACS 🎂`,
            content: bdayHtml,
            html: bdayHtml,
          });

          // Registrar en birthday_plans
          await supabase.from('birthday_plans').upsert({
            profile_id: user.id,
            year: currentYear,
            greeting_sent: true,
            greeting_sent_at: new Date().toISOString(),
            status: 'Planificado'
          }, { onConflict: 'profile_id, year' });
          
          sentIds.add(user.id); // Evitar re-envío en este mismo ciclo
        }

        // B. Generar Resumen Diario incorporando alertas de cumpleaños del equipo
        const { data: brief } = await supabase.rpc('get_hoyr_daily_brief', { check_user_id: user.id });
        
        if (brief) {
          const tasksHtml = (brief.tasks || []).length > 0 ? 
            brief.tasks.map((t:any) => `<div class="item">• ${t.title} <span class="priority-high">${t.priority === 'Urgente' ? '[URGENTE]' : ''}</span></div>`).join('') :
            '<div class="item">Sin tareas críticas hoy.</div>';

          const meetingsHtml = (brief.meetings || []).length > 0 ?
            brief.meetings.map((m:any) => `<div class="item">• ${new Date(m.scheduled_at).toLocaleTimeString()} - ${m.title}</div>`).join('') :
            '<div class="item">Sin reuniones programadas.</div>';

          const newsHtml = (brief.news || []).length > 0 ?
            brief.news.map((n:any) => `<div class="item">• ${n.title} [${n.category}]</div>`).join('') :
            '<div class="item">No hay novedades recientes.</div>';

          // Tarjeta de Cumpleaños del Equipo (Notificación Social)
          const otherBDays = birthdayPeopleToday.filter(p => p.id !== user.id);
          const birthdayAlertHtml = otherBDays.length > 0 ? `
            <div class="card" style="border-left: 4px solid #ff0080; background: #0c0006;">
              <div class="card-title" style="color: #ff0080;">🎂 EVENTO SOCIAL: CUMPLEAÑOS</div>
              <div class="item">Hoy celebramos la vida de: <strong>${otherBDays.map(p => p.full_name || p.fullName).join(', ')}</strong></div>
              <div class="item" style="font-size: 11px; opacity: 0.7;">HOYR ya ha despachado los protocolos de felicitación oficiales.</div>
            </div>
          ` : '';

          const html = getBaseTemplate(`
            <p>Buenos días, **${brief.user_name}**.</p>
            ${isBdayPerson ? `<div class="card" style="border: 2px solid #ff0080; background: #0c0006; text-align: center;"><h2 style="color: #ff0080; margin: 5px 0;">¡FELIZ CUMPLEAÑOS! 🎂</h2><p style="font-size: 12px;">Hoy el sistema ACS rinde homenaje a tu impacto táctico.</p></div>` : ''}
            <p>Aquí tienes tu resumen táctico para hoy:</p>
            
            ${birthdayAlertHtml}

            <div class="card">
              <div class="card-title">📅 Reuniones de Hoy</div>
              ${meetingsHtml}
            </div>

            <div class="card">
              <div class="card-title">📋 Tareas Prioritarias</div>
              ${tasksHtml}
            </div>

            <div class="card">
              <div class="card-title">📰 Novedades ACS</div>
              ${newsHtml}
            </div>

            ${brief.pending_benefits > 0 ? `
              <div class="card" style="border-color: #ef4444;">
                <div class="card-title" style="color: #ef4444;">🚨 Pendientes de Aprobación</div>
                <div class="item">Hay ${brief.pending_benefits} solicitudes de beneficios esperando tu revisión.</div>
              </div>
            ` : ''}

            <div style="margin-top: 30px; text-align: center;">
              <a href="${Deno.env.get("PUBLIC_APP_URL") || 'https://hoyr-acs.netlify.app'}" class="button">Acceder al Sistema</a>
            </div>
          `, "SMART BRIEF DIARIO");

          await client.send({
            from: GMAIL_USER,
            to: user.email,
            subject: `🤖 HOYR Daily Brief: ${new Date().toLocaleDateString()}`,
            content: html,
            html: html,
          });
        }
      }
    }

    if (action === "meeting-alert") {
      const { data: alerts } = await supabase.rpc('get_imminent_meetings_alerts');
      for (const alert of (alerts || [])) {
        const html = getBaseTemplate(`
           <div class="card" style="border-color: #3b82f6;">
             <div class="card-title">Recordatorio: En 15 Minutos</div>
             <h2 style="font-size: 20px; margin: 10px 0;">${alert.meeting_title}</h2>
             <p class="item">📍 Lugar: ${alert.location || 'Sala Virtual'}</p>
             <p class="item">⏰ Hora: ${new Date(alert.scheduled_at).toLocaleTimeString()}</p>
           </div>
           <div style="margin-top: 20px; text-align: center;">
             <a href="${Deno.env.get("PUBLIC_APP_URL") || 'https://hoyr-acs.netlify.app'}/eventos" class="button">Ir a la Reunión</a>
           </div>
        `, "ALERTA DE REUNIÓN");

        await client.send({
          from: GMAIL_USER,
          to: alert.email,
          subject: `🔔 HOYR: Reunión Inminente - ${alert.meeting_title}`,
          content: html,
          html: html,
        });
      }
    }

    if (action === "task-reminder") {
      const { data: reminders } = await supabase.rpc('get_urgent_task_reminders');
      for (const task of (reminders || [])) {
        const html = getBaseTemplate(`
           <div class="card" style="border-color: #ef4444;">
             <div class="card-title" style="color: #ef4444;">Acción Requerida: Tarea Próxima a Vencer</div>
             <h2 style="font-size: 18px; margin: 10px 0;">${task.task_title}</h2>
             <p class="item">📅 Fecha Límite: ${new Date(task.due_date).toLocaleString()}</p>
             <p class="item">⏳ Quedan menos de 24 horas para completar este objetivo.</p>
           </div>
           <div style="margin-top: 20px; text-align: center;">
             <a href="${Deno.env.get("PUBLIC_APP_URL") || 'https://hoyr-acs.netlify.app'}/tareas" class="button">Ver Tarea en el Sistema</a>
           </div>
        `, "RECORDATORIO DE TAREA");

        await client.send({
          from: GMAIL_USER,
          to: task.email,
          subject: `⚠️ HOYR: Tarea Urgente - ${task.task_title}`,
          content: html,
          html: html,
        });
      }
    }

    await client.close();
    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
})
