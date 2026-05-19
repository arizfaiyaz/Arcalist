import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

type JsonObject = Record<string, unknown>;

type DodoEvent = {
  id?: string;
  event_id?: string;
  type?: string;
  event_type?: string;
  data?: unknown;
  payload?: unknown;
  metadata?: unknown;
  [key: string]: unknown;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, webhook-id, webhook-signature, webhook-timestamp, dodo-signature",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const handledSubscriptionEvents = new Set([
  "subscription.active",
  "subscription.renewed",
  "subscription.updated",
  "subscription.cancelled",
  "subscription.expired",
  "subscription.failed",
  "subscription.on_hold",
]);

const activeSubscriptionEvents = new Set([
  "subscription.active",
  "subscription.renewed",
]);

const inactiveSubscriptionEvents = new Set([
  "subscription.cancelled",
  "subscription.expired",
  "subscription.failed",
  "subscription.on_hold",
]);

const paymentEvents = new Set(["payment.succeeded", "payment.failed"]);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

function getRequiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function getString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function getBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function getObject(value: unknown): JsonObject | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : null;
}

function getNestedString(source: JsonObject, paths: string[][]) {
  for (const path of paths) {
    let current: unknown = source;
    for (const key of path) {
      current = getObject(current)?.[key];
    }
    const value = getString(current);
    if (value) return value;
  }
  return null;
}

function getEventType(event: DodoEvent) {
  return getString(event.type) ?? getString(event.event_type);
}

function getEventId(event: DodoEvent, webhookId: string | null) {
  return (
    webhookId ??
    getString(event.id) ??
    getString(event.event_id) ??
    null
  );
}

function getPayloadData(event: DodoEvent) {
  return getObject(event.data) ?? getObject(event.payload) ?? {};
}

function getMetadata(event: DodoEvent, data: JsonObject) {
  return (
    getObject(data.metadata) ??
    getObject(getObject(data.subscription)?.metadata) ??
    getObject(getObject(data.payment)?.metadata) ??
    getObject(event.metadata) ??
    {}
  );
}

function extractEmail(data: JsonObject) {
  return getNestedString(data, [
    ["customer", "email"],
    ["customer_email"],
    ["email"],
    ["billing", "email"],
  ]);
}

function extractCustomerId(data: JsonObject) {
  return getNestedString(data, [
    ["customer_id"],
    ["customer", "customer_id"],
    ["customer", "id"],
  ]);
}

function extractSubscriptionId(data: JsonObject, eventType: string) {
  if (eventType.startsWith("subscription.")) {
    return (
      getString(data.subscription_id) ??
      getString(data.id) ??
      getNestedString(data, [
        ["subscription", "subscription_id"],
        ["subscription", "id"],
      ])
    );
  }

  return (
    getString(data.subscription_id) ??
    getNestedString(data, [
      ["subscription", "subscription_id"],
      ["subscription", "id"],
    ])
  );
}

function extractProductId(data: JsonObject) {
  const cart = Array.isArray(data.product_cart) ? data.product_cart : [];
  return (
    getString(data.product_id) ??
    getNestedString(data, [
      ["product", "product_id"],
      ["product", "id"],
    ]) ??
    getString(getObject(cart[0])?.product_id)
  );
}

function extractPeriodStart(data: JsonObject) {
  return getNestedString(data, [
    ["current_period_start"],
    ["subscription", "current_period_start"],
    ["period_start"],
  ]);
}

function extractPeriodEnd(data: JsonObject) {
  return getNestedString(data, [
    ["current_period_end"],
    ["subscription", "current_period_end"],
    ["next_billing_date"],
    ["subscription", "next_billing_date"],
    ["renews_at"],
    ["expires_at"],
  ]);
}

function extractStatus(data: JsonObject, eventType: string) {
  return (
    getString(data.status) ??
    getString(getObject(data.subscription)?.status) ??
    eventType.replace(/^subscription\./, "")
  );
}

