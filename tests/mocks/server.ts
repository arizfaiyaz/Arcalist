import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";

const env = (import.meta as ImportMeta & { env?: Record<string, string> }).env;
const SUPABASE_URL = env?.VITE_SUPABASE_URL ?? "https://example.supabase.co";

export const handlers = [
  http.post(`${SUPABASE_URL}/auth/v1/token`, ({ request }) => {
    const grantType = new URL(request.url).searchParams.get("grant_type");
    if (grantType !== "refresh_token") {
      return HttpResponse.json({ error: "unsupported_grant" }, { status: 400 });
    }
    return HttpResponse.json({ access_token: "test", refresh_token: "test" });
  }),
  http.get(`${SUPABASE_URL}/rest/v1/arcalist_workspaces`, () =>
    HttpResponse.json([]),
  ),
  http.post(`${SUPABASE_URL}/rest/v1/arcalist_workspaces`, () =>
    HttpResponse.json([]),
  ),
];

export const server = setupServer(...handlers);