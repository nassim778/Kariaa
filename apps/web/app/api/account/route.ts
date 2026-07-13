import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { apiError, apiOk } from "@/lib/apiResponse";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";
import { getServiceSupabase } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/account
 * Deletes the authenticated user's listings, storage objects, and auth user.
 * Requires Authorization: Bearer <access_token> and SUPABASE_SERVICE_ROLE_KEY.
 */
export async function DELETE(req: NextRequest) {
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    return apiError(503, "not_configured", "Supabase is not configured");
  }
  const service = getServiceSupabase();
  if (!service) {
    return apiError(
      503,
      "service_unavailable",
      "Account deletion is not configured (missing service role key)"
    );
  }

  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) {
    return apiError(401, "unauthorized", "Missing access token");
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

  const uid = user.id;

  try {
    const { data: files } = await service.storage.from("listing-images").list(uid, {
      limit: 1000,
    });
    if (files?.length) {
      const paths = files.map((f) => `${uid}/${f.name}`);
      await service.storage.from("listing-images").remove(paths);
    }

    const { error: listErr } = await service.from("listings").delete().eq("owner_id", uid);
    if (listErr) throw listErr;

    const { error: delErr } = await service.auth.admin.deleteUser(uid);
    if (delErr) throw delErr;

    logger.info("account_deleted", { route: "/api/account", userId: uid });
    return apiOk({ ok: true });
  } catch (e) {
    logger.error("account_delete_failed", { route: "/api/account", err: e });
    return apiError(500, "delete_failed", "Could not delete account");
  }
}
