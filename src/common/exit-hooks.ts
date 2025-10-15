
type ExitFunc = (error: unknown, callback: () => void) => void;

const tasks: ExitFunc[] = [];

export const addExitTask = (fn: ExitFunc) => tasks.push(fn);

process.on('exit', (code) => handleExit(code));
process.on('SIGHUP', () => handleExit(128 + 1));
process.on('SIGINT', () => handleExit(128 + 2));
process.on('SIGTERM', () => handleExit(128 + 15));
process.on('SIGBREAK', () => handleExit(128 + 21));
process.on('uncaughtException', (error) => handleExit(1, error));
process.on('unhandledRejection', (error) => handleExit(1, error));


let isExiting = false;


const handleExit = (code: number, error?: unknown) => {
    if (isExiting) return;
    isExiting = true;

    console.log("Exiting", code, error);

    let hasDoExit = false;
    const doExit = () => {
        if (hasDoExit) return;
        hasDoExit = true;
        process.nextTick(() => process.exit(code));
    };

    let asyncTaskCount = 0;
    let asyncTaskCallback = () => {
        process.nextTick(() => {
            asyncTaskCount--;
            if (asyncTaskCount === 0) doExit();
        });
    };

    tasks.forEach((taskFn) => {
        if (taskFn.length > 1) {
            asyncTaskCount++;
            taskFn(error, asyncTaskCallback);
        } else {
            taskFn(error);
        }
    });

    if (asyncTaskCount > 0) {
        setTimeout(() => doExit(), 10 * 1000);
    } else {
        doExit();
    }
};