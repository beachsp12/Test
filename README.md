# Tire Air-Loss Check

A Next.js web app. You upload photos or video of each tire, and it tells you whether that tire shows visible damage that could make it **lose air**. You get a verdict for each tire, where the damage is, why it matters, and whether it's usually repairable, with citations to published tire-industry guidance.

## Setup

Requires Node.js 20 or newer.

```bash
npm install
cp .env.example .env.local
```

Open `.env.local` and paste your Anthropic API key:

```
ANTHROPIC_API_KEY=sk-ant-...
```

You can get a key at <https://console.anthropic.com/settings/keys>. The key is only read on the server, in `src/app/api/analyze/route.ts`, so it never reaches the browser. If the key is missing, the page shows a red "API key missing" banner and the API returns an error saying how to fix it.

## Run

```bash
npm run dev        # development server at http://localhost:3000
```

Production build:

```bash
npm run build
npm start
```

Type check only: `npm run typecheck`

## How it works

- **One upload section per tire:** front left, front right, rear left, rear right, plus an optional spare. Each section takes up to 10 photos and 2 videos.
- **Video:** the browser samples 10 frames spread evenly from the start of the clip to the end, so the whole tire surface is covered, not just the first frame. Only those frames are sent. The video itself never leaves your device. Clips can be up to 250 MB and 3 minutes long.
- **Photos:** resized in the browser to a long edge of 1568 px, which is the most detail the vision model uses.
- **Per-tire requests:** each tire goes to the server as its own request. Every image is labeled with its tire and source file, for example `[Front left tire] Video 1 ("clip.mp4"), frame 4 of 10 at 0:03.2`. Results can't get mixed up between tires.
- **Detection:** Claude (`claude-opus-5-5`) looks at the images and returns a structured result: verdict, confidence, issues with their location on the tire, which areas it could and couldn't see, and specific retake requests.
- **Repair or replace:** the model does **not** decide this. `src/lib/repairRules.ts` applies published rules to the type, zone and size the model reports, and attaches the source quotes.

**Why a vision LLM instead of a trained detector:** there's no public labeled dataset covering tire air-loss damage across tread, sidewall, bead and valve stem. A vision LLM handles all those categories, varied photos and plain-language explanations without collecting training data or running model infrastructure.

**Server-side fallback:** requests use Anthropic's server-side fallback, so if the main model declines a request it's retried automatically on a fallback model.

## Sources for repair guidance

These were checked against the original documents in November 2026:

| Rule | Source |
|---|---|
| Repairs only in the tread area; nothing reaching the shoulder/belt edge; max injury 1/4 in. (6 mm); plug **and** patch required, plug alone not acceptable; tire must be removed from the wheel; never repair over an existing improper repair; repairs can't overlap | [USTMA, *Puncture Repair Procedures for Passenger and Light Truck Tires* (2025)](https://www.ustires.org/system/files/2026-06/Puncture%20Repair%20Procedures%20for%20Passenger%20and%20Light%20Truck%20Tires.pdf) |
| Run-flat and some other tires may have stricter maker limits | [USTMA, *Tire Repair Basics*](https://www.ustires.org/tire-care-safety/tire-repair-basics) |
| Bulges from cord/ply separation, exposed cords, tread under 2/32 in. | [49 CFR § 570.9](https://www.law.cornell.edu/cfr/text/49/570.9) (federal inspection standard, vehicles 10,000 lb GVWR or less) |

Known gaps:

- I couldn't get the Tire Industry Association's own procedure document to verify it directly, so it isn't cited. Secondary sources say TIA follows the same plug-and-patch approach.
- No published standard covers valve stems or sets a depth limit for surface cracking. The app says so in those cases rather than inventing a threshold.

## Limits

- This is a visual check, not an inspection. It can't detect slow internal leaks, a leaking valve core, or leaks where the tire seals to the wheel. The app recommends a professional inspection whenever a verdict is uncertain or the damage affects safety.
- Some browsers can't read iPhone HEIC photos or HEVC videos. Chrome and Firefox often can't; Safari can. The app tells you when this happens and how to work around it.
- The inner sidewall is hard to photograph on a mounted tire. Expect the app to ask for that shot.

## Project layout

```
src/app/page.tsx                 Page shell, tips, footer with sources
src/app/api/analyze/route.ts     Server route: validation, Claude call, error handling
src/app/api/status/route.ts      Tells the page whether the API key is set
src/components/                  Upload sections, result cards, overall summary
src/lib/media.ts                 Photo resizing and video frame sampling (browser)
src/lib/prompt.ts                Instructions sent to the vision model
src/lib/repairRules.ts           Repair-or-replace rules with source quotes
src/lib/postprocess.ts           Verdict consistency and professional-inspection logic
src/lib/schema.ts                Request and response schemas
```
