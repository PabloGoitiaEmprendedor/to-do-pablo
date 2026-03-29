import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";

async function getValidAccessToken(supabase: any, clientId: string, clientSecret: string) {
  const { data: tokens } = await supabase
    .from("google_tokens")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!tokens) return null;

  let accessToken = tokens.access_token;

  if (new Date(tokens.expires_at) <= new Date()) {
    const refreshRes = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: tokens.refresh_token,
        grant_type: "refresh_token",
      }),
    });

    const refreshData = await refreshRes.json();
    if (!refreshRes.ok) {
      console.error("Token refresh error:", refreshData);
      return null;
    }

    accessToken = refreshData.access_token;
    const newExpiry = new Date(Date.now() + refreshData.expires_in * 1000).toISOString();
    await supabase
      .from("google_tokens")
      .update({ access_token: accessToken, expires_at: newExpiry, updated_at: new Date().toISOString() })
      .eq("id", tokens.id);
  }

  return accessToken;
}

async function fetchCalendarEvents(accessToken: string, timeMin: string, timeMax: string) {
  const calendarUrl = new URL(`${GOOGLE_CALENDAR_API}/calendars/primary/events`);
  calendarUrl.searchParams.set("timeMin", timeMin);
  calendarUrl.searchParams.set("timeMax", timeMax);
  calendarUrl.searchParams.set("singleEvents", "true");
  calendarUrl.searchParams.set("orderBy", "startTime");

  const calRes = await fetch(calendarUrl.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const calData = await calRes.json();
  if (!calRes.ok) {
    console.error("Calendar API error:", calData);
    return null;
  }

  return (calData.items || []).map((item: any) => ({
    id: item.id,
    summary: item.summary || "Sin título",
    description: item.description || null,
    start: item.start?.dateTime || item.start?.date,
    end: item.end?.dateTime || item.end?.date,
    location: item.location || null,
    hangoutLink: item.hangoutLink || null,
    htmlLink: item.htmlLink || null,
    isAllDay: !!item.start?.date,
  }));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
    const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) throw new Error("Google credentials not configured");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase credentials not configured");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // Action: get auth URL
    if (action === "auth-url") {
      const redirectUri = url.searchParams.get("redirect_uri") || url.origin;
      const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      authUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID);
      authUrl.searchParams.set("redirect_uri", redirectUri);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("scope", "https://www.googleapis.com/auth/calendar.readonly");
      authUrl.searchParams.set("access_type", "offline");
      authUrl.searchParams.set("prompt", "consent");

      return new Response(JSON.stringify({ url: authUrl.toString() }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: exchange code for tokens
    if (action === "callback") {
      const { code, redirect_uri } = await req.json();
      if (!code || !redirect_uri) {
        return new Response(JSON.stringify({ error: "Missing code or redirect_uri" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code, client_id: GOOGLE_CLIENT_ID, client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri, grant_type: "authorization_code",
        }),
      });

      const tokenData = await tokenRes.json();
      if (!tokenRes.ok) {
        return new Response(JSON.stringify({ error: "Token exchange failed", details: tokenData }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();
      await supabase.from("google_tokens").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("google_tokens").insert({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: expiresAt,
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: fetch events
    if (action === "events") {
      const timeMin = url.searchParams.get("timeMin") || new Date().toISOString();
      const timeMax = url.searchParams.get("timeMax") || new Date(Date.now() + 86400000).toISOString();

      const accessToken = await getValidAccessToken(supabase, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
      if (!accessToken) {
        return new Response(JSON.stringify({ error: "not_connected", events: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const events = await fetchCalendarEvents(accessToken, timeMin, timeMax);
      if (!events) {
        return new Response(JSON.stringify({ error: "calendar_api_error", events: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ events }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: sync - import calendar events as tasks
    if (action === "sync") {
      const { date } = await req.json();
      if (!date) {
        return new Response(JSON.stringify({ error: "Missing date parameter (YYYY-MM-DD)" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const accessToken = await getValidAccessToken(supabase, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
      if (!accessToken) {
        return new Response(JSON.stringify({ error: "not_connected" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: blocks } = await supabase
        .from("time_blocks").select("*").eq("is_active", true).order("sort_order", { ascending: true });

      const { data: existingTasks } = await supabase
        .from("tasks").select("name, start_time").or(`date.eq.${date},recurrence_kind.eq.daily`);

      const existingNames = new Set((existingTasks || []).map((t: any) => t.name.toLowerCase().trim()));

      const timeMin = new Date(date + "T00:00:00-04:00").toISOString();
      const timeMax = new Date(date + "T23:59:59-04:00").toISOString();

      const events = await fetchCalendarEvents(accessToken, timeMin, timeMax);
      if (!events) {
        return new Response(JSON.stringify({ error: "calendar_api_error" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const skipPatterns = [
        /^🔥\s*tasks?\s*importantes?$/i,
        /^🤏🏻?\s*tasks?\s*del\s*70%$/i,
        /^tareas?\s*opcionales?$/i,
        /^🤏🏻?\s*tareas?\s*recurrentes?\s*del?\s*70%$/i,
        /^🔥\s*tareas?\s*recurrentes?\s*importantes?$/i,
        /^noche$/i,
        /^break\s*-\s*volver/i,
      ];

      function shouldSkip(name: string): boolean {
        return skipPatterns.some((p) => p.test(name.trim()));
      }

      function findBlock(startTime: string) {
        if (!blocks || blocks.length === 0) return { block_id: null, priority: "70" };
        for (const block of blocks) {
          if (startTime >= block.start_time && startTime < block.end_time) {
            const priority = block.priority === "routine" || block.priority === "break" ? "20" : block.priority || "70";
            return { block_id: block.id, priority };
          }
        }
        return { block_id: null, priority: "70" };
      }

      // Extract best link from event
      function extractLink(event: any): string | null {
        if (event.hangoutLink) return event.hangoutLink;
        if (event.htmlLink) return event.htmlLink;
        if (event.location && event.location.startsWith("http")) return event.location;
        // Try to find URL in description
        if (event.description) {
          const urlMatch = event.description.match(/https?:\/\/[^\s<>"]+/);
          if (urlMatch) return urlMatch[0];
        }
        return null;
      }

      const tasksToInsert: any[] = [];

      for (const event of events) {
        if (event.isAllDay) continue;
        const name = event.summary.trim();
        if (shouldSkip(name)) continue;
        if (existingNames.has(name.toLowerCase())) continue;

        const startTimeMatch = event.start.match(/T(\d{2}:\d{2})/);
        const endTimeMatch = event.end.match(/T(\d{2}:\d{2})/);
        if (!startTimeMatch || !endTimeMatch) continue;

        const startTime = startTimeMatch[1] + ":00";
        const startDate = new Date(event.start);
        const endDate = new Date(event.end);
        const durationMinutes = Math.max(5, Math.round((endDate.getTime() - startDate.getTime()) / 60000));

        const { block_id, priority } = findBlock(startTime);
        const link = extractLink(event);
        
        // Clean description: strip HTML tags
        let description = event.description || null;
        if (description) {
          description = description.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
          if (!description) description = null;
        }

        tasksToInsert.push({
          name, date, start_time: startTime, duration_minutes: durationMinutes,
          priority, status: "pending", block_id,
          link,
          description,
          recurrence_kind: "none", recurrence_config: {}, notion_source: false,
        });

        existingNames.add(name.toLowerCase());
      }

      let inserted = 0;
      if (tasksToInsert.length > 0) {
        const { error } = await supabase.from("tasks").insert(tasksToInsert);
        if (error) {
          return new Response(JSON.stringify({ error: "insert_failed", details: error.message }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        inserted = tasksToInsert.length;
      }

      return new Response(
        JSON.stringify({
          success: true, imported: inserted, skipped: events.length - inserted,
          tasks: tasksToInsert.map((t) => ({ name: t.name, start_time: t.start_time, link: t.link, description: t.description?.substring(0, 50) })),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: backfill - update existing tasks with links and descriptions from Google Calendar
    if (action === "backfill") {
      const { date } = await req.json();
      if (!date) {
        return new Response(JSON.stringify({ error: "Missing date" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const accessToken = await getValidAccessToken(supabase, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
      if (!accessToken) {
        return new Response(JSON.stringify({ error: "not_connected" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const timeMin = new Date(date + "T00:00:00-04:00").toISOString();
      const timeMax = new Date(date + "T23:59:59-04:00").toISOString();
      const events = await fetchCalendarEvents(accessToken, timeMin, timeMax);
      if (!events) {
        return new Response(JSON.stringify({ error: "calendar_api_error" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get existing tasks for this date
      const { data: existingTasks } = await supabase
        .from("tasks").select("id, name, link, description").eq("date", date);

      if (!existingTasks) {
        return new Response(JSON.stringify({ error: "no_tasks" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let updated = 0;
      for (const task of existingTasks) {
        // Find matching event by name
        const matchingEvent = events.find((e: any) => 
          e.summary.trim().toLowerCase() === task.name.toLowerCase().trim()
        );
        if (!matchingEvent) continue;

        const updates: Record<string, any> = {};
        
        // Add link if missing
        if (!task.link) {
          const link = matchingEvent.hangoutLink || matchingEvent.htmlLink || 
            (matchingEvent.location?.startsWith("http") ? matchingEvent.location : null);
          if (!link && matchingEvent.description) {
            const urlMatch = matchingEvent.description.match(/https?:\/\/[^\s<>"]+/);
            if (urlMatch) updates.link = urlMatch[0];
          } else if (link) {
            updates.link = link;
          }
        }

        // Add description if missing
        if (!task.description && matchingEvent.description) {
          let desc = matchingEvent.description.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
          if (desc) updates.description = desc;
        }

        if (Object.keys(updates).length > 0) {
          await supabase.from("tasks").update(updates).eq("id", task.id);
          updated++;
        }
      }

      return new Response(JSON.stringify({ success: true, updated }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
