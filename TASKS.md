# Boli - Voice-First Reorder Concierge: Task Tracker

**Project:** Boli MVP for ElevenHacks #8 (Stripe × ElevenLabs)  
**Timeline:** 32-40 working hours  
**Target:** Live demo with viral 90-second video

---

## 🎯 Project Overview

Build a voice-first concierge that handles repeat grocery orders by talking. Users say *"reorder my usual atta"* → agent queries 3 q-commerce backends → picks cheapest → confirms by voice → places order via Stripe Connect.

**Killer Feature:** Upgrade subscription mid-conversation by voice when hitting free tier limits.

---

## 📋 Phase 1: Foundation (0-8 hours)

### 🏗️ Project Setup
- [ ] `pnpm create next-app boli --typescript --tailwind --app`
- [ ] Configure TypeScript strict mode
- [ ] Set up Tailwind CSS with custom theme
- [ ] Create basic folder structure (app/, components/, lib/, types/, data/)
- [ ] Set up ESLint and Prettier
- [ ] Create `.env.example` with all required environment variables

### 🔐 Environment & Accounts Setup
- [ ] Create Stripe account → enable Sandbox mode
- [ ] Enable Stripe Connect in Sandbox
- [ ] ✅ ElevenLabs account created (API key configured in MCP)
- [ ] Set up Vercel account for deployment
- [ ] Configure all environment variables in `.env.local`
- [ ] Pin Stripe API version: `2025-04-30.basil`

### 💳 Stripe Configuration (via Stripe MCP)
- [ ] Create Connect accounts (3 mock merchants) — use `search_stripe_resources` to verify:
  - [ ] `acct_zepto_mock` → "Zepto"
  - [ ] `acct_blinkit_mock` → "Blinkit" 
  - [ ] `acct_bigbasket_mock` → "BigBasket"
- [ ] Create Billing products and prices via MCP:
  - [ ] `create_product` → "Boli Plus" and "Boli Pro"
  - [ ] `create_price` → ₹299/month (Boli Plus) → `STRIPE_PRICE_PLUS`
  - [ ] `create_price` → ₹599/month (Boli Pro) → `STRIPE_PRICE_PRO`
  - [ ] `list_products` / `list_prices` to verify creation
- [ ] Set up webhook endpoint: `/api/stripe/webhook`
- [ ] Configure webhook events:
  - [ ] `checkout.session.completed`
  - [ ] `customer.subscription.*`
  - [ ] `payment_intent.*`
  - [ ] `setup_intent.succeeded`
- [ ] Copy webhook signing secret → `STRIPE_WEBHOOK_SECRET`

### 🛒 Mock Merchant Data
- [ ] Create `/data/zepto.json` (15+ products)
- [ ] Create `/data/blinkit.json` (15+ products) 
- [ ] Create `/data/bigbasket.json` (15+ products)
- [ ] Include essential items: atta, milk, dal, oil, eggs, bread, sugar, salt, tea, coffee, biscuits, dahi, ghee, rice, paneer
- [ ] Vary prices across merchants for realistic comparison
- [ ] Set realistic ETAs (8-15 minutes)
- [ ] Add occasional out-of-stock items

### 🗄️ Database Schema (IndexedDB + Dexie)
- [ ] Install Dexie.js: `pnpm add dexie`
- [ ] Create `lib/db.ts` with schema:
  - [ ] `users` table (id, name, email, tier, orders_used, etc.)
  - [ ] `usualItems` table (user preferences)
  - [ ] `orders` table (order history)
  - [ ] `consentLogs` table (voice consent audit trail)
- [ ] Add TypeScript interfaces for all tables
- [ ] Create database helper functions

### 🎯 Core Pages & Components
- [ ] Create marketing landing page (`app/page.tsx`)
- [ ] Build onboarding flow (`app/onboarding/page.tsx`):
  - [ ] User info collection (name, email, address)
  - [ ] Stripe SetupIntent integration for card saving
  - [ ] Tier selection UI
