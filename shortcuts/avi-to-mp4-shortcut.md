# AVI → MP4 — Apple Shortcut (iPhone / iPad)

Two routes. Pick based on whether you want zero apps or guaranteed results.

```
                    ┌──────────────────────────────────────────────┐
   Long-press .avi  │ Route A: native "Encode Media" (no app)      │
   in Files → Share │   works ONLY if iOS can decode the AVI       │
         │          │   (MJPEG, DV, H.264 inside an AVI wrapper)   │
         ├─────────►│   fails silently on DivX / Xvid / MPEG-4 ASP │
         │          └──────────────────────────────────────────────┘
         │          ┌──────────────────────────────────────────────┐
         └─────────►│ Route B: a-Shell mini + ffmpeg (free app)    │
                    │   converts ANY AVI, true .mp4 (H.264 + AAC)  │
                    │   ~2x the build effort, runs in the app      │
                    └──────────────────────────────────────────────┘
```

**Why two routes.** Apple's video engine does not read DivX/Xvid, which is what most
AVIs from the 2000s are. The native Encode Media action therefore either errors or
produces nothing on those files. ffmpeg decodes everything.

**Recommendation:** Build Route B. Try Route A first only if you refuse to install an app.

---

## Route A — Native, no app (`AVI to MP4.shortcut` in this folder)

Ready-made file is next to this guide. Sign it on a Mac exactly like `Extract RAR`:

```
cd ~/Downloads
shortcuts sign --mode anyone --input "AVI to MP4.shortcut" --output "AVI to MP4 signed.shortcut"
```

Or hand-build it (5 actions):

| # | Action | Settings |
|---|--------|----------|
| 1 | **Encode Media** | Input: `Shortcut Input`. Size: **1920x1080** (fits within 1080p, never upscales; re-encodes to H.264/AAC). |
| 2 | **Replace Text** | Find `\.[^.]+$` → Replace `.mp4`. Regular Expression ON. Text: `Shortcut Input` → **Name** |
| 3 | **Set Name** | Input: `Encoded Media`. Name: `Updated Text`. Don't Include File Extension: **ON** |
| 4 | **Save File** | Input: `Renamed Item`. iCloud Drive → `Shortcuts/Converted/`. Ask Where To Save: OFF |
| 5 | **Show Notification** | `Saved [Updated Text] to iCloud Drive/Shortcuts/Converted` |

Details → **Show in Share Sheet** ON → types: Files, Media.

If it errors with "could not be loaded" or returns nothing, the AVI codec is not supported.
Use Route B.

---

## Route B — a-Shell mini + ffmpeg (recommended)

### One-time setup
1. Install **a-Shell mini** (free, App Store). It ships with native ffmpeg.
2. Open it once so it finishes first-run setup. Type `ffmpeg -version` to confirm.

### Build (Shortcuts → + → name it "AVI to MP4")

| # | Action | Settings |
|---|--------|----------|
| 1 | **Receive input from Share Sheet** | Types: Files, Media. If no input: Select File |
| 2 | **Replace Text** | Find `\.[^.]+$` → Replace `.mp4`. Regex ON. Text: `Shortcut Input` → **Name**. (Output = `Updated Text`, the output file name) |
| 3 | **a-Shell → Put File** | File: `Shortcut Input`. Lands in a-Shell's `~shortcuts` folder under its own name. |
| 4 | **a-Shell → Execute Command** | Set to run **In App** (ffmpeg is a full native binary; the lightweight extension cannot run it). Commands, one per line: see block below. |
| 5 | **a-Shell → Get File** | Path: `Updated Text`. On iOS 18+, turn **As a copy** ON. |
| 6 | **Save File** | Input: output of step 5. iCloud Drive → `Shortcuts/Converted/`. Ask Where To Save: OFF |
| 7 | **a-Shell → Execute Command** | Cleanup (optional): `rm "[Shortcut Input Name]" "[Updated Text]"` |
| 8 | **Show Notification** | `Converted [Updated Text]` |

**Step 4 command block** (insert the magic variables where the brackets are):

```
cd ~shortcuts
ffmpeg -y -i "[Shortcut Input → Name]" -c:v h264 -pix_fmt yuv420p -preset fast -crf 22 -c:a aac -b:a 160k -movflags +faststart "[Updated Text]"
open shortcuts://
```

What each flag does:
- `-c:v h264` picks whichever H.264 encoder the build ships. If ffmpeg reports
  "Unknown encoder", replace with `-c:v h264_videotoolbox -b:v 5M` (hardware encoder,
  drop the `-preset`/`-crf` flags).
- `-pix_fmt yuv420p` forces a pixel format the Photos app and every browser play.
- `-crf 22` is visually lossless for most sources. Use 26 for smaller files.
- `-c:a aac -b:a 160k` converts the usual MP3/AC-3 AVI audio to AAC.
- `-movflags +faststart` lets the file start playing before fully downloaded.
- `open shortcuts://` bounces you back to Shortcuts when ffmpeg finishes.

### Daily use
Long-press the .avi in Files → Share → **AVI to MP4**. a-Shell opens, ffmpeg runs
(expect ~1x real-time on a recent iPhone, so a 10-minute video takes 5 to 10 minutes),
then you land back in Shortcuts with the file in **iCloud Drive → Shortcuts → Converted**.

---

## Known limits

- **Screen must stay on** during Route B. iOS suspends a-Shell if you leave it, which
  kills ffmpeg mid-encode. Plug in for long videos.
- **Route A outputs a QuickTime container renamed to .mp4.** H.264/AAC inside is fully
  compatible, and every player and uploader accepts it. Route B produces a true MP4.
- **Large AVIs (over ~2 GB)** need the free space twice over inside a-Shell. Delete
  `~shortcuts` leftovers if conversions start failing: step 7 handles that.
- **Subtitles embedded in AVI** are dropped by both routes.
- **The third-party a-Shell actions cannot be pre-packaged** in a `.shortcut` file from
  outside the app, which is why Route B is a hand build only.
