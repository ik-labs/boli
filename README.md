# Boli — Voice-First Grocery Reorder Concierge

> **ElevenHacks #8 (Stripe × ElevenLabs)**  
> Say *"reorder my usual atta"* → Boli finds the cheapest option across 3 merchants → confirms by voice → places the order via Stripe.

🎙️ **Live Demo:** [Coming soon]  
🎥 **Demo Video:** [Coming soon]

---

## What is Boli?

Boli is a voice-first concierge that handles repeat grocery orders by talking. No typing, no scrolling through apps — just speak and it's done.

**The killer moment:** When you hit your free tier limit, Boli offers an upgrade *mid-conversation*. Say "yes" and you're instantly on a premium plan with a better voice — all without leaving the conversation.

## How It Works

```
User: "Reorder my usual atta"
Boli: "I found Aashirvaad Atta across 3 merchants:
       BigBasket ₹275, Zepto ₹285, Blinkit ₹295.
       BigBasket has the best price with 15-min delivery.
       Shall I place the order?"
User: "Yes, go ahead"
Boli: "Done! ₹275 charged. Arriving in 15 minutes."
```

## Features

| Feature | Description |
|---------|-------------|
| 🎙️ Voice-First | Order by talking — ElevenLabs Conversational AI |
| 💰 Price Comparison | Compares Zepto, Blinkit & BigBasket in real-time |
| ⚡ Instant Checkout | Stripe Connect with saved cards, off-session payments |
| 🔄 Voice Upgrade | Upgrade subscription mid-conversation by saying "yes" |
| 🎭 Premium Voice | Plus/Pro tiers get multilingual premium voice |
| 📊 Usage Limits | Free tier: 3 orders/month, then upgrade prompt |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, Tailwind CSS 4 |
| Voice AI | ElevenLabs Conversational AI (Agents + React SDK) |
| Payments | Stripe Connect, Subscriptions, SetupIntents |
| Database | Dexie.js (IndexedDB) — client-side, zero backend |
| Search | Fuse.js fuzzy matching across merchant catalogs |
| Deploy | Vercel |

## Stripe Products Used (≥3 ✅)

1. **Stripe Connect** — Multi-merchant payments with application fees (2.5%)
2. **Stripe Subscriptions** — Boli Plus (₹299/mo) and Pro (₹599/mo) plans
3. **SetupIntents** — Save cards during onboarding for off-session payments
4. **PaymentIntents** — Confirm orders with saved payment methods
5. **Webhooks** — Real-time subscription status sync

## ElevenLabs Features Used

1. **Conversational AI Agents** — Two agents (standard + premium voice)
2. **Webhook Tools** — `search_products`, `place_order`, `upgrade_plan`
3. **Client Tools** — `get_user_context` (runs in browser)
4. **React SDK** — `ConversationProvider`, `useConversationControls`, `useConversationStatus`
5. **Premium Voices** — Eleven Multilingual v2 for paid tiers

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   Browser                        │
│  ┌───────────┐  ┌──────────┐  ┌─────────────┐  │
│  │ VoiceOrb  │  │ Dexie DB │  │ Client Tool │  │
│  │ (React)   │  │ (IDB)    │  │ get_context │  │
│  └─────┬─────┘  └──────────┘  └──────┬──────┘  │
│        │                              │         │
└────────┼──────────────────────────────┼─────────┘
         │ WebSocket                    │
         ▼                              ▼
┌─────────────────┐          ┌──────────────────┐
│  ElevenLabs     │──tools──▶│  Next.js API     │
│  Agent          │          │  /api/agent/tools │
│  (Gemini Flash) │          │                  │
└─────────────────┘          └────────┬─────────┘
                                      │
                              ┌───────▼────────┐
                              │  Stripe API    │
                              │  Connect +     │
                              │  Subscriptions │
                              └────────────────┘
```

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- Stripe account (Sandbox mode)
- ElevenLabs account with API key

### Setup

```bash
# Clone and install
git clone https://github.com/YOUR_USERNAME/boli.git
cd boli
pnpm install

# Configure environment
cp .env.example .env.local
# Fill in your Stripe and ElevenLabs keys

# Run development server
pnpm dev
```

### Environment Variables

See `.env.example` for all required variables:
- `STRIPE_SECRET_KEY` — Stripe sandbox secret key
- `ELEVENLABS_API_KEY` — ElevenLabs API key
- `ELEVENLABS_AGENT_ID` — Standard agent ID
- `ELEVENLABS_AGENT_ID_PREMIUM` — Premium agent ID

### ElevenLabs Agent Setup

Create two agents in the ElevenLabs dashboard:

**Agent A (Standard):**
- Voice: Eleven Turbo v2
- LLM: Gemini 2.0 Flash
- Tools: `search_products`, `place_order`, `upgrade_plan`, `get_user_context`

**Agent B (Premium):**
- Voice: Eleven Multilingual v2
- Same tools as Agent A

Configure webhook tool URLs to point to your deployed app:
- `https://your-app.vercel.app/api/agent/tools/search_products`
- `https://your-app.vercel.app/api/agent/tools/place_order`
- `https://your-app.vercel.app/api/agent/tools/upgrade_plan`

## Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Landing page
│   ├── onboarding/page.tsx         # User setup + tier selection
│   ├── concierge/page.tsx          # Main voice interface
│   ├── orders/page.tsx             # Order history
│   └── api/
│       ├── agent/
│       │   ├── signed-url/         # Get ElevenLabs signed URL
│       │   └── tools/
│       │       ├── search_products # Fuzzy search across merchants
│       │       ├── place_order     # Stripe Connect payment
│       │       └── upgrade_plan    # Subscription creation
│       └── stripe/
│           ├── setup-intent/       # Save card
│           └── webhook/            # Subscription sync
├── components/
│   └── VoiceOrb.tsx               # Animated voice button
├── lib/
│   ├── db.ts                      # Dexie IndexedDB schema
│   ├── stripe.ts                  # Stripe server client
│   └── tier.ts                    # Tier limits + usage tracking
├── types/
│   └── index.ts                   # TypeScript interfaces
└── data/
    ├── zepto.json                 # 17 products
    ├── blinkit.json               # 17 products
    └── bigbasket.json             # 17 products
```

## The Upgrade Moment (Demo Highlight)

1. User places 3 orders on free tier
2. On 4th attempt, `place_order` returns `error: "limit_reached"`
3. Agent says: *"You've used all 3 free orders. Upgrade to Plus for ₹299/month?"*
4. User says: *"Yes, upgrade me"*
5. Agent calls `upgrade_plan` → Stripe subscription created
6. Client detects tier change → reconnects with premium agent
7. User hears the premium voice: *"Welcome to Boli Plus! Your order is now placed."*

## License

MIT

---

Built for [ElevenHacks #8](https://elevenlabs.io/hackathon) 🚀