- [ ] Create basic layout with navigation
- [ ] Build reusable UI components in `components/ui/`

### 💳 Stripe Integration (use Stripe MCP for verification)
- [ ] Install Stripe SDK: `pnpm add stripe @stripe/stripe-js`
- [ ] Create `lib/stripe.ts` (server-side client)
- [ ] Implement `/api/stripe/setup-intent` route
- [ ] Implement `/api/stripe/webhook` route with signature verification
- [ ] Test SetupIntent flow end-to-end
- [ ] Verify webhook events via Stripe MCP `list_payment_intents` / `list_customers`

### 🚀 Deployment & Testing
- [ ] Deploy to Vercel (preview branch)
- [ ] Update Stripe webhook endpoint to Vercel URL
- [ ] Test webhook delivery
- [ ] Verify all environment variables work in production
- [ ] Test onboarding flow live

**Phase 1 Complete:** ✅ Foundation ready for voice integration

---

## 🎤 Phase 2: Voice + Payment Loop (8-20 hours)

### 🤖 ElevenLabs Agent Setup (via Agents Skill + MCP)
- [ ] Install ElevenLabs CLI: `npm install -g @elevenlabs/cli`
- [ ] Authenticate: `elevenlabs auth login`
- [ ] Initialize project: `elevenlabs agents init`
- [ ] Create Agent A (Free tier) via SDK/CLI:
  - [ ] Name: "Boli — Standard"
  - [ ] Voice: `eleven_turbo_v2` / voice_id `JBFqnCBsd6RMkjVDRZzb` (George)
  - [ ] LLM: `gemini-2.0-flash` (per skill model catalog)
  - [ ] Temperature: 0.3
  - [ ] Max duration: 300s
  - [ ] Turn eagerness: `normal`
- [ ] Create Agent B (Premium tier):
  - [ ] Voice: `eleven_multilingual_v2` / premium voice_id
  - [ ] Language: `multi`
  - [ ] Turn eagerness: `patient`
- [ ] Configure system prompt using skill's recommended structure:
  ```
  # Personality — Boli, friendly Indian grocery concierge
  # Environment — voice-first reorder for q-commerce
  # Tone — warm, efficient, Hindi-English code-mix friendly
  # Goal — find cheapest item, confirm, place order
  ```
- [ ] Add guardrails via `platform_settings.guardrails`:
  - [ ] `focus` + `prompt_injection` enabled
  - [ ] Custom: "No medical/legal advice"
- [ ] Push agents: `elevenlabs agents push`

### 🔧 ElevenLabs Tools Configuration (per Agents Skill — client-tools ref)
- [ ] Tool 1: `get_user_context` (Client tool — runs in browser)
  - [ ] Define in agent config: `{"type": "client", "name": "get_user_context", ...}`
  - [ ] Implement via `clientTools` in React conversation session:
    ```js
    clientTools: { get_user_context: async () => ({ userId, tier, ordersUsed }) }
    ```
- [ ] Tool 2: `search_products` (Webhook tool — server-side)
  - [ ] Create `/api/agent/tools/search_products/route.ts`
  - [ ] Define in agent config: `{"type": "webhook", "name": "search_products", "api_schema": {...}}`
  - [ ] Implement fuzzy search across merchant JSONs (Fuse.js)
  - [ ] Return top 3 results by price
- [ ] Tool 3: `place_order` (Webhook tool — server-side)
  - [ ] Create `/api/agent/tools/place_order/route.ts`
  - [ ] Define in agent config with `request_body_schema` for item, merchant, consent
  - [ ] Implement Stripe PaymentIntent with Connect (verify via Stripe MCP)
  - [ ] Add voice consent validation
  - [ ] Include 2.5% application fee
- [ ] Tool 4: `upgrade_plan` (Webhook tool — server-side)
  - [ ] Create `/api/agent/tools/upgrade_plan/route.ts`
  - [ ] Define in agent config with `request_body_schema` for plan, consent
  - [ ] Implement subscription creation (verify via Stripe MCP)
  - [ ] Add voice consent validation
