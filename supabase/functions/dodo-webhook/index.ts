import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4?target=deno";
import DodoPayments from "npm:dodopayments";

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

function getDodoWebhookKey() {
  const webhookKey =
    Deno.env.get("DODO_WEBHOOK_SECRET") ??
    Deno.env.get("DODO_PAYMENTS_WEBHOOK_KEY");

  if (!webhookKey) throw new Error("Missing Dodo webhook secret");
  return webhookKey;
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

function getEntitlementStatus(isPro: boolean, eventStatus: string) {
  if (isPro) return "active";
  return eventStatus === "cancelled" ? "cancelled" : "inactive";
}

function getAllowedProductIds() {
  return new Set(
    [
      Deno.env.get("DODO_PRO_MONTHLY_PRODUCT_ID"),
      Deno.env.get("DODO_PRO_YEARLY_PRODUCT_ID"),
    ].filter((value): value is string => Boolean(value)),
  );
}

function isAllowedArcalistProProduct(productId: string | null) {
  return Boolean(productId && getAllowedProductIds().has(productId));
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

async function reserveWebhookEvent({
  supabaseAdmin,
  eventId,
  eventType,
  event,
}: {
  supabaseAdmin: ReturnType<typeof createClient>;
  eventId: string;
  eventType: string;
  event: DodoEvent;
}) {
  const { error } = await supabaseAdmin.from("webhook_events").insert({
    event_id: eventId,
    provider: "dodo",
    event_type: eventType,
    payload: event,
    status: "processing",
  });

  if (error?.code === "23505") return "duplicate" as const;
  if (error) throw error;
  return "reserved" as const;
}

async function markWebhookEventStatus({
  supabaseAdmin,
  eventId,
  status,
}: {
  supabaseAdmin: ReturnType<typeof createClient>;
  eventId: string;
  status: string;
}) {
  const { error } = await supabaseAdmin
    .from("webhook_events")
    .update({
      status,
      processed_at: new Date().toISOString(),
    })
    .eq("event_id", eventId);

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
}): Promise<{ userId: string; source: "metadata" | "customer" | "email" } | null> {
  const metadataUserId = getString(metadata.user_id);
  if (metadataUserId) return { userId: metadataUserId, source: "metadata" };

  if (customerId) {
    const { data } = await supabaseAdmin
      .from("billing_customers")
      .select("user_id")
      .eq("dodo_customer_id", customerId)
      .maybeSingle();
    const userId = getString((data as JsonObject | null)?.user_id);
    if (userId) return { userId, source: "customer" };
  }

  if (email) {
    const { data } = await supabaseAdmin
      .from("billing_customers")
      .select("user_id")
      .eq("email", email)
      .maybeSingle();
    const userId = getString((data as JsonObject | null)?.user_id);
    if (userId) return { userId, source: "email" };
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
  status,
}: {
  supabaseAdmin: ReturnType<typeof createClient>;
  userId: string;
  isPro: boolean;
  status: string;
}) {
  const { error } = await supabaseAdmin.from("user_entitlements").upsert(
    {
      user_id: userId,
      plan: isPro ? "pro" : "free",
      source: "dodo",
      status,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) throw error;
}

async function canDowngradeEntitlementForDodoWebhook({
  supabaseAdmin,
  userId,
  subscriptionId,
}: {
  supabaseAdmin: ReturnType<typeof createClient>;
  userId: string;
  subscriptionId: string;
}) {
  const { data: entitlement, error: entitlementError } = await supabaseAdmin
    .from("user_entitlements")
    .select("source")
    .eq("user_id", userId)
    .maybeSingle();

  if (entitlementError) throw entitlementError;

  const source = getString((entitlement as JsonObject | null)?.source);
  if (source === "internal" || source === "manual") return false;
  if (source === "dodo") return true;

  const { data: subscription, error: subscriptionError } = await supabaseAdmin
    .from("subscriptions")
    .select("dodo_subscription_id")
    .eq("user_id", userId)
    .eq("dodo_subscription_id", subscriptionId)
    .maybeSingle();

  if (subscriptionError) throw subscriptionError;
  return Boolean(subscription);
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
      reason: "unknown_or_test_event",
    });
    return "ignored_unknown_or_test_event";
  }

  const productId = extractProductId(data);
  if (!isAllowedArcalistProProduct(productId)) {
    console.warn("Ignoring webhook for non-Arcalist-Pro product", {
      eventType,
      productId,
      reason: "unknown_product",
    });
    return "ignored_unknown_product";
  }

  const userLookup = await findUserId({
    supabaseAdmin,
    metadata,
    customerId,
    email,
  });
  const userId = userLookup?.userId ?? null;

  if (!userId) {
    console.warn("[Arcalist] Dodo webhook could not be matched to a user", {
      event_id: eventId ?? undefined,
      event_type: eventType,
      has_email: Boolean(email),
      reason: "unmatched_user",
    });
    return "ignored_unmatched_user";
  }

  if (userLookup?.source === "email") {
    console.info("[Arcalist] Dodo webhook matched user by billing email fallback", {
      event_id: eventId ?? undefined,
      event_type: eventType,
      user_id: userId,
    });
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
  const shouldGrantPro = isActive && !isInactive;

  if (!subscription?.subscriptionId) {
    console.warn("[Arcalist] Dodo subscription webhook missing subscription id", {
      event_id: eventId ?? undefined,
      event_type: eventType,
      reason: "unknown_or_test_event",
    });
    return "ignored_unknown_or_test_event";
  }

  if (!shouldGrantPro) {
    const canDowngrade = await canDowngradeEntitlementForDodoWebhook({
      supabaseAdmin,
      userId,
      subscriptionId: subscription.subscriptionId,
    });

    if (!canDowngrade) {
      console.info("[Arcalist] Dodo downgrade skipped for non-Dodo entitlement", {
        event_id: eventId ?? undefined,
        event_type: eventType,
        user_id: userId,
        dodo_subscription_id: subscription.subscriptionId,
      });
      return "skipped_non_dodo_entitlement";
    }
  }

  await setEntitlement({
    supabaseAdmin,
    userId,
    isPro: shouldGrantPro,
    status: getEntitlementStatus(shouldGrantPro, status),
  });

  return "processed";
}

