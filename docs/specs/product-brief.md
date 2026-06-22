# XR School Lab Platform — Product Brief

## What This Is

An offline-first K–12 XR simulation curriculum platform for Indian schools, starting with North East India.

This is **not**:
- A generic VR marketplace
- A CRM-first school sales app
- A projector-based smart classroom product
- A cloud streaming platform
- A consumer VR product

## Who It Is For

**Schools:** Indian K–12 schools on CBSE, ICSE, and State Board curricula.  
**Geography:** North East India first (Assam, Meghalaya, Manipur, Mizoram, Nagaland, Arunachal Pradesh, Tripura, Sikkim).  
**Operator:** Our instructors. Not school teachers as primary operators.

## Core Constraints

| Constraint | Value |
|---|---|
| Lab size | ~600 sq ft |
| Students per class | 40 |
| Headsets per lab | 10 |
| Students per batch | 10 |
| Batches per class | 4 |
| Device | Meta Quest (128 GB target) |
| Connectivity | Unreliable; offline-first; sync later |
| Projector | Not assumed |
| Internet | Not required for sessions |

## Pricing Model

- Setup: ₹4–8 lakh per school
- Recurring: ₹250 per student per month
- Individual student login: Not in MVP
- Payment gateway: Not in MVP

## User Roles

| Role | Purpose |
|---|---|
| `superAdmin` | Full system control |
| `programOwner` | Manages curriculum programs and deployment |
| `instructor` | Runs sessions in the lab (our employee) |
| `contentManager` | Creates and manages simulation content |
| `schoolAdmin` | View-only access for school management |
| `supportOps` | Handles devices, sync, technical issues |

> `teacher` and `evaluator` are **not** MVP roles. School teachers are support staff, not operators.

## Value Proposition

XR simulations must justify why they are better than textbook, video, or physical lab for each topic. We do not deploy XR blindly. Every simulation must earn its place.

The platform's value is:
1. Concepts that are hard to visualize become experiential
2. Dangerous or expensive labs become safe and repeatable
3. Abstract phenomena (atomic scale, geological time, space) become tangible
4. Learning outcomes are measurable even without individual logins

## First Implementation Vertical

```
LearningConcept → CurriculumMap → CueCard → RevisionCard → AssessmentHook 
  → SimulationModule → OfflineContentPack → BatchSession → EvaluationRecord → SyncJob
```

This vertical is the foundation of the product. Everything else is secondary.

## What Is Frozen (Future Shell Only)

These domains exist as data models and future specs but are **not deeply implemented in MVP**:
- CRM and lead management
- Proposals and sales flows
- Billing and payment
- School marketplace
- AI content generation in production
- Cloud streaming
- Multiplayer VR
- Individual student accounts