- [ ] Add built-in tool: `end_call` (enabled by default per skill)
- [ ] Push tool configs: `elevenlabs agents push`

### 🎙️ Voice Client Integration (per Agents Skill — React hooks)
- [ ] Install ElevenLabs React SDK: `pnpm add @elevenlabs/react @elevenlabs/client`
- [ ] ⚠️ Pin LiveKit (per skill): add `"overrides": {"livekit-client": "2.16.1"}` to package.json
- [ ] Create `/api/agent/signed-url/route.ts` (use `get_signed_url` from skill)
- [ ] Build voice concierge page (`app/concierge/page.tsx`):
  - [ ] Wrap in `<ConversationProvider>` (per skill pattern)
  - [ ] Use granular hooks: `useConversationControls` + `useConversationStatus`
  - [ ] Pass `clientTools` with `get_user_context` implementation
  - [ ] Create animated VoiceOrb component
  - [ ] Add transcript stream via `onMessage` / `onUserTranscript` callbacks
- [ ] Implement agent selection logic based on user tier (different agent_id)
- [ ] Start session with `startSession({ signedUrl })` pattern from skill

### 🔍 Product Search Implementation
- [ ] Install fuzzy search library: `pnpm add fuse.js`
- [ ] Implement search algorithm in `search_products` route
- [ ] Test search with various queries (atta, milk, dal, etc.)
- [ ] Handle out-of-stock scenarios
- [ ] Optimize for speed (agent latency matters)

### 💳 Payment Flow Implementation (via Stripe MCP for verification)
- [ ] Complete `place_order` tool implementation:
  - [ ] Validate user has saved payment method
  - [ ] Check voice consent transcript
  - [ ] Create Stripe PaymentIntent with Connect transfer
  - [ ] Handle success/failure scenarios
  - [ ] Return order confirmation details
- [ ] Test payment flow with Stripe test cards:
  - [ ] Success: `4242 4242 4242 4242`
  - [ ] 3DS: `4000 0027 6000 3184`
  - [ ] Decline: `4000 0000 0000 0002`
- [ ] Verify payments via Stripe MCP `list_payment_intents`

### 🎯 End-to-End Testing
- [ ] Test complete flow: voice → search → confirm → payment
- [ ] Verify voice consent logging works
- [ ] Test error scenarios (card declined, out of stock)
- [ ] Validate agent reads back order details correctly
- [ ] Test with different user tiers

### 📊 Client-Side Features
- [ ] Implement order history page (`app/orders/page.tsx`)
- [ ] Create consent audit trail display
- [ ] Add tier badge component
- [ ] Build usual items list component
- [ ] Implement order confirmation UI

**Phase 2 Complete:** ✅ Voice ordering fully functional

---

## 💰 Phase 3: Subscription Upgrade by Voice (20-28 hours)

### 🔄 Tier Management System
- [ ] Implement tier limits in `place_order` tool:
  - [ ] Free tier: max 3 orders/month
  - [ ] Plus/Pro: unlimited orders
  - [ ] Monthly reset logic
- [ ] Create `lib/tier.ts` for tier management
- [ ] Add usage tracking in IndexedDB
- [ ] Implement tier validation middleware

### 🎙️ Premium Voice Integration (per TTS Skill + Agents Skill)
- [ ] Create premium agent with `eleven_multilingual_v2` model + premium voice_id
- [ ] Implement voice switching logic:
  - [ ] Detect upgrade during conversation
  - [ ] End current session, start new session with premium agent_id
  - [ ] Maintain conversation context via `get_user_context` client tool
- [ ] Test voice quality difference (use TTS Skill `text_to_speech.convert` to preview voices)
- [ ] Configure voice settings per TTS Skill: `stability: 0.5, similarity_boost: 0.75`

