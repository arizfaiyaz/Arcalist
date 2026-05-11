import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";

const SUPABASE_URL = "https://example.supabase.co";

export const handlers = [
  http.post(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, () =>
    HttpResponse.json({ access_token: "test", refresh_token: "test" }),
  ),
  http.get(`${SUPABASE_URL}/rest/v1/arcalist_workspaces`, () =>
    HttpResponse.json([]),
  ),
  http.post(`${SUPABASE_URL}/rest/v1/arcalist_workspaces`, () =>
    HttpResponse.json([]),
  ),
];

export const server = setupServer(...handlers);