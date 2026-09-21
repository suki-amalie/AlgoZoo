// Exercises the Python tracer (server/src/utils/pythonTracer.js) against a self-hosted
// Piston instance and asserts the output is actually correct — in particular that
// multi-frame traces (function calls, recursion, custom objects) work, since that's the
// exact thing we could never validate on the WSL2/Docker Desktop dev setup (see the
// "Known Blocker" section of the Code Visualizer status doc).
//
// Run with PISTON_API_URL pointing at a running Piston instance, e.g.:
//   PISTON_API_URL=http://localhost:2000/api/v2 node scripts/validate-tracer.js
const fs = require('fs');
const path = require('path');
const { buildTraceHarness: buildPythonTraceHarness } = require('../src/utils/pythonTracer');
const { buildTraceHarness: buildJsTraceHarness } = require('../src/utils/jsTracer');
const { buildTraceHarness: buildCppTraceHarness } = require('../src/utils/cppTracer');
const { executeCode } = require('../src/utils/piston');

const BUILDERS = {
  python: { build: buildPythonTraceHarness, pistonLanguage: 'python' },
  javascript: { build: buildJsTraceHarness, pistonLanguage: 'javascript' },
  cpp: { build: buildCppTraceHarness, pistonLanguage: 'c++' },
};

const OUT_DIR = path.join(__dirname, 'tracer-validation-output');
fs.mkdirSync(OUT_DIR, { recursive: true });

function maxFrameCount(trace) {
  return Math.max(...trace.steps.map((s) => s.frames.length));
}

// Collects every heap snapshot of a list of the given length across all steps, as arrays
// of raw values — used to confirm a container's *mutation over time* was actually
// captured, not just its final state (the whole point of visualizing an in-place sort).
function listSnapshots(trace, len) {
  const snaps = [];
  for (const step of trace.steps) {
    for (const entry of Object.values(step.heap)) {
      if (entry.type === 'list' && entry.items.length === len) {
        snaps.push(JSON.stringify(entry.items.map((it) => it.value)));
      }
    }
  }
  return snaps;
}

function hasHeapType(trace, type) {
  return trace.steps.some((s) => Object.values(s.heap).some((entry) => entry.type === type));
}

function hasVarValue(trace, needle) {
  return trace.steps.some((s) =>
    s.frames.some((f) => f.vars.some(([, v]) => v.kind === 'value' && v.value === needle))
  );
}

