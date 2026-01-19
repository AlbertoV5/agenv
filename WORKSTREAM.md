# The Workstream Framework: Specification

## Core Terminology
The framework uses specific nouns to define the scale and relationship of work units:

- Workstream: A coherent, structured body of work within a repository (e.g., "Implement Authentication" or "API Migration").

- Stage: A major subdivision of a workstream. Each stage should be testable and result in a contained state of the system.

- Batch: A group of tasks within a stage that must be executed in a specific sequence (e.g., 00-setup, 01-implementation).

- Thread: A unit of work within a batch designed for parallelism. Threads are the primary surface area for AI agents to work independently without high dependency overhead.

- Task: The most granular action item defined within a thread.

## Structural Hierarchy

| Level | Execution Logic | Description |
| :--- | :--- | :--- |
| Stage | Serial | Large checkpoints; usually ends with a "Evaluation" gate. |
| Batch | Serial | Numeric-prefixed groups (e.g., 00, 01) to ensure order of operations. |
| Thread | Parallel | Parallel execution units (e.g., frontend, backend, mobile). |
| Task | Hybrid | Granular steps within a thread. |


## Workflow Lifecycle

Every workstream follows a standard progression to ensure "the sausage making" is separated from the final documentation.

1. Planning: A PLAN.md is created defining the stages, batches, and threads. This serves as the reviewable "contract" before work begins.

2. Approval: A human-in-the-loop (HITL) review of the plan. Once approved, the CLI populates the tasks.json.

3. Execution: Agents are assigned to threads. They reference the existing codebase and the PLAN.md.

4. Evaluation: At the end of a stage or workstream, results are reviewed. If bugs are found, Fix Stages are dynamically added to the workstream.

5. Documentation: A final "99-document" batch or a dedicated phase synthesizes the output into clean documentation in a separate directory, referencing the workstream's output files.


## Technical Implementation

### File System Structure
The organization uses a two-dimensional matrix: Work Subdivision (Stage/Batch/Thread) and Artifact Type (Plan/Tasks/Files).

```
workstreams/
├── index.json               # Global registry of all workstreams & agent assignments
└── implementation-name/
    ├── PLAN.md              # Human-readable intent
    ├── tasks.json           # Machine-readable state/status (pending, active, review, etc.)
    └── files/               # The "Output" directory
        └── stage-1/
            ├── 00-preparation/
            │   └── setup-thread/
            └── 01-implementation/
                ├── backend/
                └── frontend/
```

### State Management

To ensure resiliency when agents fail or "exit," the tasks.json or a .status file tracks:

Status: pending | active | blocked | review | complete

Breadcrumbs: A text field where agents log their last action (e.g., "Finished API routes, starting validation") to allow a recovery agent to resume work seamlessly.

###  Handling Failure & Iteration

The framework accounts for the non-linear nature of development through:

Recovery: If an agent fails mid-thread, a "continue" command uses the breadcrumbs and existing file outputs to orient a new agent instance.

Fix Stages: When evaluation reveals issues, the workstream isn't "patched" awkwardly. Instead, a new stage (e.g., stage-3-fix-auth-race) is appended. This stage has its own batches and threads to address the bug using the current state of the codebase as the reference.