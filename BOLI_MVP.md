# Boli — Voice-First Reorder Concierge

**ElevenHacks #8 (Stripe × ElevenLabs) — MVP Spec for Claude Code**

> Project codename: **Boli** (Hindi/Marathi for "voice/speech"). Rename later if desired.

---

## 0. TL;DR

A voice-first concierge that handles repeat grocery/essentials orders by talking. User subscribes to Boli; says *"reorder my usual atta"*; agent queries three q-commerce backends (Zepto, Blinkit, BigBasket — mocked), picks the cheapest, confirms by voice, places the order via Stripe Connect (PaymentIntent off-session with merchant routing). Subscription tiers are gated by usage; the killer demo moment is **upgrading the subscription mid-conversation by voice** when the user hits the free-tier limit.

**Hackathon brief:** Build something people will pay for using Stripe + ElevenLabs, submit a viral video.

**Stripe surface used (≥3 products):** Billing, Customer/SetupIntent, PaymentIntent (off-session) + Connect (routing + `application_fee_amount`), Webhooks.

**ElevenLabs surface used:** Conversational AI (Agents) with server-side webhook tools + client-side tools, premium voices as tier differentiator, optional v3 multilingual for Hindi wedge.

**Demo target:** 90-second viral video showing voice → multi-merchant price comparison → voice consent → payment → confirmation, plus the "pay-for-the-agent-by-talking-to-the-agent" upgrade moment.

---

## 1. Critical Architecture Decision: Connect over Issuing

**Original plan** used Stripe Issuing (virtual card per transaction with hard merchant lock + spend limit + real-time authorization webhook). Excellent agentic-finance story, but **Issuing test-mode access is instant only for US/UK/select EU accounts**. India-based accounts must apply and wait — incompatible with hackathon timeline.

**Replacement:** Stripe Connect + PaymentIntents off-session.

| Concern | Issuing approach (blocked) | Connect approach (chosen) |
|---|---|---|
| Per-transaction control | Virtual card with spend limit | PaymentIntent with explicit amount + destination |
| Merchant binding | `allowed_merchants` on card | `transfer_data.destination` on PI |
| Trust gate | `issuing_authorization.request` webhook | Server-side intent validation before creating PI |
| Take-rate | Manual reconciliation | `application_fee_amount` (native) |
| Test access | Gated by country | Available in any sandbox |
| Story fit | "Agent has bounded authority" | "Aggregator platform routes orders to merchants" |

**Connect tells the better business story for an aggregator anyway.** Mention Issuing in the pitch as the "v2 upgrade once approved" to demonstrate awareness of the agentic-finance roadmap.

---

## 2. Product Spec

### 2.1 Problem
Q-commerce users today reorder the same items dozens of times a month. Reordering means: open Zepto, search, scroll, tap, repeat in Blinkit if Zepto is out of stock, compare prices manually. **There is no voice-first, multi-merchant reorder layer.**

### 2.2 Solution
Voice agent that:
1. Remembers what you usually buy
2. Queries multiple q-commerce platforms in parallel
3. Picks the best option (price / availability / delivery time)
4. Confirms by voice
5. Places the order, charged to your saved card via Stripe

### 2.3 Why people pay (the monetization brief)
Subscription tiers gate **how many voice-led orders per month** and **which voices** you get. Free tier is a marketing funnel; Plus is the conversion target; Pro adds power-user features.

| Tier | Price (₹/mo) | Orders/mo | Voices | Multi-step | Pattern learning |
|---|---|---|---|---|---|
| Free | ₹0 | 3 | Standard | – | – |
| **Plus** | **₹299** | Unlimited | Premium (Eleven Multilingual v2) | ✅ | – |
| Pro | ₹599 | Unlimited | Premium + custom clone | ✅ | ✅ ("my usual Friday") |

Secondary revenue: 2.5% take-rate per transaction via `application_fee_amount` on Connect.

### 2.4 Wedge
- Multi-merchant aggregation (no single q-commerce app does this)
- Hands-free contexts (cooking, driving, parenting, accessibility)
- Indian language / code-mixed support via Eleven Multilingual v2

### 2.5 Killer demo moment
User on Free tier hits 3-order cap → agent voice-prompts upgrade → user says "yes" → agent triggers Stripe subscription against card on file → upgrade confirms via webhook → agent resumes the original order, uninterrupted. **Paying for the agent by talking to the agent.** This is the viral hook for the 90-second video.

---

