# Changelog

## 0.8.0

Rollback, inventory trust, and a real-archive regression.

- **Failed restores are rolled back.** When verification finds a Session
  unreadable, or the write fails after creation, the Host calls the persistence
  service's `delete` / `remove` / `deleteSession` (whichever exists) and reports
  `rolledBack`; the residual id is only kept when no removal method is available.
- **Imported inventories are gated by source.** Only npm names and
  `git+https://gitee.com` / `git+https://github.com` specs count as known.
  `link:`, `file:`, other hosts, and plain URLs require an explicit
  "I trust where this inventory comes from" checkbox before Apply is enabled.
- **Real-archive regression.** The suite can import an actual container from
  this machine (`DSH_EXPORT_CENTER_REAL_ARCHIVE=<path>`); `tools/verify.mjs`
  picks up a neighbouring `会话备份-*.zip` automatically. Cheaper than a full
  two-instance E2E and it exercises the real manifest, media names, and logs.

## 0.7.0

Hardening: the silent-failure paths from 0.6.x are gone.

- **Incremental exports cannot skip silently.** The watermark advances only
  after a run with no failures and no skipped Sessions; previously one failed
  Session was excluded from every later "New only" export.
- **Package overflow is reported.** A container with more than 500 Session
  packages now lists the rest under `skipped` instead of dropping them.
- **The manifest is a gate.** `manifest.json` must exist, name
  `dsh-export-center/sessions`, and carry a schema this build understands; a
  newer schema is refused with a clear reason instead of guessed at.
- **Verification reads the whole log.** Every restored Session is re-opened and
  read to its last event, and the count must match what was written.
- **Damaged headers fail alone.** A header without a usable `createdAt` is a
  reported failure, not a Session stamped with the current time.
- **A child exported alone becomes a root.** When its parent is not in the
  archive the restored Session gets `delegationDepth: 0` and `parentMissing`.
- **Attachment ids are checked.** If the attachment store returns a different
  id than the archive named, the report lists it under `idMismatch`.
- **Duplicate detection survives restarts.** Archive ids are persisted under
  `~/.dsh/export-center/imports.json` (override with
  `DSH_EXPORT_CENTER_STATE_DIR`).
- **Import holds one package at a time**, so a 500-Session container no longer
  keeps every attachment in memory at once.
- **Password policy.** Encryption requires at least 8 characters; the
  round-trip self-check compares boundary bytes, not just length.
- **Plain-text and untrusted-input notices.** The panel says when an export is
  unencrypted, that imported archives become Session history, and that an
  imported plugin inventory comes from outside.
- **Reproducible build and a consistency gate.** `node tools/build.mjs` writes
  a deterministic archive plus SHA-256; `node tools/verify.mjs` checks version
  coherence, packaged files, docs, the market index, and runs the suite.

## 0.6.1


Fixes 0.6.0, which shipped a single password field.

- **Password confirmation.** Export asks for the password twice, offers a
  show-password toggle, and refuses to start unless both match; the ciphertext
  is decrypted once before it is saved, so a package that cannot be opened is
  never written. Forgetting the password is still irreversible, and the panel
  says so.
- **The tests ship.** `test/` is part of the package (`files` and release
  archives), so `node test/run.mjs` works from an installed copy, not only from
  the repository.
- **Docs.** README gains the encrypted-export section; the market description
  names the supported DSH range.

## 0.6.0

Two export options the previous versions only promised.

- **Encrypted exports.** A password in the export footer writes an encrypted
  `.dshbak` package instead of a plain ZIP: AES-GCM-256, PBKDF2-SHA-256
  (210 000 iterations), random salt and IV, `DSHENC1` magic. Import recognises
  the magic, asks for the password in the panel, and reports a wrong password
  without uploading anything.
- **Incremental export.** With **New only** ticked, only Sessions updated after
  the last successful export on this machine are packaged; the timestamp lives
  in local storage and the panel shows it.
- The per-Session event cap rises from 200 000 to 500 000; larger logs still
  fail alone with a clear reason.

## 0.5.0

Forked Sessions survive the round trip.

