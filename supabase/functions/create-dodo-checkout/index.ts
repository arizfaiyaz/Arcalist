import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

type PlanCode = "pro_monthly" | "pro_yearly";

type CheckoutRequest = {
  plan_code?: string;
  use_collection?: boolean;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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

function isPlanCode(value: string | undefined): value is PlanCode {
  return value === "pro_monthly" || value === "pro_yearly";
}

function getDodoBaseUrl() {
  const environment = Deno.env.get("DODO_PAYMENTS_ENVIRONMENT") ?? "live_mode";
  return environment === "live_mode"
    ? "https://live.dodopayments.com"
    : "https://test.dodopayments.com";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.toLowerCase().startsWith("bearer ")) {
      return json({ error: "Authentication required" }, 401);
    }

    const supabaseUrl = getRequiredEnv("SUPABASE_URL");
    const supabaseAnonKey = getRequiredEnv("SUPABASE_ANON_KEY");
    const supabaseUserClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseUserClient.auth.getUser();

    if (userError || !user?.id) {
      return json({ error: "Authentication required" }, 401);
    }

    const serviceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const body = (await req.json().catch(() => ({}))) as CheckoutRequest;
    if (!isPlanCode(body.plan_code)) {
      return json({ error: "Invalid plan_code" }, 400);
    }

    const productId =
      body.plan_code === "pro_monthly"
        ? getRequiredEnv("DODO_PRO_MONTHLY_PRODUCT_ID")
        : getRequiredEnv("DODO_PRO_YEARLY_PRODUCT_ID");

    const returnUrl = getRequiredEnv("CHECKOUT_RETURN_URL");
    const apiKey = getRequiredEnv("DODO_PAYMENTS_API_KEY");
    const email = user.email;

    if (!email) {
      return json({ error: "A verified email is required for checkout" }, 400);
    }

    await supabaseAdmin.from("billing_customers").upsert(
      {
        user_id: user.id,
        email,
        metadata: {
          app_name: "arcalist",
          last_checkout_plan_code: body.plan_code,
        },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    const metadata = {
      user_id: user.id,
      app_name: "arcalist",
      product_family: "arcalist_pro",
      tier: "pro",
      plan_code: body.plan_code,
      entitlement: "pro",
      environment: "live",
    };

    const checkoutPayload: Record<string, unknown> = {
      customer: { email },
      return_url: returnUrl,
      metadata,
      product_cart: [{ product_id: productId, quantity: 1 }],
    };

    const dodoResponse = await fetch(`${getDodoBaseUrl()}/checkouts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(checkoutPayload),
    });

    const dodoJson = await dodoResponse.json().catch(() => null);
    if (
      !dodoResponse.ok ||
      !dodoJson ||
      typeof dodoJson.checkout_url !== "string" ||
      typeof dodoJson.session_id !== "string"
    ) {
      console.error("[Arcalist] Dodo checkout creation failed", {
        status: dodoResponse.status,
        plan_code: body.plan_code,
      });
      return json({ error: "Unable to create checkout session" }, 502);
    }

    return json({
      checkout_url: dodoJson.checkout_url,
      session_id: dodoJson.session_id,
      plan_code: body.plan_code,
    });
  } catch (error) {
    console.error("[Arcalist] create-dodo-checkout failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    return json({ error: "Unable to create checkout session" }, 500);
  }
});