## 3. Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                       Browser (Next.js client)                       │
│  ┌─────────────────────┐         ┌──────────────────────────────┐    │
│  │ @elevenlabs/react   │ ◄─────► │  IndexedDB (Dexie)           │    │
│  │ useConversation()   │         │  user/usual_items/orders/    │    │
│  │ WebRTC to ConvAI    │         │  consent_logs                │    │
│  └─────────────────────┘         └──────────────────────────────┘    │
│              │                                                       │
└──────────────┼───────────────────────────────────────────────────────┘
               │ (1) signed URL fetch
               │ (2) tool calls → server tools
               ▼
┌──────────────────────────────────────────────────────────────────────┐
│              Next.js API routes (Vercel, Node runtime)               │
│                                                                      │
│  /api/agent/signed-url     /api/agent/tools/search_products          │
│  /api/agent/tools/place_order      /api/agent/tools/upgrade_plan     │
│                                                                      │
│  /api/stripe/checkout      /api/stripe/setup-intent                  │
│  /api/stripe/webhook       /api/stripe/portal                        │
│                                                                      │
│  Env vars only: STRIPE_SECRET_KEY, ELEVENLABS_API_KEY,               │
│                 STRIPE_WEBHOOK_SECRET, AGENT_ID, ...                 │
└──────────────────────────────────────────────────────────────────────┘
               │                              │
               │                              │
               ▼                              ▼
   ┌────────────────────────┐    ┌────────────────────────────────────┐
   │  ElevenLabs ConvAI     │    │  Stripe (test mode)                │
   │  - Agent (Boli)        │    │  - Billing (subscriptions)         │
   │  - Voice (Multi v2)    │    │  - Customer + SetupIntent          │
   │  - Server tools        │    │  - PaymentIntent (off_session)     │
   │  - Knowledge base      │    │  - Connect (mock merchant accts)   │
   └────────────────────────┘    │  - Webhooks                        │
                                 └────────────────────────────────────┘
                                              ▲
                                              │
                                 ┌────────────┴───────────┐
                                 │ Mock merchant catalogs │
                                 │ /data/zepto.json       │
                                 │ /data/blinkit.json     │
                                 │ /data/bigbasket.json   │
                                 └────────────────────────┘
```

---

## 4. Tech Stack

| Layer | Choice | Version | Reason |
|---|---|---|---|
| Framework | Next.js (App Router) | 15.x | API routes hold secrets, single deploy |
| Runtime | Node.js | 20 LTS | Stripe SDK crypto needs node runtime on webhook route |
| UI | React + Tailwind | 18 / 3.x | Standard stack |
| Voice client | `@elevenlabs/react` | latest | `useConversation` hook, WebRTC by default |
| ConvAI orchestration | ElevenLabs Agents | hosted | Dashboard-defined agent, server-side tools |
| Stripe SDK | `stripe` (Node) | latest | API version pinned, see §5 |
| Stripe client | `@stripe/stripe-js` | latest | For Checkout redirect & SetupIntent |
| Client DB | Dexie.js | 4.x | Wraps IndexedDB cleanly |
| Type safety | TypeScript | 5.x | Strict mode |
| Validation | Zod | 3.x | Tool input/output schemas |
| Deployment | Vercel | – | Free tier OK, public HTTPS for webhooks |
| Dev tunnel | Stripe CLI + `ngrok` (or Vercel Preview) | latest | Local webhook testing |

**No database service.** Server-side persistence is intentionally zero. Demo state lives in IndexedDB; Stripe is source of truth for subscription/payment status. For a real product you'd add Postgres; for the hackathon, skip it.

---

## 5. Stripe Setup (Test Mode)

### 5.1 Account prep
1. Create Stripe account (or use existing) → activate **Sandbox** from account picker
2. In Sandbox, enable **Connect** (Settings → Connect → "Get started" → choose Standard or Express)
3. Pin API version in code: `apiVersion: '2025-04-30.basil'` (or latest stable at hackathon time — check Stripe changelog)

### 5.2 Products & Prices (Billing) — create via Stripe MCP or Dashboard
```
Product: Boli Plus
  Price: ₹299 INR / month, recurring
  price_id env: STRIPE_PRICE_PLUS

Product: Boli Pro
  Price: ₹599 INR / month, recurring
  price_id env: STRIPE_PRICE_PRO
```

> **INR note:** Stripe supports INR for Indian accounts. If using a US-account sandbox, switch to USD for the demo (e.g. $3.99 / $7.99). Same flow, different display.

### 5.3 Mock merchant Connect accounts
Create 3 Express accounts in test mode (Dashboard → Connect → Accounts → Create), one per "merchant":
- `acct_zepto_mock` → label "Zepto"
- `acct_blinkit_mock` → label "Blinkit"
- `acct_bigbasket_mock` → label "BigBasket"

Skip the onboarding flow — in test mode you can use the auto-onboarded test data.

Store the account IDs in env vars:
```
STRIPE_CONNECT_ZEPTO=acct_xxx
STRIPE_CONNECT_BLINKIT=acct_xxx
STRIPE_CONNECT_BIGBASKET=acct_xxx
```

### 5.4 Webhook endpoints (Dashboard → Developers → Webhooks)
Single endpoint: `https://<your-vercel-app>.vercel.app/api/stripe/webhook`

