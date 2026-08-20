# Octohide

[Download for Chrome](https://chromewebstore.google.com/detail/octohide/jefpacegjnggmjiclcloeidojbolhple?authuser=3&hl=en)

[Download for Firefox](https://addons.mozilla.org/en-US/firefox/addon/octohide/)

## What is it?

Octohide tidies up the workflow list on your GitHub Actions pages. Some workflows are only meant to be used as building blocks by other workflows and can't be run on their own, but GitHub still shows them in the sidebar and mixes them in with the ones you actually use. Octohide spots those and quietly tucks them away, so the list you see is just the workflows that matter to you. You stay in control: you can hide or show any workflow yourself, and reveal everything again whenever you like.

GitHub has known about this issue [for years](https://github.com/orgs/community/discussions/12025) but hasn't prioritized a fix; until they do, you can use this.

| Before                                                                                                                             | After                                                                                                                              |
| ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| <img width="331" height="525" alt="image" src="https://github.com/user-attachments/assets/1225ced8-2ea0-4060-b51e-bd4c02a21c54" /> | <img width="333" height="404" alt="image" src="https://github.com/user-attachments/assets/b4885244-4dce-4643-83ff-a29e063f9212" /> |

## Features

- **Auto-hide**: reusable (`workflow_call`-only) workflows are hidden automatically.
- **Reveal toggle**: a control in the sidebar toggles the visibility of any hidden workflows.
- **Options page**: set an optional PAT and clear the cache.

Results are cached for 6 hours per workflow to avoid refetching on every navigation. An optional Personal Access Token (PAT) can be configured as a fallback for private repositories where the session alone is insufficient.

## Install (load unpacked)

### Chrome

1. `pnpm build`
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select `.output/chrome-mv3`.

### Firefox

1. `pnpm build:firefox`
2. Open `about:debugging#/runtime/this-firefox`.
3. Click **Load Temporary Add-on**.
4. Select `.output/firefox-mv2/manifest.json`.

### Repository Secrets

Generate the values once with `pnpm wxt submit init`, then add them under
**Secrets and Variables** so they're accessible to actions.

| Chrome Web Store       | Firefox Add-ons        |
| ---------------------- | ---------------------- |
| `CHROME_EXTENSION_ID`  | `FIREFOX_EXTENSION_ID` |
| `CHROME_CLIENT_ID`     | `FIREFOX_JWT_ISSUER`   |
| `CHROME_CLIENT_SECRET` | `FIREFOX_JWT_SECRET`   |
| `CHROME_REFRESH_TOKEN` |                        |


## Known limitations
- Only workflows whose **sole** trigger is `workflow_call` are auto-hidden. A workflow that also declares other triggers (e.g. `push`, `workflow_dispatch`) is still runnable and must be hidden manually.
- A hidden item's own per-item control is hidden along with it. Use the reveal toggle to bring hidden items back into view, then adjust their overrides.
- Settings and overrides are stored in extension storage, shared across the browser profile. Concurrent writes from multiple tabs of the same repository can race — last write wins.
