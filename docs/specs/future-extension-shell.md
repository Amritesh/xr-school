# Future Extension Shell

This document captures domains that are architecturally acknowledged but intentionally not implemented in MVP. Data models exist in TypeSpec as frozen shells.

## Rule

> If a domain is listed here, it must not receive deep implementation, routing logic, or UI screens until explicitly moved to active scope. A PR that implements a frozen shell domain without a scope decision is a scope violation.

---

## CRM and Lead Management

**Purpose:** Track school prospects from first contact through sale.

**Why frozen:** The first implementation priority is simulation quality and curriculum coverage, not sales tooling. Sales happen manually and through relationship in North East India.

**Shell models in TypeSpec:** `CRMLead`

**Future triggers:** When school volume exceeds manual tracking capacity or when a sales team is hired.

**Future fields to add:**
- Lead source (event, referral, inbound)
- Contact person details
- Follow-up log
- Engagement history
- Decision timeline
- School budget signals
- Competition awareness

---

## Proposals and Pricing

**Purpose:** Generate and track customized proposals for schools.

**Why frozen:** Pricing is currently manual (₹4–8L setup + ₹250/student/month). No need for a proposal engine at scale 1–20 schools.

**Shell models in TypeSpec:** `Proposal`

**Future triggers:** When sales volume or custom pricing complexity justifies automation.

**Future fields to add:**
- Detailed cost breakdown
- Hardware kit pricing
- Installation and training cost
- Multi-year commitment discounts
- State-board add-on pricing
- Proposal PDF generation

---

## Billing and Payments

**Purpose:** Track school subscriptions, invoice generation, payment collection.

**Why frozen:** No payment gateway in MVP. Billing is manual via bank transfer.

**Shell models in TypeSpec:** `BillingPlan`

**Future triggers:** When recurring billing needs automation or when a payment gateway is integrated.

**Future fields to add:**
- Subscription period
- Payment history
- Invoice generation
- Grace period logic
- Suspension trigger
- Payment gateway integration (Razorpay preferred)

---

## Marketplace

**Purpose:** Allow multiple content providers to publish simulations.

**Why frozen:** All content is first-party in MVP. Marketplace introduces curation, revenue share, and trust complexity that is premature.

**Future triggers:** When third-party content partnerships are established.

---

## AI Content Generation in Production

**Purpose:** Allow content managers to generate simulation scripts, cue cards, or curriculum maps using AI.

**Why frozen:** AI generation must be reviewed and validated before reaching production. No direct AI-to-production pipeline in MVP.

**Safe current use:**
- AI can generate drafts for human review
- AI can suggest XR fit classifications for human confirmation
- AI can propose misconception lists from curriculum documents
- AI must not write directly to `main.tsp` or migration files

**Future triggers:** When an internal review workflow exists that catches AI errors before production deployment.

---

## Multiplayer VR

**Purpose:** Allow multiple students to share a VR space simultaneously.

**Why frozen:** 10 Quest headsets operating simultaneously in offline mode is the target. Multiplayer requires network coordination, latency management, and content redesign. Not needed for the core pedagogical model which is instructor-led, batch-sequential.

**Future triggers:** When network infrastructure in schools improves and a specific multiplayer pedagogy case is validated.

---

## AR / Tablet Delivery

**Purpose:** Extend curriculum content to AR on tablets for subjects where Quest VR is not the best fit.

**Why frozen:** Quest VR is the first platform. AR adds a separate device category, content format, and interaction model.

**TypeSpec flag:** `xrFitType: arTabletFit` marks curriculum topics that are better suited to AR. These topics are catalogued now so the curriculum is AR-ready.

**Future triggers:** When tablet hardware is procured and AR content pipeline is established.

---

## Individual Student Login

**Purpose:** Track individual student performance over time.

**Why frozen:** Student privacy, device-to-student assignment complexity, and the batch-sequential model make individual login unnecessary in MVP. Evaluation at batch level is sufficient to measure learning outcomes.

**Future triggers:** When longitudinal tracking is a contractual requirement from schools or when individual adaptive content is ready.

---

## Parent-Facing App

**Purpose:** Share learning progress reports with parents.

**Why frozen:** No individual student accounts in MVP. No progress data to share at individual level.

**Future triggers:** After individual student login is implemented.