Events to listen for:
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `setup_intent.succeeded`

Copy the **whsec_** signing secret → `STRIPE_WEBHOOK_SECRET`.

### 5.5 Test cards
- Success: `4242 4242 4242 4242`
- Requires authentication (3DS test): `4000 0027 6000 3184`
- Decline: `4000 0000 0000 0002`
- India regulation flow: see Stripe India recurring payments docs (not needed for sandbox)

### 5.6 Env vars summary (`.env.local`)
```
# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PLUS=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_CONNECT_ZEPTO=acct_...
STRIPE_CONNECT_BLINKIT=acct_...
STRIPE_CONNECT_BIGBASKET=acct_...

# ElevenLabs
ELEVENLABS_API_KEY=sk_...
ELEVENLABS_AGENT_ID=agent_...
ELEVENLABS_AGENT_ID_PREMIUM=agent_...  # optional: separate agent for premium voice

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 6. ElevenLabs Setup

### 6.1 Agent creation (Dashboard → Conversational AI → Agents → Create)

**Two agents** (one per voice tier — simpler than dynamic voice swapping):

#### Agent A: Boli (Free tier)
- **Name:** Boli — Standard
- **First message:** "Hi, I'm Boli. What would you like to reorder?"
- **System prompt:** see §6.2 below
- **LLM:** `gemini-2.0-flash-001` (default, fast) or `gpt-4o-mini`
- **Temperature:** 0.3 (low, for tool-call reliability)
- **ASR quality:** high
- **Voice:** any standard voice (Eleven Turbo v2)
- **Max duration:** 300 s
- **Language:** `en` (set to `multi` if using Multilingual v2)

#### Agent B: Boli Premium (Plus/Pro tier)
- Same as above except:
- **Voice:** premium voice (e.g., Eleven Multilingual v2 with a richer voice ID)
- **Model ID:** `eleven_multilingual_v2`
- **Language:** `multi` (enables Hindi/code-mixed)

**The client decides which agent_id to use** based on the user's tier read from IndexedDB / Stripe subscription cache.

### 6.2 System prompt (Boli)

```
# Identity
You are Boli, a voice-first reorder concierge for Indian q-commerce.
You help users reorder groceries and essentials by voice, comparing
prices across Zepto, Blinkit, and BigBasket.

# Core behaviors
1. ALWAYS confirm the order details (item, quantity, price, merchant)
   before placing an order. Use exact numbers from the search result.
2. NEVER place an order without explicit user confirmation
   ("yes", "confirm", "go ahead", "place it", or similar).
3. If the user is on the Free tier and out of monthly orders, OFFER
   the upgrade to Plus (₹299/mo, unlimited orders). If they say yes,
   call the upgrade_plan tool and continue with the original order.
4. If a search returns no in-stock matches, suggest alternatives
   (different brand, different merchant, different size).

# Voice style
- Conversational, concise. No long monologues.
- Use natural Indian English. You may understand simple Hindi terms
  (atta, dal, dahi, etc.) and respond in English with the Hindi term
  in context.
- Speak prices as "two hundred twenty rupees" not "₹220".

# Tools you have
- search_products(query, quantity): search all merchants, return best 3
- place_order(merchant_id, product_id, quantity, price_paise): place
  an order via Stripe. Only call after explicit user confirmation.
- upgrade_plan(tier): upgrade the user's subscription. Only call after
  explicit user consent.
- get_user_context(): returns current user, tier, usual items, address.
  Call this at the start of every conversation.

# Critical rules
- This step is important: ALWAYS call get_user_context() FIRST.
- This step is important: NEVER guess product IDs or merchant IDs.
  Use exactly what search_products returns.
- This step is important: Read back the final order summary and wait
  for confirmation before calling place_order.
```

### 6.3 Tools (configured in Dashboard → Agent → Tools)

All four are **Server (Webhook) tools** except `get_user_context` which is a **Client tool** (reads from IndexedDB).

#### Tool 1: `get_user_context` (Client tool)
- **Type:** Client
- **Parameters:** none
- **Description:** "Get the current user's name, tier, usual items, and saved delivery address."
- Registered in React via `useConversation({ clientTools: { get_user_context: () => {...} } })`.

#### Tool 2: `search_products` (Server / Webhook tool)
- **Type:** Webhook
- **Method:** POST
- **URL:** `https://<your-app>/api/agent/tools/search_products`
- **Description:** "Search for a product across all q-commerce merchants. Returns top 3 options sorted by total cost."
- **Parameters:**
  - `query` (string, LLM): the product name or description (e.g. "atta 5kg", "amul milk 1L")
  - `quantity` (integer, LLM, default 1): how many units
