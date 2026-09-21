// Builds a self-contained Python script that runs student code under sys.settrace()
// and emits a JSON trace (one entry per executed line/call/return) to stdout.
//
// Each step re-serializes the ENTIRE reachable object graph from scratch (rather than
// an incrementally-updated global heap) so that id() reuse from garbage-collected
// objects can never cause two different objects to be conflated across steps.
const MAX_STEPS = 500;
const MAX_DEPTH = 60;
const MAX_HEAP_OBJECTS = 150;
const MAX_CONTAINER_ITEMS = 200;
const MAX_STRING_LEN = 300;

function buildTraceHarness(studentCode) {
  const encoded = Buffer.from(studentCode, 'utf-8').toString('base64');

  return `import sys, json, io, base64, types, math

MAX_STEPS = ${MAX_STEPS}
MAX_DEPTH = ${MAX_DEPTH}
MAX_HEAP_OBJECTS = ${MAX_HEAP_OBJECTS}
MAX_CONTAINER_ITEMS = ${MAX_CONTAINER_ITEMS}
MAX_STRING_LEN = ${MAX_STRING_LEN}

STUDENT_CODE = base64.b64decode("${encoded}").decode("utf-8")
STUDENT_FILENAME = "<student>"

steps = []


class _TraceStop(Exception):
    pass


def _is_primitive(v):
    return v is None or isinstance(v, (bool, int, float, str))


def _clip_str(s):
    return s if len(s) <= MAX_STRING_LEN else s[:MAX_STRING_LEN] + "..."


# Functions/classes/modules technically have a __dict__ (usually empty), which would
# otherwise make _serialize treat them as heap objects. Every module-level function
# definition shows up as a local in the <module> frame, so without this every trace
# would show a meaningless empty box for each function the student defined. These
# aren't the data the visualizer is meant to show, so render them as a plain label
# instead of a heap ref.
def _is_opaque_callable(v):
    return isinstance(v, (types.FunctionType, types.BuiltinFunctionType, types.MethodType, type, types.ModuleType))


def _opaque_label(v):
    # No name here on purpose: the variable holding it is almost always named the
    # same thing (def foo(): ... binds foo to itself), and repeating a long name next
    # to itself in a narrow box just makes the two overlap and become unreadable.
    if isinstance(v, type):
        return "<class>"
    if isinstance(v, types.ModuleType):
        return "<module>"
    return "<function>"


def _serialize(v, heap, seen):
    # json.dumps emits float("inf")/float("-inf")/float("nan") as the bare tokens
    # Infinity/-Infinity/NaN, which are valid to Python's own parser but not to
    # JSON.parse on the client, breaking the whole trace. Render them as labels instead.
    if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
        return {"kind": "value", "value": "NaN" if math.isnan(v) else ("Infinity" if v > 0 else "-Infinity")}
    if _is_primitive(v):
        return {"kind": "value", "value": _clip_str(v) if isinstance(v, str) else v}
    if _is_opaque_callable(v):
        return {"kind": "value", "value": _opaque_label(v)}

    key = str(id(v))
    if key in seen:
        return {"kind": "ref", "id": key}
    seen.add(key)
    if len(heap) >= MAX_HEAP_OBJECTS:
        return {"kind": "value", "value": "<heap limit reached>"}

    try:
        if isinstance(v, list):
            heap[key] = {"type": "list", "items": [_serialize(x, heap, seen) for x in v[:MAX_CONTAINER_ITEMS]]}
        elif isinstance(v, tuple):
            heap[key] = {"type": "tuple", "items": [_serialize(x, heap, seen) for x in v[:MAX_CONTAINER_ITEMS]]}
        elif isinstance(v, dict):
            heap[key] = {
                "type": "dict",
                "items": [[_serialize(k, heap, seen), _serialize(val, heap, seen)] for k, val in list(v.items())[:MAX_CONTAINER_ITEMS]],
            }
        elif isinstance(v, (set, frozenset)):
            heap[key] = {"type": "set", "items": [_serialize(x, heap, seen) for x in list(v)[:MAX_CONTAINER_ITEMS]]}
        elif hasattr(v, "__dict__"):
            fields = []
            for fname, fval in vars(v).items():
                if fname.startswith("__"):
                    continue
                fields.append([fname, _serialize(fval, heap, seen)])
            heap[key] = {"type": type(v).__name__, "fields": fields}
        else:
            heap[key] = {"type": type(v).__name__, "repr": _clip_str(repr(v))}
    except Exception:
        heap[key] = {"type": type(v).__name__, "repr": "<unrepresentable>"}

    return {"kind": "ref", "id": key}


def _snapshot_stack(frame):
    chain = []
    f = frame
    while f is not None and f.f_code.co_filename == STUDENT_FILENAME:
        chain.append(f)
        f = f.f_back
    chain.reverse()
    if len(chain) > MAX_DEPTH:
        raise _TraceStop("max call depth exceeded")

    heap = {}
    seen = set()
    frames_out = []
    for fr in chain:
        row_vars = []
        for name, val in fr.f_locals.items():
            if name.startswith("__"):
                continue
            row_vars.append([name, _serialize(val, heap, seen)])
        frames_out.append({"fn": fr.f_code.co_name, "line": fr.f_lineno, "vars": row_vars})
    return frames_out, heap


def _tracer(frame, event, arg):
    if frame.f_code.co_filename != STUDENT_FILENAME:
        return None
    if event not in ("line", "call", "return"):
        return _tracer
    if len(steps) >= MAX_STEPS:
        raise _TraceStop("max steps exceeded")

    frames_out, heap = _snapshot_stack(frame)
    steps.append({
        "line": frame.f_lineno,
        "event": event,
        "frames": frames_out,
        "heap": heap,
    })
    return _tracer


_captured = io.StringIO()
_old_stdout = sys.stdout
sys.stdout = _captured

error = None
truncated = False

try:
    _code_obj = compile(STUDENT_CODE, STUDENT_FILENAME, "exec")
    sys.settrace(_tracer)
    exec(_code_obj, {"__name__": "__main__"})
except _TraceStop:
    truncated = True
except SyntaxError as e:
    error = {"type": "SyntaxError", "message": str(e), "line": e.lineno}
except BaseException as e:
    import traceback
    last_line = None
    for frame_summary in traceback.extract_tb(e.__traceback__):
        if frame_summary.filename == STUDENT_FILENAME:
            last_line = frame_summary.lineno
    error = {"type": type(e).__name__, "message": str(e), "line": last_line}
finally:
    sys.settrace(None)
    sys.stdout = _old_stdout

output = _captured.getvalue()
if len(output) > 20000:
    output = output[:20000] + "..."

print(json.dumps({"steps": steps, "stdout": output, "truncated": truncated, "error": error}))
`;
}

module.exports = { buildTraceHarness };
