# Silver Lines Tackle Co. — website

A complete, production-ready static website for an Australian fishing tackle shop serving
senior anglers. No build step, no framework, no dependencies. Upload the files and it runs.

## What is in here

| Path | What it is |
|---|---|
| `index.html` | Home page |
| `shop.html` | Shop with category filter, sort and live search |
| `product.html?id=slug` | Product detail page (populated from the catalogue) |
| `cart.html` | Working cart with quantity controls and delivery options |
| `checkout.html` | Validated Australian checkout with card, PayPal or bank transfer |
| `payment-success.html` | Payment confirmation, itemised receipt and print button |
| `guides.html` | Four full plain-English fishing guides |
| `about.html` `faq.html` `contact.html` `404.html` | Supporting pages |
| `legal.html` | Policy hub with a summary table and complaints route |
| 9 policy pages | Privacy, Terms, Shipping, Returns, Warranty, Cookies, Accessibility, Seniors Discount, Disclaimer |
| `assets/css/style.css` | The whole design system, senior-first |
| `assets/js/catalog.js` | **Your products, prices, guides and settings — edit this file** |
| `assets/js/app.js` | Cart engine, checkout validation, receipt generator |
| `assets/img/` | 12 optimised photographs plus thumbnails, favicon and social share card |
| `api/create-checkout-session.js` | Optional Stripe Checkout endpoint for live card payments |
| `.htaccess` `netlify.toml` `vercel.json` | Server configuration for Apache, Netlify and Vercel |
| `robots.txt` `sitemap.xml` | Search engine files |

## Quick start

1. Unzip the folder.
2. Upload **everything** to your web host's public directory (`public_html`, `www`, or the
   root of a Netlify/Vercel/Cloudflare Pages deploy).
3. Visit your domain. That is the whole installation.

To preview locally, run any static server from the folder:

```
npx serve .
# or
python3 -m http.server 8000
```

Opening `index.html` directly from your file system also works, but some browsers block
local storage on `file://` URLs, which stops the cart from working. Use a local server to test.

## Editing your shop

Everything a shop owner needs to change lives in **`assets/js/catalog.js`**:

- `SL_SETTINGS` — business name, ABN, phone, email, address, free-delivery threshold,
  delivery charges, the Seniors Card discount rate, GST rate and the payment settings.
- `SL_PRODUCTS` — one block per product. Copy an existing block and change the values.
  `id` must match the image filenames in `assets/img/`.
- `SL_GUIDES` — the fishing guides.
- `SL_SHIPPING` — the delivery methods.

Adding a product:

1. Add a block to `SL_PRODUCTS` with a new `id`, for example `new-rod`.
2. Save the product photo as `assets/img/new-rod.jpg` (1200 × 1200) and a smaller
   `assets/img/thumb-new-rod.jpg` (560 × 560).
3. Save. The product appears in the shop, the home page grid, search and filters automatically.

Prices are entered as plain numbers in Australian dollars including GST (`189.00`). The site
calculates and displays the GST component itself.

## Taking real card payments

The checkout is fully built and validated. It has two modes:

**Mode 1 — offline / manual (default).** No keys configured. The card form validates the card
number (Luhn), expiry date and security code, creates the order, shows the receipt and clears
the cart — but **no money moves**. Use this for testing, for phone orders or when you plan to
invoice. Card details are never stored.

**Mode 2 — live Stripe payments.** To take card payments:

1. In your hosting dashboard set two environment variables:
   - `STRIPE_SECRET_KEY` = your Stripe secret key (`sk_live_…`)
   - `SITE_URL` = `https://www.yourdomain.com.au`
2. Deploy `api/create-checkout-session.js` (Vercel auto-detects the `api/` folder; on Netlify
   move it to `netlify/functions/`).
3. In `assets/js/catalog.js` set:

```js
stripe: {
  publishableKey: "pk_live_your_key_here",
  checkoutEndpoint: "/api/create-checkout-session"
}
```

4. Save and redeploy. Card payments now redirect to Stripe and return to
   `payment-success.html`.

The endpoint keeps a **server-side price list** so a customer cannot change a price in browser
dev tools. Keep its `CATALOGUE` object in step with `SL_PRODUCTS` whenever you change a price.
PayPal and bank transfer are shown as options in the checkout; wire them to your own accounts
or hide the radio buttons in `checkout.html` if you do not offer them.

> Security note: a static site must never contain a secret key. Only the *publishable* key
> belongs in `catalog.js`.

## Accessibility

The site follows WCAG 2.2 Level AA: 18 px base text with A / A+ / A++ controls and a high
contrast mode on every page, 44 px minimum targets, visible focus rings, skip link, semantic
landmarks, text alternatives for every image, live regions for cart changes, and full keyboard
operation. It reflows to a single column at 320 px and prints cleanly. Details are in
`accessibility.html`.

## Privacy and the law

Card numbers are never written to browser storage — only the last four digits, for matching a
payment to an order. The cart, delivery details and accessibility preferences are kept in the
customer's own browser via local storage. This is described in `cookie-policy.html` and
`privacy-policy.html`.

The policies cover the Australian Consumer Law, the Privacy Act 1988 (Cth) and the Australian
Privacy Principles, the OAIC complaints process, AS 4758 for life jackets, and GST-inclusive
pricing. **Have them reviewed before you trade** — they are written to be genuinely useful, but
they are not legal advice, and your actual business details must be substituted throughout.

## Before you go live — checklist

1. Replace the placeholder business details. To find every occurrence, search the folder for
   `48 271 903 556` (ABN), `1300 745 837` (phone) and `silverlinestackle.com.au` (domain).
2. Replace the products and prices with your real stock, and the photographs with your own.
3. Substitute your real email address in `SL_SETTINGS.email` and in every policy page.
4. Connect the contact form to a handler — see `DEPLOY.md`.
5. Have a solicitor review the policy pages for your business structure and state.
6. Turn on HTTPS and uncomment the HTTPS rules in `.htaccess` if you are on Apache.
7. Submit `sitemap.xml` to Google Search Console.
