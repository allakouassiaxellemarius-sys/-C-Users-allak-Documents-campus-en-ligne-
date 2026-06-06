import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "npm:stripe@19.1.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const supabase = createClient(supabaseUrl, supabaseKey);

const successUrlPath = '/payment-success?session_id={CHECKOUT_SESSION_ID}';
const cancelUrlPath = '/premium';

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CheckoutRequest {
    plan_id: string;
    currency?: string;
}

Deno.serve(async (req) => {
    try {
        if (req.method === "OPTIONS") {
            return new Response(null, { headers: corsHeaders });
        }

        const authHeader = req.headers.get("Authorization");
        const token = authHeader?.replace("Bearer ", "");
        const { data: { user } } = token
            ? await supabase.auth.getUser(token)
            : { data: { user: null } };

        if (!user) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        const request: CheckoutRequest = await req.json();
        const { plan_id } = request;

        // Fetch plan details from DB to prevent client-side price manipulation
        const { data: plan, error: planError } = await supabase
            .from("premium_plans")
            .select("*")
            .eq("id", plan_id)
            .single();

        if (planError || !plan) {
            throw new Error("Plan introuvable");
        }

        const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
        if (!stripeSecretKey) {
            throw new Error("STRIPE_SECRET_KEY non configurée");
        }

        const stripe = new Stripe(stripeSecretKey, {
            apiVersion: "2025-08-27.basil",
        });

        // Create pending order
        const { data: order, error: orderError } = await supabase
            .from("orders")
            .insert({
                user_id: user.id,
                items: [{ plan_id: plan.id, name: plan.name, price: plan.price }],
                total_amount: plan.price,
                currency: plan.currency.toLowerCase(),
                status: "pending",
            })
            .select()
            .single();

        if (orderError) throw new Error(`Erreur commande: ${orderError.message}`);

        const origin = req.headers.get("origin") || "";
        
        // Use automatic payment methods to support local methods based on currency/region
        // Stripe will dynamically show Wave, Mobile Money (if available), Cards, etc.
        const session = await stripe.checkout.sessions.create({
            line_items: [{
                price_data: {
                    currency: plan.currency.toLowerCase(),
                    product_data: {
                        name: plan.name,
                        description: plan.description || `Abonnement premium pour ${plan.duration_days} jours`,
                    },
                    unit_amount: Math.round(plan.price * 100),
                },
                quantity: 1,
            }],
            mode: "payment",
            success_url: `${origin}${successUrlPath}`,
            cancel_url: `${origin}${cancelUrlPath}`,
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: {
                order_id: order.id,
                user_id: user.id,
                plan_id: plan.id,
                duration_days: plan.duration_days.toString(),
            },
        });

        await supabase
            .from("orders")
            .update({
                stripe_session_id: session.id,
            })
            .eq("id", order.id);

        return new Response(
            JSON.stringify({ code: "SUCCESS", data: { url: session.url, sessionId: session.id } }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (error) {
        return new Response(
            JSON.stringify({ code: "FAIL", message: error instanceof Error ? error.message : "Erreur fatale" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});