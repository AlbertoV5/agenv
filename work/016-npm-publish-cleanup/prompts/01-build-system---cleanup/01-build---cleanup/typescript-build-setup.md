Hello Agent!

You are working on the "Build & Cleanup" batch at the "Build System & Cleanup" stage of the "Npm Publish Cleanup" workstream.

This is your thread:

"TypeScript Build Setup" (1)

## Thread Summary
Configure TypeScript to compile the package to JavaScript with declaration files.

## Thread Details
- Working packages: `./packages/workstreams`
- Create/update `tsconfig.build.json` for production builds
- Configure output to `dist/` directory
- Ensure source maps are generated
- Add `build` script to package.json
- Target: ES2022+ (modern Node.js/Bun)
- Module: ESNext with proper moduleResolution

Your tasks are:
- [ ] 01.01.01.01 Create tsconfig.build.json with ES2022 target, ESNext module, declaration output to dist/
- [ ] 01.01.01.02 Add "build" script to package.json that runs tsc with tsconfig.build.json
- [ ] 01.01.01.03 Add dist/ to .gitignore
- [ ] 01.01.01.04 Verify build compiles without errors

When listing tasks, use `work list --tasks --batch "01.01"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