### 💳 Subscription Upgrade Flow (via Stripe MCP)
- [ ] Complete `upgrade_plan` tool implementation:
  - [ ] Validate voice consent
  - [ ] Create Stripe subscription (verify with MCP `list_subscriptions`)
  - [ ] Handle subscription metadata
  - [ ] Return upgrade confirmation
- [ ] Update system prompt to offer upgrades at limit
- [ ] Test upgrade flow end-to-end (use MCP `list_customers` / `list_subscriptions` to verify)

### 🔄 Real-time Updates
- [ ] Implement webhook handling for subscription events:
  - [ ] `customer.subscription.created`
  - [ ] `customer.subscription.updated`
  - [ ] `customer.subscription.deleted`
- [ ] Add Server-Sent Events or polling for live updates
- [ ] Update UI when tier changes
- [ ] Sync subscription status to IndexedDB

### 🎯 Upgrade Experience Polish
- [ ] Add smooth transition between agents
- [ ] Implement upgrade confirmation animation
- [ ] Add tier benefits display
- [ ] Test upgrade mid-conversation multiple times
- [ ] Handle edge cases (upgrade fails, payment issues)

**Phase 3 Complete:** ✅ Voice upgrade moment working

---

## ✨ Phase 4: Polish + Demo Video (28-40 hours)

### 🎨 UI/UX Polish
- [ ] Animate VoiceOrb with different states
- [ ] Add smooth transcript scrolling
- [ ] Implement loading states and micro-interactions
- [ ] Add sound effects for confirmations
- [ ] Create responsive design for mobile
- [ ] Add dark mode support
- [ ] Polish onboarding flow with progress indicators

### 📊 Additional Features
- [ ] Build comprehensive order history page
- [ ] Create detailed audit log viewer
- [ ] Add order status tracking simulation
- [ ] Implement user profile management
- [ ] Add help/FAQ section
- [ ] Create settings page for preferences

### 🎥 Demo Video Production
- [ ] Script 90-second demo video (see BOLI_MVP.md §14)
- [ ] Record screen captures of real app usage
- [ ] Film live interaction sequences
- [ ] Record Stripe dashboard split-screen
- [ ] Generate voiceover using TTS Skill (`eleven_multilingual_v2`, voice: Charlotte `XB0fDUnXU5powFXDhCwa`)
- [ ] Include subtitles for accessibility (use STT Skill `scribe_v2` to auto-generate)
- [ ] Edit for viral potential (hook at 0:25)
- [ ] Export in both 9:16 (social) and 16:9 (Devpost)

### 📝 Documentation & Submission
- [ ] Write comprehensive README.md
- [ ] Create project description for Devpost
- [ ] Prepare GitHub repo with clean commits
- [ ] Add deployment URL
- [ ] Upload demo video to YouTube (unlisted)
- [ ] Submit to ElevenHacks #8
- [ ] Post on X/LinkedIn for bonus points

### 🚀 Final Testing
- [ ] Complete end-to-end testing of all flows
- [ ] Test with different browsers and devices
- [ ] Verify all Stripe webhook events work (use MCP `list_payment_intents` / `list_subscriptions`)
- [ ] Test ElevenLabs agent reliability
- [ ] Performance optimization
- [ ] Error handling review
- [ ] Security audit (no exposed secrets)

**Phase 4 Complete:** ✅ Production-ready demo

---

## 🎯 Success Criteria

### Must-Have for Hackathon
- [ ] Voice-first ordering works end-to-end
- [ ] Multi-merchant price comparison functional
- [ ] Stripe subscription upgrade by voice (the killer moment)
- [ ] 90-second demo video uploaded
- [ ] Live deployment accessible
- [ ] Uses ≥3 Stripe products
- [ ] Uses ElevenLabs Agents with tools

### Nice-to-Have (Stretch Goals)
- [ ] Hindi/code-mixed voice support
- [ ] Pattern learning for Pro tier
- [ ] Real merchant API integration
- [ ] Mobile app version
- [ ] Advanced analytics

