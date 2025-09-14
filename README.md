# FillItUp (Firefox)

Capture your filled answers on a Google Form and replay them later with one click.

## What it does
- Save current inputs on a Google Form (per form URL/ID)
- Fill saved answers into the same form later
- Supported controls: short answer text, paragraph text, radio, checkboxes, dropdown

Limitations (initial version):
- Not yet handling linear scale, multiple-choice grid, checkbox grid, file upload, date/time pickers, or custom widgets
- DOM of Google Forms can change; if selectors break, please report

## Install (Temporary in Firefox)
1. Open Firefox and visit `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select this folder's `manifest.json`
4. You should see "FillItUp" in Temporary Extensions. Navigate to a Google Form and click the extension icon.

## Usage
- On a filled form:
  - Click "Save answers" to store your current inputs for this form
- Later (on the same form URL/ID):
  - Click "Fill saved" to auto-fill the stored answers
- Use "Clear saved" to remove saved entries for the current form

## Privacy
- Data is stored locally in `browser.storage.local` on your machine and keyed by form ID/URL. No network is used.

## Dev notes
- Manifest v2 is used for broad Firefox compatibility in 2025; can be migrated to MV3 later.
- Content script attempts to be resilient using roles/classes, but may need tweaks over time.

