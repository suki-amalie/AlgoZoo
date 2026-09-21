// Builds a self-contained C++ "driver" program that compiles the student's code with
// debug symbols, drives it through gdb's Machine Interface (MI), and emits the same
// JSON trace contract as pythonTracer.js / jsTracer.js.
//
// Why this looks nothing like the other two tracers: Python and JS both have a way to
// generically ask "what is this value?" at runtime (sys.settrace + isinstance/vars() for
// Python, typeof/instanceof for JS). C++ has no such thing — printing an int vs a
// std::vector<int> vs a Node* each need completely different code, and there's no way
// to write one generic serializer without knowing every variable's exact compile-time
// type. Real tools solve this by using an actual debugger, which already resolves types
// via the compiler's own DWARF debug info. That's what this does: compile with -g, spawn
// gdb --interpreter=mi2 over real pipes (confirmed ptrace/gdb both work inside Piston's
// sandbox), step line by line, and read locals via gdb's structured MI output.
//
// The driver itself has to be a single self-contained C++ program (not, say, a Node
// script puppeting gdb from our own server) because Piston only supports one
// compile-then-run pass per submission — there's no way to interactively control a
// process living inside a Piston execution from outside it.
//
// Known v1 limits: no multi-threading; STL containers are shown as gdb's own
// pretty-printed text (confirmed working: "std::vector of length 3, capacity 3 = {1, 2, 3}")
// rather than expanded into individual heap entries; only pointer-typed variables are
// expanded into the heap/arrow diagram (the actual linked-list/tree use case) — by-value
// structs show as their pretty-printed text too. Both are reasonable v1 scope cuts, not
// bugs: pointers are how C++ DSA code represents structure in the first place. Also:
// gdb's `-stack-list-variables` returns every local declared anywhere in a frame's
// scope, including ones the program hasn't reached yet (shown as uninitialized stack
// garbage) — unlike Python/JS, which only reveal a variable once it's actually been
// assigned. Fixing that would mean reintroducing source-level instrumentation just to
// track declaration points, defeating the reason gdb was chosen in the first place, so
// it's left as a known cosmetic gap rather than solved here.
//
// A few real gdb/MI quirks discovered empirically (not documented anywhere obvious)
// that this code specifically works around:
// - Execution commands (run/step/next) are asynchronous: the first "(gdb)" prompt only
//   acknowledges the command was accepted (^running/*running) — the real stop event
//   arrives as a SEPARATE later prompt cycle. See waitForStop().
// - `break main; run` leaves libc startup frames (__libc_start_main, _start) beneath
//   main on the call stack, whose "locals" are glibc/locale internals — frames are
//   filtered to the student's own file, same principle as pythonTracer.js's
//   STUDENT_FILENAME check.
// - `step` also steps into library-internal calls that happen to carry some debug info
//   (operator<<, std::endl) — those stops are skipped (not recorded) until execution
//   lands back in the student's file, otherwise the same line appears to "stall".
// - Expanding a struct/class pointer's children returns a synthetic "public"/"private"/
//   "protected" pseudo-child first — recursed through transparently to reach real fields.
// - MI dash-commands (-stack-list-variables, -var-create, ...) only work sent over real
//   stdin; passed via `-ex` they return "Undefined command" even in --interpreter=mi2.
// - `skip -gfile <glob>` (told to fast-forward "step" through STL headers instead of
//   single-stepping every instruction inside them — essential for anything beyond
//   trivial STL use, e.g. unordered_map's hash/bucket internals involve vastly more
//   nested calls than vector's plain indexing, and without this a handful of map
//   operations in a loop reliably times out) does NOT cross '/' like a recursive glob
//   would. Most real STL implementation code lives one level deeper than the top-level
//   header, under bits/ or ext/ (e.g. .../include/c++/10.2.0/bits/unordered_map.h) — a
//   pattern that doesn't explicitly account for that subdirectory silently matches
//   nothing, confirmed empirically via `info skip` showing it registered while `step`
//   still dove straight into bits/unordered_map.h regardless.
const MAX_STEPS = 300; // gdb stepping is much slower than native execution or sys.settrace
const MAX_DEPTH = 60;
const MAX_HEAP_OBJECTS = 150;
const MAX_CONTAINER_ITEMS = 200;
const MAX_STRING_LEN = 300;

