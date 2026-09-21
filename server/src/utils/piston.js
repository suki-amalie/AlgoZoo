// Talks to a Piston code-execution API (https://github.com/engineer-man/piston).
// Defaults to the public instance; set PISTON_API_URL to point at a self-hosted one.
const { PISTON_API_URL } = require('../config/env');

const BASE_URL = PISTON_API_URL || 'https://emkc.org/api/v2/piston';

// Friendly dropdown labels (client) -> Piston's runtime "language" key
const LANGUAGE_ALIASES = {
  python: 'python',
  javascript: 'javascript',
  js: 'javascript',
  typescript: 'typescript',
  java: 'java',
  'c++': 'c++',
  cpp: 'c++',
};

const RUNTIMES_CACHE_TTL_MS = 60 * 60 * 1000; // Piston versions change rarely; refresh hourly.
let runtimesCache = null;
let runtimesCachedAt = 0;

async function getRuntimes() {
  if (runtimesCache && Date.now() - runtimesCachedAt < RUNTIMES_CACHE_TTL_MS) {
    return runtimesCache;
  }
  const response = await fetch(`${BASE_URL}/runtimes`);
  if (!response.ok) {
    throw new Error(`Unable to fetch Piston runtimes (${response.status})`);
  }
  runtimesCache = await response.json();
  runtimesCachedAt = Date.now();
  return runtimesCache;
}

async function resolveRuntime(friendlyLanguage) {
  const key = LANGUAGE_ALIASES[String(friendlyLanguage).toLowerCase()] || String(friendlyLanguage).toLowerCase();
  const runtimes = await getRuntimes();
  const match = runtimes.find((r) => r.language === key || (r.aliases || []).includes(key));
  if (!match) {
    throw new Error(`Unsupported language: ${friendlyLanguage}`);
  }
  return { language: match.language, version: match.version };
}

async function executeCode({ language, code, stdin = '' }) {
  const runtime = await resolveRuntime(language);

  const response = await fetch(`${BASE_URL}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      language: runtime.language,
      version: runtime.version,
      files: [{ content: code }],
      stdin,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Piston execution failed (${response.status}): ${text}`);
  }

  return response.json();
}

module.exports = { executeCode, resolveRuntime, getRuntimes };
