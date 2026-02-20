import { spawn } from "child_process";

export async function captureCliOutput(fn: () => Promise<void> | void): Promise<{ stdout: string[], stderr: string[] }> {
    const stdout: string[] = [];
    const stderr: string[] = [];
    const originalLog = console.log;
    const originalError = console.error;

    console.log = (...args: any[]) => stdout.push(args.map(a => String(a)).join(" "));
    console.error = (...args: any[]) => stderr.push(args.map(a => String(a)).join(" "));

    try {
        await fn();
    } finally {
        console.log = originalLog;
        console.error = originalError;
    }

    return { stdout, stderr };
}

export function runCliCommand(command: string, args: string[] = [], cwd?: string): Promise<{ stdout: string, stderr: string, exitCode: number }> {
    return new Promise((resolve, reject) => {
        const proc = spawn(command, args, { 
            stdio: 'pipe',
            cwd
        });
        let stdout = "";
        let stderr = "";

        if (proc.stdout) {
            proc.stdout.on("data", (data) => stdout += data.toString());
        }
        if (proc.stderr) {
            proc.stderr.on("data", (data) => stderr += data.toString());
        }

        proc.on("close", (code) => {
            resolve({ stdout, stderr, exitCode: code ?? 0 });
        });
        
        proc.on("error", (err) => reject(err));
    });
}
