import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the API key from environment
    const apiKey = Deno.env.get('INTEGRATIONS_API_KEY');
    if (!apiKey) {
      throw new Error('INTEGRATIONS_API_KEY not configured');
    }

    // Parse the request body
    const body = await req.json();
    const { input, voice = 'heart', response_format = 'mp3' } = body;

    if (!input) {
      return new Response(
        JSON.stringify({ error: 'No input text provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call the text-to-speech API
    const response = await fetch(
      'https://app-a6ghkzb1zhfl-api-GYX1lzGw01Xa.gateway.appmedo.com/v1/audio/speech',
      {
        method: 'POST',
        headers: {
          'X-Gateway-Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input,
          voice,
          response_format,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Text-to-speech API error:', errorText);
      
      // Handle specific error codes
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Quota dépassé. Veuillez réessayer plus tard.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Solde insuffisant pour cette opération.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    // Get the audio data as array buffer
    const audioData = await response.arrayBuffer();

    // Return the audio file
    return new Response(
      audioData,
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename="speech.${response_format}"`,
        } 
      }
    );

  } catch (error) {
    console.error('Error in text-to-speech function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Une erreur est survenue lors de la synthèse vocale' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});