- **Auth:** Bearer token (set in agent secret, validated server-side)

#### Tool 3: `place_order` (Server / Webhook tool)
- **Type:** Webhook
- **Method:** POST
- **URL:** `https://<your-app>/api/agent/tools/place_order`
- **Parameters:**
  - `user_id` (string, dynamic from client) — Boli passes this via [conversation overrides](https://elevenlabs.io/docs/conversational-ai/customization/overrides)
  - `merchant_id` (string, LLM): one of `zepto`, `blinkit`, `bigbasket`
  - `product_id` (string, LLM)
  - `quantity` (integer, LLM)
  - `price_paise` (integer, LLM): total in smallest unit
  - `voice_consent_transcript` (string, LLM): the exact user phrase that confirmed

#### Tool 4: `upgrade_plan` (Server / Webhook tool)
- **Type:** Webhook
- **Method:** POST
- **URL:** `https://<your-app>/api/agent/tools/upgrade_plan`
- **Parameters:**
  - `user_id` (string, dynamic)
  - `tier` (string enum: `plus`, `pro`)
  - `voice_consent_transcript` (string, LLM)

### 6.4 Voice ID picks
- **Free tier voice:** any standard Eleven Turbo v2 (e.g., `JBFqnCBsd6RMkjVDRZzb` — George)
- **Premium voice:** Multilingual v2 voice with Indian-accent natural speech (browse voice library; pick one that handles Hindi-English code-mixing well)

### 6.5 Dynamic variables / overrides
Use ElevenLabs **conversation overrides** to inject `user_id` and `tier` at session start, so tools can identify the user without the LLM needing to ask. Pass via `useConversation().startSession({ overrides: { agent: { firstMessage: ..., }, dynamicVariables: { user_id, tier } } })`.

---

## 7. Repository Structure

```
boli/
├── README.md
├── BOLI_MVP.md                    # this file
├── .env.local                     # secrets (gitignored)
├── .env.example                   # template
├── package.json
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
│
├── app/
│   ├── layout.tsx
│   ├── page.tsx                   # marketing landing + sign-in
│   ├── onboarding/
│   │   └── page.tsx               # save card (SetupIntent) + pick tier
│   ├── concierge/
│   │   └── page.tsx               # main voice UI
│   ├── orders/
│   │   └── page.tsx               # order history (from IndexedDB)
│   └── api/
│       ├── agent/
│       │   ├── signed-url/route.ts
│       │   └── tools/
│       │       ├── search_products/route.ts
│       │       ├── place_order/route.ts
│       │       └── upgrade_plan/route.ts
│       └── stripe/
│           ├── checkout/route.ts
│           ├── setup-intent/route.ts
│           ├── portal/route.ts
│           └── webhook/route.ts
│
├── components/
│   ├── VoiceOrb.tsx               # the big animated orb (visual focus)
│   ├── TranscriptStream.tsx       # live transcript display
│   ├── OrderConfirmation.tsx
│   ├── TierBadge.tsx
│   ├── UsualItemsList.tsx
│   └── ui/                        # buttons, cards, dialogs
│
├── lib/
│   ├── stripe.ts                  # Stripe client singleton
│   ├── elevenlabs.ts              # signed URL fetcher
│   ├── db.ts                      # Dexie schema + helpers
│   ├── consent.ts                 # voice consent logging
│   ├── tier.ts                    # tier limits + usage tracking
│   └── merchants.ts               # merchant lookup helpers
│
├── data/
│   ├── zepto.json
│   ├── blinkit.json
│   └── bigbasket.json
│
├── types/
│   ├── stripe-events.ts
│   ├── tools.ts                   # Zod schemas for each tool
│   └── domain.ts                  # User, Order, Product, Merchant
│
└── public/
    └── boli-logo.svg
```

---

## 8. API Routes Specification

### 8.1 `/api/agent/signed-url` (GET)
**Purpose:** Mint a signed URL or conversation token for the ElevenLabs ConvAI WebRTC/WebSocket connection so the browser never sees `ELEVENLABS_API_KEY`.

**Query params:** `tier` (free | plus | pro) — selects which agent_id to use.

**Logic:**
1. Look up agent_id by tier (env var)
2. `GET https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=...` with `xi-api-key` header
3. Return `{ token }`

```ts
export const runtime = 'nodejs';
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const tier = searchParams.get('tier') ?? 'free';
  const agentId =
    tier === 'free'
      ? process.env.ELEVENLABS_AGENT_ID
      : process.env.ELEVENLABS_AGENT_ID_PREMIUM;
  const res = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${agentId}`,
    { headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY! } },
  );
  const { token } = await res.json();
  return Response.json({ token });
}
```

### 8.2 `/api/agent/tools/search_products` (POST)
**Body:** `{ query: string, quantity?: number }`
**Returns:** `{ results: [{ merchant_id, product_id, name, price_paise, in_stock, eta_min }, ...] }` (top 3 by total cost)

**Logic:**
1. Validate bearer token (env: `AGENT_TOOL_SECRET`)
2. Load all three merchant JSONs
3. Fuzzy-match query against product names (use simple lowercase substring or `fuse.js`)
4. Filter to in-stock items
5. Sort by `price_paise * quantity`
6. Return top 3

### 8.3 `/api/agent/tools/place_order` (POST)
**Body:** `{ user_id, merchant_id, product_id, quantity, price_paise, voice_consent_transcript }`

**Logic:**
1. Validate bearer token
2. Validate user has saved payment method (look up Stripe customer)
3. **Voice consent check:** ensure `voice_consent_transcript` contains an affirmative phrase (regex: `/\b(yes|confirm|go ahead|place it|do it|haan)\b/i`). If not → return error.
4. Look up the merchant's Stripe Connect account ID from env
5. Create PaymentIntent:
   ```ts
   const pi = await stripe.paymentIntents.create({
     amount: price_paise,
     currency: 'inr',
     customer: stripeCustomerId,
     payment_method: defaultPaymentMethodId,
     off_session: true,
     confirm: true,
     transfer_data: { destination: merchantConnectAccountId },
     application_fee_amount: Math.floor(price_paise * 0.025), // 2.5% take-rate
     metadata: {
       user_id, merchant_id, product_id, quantity: String(quantity),
       voice_consent_transcript,
       conversation_id: req.headers.get('x-conversation-id') ?? '',
     },
   });
   ```
6. Return `{ status: 'placed', order_id, merchant: 'Zepto', eta_min: 12, confirmation: 'XK91' }` so the agent can voice it back.

**Note:** off-session payments can fail with `authentication_required` for India cards under RBI rules — that's expected in test mode for the 3DS test card. Handle by surfacing a graceful error the agent can voice ("Your card needs authentication — I've sent you a link to confirm.")

### 8.4 `/api/agent/tools/upgrade_plan` (POST)
**Body:** `{ user_id, tier: 'plus' | 'pro', voice_consent_transcript }`

**Logic:**
1. Voice consent check (as above)
2. Look up Stripe customer
3. Look up price_id by tier from env
4. Create subscription:
   ```ts
   const sub = await stripe.subscriptions.create({
     customer: stripeCustomerId,
     items: [{ price: priceId }],
     default_payment_method: defaultPaymentMethodId,
     metadata: { user_id, voice_upgrade: 'true', transcript: voice_consent_transcript },
   });
   ```
5. Return `{ status: 'active', tier, message: 'You are now on Boli Plus.' }`
6. The client will see the upgrade reflected via webhook + IndexedDB sync.

### 8.5 `/api/stripe/setup-intent` (POST)
Creates Stripe Customer (if needed) + SetupIntent to save the user's card. Returns `{ client_secret }`.

### 8.6 `/api/stripe/checkout` (POST)
Optional alternate path: creates a Checkout Session for users who want to sign up to Plus/Pro on the marketing page (not via voice).

### 8.7 `/api/stripe/portal` (POST)
Creates a Billing Portal session. Returns `{ url }` for redirect.

### 8.8 `/api/stripe/webhook` (POST) — **CRITICAL**

```ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = await req.text(); // raw body required
  const sig = req.headers.get('stripe-signature')!;
  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    return new Response('Bad signature', { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed':
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      // For demo, the client polls /api/user/subscription-status
      // Or use Server-Sent Events to push updates to the active session
      break;
    case 'payment_intent.succeeded':
      // Could push a "shipped" simulation after a 5-10s setTimeout
      break;
    case 'payment_intent.payment_failed':
      break;
    case 'setup_intent.succeeded':
      break;
  }
  return new Response('ok');
}
```

**Gotcha:** must use `await req.text()` (NOT `req.json()`) so signature verification works.

---

## 9. Client-side: IndexedDB Schema (Dexie)

```ts
// lib/db.ts
import Dexie, { Table } from 'dexie';

