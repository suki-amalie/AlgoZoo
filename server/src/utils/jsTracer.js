// Builds a self-contained JavaScript program that runs already-instrumented student
// code and emits a JSON trace (one entry per executed statement/call/return) to stdout —
// the JavaScript counterpart to pythonTracer.js, producing the identical JSON contract
// (see client/src/types/execution.ts) so TraceVisualizer.tsx needs no changes.
//
// Unlike Python (sys.settrace is a runtime hook that must run inside the traced
// interpreter), tracing here is pure source-to-source instrumentation: we parse the
// student's code with acorn (a real npm dependency — this parsing happens on OUR
// server, not inside Piston, so there's no sandbox size/dependency constraint to work
// around), splice in small trace-capturing calls between statements, and send Piston
// the final plain JavaScript to execute. No debugger protocol, no child process, no
// networking — same single-process, single-file execution model as the Python harness.
//
// Each declaration site (var/let/const, function params, catch params, loop bindings)
// self-registers a live getter closure into the current call-frame the moment it's
// bound, so the trace runtime never needs to know in advance which names are in scope
// at a given point — it just reads whatever's been registered so far, in the order
// registered. This reproduces Python's "a variable only appears once assigned" behavior
// without any static scope analysis, and handles destructuring/loop/catch bindings for
// free since each introduces its own declare call independently.
//
// Known v1 limits: no async/await, Promises, generators, or timer-based control flow
// (Python's tracer doesn't specially handle these either); arrow functions with an
// expression body (not a block) aren't stepped into internally, just treated as a
// single opaque call; `var` is treated like `let`/`const` (visible once its declaration
// line runs, not truly hoisted) to match the existing "reveal on assignment" pedagogy.
const acorn = require('acorn');

const MAX_STEPS = 500;
const MAX_DEPTH = 60;
const MAX_HEAP_OBJECTS = 150;
const MAX_CONTAINER_ITEMS = 200;
const MAX_STRING_LEN = 300;

// ---- bound-name extraction (identifier / destructuring patterns) ----

function boundNames(pattern, out) {
  if (!pattern) return out;
  switch (pattern.type) {
    case 'Identifier':
      out.push(pattern.name);
      break;
    case 'AssignmentPattern':
      boundNames(pattern.left, out);
      break;
    case 'RestElement':
      boundNames(pattern.argument, out);
      break;
    case 'ArrayPattern':
      for (const el of pattern.elements) if (el) boundNames(el, out);
      break;
    case 'ObjectPattern':
      for (const prop of pattern.properties) {
        boundNames(prop.type === 'RestElement' ? prop.argument : prop.value, out);
      }
      break;
    default:
      break;
  }
  return out;
}

// ---- generic AST walk + offset-based source instrumentation ----

// Keys that never hold child AST nodes — skipped by the generic fallback walker so it
// doesn't try to recurse into location metadata or primitive fields.
const NON_NODE_KEYS = new Set([
  'type', 'start', 'end', 'loc', 'range', 'name', 'value', 'raw', 'operator',
  'computed', 'generator', 'async', 'static', 'kind', 'sourceType', 'regex', 'prefix',
]);

function isNodeLike(v) {
  return v && typeof v === 'object' && typeof v.type === 'string';
}

class Instrumenter {
  constructor() {
    this.insertions = []; // { offset, text, priority } — priority breaks ties at the same offset
  }

  insert(offset, text, priority = 0) {
    this.insertions.push({ offset, text, priority });
  }

  declareAfter(offset, names) {
    for (const name of names) {
      this.insert(offset, `;__declare__(${JSON.stringify(name)},function(){return ${name}});`, 1);
    }
  }

  // Instruments a list of sibling statements (a BlockStatement/Program body, or a
  // SwitchCase's consequent) — a __step__ call before each, declares for any name a
  // statement directly introduces, then recurses into each statement's own children.
  instrumentStatementList(list) {
    for (const stmt of list) {
      this.insert(stmt.start, `__step__(${stmt.loc.start.line});`, 0);
      if (stmt.type === 'VariableDeclaration') {
        const names = [];
        for (const decl of stmt.declarations) boundNames(decl.id, names);
        this.declareAfter(stmt.end, names);
      } else if (stmt.type === 'FunctionDeclaration' && stmt.id) {
        this.declareAfter(stmt.end, [stmt.id.name]);
      } else if (stmt.type === 'ClassDeclaration' && stmt.id) {
        this.declareAfter(stmt.end, [stmt.id.name]);
      }
      this.visit(stmt);
    }
  }

