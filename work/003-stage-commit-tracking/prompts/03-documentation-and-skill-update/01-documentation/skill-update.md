Hello Agent!

You are working on the "Documentation" batch at the "Documentation and Skill Update" stage of the "Stage Commit Tracking" workstream.

This is your thread:

"Skill Update" (2)

## Thread Summary
Update the evaluating-workstreams skill to use commit review.

## Thread Details
- Working file: `./skills/evaluating-workstreams/SKILL.md`
- Add new section "Review Stage Commits" with:
```bash
work review commits              # Show all commits by stage
work review commits --stage 1    # Show commits for specific stage
work review commits --files      # Include detailed file changes
work review commits --json       # Machine-readable output
```
- Update evaluation workflow to include:
1. Review commits per stage
2. Identify files modified in each stage
3. Cross-reference with plan to verify scope
4. Note any human commits for context
*Last updated: 2026-01-22*

Your tasks are:
- [ ] 03.01.02.01 Add Review Stage Commits section to evaluating-workstreams SKILL.md
- [ ] 03.01.02.02 Update evaluation workflow to include commit review steps

When listing tasks, use `work list --tasks --batch "03.01"` to see tasks for this batch only.

Use the `implementing-workstreams` skill.
