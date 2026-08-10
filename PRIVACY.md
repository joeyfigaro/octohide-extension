# Octohide
## Privacy Policy

**Effective date:** 2026-08-10

Octohide ("the extension") is a browser extension that hides reusable and
template GitHub Actions workflows from the Actions sidebar on GitHub. This
policy explains what data the extension handles and how.

## Summary

Octohide does not collect, sell, or transmit your personal data to the
developer or any third party. All data it stores stays on your device. The
only network requests it makes are to GitHub, to read workflow files so it can
decide which workflows to hide.

## Data the extension stores on your device

The extension stores the following locally using your browser's extension
storage (`chrome.storage.local`). This data never leaves your device except as
described in "Network requests" below.

- **Settings**: whether hiding is enabled.
- **Manual overrides**: per-repository choices to hide or show specific
  workflows.
- **Detection cache**: a time-limited record of which workflows were detected
  as reusable, to avoid repeated network requests.
- **Optional personal access token (PAT)**: if you choose to provide a GitHub
  token, it is stored locally so the extension can read workflow files in
  private repositories. Providing a token is optional.

You can clear this data at any time from the extension's options page or by
removing the extension.

## Network requests

The extension communicates only with GitHub. It sends no data to the developer
or to any analytics, advertising, or third-party service.

- `github.com` and `raw.githubusercontent.com`: to read a repository's workflow
  files using your existing GitHub browser session, so the extension can detect
  reusable workflows.
- `api.github.com`: used only as a fallback for private repositories when your
  session alone cannot read a workflow file. When used, your optional personal
  access token is sent to GitHub as an authorization header over HTTPS.

Your personal access token is sent only to GitHub's official API and is used
only to access workflow files in repositories you already have access to. It is
never sent anywhere else.

## Data the extension does not collect

Octohide does not collect or transmit personally identifiable information,
browsing history, location, health, financial, or communications data. It does
not track your activity and contains no analytics or advertising.

## Data sharing

The extension does not sell or share your data with third parties. It does not
transfer your data for any purpose unrelated to the extension's single purpose,
and it does not use your data to determine creditworthiness or for lending.

## Security

Data is stored using your browser's built-in extension storage. As with all
browser extension storage, this data is not encrypted at rest. For this reason,
if you provide a personal access token, use a fine-grained token scoped to
read-only repository contents with an expiration date, so its access is limited.

## Changes to this policy

If this policy changes, the updated version will be published at the same
location with a revised effective date.

## Contact

Questions about this policy can be sent to: joey at joeyfigaro dot com
