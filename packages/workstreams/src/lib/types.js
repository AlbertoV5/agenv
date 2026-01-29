// src/lib/types.ts
var DEFAULT_SESSION_ESTIMATES = {
  short: {
    length: 2,
    unit: "session",
    session_minutes: [30, 45],
    session_iterations: [4, 8]
  },
  medium: {
    length: 4,
    unit: "session",
    session_minutes: [30, 45],
    session_iterations: [4, 8]
  },
  long: {
    length: 8,
    unit: "session",
    session_minutes: [30, 45],
    session_iterations: [4, 8]
  }
};
var DEFAULT_STRUCTURE = {
  short: { stages: 1, supertasks: 1, subtasks: 3 },
  medium: { stages: 3, supertasks: 2, subtasks: 3 },
  long: { stages: 4, supertasks: 3, subtasks: 4 }
};
var MAX_THREADS_PER_BATCH = 8;
export {
  MAX_THREADS_PER_BATCH,
  DEFAULT_STRUCTURE,
  DEFAULT_SESSION_ESTIMATES
};