  // A loop/if body that isn't a block (e.g. `for (...) doThing();`) still needs a
  // __step__ before it, even though it won't get the BlockStatement treatment.
  instrumentBareBody(node) {
    if (node.type === 'BlockStatement') {
      this.visit(node);
    } else {
      this.insert(node.start, `__step__(${node.loc.start.line});`, 0);
      this.visit(node);
    }
  }

  // A for/for-in/for-of loop's own bound names (e.g. `for (let i = 0; ...)`,
  // `for (const x of xs)`) can't be declared *inside* the loop header — a for-header's
  // clauses only accept expressions, not extra statements, so splicing a declare call
  // in there breaks the loop's own syntax. Declare at the top of the body instead
  // (re-registers every iteration, which __declare__ treats as an update, not a
  // duplicate).
  declareAtBodyStart(bodyNode, names) {
    const offset = bodyNode.type === 'BlockStatement' ? bodyNode.start + 1 : bodyNode.start;
    this.declareAfter(offset, names);
  }

  instrumentFunction(node, displayName) {
    const names = [];
    for (const param of node.params) boundNames(param, names);
    const bodyStart = node.body.start + 1; // right after the opening '{'
    const bodyEnd = node.body.end - 1; // right before the closing '}'
    // Params must be declared before the 'call' step is recorded (not after), so they're
    // already visible at the moment the frame is entered — matching Python, where
    // f_locals already includes bound params at the 'call' event.
    this.insert(bodyStart, `__enter__(${JSON.stringify(displayName)},${node.loc.start.line});`, 0);
    this.declareAfter(bodyStart, names);
    this.insert(bodyStart, `__recordStep__('call');try{`, 2);
    this.insert(bodyEnd, `}finally{__exit__();}`, 2);
    for (const param of node.params) this.visit(param);
    this.visit(node.body);
  }

  visit(node) {
    if (Array.isArray(node)) {
      for (const item of node) this.visit(item);
      return;
    }
    if (!isNodeLike(node)) return;

    switch (node.type) {
      case 'Program':
        this.instrumentStatementList(node.body);
        return;
      case 'BlockStatement':
        this.instrumentStatementList(node.body);
        return;
      case 'FunctionDeclaration':
      case 'FunctionExpression':
        this.instrumentFunction(node, node.id ? node.id.name : 'anonymous');
        return;
      case 'ArrowFunctionExpression':
        if (node.body.type === 'BlockStatement') {
          this.instrumentFunction(node, 'anonymous');
        } else {
          // Expression-bodied arrow: not stepped into internally (v1 limit) — still
          // walk it in case it contains further nested functions to instrument.
          this.visit(node.body);
        }
        return;
      case 'MethodDefinition':
      case 'Property':
        if (node.value && (node.value.type === 'FunctionExpression' || node.value.type === 'ArrowFunctionExpression')) {
          const name = node.key && (node.key.name || node.key.value);
          if (node.value.type === 'FunctionExpression') {
            this.instrumentFunction(node.value, name || 'anonymous');
          } else if (node.value.body.type === 'BlockStatement') {
            this.instrumentFunction(node.value, name || 'anonymous');
          } else {
            this.visit(node.value.body);
          }
        } else {
          this.visitChildrenGeneric(node);
        }
        return;
      case 'ForStatement': {
        if (node.init && node.init.type === 'VariableDeclaration') {
          const names = [];
          for (const decl of node.init.declarations) boundNames(decl.id, names);
          this.declareAtBodyStart(node.body, names);
        }
        if (node.init) this.visit(node.init);
        if (node.test) this.visit(node.test);
        if (node.update) this.visit(node.update);
        this.instrumentBareBody(node.body);
        return;
      }
      case 'ForInStatement':
      case 'ForOfStatement': {
        if (node.left.type === 'VariableDeclaration') {
          const names = [];
          boundNames(node.left.declarations[0].id, names);
          this.declareAtBodyStart(node.body, names);
        }
        this.visit(node.right);
        this.instrumentBareBody(node.body);
        return;
      }
      case 'WhileStatement':
      case 'DoWhileStatement':
        this.visit(node.test);
        this.instrumentBareBody(node.body);
        return;
      case 'IfStatement':
        this.visit(node.test);
        this.instrumentBareBody(node.consequent);
        if (node.alternate) this.instrumentBareBody(node.alternate);
        return;
      case 'TryStatement':
        this.visit(node.block);
        if (node.handler) {
          if (node.handler.param) {
            const names = boundNames(node.handler.param, []);
            this.declareAfter(node.handler.body.start + 1, names);
          }
          this.visit(node.handler.body);
        }
        if (node.finalizer) this.visit(node.finalizer);
        return;
      case 'SwitchStatement':
        this.visit(node.discriminant);
        for (const c of node.cases) this.instrumentStatementList(c.consequent);
        return;
      default:
        this.visitChildrenGeneric(node);
        return;
    }
  }

