import { mock, spyOn, type Mock } from "bun:test";
import * as childProcess from "child_process";
import { type ChildProcess } from "child_process";
import * as notifications from "../../src/lib/notifications";

export function createChildProcessMock(overrides: Partial<ChildProcess> = {}): ChildProcess {
  const mockChild = {
    unref: mock(() => {}),
    on: mock(() => mockChild),
    stdout: null,
    stderr: null,
    stdin: null,
    pid: 12345,
    killed: false,
    exitCode: null,
    signalCode: null,
    connected: false,
    kill: mock(() => true),
    send: mock(() => true),
    disconnect: mock(() => {}),
    ref: mock(() => {}),
    [Symbol.dispose]: mock(() => {}),
    ...overrides
  } as unknown as ChildProcess;
  
  // Ensure 'on' returns the mockChild if not overridden differently
  if (!overrides.on) {
      (mockChild.on as Mock<any>).mockReturnValue(mockChild);
  }

  return mockChild;
}

export function createSpawnMock(customChildMock?: ChildProcess) {
  const child = customChildMock || createChildProcessMock();
  // biome-ignore lint/suspicious/noExplicitAny: Mock needs flexible typing
  return spyOn(childProcess, "spawn").mockImplementation((): any => child);
}

export function mockPlayNotification() {
    return spyOn(notifications, "playNotification").mockImplementation(() => {});
}