export interface UserRow {
  id: string;                    // local UUID
  name: string;
  email: string;
  stripe_customer_id?: string;
  default_payment_method?: string;
  tier: 'free' | 'plus' | 'pro';
  orders_used_this_month: number;
  month_anchor: string;          // 'YYYY-MM' for resets
  delivery_address: string;
}

export interface UsualItem {
  id: string;
  user_id: string;
  display_name: string;          // "Aashirvaad Atta 5kg"
  preferred_merchant?: string;
  last_ordered_at?: number;
  order_count: number;
}

export interface OrderRow {
  id: string;                    // local UUID
  user_id: string;
  merchant_id: 'zepto' | 'blinkit' | 'bigbasket';
  product_id: string;
  product_name: string;
  quantity: number;
  price_paise: number;
  stripe_payment_intent_id: string;
  status: 'placed' | 'failed' | 'pending';
  created_at: number;
  confirmation_code: string;
}

export interface ConsentLog {
  id: string;                    // UUID
  user_id: string;
  action: 'place_order' | 'upgrade_plan';
  transcript_snippet: string;
  audio_hash?: string;           // sha256 of the audio chunk (optional)
  timestamp: number;
  payload: string;               // JSON of the action
}

class BoliDB extends Dexie {
  users!: Table<UserRow, string>;
  usualItems!: Table<UsualItem, string>;
  orders!: Table<OrderRow, string>;
  consentLogs!: Table<ConsentLog, string>;

