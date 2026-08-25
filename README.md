# GPSP 2.0 — GitHub Edition

Graduation Project Supervision Platform.

## Architecture
- GitHub Pages: UI
- Google Apps Script: API gateway
- Google Sheets: student/project database
- Google Drive: submission storage
- OpenAI: server-side academic review

## One-time setup
1. Deploy `backend/Code.gs` as a Google Apps Script Web App.
2. Copy the `/exec` URL.
3. Put it once in `assets/js/config.js` as `API_URL`.
4. Enable GitHub Pages from repository Settings → Pages.

After that, normal UI updates happen in GitHub only.

## Security
Do not place OpenAI keys, passwords, student documents, or private Google credentials in this repository.
