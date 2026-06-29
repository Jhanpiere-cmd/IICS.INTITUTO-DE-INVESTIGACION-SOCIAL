// Edge Function: create-user
// Permite al Director crear usuarios auto-verificados usando Service Role Key

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Manejar preflight CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // 1. Obtener datos del request
        const { email, password, full_name, role } = await req.json()

        // 2. Validar parámetros
        if (!email || !password || !full_name || !role) {
            return new Response(
                JSON.stringify({ error: 'Faltan parámetros requeridos' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            )
        }

        if (password.length < 6) {
            return new Response(
                JSON.stringify({ error: 'La contraseña debe tener al menos 6 caracteres' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            )
        }

        // 3. Obtener el token de autenticación del usuario que llama
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: 'No autenticado' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
            )
        }

        // 4. Crear cliente Supabase con la API Key normal para verificar al usuario
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            {
                global: {
                    headers: { Authorization: authHeader },
                },
            }
        )

        // 5. Verificar que el usuario actual es Director
        const { data: { user: currentUser } } = await supabaseClient.auth.getUser()

        if (!currentUser) {
            return new Response(
                JSON.stringify({ error: 'Usuario no autenticado' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
            )
        }

        // Obtener el rol del usuario actual desde la tabla users
        const { data: userData, error: userError } = await supabaseClient
            .from('users')
            .select('role')
            .eq('id', currentUser.id)
            .single()

        if (userError || !userData || userData.role !== 'Director') {
            return new Response(
                JSON.stringify({ error: 'Solo el Director puede crear usuarios' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
            )
        }

        // 6. Crear cliente admin con Service Role Key
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        )

        // 7. Verificar si el email ya existe
        const { data: existingUser } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('email', email)
            .single()

        if (existingUser) {
            return new Response(
                JSON.stringify({ error: 'Ya existe un usuario con este correo' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            )
        }

        // 8. Crear usuario con email auto-confirmado usando admin API
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true, // ✅ AUTO-CONFIRMAR EMAIL
            user_metadata: {
                full_name: full_name,
                role: role
            }
        })

        if (createError) {
            console.error('Error creating user:', createError)
            return new Response(
                JSON.stringify({ error: createError.message }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            )
        }

        if (!newUser.user) {
            return new Response(
                JSON.stringify({ error: 'No se pudo crear el usuario' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
            )
        }

        // 9. Actualizar la tabla users con datos adicionales
        const { error: updateError } = await supabaseAdmin
            .from('users')
            .update({
                full_name: full_name,
                role: role,
                approved: true,
                status: 'Aprobado'
            })
            .eq('id', newUser.user.id)

        if (updateError) {
            console.error('Error updating user data:', updateError)
            // No retornamos error porque el usuario ya fue creado
        }

        // 10. Retornar éxito
        return new Response(
            JSON.stringify({
                success: true,
                user: {
                    id: newUser.user.id,
                    email: newUser.user.email,
                    full_name: full_name,
                    role: role
                },
                message: 'Usuario creado exitosamente con email verificado'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )

    } catch (error) {
        console.error('Error in create-user function:', error)
        return new Response(
            JSON.stringify({ error: error.message || 'Error interno del servidor' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})