  constructor() {
    super('boli');
    this.version(1).stores({
      users: 'id, email',
      usualItems: 'id, user_id, display_name',
      orders: 'id, user_id, created_at',
      consentLogs: 'id, user_id, timestamp',
    });
  }
}

export const db = new BoliDB();
```

---

## 10. Mock Merchant Data

Each JSON file is a flat array of products. Identical schemas across merchants so the search code stays simple.

### 10.1 `/data/zepto.json` (example)
```json
[
  {
    "product_id": "zep_aashirvaad_atta_5kg",
    "name": "Aashirvaad Whole Wheat Atta 5 kg",
    "price_paise": 22000,
    "in_stock": true,
    "eta_min": 12,
    "image": "https://placehold.co/200x200?text=Atta"
  },
  {
    "product_id": "zep_amul_milk_1l",
    "name": "Amul Gold Milk 1 L",
    "price_paise": 6800,
    "in_stock": true,
    "eta_min": 10
  }
]
```

### 10.2 Coverage
At minimum, include 15 products per merchant covering: atta/flour, milk, dal, oil, eggs, bread, sugar, salt, tea, coffee, biscuits, dahi/curd, ghee, basmati rice, paneer. Vary prices across merchants intentionally (Zepto cheaper for some, Blinkit for others, BigBasket out of stock occasionally) so the demo shows real comparison value.

### 10.3 Fuzzy matching
Use `fuse.js` with `keys: ['name']`, threshold ~0.3. Or simple substring match for v0.

---

## 11. Voice Consent & Audit Trail

Every `place_order` and `upgrade_plan` call writes a `ConsentLog` row with:
- The exact transcript snippet containing the affirmative phrase
- Timestamp
- JSON of the action being performed
- (Optional) SHA-256 hash of the audio chunk

For the demo this lives in IndexedDB and is displayed in an "Audit Trail" page. For production you'd POST to a server-side append-only log. **In the video, briefly flash the audit log to underline the trust story.**

---

## 12. Development Phases

Estimated total: 32–40 working hours.

### Phase 1 — Foundation (0–8 h)
- [ ] `pnpm create next-app boli --typescript --tailwind --app`
- [ ] Set up env vars, Stripe account + Connect, ElevenLabs account
- [ ] Create the 3 mock merchant JSONs (15 items each)
- [ ] Implement Dexie schema + onboarding page (collect name/email/address, set up user row)
- [ ] Stripe SetupIntent flow on `/onboarding`
- [ ] Stripe webhook endpoint (raw body parsing, signature verification)
- [ ] Deploy to Vercel, point Stripe webhook at preview URL

### Phase 2 — Voice + Payment Loop (8–20 h)
- [ ] Create ElevenLabs agent in Dashboard (Free tier first)
- [ ] Define system prompt + tool schemas (verify in Dashboard test chat)
- [ ] Build `/api/agent/signed-url`, wire up `@elevenlabs/react`
- [ ] Build `/concierge` page with voice orb UI + transcript stream
- [ ] Implement `get_user_context` client tool (reads IndexedDB)
- [ ] Implement `search_products` server tool (fuzzy match across merchants)
- [ ] Implement `place_order` server tool (PaymentIntent off-session + Connect transfer)
- [ ] Test end-to-end: voice → search → confirm → payment → confirmation voiced back
- [ ] Voice consent logging

### Phase 3 — Subscription Upgrade by Voice (20–28 h)
- [ ] Create premium agent in ElevenLabs Dashboard
- [ ] Stripe Billing: create products + prices
- [ ] Implement `upgrade_plan` server tool
- [ ] Add tier-check logic to `place_order` (Free tier: count orders this month, block at 3)
- [ ] System prompt update: offer upgrade when free limit hit
- [ ] Webhook handling for subscription updates → push to client via SSE or polling
- [ ] On upgrade, swap to premium agent + premium voice for the rest of the session

### Phase 4 — Polish + Demo Video (28–40 h)
- [ ] Visual polish on `/concierge` (animated orb, smooth transcript scroll)
- [ ] Order history page
- [ ] Audit log page (show consent records)
- [ ] Script + record 90-second demo video (§14)
- [ ] Write Devpost submission text
- [ ] Submit

---

## 13. MCP Usage During Development

Both Stripe and ElevenLabs ship MCP servers that let Claude Code call their APIs directly during development.

### 13.1 Stripe MCP
- **Hosted:** `https://mcp.stripe.com` (OAuth)
- **Local:** `npx -y @stripe/mcp --tools=all --api-key=sk_test_...`
- **Use it for:** creating products + prices, listing customers/subscriptions during dev, searching docs ("how do I add `application_fee_amount`?"), inspecting webhook events, creating test PaymentIntents.
- **Setup in Claude Code:** add to MCP config. Use a **Restricted API Key** (rk_*) with only the permissions you need (products.write, prices.write, customers.read, etc.).