const CASES = [
  {
    name: 'straight-line',
    code: 'x = 1\ny = 2\nz = x + y\nprint(z)\n',
    check: (trace) => {
      if (trace.error) throw new Error(`unexpected error: ${JSON.stringify(trace.error)}`);
      if (trace.steps.length < 4) throw new Error(`expected >=4 steps, got ${trace.steps.length}`);
      if (trace.stdout.trim() !== '3') throw new Error(`expected stdout '3', got ${JSON.stringify(trace.stdout)}`);
    },
  },
  {
    name: 'function-call',
    code: 'def add(a, b):\n    return a + b\n\nprint(add(1, 2))\n',
    check: (trace) => {
      if (trace.error) throw new Error(`unexpected error: ${JSON.stringify(trace.error)}`);
      if (maxFrameCount(trace) < 2) throw new Error(`expected a multi-frame trace, got max ${maxFrameCount(trace)} frame(s)`);
      if (trace.stdout.trim() !== '3') throw new Error(`expected stdout '3', got ${JSON.stringify(trace.stdout)}`);
    },
  },
  {
    name: 'loop',
    code: 'def total(arr):\n    result = 0\n    for x in arr:\n        result += x\n    return result\n\nprint(total([4, 1, 7]))\n',
    check: (trace) => {
      if (trace.error) throw new Error(`unexpected error: ${JSON.stringify(trace.error)}`);
      if (maxFrameCount(trace) < 2) throw new Error(`expected a multi-frame trace, got max ${maxFrameCount(trace)} frame(s)`);
      if (trace.stdout.trim() !== '12') throw new Error(`expected stdout '12', got ${JSON.stringify(trace.stdout)}`);
    },
  },
  {
    name: 'recursive-factorial',
    code: 'def factorial(n):\n    if n <= 1:\n        return 1\n    return n * factorial(n - 1)\n\nprint(factorial(4))\n',
    check: (trace) => {
      if (trace.error) throw new Error(`unexpected error: ${JSON.stringify(trace.error)}`);
      // module frame + 4 nested factorial() calls at the deepest point
      if (maxFrameCount(trace) < 5) throw new Error(`expected recursion depth >=5, got max ${maxFrameCount(trace)} frame(s)`);
      if (trace.stdout.trim() !== '24') throw new Error(`expected stdout '24', got ${JSON.stringify(trace.stdout)}`);
    },
  },
  {
    name: 'linked-list-reversal',
    code:
      'class Node:\n    def __init__(self, val, next=None):\n        self.val = val\n        self.next = next\n\n' +
      'def reverse(head):\n    prev = None\n    curr = head\n    while curr:\n        nxt = curr.next\n        curr.next = prev\n        prev = curr\n        curr = nxt\n    return prev\n\n' +
      'head = Node(1, Node(2, Node(3, None)))\nnew_head = reverse(head)\nprint(new_head.val)\n',
    check: (trace) => {
      if (trace.error) throw new Error(`unexpected error: ${JSON.stringify(trace.error)}`);
      if (maxFrameCount(trace) < 2) throw new Error(`expected a multi-frame trace, got max ${maxFrameCount(trace)} frame(s)`);
      const hasNodeInHeap = trace.steps.some((s) => Object.values(s.heap).some((entry) => entry.type === 'Node'));
      if (!hasNodeInHeap) throw new Error('expected at least one Node object to appear in the heap');
      if (trace.stdout.trim() !== '3') throw new Error(`expected stdout '3' (reversed head.val), got ${JSON.stringify(trace.stdout)}`);
    },
  },
  {
    name: 'bubble-sort',
    code:
      'def bubble_sort(arr):\n    n = len(arr)\n    for i in range(n):\n        for j in range(0, n - i - 1):\n            if arr[j] > arr[j + 1]:\n                arr[j], arr[j + 1] = arr[j + 1], arr[j]\n    return arr\n\n' +
      'print(bubble_sort([5, 2, 4, 1, 3]))\n',
    check: (trace) => {
      if (trace.error) throw new Error(`unexpected error: ${JSON.stringify(trace.error)}`);
      if (trace.stdout.trim() !== '[1, 2, 3, 4, 5]') throw new Error(`expected sorted output, got ${JSON.stringify(trace.stdout)}`);
      const snaps = listSnapshots(trace, 5);
      const distinct = new Set(snaps);
      if (distinct.size < 2) throw new Error(`expected the array to visibly change across steps, got ${distinct.size} distinct snapshot(s)`);
      if (snaps[snaps.length - 1] !== JSON.stringify([1, 2, 3, 4, 5])) {
        throw new Error(`expected final array snapshot to be sorted, got ${snaps[snaps.length - 1]}`);
      }
    },
  },
  {
    name: 'binary-search',
    code:
      'def binary_search(arr, target, lo, hi):\n    if lo > hi:\n        return -1\n    mid = (lo + hi) // 2\n    if arr[mid] == target:\n        return mid\n    elif arr[mid] < target:\n        return binary_search(arr, target, mid + 1, hi)\n    else:\n        return binary_search(arr, target, lo, mid - 1)\n\n' +
      'nums = [1, 3, 5, 7, 9, 11, 13]\nprint(binary_search(nums, 11, 0, len(nums) - 1))\n',
    check: (trace) => {
      if (trace.error) throw new Error(`unexpected error: ${JSON.stringify(trace.error)}`);
      if (maxFrameCount(trace) < 3) throw new Error(`expected multiple nested binary_search frames, got max ${maxFrameCount(trace)} frame(s)`);
      if (trace.stdout.trim() !== '5') throw new Error(`expected stdout '5' (index of 11), got ${JSON.stringify(trace.stdout)}`);
    },
  },
  {
    name: 'graph-bfs',
    code:
      'def bfs(graph, start):\n    visited = {start}\n    order = []\n    queue = [start]\n    while queue:\n        node = queue.pop(0)\n        order.append(node)\n        for neighbor in graph[node]:\n            if neighbor not in visited:\n                visited.add(neighbor)\n                queue.append(neighbor)\n    return order\n\n' +
      "graph = {'A': ['B', 'C'], 'B': ['A', 'D'], 'C': ['A', 'D'], 'D': ['B', 'C']}\nprint(bfs(graph, 'A'))\n",
    check: (trace) => {
      if (trace.error) throw new Error(`unexpected error: ${JSON.stringify(trace.error)}`);
      if (trace.stdout.trim() !== "['A', 'B', 'C', 'D']") throw new Error(`expected BFS order, got ${JSON.stringify(trace.stdout)}`);
      if (!hasHeapType(trace, 'dict')) throw new Error('expected the adjacency-list dict to appear in the heap');
      if (!hasHeapType(trace, 'set')) throw new Error('expected the visited set to appear in the heap');
    },
  },
  {
    name: 'binary-tree-inorder',
    code:
      'class TreeNode:\n    def __init__(self, val, left=None, right=None):\n        self.val = val\n        self.left = left\n        self.right = right\n\n' +
      'def inorder(node, result):\n    if node is None:\n        return\n    inorder(node.left, result)\n    result.append(node.val)\n    inorder(node.right, result)\n\n' +
      'root = TreeNode(2, TreeNode(1), TreeNode(3))\nresult = []\ninorder(root, result)\nprint(result)\n',
    check: (trace) => {
      if (trace.error) throw new Error(`unexpected error: ${JSON.stringify(trace.error)}`);
      if (maxFrameCount(trace) < 3) throw new Error(`expected nested inorder() recursion, got max ${maxFrameCount(trace)} frame(s)`);
      if (!hasHeapType(trace, 'TreeNode')) throw new Error('expected TreeNode objects to appear in the heap');
      if (trace.stdout.trim() !== '[1, 2, 3]') throw new Error(`expected in-order traversal, got ${JSON.stringify(trace.stdout)}`);
    },
  },
  {
    name: 'validate-bst',
    code:
      'class TreeNode:\n    def __init__(self, val=0, left=None, right=None):\n        self.val = val\n        self.left = left\n        self.right = right\n\n\n' +
      'class Solution:\n    def isValidBST(self, root):\n\n        def dfs(node, low, high):\n            if node is None:\n                return True\n\n            if node.val <= low or node.val >= high:\n                return False\n\n            return dfs(node.left, low, node.val) and \\\n                   dfs(node.right, node.val, high)\n\n        return dfs(root, float("-inf"), float("inf"))\n\n\n' +
      'root = TreeNode(\n    5,\n    TreeNode(3, TreeNode(2), TreeNode(4)),\n    TreeNode(7, TreeNode(6), TreeNode(8))\n)\n\n' +
      'solution = Solution()\n\nprint(solution.isValidBST(root))\n',
    check: (trace) => {
      if (trace.error) throw new Error(`unexpected error: ${JSON.stringify(trace.error)}`);
      if (trace.stdout.trim() !== 'True') throw new Error(`expected stdout 'True', got ${JSON.stringify(trace.stdout)}`);
      if (!hasHeapType(trace, 'TreeNode')) throw new Error('expected TreeNode objects to appear in the heap');
      if (maxFrameCount(trace) < 4) throw new Error(`expected nested dfs() recursion inside a method, got max ${maxFrameCount(trace)} frame(s)`);
      // float("-inf")/float("inf") serialize as bare Infinity/-Infinity tokens via json.dumps,
      // which JSON.parse on the client rejects outright — this is what actually broke without
      // the fix (JSON.parse(run.stdout) below would throw), not just a value-correctness issue.
      if (!hasVarValue(trace, '-Infinity') || !hasVarValue(trace, 'Infinity')) {
        throw new Error('expected float("-inf")/float("inf") to be sanitized into Infinity/-Infinity labels');
      }
    },
  },
  {
    name: 'runtime-error',
    code: 'x = 1\ny = 0\nprint(x / y)\n',
    check: (trace) => {
      if (!trace.error) throw new Error('expected an error for division by zero');
      if (trace.error.type !== 'ZeroDivisionError') throw new Error(`expected ZeroDivisionError, got ${trace.error.type}`);
    },
  },
  // ---- JavaScript cases (server/src/utils/jsTracer.js) ----
  {
    name: 'js-straight-line',
    language: 'javascript',
    code: 'const x = 1;\nconst y = 2;\nconst z = x + y;\nconsole.log(z);\n',
    check: (trace) => {
      if (trace.error) throw new Error(`unexpected error: ${JSON.stringify(trace.error)}`);
      if (trace.steps.length < 4) throw new Error(`expected >=4 steps, got ${trace.steps.length}`);
      if (trace.stdout.trim() !== '3') throw new Error(`expected stdout '3', got ${JSON.stringify(trace.stdout)}`);
    },
  },
  {
    name: 'js-function-call',
    language: 'javascript',
    code: 'function add(a, b) {\n  return a + b;\n}\n\nconsole.log(add(1, 2));\n',
    check: (trace) => {
      if (trace.error) throw new Error(`unexpected error: ${JSON.stringify(trace.error)}`);
      if (maxFrameCount(trace) < 2) throw new Error(`expected a multi-frame trace, got max ${maxFrameCount(trace)} frame(s)`);
      if (trace.stdout.trim() !== '3') throw new Error(`expected stdout '3', got ${JSON.stringify(trace.stdout)}`);
    },
  },
  {
    name: 'js-loop',
    language: 'javascript',
    code: 'function total(arr) {\n  let result = 0;\n  for (let i = 0; i < arr.length; i++) {\n    result += arr[i];\n  }\n  return result;\n}\n\nconsole.log(total([4, 1, 7]));\n',
    check: (trace) => {
      if (trace.error) throw new Error(`unexpected error: ${JSON.stringify(trace.error)}`);
      if (maxFrameCount(trace) < 2) throw new Error(`expected a multi-frame trace, got max ${maxFrameCount(trace)} frame(s)`);
      if (trace.stdout.trim() !== '12') throw new Error(`expected stdout '12', got ${JSON.stringify(trace.stdout)}`);
    },
  },
  {
    name: 'js-recursive-factorial',
    language: 'javascript',
    code: 'function factorial(n) {\n  if (n <= 1) {\n    return 1;\n  }\n  return n * factorial(n - 1);\n}\n\nconsole.log(factorial(4));\n',
    check: (trace) => {
      if (trace.error) throw new Error(`unexpected error: ${JSON.stringify(trace.error)}`);
      if (maxFrameCount(trace) < 5) throw new Error(`expected recursion depth >=5, got max ${maxFrameCount(trace)} frame(s)`);
      if (trace.stdout.trim() !== '24') throw new Error(`expected stdout '24', got ${JSON.stringify(trace.stdout)}`);
    },
  },
  {
    name: 'js-bubble-sort',
    language: 'javascript',
    code:
      'function bubbleSort(arr) {\n  const n = arr.length;\n  for (let i = 0; i < n; i++) {\n    for (let j = 0; j < n - i - 1; j++) {\n      if (arr[j] > arr[j + 1]) {\n        const tmp = arr[j];\n        arr[j] = arr[j + 1];\n        arr[j + 1] = tmp;\n      }\n    }\n  }\n  return arr;\n}\n\n' +
      'console.log(bubbleSort([5, 2, 4, 1, 3]));\n',
    check: (trace) => {
      if (trace.error) throw new Error(`unexpected error: ${JSON.stringify(trace.error)}`);
      const snaps = listSnapshots(trace, 5);
      const distinct = new Set(snaps);
      if (distinct.size < 2) throw new Error(`expected the array to visibly change across steps, got ${distinct.size} distinct snapshot(s)`);
      if (snaps[snaps.length - 1] !== JSON.stringify([1, 2, 3, 4, 5])) {
        throw new Error(`expected final array snapshot to be sorted, got ${snaps[snaps.length - 1]}`);
      }
    },
  },
  {
    name: 'js-map-counting',
    language: 'javascript',
    code:
      'function majorityElement(nums) {\n  const counts = new Map();\n  for (const num of nums) {\n    counts.set(num, (counts.get(num) || 0) + 1);\n    if (counts.get(num) > nums.length / 2) {\n      return num;\n    }\n  }\n  return null;\n}\n\n' +
      'console.log(majorityElement([2, 2, 1, 1, 1, 2, 2]));\n',
    check: (trace) => {
      if (trace.error) throw new Error(`unexpected error: ${JSON.stringify(trace.error)}`);
      if (trace.stdout.trim() !== '2') throw new Error(`expected stdout '2', got ${JSON.stringify(trace.stdout)}`);
      if (!hasHeapType(trace, 'dict')) throw new Error('expected the Map to appear in the heap as a dict entry');
    },
  },
  {
    name: 'js-class-linked-list',
    language: 'javascript',
    code:
      'class Node {\n  constructor(val, next = null) {\n    this.val = val;\n    this.next = next;\n  }\n}\n\n' +
      'function reverse(head) {\n  let prev = null;\n  let curr = head;\n  while (curr) {\n    const nxt = curr.next;\n    curr.next = prev;\n    prev = curr;\n    curr = nxt;\n  }\n  return prev;\n}\n\n' +
      'const head = new Node(1, new Node(2, new Node(3, null)));\nconst newHead = reverse(head);\nconsole.log(newHead.val);\n',
    check: (trace) => {
      if (trace.error) throw new Error(`unexpected error: ${JSON.stringify(trace.error)}`);
      if (maxFrameCount(trace) < 2) throw new Error(`expected a multi-frame trace, got max ${maxFrameCount(trace)} frame(s)`);
      if (!hasHeapType(trace, 'Node')) throw new Error('expected Node objects to appear in the heap');
      if (trace.stdout.trim() !== '3') throw new Error(`expected stdout '3' (reversed head.val), got ${JSON.stringify(trace.stdout)}`);
    },
  },
  {
    name: 'js-runtime-error',
    language: 'javascript',
    code: 'const x = 1;\nconsole.log(x.toFixed(2));\nundefinedFunctionCall();\n',
    check: (trace) => {
      if (!trace.error) throw new Error('expected an error for calling an undefined function');
      if (trace.error.type !== 'ReferenceError') throw new Error(`expected ReferenceError, got ${trace.error.type}`);
      if (trace.error.line !== 3) throw new Error(`expected error on line 3, got ${trace.error.line}`);
    },
  },
  // ---- C++ cases (server/src/utils/cppTracer.js — drives gdb/MI, not source instrumentation) ----
  {
    name: 'cpp-straight-line',
    language: 'cpp',
    code: '#include <iostream>\nint main() {\n    int x = 1;\n    int y = 2;\n    std::cout << x + y << std::endl;\n    return 0;\n}\n',
    check: (trace) => {
      if (trace.error) throw new Error(`unexpected error: ${JSON.stringify(trace.error)}`);
      if (trace.steps.length < 4) throw new Error(`expected >=4 steps, got ${trace.steps.length}`);
      if (trace.stdout.trim() !== '3') throw new Error(`expected stdout '3', got ${JSON.stringify(trace.stdout)}`);
    },
  },
  {
    name: 'cpp-function-call',
    language: 'cpp',
    code: 'int add(int a, int b) {\n    return a + b;\n}\n\nint main() {\n    int result = add(1, 2);\n    return 0;\n}\n',
    check: (trace) => {
      if (trace.error) throw new Error(`unexpected error: ${JSON.stringify(trace.error)}`);
      if (maxFrameCount(trace) < 2) throw new Error(`expected a multi-frame trace, got max ${maxFrameCount(trace)} frame(s)`);
      if (!hasVarValue(trace, 3)) throw new Error('expected result (3) to appear as a variable value');
    },
  },
  {
    name: 'cpp-recursive-factorial',
    language: 'cpp',
    code: 'int factorial(int n) {\n    if (n <= 1) {\n        return 1;\n    }\n    return n * factorial(n - 1);\n}\n\nint main() {\n    int result = factorial(4);\n    return 0;\n}\n',
    check: (trace) => {
      if (trace.error) throw new Error(`unexpected error: ${JSON.stringify(trace.error)}`);
      // main + 4 nested factorial() calls at the deepest point
      if (maxFrameCount(trace) < 5) throw new Error(`expected recursion depth >=5, got max ${maxFrameCount(trace)} frame(s)`);
      if (!hasVarValue(trace, 24)) throw new Error('expected result (24 = 4!) to appear as a variable value');
    },
  },
  {
    name: 'cpp-linked-list-reversal',
    language: 'cpp',
    code:
      'struct Node {\n    int val;\n    Node* next;\n    Node(int v, Node* n) : val(v), next(n) {}\n};\n\n' +
      'Node* reverse(Node* head) {\n    Node* prev = nullptr;\n    Node* curr = head;\n    while (curr != nullptr) {\n        Node* nxt = curr->next;\n        curr->next = prev;\n        prev = curr;\n        curr = nxt;\n    }\n    return prev;\n}\n\n' +
      'int main() {\n    Node* c = new Node(3, nullptr);\n    Node* b = new Node(2, c);\n    Node* a = new Node(1, b);\n    Node* newHead = reverse(a);\n    int finalVal = newHead->val;\n    return 0;\n}\n',
    check: (trace) => {
      if (trace.error) throw new Error(`unexpected error: ${JSON.stringify(trace.error)}`);
      if (maxFrameCount(trace) < 2) throw new Error(`expected a multi-frame trace, got max ${maxFrameCount(trace)} frame(s)`);
      if (!hasHeapType(trace, 'Node')) throw new Error('expected Node objects to appear in the heap, with the real struct name (not a placeholder)');
      if (!hasVarValue(trace, 3)) throw new Error('expected finalVal (3, reversed head) to appear as a variable value');
    },
  },
  {
    name: 'cpp-vector',
    language: 'cpp',
    code:
      '#include <vector>\nint sum(std::vector<int> v) {\n    int total = 0;\n    for (int i = 0; i < (int)v.size(); i++) {\n        total += v[i];\n    }\n    return total;\n}\n\n' +
      'int main() {\n    std::vector<int> nums = {4, 1, 7};\n    int result = sum(nums);\n    return 0;\n}\n',
    check: (trace) => {
      if (trace.error) throw new Error(`unexpected error: ${JSON.stringify(trace.error)}`);
      if (!hasVarValue(trace, 12)) throw new Error('expected result (12) to appear as a variable value');
      const hasPrettyVector = trace.steps.some((s) =>
        s.frames.some((f) => f.vars.some(([, v]) => v.kind === 'value' && typeof v.value === 'string' && v.value.includes('std::vector')))
      );
      if (!hasPrettyVector) throw new Error('expected std::vector to appear pretty-printed (STL pretty-printers not working)');
    },
  },
  {
    // Regression case: unordered_map's hash/bucket internals involve far more nested
    // library calls per operation than vector's plain indexing. Without gdb's `skip
    // -gfile` correctly targeting the bits/ subdirectory where that implementation code
    // actually lives (a real bug found via a live student report — an earlier, shallower
    // glob pattern silently matched nothing), this reliably timed out on 8 loop
    // iterations each doing find()/operator[] a couple of times.
    name: 'cpp-unordered-map-loop',
    language: 'cpp',
    code:
      '#include <unordered_map>\n#include <string>\n#include <algorithm>\nint lengthOfLongestSubstring(std::string s) {\n    int longest = 0;\n    std::unordered_map<char, int> seen;\n    int left = 0;\n    for (int right = 0; right < (int)s.length(); right++) {\n        if (seen.find(s[right]) != seen.end() && seen[s[right]] >= left) {\n            left = seen[s[right]] + 1;\n        }\n        seen[s[right]] = right;\n        longest = std::max(longest, right - left + 1);\n    }\n    return longest;\n}\n\n' +
      'int main() {\n    int result = lengthOfLongestSubstring("abcabcbb");\n    return 0;\n}\n',
    check: (trace) => {
      if (trace.error) throw new Error(`unexpected error: ${JSON.stringify(trace.error)}`);
      if (!hasVarValue(trace, 3)) throw new Error('expected longest/result (3) to appear as a variable value');
    },
  },
  {
    name: 'cpp-compile-error',
    language: 'cpp',
    code: 'int main() {\n    int x = \n    return 0;\n}\n',
    check: (trace) => {
      if (!trace.error) throw new Error('expected a compile error for invalid syntax');
      if (trace.error.type !== 'CompileError') throw new Error(`expected CompileError, got ${trace.error.type}`);
      if (trace.error.line !== 3) throw new Error(`expected error on line 3, got ${trace.error.line}`);
    },
  },
];