function isActiveUpdatedStatus(status: string) {
  return ["active", "renewed", "trialing"].includes(status.toLowerCase());
}

function getSignatureHeader(req: Request) {
  return (
    req.headers.get("webhook-signature") ??
    req.headers.get("Dodo-Signature") ??
    req.headers.get("dodo-signature")
  );
}

function extractSignatureCandidates(header: string) {
  return header
    .split(/[\s,;]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const equalsIndex = part.indexOf("=");
      return equalsIndex >= 0 ? part.slice(equalsIndex + 1) : part;
    })
    .filter((part) => part && part !== "v1");
}

function timingSafeEqual(a: string, b: string) {
  const left = new TextEncoder().encode(a);
  const right = new TextEncoder().encode(b);
  if (left.length !== right.length) return false;

  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left[index] ^ right[index];
  }
  return diff === 0;
}

function bytesToHex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function bytesToBase64(bytes: ArrayBuffer) {
  let binary = "";
  for (const byte of new Uint8Array(bytes)) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function bytesToBase64Url(bytes: ArrayBuffer) {
  return bytesToBase64(bytes)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function secretToBytes(secret: string) {
  if (secret.startsWith("whsec_")) {
    const normalized = secret
      .slice("whsec_".length)
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      "=",
    );
    const binary = atob(padded);
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  }
  return new TextEncoder().encode(secret);
}

async function verifyWebhookSignature({
  rawBody,
  webhookId,
  timestamp,
  signatureHeader,
  secret,
}: {
  rawBody: string;
  webhookId: string;
  timestamp: string;
  signatureHeader: string;
  secret: string;
}) {
  if (!webhookId || !timestamp || !signatureHeader) return false;

  const signedPayload = `${webhookId}.${timestamp}.${rawBody}`;
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    secretToBytes(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    new TextEncoder().encode(signedPayload),
  );

  const expected = [bytesToBase64(digest), bytesToBase64Url(digest), bytesToHex(digest)];
  const candidates = extractSignatureCandidates(signatureHeader);
  return candidates.some((candidate) =>
    expected.some((value) => timingSafeEqual(candidate, value)),
  );
}

function createAdminClient() {
  return createClient(
    getRequiredEnv("SUPABASE_URL"),
    getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}

async function hasProcessedEvent({
  supabaseAdmin,
  eventId,
}: {
  supabaseAdmin: ReturnType<typeof createClient>;
  eventId: string | null;
}) {
  if (!eventId) return false;

  const { data, error } = await supabaseAdmin
    .from("webhook_events")
    .select("event_id")
    .eq("event_id", eventId)
    .maybeSingle();

  if (error?.code === "42P01" || error?.code === "42703") return false;
  if (error) throw error;
  return Boolean(data);
}

async function recordWebhookEvent({
  supabaseAdmin,
  eventId,
  eventType,
  event,
  status,
}: {
  supabaseAdmin: ReturnType<typeof createClient>;
  eventId: string | null;
  eventType: string;
  event: DodoEvent;
  status: string;
}) {
  if (!eventId) return;

  const { error } = await supabaseAdmin.from("webhook_events").insert({
    event_id: eventId,
    provider: "dodo",
    event_type: eventType,
    payload: event,
    status,
    processed_at: new Date().toISOString(),
  });

  if (error?.code === "23505") return;
  if (error?.code === "42P01" || error?.code === "42703") {
    console.warn("[Arcalist] webhook_events table unavailable, skipping record", {
      event_id: eventId,
      event_type: eventType,
      code: error.code,
    });
    return;
  }
  if (error) throw error;
}

async function findUserId({
  supabaseAdmin,
  metadata,
  customerId,
  email,
}: {
  supabaseAdmin: ReturnType<typeof createClient>;
  metadata: JsonObject;
  customerId: string | null;
  email: string | null;
}) {
  const metadataUserId = getString(metadata.user_id);
  if (metadataUserId) return metadataUserId;

  if (customerId) {
    const { data } = await supabaseAdmin
      .from("billing_customers")
      .select("user_id")
      .eq("dodo_customer_id", customerId)
      .maybeSingle();
    const userId = getString((data as JsonObject | null)?.user_id);
    if (userId) return userId;
  }

  if (email) {
    const { data } = await supabaseAdmin
      .from("billing_customers")
      .select("user_id")
      .eq("email", email)
      .maybeSingle();
    const userId = getString((data as JsonObject | null)?.user_id);
    if (userId) return userId;
  }

  return null;
}

async function upsertBillingCustomer({
  supabaseAdmin,
  userId,
  customerId,
  email,
  metadata,
}: {
  supabaseAdmin: ReturnType<typeof createClient>;
  userId: string;
  customerId: string | null;
  email: string | null;
  metadata: JsonObject;
}) {
  const row: JsonObject = {
    user_id: userId,
    metadata,
    updated_at: new Date().toISOString(),
  };
  if (customerId) row.dodo_customer_id = customerId;
  if (email) row.email = email;

  const { error } = await supabaseAdmin
    .from("billing_customers")
    .upsert(row, { onConflict: "user_id" });
  if (error) throw error;
}

async function upsertSubscription({
  supabaseAdmin,
  userId,
  data,
  metadata,
  eventType,
}: {
  supabaseAdmin: ReturnType<typeof createClient>;
  userId: string;
  data: JsonObject;
  metadata: JsonObject;
  eventType: string;
}) {
  const subscriptionId = extractSubscriptionId(data, eventType);
  if (!subscriptionId) return null;

  const planCode = getString(metadata.plan_code);
  const { error } = await supabaseAdmin.from("subscriptions").upsert(
    {
      user_id: userId,
      dodo_subscription_id: subscriptionId,
      dodo_customer_id: extractCustomerId(data),
      dodo_product_id: extractProductId(data),
      plan: "pro",
      plan_code: planCode === "pro_monthly" || planCode === "pro_yearly"
        ? planCode
        : null,
      status: extractStatus(data, eventType),
      current_period_start: extractPeriodStart(data),
      current_period_end: extractPeriodEnd(data),
      cancel_at_period_end:
        getBoolean(data.cancel_at_period_end) ??
        getBoolean(getObject(data.subscription)?.cancel_at_period_end),
      metadata: data,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "dodo_subscription_id" },
  );

  if (error) throw error;

  return {
    subscriptionId,
    currentPeriodEnd: extractPeriodEnd(data),
  };
}

async function setEntitlement({
  supabaseAdmin,
  userId,
  isPro,
  subscriptionId,
  validUntil,
  status,
}: {
  supabaseAdmin: ReturnType<typeof createClient>;
  userId: string;
  isPro: boolean;
  subscriptionId: string | null;
  validUntil: string | null;
  status: string;
}) {
  const { error } = await supabaseAdmin.from("user_entitlements").upsert(
    {
      user_id: userId,
      plan: isPro ? "pro" : "free",
      is_pro: isPro,
      source: "dodo_subscription",
      dodo_subscription_id: subscriptionId,
      valid_until: isPro ? validUntil : null,
      status,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) throw error;
}

async function processEvent({
  supabaseAdmin,
  event,
  eventId,
  eventType,
  data,
}: {
  supabaseAdmin: ReturnType<typeof createClient>;
  event: DodoEvent;
  eventId: string | null;
  eventType: string;
  data: JsonObject;
}) {
  const metadata = getMetadata(event, data);
  const customerId = extractCustomerId(data);
  const email = extractEmail(data);

  if (!handledSubscriptionEvents.has(eventType) && !paymentEvents.has(eventType)) {
    console.info("[Arcalist] Ignored Dodo webhook event", {
      event_id: eventId ?? undefined,
      event_type: eventType,
    });
    return "ignored";
  }

  const userId = await findUserId({
    supabaseAdmin,
    metadata,
    customerId,
    email,
  });

  if (!userId) {
    console.warn("[Arcalist] Dodo webhook could not be matched to a user", {
      event_id: eventId ?? undefined,
      event_type: eventType,
      has_email: Boolean(email),
    });
    return "unmatched";
  }

  await upsertBillingCustomer({
    supabaseAdmin,
    userId,
    customerId,
    email,
    metadata,
  });

  if (paymentEvents.has(eventType)) {
    console.info("[Arcalist] Dodo payment webhook recorded without entitlement change", {
      event_id: eventId ?? undefined,
      event_type: eventType,
      user_id: userId,
    });
    return "processed";
  }

  const subscription = await upsertSubscription({
    supabaseAdmin,
    userId,
    data,
    metadata,
    eventType,
  });
  const status = extractStatus(data, eventType);
  const isActive =
    activeSubscriptionEvents.has(eventType) ||
    (eventType === "subscription.updated" && isActiveUpdatedStatus(status));
  const isInactive = inactiveSubscriptionEvents.has(eventType);

  if (!subscription?.subscriptionId) {
    console.warn("[Arcalist] Dodo subscription webhook missing subscription id", {
      event_id: eventId ?? undefined,
      event_type: eventType,
    });
    return "ignored";
  }

  await setEntitlement({
    supabaseAdmin,
    userId,
    isPro: isActive && !isInactive,
    subscriptionId: subscription.subscriptionId,
    validUntil: subscription.currentPeriodEnd,
    status: isActive && !isInactive ? "active" : status,
  });

  return "processed";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method === "GET") {
    return json({
      ok: true,
      function: "dodo-webhook",
      message: "Dodo webhook endpoint is reachable",
    });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const rawBody = await req.text();
  const webhookId = req.headers.get("webhook-id");
  const timestamp = req.headers.get("webhook-timestamp");
  const signatureHeader = getSignatureHeader(req);

  console.info("[Arcalist] Dodo webhook received", {
    webhook_id: webhookId ?? undefined,
    has_signature: Boolean(signatureHeader),
  });

  let verified = false;
  try {
    verified = await verifyWebhookSignature({
      rawBody,
      webhookId: webhookId ?? "",
      timestamp: timestamp ?? "",
      signatureHeader: signatureHeader ?? "",
      secret: getRequiredEnv("DODO_WEBHOOK_SECRET"),
    });
  } catch (error) {
    console.error("[Arcalist] Dodo webhook verification failed", {
      webhook_id: webhookId ?? undefined,
      message: error instanceof Error ? error.message : String(error),
    });
  }

  if (!verified) {
    return json({ error: "Invalid signature" }, 401);
  }

  let event: DodoEvent;
  try {
    event = JSON.parse(rawBody) as DodoEvent;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const eventType = getEventType(event);
  if (!eventType) {
    console.info("[Arcalist] Dodo webhook missing event type, ignored", {
      webhook_id: webhookId ?? undefined,
    });
    return json({ received: true, ignored: true });
  }

  const eventId = getEventId(event, webhookId);
  const data = getPayloadData(event);
  const supabaseAdmin = createAdminClient();

  console.info("[Arcalist] Dodo webhook parsed", {
    event_id: eventId ?? undefined,
    event_type: eventType,
  });

  try {
    if (await hasProcessedEvent({ supabaseAdmin, eventId })) {
      return json({ received: true, duplicate: true });
    }

    const status = await processEvent({
      supabaseAdmin,
      event,
      eventId,
      eventType,
      data,
    });

    await recordWebhookEvent({
      supabaseAdmin,
      eventId,
      eventType,
      event,
      status,
    });

    return json({ received: true, status });
  } catch (error) {
    console.error("[Arcalist] Dodo webhook processing failed", {
      event_id: eventId ?? undefined,
      event_type: eventType,
      message: error instanceof Error ? error.message : String(error),
    });
    return json({ error: "Webhook processing failed" }, 500);
  }
});