- A source Session with `isSeeded: true` is restored as seeded: the header keeps
  the flag, `sessionPersistence.create` receives the exact inherited cut derived
  from the last `session/end-seed` event, and the inherited prefix keeps its
  original Session references while only the child-owned events are rewritten.
- Subagent logs follow the same rule when they are seeded.
- `test/run.mjs` gains a fork fixture: a seeded header, an inherited prefix, and
  a delivery marker on each side of the cut.

## 0.4.1

Repository quality, no runtime change.

- `test/run.mjs`: a self-contained Host-half suite that builds real ZIP
  archives in memory — honest input, a decompression bomb, a bad CRC, a
  truncated archive, duplicate imports, subagent depth, preset fallback, and
  attachment conversion. No network, no browser, no DSH.
- `docs/preview.svg` and its reference in the detail document, so the market
  page has a visual.
- `npm test` maps to the suite.

## 0.4.0

Archive reading moves to a maintained library.

- **`fflate` reads archives.** The hand-written ZIP parser is gone: fflate
  streams each entry (including data descriptors) and reports structural errors
  per entry. It is vendored under `vendor/` (MIT, licence included) so a
  local-directory install needs no registry access.
- **The limits and checks survive the swap.** A per-entry 64 MB cap, a 512 MB
  cumulative budget, and ZIP64/central-directory validation are enforced on the
  produced bytes; CRC-32 is still verified, from the central directory, because
  fflate does not expose the expected checksum.
- **One corrupt package still fails alone.** `bad CRC`, truncated archives, and
  decompression bombs are rejected with a per-package reason instead of a 500.
- The release keeps the 0.3.2 behavior and data formats: archive schema 2,
  plugin manifest v2, localized exports.

## 0.3.2

Safety, cancellation, and localized exports.

- **Archive parsing is bounded by what it produces, not what it claims.** Every
  entry inflates with `maxOutputLength`, the whole archive has a 512 MB
  uncompressed budget, ZIP64 markers are refused, and each entry's CRC-32 is
  verified. A truncated or corrupt inner package now fails only that package.
- **Partial writes are reported.** A Session whose `append` fails after its
  header was stored is listed with its residual id, so the leftover can be
  deleted by hand.
- **One import at a time.** A second upload while an import runs answers 409;
  both export and import can be cancelled from the panel.
- **Every restored Session carries its target.** The report and the panel show
  each Session's Workspace and how it was chosen; a fallback selection is drawn
  as a warning instead of being applied silently.
- **A budget stop names what it skipped.** Hitting the export limit lists every
  remaining Session as skipped instead of dropping them.
- **Exports follow the interface language.** The file name, the README inside
  the archive, and the manifest `about` are written in the active language,
  with a local timestamp, its UTC offset, and the IANA time zone. Session
  content is never translated.
- **One digest, one meaning.** The dedupe id is the SHA-256 of the uploaded
  file; the manifest records `packagesDigest` for the Session packages.
- **Truthful states.** `overridden` and `cancelled` are reported separately from
  failures; a 401 from the Host probe reports authentication, not a missing
  Host half; `different`/`manual` plan rows are counted apart from actionable
  rows; the failure list expands past 20 entries; inventory ticks survive a
  refresh.

## 0.3.1

Review fixes from a second machine.

- **A half-updated plugin now says so.** The panel probes
  `api/export-center.workspaces` on load; when the Host half is missing it shows
  a banner, disables Import, and any failed upload reports "Host half not loaded"
  instead of a bare `HTTP 404`. `401/403` reports the authentication case.
- **Repeat imports are flagged.** Each archive carries an `archiveId` (the
  SHA-256 of the file); the Host reports `duplicate: true` when it has restored
  that archive in this process, and the panel says so.
- **Unsupported image formats fall back to files.** The image store accepts only
  PNG/JPEG/WebP/GIF; any other `media/` entry — and any image the store refuses —
  is now saved verbatim through `saveFile` and reported, instead of being dropped.
- **The target Workspace is chosen, not assumed.** A new
  `api/export-center.workspaces` route lists workspaces; the panel offers a
  picker and sends `workspaceId`. The Host still prefers a path match for the
  source `cwd` when no workspace was requested.
