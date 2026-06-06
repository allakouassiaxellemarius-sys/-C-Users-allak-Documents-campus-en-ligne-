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

    // Parse the request
    const contentType = req.headers.get('content-type') || '';
    let audioFile: Blob | null = null;
    let options: any = {};

    if (contentType.includes('multipart/form-data')) {
      // Handle multipart form data
      const formData = await req.formData();
      audioFile = formData.get('file') as Blob;
      
      // Get optional parameters
      const responseFormat = formData.get('response_format') as string;
      const speakerLabels = formData.get('speaker_labels') as string;
      const language = formData.get('language') as string;
      const prompt = formData.get('prompt') as string;

      if (responseFormat) options.response_format = responseFormat;
      if (speakerLabels === 'true') options.speaker_labels = true;
      if (language) options.language = language;
      if (prompt) options.prompt = prompt;
    } else {
      // Handle JSON request with URL
      const body = await req.json();
      options = body;
    }

    if (!audioFile && !options.file) {
      return new Response(
        JSON.stringify({ error: 'No audio file provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare the request to the transcription API
    const apiFormData = new FormData();
    
    if (audioFile) {
      apiFormData.append('file', audioFile);
    } else if (options.file) {
      apiFormData.append('file', options.file);
    }

    // Add optional parameters
    if (options.response_format) apiFormData.append('response_format', options.response_format);
    if (options.speaker_labels) apiFormData.append('speaker_labels', 'true');
    if (options.language) apiFormData.append('language', options.language);
    if (options.prompt) apiFormData.append('prompt', options.prompt);
    if (options.min_speakers) apiFormData.append('min_speakers', options.min_speakers.toString());
    if (options.max_speakers) apiFormData.append('max_speakers', options.max_speakers.toString());

    // Call the transcription API
    const response = await fetch(
      'https://app-a6ghkzb1zhfl-api-DY8MNQoqOnMa.gateway.appmedo.com/v1/audio/transcriptions',
      {
        method: 'POST',
        headers: {
          'X-Gateway-Authorization': `Bearer ${apiKey}`,
        },
        body: apiFormData,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Transcription API error:', errorText);
      
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

    const result = await response.json();

    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in speech-to-text function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Une erreur est survenue lors de la transcription' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});