Deno.serve(async (req: Request) => {
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
  const webhookHeaders = {
    "webhook-id": req.headers.get("webhook-id") ?? "",
    "webhook-signature": req.headers.get("webhook-signature") ?? "",
    "webhook-timestamp": req.headers.get("webhook-timestamp") ?? "",
  };

  console.info("[Arcalist] Dodo webhook received", {
    method: req.method,
    hasWebhookId: Boolean(webhookHeaders["webhook-id"]),
    hasWebhookSignature: Boolean(webhookHeaders["webhook-signature"]),
    hasWebhookTimestamp: Boolean(webhookHeaders["webhook-timestamp"]),
    rawBodyLength: rawBody.length,
  });

  if (
    !webhookHeaders["webhook-id"] ||
    !webhookHeaders["webhook-signature"] ||
    !webhookHeaders["webhook-timestamp"]
  ) {
    console.warn("[Arcalist] Dodo webhook missing signature headers", {
      method: req.method,
      hasWebhookId: Boolean(webhookHeaders["webhook-id"]),
      hasWebhookSignature: Boolean(webhookHeaders["webhook-signature"]),
      hasWebhookTimestamp: Boolean(webhookHeaders["webhook-timestamp"]),
      responseStatusPath: "missing_signature_headers_401",
    });
    return json({ error: "Missing webhook signature headers" }, 401);
  }

  let event: DodoEvent;
  try {
    const client = new DodoPayments({
      bearerToken: getRequiredEnv("DODO_PAYMENTS_API_KEY"),
      environment: Deno.env.get("DODO_PAYMENTS_ENVIRONMENT") || "live_mode",
      webhookKey: getDodoWebhookKey(),
    });

    event = client.webhooks.unwrap(rawBody, {
      headers: webhookHeaders,
    }) as DodoEvent;
  } catch (error) {
    console.error("[Arcalist] Dodo webhook verification failed", {
      webhook_id: webhookHeaders["webhook-id"] || undefined,
      message: error instanceof Error ? error.message : String(error),
      responseStatusPath: "invalid_signature_401",
    });
    return json({ error: "Invalid signature" }, 401);
  }

  const eventType = getEventType(event) ?? "unknown";
  const eventId = getEventId(event, webhookHeaders["webhook-id"]);
  if (!eventId) {
    console.warn("[Arcalist] Dodo webhook missing event id after unwrap", {
      event_type: eventType,
      responseStatusPath: "unknown_or_test_event_200",
    });
    return json({
      ok: true,
      ignored: true,
      reason: "unknown_or_test_event",
    });
  }

  const data = getPayloadData(event);
  const supabaseAdmin = createAdminClient();

  console.info("[Arcalist] Dodo webhook parsed", {
    event_id: eventId ?? undefined,
    event_type: eventType,
    responseStatusPath: "signature_verified",
  });

  try {
    const reservation = await reserveWebhookEvent({
      supabaseAdmin,
      eventId,
      eventType,
      event,
    });
    if (reservation === "duplicate") {
      console.info("[Arcalist] Dodo webhook duplicate ignored", {
        event_id: eventId,
        event_type: eventType,
        responseStatusPath: "duplicate_200",
      });
      return json({ ok: true, duplicate: true });
    }

    const status = await processEvent({
      supabaseAdmin,
      event,
      eventId,
      eventType,
      data,
    });

    await markWebhookEventStatus({
      supabaseAdmin,
      eventId,
      status,
    });

    if (status === "ignored_unknown_product") {
      console.info("[Arcalist] Dodo webhook ignored", {
        event_id: eventId,
        event_type: eventType,
        reason: "unknown_product",
        responseStatusPath: "ignored_unknown_product_200",
      });
      return json({
        ok: true,
        ignored: true,
        reason: "unknown_product",
      });
    }

    if (status === "ignored_unknown_or_test_event") {
      console.info("[Arcalist] Dodo webhook ignored", {
        event_id: eventId,
        event_type: eventType,
        reason: "unknown_or_test_event",
        responseStatusPath: "ignored_unknown_or_test_event_200",
      });
      return json({
        ok: true,
        ignored: true,
        reason: "unknown_or_test_event",
      });
    }

    if (status === "ignored_unmatched_user") {
      console.info("[Arcalist] Dodo webhook ignored", {
        event_id: eventId,
        event_type: eventType,
        reason: "unmatched_user",
        responseStatusPath: "ignored_unmatched_user_200",
      });
      return json({
        ok: true,
        ignored: true,
        reason: "unmatched_user",
      });
    }

    console.info("[Arcalist] Dodo webhook completed", {
      event_id: eventId,
      event_type: eventType,
      status,
      responseStatusPath: "processed_200",
    });
    return json({ received: true, status });
  } catch (error) {
    await markWebhookEventStatus({
      supabaseAdmin,
      eventId,
      status: "failed",
    }).catch(() => {});
    console.error("[Arcalist] Dodo webhook processing failed", {
      event_id: eventId ?? undefined,
      event_type: eventType,
      message: error instanceof Error ? error.message : String(error),
      responseStatusPath: "processing_failed_500",
    });
    return json({ error: "Webhook processing failed" }, 500);
  }
});