  visitChildrenGeneric(node) {
    for (const key of Object.keys(node)) {
      if (NON_NODE_KEYS.has(key)) continue;
      const val = node[key];
      if (Array.isArray(val) || isNodeLike(val)) this.visit(val);
    }
  }

  apply(source) {
    // Group by offset first and concatenate each group into one insert (ascending
    // priority, original order within a priority) — repeatedly slicing at the exact
    // same offset would otherwise reverse the order of same-offset insertions, since
    // each later splice lands ahead of the one already sitting at that position.
    const byOffset = new Map();
    for (const ins of this.insertions) {
      if (!byOffset.has(ins.offset)) byOffset.set(ins.offset, []);
      byOffset.get(ins.offset).push(ins);
    }
    const offsets = [...byOffset.keys()].sort((a, b) => b - a); // descending: apply from the end backwards
    let out = source;
    for (const offset of offsets) {
      const group = byOffset.get(offset).sort((a, b) => a.priority - b.priority);
      const text = group.map((ins) => ins.text).join('');
      out = out.slice(0, offset) + text + out.slice(offset);
    }
    return out;
  }
}

function instrument(source) {
  const ast = acorn.parse(source, { ecmaVersion: 2022, locations: true, ranges: true, sourceType: 'script' });
  const instrumenter = new Instrumenter();
  instrumenter.visit(ast);
  return instrumenter.apply(source);
}

// ---- the runtime prelude shipped alongside the instrumented code ----

