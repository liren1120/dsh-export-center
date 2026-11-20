# Market entry

`index.json` is a format-1 plugin market index. It lists one plugin with one
version, installed from a git commit of this repository.

Before publishing:

1. Push this repository and note the full commit SHA:
   `git rev-parse HEAD`
2. Replace `REPLACE_WITH_40_HEX_COMMIT` in `index.json` with that SHA.
3. Serve `index.json` from an HTTPS URL that answers directly (no redirects).
   GitHub Pages, a raw file host, or any static bucket works.
4. In DSH: **Plugins → Discover → add index**, paste that URL.

Validation is done by `parseMarketIndex` from
`@deepseek-ai/dsh-plugin-market-index`; a malformed field fails with its JSON
path. Re-validate after every version bump.
