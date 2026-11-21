# Export center

A DeepSeek Harness plugin that moves work between machines: batch-export the
Sessions you pick as restorable archives — logs, subagent sessions, and
attachments — and restore them as separate Sessions on another machine. The
plugin inventory travels the same way, so a hand-built environment can be
reproduced.

中文说明见 [docs/DETAIL.md](docs/DETAIL.md)。

## What it does

- **Session archives.** Pick Sessions individually or by date; each one is read
  through the official `api/session.export` route, so the archive carries the
  canonical `session.v4.jsonl` log, its subagent logs, and every referenced
  attachment. The browser wraps them in one container ZIP with a localized
  `README.md` and `manifest.json`.
- **Restore.** Import that container on any machine: the Host half writes each
  log as a new Session with its original creation time and event times,
  re-saves attachments under their content-addressed ids, rebuilds subagent
  children, and attaches the roots to the Workspace you choose.
- **Plugin inventory.** Export the installed profile bundles as a slim manifest
  (`name`, `version`, `spec`, `sourceKind`, `enabled`) and restore it elsewhere:
  the panel shows the exact spec it will install, and switches on a bundle that
  exists but is disabled.
- **Encrypted exports.** An optional password writes an AES-GCM-256 `.dshbak`
  package (PBKDF2-SHA-256, 210 000 iterations, random salt and IV) instead of a
  plain ZIP; import asks for the password and refuses the wrong one.
- **Incremental exports.** **New only** packages just the selected Sessions
  updated after the last successful export on this machine.
- **Forked Sessions.** A seeded source keeps its flag and its exact inherited
  cut, so a fork stays a fork after the round trip.
- **Localized exports.** File names, the archive README, and the manifest
  `about` follow the active interface language. Session content is never
  translated.

## Requirements

- DeepSeek Harness `>=0.2.2-rc.5 <0.3.0`.
- The official Session-log export row (`@deepseek-ai/dsh-session-log-export`),
  which the shipped Web bundle mounts.

## Install

Add this index URL to Discover, then install **Export center** there:

```
https://raw.giteeusercontent.com/lirenmelodic-resonance/dsh-export-center/raw/master/market/index.json
```

The market entry installs the tagged commit through `git+https://`, so the
target machine needs `git`. A plain archive is in the releases page for a
directory install.

From a checkout:

```
dsh plugin --profile <name> add <absolute path to this directory>
```

Then add the bundle `dsh-export-center-plugin` to the profile's
`dsh.profile.bundles` (or enable it on the Plugins page) and restart DSH.

## What it writes

- New Session logs through `sessionPersistence` (never edits existing ones).
- Attachments through the attachment store (content-addressed ids).
- Workspace membership for the restored roots.
- Nothing else: no settings, no credentials, no telemetry, no network calls
  besides the Host routes this plugin serves.

## Data format

Container ZIP: `manifest.json`, `README.md`, `sessions/<sessionId>.zip`. Each
inner ZIP is the official archive for one Session. The manifest is schema 2 and
carries `tool`, `app`, `locale`, `exportedAt` with a UTC offset, `timeZone`,
`counts`, `packagesDigest`, `about`, and one entry per Session.

## Limits

256 MB upload, 64 MB per archive entry, 512 MB inflated per import, 500 Session
logs, 500 000 events per log, 200 MB per export batch; packages beyond the
500-package limit are reported as skipped. An archive without a readable
central directory, a CRC mismatch, or an over-limit entry fails only that
package. Only one import runs at a time (a second answers `409`). Both
operations can be cancelled.

## Encrypted exports

The optional password next to Export writes an `.dshbak` package instead of a
plain ZIP: AES-GCM-256 with a PBKDF2-SHA-256 key (210 000 iterations), a random
16-byte salt, a random 12-byte IV, and the `DSHENC1` magic. It must be typed
twice, can be revealed for checking, and the ciphertext is decrypted once
before the file is saved, so a package that cannot be opened is never written.
Import detects the magic and asks for the password; a wrong password fails
without uploading anything. The password cannot be recovered.
## Tests

```sh
node test/run.mjs
```

The suite ships with the package. No network, no browser, no DSH: it builds real ZIP archives in memory
and checks the Host half against honest input, a decompression bomb, a bad
CRC, a truncated archive, duplicate imports, subagent depth, attachment
fallback, and a seeded fork. A separate check extracts the encryption helpers
from `client.js` and covers the `.dshbak` round trip and a wrong password.

## Security and trust

- Exports are **plain text unless you set a password**. They carry every message
  and attachment of the selected Sessions.
- An imported archive is **untrusted input**: its text becomes Session history
  that later turns read, and its plugin inventory can request installs. Import
  only files you trust and read the spec list before applying it.
- The Host never edits existing logs and never writes settings or credentials.

## Upgrade from earlier builds

Earlier builds used the bundle name `@local/dsh-export-center` (or
`dsh-export-center`) with the same row id `export-center`. Remove that bundle
before installing `dsh-export-center-plugin`, then restart DSH; two bundles with
one row id cannot be enabled together.

## Development

The Host suite ships with the package and runs anywhere Node is available:

```sh
node test/run.mjs
```

These two only exist in a checkout:

```sh
node tools/verify.mjs  # version + packaged files + docs + market + suite
node tools/build.mjs   # deterministic archive and SHA-256 in dist/
```

## License

MIT.