// gdb's own scope-listing only tells us a variable is "uninitialized garbage" for the one
// case where a nested block (loops, ifs) gives it a real DWARF lexical-block boundary —
// plain sequential declarations at a function's top level are visible to gdb from the
// function's very first line, well before their own initializer runs, so that signal
// alone misses the common case (`int x = 0;` as an ordinary statement). This does a
// best-effort textual scan for "TYPE NAME = ..." / "TYPE NAME;" declaration statements to
// find each local's real declaration line, used as the primary signal at runtime; the
// scope-listing heuristic remains a fallback for anything this regex doesn't recognize
// (structured bindings, multi-declarator lines, unusual formatting). False negatives here
// just fall back to showing gdb's raw (possibly garbage) value, same as before this fix —
// this only needs to be good enough for typical DSA-style code, not a full C++ parser.
const DECL_RE = /(^|[;{(]|for\s*\()\s*((?:const\s+)?[A-Za-z_]\w*(?:::[A-Za-z_]\w*)*(?:\s*<(?:[^<>]|<[^<>]*>)*>)?(?:\s*[*&])*)\s+([A-Za-z_]\w*)\s*(=(?!=)|[;,])/g;
const DECL_KEYWORD_BLOCKLIST = new Set(['return', 'if', 'while', 'for', 'switch', 'else', 'do', 'delete', 'new', 'sizeof', 'using', 'namespace']);

function scanDeclarationLines(studentCode) {
  const declLines = {};
  studentCode.split('\n').forEach((line, idx) => {
    const lineNo = idx + 1;
    let m;
    DECL_RE.lastIndex = 0;
    while ((m = DECL_RE.exec(line)) !== null) {
      const typeTok = m[2].trim().split(/[\s<*&:]/)[0];
      const name = m[3];
      if (DECL_KEYWORD_BLOCKLIST.has(typeTok) || DECL_KEYWORD_BLOCKLIST.has(name)) continue;
      if (!(name in declLines)) declLines[name] = lineNo;
    }
  });
  return declLines;
}

function buildTraceHarness(studentCode) {
  const encoded = Buffer.from(studentCode, 'utf-8').toString('base64');
  const declLines = scanDeclarationLines(studentCode);
  const declLineEntries = Object.entries(declLines)
    .map(([name, line]) => `{${JSON.stringify(name)}, ${line}}`)
    .join(', ');

  return `// Auto-generated gdb/MI driver — see server/src/utils/cppTracer.js
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <string>
#include <vector>
#include <map>
#include <set>
#include <unistd.h>
#include <cctype>
#include <signal.h>
#include <sys/wait.h>

static const int MAX_STEPS = ${MAX_STEPS};
static const int MAX_DEPTH = ${MAX_DEPTH};
static const int MAX_HEAP_OBJECTS = ${MAX_HEAP_OBJECTS};
static const int MAX_CONTAINER_ITEMS = ${MAX_CONTAINER_ITEMS};
static const int MAX_STRING_LEN = ${MAX_STRING_LEN};
static const char* STUDENT_SRC_B64 = "${encoded}";

// ===========================================================================
// base64 decode
// ===========================================================================
static std::string b64Decode(const std::string& in) {
    static const std::string chars =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    std::vector<int> table(256, -1);
    for (size_t i = 0; i < chars.size(); i++) table[(unsigned char)chars[i]] = (int)i;
    std::string out;
    int val = 0, bits = -8;
    for (unsigned char c : in) {
        if (table[c] == -1) { if (c == '=') break; continue; }
        val = (val << 6) + table[c];
        bits += 6;
        if (bits >= 0) { out.push_back((char)((val >> bits) & 0xFF)); bits -= 8; }
    }
    return out;
}

// ===========================================================================
// JSON writing helpers (no JSON library is available inside the sandbox)
// ===========================================================================
static std::string jsonEscape(const std::string& s) {
    std::string out;
    for (unsigned char c : s) {
        switch (c) {
            case '"': out += "\\\\\\""; break;
            case '\\\\': out += "\\\\\\\\"; break;
            case '\\n': out += "\\\\n"; break;
            case '\\r': out += "\\\\r"; break;
            case '\\t': out += "\\\\t"; break;
            default:
                if (c < 0x20) { char buf[8]; snprintf(buf, sizeof(buf), "\\\\u%04x", c); out += buf; }
                else out += (char)c;
        }
    }
    return out;
}
static std::string jsonString(const std::string& s) {
    std::string clipped = s.size() > (size_t)MAX_STRING_LEN ? s.substr(0, MAX_STRING_LEN) + "..." : s;
    return "\\"" + jsonEscape(clipped) + "\\"";
}
static bool looksNumeric(const std::string& s) {
    if (s.empty()) return false;
    size_t i = 0;
    if (s[0] == '-') i = 1;
    if (i >= s.size()) return false;
    bool sawDigit = false, sawDot = false;
    for (; i < s.size(); i++) {
        if (isdigit((unsigned char)s[i])) sawDigit = true;
        else if (s[i] == '.' && !sawDot) sawDot = true;
        else return false;
    }
    return sawDigit;
}

// ===========================================================================
// Minimal GDB/MI record parser — only the subset of MI syntax this driver
// actually sends/receives (result & async records, tuples, lists, C strings).
// Not a general MI grammar implementation.
// ===========================================================================
struct MIVal {
    enum Kind { STR, TUPLE, LIST } kind = STR;
    std::string str;
    std::vector<std::pair<std::string, MIVal>> fields; // TUPLE fields, or keyed LIST items
    std::vector<MIVal> items;                          // bare (unkeyed) LIST items
};
static const MIVal* miGet(const MIVal& v, const std::string& key) {
    for (auto& p : v.fields) if (p.first == key) return &p.second;
    return nullptr;
}
static std::string miGetStr(const MIVal& v, const std::string& key, const std::string& def = "") {
    const MIVal* f = miGet(v, key);
    return f ? f->str : def;
}

static std::string parseIdent(const std::string& s, size_t& pos) {
    size_t start = pos;
    while (pos < s.size() && (isalnum((unsigned char)s[pos]) || s[pos] == '-' || s[pos] == '_')) pos++;
    return s.substr(start, pos - start);
}
static std::string parseCString(const std::string& s, size_t& pos) {
    std::string out;
    if (pos >= s.size() || s[pos] != '"') return out;
    pos++;
    while (pos < s.size() && s[pos] != '"') {
        if (s[pos] == '\\\\' && pos + 1 < s.size()) {
            pos++;
            char c = s[pos];
            if (c == 'n') out += '\\n';
            else if (c == 't') out += '\\t';
            else if (c == 'r') out += '\\r';
            else out += c;
            pos++;
        } else {
            out += s[pos++];
        }
    }
    if (pos < s.size()) pos++;
    return out;
}
static MIVal parseValue(const std::string& s, size_t& pos);
static MIVal parseTuple(const std::string& s, size_t& pos) {
    MIVal v; v.kind = MIVal::TUPLE;
    pos++; // '{'
    while (pos < s.size() && s[pos] != '}') {
        std::string key = parseIdent(s, pos);
        if (pos < s.size() && s[pos] == '=') { pos++; v.fields.push_back({key, parseValue(s, pos)}); }
        else break;
        if (pos < s.size() && s[pos] == ',') pos++;
    }
    if (pos < s.size()) pos++; // '}'
    return v;
}
static MIVal parseList(const std::string& s, size_t& pos) {
    MIVal v; v.kind = MIVal::LIST;
    pos++; // '['
    while (pos < s.size() && s[pos] != ']') {
        size_t save = pos;
        std::string maybeKey = parseIdent(s, pos);
        if (!maybeKey.empty() && pos < s.size() && s[pos] == '=') {
            pos++;
            v.fields.push_back({maybeKey, parseValue(s, pos)});
        } else {
            pos = save;
            v.items.push_back(parseValue(s, pos));
        }
        if (pos < s.size() && s[pos] == ',') pos++;
    }
    if (pos < s.size()) pos++; // ']'
    return v;
}
static MIVal parseValue(const std::string& s, size_t& pos) {
    if (pos >= s.size()) return MIVal();
    if (s[pos] == '"') { MIVal v; v.str = parseCString(s, pos); return v; }
    if (s[pos] == '{') return parseTuple(s, pos);
    if (s[pos] == '[') return parseList(s, pos);
    return MIVal();
}

struct MIRecord {
    char kind = 0; // '^' '*' '=' '~' '&' '@' '(' (prompt) or 0 (blank/unrecognized)
    std::string cls;
    MIVal data;
    std::string text;
};
static MIRecord parseLine(const std::string& line) {
    MIRecord rec;
    if (line.empty()) return rec;
    if (line.rfind("(gdb)", 0) == 0) { rec.kind = '('; return rec; }
    char c = line[0];
    size_t pos = 1;
    if (c == '~' || c == '&' || c == '@') { rec.kind = c; rec.text = parseCString(line, pos); return rec; }
    if (c == '^' || c == '*' || c == '=' || c == '+') {
        rec.kind = c;
        rec.cls = parseIdent(line, pos);
        rec.data.kind = MIVal::TUPLE;
        while (pos < line.size() && line[pos] == ',') {
            pos++;
            std::string key = parseIdent(line, pos);
            if (pos < line.size() && line[pos] == '=') { pos++; rec.data.fields.push_back({key, parseValue(line, pos)}); }
            else break;
        }
        return rec;
    }
    return rec;
}

// ===========================================================================
// GDB process management (real bidirectional pipes — popen() is one-directional)
// ===========================================================================
static int gdbInFd = -1, gdbOutFd = -1;
static pid_t gdbPid = -1;
static std::string readBuf;

static bool spawnGdb(const char* binaryPath) {
    int inPipe[2], outPipe[2];
    if (pipe(inPipe) != 0 || pipe(outPipe) != 0) return false;
    pid_t pid = fork();
    if (pid < 0) return false;
    if (pid == 0) {
        dup2(inPipe[0], 0);
        dup2(outPipe[1], 1);
        dup2(outPipe[1], 2);
        close(inPipe[0]); close(inPipe[1]);
        close(outPipe[0]); close(outPipe[1]);
        execlp("gdb", "gdb", "-q", "--interpreter=mi2", "-nx", binaryPath, (char*)nullptr);
        _exit(127);
    }
    close(inPipe[0]);
    close(outPipe[1]);
    gdbInFd = inPipe[1];
    gdbOutFd = outPipe[0];
    gdbPid = pid;
    return true;
}
static void sendCmd(const std::string& cmd) {
    std::string line = cmd + "\\n";
    ssize_t ignore = write(gdbInFd, line.data(), line.size());
    (void)ignore;
}
static bool readLine(std::string& out) {
    while (true) {
        size_t nl = readBuf.find('\\n');
        if (nl != std::string::npos) { out = readBuf.substr(0, nl); readBuf.erase(0, nl + 1); return true; }
        char chunk[4096];
        ssize_t n = read(gdbOutFd, chunk, sizeof(chunk));
        if (n <= 0) return false;
        readBuf.append(chunk, n);
    }
}
struct CmdBatch {
    std::vector<MIRecord> records;
    bool stopped = false;
    MIRecord stoppedRec;
    bool exited = false;
};
static CmdBatch readUntilPrompt() {
    CmdBatch res;
    std::string line;
    while (readLine(line)) {
        if (line.rfind("(gdb)", 0) == 0) break;
        if (line.empty()) continue;
        MIRecord rec = parseLine(line);
        res.records.push_back(rec);
        if (rec.kind == '*' && rec.cls == "stopped") {
            res.stopped = true;
            res.stoppedRec = rec;
            std::string reason = miGetStr(rec.data, "reason");
            if (reason == "exited-normally" || reason == "exited") res.exited = true;
        }
    }
    return res;
}
// Force gdb (and, via it, the ptrace-stopped debuggee it leaves behind whenever we stop
// tracing before the student program has actually run to completion) to fully exit.
// Without this, both processes linger as orphans after main() returns, and Piston's job
// runner keeps the sandbox open waiting for the whole process tree to exit — holding the
// request until PISTON_RUN_TIMEOUT forcibly SIGKILLs everything, even though our own
// trace output was already written in full.
static void shutdownGdb() {
    if (gdbPid <= 0) return;
    sendCmd("kill");
    readUntilPrompt();
    sendCmd("-gdb-exit");
    readUntilPrompt();
    kill(gdbPid, SIGKILL);
    waitpid(gdbPid, nullptr, 0);
}
static const MIVal* findDone(const CmdBatch& b, const std::string& field) {
    for (auto& r : b.records) if (r.kind == '^' && r.cls == "done") { const MIVal* f = miGet(r.data, field); if (f) return f; }
    return nullptr;
}
// Execution commands (run/step/next/continue) are asynchronous in MI: the first
// "(gdb)" prompt only acknowledges the command was accepted and the target is running
// (^running / *running) — the actual stop (breakpoint hit, step complete, program
// exited) arrives as a SEPARATE later batch with its own "(gdb)" prompt. Keep reading
// batches until a real stop/exit shows up, or a signal/crash (any other '*' record) is
// seen, or too many empty acks pile up (defends against a truly wedged gdb).
static CmdBatch waitForStop() {
    CmdBatch merged;
    for (int i = 0; i < 20; i++) {
        CmdBatch b = readUntilPrompt();
        merged.records.insert(merged.records.end(), b.records.begin(), b.records.end());
        if (b.stopped) { merged.stopped = true; merged.stoppedRec = b.stoppedRec; merged.exited = b.exited; return merged; }
        bool sawRunningOnly = true;
        for (auto& r : b.records) {
            if (r.kind == '*' && r.cls != "running") sawRunningOnly = false;
        }
        if (b.records.empty()) return merged; // nothing left to wait for
        if (!sawRunningOnly) return merged; // some other async event (signal, error) — let caller inspect
    }
    return merged;
}

// ===========================================================================
// Value/heap serialization
// ===========================================================================
struct HeapEntry { std::string type; std::vector<std::pair<std::string, std::string>> fields; };
static std::map<std::string, HeapEntry> heap; // address -> entry (raw, JSON-encoded later)
static std::set<std::string> seenAddrs;
static int varObjCounter = 0;

// Local variables become visible in gdb's own scope listing (-stack-list-variables)
// starting exactly at their declaration point, before the initializer has actually run —
// so the very first time a name appears for a given call, its value is leftover stack
// garbage, not a real value. Track, per stack position (counted from the outermost frame,
// which stays stable across pushes/pops of deeper calls — safe for recursion), which
// names have already been seen for the CURRENT call at that position; a name's first
// appearance is reported as "uninitialized" instead of gdb's raw value, and every
// appearance after that is real. Reset a position's set whenever a fresh call lands
// there (function parameters are exempt: they're valid from the moment of entry, so
// they're seeded as already-known rather than flagged).
static std::vector<std::set<std::string>> knownVarsByPos;

// Best-effort declaration-line lookup from a textual scan of the student's own source
// (server/src/utils/cppTracer.js's scanDeclarationLines) — the primary signal for
// catching plain top-level locals (e.g. "int x = 0;") that gdb's own scope listing can't
// distinguish from function parameters (see knownVarsByPos's comment above for why that
// heuristic alone isn't enough). A name absent here falls back to that heuristic instead.
static const std::map<std::string, int> DECL_LINE = { ${declLineEntries} };

static bool isPointerValue(const std::string& v) {
    return v.rfind("0x", 0) == 0 && v != "0x0";
}
// gdb reports pointer types as e.g. "Node *", "const Node *" — strip down to the bare
// struct/class name for display, matching Python's type(v).__name__ convention.
static std::string cleanTypeName(const std::string& t) {
    std::string s = t;
    while (!s.empty() && (s.back() == '*' || s.back() == ' ')) s.pop_back();
    for (auto& prefix : { std::string("const "), std::string("struct "), std::string("class ") }) {
        if (s.rfind(prefix, 0) == 0) s = s.substr(prefix.size());
    }
    return s.empty() ? "Object" : s;
}

// Expands a pointer's pointee (by its gdb var-object name) into a heap entry, recursing
// into pointer-typed fields. Returns the entry's address (used as the JSON ref id).
static std::string expandPointer(const std::string& varObjName, const std::string& address, const std::string& typeName);

struct ChildRef { std::string fieldName; std::string varObjName; std::string typeName; };
static std::vector<ChildRef> listChildren(const std::string& varObjName) {
    // gdb inserts a synthetic "public"/"private"/"protected" pseudo-child for C++
    // structs/classes — recurse through it transparently to reach the real fields.
    std::vector<ChildRef> out;
    sendCmd("-var-list-children --all-values " + varObjName);
    CmdBatch b = readUntilPrompt();
    const MIVal* children = findDone(b, "children");
    if (!children) return out;
    for (auto& childField : children->fields) {
        const MIVal& child = childField.second;
        std::string exp = miGetStr(child, "exp");
        std::string name = miGetStr(child, "name");
        std::string type = miGetStr(child, "type");
        if (exp == "public" || exp == "private" || exp == "protected") {
            auto nested = listChildren(name);
            out.insert(out.end(), nested.begin(), nested.end());
        } else if (!exp.empty()) {
            out.push_back({exp, name, type}); // varObjName, not the raw value — pointer
                                               // children need their own name to recurse
        }
    }
    return out;
}

static std::string serializeValueRef(const std::string& varObjName, const std::string& rawValue, const std::string& typeName);

static std::string expandPointer(const std::string& varObjName, const std::string& address, const std::string& typeName) {
    if (seenAddrs.count(address)) return address;
    seenAddrs.insert(address);
    if ((int)heap.size() >= MAX_HEAP_OBJECTS) {
        heap[address] = {"<heap limit reached>", {}};
        return address;
    }
    HeapEntry entry;
    entry.type = cleanTypeName(typeName);
    auto children = listChildren(varObjName);
    int count = 0;
    for (auto& c : children) {
        if (count++ >= MAX_CONTAINER_ITEMS) break;
        sendCmd("-var-evaluate-expression " + c.varObjName);
        CmdBatch b = readUntilPrompt();
        std::string fieldValue = "";
        for (auto& r : b.records) if (r.kind == '^' && r.cls == "done") fieldValue = miGetStr(r.data, "value");
        entry.fields.push_back({c.fieldName, serializeValueRef(c.varObjName, fieldValue, c.typeName)});
    }
    heap[address] = entry;
    return address;
}

// Returns a JSON-ready encoded marker string: we can't build full JSON strings this deep
// in the recursion cheaply, so values are staged as one of:
//   "N:<number>", "B:<0/1>", "S:<string>", "R:<address>" (heap ref), "U:" (null/undefined)
// and turned into real JSON only at the point they're written out.
static std::string serializeValueRef(const std::string& varObjName, const std::string& rawValue, const std::string& typeName) {
    if (rawValue == "0x0") return "U:";
    if (isPointerValue(rawValue)) {
        std::string addr = rawValue.substr(0, rawValue.find(' ') == std::string::npos ? rawValue.size() : rawValue.find(' '));
        expandPointer(varObjName, addr, typeName);
        return "R:" + addr;
    }
    if (rawValue == "true" || rawValue == "false") return "B:" + std::string(rawValue == "true" ? "1" : "0");
    if (looksNumeric(rawValue)) return "N:" + rawValue;
    return "S:" + rawValue;
}
static std::string encodeStagedValue(const std::string& staged) {
    if (staged.rfind("X:", 0) == 0) return "{\\"kind\\":\\"uninitialized\\"}";
    if (staged.rfind("U:", 0) == 0) return "{\\"kind\\":\\"value\\",\\"value\\":null}";
    if (staged.rfind("N:", 0) == 0) return "{\\"kind\\":\\"value\\",\\"value\\":" + staged.substr(2) + "}";
    if (staged.rfind("B:", 0) == 0) return std::string("{\\"kind\\":\\"value\\",\\"value\\":") + (staged[2] == '1' ? "true" : "false") + "}";
    if (staged.rfind("R:", 0) == 0) return "{\\"kind\\":\\"ref\\",\\"id\\":" + jsonString(staged.substr(2)) + "}";
    return "{\\"kind\\":\\"value\\",\\"value\\":" + jsonString(staged.substr(2)) + "}";
}

// For a top-level named local/param (from -stack-list-variables), create a var-object so
// pointer children can be recursed into, then stage its value the same way.
static std::string serializeTopLevel(const std::string& name, const std::string& rawValue) {
    if (!isPointerValue(rawValue)) {
        if (rawValue == "true" || rawValue == "false") return "B:" + std::string(rawValue == "true" ? "1" : "0");
        if (looksNumeric(rawValue)) return "N:" + rawValue;
        return "S:" + rawValue;
    }
    std::string varObjName = "top" + std::to_string(varObjCounter++);
    sendCmd("-var-create " + varObjName + " * " + name);
    CmdBatch b = readUntilPrompt();
    std::string typeName;
    for (auto& r : b.records) if (r.kind == '^' && r.cls == "done") typeName = miGetStr(r.data, "type");
    std::string addr = rawValue.substr(0, rawValue.find(' ') == std::string::npos ? rawValue.size() : rawValue.find(' '));
    if (addr == "0x0") return "U:";
    expandPointer(varObjName, addr, typeName);
    return "R:" + addr;
}

// ===========================================================================
// Trace step storage
// ===========================================================================
struct VarOut { std::string name; std::string staged; };
struct FrameOut { std::string fn; int line; std::vector<VarOut> vars; };
struct StepOut { int line; std::string event; std::vector<FrameOut> frames; std::map<std::string, HeapEntry> heap; };
static std::vector<StepOut> steps;

static void writeTrace(const std::string& stdoutCapture, bool truncated, bool hasError,
                        const std::string& errType, const std::string& errMsg, int errLine) {
    std::string out = "{\\"steps\\":[";
    for (size_t i = 0; i < steps.size(); i++) {
        if (i) out += ",";
        const StepOut& s = steps[i];
        out += "{\\"line\\":" + std::to_string(s.line) + ",\\"event\\":" + jsonString(s.event) + ",\\"frames\\":[";
        for (size_t fi = 0; fi < s.frames.size(); fi++) {
            if (fi) out += ",";
            const FrameOut& f = s.frames[fi];
            out += "{\\"fn\\":" + jsonString(f.fn) + ",\\"line\\":" + std::to_string(f.line) + ",\\"vars\\":[";
            for (size_t vi = 0; vi < f.vars.size(); vi++) {
                if (vi) out += ",";
                out += "[" + jsonString(f.vars[vi].name) + "," + encodeStagedValue(f.vars[vi].staged) + "]";
            }
            out += "]}";
        }
        out += "],\\"heap\\":{";
        bool first = true;
        for (auto& hp : s.heap) {
            if (!first) out += ",";
            first = false;
            out += jsonString(hp.first) + ":{\\"type\\":" + jsonString(hp.second.type) + ",\\"fields\\":[";
            for (size_t k = 0; k < hp.second.fields.size(); k++) {
                if (k) out += ",";
                out += "[" + jsonString(hp.second.fields[k].first) + "," + encodeStagedValue(hp.second.fields[k].second) + "]";
            }
            out += "]}";
        }
        out += "}}";
    }
    out += "],\\"stdout\\":" + jsonString(stdoutCapture) + ",\\"truncated\\":" + (truncated ? "true" : "false") + ",\\"error\\":";
    if (hasError) {
        out += "{\\"type\\":" + jsonString(errType) + ",\\"message\\":" + jsonString(errMsg) + ",\\"line\\":" +
               (errLine > 0 ? std::to_string(errLine) : "null") + "}";
    } else {
        out += "null";
    }
    out += "}";
    printf("%s\\n", out.c_str());
}

int main() {
    std::string source = b64Decode(STUDENT_SRC_B64);
    FILE* f = fopen("/tmp/student.cpp", "w");
    if (f) { fwrite(source.data(), 1, source.size(), f); fclose(f); }

    int compileStatus = system("g++ -g -std=c++17 -o /tmp/student_bin /tmp/student.cpp 2> /tmp/compile_err.txt");
    if (compileStatus != 0) {
        std::string err;
        FILE* ef = fopen("/tmp/compile_err.txt", "r");
        if (ef) { char buf[4096]; size_t n; while ((n = fread(buf, 1, sizeof(buf), ef)) > 0) err.append(buf, n); fclose(ef); }
        // g++ diagnostics look like "/tmp/student.cpp: In function 'int main()':" (no
        // line number after the colon) AND "/tmp/student.cpp:3:5: error: ..." (line:col
        // after the colon) — find the first occurrence actually followed by a digit.
        int errLine = 0;
        size_t searchFrom = 0;
        while (true) {
            size_t colonPos = err.find(".cpp:", searchFrom);
            if (colonPos == std::string::npos) break;
            size_t numStart = colonPos + 5;
            if (numStart < err.size() && isdigit((unsigned char)err[numStart])) { errLine = atoi(err.c_str() + numStart); break; }
            searchFrom = colonPos + 5;
        }
        writeTrace("", false, true, "CompileError", err, errLine);
        return 0;
    }

    if (!spawnGdb("/tmp/student_bin")) {
        writeTrace("", false, true, "InternalError", "failed to start gdb", 0);
        return 0;
    }

    readUntilPrompt(); // consume gdb's own startup banner/prompt before sending anything
    // MI is documented to suppress most confirmation queries automatically, but "kill"
    // (used during shutdown, below) and pagination prompts on long output are worth
    // disabling explicitly too — a blocked query is a silent hang, since our reader loop
    // just waits forever for a "(gdb)" prompt that a pending y/n query never produces.
    sendCmd("set confirm off");
    readUntilPrompt();
    sendCmd("set pagination off");
    readUntilPrompt();
    sendCmd("set auto-load safe-path /");
    readUntilPrompt();
    // Tell gdb to internally fast-forward through STL/library headers during "step"
    // instead of single-stepping every instruction inside them — critical for anything
    // beyond trivial STL use (e.g. unordered_map's hash/bucket internals involve many
    // more nested calls than vector's plain indexing; without this, a handful of map
    // operations in a loop can take 10+ seconds of real single-stepping and time out).
    // Patterns must be exact about path depth — gdb's -gfile glob does NOT cross '/'
    // like a recursive glob would (confirmed empirically: a shallower pattern here
    // silently matches nothing and "step" still dives into e.g. bits/unordered_map.h).
    // Most actual STL implementation code lives under a "bits/" (or "ext/") subdirectory
    // one level deeper than the top-level header itself, so each needs its own pattern.
    // Harmless if a pattern matches nothing on this system — skip is evaluated lazily
    // per file as stepping encounters it.
    for (const char* pattern : {
      "/usr/include/c++/*/bits/*",
      "/usr/include/c++/*/ext/*",
      "/usr/include/c++/*/*",
      "/usr/include/*/c++/*/bits/*",
      "/usr/include/*/c++/*/ext/*",
      "/usr/include/*/c++/*/*",
      "/piston/packages/gcc/*/include/c++/*/bits/*",
      "/piston/packages/gcc/*/include/c++/*/ext/*",
      "/piston/packages/gcc/*/include/c++/*/*",
    }) {
      sendCmd(std::string("skip -gfile ") + pattern);
      readUntilPrompt();
    }
    sendCmd("break main");
    readUntilPrompt();
    // Redirect the inferior's own stdout/stderr to a file — otherwise its output would
    // interleave on the same stream as gdb's own MI protocol lines (gdb's run command
    // supports shell-style redirection directly).
    sendCmd("run > /tmp/inferior_stdout.txt 2>&1");
    CmdBatch res = waitForStop();

    bool truncated = false;
    bool hasError = false;
    std::string errType, errMsg;
    int errLine = 0;
    int prevDepth = -1;

    while (true) {
        if (res.exited) break;
        if (!res.stopped) {
            for (auto& r : res.records) {
                if (r.kind == '*' && r.cls == "stopped") continue;
                std::string reason = miGetStr(r.data, "reason");
                if (r.kind == '*' && !reason.empty()) { hasError = true; errType = "RuntimeError"; errMsg = reason; }
            }
            if (!hasError) { hasError = true; errType = "RuntimeError"; errMsg = "program stopped unexpectedly"; }
            break;
        }
        if ((int)steps.size() >= MAX_STEPS) { truncated = true; break; }

        sendCmd("-stack-list-frames");
        CmdBatch framesRes = readUntilPrompt();
        const MIVal* stackList = findDone(framesRes, "stack");

        // Only frames belonging to the student's own compiled file — break main; run
        // stops with libc startup frames (__libc_start_main, _start) still beneath
        // main on the stack, and those frames' "locals" are glibc/locale internals we
        // never want to show. Same filtering principle as pythonTracer.js's
        // STUDENT_FILENAME check on sys.settrace frames.
        std::vector<int> studentFrameIdx;
        if (stackList) {
            for (int i = 0; i < (int)stackList->fields.size(); i++) {
                const MIVal& frameTuple = stackList->fields[i].second;
                std::string file = miGetStr(frameTuple, "fullname");
                if (file == "/tmp/student.cpp") studentFrameIdx.push_back(i);
            }
        }
        int depth = (int)studentFrameIdx.size();
        if (depth == 0) break; // stepped out of student code entirely (e.g. into libc) — done
        if (depth > MAX_DEPTH) { truncated = true; break; }

        std::string event = "line";
        if (prevDepth < 0) event = "call";
        else if (depth > prevDepth) event = "call";
        else if (depth < prevDepth) event = "return";
        prevDepth = depth;

        // Fresh heap per step (matching pythonTracer.js/jsTracer.js): re-serialize the
        // whole reachable graph from scratch each time rather than reusing addresses
        // across steps, so a freed-and-reused address can never get conflated with a
        // different object from an earlier step.
        heap.clear();
        seenAddrs.clear();

        StepOut stepOut;
        stepOut.event = event;
        stepOut.line = 0;

        // studentFrameIdx is innermost-first (gdb's own order); reverse so our output
        // is outermost-first, matching the Python/JS tracer convention.
        for (int k = (int)studentFrameIdx.size() - 1; k >= 0; k--) {
            int i = studentFrameIdx[k];
            const MIVal& frameTuple = stackList->fields[i].second;
            std::string fn = miGetStr(frameTuple, "func");
            int lineNo = atoi(miGetStr(frameTuple, "line", "0").c_str());
            int pos = depth - 1 - k; // 0 = outermost; stable identity for a given call, even under recursion

            sendCmd("-stack-select-frame " + std::to_string(i));
            readUntilPrompt();
            sendCmd("-stack-list-variables --all-values");
            CmdBatch varsRes = readUntilPrompt();
            const MIVal* varsList = findDone(varsRes, "variables");

            if ((int)knownVarsByPos.size() <= pos) knownVarsByPos.resize(pos + 1);
            bool isFreshCall = (event == "call" && pos == depth - 1);
            if (isFreshCall) knownVarsByPos[pos].clear();

            FrameOut frameOut;
            frameOut.fn = fn;
            frameOut.line = lineNo;
            if (varsList) {
                for (auto& item : varsList->items) {
                    std::string vname = miGetStr(item, "name");
                    std::string vvalue = miGetStr(item, "value");
                    if (vname.empty()) continue;
                    bool alreadyKnown = knownVarsByPos[pos].count(vname) > 0;
                    auto declIt = DECL_LINE.find(vname);
                    if (declIt != DECL_LINE.end()) {
                        // Primary signal: a real textual declaration line was found for
                        // this name. Hide from function entry through (and including)
                        // that exact line — the initializer hasn't run until the NEXT
                        // step — then show real values forever after for this call.
                        if (!alreadyKnown) {
                            if (lineNo <= declIt->second) {
                                frameOut.vars.push_back({vname, "X:"});
                                if (lineNo == declIt->second) knownVarsByPos[pos].insert(vname);
                                continue;
                            }
                            // Stepped past the detected line without ever matching it
                            // exactly (our textual scan missed by a line, e.g. a
                            // multi-line declaration) — fail open rather than hiding
                            // this variable for the rest of the call.
                            knownVarsByPos[pos].insert(vname);
                        }
                        frameOut.vars.push_back({vname, serializeTopLevel(vname, vvalue)});
                        continue;
                    }
                    // No textual declaration found for this name — almost certainly a
                    // parameter (real locals are caught by the branch above). Fall back
                    // to gdb's own scope listing: hide only if this is the first time
                    // it's appeared for this call AND we're past the "call" step itself
                    // (which is assumed to be nothing but parameters).
                    bool shouldHide = !alreadyKnown && !isFreshCall;
                    if (!alreadyKnown) knownVarsByPos[pos].insert(vname);
                    if (shouldHide) {
                        frameOut.vars.push_back({vname, "X:"});
                        continue;
                    }
                    frameOut.vars.push_back({vname, serializeTopLevel(vname, vvalue)});
                }
            }
            stepOut.frames.push_back(frameOut);
            if (i == studentFrameIdx[0]) stepOut.line = lineNo;
        }
        stepOut.heap = heap;
        steps.push_back(stepOut);

        sendCmd("step");
        res = waitForStop();

        // "step" also steps into library-internal calls that happen to carry some debug
        // info (operator<<, std::endl, STL internals) — keep stepping, without recording
        // a trace step, until we're back on a line in the student's own file (or the
        // program exits/errors). Otherwise the same student line repeats many times
        // while execution works through library internals underneath it.
        int skipGuard = 0;
        while (res.stopped && !res.exited && skipGuard++ < 500) {
            const MIVal* frame = miGet(res.stoppedRec.data, "frame");
            std::string curFile = frame ? miGetStr(*frame, "fullname") : "";
            if (curFile == "/tmp/student.cpp") break;
            sendCmd("step");
            res = waitForStop();
        }
    }

    shutdownGdb();

    std::string stdoutCapture;
    FILE* outF = fopen("/tmp/inferior_stdout.txt", "r");
    if (outF) { char buf[4096]; size_t n; while ((n = fread(buf, 1, sizeof(buf), outF)) > 0) stdoutCapture.append(buf, n); fclose(outF); }
    if (stdoutCapture.size() > 20000) stdoutCapture = stdoutCapture.substr(0, 20000) + "...";

    writeTrace(stdoutCapture, truncated, hasError, errType, errMsg, errLine);
    return 0;
}
`;
}

module.exports = { buildTraceHarness };
