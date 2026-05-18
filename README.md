# Veil — Emotion Tracking App

> **Lift the veil. Understand yourself.**
> A fully offline, privacy-first mobile application for iOS and Android that tracks emotions through daily check-ins, voice journaling, and breathing exercises — and surfaces personal patterns using two bundled on-device ML models with on-device personalisation.

---

## Table of Contents

1. [Overview](#overview)
2. [Core Philosophy](#core-philosophy)
3. [Features](#features)
4. [Tech Stack](#tech-stack)
5. [Project Structure](#project-structure)
6. [Architecture](#architecture)
7. [ML Models](#ml-models)
   - [Audio Emotion Classifier](#audio-emotion-classifier-veil-audio-prototype-net-v2)
   - [On-device Fine-tuning](#on-device-fine-tuning)
   - [Pattern Model](#pattern-model-veil-pattern-bayes-net-v2)
8. [Database Schema](#database-schema)
9. [State Management](#state-management)
10. [Animation System](#animation-system)
11. [Theme System](#theme-system)
12. [Screens](#screens)
13. [Getting Started](#getting-started)
14. [Build & Deploy](#build--deploy)
15. [Design System](#design-system)
16. [Roadmap](#roadmap)
17. [Privacy](#privacy)

---

## Overview

Veil is a React Native (Expo) application that helps users track and understand their emotional state. It combines manual check-ins with acoustic voice analysis, breathing exercises, and ML-driven pattern recognition — all running entirely on-device. No accounts, no network requests, no cloud.

The core loop: check in → journal by voice → see patterns emerge → breathe when needed.

---

## Core Philosophy

### Privacy-first by design
All user data lives in a SQLite database on the device. Audio recordings stay in the local filesystem sandbox. The app opens zero network connections. Uninstalling removes everything.

### Two bundled ML models with on-device personalisation
Both the audio emotion classifier (`localEmotionModel.ts`) and the pattern detector (`patternModel.ts`) are hand-crafted TypeScript models with embedded weights. No TensorFlow, no ONNX, no model downloads. Classification happens synchronously on the JS thread in under 1ms. The audio model fine-tunes its prototype centres on every confirmed voice entry — personalising to each user’s voice without leaving the device.

### No state management library
The global store (`useStore.ts`) is implemented from scratch using React hooks. It provides a selector API identical to Zustand without `import.meta`, which is incompatible with Hermes. No external dependency, no build-time issues.

### Full theme support
Every color in the app is token-driven. The user can switch between dark and light mode from Settings; the preference is persisted to SQLite and applied immediately across all screens and components including the SVG PlutchikWheel.

---

## Features

### ◎ Check-in (2-step flow)
**Step 1 — Emotion + Intensity**
- **Plutchik Wheel** built with `react-native-svg`. Supports two interaction modes simultaneously: tap a sector to select, or slide a finger around the ring to sweep through emotions. Internally, the gesture handler distinguishes taps from drags by tracking total translation distance — below 8px is a tap (uses `beginEid`), above is a drag (uses live `emotionAtPoint`). Both modes highlight the sector in real time and show a radial gradient glow in the centre. The centre fill and label colours adapt to the active theme.
- **Intensity slider** built with Reanimated + Gesture Handler. The thumb, fill bar, and floating badge all animate on the UI thread (zero JS bridge crossings during drag). Snaps to the nearest integer step with a spring on release. Syncs position via `withSpring` when the value changes externally (e.g. after save+reset).
- **Weekly Digest** — a compact stats row that appears automatically when ≥2 check-ins exist in the current week: check-in count, average mood, most-felt emotion.

**Step 2 — Context**
- 8 predefined trigger chips with spring press animations.
- **"other +"** chip opens an inline `TextInput` that slides down via Reanimated `withSpring`. The custom trigger is stored as a `#hashtag` prefix in the note field.
- Free-text note field.
- Step transitions use RN `Animated.timing` fade (130ms out → swap content → 200ms in), chosen over Reanimated to avoid gesture conflicts.

### ◈ Journal
Scrollable check-in history. Fixed header with entry count badge. `FlatList` fills the remaining space — only the list scrolls, not the screen. Each `EntryCard` has a spring press animation via Reanimated.

### ◉ Patterns
Scrollable analytics dashboard combining data from both check-ins and confirmed voice entries:

**Mood Calendar (heatmap)**
A 10-week × 7-day GitHub-style grid. Each cell is coloured by average intensity for that day using the theme accent colour as the positive end. Built from plain RN `View` components — no charting library.

**Veil Notices**
Appears automatically at ≥5 entries. Finds the day of week with the lowest vs highest average intensity and generates a human-readable sentence from real data.

**ML Patterns**
The `veil-pattern-bayes-net-v2` model computes patterns from the union of check-ins and voice entries. Each pattern is a trigger → emotion pair scored by statistical lift, intensity delta, recency decay, and observation reliability. Animated bars stagger in with `withDelay(i × 120ms, withTiming(..., Easing.out(Easing.cubic)))`.

**Stats grid** — total entries, current streak, 7-day average intensity, top emotion across all sources.

### ◐ Voice Journal
Full recording and analysis pipeline:

1. Requests microphone permission once. Configures audio session explicitly (not via preset spread, which caused crashes on some devices).
2. Records with `isMeteringEnabled: true`. Samples amplitude every 100ms.
3. Live waveform: bars stored in `useState`, updated each polling tick — bars animate in real time.
4. Mic ring pulses with `withRepeat(withSequence(up, down), -1)` — no recursive callbacks.
5. On stop, passes samples through `extractFeatures()` → `classifyEmotionWithLocalModel()`. The classifier uses the current fine-tuned prototype centres, so it improves with each confirmed recording.
6. Result card slides in from below with `withSpring` on `opacity + translateY`.
7. User can **correct** the detected emotion by tapping any of the 8 choice chips before saving. The original model output is preserved as `model_emotion`; the user-chosen (or confirmed) emotion is stored as `detected_emotion`.
8. On save, `addVoiceEntry` automatically calls `applyConfirmation()` to fine-tune the model and persists the updated prototype centres to SQLite.
9. All acoustic features plus model version are persisted to `voice_entries`.

### ◌ Breathe
Guided 4-7-8 breathing: 4s inhale → 7s hold → 8s exhale → 2s pause, 3 cycles.

- Ring border and inner background interpolate smoothly between 6 colours (one per phase) using `interpolateColor` in a Reanimated worklet. Colours are computed from the active theme at render time — light theme gets softer tints.
- Inner circle scales via `withTiming(Easing.inOut(Easing.sin))`.
- Count digit pulses on each tick: opacity 1 → 0.35 → 1 with `withTiming`.
- Countdown timer via `setInterval` with a ref; cleaned up on unmount.

### ⚙ Settings
- **Theme toggle** — dark / light, with a mini screen preview for each.
- **Language selector** — English / Russian cards with flag emoji. Switching language is instant — the entire UI re-renders from the store. Preference persisted to `app_settings` in SQLite and restored on boot. Translated: all tab labels, all screen titles and subtitles, emotion names (Plutchik wheel + cards + voice result), trigger names (chips + journal cards + pattern labels), breathing phases, all confirmation dialogs and alert messages.
- **Personalisation card** — shows total voice confirmations, a progress bar (50 confirmations = fully personalised), a per-emotion bar chart, and a "reset personalisation" button.
- **Data management** — separate destructive actions for clearing check-ins, voice entries, or all data. All labels and confirmation dialogs are translated.
- **About** — version, model names, storage policy, network status.

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | React Native | 0.81.5 |
| Expo SDK | Expo | ~54.0.33 |
| Navigation | Expo Router (file-based, tabs) | ~6.0.23 |
| Language | TypeScript | ~5.9.2 |
| Runtime | React | 19.1.0 |
| Database | expo-sqlite (async WAL) | ~16.0.10 |
| Audio | expo-av | ~16.0.8 |
| Animations | react-native-reanimated | ~4.1.1 |
| Gestures | react-native-gesture-handler | ~2.28.0 |
| Vector graphics | react-native-svg | 15.12.1 |
| State management | Custom pub-sub hook | — |
| Audio ML model | veil-audio-prototype-net-v2 | bundled TS |
| Fine-tuning | EMA prototype update | on-device |
| Pattern ML model | veil-pattern-bayes-net-v2 | bundled TS |
| Localisation | Custom i18n (EN / RU) | bundled |
| Export / Import | expo-sharing + expo-document-picker | ~12.0.6 / ~14.0.8 |

---

## Project Structure

```
veil/
├── app/
│   ├── _layout.tsx               # Root: GestureHandlerRootView, DB init, loading/error screen
│   └── (tabs)/
│       ├── _layout.tsx           # Tab bar with theme-aware sceneStyle, SettingsIcon
│       ├── index.tsx             # ◎ Check-in (2-step: wheel+intensity → triggers+note)
│       ├── journal.tsx           # ◈ Journal (FlatList, fixed header)
│       ├── insights.tsx          # ◉ Patterns (heatmap, ML patterns, stats)
│       ├── voice.tsx             # ◐ Voice journal (record → classify → correct → save)
│       ├── breathe.tsx           # ◌ Breathe (4-7-8, interpolateColor phases)
│       └── settings.tsx          # ⚙ Settings (theme, data management, about)
│
├── src/
│   ├── types/index.ts            # All TS types: EmotionId, CheckIn, VoiceEntry, ThemeMode…
│   │
│   ├── constants/emotions.ts     # EMOTIONS, TRIGGERS, palettes, getThemeColors, getEmotionLabel
│   │
│   ├── i18n/
│   │   ├── translations.ts       # All UI strings for EN and RU; Lang type; pluralRu helper
│   │   └── useTranslation.ts     # useTranslation() hook; useTranslationSection() hook
│   │
│   ├── engine/
│   │   ├── emotionEngine.ts      # Public API: dbToAmplitude, extractFeatures, classifyEmotion
│   │   ├── localEmotionModel.ts  # veil-audio-prototype-net-v2: prototypes, fine-tuning, EMA update
│   │   └── patternModel.ts       # veil-pattern-bayes-net-v2: trigger→emotion scoring
│   │
│   ├── db/
│   │   ├── database.ts           # openDatabaseAsync, schema, column migration guards
│   │   ├── queries.ts            # All SQL: CRUD, analytics, theme/lang persistence
│   │   └── exportImport.ts       # Export to JSON (expo-sharing) + import (expo-document-picker)
│   │
│   ├── store/useStore.ts         # Global pub-sub store: state, actions, useVeilStore hook
│   │
│   └── components/
│       ├── PlutchikWheel.tsx     # SVG wheel: Gesture.Race(Tap,Pan), theme-aware colours
│       ├── EntryCard.tsx         # Journal card: Reanimated spring press, theme-aware
│       ├── FadeScreen.tsx        # Tab fade wrapper: useFocusEffect + withTiming opacity
│       └── SettingsIcon.tsx      # SVG gear: 8 teeth, computed with cos/sin, hollow centre
│
├── assets/images/
│   ├── icon.png                  # 1024×1024, dark bg, ◎ glyph
│   ├── adaptive-icon.png         # Android adaptive foreground
│   └── splash-icon.png           # Dark splash, centred ◎
│
├── app.json                      # userInterfaceStyle: dark, splash bg #0d0b14
├── babel.config.js               # babel-preset-expo (handles Hermes compat)
├── tsconfig.json
└── package.json
```

---

## Architecture

### Data flow

```
User action (tap, swipe, record)
        │
        ▼
React component → calls store action
        │
        ▼
useStore action (addCheckIn / addVoiceEntry / setThemeMode / resetAllData…)
        │  writes to
        ▼
expo-sqlite  →  veil.db  (WAL mode, localtime timestamps)
        │  then calls loadAll()
        ▼
Promise.all([
  fetchCheckIns(200),
  fetchVoiceEntries(20),
  computeWeeklyStats(),
  fetchDailyMood(14),
  fetchDailyMood(70),
  fetchThemeMode(),
])
        │
        ▼
setState(patch)  →  notifies all listeners
        │
        ▼
useVeilStore selectors → components re-render
```

### Intensity slider pipeline

```
Finger moves
      │
      ▼
Gesture.Pan.onChange  (UI thread — Reanimated worklet)
  clampX() → posX.value = x                 // thumb + fill + badge move at 60fps
  runOnJS(onChange)(calcVal(x, w))           // JS bridge only when integer step changes
      │
onEnd:  withSpring(snap position)            // spring to nearest step
```

### Plutchik Wheel gesture pipeline

```
Gesture.Race(Tap, Pan):

Tap  (maxDistance 12px, maxDuration 500ms)
  onStart  →  emotionAtPoint(x,y)  →  onSelect(eid)

Pan  (minDistance 10px)
  onBegin  →  setHovered(emotionAtPoint)       // immediate feedback on touch
  onUpdate →  setHovered(emotionAtPoint)       // live highlight as finger moves
  onEnd    →  emotionAtPoint(lift pos)  →  onSelect(eid)
  onFinalize →  setHovered(null)               // always clears hover

Race result: quick touch → Tap wins; drag → Pan wins
Separate state machines eliminate post-drag tap recognition failures
```

### Voice classification pipeline

```
expo-av metering (100ms intervals)
      │  dbToAmplitude(): -60..0 dBFS → 0..1
      ▼
extractFeatures(samples[])
  percentile(p10, p50, p90)
  → energy, variance, tempo, peakRatio
  → dynamicRange, attack, silenceRatio, stability
  → arousal (linear combo)
  → valenceProxy (linear combo)
      │
      ▼
classifyEmotionWithLocalModel(features)
  buildModelInput() → 10-dim vector
  prototypeLogit()  → weighted squared distance to each prototype
  applyAcousticEvidence() → rule-based logit adjustments
  softmax(temperature=0.68)
  → probabilities[8], confidence, modelVersion
      │
      ▼
User reviews result, optionally corrects emotion
      │
      ▼
addVoiceEntry(path, corrected_emotion, model_emotion, confidence, features, duration, version)
      │
      ▼
applyConfirmation(features, confirmedEmotion, modelEmotion, prevState)
  → EMA update of prototype centres (in-memory + SQLite)
  → updated FineTuningState stored in model_finetune table
      │
      ▼
patternModel reads voice_entries alongside checkins
```

---

## ML Models

### Audio Emotion Classifier (`veil-audio-prototype-net-v2`)

**File:** `src/engine/localEmotionModel.ts`

A prototype network with an acoustic evidence adjustment layer. Entirely static TypeScript — no runtime, no file I/O.

#### Architecture

**Layer 1 — Feature engineering** (`buildModelInput`)

Eight raw acoustic features are first combined into two derived dimensions:

```
arousal      = energy×0.34 + variance×0.20 + tempo×0.18 + attack×0.16
             + peakRatio×0.12 − silenceRatio×0.18

valenceProxy = stability×0.38 + (1−silenceRatio)×0.20
             + (1−|energy−0.56|)×0.18 + (1−|tempo−0.5|)×0.12
             + peakRatio×0.12 − dynamicRange×0.18
```

These join the 8 raw features to form a 10-dimensional input vector:
`[arousal, valenceProxy, energy, variance, tempo, peakRatio, dynamicRange, attack, silenceRatio, stability]`

**Layer 2 — Prototype distance** (`prototypeLogit`)

Each of the 8 emotions has a learned prototype (centre vector) and per-dimension weights. The logit for each emotion is:

```
logit_e = bias_e − Σ_i  weight_{e,i} × (input_i − center_{e,i})²
```

Higher logit = input is closer to the prototype in weighted feature space.

**Layer 3 — Acoustic evidence adjustment** (`applyAcousticEvidence`)

Rule-based logit corrections derived from known acoustic correlates of emotion. Examples:

```
anger      += high(energy, 0.62) × high(peakRatio, 0.48) × high(attack, 0.42)
              × low(stability, 0.48) × 3.2

sadness    += low(arousal, 0.38) × high(silenceRatio, 0.32) × low(energy, 0.34) × 1.15

trust      += high(stability, 0.68) × low(arousal, 0.52) × high(valenceProxy, 0.64) × 0.85
```

`high(v, t)` and `low(v, t)` are soft threshold functions — continuous, not binary.

**Layer 4 — Softmax + confidence**

Softmax with temperature 0.68 (sharpens the distribution). Confidence is computed from the probability margin:

```
confidence = clamp(0.42 + margin×0.92 + topProb×0.18,  min=0.42, max=0.92)
```

#### Feature extraction detail (`src/engine/emotionEngine.ts`)

| Feature | Computation | Meaning |
|---|---|---|
| `energy` | mean amplitude | overall loudness / activation |
| `variance` | σ × 2.8 | expressiveness, pitch variation |
| `tempo` | zero-crossings of median × 2.4 | speaking pace, agitation |
| `peakRatio` | samples ≥ max(p90×0.86, peak×0.62) | sustained loudness |
| `dynamicRange` | (p90 − p10) × 2.4 | amplitude range |
| `attack` | mean positive delta × 9 | sharpness of onsets |
| `silenceRatio` | samples ≤ max(0.06, p50×0.42) | pauses, hesitation |
| `stability` | 1 − (σ×2.2 + mean\|Δ\|×4) | evenness of delivery |

Percentiles (p10, p50, p90) are computed on the sorted sample array using linear interpolation.

#### Accuracy

Heuristic signal-processing, not a data-trained deep model. Typical performance:
- **High-contrast states** (calm vs angry, sad vs joyful): ~70–80%
- **Similar-arousal states** (fear vs surprise, trust vs anticipation): ~55–65%

Intentional trade-off: demonstrates audio analysis without pretending to replace a trained model. The user correction flow is the designed response to classifier uncertainty.

---

### On-device Fine-tuning

**File:** `src/engine/localEmotionModel.ts`

Every time the user saves a voice entry (confirming or correcting the model’s prediction), the prototype centres are updated using Exponential Moving Average with a decaying learning rate. No data leaves the device; the updated weights are persisted to SQLite and loaded back on next launch.

#### Algorithm

**Confirmation** (user agrees with the model’s prediction):

```
lr  = max(0.015,  0.12 / (1 + count×0.06))
center[e][i]  = (1 − lr) × center[e][i]  +  lr × input[i]   for each dimension i
count[e]  += 1
```

Learning rate schedule: 1st example ≈ 12%, 10th ≈ 7%, 50th ≈ 3.5%, 100th ≈ 2%. Asymptotes to the minimum `0.015` — the model never stops adapting, just becomes more conservative.

**Correction** (user changes the detected emotion from `wrong` to `correct`):

```
// Pull correct prototype toward the user’s voice
lr_c = max(0.015,  0.16 / (1 + count[correct]×0.06))
center[correct][i] = (1 − lr_c) × center[correct][i] + lr_c × input[i]

// Gently push the wrong prototype away
center[wrong][i]   = clamp((1 + 0.04) × center[wrong][i] − 0.04 × input[i])
```

All 10 dimensions of the input vector are updated simultaneously and clamped to [0, 1].

#### Persistence

The `FineTuningState` is a single JSON blob in the `model_finetune` SQLite table:

```typescript
interface FineTuningState {
  centers: Record<EmotionId, number[]>;   // 8 × 10 fine-tuned prototype centres
  counts:  Record<EmotionId, number>;     // confirmation count per emotion
  totalConfirmations: number;
  baseModelVersion: string;               // must match MODEL_VERSION to apply
  lastUpdated: string | null;             // ISO timestamp
}
```

On app boot, `initModelFromState(state)` replaces the module-level `currentCenters` with persisted values. The model uses these throughout the session. `resetModelToDefaults()` restores bundled PROTOTYPES centres without touching the DB — `resetFineTuning()` in the store also clears the DB row.

#### UI (Settings → Personalisation)

- Empty state: prompt to save voice entries
- Active state: progress bar (0–50 confirmations → 0–100%), per-emotion mini bar chart with count, reset button guarded by `Alert.alert`

---

**File:** `src/engine/patternModel.ts`

A statistical lift model with Bayesian smoothing and decay, combining check-ins and voice entries.

#### Pipeline

For each trigger that appears in the data:

1. **Dominant emotion** — the emotion most frequently co-occurring with that trigger
2. **Feature extraction:**

| Feature | Formula | Meaning |
|---|---|---|
| `support` | log(count+1) / log(total+1) | relative frequency of this trigger |
| `lift` | (smoothed trigger rate − 0.75) / 2.25 | how much above baseline the emotion appears |
| `intensityDelta` | (avg intensity − global avg + 4) / 8 | whether this trigger correlates with intensity |
| `recency` | exp(−ageDays / 21) | exponential decay — older patterns worth less |
| `consistency` | smoothed trigger→emotion rate | reliability of the association |
| `reliability` | √(n / (n+6)) | Wilson-style shrinkage for small samples |

Bayesian smoothing (`smoothedRate`): adds 1 success + 2 observations as a prior, preventing overconfidence from small counts.

3. **Scoring** — logistic function applied to a dot product with learned weights:

```
logit = support×0.72 + lift×1.28 + intensityDelta×0.58
      + recency×0.50 + consistency×0.80 + reliability×1.10 − 1.42

score = 0.25 + sigmoid(logit) × 0.68        → [0.25, 0.93]
```

4. **Voice entry contribution** — voice entries are converted to `PatternEntry` with `trigger = 'voice journal'` and intensity derived from `voicePatternIntensity()`, which computes an arousal proxy from acoustic features.

Top 4 patterns by score are returned and displayed as animated bars.

---

## Database Schema

**Engine:** SQLite via `expo-sqlite` v16 async API  
**Mode:** WAL (Write-Ahead Logging) for concurrent read performance  
**Migrations:** additive only — guarded `ALTER TABLE` calls on startup check existing columns via `PRAGMA table_info`

### `checkins`

| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER PK | autoincrement |
| `emotion` | TEXT | EmotionId (one of 8 values) |
| `intensity` | INTEGER | 1–10 |
| `triggers` | TEXT | JSON array, e.g. `["work","sleep"]`; custom trigger stored in `note` as `#tag` |
| `note` | TEXT | free text + optional `#other-trigger` prefix |
| `created_at` | TEXT | `datetime('now','localtime')` |

### `voice_entries`

| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER PK | autoincrement |
| `audio_path` | TEXT | local file URI from expo-av |
| `detected_emotion` | TEXT | user-confirmed emotion (may differ from model output) |
| `model_emotion` | TEXT | raw model prediction before user correction |
| `confidence` | REAL | 0.42–0.92 from classifier |
| `energy` | REAL | acoustic feature 0–1 |
| `variance` | REAL | acoustic feature 0–1 |
| `tempo` | REAL | acoustic feature 0–1 |
| `peak_ratio` | REAL | acoustic feature 0–1 |
| `dynamic_range` | REAL | acoustic feature 0–1 |
| `attack` | REAL | acoustic feature 0–1 |
| `silence_ratio` | REAL | acoustic feature 0–1 |
| `stability` | REAL | acoustic feature 0–1 |
| `model_version` | TEXT | e.g. `veil-audio-prototype-net-v2` |
| `duration_seconds` | INTEGER | recording length |
| `created_at` | TEXT | `datetime('now','localtime')` |

### `model_finetune`

| Column | Type | Notes |
|---|---|---|
| `key` | TEXT PK | always `'state'` |
| `value` | TEXT | JSON-encoded `FineTuningState` |
| `updated_at` | TEXT | last write timestamp |

Uses upsert — at most one row exists at all times.

### `app_settings`

| Column | Type | Notes |
|---|---|---|
| `key` | TEXT PK | e.g. `'theme_mode'` |
| `value` | TEXT | stored value |
| `updated_at` | TEXT | last write timestamp |

Uses `INSERT … ON CONFLICT(key) DO UPDATE` (upsert) for all writes.

### Indexes

```sql
CREATE INDEX idx_checkins_created ON checkins(created_at DESC);
CREATE INDEX idx_voice_created    ON voice_entries(created_at DESC);
```

---

## State Management

**File:** `src/store/useStore.ts`

A module-level pub-sub singleton. No external dependency, no `import.meta`.

```
module-level `state` object  ←→  `setState(patch)` → notifies all listeners
                                  ↓
useVeilStore<T>(selector) hook  →  subscribes on mount, unsubscribes on unmount
                                    re-renders only the subscribing component
```

### Actions

| Action | What it does |
|---|---|
| `loadAll()` | `Promise.all` of 7 queries (incl. `loadFineTuningState`), then `setState` + `initModelFromState` |
| `addCheckIn()` | insert → loadAll |
| `addVoiceEntry()` | insert → `applyConfirmation()` → `saveFineTuningState()` → loadAll |
| `setThemeMode(mode)` | `setState` immediately + `saveThemeMode()` to SQLite |
| `resetCheckIns()` | `DELETE FROM checkins` → loadAll |
| `resetVoiceEntries()` | `DELETE FROM voice_entries` → loadAll |
| `resetAllData()` | both DELETEs + `clearFineTuningState()` + `resetModelToDefaults()` → loadAll |
| `resetFineTuning()` | `clearFineTuningState()` + `resetModelToDefaults()` → setState |

### Why not Zustand?

Zustand v4.4+ uses `import.meta.env` in its ESM entry point. Hermes (RN's JS engine) does not support `import.meta`. The babel-preset-expo polyfill (`unstable_transformImportMeta`) was unreliable across devices during development. The custom implementation avoids the issue entirely, and the API is identical to Zustand's selector pattern.

---

## Animation System

Every animated interaction in the app and its implementation:

| Interaction | Library | Technique |
|---|---|---|
| Loading screen logo | RN Animated | `Animated.loop(sequence([timing 0.35, timing 1]))` |
| Step 1→2 transition | RN Animated | `timing(0, 130ms)` → setStep → `timing(1, 200ms)` via callback |
| "other +" slide-in | Reanimated | `withSpring` on `opacity + translateY` via `useAnimatedStyle` |
| Button press | Reanimated | `Pressable` + `withSpring(0.96)` / `withSpring(1)` |
| Chip press | Reanimated | `withSpring(0.93)` / `withSpring(1)` |
| Intensity slider | Reanimated | UI-thread `Pan` gesture; thumb/fill/badge via `useAnimatedStyle` |
| Slider snap | Reanimated | `withSpring(snapX, {damping:22, stiffness:380})` on `onEnd` |
| Plutchik hover | React state | `setHovered()` called from `runOnJS` in `Pan.onChange` |
| Tab fade-in | Reanimated | `FadeScreen` + `useFocusEffect` + `withTiming(1, 180ms)` |
| EntryCard press | Reanimated | `withSpring(0.975)` / `withSpring(1)` |
| Voice mic pulse | Reanimated | `withRepeat(withSequence(up 700ms, down 700ms), -1)` |
| Voice result card | Reanimated | `withSpring(1)` on `opacity + translateY` (starts at 28px below) |
| Pattern bars | Reanimated | `withDelay(i×120, withTiming(target, 700ms, Easing.out(Easing.cubic)))` |
| Breathe ring colour | Reanimated | `interpolateColor(phaseProgress, [0..5], RING_COLORS)` |
| Breathe scale | Reanimated | `withTiming(1.15 or 1, Easing.inOut(Easing.sin))` |
| Breathe count pulse | Reanimated | `withTiming(0.35, 80ms)` → `withTiming(1, 160ms)` on each tick |
| Settings row press | Reanimated | `withSpring(0.98)` / `withSpring(1)` |
| Theme card press | Reanimated | `withSpring(0.97)` / `withSpring(1)` |

---

## Theme System

**Files:** `src/constants/emotions.ts`, `src/store/useStore.ts`, `src/db/queries.ts`

### ThemeColors type

```typescript
type ThemeColors = {
  bg:               string;   // screen background
  card:             string;   // card surface
  border:           string;   // hairline borders and dividers
  accent:           string;   // primary brand colour
  accentDim:        string;   // accent at low opacity (chip bg, logo bg)
  teal:             string;   // success / inhale colour
  text:             string;   // primary text
  textMuted:        string;   // secondary text
  textDim:          string;   // tertiary / labels / placeholders
  input:            string;   // text input background
  chip:             string;   // inactive chip background
  chipActive:       string;   // active chip background
  chipBorderActive: string;   // active chip border
  chipTextActive:   string;   // text inside active chip
  textOnAccent:     string;   // text on accent-coloured buttons
  wheelCenter:      string;   // PlutchikWheel centre fill
  danger:           string;   // destructive action colour
};
```

### Palettes

| Token | Dark | Light |
|---|---|---|
| `bg` | `#0d0b14` | `#f5f1eb` |
| `accent` | `#8b7cf8` | `#6c5dd3` |
| `teal` | `#4ecdc4` | `#1a9e96` |
| `text` | `rgba(255,255,255,0.92)` | `rgba(20,15,35,0.92)` |
| `textMuted` | `rgba(255,255,255,0.45)` | `rgba(20,15,35,0.62)` |
| `textDim` | `rgba(255,255,255,0.25)` | `rgba(20,15,35,0.42)` |
| `border` | `rgba(255,255,255,0.08)` | `rgba(20,15,35,0.14)` |
| `card` | `rgba(255,255,255,0.04)` | `rgba(20,15,35,0.07)` |
| `input` | `rgba(255,255,255,0.04)` | `#e8e4dc` |
| `chipTextActive` | `#c4b8ff` | `#6c5dd3` |
| `textOnAccent` | `#0d0b14` | `#ffffff` |
| `wheelCenter` | `#1a1625` | `#ede9e2` |
| `danger` | `#FF6B6B` | `#b32020` |

For emotion colors in text on light theme: `getEmotionColorForText(id, isLight)` returns dark high-contrast variants instead of the original pastels. Used in `EntryCard`, `voice.tsx`, `insights.tsx`, `index.tsx`.

| Emotion | Original (dark) | Text on light |
|---|---|---|
| joy | `#FFD93D` | `#7a5800` |
| trust | `#6BCB77` | `#1a6b2a` |
| fear | `#4ECDC4` | `#0a6460` |
| surprise | `#74B9FF` | `#0a52a0` |
| sadness | `#A29BFE` | `#4232b0` |
| disgust | `#FD79A8` | `#a00e50` |
| anger | `#FF6B6B` | `#a01818` |
| anticipation | `#FFEAA7` | `#6e4e00` |

The `theme` object is selected from the store in every screen and component: `const t = useVeilStore(s => s.theme)`. All dynamic colours are passed inline (`style={{ color: t.text }}`). Static layout values (padding, borderRadius, flex) remain in `StyleSheet.create`. The `FadeScreen` wrapper reads `theme.bg` from the store to prevent background flash during tab transitions.

---

## Screens

### `app/_layout.tsx` — Root Layout

Wraps everything in `GestureHandlerRootView`. Three render states:
- **Loading**: dark/light screen with `◎` logo, animated opacity pulse (RN Animated loop), and slide-up entrance via `Animated.spring`
- **Error**: error message with "Try again" button; re-runs `initDatabase() → loadAll()`
- **Ready**: renders the Expo Router `<Stack>`

### `app/(tabs)/_layout.tsx` — Tab Bar

Six tabs. `sceneStyle: { backgroundColor: theme.bg }` prevents white flash between tab renders. `SettingsIcon` is a custom SVG gear (8 teeth + hollow centre ring), computed with `cos/sin` to match the app's circle aesthetic. All other tab icons are Unicode symbols rendered as Text.

### `app/(tabs)/index.tsx` — Check-in

2-step flow controlled by `step: 1 | 2`. RN `Animated.Value` fade between steps (no Reanimated — avoids gesture conflicts). `PlutchikWheel`, `IntensitySlider`, `WeeklyDigest`, and `AnimChip` are all defined in the same file for colocation.

### `app/(tabs)/journal.tsx` — Journal

`SafeAreaView` → fixed header → `FlatList` (flex: 1). The screen does not scroll; the list does.

### `app/(tabs)/insights.tsx` — Patterns

`ScrollView` wrapping all blocks. Data from both `checkIns` and `voiceEntries` is merged via `moodEntries = [...checkIns, ...voiceEntries mapped to common shape]`. All computed via `useMemo`. `AnimatedBar` components stagger in on mount.

### `app/(tabs)/voice.tsx` — Voice Journal

Recording phase machine: `idle → recording → processing → done → idle`. Cleanup `useEffect` stops the recording and clears the interval on unmount, preventing crashes when navigating away mid-recording.

### `app/(tabs)/breathe.tsx` — Breathe

`INNER_COLORS` array computed inside the component from `t.bg` and `t.teal`/`t.accent` — captured by the Reanimated worklet at render time, so theme changes are reflected after re-render.

### `app/(tabs)/settings.tsx` — Settings

`ActionRow` and `ThemeCard` are animated sub-components defined in the same file. Theme cards show a miniature screen preview (bar + circle + chip) rendered in the appropriate colours. Confirmation dialogs guard all data deletion actions.

---

## Getting Started

### Prerequisites

- **Node.js** 18 or 20 (not 22+)
- **Expo Go** app on device (SDK 54)
- **watchman** (macOS) — prevents `EMFILE: too many open files`

```bash
nvm install 20 && nvm use 20
brew install watchman   # macOS only
```

### Install & run

```bash
git clone <your-repo-url>
cd veil
npm install --legacy-peer-deps

npx expo start          # scan QR with Expo Go
npx expo start --clear  # if Metro hangs or after babel changes
```

### Common errors

| Error | Fix |
|---|---|
| `EMFILE: too many open files` | `brew install watchman` |
| `import.meta is not supported` | check `babel.config.js` uses `babel-preset-expo` |
| Project incompatible with Expo Go | ensure `"expo": "~54.0.33"` in package.json |
| SQLite `no such column` | DB migration runs on boot — cold-start the app once |
| Voice crash on first tap | grant microphone permission in iOS/Android Settings |

---

## Build & Deploy

```bash
npm install -g eas-cli
eas login
eas build:configure

# iOS — ad-hoc (TestFlight / device)
eas build --platform ios --profile preview

# iOS — App Store
eas build --platform ios --profile production

# Android — APK (sideload)
eas build --platform android --profile preview

# Android — AAB (Play Store)
eas build --platform android --profile production
```

Recommended `eas.json`:

```json
{
  "build": {
    "preview": {
      "ios":     { "simulator": false, "distribution": "internal" },
      "android": { "buildType": "apk" }
    },
    "production": {
      "ios":     { "distribution": "store" },
      "android": { "buildType": "aab" }
    }
  }
}
```

---

## Design System

### Emotion colours

| Emotion | Colour |
|---|---|
| joy | `#FFD93D` |
| trust | `#6BCB77` |
| fear | `#4ECDC4` |
| surprise | `#74B9FF` |
| sadness | `#A29BFE` |
| disgust | `#FD79A8` |
| anger | `#FF6B6B` |
| anticipation | `#FFEAA7` |

### Component patterns

**Cards** — `borderRadius: 14–18`, `borderWidth: 0.5`, `borderColor: t.border`, `backgroundColor: t.card`, `padding: 14–18`

**Chips** — `borderRadius: 20` (pill), `paddingHorizontal: 14–16`, `paddingVertical: 7–8`

**Section labels** — `fontSize: 11`, `fontWeight: '600'`, `letterSpacing: 0.07`, `textTransform: 'uppercase'`, `color: t.textDim`

**Buttons** — `borderRadius: 14–16`, `paddingVertical: 14–16`, text colour `t.textOnAccent` (ensures contrast on both accent purple and bright emotion colours)

**Typography** — system font only (SF Pro on iOS, Roboto on Android). Weights: 300, 400, 500, 600.

---

### Localisation

**Files:** `src/i18n/translations.ts`, `src/i18n/useTranslation.ts`

A zero-dependency, compile-time-safe i18n system.

**Covered:** all UI strings across all 6 screens, tab labels, emotion names (on Plutchik Wheel, voice result, journal cards), trigger names (in chips, journal cards, pattern labels), breathing phase names and practice descriptions, alert dialogs, settings sections. Date/time formatting uses the native `toLocaleDateString(locale)` API.

**Russian-specific:** `pluralRu(n, one, few, many)` helper handles the three Russian plural forms: 1 подтверждение / 2 подтверждения / 5 подтверждений. Day-of-week headers in the heatmap calendar use Russian two-letter abbreviations (Пн/Вт/Ср…).

**Adding a language:** add a new key to `TRANSLATIONS` in `translations.ts`, add the `Lang` union type, add a `LangCard` in settings. No other files need changes.

---

## Export & Import

**File:** `src/db/exportImport.ts`

### Backup format

All data is exported as a single JSON file (`veil-backup-YYYY-MM-DD.json`) shared via the native share sheet:

```typescript
interface VeilBackupFile {
  veilBackup:    true;          // marker
  schemaVersion: number;         // currently 2
  exportedAt:    string;         // ISO timestamp
  appVersion:    string;         // "1.0.0"
  stats: {
    checkInsCount:     number;
    voiceEntriesCount: number;
  };
  settings: {
    themeMode: ThemeMode;        // 'dark' | 'light'
    lang:      Lang;             // 'en' | 'ru'
  };
  checkIns:        CheckIn[];   // complete, with triggers array
  voiceEntries:    VoiceEntry[]; // all acoustic features; audioPath = ""
  fineTuningState: FineTuningState | null;
}
```

`audioPath` is always empty in exports — audio files are device-specific filesystem paths and cannot be transferred meaningfully.

### Import modes

**Replace** — clears all existing check-ins and voice entries first, then inserts everything from the backup file. Fine-tuning and settings are replaced if the user chooses so.

**Merge** — inserts only entries whose `created_at` timestamp does not already exist in the database (`INSERT OR IGNORE`). Does not delete any existing data. Settings and fine-tuning are applied only if the user opts in.

### Import flow (Settings → Export & Import → Import)

1. **DocumentPicker** — user selects a `.json` file
2. **Validation** — checks `veilBackup: true`, `schemaVersion ≤ 2`, array shapes
3. **Alert 1** — shows backup date and counts, asks Replace / Merge / Cancel
4. **Alert 2** — asks whether to apply settings (theme + language) from backup
5. **Alert 3** — asks whether to apply ML personalisation weights from backup
6. **Apply** — runs in the JS thread; updates DB and in-memory store
7. **Success alert** — shows how many entries were imported

### Validation errors caught

- Not a JSON object
- `veilBackup` marker missing
- `schemaVersion` newer than app supports
- `checkIns` or `voiceEntries` not arrays
- `settings` object missing

---

## Home Screen Widget Plan

> **Status:** planned. Requires `npx expo prebuild` + EAS Build. Expo Go will stop working after prebuild — use `expo-dev-client` instead.

### Technical constraints

Home screen widgets are **native OS extensions**, not React components. They run in a separate process with no access to the JS runtime or SQLite directly.

- **iOS:** WidgetKit + SwiftUI (Widget Extension target in Xcode)
- **Android:** AppWidget framework + RemoteViews (XML layouts + Kotlin)
- **Data bridge:** a shared JSON payload written by the app to App Groups (iOS) / SharedPreferences (Android) after every check-in, voice entry, and on app launch

---

### Widget catalogue

#### 1. Quick Check-in `◎`
**Sizes:** Small (2×2), Medium (4×2)

Small shows the last emotion and a prompt. Medium adds a one-tap deep-link button. Tapping anywhere opens the app directly on the check-in wheel (`veil://checkin`). Updates every 15 minutes or immediately after a check-in.

```
[Small]
┌─────────────────────┐
│  ◎  veil            │
│                     │
│  how are you        │
│  feeling?           │
│                     │
│  fri, 16 may  9:41  │
└─────────────────────┘

[Medium]
┌───────────────────────────────────────┐
│  ◎ veil              fri, 16 may      │
│                                       │
│  last: ● joy   7/10   2h ago          │
│  ───────────────────────              │
│  [  how are you feeling?  →  ]        │
└───────────────────────────────────────┘
```

---

#### 2. Today's Mood `◈`
**Sizes:** Medium (4×2), Large (4×4)

Shows today's average intensity, entry count, streak, and top emotions. Large adds a 7-day mini heatmap. Tapping opens the Journal tab (`veil://journal`).

```
[Medium]
┌───────────────────────────────────────┐
│  today                streak: 🔥 7    │
│                                       │
│  ████████░░  7.4 / 10    3 entries    │
│                                       │
│  ● joy   ● trust   ● anticipation     │
└───────────────────────────────────────┘

[Large]
┌─────────────────────────────────────────┐
│  this week              streak: 🔥 7    │
│                                         │
│  M   T   W   T   F   S   S              │
│  ██  ██  ░░  ██  ██  ░░  ░░             │
│                                         │
│  today avg  ████████░░  7.4             │
│                                         │
│  ● joy ×3   most frequent               │
│  ● fear ×1                              │
└─────────────────────────────────────────┘
```

---

#### 3. Breathe `◌`
**Size:** Small (2×2)

Shows last session time. Tapping opens Breathe tab with autostart (`veil://breathe?autostart=1`). The `◌` glyph pulses slowly on iOS 17+ via SwiftUI animation.

```
┌─────────────────────┐
│         ◌           │
│                     │
│      breathe        │
│    4 · 7 · 8        │
│                     │
│  last: 2h ago       │
└─────────────────────┘
```

---

#### 4. Patterns Snapshot `◉`
**Size:** Large (4×4)

Shows the 10-week heatmap and top 2 ML patterns. Tapping opens the Patterns tab (`veil://patterns`). Updates once per day.

```
┌─────────────────────────────────────────┐
│  patterns                   ◉  veil     │
│                                         │
│  M  T  W  T  F  S  S  (× 10 weeks)      │
│  ░  ░  ░  ▓  ▓  ░  ░                    │
│  ░  ▒  ░  ▒  ▓  ░  ░                    │
│  ▓  ░  ▒  ▓  ▒  ░  ░                    │
│  ...                                    │
│                                         │
│  work → anger      ████████  82%        │
│  sleep → sadness   ██████░░  71%        │
└─────────────────────────────────────────┘
```

---

### Data bridge — `VeilWidgetPayload`

Written to the shared container after every state change. The native widget reads it synchronously without touching SQLite.

```typescript
interface VeilWidgetPayload {
  updatedAt:    string;              // ISO timestamp
  streak:       number;
  lastCheckin: {
    emotion:    EmotionId;
    intensity:  number;
    createdAt:  string;
    color:      string;              // hex — no logic in native code
  } | null;
  todayStats: {
    count:        number;
    avgIntensity: number;
    topEmotions:  { id: EmotionId; color: string; count: number }[];
  };
  weekMood:     (number | null)[];   // 7 values
  heatmap:      (number | null)[];   // 70 values (10 weeks × 7 days)
  topPatterns: {
    label: string;                   // already localised
    value: number;                   // 0–1
    color: string;
  }[];
  lastBreathAt: string | null;
  themeMode:    'dark' | 'light';
  lang:         'en' | 'ru';
}
```

Widget labels are pre-localised in the payload — the native layer renders strings, never translates them.

---

### Deep links

The `veil://` scheme is already registered in `app.json`.

| Widget | URL | Opens |
|---|---|---|
| Quick Check-in | `veil://checkin` | `/(tabs)/index` |
| Today's Mood | `veil://journal` | `/(tabs)/journal` |
| Breathe | `veil://breathe?autostart=1` | `/(tabs)/breathe` + auto-start |
| Patterns | `veil://patterns` | `/(tabs)/insights` |

---

### Implementation phases

| Phase | Work | Est. |
|---|---|---|
| 0 — Prebuild | `npx expo prebuild`, App Groups entitlements, EAS config | 1 day |
| 1 — Data bridge | Native module `VeilWidgetBridge` (Swift + Kotlin), `syncWidgetData()` in store | 2–3 days |
| 2 — iOS widgets | Widget Extension target, SwiftUI views for all 4 widgets × sizes | 4–5 days |
| 3 — Android widgets | `AppWidgetProvider`, RemoteViews XML layouts, `PendingIntent` deep links | 3–4 days |
| 4 — Config plugin | `plugins/withVeilWidget.ts` — automates Xcode target + AndroidManifest | 2 days |
| 5 — Deep links | `autostart` param handling in `breathe.tsx`, E2E test | 1 day |
| **Total** | | **~2 weeks** |

---

## Roadmap

### Platform
- **Push notifications** — daily check-in reminder at a user-configured time via `expo-notifications`
- **Home screen widget** — one-tap emotion log without opening the app
- **Sleep + energy inputs** — two extra sliders in check-in step 1; feeds real correlations into patterns
- **iPad layout** — two-column split view: wheel + journal side by side

### Intelligence (all on-device)
- **Emotion forecast** — based on weekday, time of day, and recent trend, show a soft prediction: "Historically you feel lower energy on Monday mornings" before the user even opens the wheel
- **Anomaly detection** — highlight days where the emotion or intensity is a significant outlier from the user's personal baseline; gentle nudge to journal more that day
- **Correlation explorer** — interactive chart: pick any two variables (trigger × emotion, time of day × intensity, sleep × mood) and see the personal correlation score computed from local data
- ✅ **Voice prosody trends** — energy, stability and tempo plotted as a smooth line chart over all voice recordings (chronological). Shows latest values with ↑↓→ vs previous entry. Subtle area fill, bezier curves, x-axis date labels. Card appears in Patterns tab after the first voice entry, with graceful empty state.
- **Emotion transition graph** — Sankey or chord diagram showing which emotions follow which across check-ins (e.g. anticipation → joy vs anticipation → fear split by trigger)

### Check-in UX
- **Quick emotions** — after 30+ check-ins, surface the user's top 3 most frequent emotions as one-tap shortcuts above the wheel
- **Context auto-tagging** — with permission, read time of day, day of week, and optionally calendar busyness (no event titles) to pre-suggest likely triggers
- **Streak freeze** — one grace day per week where a missed check-in doesn't break the streak; transparent and opt-in
- **Intensity history sparkline** — tiny inline chart on the check-in screen showing the last 7 days of intensity so the user can self-calibrate

### Depth features that competitors miss
- **Anonymous community heatmap** — opt-in aggregate mood map: "People in your timezone feel X on Monday mornings" — computed with differential privacy, no individual data shared, no server profile
- **Therapist export** — one-tap PDF report with anonymised patterns, weekly averages, and top triggers formatted for sharing with a mental health professional
- **Emotional vocabulary builder** — Plutchik secondary emotions: after 60+ check-ins, unlock the outer ring of the wheel (love, submission, awe, disapproval, remorse, contempt, aggressiveness, optimism) for finer-grained check-ins
- **"Why" prompts** — after selecting an emotion, occasionally surface a random short reflective prompt ("What would have made today feel different?") that feeds a separate private notes section, never used for ML
- **Retrospective view** — a "time machine" mode: pick any past week and re-live it entry by entry, with the patterns and insight callout computed only from data available at that point in time

---

## Privacy

- **No accounts.** No concept of user identity.
- **No network requests.** The app never calls any API. No telemetry, no crash reporting, no analytics.
- **No third-party tracking SDKs.**
- **Local storage only.** `veil.db` lives in the app's sandboxed document directory and is deleted on uninstall.
- **On-device ML.** Both models run synchronously in the JS thread. Audio is never transmitted.
- **Theme preference** is stored in the same local SQLite database. It never leaves the device.

Zero bytes leave the device.
