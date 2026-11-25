# Changelog

## 2026-11-25

### New
- Added a Debug Mode toggle switch at the top of Settings that disables all tracking/saving and displays only a repeated `DEVELOPMENT` background watermark.
- Added free one-click stage switching across all units in Learn while preserving each stage's progress.
- Added a full-answer bonus visual and audio reward when optional phrase variants are included.
- Added a per-unit Settings cog in Learn (`Play`, `Intros: On/Off`, `Skip`, and `Undo Skip`) and removed stage-pill action controls.
- Added a Revision section at the bottom of the Learn unit rail (separated by a 20% vertical gap) displaying only practiced words below 75% accuracy, with a **Play Revision** button to drill them directly in Play mode.
- Added audio replay speaker buttons on every Spanish phrase row in Learn stage vocabulary tables and the Revision table.
- Added **Export JSON** and **Import JSON** progress backup/restore controls inside **Settings → Developer Tools**.
- Added collapsible **Developer Tools** (expanded by default) and **Learning Preferences** (collapsed by default) accordions inside the Settings popover.
- Added consistent fade-out/fade-in transitions across all primary views, Calendar & Stats sub-views, period switches, and Learn workspaces.
- Added escalating base-question skip bans (2nd skip bans the base question for 10 questions; 3rd+ skip bans for an additional 15 questions), a **Skipped** column for Base Questions & Numbers, and a **Banned** filter in the Mastery Table.

### Updated
- Redesigned the Learn section from the ground up into a compact, zero-fluff two-column progression map with a connected unit rail, horizontal stage stepper, inline Topic Rules, and vertically aligned stage cards.
- Renamed navigation tabs to **Play**, **Learn**, and **Calendar and Stats**, spread proportionally across the full control bar, and removed the brand mark and separate Learning Path button.
- Moved **Achievements** into Calendar & Stats and removed all emojis, unnecessary flavor text, category tags, `X/5` tier counters, and title categories.
- Moved **Daily Goal** and **Time Spent** into the top of the Calendar view and moved the clickable HUD stage title into the center of the top header.
- Moved the **Speech Console** into Settings as an On/Off toggle under Developer Tools and moved **Hands-Free** to the top-right of the prompt zone as a doubled-size steering wheel icon with a centered **Hands-Free** label and live active indicator.
- Removed the Practice Mode button, Polish Pronunciation option, failed-attempt memory-tip hints, and Speak/Due/Seen HUD counters, repositioning the HUD unlock requirement line beneath the progress bar.
- Reordered Trends pills to **Time Spent → New Words → Pronunciation**, simplified Mastery Table pronunciation cells to show percentage only, and gated the prompt stat pin to appear only after 5+ misses.
- Decoupled Calendar Month/Week views from the day detail drawer so details start collapsed by default, smoothly slide up/down below the calendar, and never resize or overlap calendar days.
- Deduplicated multiple skips within the same question attempt/retry round to count as a single skip, and prevented skipped questions or matching expected answers from immediately repeating.
- Increased `.prompt-value` font sizing across all prompt types to better fill the larger prompt window.
- Updated question scoring across both Local Hybrid and Browser STT so only the base phrase is required, highlighting optional variants in soft pastel yellow and tracking both correct and incorrect variant attempts in extension stats.
- Updated Pronunciation Engine to always reset to Local Hybrid on page load/refresh while keeping in-session switches active.
- Fixed active phrase resolution so previous prompt text no longer drops variant highlights or mismatches memory tips, and resolved all 21 bugs audited in `plan.md`.
- Removed the Session Summary feature and all settings, data management, and QA testing tools below Pronunciation Engine along with their associated code.
