Hello Agent!

You are working on the "Build & Cleanup" batch at the "Build System & Cleanup" stage of the "Npm Publish Cleanup" workstream.

This is your thread:

"Package.json for NPM" (3)

## Thread Summary
Update package.json with proper fields for npm publishing.

## Thread Details
- Working packages: `./packages/workstreams`
- Add `main` field pointing to `dist/index.js`
- Add `types` field pointing to `dist/index.d.ts`
- Update `exports` to use compiled paths
- Update `bin` to point to compiled CLI
- Add `prepublishOnly` script that runs build
- Update `files` array to include `dist/`
- Ensure `repository`, `license`, `keywords` fields are set
- Add `engines` field for Node.js version

Your tasks are:
- [ ] 01.01.03.01 Add "main": "./dist/index.js" field
- [ ] 01.01.03.02 Add "types": "./dist/index.d.ts" field
- [ ] 01.01.03.03 Update "exports" to point to dist/ compiled files
- [ ] 01.01.03.04 Update "bin" to point to dist/bin/work.js
- [ ] 01.01.03.05 Add "prepublishOnly": "bun run build" script
- [ ] 01.01.03.06 Update "files" array to include dist/ and exclude src/
- [ ] 01.01.03.07 Add repository, license, keywords, and engines fields

When listing tasks, use `work list --tasks --batch "01.01"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