function runtimePrelude() {
  return `
const __steps__ = [];
const __stack__ = [];
let __stdoutBuf__ = '';
let __truncated__ = false;
const __heapIds__ = new WeakMap();
let __heapIdCounter__ = 0;

const __origLog__ = console.log;
const __util__ = require('util');
console.log = function (...args) {
  // JSON.stringify(Infinity) is "null" and gives ugly output for objects — match real
  // console.log's own formatting instead (String() for primitives, util.inspect for
  // objects/arrays, both Node builtins).
  __stdoutBuf__ += args.map(function (a) {
    if (typeof a === 'string') return a;
    if (typeof a === 'object' && a !== null) { try { return __util__.inspect(a); } catch (e) { return String(a); } }
    return String(a);
  }).join(' ') + '\\n';
};

function __clipStr__(s) {
  return s.length <= ${MAX_STRING_LEN} ? s : s.slice(0, ${MAX_STRING_LEN}) + '...';
}

function __isClass__(fn) {
  return typeof fn === 'function' && /^class(\\s|\\{)/.test(Function.prototype.toString.call(fn));
}

function __opaqueLabel__(v) {
  if (__isClass__(v)) return '<class>';
  return '<function>';
}

class __TraceStop__ extends Error {}

function __serializeValue__(v, heap, seen) {
  if (v === undefined) return { kind: 'undefined' };
  if (v === null || typeof v === 'boolean' || typeof v === 'number') return { kind: 'value', value: v };
  if (typeof v === 'string') return { kind: 'value', value: __clipStr__(v) };
  if (typeof v === 'function') return { kind: 'value', value: __opaqueLabel__(v) };

  let id = __heapIds__.get(v);
  if (id === undefined) {
    id = String(++__heapIdCounter__);
    __heapIds__.set(v, id);
  }
  if (seen.has(id)) return { kind: 'ref', id: id };
  seen.add(id);
  if (Object.keys(heap).length >= ${MAX_HEAP_OBJECTS}) return { kind: 'value', value: '<heap limit reached>' };

  try {
    if (Array.isArray(v)) {
      heap[id] = { type: 'list', items: v.slice(0, ${MAX_CONTAINER_ITEMS}).map(function (x) { return __serializeValue__(x, heap, seen); }) };
    } else if (v instanceof Map) {
      heap[id] = {
        type: 'dict',
        items: Array.from(v.entries()).slice(0, ${MAX_CONTAINER_ITEMS}).map(function (e) {
          return [__serializeValue__(e[0], heap, seen), __serializeValue__(e[1], heap, seen)];
        }),
      };
    } else if (v instanceof Set) {
      heap[id] = { type: 'set', items: Array.from(v).slice(0, ${MAX_CONTAINER_ITEMS}).map(function (x) { return __serializeValue__(x, heap, seen); }) };
    } else {
      const ctorName = v.constructor && v.constructor.name && v.constructor.name !== 'Object' ? v.constructor.name : 'Object';
      heap[id] = {
        type: ctorName,
        fields: Object.keys(v).slice(0, ${MAX_CONTAINER_ITEMS}).map(function (k) { return [k, __serializeValue__(v[k], heap, seen)]; }),
      };
    }
  } catch (e) {
    heap[id] = { type: 'Object', repr: '<unrepresentable>' };
  }
  return { kind: 'ref', id: id };
}

function __declare__(name, getter) {
  const frame = __stack__[__stack__.length - 1];
  if (!frame) return;
  for (const entry of frame.getters) {
    if (entry[0] === name) { entry[1] = getter; return; }
  }
  frame.getters.push([name, getter]);
}

function __recordStep__(event) {
  if (__steps__.length >= ${MAX_STEPS}) { __truncated__ = true; throw new __TraceStop__(); }
  if (__stack__.length > ${MAX_DEPTH}) { __truncated__ = true; throw new __TraceStop__(); }
  const heap = {};
  const seen = new Set();
  const frames = __stack__.map(function (frame) {
    const vars = frame.getters.map(function (entry) {
      let value;
      try { value = entry[1](); } catch (e) { value = undefined; }
      return [entry[0], __serializeValue__(value, heap, seen)];
    });
    return { fn: frame.fn, line: frame.line, vars: vars };
  });
  __steps__.push({ line: __stack__.length ? __stack__[__stack__.length - 1].line : 0, event: event, frames: frames, heap: heap });
}

function __step__(line) {
  if (__stack__.length) __stack__[__stack__.length - 1].line = line;
  __recordStep__('line');
}

function __enter__(fn, line) {
  __stack__.push({ fn: fn, line: line, getters: [] });
}

function __exit__() {
  __recordStep__('return');
  __stack__.pop();
}
`;
}

function buildTraceHarness(studentCode) {
  let instrumented;
  let parseError = null;
  try {
    instrumented = instrument(studentCode);
  } catch (e) {
    parseError = e;
  }

  const encodedInstrumented = parseError ? '' : Buffer.from(instrumented, 'utf-8').toString('base64');
  const parseErrorJson = parseError
    ? JSON.stringify({ type: 'SyntaxError', message: parseError.message, line: parseError.loc ? parseError.loc.line : null })
    : 'null';

  return `${runtimePrelude()}
const __instrumentedB64__ = '${encodedInstrumented}';
const __parseError__ = ${parseErrorJson};

let __error__ = null;

if (__parseError__) {
  __error__ = __parseError__;
} else {
  __stack__.push({ fn: '<module>', line: 0, getters: [] });
  try {
    const __src__ = Buffer.from(__instrumentedB64__, 'base64').toString('utf-8');
    eval(__src__);
  } catch (e) {
    if (!(e instanceof __TraceStop__)) {
      __error__ = { type: e.constructor ? e.constructor.name : 'Error', message: e.message, line: __stack__.length ? __stack__[__stack__.length - 1].line : null };
    }
  }
}

let __output__ = __stdoutBuf__;
if (__output__.length > 20000) __output__ = __output__.slice(0, 20000) + '...';

__origLog__(JSON.stringify({ steps: __steps__, stdout: __output__, truncated: __truncated__, error: __error__ }));
`;
}

module.exports = { buildTraceHarness };
