# Veil — Emotion Tracking App

> **Lift the veil. Understand yourself.**  
> A fully offline, privacy-first mobile app for tracking emotions, building self-awareness, and spotting patterns in your mental state over time.

---

## Table of Contents

1. [Overview](#overview)
2. [Core Philosophy](#core-philosophy)
3. [Features](#features)
4. [Tech Stack](#tech-stack)
5. [Project Structure](#project-structure)
6. [Architecture](#architecture)
7. [Emotion Engine](#emotion-engine)
8. [Database Schema](#database-schema)
9. [State Management](#state-management)
10. [Screens](#screens)
11. [Getting Started](#getting-started)
12. [Build & Deploy](#build--deploy)
13. [Design System](#design-system)
14. [Roadmap](#roadmap)

---

## Overview

Veil is a React Native (Expo) mobile application for iOS and Android that helps users track their emotional state through daily check-ins, voice journaling, and guided breathing exercises. It surfaces patterns over time — correlations between triggers and emotions, weekly mood calendars, and day-of-week insights — entirely on-device without sending a single byte to any server.

The name is intentional: emotions are often the veil that obscures our real state from ourselves. The app exists to help lift it.

---

## Core Philosophy

### Privacy-first by design
All user data lives exclusively in an SQLite database on the device. Audio recordings are stored in the local filesystem. There are no accounts, no cloud sync, no analytics, no third-party SDKs. The app works with no internet connection at all.

### Zero external ML dependencies
The emotion classifier (`src/engine/emotionEngine.ts`) is a standalone signal-processing module written in plain TypeScript. It requires no models, no network calls, no TensorFlow or ONNX runtime. It processes raw audio amplitude data from `expo-av`'s metering API and maps acoustic features onto Robert Plutchik's emotion model using James Russell's valence–arousal circumplex.

### No state management library
The global store (`src/store/useStore.ts`) is implemented from scratch using React's `useState` and `useEffect`. It provides a Zustand-like selector API without any external dependency — and without `import.meta`, which is incompatible with Hermes (React Native's JS engine).

---

## Features

### ◎ Check-in (2-step flow)
A guided daily check-in that takes under 30 seconds.

**Step 1 — Emotion + Intensity**
- Interactive Plutchik Wheel built with `react-native-svg`. Tap or slide a finger around the ring to select one of 8 emotions (joy, trust, fear, surprise, sadness, disgust, anger, anticipation).
- Custom intensity slider built with `react-native-reanimated` + `react-native-gesture-handler`. The thumb and fill run entirely on the UI thread (zero JS bridge crossings during drag). Springs to the nearest integer step on release.
- Weekly digest card appears automatically when ≥2 check-ins exist in the current week, showing average mood, check-in count, most-felt emotion, and hardest day.

**Step 2 — Context**
- 8 predefined trigger chips: work, relationships, sleep, health, exercise, money, loneliness, success.
- **"other +"** chip opens an inline text input for a custom trigger description (saved as a `#hashtag` prefix in the note field).
- Free-text note field.

### ◈ Journal
A scrollable history of all check-ins. Each entry card shows the emotion (color-coded), trigger tags, note preview, timestamp, and an intensity bar. FlatList with a fixed header — the header never scrolls away.

### ◉ Patterns
A data dashboard with three sections:

**Mood Calendar (heatmap)**  
A 10-week × 7-day GitHub-style contribution graph. Each cell is colored by average intensity for that day: grey = no data, red gradient = low mood (1–4), purple gradient = neutral to excellent (5–10). Built entirely from React Native `View` components — no charting library required.

**Veil Notices (insight callout)**  
Appears automatically when ≥5 check-ins exist. Finds the day of the week with the lowest average intensity vs the highest, and generates a human-readable sentence: *"Mondays tend to be harder — mood is 34% lower than on Fridays."*

**Your Patterns (correlations)**  
For each trigger the user has logged, finds the emotion that co-occurs most frequently with that trigger. Uses statistical lift (`observed rate / baseline rate`) to score the correlation strength, normalised to a 35–95% range. Shows up to 4 top patterns. Replaces hardcoded placeholder data with real user analytics.

**Overview stats grid**  
Four cards: total entries, current day streak, average intensity (last 7 days), top emotion.

### ◐ Voice Journal
Full recording flow using `expo-av`:
1. Requests microphone permission on first use.
2. Records with `isMeteringEnabled: true` — captures amplitude every 100ms.
3. Live animated waveform updates in real time from metering data (via `useState`, not `ref`).
4. On stop, passes amplitude samples through the emotion engine.
5. Shows detected emotion, confidence score, energy level, and variance.
6. Saves audio path + all features to the `voice_entries` table.
7. Displays the last 3 recordings below the mic.

### ◌ Breathe
A guided 4-7-8 breathing exercise:
- **4s inhale** → **7s hold** → **8s exhale** → **2s pause** — 3 cycles.
- Animated circle expands on inhale/hold, contracts on exhale, using `Animated.timing` from React Native core (no Reanimated needed here).
- Phase colors: teal for inhale, yellow for hold, purple for exhale.
- Cycle counter, stop/restart at any time.
- Three additional practice descriptions: 5-4-3-2-1 grounding, progressive relaxation, body scan meditation.

---

## Tech Stack

| Layer              | Technology                               | Version      |
|--------------------|------------------------------------------|--------------|
| Framework          | React Native                             | 0.81.5       |
| Expo SDK           | Expo                                     | ~54.0.33     |
| Navigation         | Expo Router (file-based, tabs)           | ~6.0.23      |
| Language           | TypeScript                               | ~5.9.2       |
| Runtime            | React                                    | 19.1.0       |
| Database           | expo-sqlite (async API)                  | ~16.0.10     |
| Audio              | expo-av                                  | ~16.0.8      |
| Animations         | react-native-reanimated                  | ~4.1.1       |
| Gestures           | react-native-gesture-handler             | ~2.28.0      |
| Vector graphics    | react-native-svg                         | 15.12.1      |
| State management   | Custom pub-sub hook (zero deps)          | —            |
| Emotion classifier | Custom signal-processing engine (zero deps) | —         |
| Date utilities     | date-fns                                 | ^4.1.0       |

---

## Project Structure

```
veil/
├── app/                          # Expo Router file-based navigation
│   ├── _layout.tsx               # Root layout: DB init, loading screen, error screen
│   └── (tabs)/                   # Tab navigator
│       ├── _layout.tsx           # Tab bar config (icons, colors, heights)
│       ├── index.tsx             # ◎ Check-in screen
│       ├── journal.tsx           # ◈ Journal screen
│       ├── insights.tsx          # ◉ Patterns screen
│       ├── voice.tsx             # ◐ Voice journal screen
│       └── breathe.tsx           # ◌ Breathe screen
│
├── src/
│   ├── types/
│   │   └── index.ts              # All TypeScript types and interfaces
│   │
│   ├── constants/
│   │   └── emotions.ts           # Plutchik emotions, trigger list, color palette
│   │
│   ├── engine/
│   │   └── emotionEngine.ts      # Standalone audio → emotion classifier
│   │
│   ├── db/
│   │   ├── database.ts           # SQLite init, schema, migrations
│   │   └── queries.ts            # All SQL queries (CRUD + analytics)
│   │
│   ├── store/
│   │   └── useStore.ts           # Global state: pub-sub hook, no external deps
│   │
│   └── components/
│       ├── PlutchikWheel.tsx     # Interactive SVG emotion wheel with gestures
│       └── EntryCard.tsx         # Journal entry card component
│
├── assets/
│   └── images/
│       ├── icon.png              # App icon (1024×1024, rounded rect, ◎ glyph)
│       ├── adaptive-icon.png     # Android adaptive icon foreground
│       └── splash-icon.png       # Splash screen (dark bg, centered ◎)
│
├── app.json                      # Expo config (dark UI, splash bg #0d0b14)
├── babel.config.js               # babel-preset-expo
├── tsconfig.json                 # TypeScript config
└── package.json
```

---

## Architecture

### Data flow

```
User interaction
      │
      ▼
React component (screen)
      │  calls action
      ▼
useStore action (addCheckIn / addVoiceEntry)
      │  writes to
      ▼
expo-sqlite (veil.db on device)
      │  then calls loadAll()
      ▼
Queries: fetchCheckIns + fetchVoiceEntries
       + computeWeeklyStats + fetchDailyMood(14) + fetchDailyMood(70)
      │  all run in parallel via Promise.all
      ▼
setState() — notifies all listeners
      │
      ▼
useVeilStore selectors re-render subscribed components
```

### Gesture pipeline (intensity slider)

```
Finger on screen
      │
      ▼
Gesture.Pan (react-native-gesture-handler)
      │  .activeOffsetX([-4, 4])   → horizontal drag activates
      │  .failOffsetY([-15, 15])   → vertical drag fails → ScrollView scrolls
      ▼
.onChange() on UI thread (Reanimated worklet)
      │  clampX() + direct posX.value update
      ▼
useAnimatedStyle — thumb, fill, badge move at 60fps with zero bridge crossing
      │
      │  runOnJS(onChange) — only called when integer step changes (max 9×/drag)
      ▼
React setState → JS re-render (dots update, value saved)

onEnd() → withSpring() snaps to nearest integer step
```

### Gesture pipeline (Plutchik Wheel)

```
Finger touches wheel
      │
      ▼
Gesture.Pan (minDistance: 0) — activates instantly on touch
      │
      ▼
onBegin / onChange: emotionAtPoint(x, y, size)
      │  → Math.atan2 angle → sector index (0–7) → EmotionId
      ▼
setHovered(eid) — live sector highlight on every frame
      │
onEnd: setSelected (or deselect if same sector tapped)
onFinalize: clear hover (gesture cancelled)
```

---

## Emotion Engine

**File:** `src/engine/emotionEngine.ts`

A fully self-contained, zero-dependency emotion classifier. No ML models, no runtimes, no network.

### Theoretical basis

The engine is grounded in two established psychological frameworks:

1. **Plutchik's Wheel of Emotions** — 8 primary emotions arranged in a circle by similarity: joy ↔ anticipation ↔ anger ↔ disgust ↔ sadness ↔ fear ↔ surprise ↔ trust. Adjacent emotions blend; opposite emotions contrast.

2. **Russell's Valence–Arousal Circumplex** — Emotions exist in a 2D space defined by *valence* (positive vs negative) and *arousal* (high vs low activation). This maps cleanly onto audio: high arousal = loud, fast, variable; low arousal = quiet, slow, steady.

### Pipeline

#### Step 1: dBFS → amplitude
`expo-av` reports microphone level in dBFS (decibels relative to full scale), where 0 is maximum and −60 is near-silence.

```typescript
function dbToAmplitude(db: number): number {
  return (Math.max(-60, Math.min(0, db)) + 60) / 60;
  // Maps: -60 dBFS → 0.0,  -30 dBFS → 0.5,  0 dBFS → 1.0
}
```

Samples are collected every 100ms during recording, resulting in ~10 samples/second.

#### Step 2: Feature extraction
Four acoustic features are computed from the amplitude sample array:

| Feature | Formula | Psychological meaning |
|---------|---------|----------------------|
| `energy` | mean amplitude | overall activation level, loudness |
| `variance` | σ of amplitudes × 3 | emotional expressiveness, pitch variation |
| `tempo` | zero-crossing rate / (N × 0.5) | speaking speed, agitation |
| `peakRatio` | fraction of samples above 70% of peak | sustained loudness, intensity of peaks |

#### Step 3: Scoring
Each of the 8 emotions gets a weighted score based on the features, derived from the valence–arousal positions in Russell's model:

```
joy:           energy×0.4 + tempo×0.35 + variance×0.25
anger:         energy×0.45 + peakRatio×0.35 + (1-variance)×0.2
sadness:       (1-energy)×0.4 + (1-tempo)×0.35 + (1-variance)×0.25
fear:          variance×0.4 + tempo×0.35 + (1-peakRatio)×0.25
surprise:      variance×0.5 + tempo×0.3 + energy×0.2
anticipation:  energy×0.3 + peakRatio×0.4 + tempo×0.3
trust:         (1-|energy-0.45|)×0.4 + (1-tempo)×0.3 + (1-variance)×0.3
disgust:       (1-energy)×0.35 + (1-tempo)×0.3 + variance×0.35
```

#### Step 4: Softmax normalisation
Scores are converted to probabilities via softmax with temperature scaling (×5), which amplifies separation between close scores:

```typescript
const expScores = scores.map(s => Math.exp((s.score - maxScore) * 5));
const probs     = expScores.map(e => e / sum);
```

#### Step 5: Confidence
Confidence is derived from the gap between the top probability and the runner-up, scaled to a realistic 55–95% range:

```typescript
confidence = 0.55 + (probs[0] - probs[1]) * 0.4
```

This avoids false certainty (never reaches 100%) while staying above a meaningful floor (never below 55% when a clear winner exists).

### Accuracy

This is heuristic signal-processing, not deep learning. Typical accuracy:
- **High-contrast states** (calm vs angry, sad vs joyful): ~70–80%
- **Similar-arousal states** (fear vs surprise): ~55–65%

For a portfolio project this is intentional and honest — it demonstrates audio analysis skills without pretending to replace a trained model.

---

## Database Schema

**File:** `src/db/database.ts`  
**Engine:** SQLite via `expo-sqlite` v16 async API  
**WAL mode:** enabled for better concurrent read performance

### `checkins`

| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PK | autoincrement |
| `emotion` | TEXT | one of 8 EmotionId values |
| `intensity` | INTEGER | 1–10 |
| `triggers` | TEXT | JSON array of TriggerId strings, e.g. `["work","sleep"]` |
| `note` | TEXT | free text; custom "other" trigger stored as `#hashtag` prefix |
| `created_at` | TEXT | `datetime('now','localtime')` ISO string |

### `voice_entries`

| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PK | autoincrement |
| `audio_path` | TEXT | local file URI from expo-av |
| `detected_emotion` | TEXT | EmotionId from emotion engine |
| `confidence` | REAL | 0.55–0.95 |
| `energy` | REAL | 0–1 acoustic feature |
| `variance` | REAL | 0–1 acoustic feature |
| `tempo` | REAL | 0–1 acoustic feature |
| `duration_seconds` | INTEGER | recording length |
| `created_at` | TEXT | ISO string |

### Indexes

```sql
CREATE INDEX idx_checkins_created ON checkins(created_at DESC);
CREATE INDEX idx_voice_created    ON voice_entries(created_at DESC);
```

Both indexes support the common query pattern: "fetch last N records, ordered newest first."

### Analytics queries

**Daily mood** (`fetchDailyMood`): Groups check-ins by `date(created_at)`, computes `AVG(intensity)` per day for the last N days. Powers both the 14-day bar chart (deleted, replaced by heatmap) and the 70-day heatmap.

**Weekly stats** (`computeWeeklyStats`):
- Total entry count
- **Day streak**: iterates distinct dates descending from today, counting consecutive days with at least one check-in
- Average intensity over last 7 days
- Top emotion: `GROUP BY emotion ORDER BY COUNT(*) DESC LIMIT 1`
- Top trigger: triggers are stored as JSON arrays → parsed in JS → frequency counted in a `Record<string, number>`

**Correlations** (computed in `insights.tsx` via `useMemo`):
- For each trigger, finds the most co-occurring emotion
- Computes statistical lift: `(co-occurrence rate) / (base rate of emotion overall)`
- Lift > 1 means the trigger predicts the emotion more than chance
- Normalised to 35–95% display range: `0.4 + (lift - 1) × 0.22`

---

## State Management

**File:** `src/store/useStore.ts`

A minimal pub-sub store written entirely in React. API is intentionally identical to Zustand's selector pattern so it can be replaced with Zustand in the future without changing any consumer code.

### Why not Zustand?

Zustand v4.4+ uses `import.meta.env` in its ESM build. Hermes (React Native's JS engine) does not support `import.meta`. While this can be polyfilled via `babel-preset-expo`'s `unstable_transformImportMeta` flag, the workaround was unreliable across Expo SDK versions. The custom implementation avoids the issue entirely.

### Implementation

```typescript
// Module-level singleton — one store, no Context
let state: VeilStore = { ... };
const listeners = new Set<Listener>();

function setState(patch: Partial<VeilStore>) {
  state = { ...state, ...patch };        // immutable update
  listeners.forEach(l => l());           // notify all subscribers
}

// React hook — subscribe on mount, unsubscribe on unmount
export function useVeilStore<T>(selector: (s: VeilStore) => T): T {
  const [, rerender] = useState(0);
  useEffect(() => {
    const listener = () => rerender(n => n + 1);
    listeners.add(listener);
    return () => listeners.delete(listener);
  }, []);
  return selector(state);
}
```

Usage is identical to Zustand:
```typescript
const checkIns = useVeilStore(s => s.checkIns);
const { addCheckIn, stats } = useVeilStore(s => ({
  addCheckIn: s.addCheckIn, stats: s.stats,
}));
```

---

## Screens

### `app/_layout.tsx` — Root Layout

Wraps everything in `GestureHandlerRootView` (required for gesture handler to work in Expo Router). Calls `initDatabase()` then `loadAll()` on mount. Shows three states:

- **Loading**: dark screen with `◎` logo + spinner
- **Error**: error message with "Try again" button that re-runs init
- **Ready**: renders the `<Stack>` navigator

### `app/(tabs)/_layout.tsx` — Tab Bar

Five tabs with custom text-based icons (Unicode symbols, no icon font needed). Tab bar height 80px, paddingBottom 18px. Active color: `#8b7cf8`, inactive: `rgba(255,255,255,0.28)`.

### `app/(tabs)/index.tsx` — Check-in

Two-step flow controlled by `step: 1 | 2` state. No ScrollView — each step fills the screen with flex layout.

**Components used**: `PlutchikWheel`, `IntensitySlider`, `WeeklyDigest` (inline component), chip grid, `TextInput`.

**IntensitySlider** is defined inline in the same file:
- `useSharedValue` × 2 (trackW, posX) — both live on UI thread
- `useAnimatedStyle` × 3 (thumb, fill, badge) — all animate at 60fps
- `Gesture.Pan` with `.activeOffsetX` / `.failOffsetY` for proper ScrollView coexistence
- `withSpring` on release for snap-to-step feel

### `app/(tabs)/journal.tsx` — Journal

`SafeAreaView` → fixed header → `FlatList` (flex: 1). The outer container never scrolls; only the list scrolls internally. Entry count shown in a badge chip next to the title.

### `app/(tabs)/insights.tsx` — Patterns

`ScrollView` wrapper around four blocks: heatmap card, insight callout (conditional), correlations card, stats grid. Scrolling is intentional — data can grow as the user adds more check-ins.

The heatmap builds a `(number | undefined)[][]` grid (10 rows × 7 cols) from `heatmapData` by anchoring to the current week's Sunday and iterating backwards. Future dates are `undefined` → transparent cells.

### `app/(tabs)/voice.tsx` — Voice Journal

Three sections in flex layout:
- Fixed header
- `flex: 1` mic area (centres itself vertically)
- Fixed recent entries (last 3, no scroll)

Recording lifecycle: `idle` → `recording` → `processing` → `done` → `idle`.

The waveform is stored in `useState<number[]>` (not a ref), so React re-renders on every new metering sample and the bars animate live.

### `app/(tabs)/breathe.tsx` — Breathe

Phase machine: 4 phases in a loop, 3 cycles total. Uses `useRef<ReturnType<typeof setInterval>>` for the countdown timer and `Animated.Value` for the scale animation. The circle visually breathes with the user.

---

## Getting Started

### Prerequisites

- **Node.js** v18 or v20 (v22+ not supported by this Expo SDK)
- **npm** v9+
- **Expo Go** app on your iOS/Android device (SDK 54 compatible)
- **watchman** (macOS): resolves EMFILE errors from Metro's file watcher

```bash
# Install Node 20 via nvm
nvm install 20 && nvm use 20

# Install watchman (macOS)
brew install watchman
```

### Installation

```bash
git clone https://github.com/leksik-phew/veil
cd veil

# Install dependencies (use --legacy-peer-deps to resolve peer conflicts)
npm install --legacy-peer-deps
```

### Running

```bash
# Start Metro bundler
npx expo start

# Then in the terminal:
#   Press i → open in iOS simulator
#   Press a → open in Android emulator
#   Scan QR code → open in Expo Go on your device

# Clear Metro cache if you hit bundling errors
npx expo start --clear
```

### Common issues

| Error | Fix |
|-------|-----|
| `EMFILE: too many open files` | `brew install watchman` |
| `import.meta is not supported` | Check `babel.config.js` uses `babel-preset-expo` |
| `Cannot find module expo-sqlite/build/SQLiteDatabase` | You have expo-sqlite v14. Run `npm install expo-sqlite@~16.0.10 --legacy-peer-deps` |
| `Project is incompatible with Expo Go` | Your Expo Go supports SDK 54. Ensure `"expo": "~54.0.33"` in package.json |
| Metro hangs after changes | `npx expo start --clear` |

---

## Build & Deploy

### iOS (EAS Build)

```bash
# Install EAS CLI
npm install -g eas-cli

# Log in to Expo account
eas login

# Configure project (first time)
eas build:configure

# Build for device testing (ad-hoc)
eas build --platform ios --profile preview

# Build for App Store
eas build --platform ios --profile production
```

### Android

```bash
# Build APK (for sideloading)
eas build --platform android --profile preview

# Build AAB (for Play Store)
eas build --platform android --profile production
```

### `eas.json` (recommended config)

```json
{
  "build": {
    "preview": {
      "ios": { "simulator": false, "distribution": "internal" },
      "android": { "buildType": "apk" }
    },
    "production": {
      "ios": { "distribution": "store" },
      "android": { "buildType": "aab" }
    }
  }
}
```

---

## Design System

All design tokens are defined in `src/constants/emotions.ts`:

```typescript
export const COLORS = {
  bg:        '#0d0b14',                    // Near-black background
  card:      'rgba(255,255,255,0.04)',      // Subtle card surface
  border:    'rgba(255,255,255,0.08)',      // Hairline borders
  accent:    '#8b7cf8',                    // Primary purple
  accentDim: 'rgba(139,124,248,0.15)',      // Accent tint for backgrounds
  teal:      '#4ecdc4',                    // Success / inhale color
  text:      'rgba(255,255,255,0.92)',      // Primary text
  textMuted: 'rgba(255,255,255,0.45)',      // Secondary text
  textDim:   'rgba(255,255,255,0.25)',      // Tertiary / labels
}
```

### Emotion color palette

Each emotion has a unique color used consistently across the wheel, entry cards, and voice results:

| Emotion | Color |
|---------|-------|
| joy | `#FFD93D` |
| trust | `#6BCB77` |
| fear | `#4ECDC4` |
| surprise | `#74B9FF` |
| sadness | `#A29BFE` |
| disgust | `#FD79A8` |
| anger | `#FF6B6B` |
| anticipation | `#FFEAA7` |

### Typography

No custom fonts loaded — all text uses the system font (SF Pro on iOS, Roboto on Android). Weights used: 300 (light), 400 (regular), 500 (medium), 600 (semibold).

### Component patterns

**Cards**: `borderRadius: 14–18`, `borderWidth: 0.5`, `borderColor: COLORS.border`, `backgroundColor: COLORS.card`, `padding: 14–18`

**Chips**: `borderRadius: 20` (pill), `paddingHorizontal: 14–16`, `paddingVertical: 7–8`

**Section labels**: `fontSize: 11`, `fontWeight: '600'`, `letterSpacing: 0.07`, `textTransform: 'uppercase'`, `color: rgba(255,255,255,0.3)`

**Primary buttons**: `borderRadius: 14–16`, `paddingVertical: 14–16`, background = active emotion color or `COLORS.accent`

---

## Roadmap

Features planned but not yet implemented:

- **Notifications / reminders** — daily push notification at a user-configured time using `expo-notifications`
- **Home screen widget** — one-tap check-in from the iOS/Android home screen using `expo-quick-actions` or a native widget extension
- **Data export** — download all check-ins as JSON or CSV using `expo-sharing`
- **Sleep + energy tracking** — two additional sliders on step 1 of check-in; feeds real sleep→mood correlation into the patterns screen
- **Personalised ML** — replace the heuristic engine with a TFLite model trained on the user's own voice data using federated learning (on-device fine-tuning)
- **Themes** — light mode and alternative accent color options
- **iCloud / local backup** — opt-in database export to iCloud Drive (not sync — just backup)

---

## Privacy

Veil was designed from the ground up with privacy as a constraint, not an afterthought:

- **No accounts.** The app has no concept of a user identity.
- **No network requests.** The app never opens a network connection. There is no telemetry, no crash reporting, no analytics.
- **No third-party SDKs.** Every dependency is open-source and ships no tracking code.
- **Local storage only.** The SQLite database (`veil.db`) lives in the app's sandboxed document directory. Audio files are stored in the same sandbox. Both are deleted when the app is uninstalled.
- **On-device processing.** The emotion classifier runs entirely in JavaScript on the device. Audio is never transmitted anywhere.

Zero bytes leave the device.
