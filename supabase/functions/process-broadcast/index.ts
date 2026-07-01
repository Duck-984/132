import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Apikey, X-Client-Info",
};

const MESSAGES_PER_SECOND = 25;
const DELAY_MS = Math.ceil(1000 / MESSAGES_PER_SECOND);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const botToken = Deno.env.get("BOT_TOKEN");

    if (!botToken) {
      return new Response(
        JSON.stringify({ error: "BOT_TOKEN not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the next pending job
    const { data: job, error: jobError } = await supabase
      .from("broadcast_jobs")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (jobError) {
      return new Response(
        JSON.stringify({ error: jobError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!job) {
      return new Response(
        JSON.stringify({ message: "No pending jobs" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark job as processing
    await supabase
      .from("broadcast_jobs")
      .update({ status: "processing", started_at: new Date().toISOString() })
      .eq("id", job.id);

    // Get all active bot users
    const { data: users, error: usersError } = await supabase
      .from("bot_users")
      .select("chat_id")
      .eq("is_blocked", false);

    if (usersError || !users) {
      await supabase
        .from("broadcast_jobs")
        .update({ status: "failed", completed_at: new Date().toISOString() })
        .eq("id", job.id);

      return new Response(
        JSON.stringify({ error: "Failed to fetch users" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update total recipients
    await supabase
      .from("broadcast_jobs")
      .update({ total_recipients: users.length })
      .eq("id", job.id);

    let sentCount = 0;
    let failedCount = 0;
    let blockedCount = 0;

    // Send messages with rate limiting
    for (const user of users) {
      try {
        const response = await fetch(
          `https://api.telegram.org/bot${botToken}/sendMessage`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: user.chat_id,
              text: job.message,
              parse_mode: job.parse_mode || "HTML",
            }),
          }
        );

        const result = await response.json();

        if (result.ok) {
          sentCount++;
        } else {
          const errDesc = result.description || "Unknown error";

          if (
            errDesc.includes("bot was blocked") ||
            errDesc.includes("user is deactivated") ||
            errDesc.includes("chat not found")
          ) {
            blockedCount++;
            // Mark user as blocked
            await supabase
              .from("bot_users")
              .update({ is_blocked: true })
              .eq("chat_id", user.chat_id);
          } else if (errDesc.includes("Too Many Requests")) {
            // Rate limited — wait and retry
            const retryAfter = result.parameters?.retry_after || 5;
            await new Promise((r) => setTimeout(r, retryAfter * 1000));
            // Retry once
            const retry = await fetch(
              `https://api.telegram.org/bot${botToken}/sendMessage`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  chat_id: user.chat_id,
                  text: job.message,
                  parse_mode: job.parse_mode || "HTML",
                }),
              }
            );
            const retryResult = await retry.json();
            if (retryResult.ok) {
              sentCount++;
            } else {
              failedCount++;
              await supabase.from("broadcast_failures").insert({
                job_id: job.id,
                chat_id: user.chat_id,
                error: retryResult.description || "Retry failed",
              });
            }
          } else {
            failedCount++;
            await supabase.from("broadcast_failures").insert({
              job_id: job.id,
              chat_id: user.chat_id,
              error: errDesc,
            });
          }
        }
      } catch (err) {
        failedCount++;
        await supabase.from("broadcast_failures").insert({
          job_id: job.id,
          chat_id: user.chat_id,
          error: String(err),
        });
      }

      // Rate limiting delay
      await new Promise((r) => setTimeout(r, DELAY_MS));

      // Update progress every 50 messages
      if ((sentCount + failedCount + blockedCount) % 50 === 0) {
        await supabase
          .from("broadcast_jobs")
          .update({ sent_count: sentCount, failed_count: failedCount, blocked_count: blockedCount })
          .eq("id", job.id);
      }
    }

    // Mark job as completed
    await supabase
      .from("broadcast_jobs")
      .update({
        status: "completed",
        sent_count: sentCount,
        failed_count: failedCount,
        blocked_count: blockedCount,
        completed_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    // Write to audit log
    await supabase.from("audit_log").insert({
      admin_id: job.created_by,
      action: "broadcast",
      entity_type: "broadcast_jobs",
      entity_id: job.id,
      details: {
        total: users.length,
        sent: sentCount,
        failed: failedCount,
        blocked: blockedCount,
      },
    });

    return new Response(
      JSON.stringify({
        job_id: job.id,
        status: "completed",
        total: users.length,
        sent: sentCount,
        failed: failedCount,
        blocked: blockedCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
