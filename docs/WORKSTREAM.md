# Workstream Model

## Hierarchy

- Stage (serial)
- Batch (serial within stage)
- Thread (parallel within batch)
- Task (granular unit)

Task ID format: `SS.BB.TT.NN`.

## Files

Each stream lives at `work/{stream-id}/`.

- `PLAN.md`: structure and intent
- `TASKS.md`: intermediate task editing file
- `tasks.json`: machine state
- `threads.json`: thread-level session metadata
- `REPORT.md`: completion report input

## Minimal Lifecycle

```bash
work create --name "feature" --stages 2
work current --set "001-feature"
work validate plan
work check plan
work approve plan
work approve tasks
work multi --batch "01.01"
work report validate
work complete
```
