import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { action, payload } = await req.json()

    // 1. Obtener configuración de Meta
    const { data: config, error: configError } = await supabaseClient
      .from('meta_config')
      .select('*')
      .eq('is_active', true)
      .single()

    if (configError || !config) {
      throw new Error('Configuración de Meta no encontrada o inactiva')
    }

    let result = null

    if (action === 'publish_fb_page') {
      const { message, link, image_url } = payload
      
      // Lógica para publicar en Facebook Page
      // POST /v19.0/{page_id}/feed
      const url = `https://graph.facebook.com/v19.0/${config.page_id}/feed`
      const fbResponse = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          link,
          access_token: config.system_user_access_token
        })
      })
      result = await fbResponse.json()
    }

    if (action === 'publish_instagram') {
      // Pasos para Instagram (Graph API es más complejo, requiere media container primero)
      // 1. POST /v19.0/{ig_user_id}/media
      // 2. POST /v19.0/{ig_user_id}/media_publish
      result = { message: "Instagram integration in progress" }
    }

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