### 13.2 ElevenLabs MCP
- Multiple community implementations; `@elevenlabs/agents-mcp` or community equivalents allow create/update/delete of agents, tools, knowledge base via Claude Code.
- **Use it for:** scripting agent creation so it's reproducible from a config file (no Dashboard drift), bulk-updating tool schemas, importing knowledge-base docs.
- **Alternative:** the `elevenlabs` CLI (`npm i -g @elevenlabs/agents-cli`) gives `elevenlabs agents push/pull` for version-controlled agent configs. Treat this as preferred if MCP setup is fiddly.

### 13.3 Recommended dev workflow
1. Use Stripe MCP for products/prices setup (1 command vs Dashboard clicking)
2. Use ElevenLabs CLI (`elevenlabs agents init/push`) for agent config — checkin a `agents/boli.yaml` so the agent is reproducible
3. Use Stripe CLI (`stripe listen --forward-to localhost:3000/api/stripe/webhook`) for local webhook testing
4. Use Claude Code with both MCPs available so it can self-serve when scaffolding

---

## 14. Demo Video Script (90 seconds, viral-style)

**Goal:** make a judge stop scrolling. The hook is the voice upgrade moment.

```
[0:00–0:05]  Hard cut. Phone on counter, hands kneading dough.
             VOICE-OVER: "I cook every day. I never want to open
             an app again."

[0:05–0:15]  Tap the screen → big animated orb pulses.
             USER: "Boli, reorder atta and milk."
             BOLI:  "Zepto has atta at two hundred twenty, Blinkit
                     at one ninety-five. Going with Blinkit. Plus
                     Amul milk from Zepto, eighty rupees. Total
                     two seventy-five. Confirm?"
             USER: "Confirm."
             [orb pulses different color, payment animation]
             BOLI:  "Done. Delivered in twelve minutes."

[0:15–0:25]  Day 2-3 montage: more orders, different products,
             agent voice quietly handling everything.

[0:25–0:40]  THE HOOK MOMENT.
             USER: "Boli, reorder dal."
             BOLI:  "You've used your three free orders this month.
                     For two ninety-nine I can unlock unlimited
                     orders and a better voice. Want to upgrade?"
             USER: "Yes."
             BOLI:  [voice subtly shifts to premium voice]
                     "Upgraded. Now — Toor dal, BigBasket has it
                     at one twenty. Confirm?"
             USER: "Yes."
             BOLI:  "Done."

[0:40–0:55]  Pull back: Stripe dashboard split-screen showing
             real PaymentIntents firing. Audit log scrolling.
             VOICE-OVER: "Every order voice-confirmed. Every
             payment Stripe Connect. Every consent logged."

[0:55–1:25]  Quick pitch overlay:
             "Boli. Voice-first reorder.
              Multi-merchant. Built on Stripe + ElevenLabs.
              ₹299/mo. Try it: boli.app"
             [end card]
```

**Production notes:**
- Real screen recording, no fake UI. Stripe Dashboard split-screen is the credibility shot.
- Use Eleven Studio to generate a voiceover for the narration (eat your own dog food).
- The voice-shift on upgrade is the most viral moment — make sure the premium voice is noticeably different.
- Subtitle everything (people watch on mute).
- Submit at exactly 9:16 vertical if posting to social; landscape 16:9 for Devpost.