async function main() {
  let failed = 0;

  for (const testCase of CASES) {
    process.stdout.write(`\n=== ${testCase.name} ===\n`);
    try {
      const { build, pistonLanguage } = BUILDERS[testCase.language || 'python'];
      const harness = build(testCase.code);
      const result = await executeCode({ language: pistonLanguage, code: harness, stdin: '' });
      const run = result.run || {};
      fs.writeFileSync(path.join(OUT_DIR, `${testCase.name}.raw.json`), JSON.stringify(result, null, 2));

      if (typeof run.code !== 'number' || run.code !== 0 || !run.stdout) {
        throw new Error(
          `sandbox did not exit cleanly (code=${run.code}, signal=${run.signal}, stderr=${(run.stderr || '').slice(0, 500)})`
        );
      }

      const trace = JSON.parse(run.stdout);
      fs.writeFileSync(path.join(OUT_DIR, `${testCase.name}.trace.json`), JSON.stringify(trace, null, 2));

      testCase.check(trace);
      console.log(`PASS — ${trace.steps.length} steps, up to ${maxFrameCount(trace)} frame(s) at once`);
    } catch (err) {
      failed += 1;
      console.error(`FAIL — ${err.message}`);
    }
  }

  console.log(`\n${CASES.length - failed}/${CASES.length} cases passed`);
  if (failed > 0) process.exit(1);
}

main();
