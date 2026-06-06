import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { to, subject, body, html } = await req.json()
    const apiKey = Deno.env.get('RESEND_API_KEY')

    if (!apiKey) {
      throw new Error('Clé API Resend non configurée')
    }

    if (!to || !subject || (!body && !html)) {
      throw new Error('Champs obligatoires manquants: to, subject, body/html')
    }

    console.log(`Envoi d'email à ${to}: ${subject}`)

    // Use Resend API
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: 'Mon Espace Étudiant <notifications@resend.dev>', // Should be a verified domain in production
        to: [to],
        subject: subject,
        text: body,
        html: html || `<p>${body}</p>`,
      }),
    })

    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(`Erreur Resend: ${JSON.stringify(data)}`)
    }

    return new Response(
      JSON.stringify(data),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error(`Erreur d'envoi d'email: ${error.message}`)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})