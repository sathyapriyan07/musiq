// Supabase Edge Function - Deezer API Proxy
// Deploy with: supabase functions deploy deezer-proxy

import { serve } from "https://deno.land/x/sift@0.6.0/mod.ts";

const DEEZER_BASE = "https://api.deezer.com";

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const url = new URL(req.url);
    const deezerPath = url.searchParams.get("path");
    const deezerQuery = url.searchParams.get("q");

    if (!deezerPath) {
      return new Response(JSON.stringify({ error: "Missing 'path' parameter" }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // Build Deezer URL
    let deezerUrl = `${DEEZER_BASE}${deezerPath}`;
    if (deezerQuery) {
      deezerUrl += `?${deezerQuery}`;
    }

    // Fetch from Deezer
    const deezerRes = await fetch(deezerUrl, {
      headers: {
        "User-Agent": "ONL-Music/1.0",
      },
    });

    if (!deezerRes.ok) {
      return new Response(
        JSON.stringify({ error: `Deezer API error: ${deezerRes.status}` }),
        {
          status: deezerRes.status,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    const data = await deezerRes.json();

    return new Response(JSON.stringify(data), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});