---

## 🛠️ Development Tools & Commands

### Useful Scripts
```bash
# Development
pnpm dev                 # Start development server
pnpm build              # Build for production
pnpm lint               # Run ESLint
pnpm type-check         # TypeScript validation

# Stripe (via MCP — no CLI needed)
# Use Stripe MCP tools directly in Claude:
#   create_product, create_price, list_customers,
#   list_payment_intents, list_subscriptions, retrieve_balance,
#   search_stripe_resources, fetch_stripe_resources

# Stripe CLI (only for webhook forwarding)
stripe listen --forward-to localhost:3000/api/stripe/webhook

# ElevenLabs CLI (per Agents Skill)
elevenlabs auth login
elevenlabs agents init
elevenlabs agents list
elevenlabs agents push              # Push local config to platform
elevenlabs agents push --dry-run    # Preview changes
elevenlabs agents pull              # Pull from platform
elevenlabs tools add-webhook "search_products"
elevenlabs tools add-client "get_user_context"

# ElevenLabs MCP (for quick operations in Claude)
# text_to_speech, create_agent, voice_clone, transcribe
```

### ElevenLabs Skills Available (Kiro CLI)
```
.agents/skills/agents/          — Agent creation, tools, workflows, guardrails
.agents/skills/text-to-speech/  — TTS with models, voices, streaming
.agents/skills/speech-to-text/  — Transcription with Scribe v2, real-time STT
.agents/skills/sound-effects/   — Sound effect generation
.agents/skills/voice-isolator/  — Audio isolation
.agents/skills/voice-changer/   — Voice conversion
.agents/skills/music/           — Music generation
.agents/skills/speech-engine/   — Low-level speech engine access
```

### Environment Variables Checklist
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
ELEVENLABS_AGENT_ID_PREMIUM=agent_...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
AGENT_TOOL_SECRET=your-secret-here
```

---

## 📊 Progress Tracking

### Current Status
- **Phase 1**: ⏳ Not Started
- **Phase 2**: ⏳ Not Started  
- **Phase 3**: ⏳ Not Started
- **Phase 4**: ⏳ Not Started

### Hours Logged
- **Total Spent**: 0 hours
- **Estimated Remaining**: 32-40 hours

### Blockers & Issues
- *None identified yet*

---

## 🎁 Quick Reference

### Key Files to Implement
- `app/api/agent/tools/search_products/route.ts` - Product search
- `app/api/agent/tools/place_order/route.ts` - Payment processing  
- `app/api/agent/tools/upgrade_plan/route.ts` - Subscription upgrade
- `app/concierge/page.tsx` - Main voice interface
- `lib/db.ts` - IndexedDB schema
- `components/VoiceOrb.tsx` - Voice interaction UI

### Critical Integration Points
1. **ElevenLabs Tools**: Webhook URLs must be HTTPS (per Agents Skill)
2. **LiveKit Pin**: Add `"overrides": {"livekit-client": "2.16.1"}` to avoid WebRTC handshake failures (per Agents Skill)
3. **Stripe Webhooks**: Require `runtime: 'nodejs'` and raw body parsing
4. **Voice Consent**: Regex validation for affirmative phrases
5. **Agent Switching**: End session → new `startSession({ signedUrl })` with premium agent_id
6. **Client Tools**: Defined in `clientTools` object passed to conversation session (per Agents Skill)
7. **React Pattern**: Use `ConversationProvider` + `useConversationControls` + `useConversationStatus`

### Demo Script Highlights
- **0:00-0:05**: Hook - "I never want to open an app again"
- **0:25-0:40**: Killer moment - voice upgrade mid-conversation  
- **0:40-0:55**: Credibility - Stripe dashboard split-screen
- **0:55-1:25**: Pitch overlay with call-to-action

---

**Last Updated**: 2025-01-21  
**Next Milestone**: Complete Phase 1 Foundation