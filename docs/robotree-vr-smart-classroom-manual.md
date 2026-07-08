# Robotree VR Smart Classroom — Demo Manual

## 1. What this app does

Robotree VR Smart Classroom is a centralized classroom control demo. One teacher
tablet controls 10–15 VR headset clients on the same local Wi-Fi:

- The **teacher app** logs into demo mode, picks class → subject → chapter →
  activity, and launches that content on all or selected headsets.
- The **student/headset app** pairs with the classroom session, waits for the
  teacher, and shows the assigned activity, live command state (Waiting /
  Running / Paused / Stopped) and step progress.
- Everything runs **local-first**: an in-memory session manager inside the
  Fastify API, no cloud, no database, no real authentication.

Routes:

| App | URL |
| --- | --- |
| Teacher entry | `/robotree` (redirects to `/robotree/login`) |
| Teacher dashboard | `/robotree/dashboard` |
| Teacher control panel | `/robotree/classroom/[sessionId]/teacher` |
| Headset manual join | `/robotree/headset` |
| Headset direct link | `/robotree/headset/[sessionId]` |
| Admin placeholder | `/robotree/admin` |

## 2. Teacher tablet flow

1. Open `/robotree/login`, enter Teacher Name, School Name and (optionally) a
   Class, then press **Start Demo**. This creates a classroom session and
   stores the demo login in `localStorage`.
2. The dashboard shows the **class grid** (Class 1–12). Pick a class.
3. Pick a **subject** (Science, Mathematics, Computer, AI, Robotics, EVS,
   Physics, Chemistry, Biology).
4. Pick a **chapter** (Introduction / Core Concepts / Practice and Assessment)
   and an **activity** (VR Activity 1, AR Activity 2, 3D Model, Quiz,
   Assessment).
5. Press **Open Classroom Control Panel**. From there you can manage headsets,
   start/pause/stop content and watch live progress.

## 3. Student/headset flow

Two ways to join:

- **Manual join** — open `/robotree/headset` on the device and type the join
  code (shown in the teacher top bar) or the full session id.
- **Direct link** — open `/robotree/headset/<sessionId>` (the teacher's *Copy
  Student Join Link* button copies this). The device auto-joins and is labelled
  `Headset N`.

The headset screen shows connection status, a simulated battery value, the
assigned class/subject/chapter/activity, the current command state and step
index. Demo buttons: **Send Progress**, **Submit Demo Answer**, **Simulate
Battery Low**, **Disconnect/Reconnect**.

## 4. How to run locally

Requires Node 23 (see `.nvmrc`).

```bash
npm install                      # once

# Terminal 1 — API (Fastify, port 3001)
npm --workspace apps/api run dev

# Terminal 2 — Web (Next.js, port 3000)
npm --workspace apps/web run dev
```

Teacher: `http://localhost:3000/robotree`
Headsets on the same Wi-Fi: `http://<teacher-machine-ip>:3000/robotree/headset`
(the web client automatically calls the API on the same hostname, port 3001).

## 5. How to create a demo session

Fill the demo login form and press **Start Demo**. No password is needed — the
API mints a session with a short join code (e.g. `K7M2PX`). The join code is
always visible in the teacher control panel top bar.

## 6. How to simulate 10 headsets

In the control panel press **Simulate 10 Headsets**. Ten virtual devices join
with realistic variety — most *Connected*, some *Battery Low*, one *Offline* —
so the demo works with zero physical headsets.

## 7. How to start activity on all headsets

Pick class/subject/chapter/activity first (the Start buttons stay disabled
until an activity is selected), then press **Start on All Headsets**. Every
*Connected* or *Battery Low* device receives the activity and begins reporting
progress. *Offline* devices are skipped.

## 8. How to start activity on selected headset

Tap one or more headset cards to select them (they highlight green), then press
**Start on Selected Headset**. Only the selected, reachable devices start.

## 9. How pause/stop/sync work

- **Pause All** — session becomes *Paused*; running progress entries pause and
  headsets show "Paused".
- **Stop All** — session becomes *Stopped*; each device's current activity is
  cleared and progress entries are marked stopped.
- **Sync Content** — reachable devices briefly go *Syncing* and come back
  *Connected* (instant in the demo; in production this downloads content
  packages over local Wi-Fi).

## 10. How to view student progress

Press **View Student Progress** (or scroll to the Student Progress card). It
shows connected/running/completed counts, total answers, average score, and a
per-headset table with step progress bars. It refreshes automatically every
2 seconds. On the headset, **Send Progress** and **Submit Demo Answer** feed
this table live.

## 11. Offline/local Wi-Fi mode explanation

The whole demo runs inside the classroom network. The teacher machine hosts
both the web app (port 3000) and the control API (port 3001). Headsets only
need to reach the teacher machine over Wi-Fi — no internet required. Clients
poll the session snapshot every 2 seconds, so control keeps working even
without a realtime WebSocket channel.

## 12. Current MVP limitations

- Sessions live in memory: restarting the API clears all classrooms.
- Demo login only — no real school authentication.
- Battery, sync and activities are simulated; no real headset APIs or XR
  rendering (the headset app shows a simulated activity panel).
- Realtime transport is polling; the `/live` WebSocket channel is a TODO.
- Admin panel is a visual placeholder — no uploads, reports or cloud sync.
- One activity at a time per session; no per-student accounts (batch-level
  evaluation only, matching the platform MVP constraints).

## 13. Future production architecture

- **Tablet App** — the teacher control app (this web UI packaged for tablets),
  managing sessions, launching content, and monitoring the class.
- **VR App** — installed in every headset; renders the real XR activities,
  reports native battery/thermals, and executes teacher commands.
- **Admin Panel** — uploads chapters, activities and school data; manages
  licences and reports.
- **Cloud Server** — stores syllabus, content metadata and reports; schools
  sync when internet is available.
- **Local Wi-Fi Sync Server** — the classroom brain (today's in-memory session
  manager hardened into a persistent local service) that controls all VR
  headsets inside the classroom with zero internet dependency.
- **Offline Content Mode** — signed, versioned content packages downloaded
  ahead of time so lessons keep working without internet.
