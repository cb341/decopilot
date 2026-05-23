# Decopilot

Simple Firefox extension that removes GitHub Copilot UI from `github.com`.

## Files

- `manifest.json`
- `content.js`

## Install

1. Open Firefox.
2. Go to `about:debugging#/runtime/this-firefox`.
3. Click `Load Temporary Add-on...`.
4. Pick `manifest.json` from this folder.

## Notes

It removes Copilot elements using a small set of DOM selectors and keeps watching for dynamically added GitHub UI.
