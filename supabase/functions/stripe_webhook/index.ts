import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "npm:stripe@19.1.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const supabase = createClient(supabaseUrl!, supabaseKey!);

const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

const stripe = new Stripe(stripeSecretKey!, {
    apiVersion: "2025-08-27.basil",
});

Deno.serve(async (req) => {
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
        return new Response("Signature manquante", { status: 400 });
    }

    try {
        const body = await req.text();
        const event = stripe.webhooks.constructEvent(body, signature, webhookSecret!);

        if (event.type === "checkout.session.completed") {
            const session = event.data.object as Stripe.Checkout.Session;
            const { order_id, user_id, plan_id } = session.metadata || {};

            if (!user_id || !order_id) {
                throw new Error("Métadonnées manquantes dans la session Stripe");
            }

            // 1. Mettre à jour la commande
            const { data: order, error: orderError } = await supabase
                .from("orders")
                .update({
                    status: "completed",
                    completed_at: new Date().toISOString(),
                    customer_email: session.customer_details?.email,
                    customer_name: session.customer_details?.name,
                    stripe_payment_intent_id: session.payment_intent as string,
                })
                .eq("id", order_id)
                .select()
                .single();

            if (orderError) throw orderError;

            // 2. Activer le mode Premium pour l'utilisateur
            const { error: profileError } = await supabase
                .from("profiles")
                .update({ is_premium: true })
                .eq("id", user_id);

            if (profileError) console.error("Échec activation premium:", profileError.message);

            // 3. Créditer le portefeuille de l'administrateur
            const { data: adminProfile } = await supabase
                .from("profiles")
                .select("id")
                .eq("role", "admin")
                .limit(1)
                .single();

            if (adminProfile) {
                const { data: wallet } = await supabase
                    .from("admin_wallets")
                    .select("balance")
                    .eq("owner_id", adminProfile.id)
                    .single();

                if (wallet) {
                    const newBalance = Number(wallet.balance) + Number(order.total_amount);
                    await supabase
                        .from("admin_wallets")
                        .update({ balance: newBalance, updated_at: new Date().toISOString() })
                        .eq("owner_id", adminProfile.id);
                }
            }
        }

        return new Response(JSON.stringify({ received: true }), { status: 200, headers: { "Content-Type": "application/json" } });
    } catch (err) {
        console.error(`Erreur Webhook: ${err.message}`);
        return new Response(`Erreur Webhook: ${err.message}`, { status: 400 });
    }
});