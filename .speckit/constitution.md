# Spec Kit Constitution — XR School Lab Platform

## North Star

An offline-first XR simulation curriculum platform that makes invisible, dangerous, and abstract science concepts experiential for K–12 students in Indian schools, starting with North East India.

The platform's value is pedagogical, not technological. Every decision must serve learning outcomes.

## Non-Negotiable Constraints

1. **Offline-first always.** Sessions must never depend on internet. Sync is an afterthought, not a requirement.
2. **Instructor is the operator.** School teachers are support staff. Our instructors run sessions.
3. **Batch-level, no individual login.** 40 students / 10 headsets / 4 batches. No student accounts in MVP.
4. **TypeSpec is source of truth.** Code cannot run ahead of the contract.
5. **XR must be justified.** Every simulation must explicitly explain why VR is better than textbook/video.
6. **CRM, billing, and marketplace are frozen.** The first vertical slice is curriculum, not commerce.

## Product North Star Statement

> "A student in Shillong sits in a VR headset and walks through a chloroplast. They've never seen this in a textbook. The instructor guides the class through what they're seeing. By end of class, 80% of students score higher on the post-check than the pre-check."

Everything we build serves this moment.

## Explicit Anti-Patterns

- Do not build for the sales demo. Build for the student.
- Do not build a marketplace before the content works.
- Do not design for internet reliability you don't have.
- Do not add individual student tracking before the core product is validated.
- Do not use VR for topics that don't benefit from immersion.

## Quality Gates

A spec is ready to implement when:
1. TypeSpec compiles with no errors
2. OpenAPI is generated and has all routes
3. Ontology documents exist for curriculum and simulation
4. ER diagram exists and matches TypeSpec models
5. Drift check exists and runs in CI
6. First-priority vertical slice is fully specced (not just listed)
