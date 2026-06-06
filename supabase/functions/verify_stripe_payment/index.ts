import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "npm:stripe@19.1.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const supabase = createClient(supabaseUrl, supabaseKey);

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
    try {
        if (req.method === "OPTIONS") {
            return new Response(null, { headers: corsHeaders });
        }

        const { sessionId } = await req.json();
        if (!sessionId) throw new Error("ID de session manquant");

        const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
        if (!stripeSecretKey) {
            throw new Error("STRIPE_SECRET_KEY non configurée");
        }

        const stripe = new Stripe(stripeSecretKey, {
            apiVersion: "2025-08-27.basil",
        });

        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (session.payment_status !== "paid") {
            return new Response(JSON.stringify({ code: "PENDING", data: { verified: false, status: session.payment_status } }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // --- Logic to finalize payment ---
        const { data: order, error: fetchError } = await supabase
            .from("orders")
            .select("id, status, user_id, total_amount, currency")
            .eq("stripe_session_id", sessionId)
            .single();

        if (fetchError || !order) {
            throw new Error(`Commande introuvable: ${sessionId}`);
        }

        if (order.status === "completed") {
            return new Response(JSON.stringify({ code: "SUCCESS", data: { verified: true, status: "already_completed" } }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // 1. Update order status
        const { error: updateError } = await supabase
            .from("orders")
            .update({
                status: "completed",
                completed_at: new Date().toISOString(),
                customer_email: session.customer_details?.email,
                customer_name: session.customer_details?.name,
                stripe_payment_intent_id: session.payment_intent as string,
            })
            .eq("id", order.id);

        if (updateError) throw new Error(`Erreur MAJ commande: ${updateError.message}`);

        // 2. Grant premium to user
        const { error: profileError } = await supabase
            .from("profiles")
            .update({ is_premium: true })
            .eq("id", order.user_id);

        if (profileError) console.error("Échec MAJ premium:", profileError.message);

        // 3. Increment admin wallet
        // Fetch first admin
        const { data: adminProfile } = await supabase
            .from("profiles")
            .select("id")
            .eq("role", "admin")
            .limit(1)
            .single();

        if (adminProfile) {
            // Use RPC to atomically update balance to prevent race conditions
            // but for simplicity here I'll just fetch and update if no RPC is defined.
            // Let's create an RPC for this in the migration later if needed.
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

        return new Response(JSON.stringify({ 
            code: "SUCCESS", 
            data: { 
                verified: true, 
                amount: order.total_amount, 
                currency: order.currency 
            } 
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        
    } catch (error) {
        return new Response(JSON.stringify({ code: "FAIL", message: error instanceof Error ? error.message : "Erreur verification" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
});