- **Subagent depth and preset are faithful.** `delegationDepth` is copied from
  the source child header (parent depth + 1 only as a fallback), child parent
  links are rewritten through the id map, and an `agentPreset` the target
  deployment does not know is dropped and reported.

## 0.3.0

Sessions move between machines as archives, not as transcripts.

- **Export uses the official archive.** Every selected Session is read through
  `api/session.export` (the same route the Session header uses), so the archive
  carries the canonical `session.v4.jsonl` log, its subagent logs, and every
  referenced attachment. The browser wraps those archives in one container ZIP
  and downloads a single `dsh-sessions-*.zip`.
- **Import restores Sessions.** A new Host half accepts the container, writes
  each log as a new Session through `sessionPersistence` with its original
  `createdAt` and event times, re-saves attachments under their
  content-addressed ids, rebuilds subagent children with their parent link, and
  attaches the roots to a Workspace whose path matches the source `cwd`.
- **Progress, limits, and receipts.** Export reports per-Session progress and
  stops at a 200 MB archive budget; import reports every restored Session with
  its cwd, event count, subagent count, and attachment count, plus each entry
  that failed and why.
- **Plugin inventory is slim.** Export writes identity and install facts only —
  `name`, `version`, `spec`, `sourceKind`, `enabled` — instead of the whole
  bundle record with base64 icons and local paths. Import shows the exact spec
  it will install, and a bundle that exists but is switched off is offered as
  "present, to enable" rather than reported as already identical.
- **Theme and accessibility.** Colors use the real `--dsw-alias-*` tokens, so
  the panel follows the active theme; status messages are `aria-live` regions
  and the version control carries an accessible name.
- **Removed:** the browser-side event pager, Markdown/JSON transcript export,
  and transcript-to-draft import.

## 0.2.1

Usability pass: the two blocks stop sharing fate, and the risky actions say what
they did.

- **The blocks load independently.** A failing Session Remote no longer replaces
  the whole page with an error; each block renders its own loading and error
  state.
- **Import failures are explained.** Every failed install now records the bundle
  name and the actual reason ("registry rejected …", `application: …`) instead of
  only incrementing a counter, and the list is shown under the plan.
- **The plan is tickable.** Installable rows carry checkboxes, so a plan can be
  applied in part. A long plan no longer truncates silently: it collapses beyond
  60 rows behind "show all".
- **A transcript is previewed before it becomes a Session.** Picking a file shows
  the name, size, first line and whether the import will truncate; nothing is
  created until "Import" is pressed.
- **Truncation keeps the newest work.** A transcript over the context budget drops
  the oldest turns and says how much it dropped, instead of keeping the head and
  losing the recent progress.
- **Hidden selections are stated.** A tick made under one filter survives a filter
  change, and the Session header reports how many picked rows the current filter
  hides.
- **Export receipts name the file.** Both exports report the exact file name the
  browser was asked to save, instead of just a count.
- **Session rows show their workspace**, so identically titled Sessions from
  different directories are distinguishable.
- **A Markdown transcript no longer claims to carry the plugin inventory**; the
  transcript says the inventory is a separate export.
- **Version self-report.** `version.json` ships next to the client bundle; the
  header shows the running build, a details panel shows this bundle's configured
  source, and a detected hot rebuild offers "reload data" / "reload page".

## 0.2.0

Split into two independent blocks, each with its own export and import.

- **Plugin inventory** — pick bundles individually; the list is grouped into
  portable bundles (profile dependencies) and official ones (shipped with DSH or
  offered by the official on-demand catalog), which are collapsed and never
  exported. Rows show the localized display title. Export writes
  `dsh-plugins-*.json` with exact `name@version` specs; import shows a plan and
  installs only what this machine lacks.
- **Session logs** — export selected Sessions (or a date range) as one Markdown
  document or a JSON event archive; import is one click and opens the transcript
  as a new Session's announced context.
- The panel scrolls as one region; lists no longer scroll inside themselves.

## 0.1.0

First working version: one combined JSON export of plugin inventory and Session
events, a sidebar panel, date presets, and exact install specs.
