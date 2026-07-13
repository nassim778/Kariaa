import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { apiError, apiOk } from "@/lib/apiResponse";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";
import { getSupabase } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  listingId: z.string().uuid(),
  reason: z.string().trim().min(3).max(500),
});

/**
 * POST /api/report
 * Body: { listingId, reason }
 * Requires Authorization: Bearer <access_token>
 */
export async function POST(req: NextRequest) {
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    return apiError(503, "not_configured", "Supabase is not configured");
  }

  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) {
    return apiError(401, "unauthorized", "Sign in to report a listing");
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return apiError(400, "invalid_body", "Invalid JSON body");
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return apiError(400, "invalid_body", parsed.error.issues[0]?.message ?? "Invalid body");
  }

  const userClient = createClient(env.supabaseUrl, env.supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const {
    data: { user },
    error: userErr,
  } = await userClient.auth.getUser();
  if (userErr || !user) {
    return apiError(401, "unauthorized", "Invalid session");
  }

  const { error } = await userClient.from("listing_reports").insert({
    listing_id: parsed.data.listingId,
    reporter_id: user.id,
    reason: parsed.data.reason,
  });

  if (error) {
    logger.warn("report_insert_failed", { route: "/api/report", err: error });
    if (error.code === "23505") {
      return apiError(409, "already_reported", "You already reported this listing");
    }
    // Fallback: try anon client if table missing (migration not applied)
    const supabase = getSupabase();
    if (!supabase) {
      return apiError(500, "report_failed", "Could not submit report");
    }
    return apiError(500, "report_failed", error.message);
  }

  return apiOk({ ok: true });
}