---

## 15. Out of Scope for Hackathon

- Real merchant APIs (Zepto/Blinkit/BigBasket partner integrations)
- Real fulfillment / delivery tracking
- Auth/SSO (Clerk, NextAuth) — local-only user for demo
- Server-side persistence (no Postgres)
- Mobile apps
- Hindi/Marathi UI (English UI with voice multilingual is enough)
- Stripe Issuing (waiting on country eligibility — note as v2)
- Refunds, returns, customer service flows
- Order modification mid-flow
- Analytics, PostHog

---

## 16. Stretch Goals (if ahead of schedule)

- **Pattern learning ("my usual Friday"):** Pro tier; agent learns recurring orders from history and proactively suggests them.
- **Code-mixed Hindi:** prompt + multilingual v2; test with phrases like "Boli, do litre doodh mangwao."
- **Outbound voice call:** when an order is delayed, Boli calls the user. Uses ElevenLabs telephony.
- **Family wallet:** one subscription, multiple users, shared spend limit.
- **Real merchant integration:** sign up for one merchant's partner API (BigBasket has been more open historically) to make at least one branch real.

---

## 17. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| ElevenLabs tool call latency makes voice feel slow | Use `gemini-2.0-flash-001`; keep system prompt tight; pre-warm signed URL on page load |
| Off-session PaymentIntent fails 3DS for India test card | Use 4242 card for demo; handle `requires_action` gracefully |
| User in Free tier has no saved card → upgrade fails | Force SetupIntent during onboarding before voice access enabled |
| Webhook signature failures from Next.js JSON parsing | Force `req.text()` + `runtime: 'nodejs'` on webhook route — verify locally with `stripe listen` |
| Mock merchants feel fake in demo | Use realistic Indian product names, realistic price variance, realistic ETAs (8–15 min) |
| Agent picks wrong product from fuzzy match | Tighten Fuse threshold (0.25); have agent read back name before confirming |
| Subscription upgrade fires twice (idempotency) | Use Stripe `Idempotency-Key` header; check existing subscription before creating |
| Voice consent regex too loose (false positives) | Keep regex narrow; require both an affirmative word AND recent context of the proposal |

---

## 18. Reference Links

### Stripe
- Sandboxes: https://docs.stripe.com/sandboxes
- Connect testing: https://docs.stripe.com/connect/testing
- PaymentIntents off-session: https://docs.stripe.com/payments/save-and-reuse
- Application fees: https://docs.stripe.com/connect/destination-charges#collecting-fees
- Stripe MCP: https://docs.stripe.com/mcp
- Agent Toolkit: https://github.com/stripe/agent-toolkit
- India recurring: https://docs.stripe.com/india-recurring-payments
- Webhook signature verification: https://docs.stripe.com/webhooks/signatures

### ElevenLabs
- Agents overview: https://elevenlabs.io/docs/eleven-agents/overview
- Next.js guide: https://elevenlabs.io/docs/eleven-agents/guides/quickstarts/next-js
- React SDK: https://elevenlabs.io/docs/conversational-ai/libraries/react
- Server tools: https://elevenlabs.io/docs/agents-platform/customization/tools/server-tools
- Client tools: https://elevenlabs.io/docs/conversational-ai/customization/tools/client-tools
- Conversation overrides (dynamic vars): https://elevenlabs.io/docs/conversational-ai/customization/overrides
- Prompting guide: https://elevenlabs.io/docs/conversational-ai/best-practices/prompting-guide
- CLI: https://elevenlabs.io/docs/agents-platform/operate/cli
- llms.txt index: https://elevenlabs.io/docs/llms-full.txt

### Hackathon
- ElevenHacks #8: https://hacks.elevenlabs.io/hackathons/8
- ElevenHacks season: https://hacks.elevenlabs.io/

---

## 19. Submission Checklist

- [ ] Live deployment URL (Vercel)
- [ ] GitHub repo (public) with clear README
- [ ] 90-second demo video uploaded (YouTube unlisted or direct)
- [ ] Devpost description: problem → solution → Stripe + ElevenLabs usage → monetization
- [ ] Mention Stripe surface used (Billing, PaymentIntents, Connect, Webhooks)
- [ ] Mention ElevenLabs surface used (Agents, server tools, client tools, premium voice swap)
- [ ] Social posts on X/LinkedIn (+50 pts each per ElevenHacks rules)
- [ ] Add Boli to the ElevenHacks gallery

---

**End of spec.** Hand this to Claude Code with: *"Read BOLI_MVP.md and execute Phase 1."*
