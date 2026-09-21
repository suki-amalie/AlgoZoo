const { executeCode } = require('../utils/piston');
const { buildTraceHarness: buildPythonTraceHarness } = require('../utils/pythonTracer');
const { buildTraceHarness: buildJsTraceHarness } = require('../utils/jsTracer');
const { buildTraceHarness: buildCppTraceHarness } = require('../utils/cppTracer');

const MAX_CODE_LENGTH = 20000;
const MAX_STDIN_LENGTH = 5000;

const TRACE_BUILDERS = {
    python: { build: buildPythonTraceHarness, pistonLanguage: 'python' },
    javascript: { build: buildJsTraceHarness, pistonLanguage: 'javascript' },
    'c++': { build: buildCppTraceHarness, pistonLanguage: 'c++' },
};

/**
 * Run student-submitted code in a sandboxed Piston runtime
 * POST /api/execution/run
 */
exports.runCode = async (req, res) => {
    try {
        const { language, code, stdin } = req.body;

        if (!language || typeof language !== 'string') {
            return res.status(400).json({ status: 'error', message: 'language is required' });
        }
        if (!code || typeof code !== 'string') {
            return res.status(400).json({ status: 'error', message: 'code is required' });
        }
        if (code.length > MAX_CODE_LENGTH) {
            return res.status(400).json({ status: 'error', message: `code exceeds the ${MAX_CODE_LENGTH} character limit` });
        }
        if (stdin && String(stdin).length > MAX_STDIN_LENGTH) {
            return res.status(400).json({ status: 'error', message: `stdin exceeds the ${MAX_STDIN_LENGTH} character limit` });
        }

        const result = await executeCode({ language, code, stdin: stdin || '' });
        const run = result.run || {};
        const compile = result.compile;

        return res.status(200).json({
            status: 'success',
            data: {
                language: result.language,
                version: result.version,
                stdout: run.stdout || '',
                stderr: run.stderr || '',
                output: run.output || '',
                exitCode: typeof run.code === 'number' ? run.code : null,
                signal: run.signal || null,
                compile: compile
                    ? {
                        stdout: compile.stdout || '',
                        stderr: compile.stderr || '',
                        exitCode: typeof compile.code === 'number' ? compile.code : null,
                    }
                    : null,
            },
        });
    } catch (error) {
        console.error('runCode Error:', error);
        return res.status(502).json({
            status: 'error',
            message: error.message || 'Unable to execute code',
        });
    }
};

/**
 * Trace student-submitted code line-by-line for the step visualizer (Pointerwalk).
 * Supports Python, JavaScript, and C++.
 * POST /api/execution/trace
 */
exports.traceCode = async (req, res) => {
    try {
        const { code, stdin, language } = req.body;
        const normalizedLanguage = typeof language === 'string' ? language.toLowerCase() : 'python';

        if (!code || typeof code !== 'string') {
            return res.status(400).json({ status: 'error', message: 'code is required' });
        }
        if (code.length > MAX_CODE_LENGTH) {
            return res.status(400).json({ status: 'error', message: `code exceeds the ${MAX_CODE_LENGTH} character limit` });
        }
        if (stdin && String(stdin).length > MAX_STDIN_LENGTH) {
            return res.status(400).json({ status: 'error', message: `stdin exceeds the ${MAX_STDIN_LENGTH} character limit` });
        }
        const builder = TRACE_BUILDERS[normalizedLanguage];
        if (!builder) {
            return res.status(400).json({ status: 'error', message: `Visualization is not supported for ${language}` });
        }

        const harness = builder.build(code);
        const result = await executeCode({ language: builder.pistonLanguage, code: harness, stdin: stdin || '' });
        const run = result.run || {};

        if (typeof run.code === 'number' && run.code !== 0 && !run.stdout) {
            return res.status(502).json({
                status: 'error',
                message: 'Tracer failed to run',
                detail: run.stderr || null,
            });
        }

        let trace;
        try {
            trace = JSON.parse(run.stdout);
        } catch (parseError) {
            return res.status(502).json({
                status: 'error',
                message: 'Unable to parse trace output',
                detail: (run.stdout || '').slice(0, 2000),
            });
        }

        return res.status(200).json({
            status: 'success',
            data: {
                steps: trace.steps || [],
                stdout: trace.stdout || '',
                truncated: Boolean(trace.truncated),
                error: trace.error || null,
            },
        });
    } catch (error) {
        console.error('traceCode Error:', error);
        return res.status(502).json({
            status: 'error',
            message: error.message || 'Unable to trace code',
        });
    }
};
