# Extract RAR — Apple Shortcut (iPhone / iPad)

Build time: about 3 minutes. No third-party app required. iOS 15 or later.

The Shortcuts app's built-in **Extract Archive** action reads `.rar` natively
(it also reads zip, 7z, tar, tar.gz, tar.bz2, cpio, cab and iso). The Files app
alone cannot open RAR, which is the whole reason this shortcut exists.

---

## How it works

```
   Tap a .rar in Files ──► Share ──► "Extract RAR"
                                         │
                                         ▼
                      ┌──────────────────────────────────┐
                      │ 1. Receive file from Share Sheet │
                      │ 2. Is it a .rar?  ──no──► Alert  │
                      │ 3. Extract Archive               │
                      │ 4. Save to iCloud Drive/Extracted│
                      │ 5. Notify "Done" with file count │
                      └──────────────────────────────────┘
                                         │
                                         ▼
                 iCloud Drive / Shortcuts / Extracted / <archive name> /
```

---

## Build steps

Open **Shortcuts** → tap **+** → name it **Extract RAR**. Add these actions in order.
Search for each action by name in the action picker at the bottom of the screen.

| # | Action to add | Settings to tap |
|---|---------------|-----------------|
| 1 | **Receive input from Share Sheet** (tap the ⓘ / shortcut name → *Show in Share Sheet* ON) | Share Sheet Types: **Files** only. If there's no input: **Select File** |
| 2 | **If** | Input: `Shortcut Input` → **File Extension** → *is* → `rar` |
| 3 | **Extract Archive** | Input: `Shortcut Input` (nested inside the If) |
| 4 | **Save File** | Input: `Extracted Files`. Service: **iCloud Drive**. Destination path: `Shortcuts/Extracted/` + `Shortcut Input` → **Name**. Turn **Ask Where To Save** OFF (or ON if you want to pick each time). |
| 5 | **Count** | Items in `Extracted Files` |
| 6 | **Show Notification** | Text: `Extracted [Count] files from [Shortcut Input → Name]` |
| 7 | **Otherwise** (part of the If block) | — |
| 8 | **Show Alert** | Title: `Not a RAR file`. Message: `This shortcut only extracts .rar archives.` |
| 9 | **End If** | auto-added |

### Setting the file-name variable (step 4)
When you tap the Destination Path field, choose **Select Magic Variable**, tap
**Shortcut Input**, then tap it again and pick **Name**. That makes each archive land in
its own folder so two extractions never overwrite each other.

### Make it show up when you tap a RAR
Tap the shortcut's name at the top → **ⓘ Details** → toggle **Show in Share Sheet** ON
→ under Share Sheet Types keep only **Files**. Now in the Files app: long-press the
.rar → **Share** → **Extract RAR**.

---

## Install the ready-made file instead of building it

`Extract RAR.shortcut` in this folder is the finished shortcut. iOS only imports
**signed** shortcut files, and signing is Mac-only, so:

**With a Mac (macOS 12 or later)**

1. Save `Extract RAR.shortcut` to your Mac (Downloads is fine).
2. In Terminal:
   ```
   cd ~/Downloads
   shortcuts sign --mode anyone --input "Extract RAR.shortcut" --output "Extract RAR signed.shortcut"
   ```
3. Double-click `Extract RAR signed.shortcut` to import it on the Mac, then it syncs
   to your iPhone through iCloud within a minute. Or AirDrop the signed file straight
   to the phone and tap **Add Shortcut**.
4. On the phone, confirm **Show in Share Sheet** is on (it is set in the file).

**Without a Mac**

There is no phone-only way to import an unsigned file. Build it by hand using the
table above (about 3 minutes). Once built, you can share it as an iCloud link from
the phone and reinstall it anywhere.

---

## Daily use

1. Save or AirDrop the .rar anywhere in Files (Downloads, iCloud, On My iPhone).
2. Long-press it → **Share** → **Extract RAR**.
3. Wait for the "Extracted N files" notification.
4. Open **Files → iCloud Drive → Shortcuts → Extracted → <archive name>**.

Or run it from the Shortcuts app, Siri ("Extract RAR"), or a Home Screen icon, and
it will prompt you to pick the file.

---

## Known limits

- **Password-protected RARs are not supported.** Extract Archive silently fails and
  the shortcut will produce no output. For those, use a dedicated app such as
  "RAR, Zip & 7z Extractor" or "iZip" from the App Store.
- **Multi-part archives** (`.part1.rar`, `.part2.rar`) only extract if all parts are in
  the same folder, and even then results vary. Single-file RARs are reliable.
- **Very large archives** (multiple GB) can time out on iPhone. Run from a plugged-in
  iPad or Mac if the archive is huge.
- **Make Archive cannot create RAR files**, only zip and tar variants. This shortcut
  is extraction only.

---

## Optional upgrades

- **Auto-open the folder**: add **Open File** → `Saved File` after step 6 and the
  extracted folder opens in Files when done.
- **Choose a destination each run**: flip *Ask Where To Save* ON in step 4.
- **Also handle ZIP and 7z**: change step 2 to **File Extension** *is in* `rar, zip, 7z`
  (use three If/Otherwise branches or a single **Matches Text** check with regex
  `(?i)\.(rar|zip|7z)$`). Rename it "Extract Archive Pro".
