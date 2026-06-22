# Simulation Design System

Every XR simulation built for this platform must be designed against this system. This document defines the design language, interaction patterns, safety rules, and quality bar for all simulation content.

## Design Principles

1. **Every simulation must earn its place.** XR is expensive. Every module must be better than textbook + video for that specific concept.
2. **Instructor is the anchor.** The simulation is a tool in the instructor's hands. It does not replace the instructor.
3. **Batch-first design.** 10 students wear headsets. 30 students watch, discuss, or do companion activities. Design for both.
4. **Short and deep, not long and shallow.** Sessions are 8–12 minutes per batch. Every second must serve the learning objective.
5. **Misconceptions are first-class.** Every simulation should confront at least one known misconception head-on.

---

## Simulation Format Guide

| Format | Best For | Example |
|---|---|---|
| `immersiveVr` | Exploration of spatial concepts | Walking inside a cell, orbiting an atom |
| `threeSixtyVr` | Contextual environments and field visits | Kaziranga ecosystem, a working factory |
| `interactive3d` | Manipulation of objects and systems | Building a circuit, assembling a molecule |
| `guidedVisualization` | Narrative-driven concept reveals | How a star forms, how a tsunami propagates |
| `practicalLabSimulation` | Safe recreation of physical experiments | Dangerous chemical reactions, dissection |
| `virtualFieldVisit` | Places students cannot physically visit | Space, deep ocean, historical sites |
| `revisionMode` | Replay key moments with quiz overlay | Any simulation's key moments + questions |

---

## Interaction Pattern Library

### 1. Try–Predict–Observe–Explain (TPOE)
Most powerful pattern for science concepts.

```
1. PREDICT: "What do you think will happen if...?"
2. DO: Student triggers the action
3. OBSERVE: Simulation plays out
4. EXPLAIN: Cue card prompts reflection
```

### 2. Progressive Reveal
For complex multi-part concepts.

```
Step 1: Show only the context (e.g., a quiet cell)
Step 2: Introduce first element (mitochondria highlighted)
Step 3: Add interaction (energy production starts)
Step 4: Full system view
Each step has a cue card pause.
```

### 3. Misconception Confrontation
For topics with strong prior wrong beliefs.

```
1. State the common misconception explicitly
2. Student "sees" the world as the misconception suggests
3. Simulation shows why that's wrong
4. Correct understanding is demonstrated
5. Assessment hook checks if misconception was cleared
```

### 4. Guided Exploration
For topics where discovery matters.

```
Instructor sets the scene and gives one question.
Student is free to explore within defined bounds.
Cue cards appear contextually at key spots.
Timer prompt brings exploration to a close.
Debrief in class.
```

### 5. Imagination Helper
For abstract concepts students cannot anchor to experience.

```
Scale: Show an atom next to a familiar object for scale reference
Time: Show geological time with a familiar time reference (100 years as 1 second)
Invisibility: Render invisible forces (magnetic fields, electric current) as visible particles
```

---

## Cue Card Design Rules

Cue cards appear as floating prompts in VR, triggered by location, action, or timer.

**A cue card must:**
- Be 1–2 sentences maximum
- Focus on one concept or observation
- Use simple language appropriate to grade band
- Have a clear `studentAction` (e.g., "Look up and rotate 360°")

**A cue card must not:**
- Explain the answer before the student has experienced it
- Appear more than once per 45 seconds (attention load)
- Use jargon without prior introduction

---

## Instructor Script Structure

Every simulation module requires an instructor script with these sections:

```
1. SETUP (before headsets go on)
   - What to tell the class
   - The central question to pose
   - What the non-headset students will do

2. DURING HEADSET BATCH (per batch, ~8-12 min)
   - Key moments to narrate aloud
   - Signs of confusion to watch for
   - Safety check points

3. DEBRIEF (full class, after all batches)
   - Discussion prompts
   - Key misconception to address
   - Connection to textbook
   - Transition to next topic or activity

4. REVISION TRIGGER
   - What to revisit in the next session
   - Spaced revision suggestion (1 week, 1 month)
```

---

## Batch Activity Design

While 10 students wear headsets, 30 students cannot be idle. Every simulation must include a companion activity.

**Companion Activity Types:**
- Prediction worksheet (what will happen? why?)
- Concept sketch (draw what you think the process looks like)
- Discussion pair (debate two possible answers)
- Observation log (watch the demonstrating headset student's head movements; what are they looking at?)
- Textbook cross-reference (find this concept in the chapter; what's the same? what's different?)

---

## Safety and Comfort Design Rules

| Rule | Requirement |
|---|---|
| Session limit | Max 12 minutes per headset batch |
| Movement | No fast locomotion (teleport only, no continuous movement) |
| Brightness | No sudden flash events or strobe patterns |
| Scale | Avoid extremely narrow spaces or claustrophobic environments |
| Warning | Instructor checks comfort every batch |
| Comfort risk flag | Every simulation must declare `comfortRiskLevel` |
| High-risk mitigation | High-risk simulations require instructor pre-briefing |

**Comfort Risk Classification:**

| Level | Criteria | Example |
|---|---|---|
| `low` | Stationary or slow movement, no flash, familiar scale | Atom orbit (stationary view) |
| `medium` | Some movement, mild scale distortion, 360° required | Tectonic plate flight |
| `high` | Fast motion, extreme scale (micro or macro), height | Space flight, inside bloodstream |

---

## Package Size and Performance Targets

| Grade Band | Target Package Size | Max Session Duration | Min FPS |
|---|---|---|---|
| Class 1–5 | < 300 MB | 8 minutes | 72 fps |
| Class 6–8 | < 500 MB | 10 minutes | 72 fps |
| Class 9–10 | < 800 MB | 12 minutes | 72 fps |
| Class 11–12 | < 1200 MB | 12 minutes | 72 fps |

Total lab Quest storage budget: 128 GB per device.

---

## Evidence Confidence Levels

Before releasing a simulation, it must be classified:

| Level | Requirement |
|---|---|
| `experimental` | Conceptual, not tested with students |
| `expertDesigned` | Reviewed by a subject expert; not student-tested |
| `internallyPiloted` | Tested by instructor in controlled internal session |
| `schoolValidated` | Tested in 1+ real school sessions with evaluation data |
| `researchBacked` | Validated against published learning science research |

**Policy:** Only `schoolValidated` or above qualifies for `releaseChannel: schoolStable`.

---

## Simulation Quality Checklist

Before a simulation is submitted for approval, the content manager must confirm:

- [ ] XR fit type is `strongVrFit` or `arTabletFit` (not others)
- [ ] XR fit justification is written (min 2 sentences)
- [ ] Learning objective is one measurable sentence
- [ ] At least one misconception is addressed
- [ ] Instructor script has all 4 sections
- [ ] Cue card count: minimum 3, maximum 10
- [ ] Pre-check and post-check assessment hooks exist
- [ ] Comfort risk level declared
- [ ] Safety notes written if `comfortRiskLevel: medium` or `high`
- [ ] Package size estimate provided
- [ ] Curriculum map links confirmed (not hypothetical)
- [ ] Batch activity companion activity described
