# Class 5 Digestive System VR Lesson Design

## Goal

Promote the existing catalog activity `c5-ch03-a02-introduction-of-digestive-system` into a launchable, 9–10 minute WebXR lesson in the CBSE Class 5 Environmental Studies course. The lesson must teach the food pathway, the function of each major digestive organ, supporting organs, and healthy digestion habits on Meta Quest 3S while remaining usable in a desktop browser.

## Chosen Approach

Build a dedicated Three.js/WebXR viewer and a small, independently testable lesson model.

This follows the architecture of the five existing launchable lessons while avoiding the limitations of the generic catalog viewer. A generic `modelInspection` scene cannot express the requested ten-scene journey, manipulation tasks, scoring, completion, or organ-specific visual changes. A schema-first world-builder migration would eventually improve reuse, but it would enlarge this lesson into a runtime migration and delay a complete student experience. The dedicated viewer is therefore the smallest approach that satisfies the current product and teaching requirements.

## Curriculum Placement

- Course: `course-cbse-c5-environmental-science`
- Chapter: new canonical Chapter 3 record, `From Tasting to Digesting`
- Activity: existing catalog activity 2
- Stable simulation ID: `sim-c05-ch03-a02-introduction-of-digestive-system`
- Stable slug: `c5-ch03-a02-introduction-of-digestive-system`
- Subject: Environmental Science and Biology
- Grade band: Classes 3–5
- Duration: 10 minutes, with a 12-minute hard session ceiling
- Release maturity after implementation: Internal QA

The course gains digestive-system concepts and Chapter 3 without removing or renumbering the existing Chapter 7 water lesson.

## Learning Model

The lesson model is framework-independent TypeScript. It owns:

- the ten ordered stages and their narration/subtitles;
- the primary task required at each interactive stage;
- quiz questions and correct answers;
- stage completion state;
- score calculation and badge eligibility;
- the canonical food pathway.

The viewer consumes this model, but the model does not import React or Three.js. This lets unit tests verify progression and assessment without a browser or headset.

Students may revisit completed stages. Advancing from an interactive stage requires its task; informational stages allow direct continuation. The quiz requires answers to all five questions. Completion awards the `Digestive Explorer` badge after the summary stage; quiz mistakes remain visible as learning feedback and do not lock the child out of completion.

## Scene and Interaction Design

### 1. Welcome to the Human Body

A colorful stationary science lab contains a glowing child-friendly anatomical model and an animated guide orb. `Start Journey` reveals the digestive tract and moves the stage focus to the mouth. The camera never moves automatically; the world changes around the student to reduce discomfort.

### 2. Mouth

Large, friendly teeth, tongue, and saliva droplets show mechanical breakdown and bolus formation. Students select one of three food pieces and place it in the mouth target. The food visibly compresses into a bolus while the narration explains chewing and saliva.

### 3. Esophagus

A translucent vertical tube contains the bolus. Students trigger three sequential muscle-wave controls. Rings contract from top to bottom and move the bolus toward the stomach, making peristalsis visible.

### 4. Stomach

A semi-transparent stomach receives the bolus. Students rotate or repeatedly activate a mixer handle. Food particles, acid-colored fluid, and churning motion combine into chyme.

### 5. Liver, Gallbladder, and Pancreas

Three colored organ hotspots surround the upper digestive tract. Selecting each organ highlights it and reveals its function:

- liver produces bile;
- gallbladder stores and releases bile;
- pancreas releases digestive juices.

All three hotspots must be inspected.

### 6. Small Intestine

A coiled tube with enlarged villi shows absorption. Students select three glowing nutrient particles and direct them into nearby blood vessels. Absorbed particles turn the vessel glow on.

### 7. Large Intestine

The wider intestine shows water remaining in digestive contents. Students direct three water droplets from the intestine into the body, leaving a more solid waste form behind.

### 8. Rectum and Anus

A simple, non-graphic cutaway explains storage in the rectum and waste leaving through the anus. This stage is informational and uses neutral language and iconography suitable for Class 5.

### 9. Healthy Habits

Students sort six food and habit tokens into a healthy basket or a “sometimes” tray. Healthy choices include fruit, vegetables, water, hand washing, chewing well, and exercise. Junk food is presented as an occasional choice rather than as morally “bad.”

### 10. Recap Quiz and Summary

Five questions cover:

1. digestion begins in the mouth;
2. the stomach mixes food;
3. the small intestine absorbs nutrients;
4. the large intestine absorbs water;
5. the liver produces bile.

The final panel shows `Mouth → Esophagus → Stomach → Small Intestine → Large Intestine → Rectum → Anus`, notes the supporting organs, displays the score, and awards the completion badge.

## Visual Architecture

The experience uses one stationary body-lab scene rather than ten separately loaded worlds. Stage transitions selectively reveal, hide, highlight, and animate organ groups. This avoids loading pauses and keeps Quest draw calls predictable.

Organs use low-poly procedural Three.js geometry with distinct but anatomically coherent colors, labels, emissive selection states, and translucent cutaways. The tract is schematic rather than medically realistic, which is appropriate for Class 5 and avoids discomfort. The human silhouette and floor provide spatial context.

The desktop camera uses orbit controls constrained to a comfortable distance. WebXR uses `local-floor`, controller rays, and select events. All required interactions also have accessible HTML buttons, so the lesson remains operable with mouse, touch, keyboard, or hand/controller selection.

## Accessibility, Audio, and Comfort

- Persistent HTML subtitles mirror every narration line.
- Packaged narration URLs are supported; browser speech synthesis remains the offline fallback until recorded files are supplied.
- Controls have visible focus states and descriptive labels.
- No forced locomotion, camera acceleration, flicker, or rapid scene rotation.
- A comfort toggle reduces organ animation intensity.
- A mute control stops narration without hiding subtitles.
- The viewer targets 72 FPS on Quest 3S and caps browser pixel ratio.
- Interactive objects have generous ray targets and immediate visual feedback.

## Error and Fallback Behavior

- If WebXR is unavailable, the full lesson runs in desktop mode.
- If narration audio is missing or fails, speech synthesis reads the same subtitle text.
- A student cannot accidentally skip a required manipulation; the interface explains what remains.
- Resize, unmount, and XR-session cleanup dispose renderer resources and stop narration.
- Restart clears progress, score, highlights, and badge state without reloading the page.

## Testing Strategy

1. Unit-test the lesson model first:
   - ten-stage order and canonical pathway;
   - stage task requirements;
   - organ inspection completion;
   - nutrient and water interaction counts;
   - healthy-habit sorting;
   - five quiz answers, score, and badge eligibility.
2. Add source-level viewer regression tests matching existing headset tests:
   - WebXR renderer and `local-floor`;
   - controller ray selection;
   - desktop controls and accessible fallback buttons;
   - subtitles, comfort control, narration calls, completion badge;
   - required organ and interaction identifiers.
3. Extend curriculum and module tests:
   - the module is linked from the Class 5 course and Chapter 3;
   - curriculum graph remains valid;
   - catalog generation promotes the activity from catalogued to Internal QA search results.
4. Run the full test suite, catalog generation, type-check, production build, and browser smoke test before deployment.

## Deployment

Deploy the production web build using the repository’s existing Vercel project configuration. After deployment, verify the catalog card and the direct simulation route in a real browser. Preserve unrelated working-tree changes by staging and committing only files belonging to this lesson.
