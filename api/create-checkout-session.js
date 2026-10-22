/*  Stripe Checkout endpoint for Silver Lines Tackle Co.
 *
 *  Deploy on Vercel (api/create-checkout-session.js) or Netlify (netlify/functions/).
 *  Set these environment variables in your hosting dashboard — never in the HTML:
 *      STRIPE_SECRET_KEY      sk_live_... or sk_test_...
 *      SITE_URL               https://www.silverlinestackle.com.au
 *
 *  Then put your pk_live_... (or pk_test_...) publishable key and this endpoint's
 *  path into assets/js/catalog.js under SL_SETTINGS.stripe. Live card payments
 *  start working immediately: the site redirects to Stripe, and Stripe redirects
 *  back to payment-success.html.
 *
 *  Prices are sent from the server-side catalogue below, never trusted from the
 *  browser, so a customer cannot edit a price in dev tools.
 */
const Stripe = require("stripe");
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const SITE_URL = process.env.SITE_URL || "https://www.silverlinestackle.com.au";

// Server-side price list in cents (AUD, GST inclusive). Keep in step with assets/js/catalog.js
const CATALOGUE = {
  "rod-reel-combo":    { name: "Silvercaster Rod & Reel Combo",        cents: 18900 },
  "sit-fit-chair":     { name: "Sit-Fit Folding Fishing Chair",       cents: 13900 },
  "tackle-organiser":  { name: "Easy-Grip Tackle Organiser",          cents:  5900 },
  "tackle-trolley":    { name: "Compact Tackle Trolley",              cents: 16900 },
  "bite-alarm-set":    { name: "Solar Bite Alarm & Rod Light Set",    cents:  7400 },
  "uv-hat":            { name: "Wide-Brim UV Hat - UPF 50+",          cents:  4200 },
  "landing-net":       { name: "Long-Reach Landing Net",              cents:  8900 },
  "sand-spike":        { name: "Stainless Sand-Spike Rod Holder",     cents:  5400 },
  "life-jacket":       { name: "Hi-Vis Inflatable Life Jacket PFD 1", cents: 14900 },
  "safety-comfort-kit":{ name: "Safety & Comfort Kit (3-piece)",      cents: 31900 }
};
const SHIPPING = { standard: 1295, express: 2195, pickup: 0 };
const FREE_OVER = 9900;      // $99
const SENIORS   = 0.10;

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const b = req.body || {};
    const lines = Array.isArray(b.items) ? b.items : [];
    if (!lines.length) return res.status(400).json({ error: "Cart is empty" });

    const line_items = lines.map(l => {
      // Accept either a catalogue id or a name; resolve to a trusted price.
      const key = Object.keys(CATALOGUE).find(k =>
        k === l.id || CATALOGUE[k].name === l.name);
      if (!key) throw new Error("Unknown item: " + (l.id || l.name));
      const item = CATALOGUE[key];
      return {
        price_data: {
          currency: "aud",
          product_data: { name: item.name },
          unit_amount: item.cents
        },
        quantity: Math.max(1, Math.min(99, parseInt(l.qty, 10) || 1))
      };
    });

    const subtotalCents = lines.reduce((t, l) => {
      const key = Object.keys(CATALOGUE).find(k => k === l.id || CATALOGUE[k].name === l.name);
      return t + (CATALOGUE[key] ? CATALOGUE[key].cents * (parseInt(l.qty, 10) || 1) : 0);
    }, 0);
    const discount = b.seniors ? Math.round(subtotalCents * SENIORS) : 0;
    const after = subtotalCents - discount;
    const method = SHIPPING[b.shipping] === undefined ? "standard" : b.shipping;
    const ship = (method === "standard" && after >= FREE_OVER) ? 0 : SHIPPING[method];

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: b.email || undefined,
      line_items,
      shipping_options: ship > 0 ? [{
        shipping_rate_data: {
          type: "fixed_amount",
          fixed_amount: { amount: ship, currency: "aud" },
          display_name: method === "express" ? "Express delivery (1-2 business days)" : "Standard delivery (3-6 business days)"
        }
      }] : undefined,
      discounts: discount > 0 ? [{
        coupon: (await stripe.coupons.create({
          amount_off: discount, currency: "aud", duration: "once",
          name: "Seniors Card discount (10%)"
        })).id
      }] : undefined,
      metadata: { orderId: b.orderId || "", customerName: b.name || "", phone: b.phone || "" },
      success_url: SITE_URL + "/payment-success.html?order={CHECKOUT_SESSION_ID}",
      cancel_url:  SITE_URL + "/checkout.html?cancelled=1"
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("Stripe error:", err.message);
    return res.status(400).json({ error: err.message });
  }
};
