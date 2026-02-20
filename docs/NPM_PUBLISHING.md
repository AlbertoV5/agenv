# npm Publishing

`@agenv/workstreams` is published via GitHub Actions using npm trusted publishing (OIDC).

## Trigger

Push a tag matching `workstreams-v*`.

## Release Commands

```bash
bun run release:workstreams:patch
bun run release:workstreams:minor
```

These scripts bump version, commit, tag, and push.

## Workflow

See `.github/workflows/publish-workstreams.yml`.

Key points:
- `id-token: write` permission is required
- Node 24 is used for modern npm
- `NPM_CONFIG_PROVENANCE=false` is set for private-repo publishing compatibility
