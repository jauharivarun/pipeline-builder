"""
Pipeline execution engine.
Runs each node in topological order, passing outputs along edges.
"""
import os
import re
import sqlite3
import json
from collections import defaultdict, deque
from typing import Any, Dict, List

from dotenv import load_dotenv

# Use absolute path so the .env is always found regardless of cwd
_ENV_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
load_dotenv(dotenv_path=_ENV_PATH, override=True)


def _clean_env(name: str) -> str:
    """Read env var and strip whitespace / optional quotes from .env values."""
    val = os.getenv(name, "") or ""
    return val.strip().strip("'").strip('"')


OPENAI_API_KEY = _clean_env("OPENAI_API_KEY")
GOOGLE_API_KEY = _clean_env("GOOGLE_API_KEY") or _clean_env("GEMINI_API_KEY")

UPLOADS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
DB_PATH     = os.path.join(os.path.dirname(os.path.abspath(__file__)), "pipeline.db")


# ---------------------------------------------------------------------------
# Graph utilities
# ---------------------------------------------------------------------------

def topological_order(nodes, edges):
    """Kahn's algorithm — returns node IDs in safe execution order."""
    node_ids = {n.id for n in nodes}
    adjacency = defaultdict(list)
    in_degree = {nid: 0 for nid in node_ids}

    for edge in edges:
        if edge.source in node_ids and edge.target in node_ids:
            adjacency[edge.source].append(edge)
            in_degree[edge.target] += 1

    queue = deque(nid for nid in node_ids if in_degree[nid] == 0)
    order = []

    while queue:
        nid = queue.popleft()
        order.append(nid)
        for edge in adjacency[nid]:
            in_degree[edge.target] -= 1
            if in_degree[edge.target] == 0:
                queue.append(edge.target)

    for nid in node_ids:
        if nid not in order:
            order.append(nid)

    return order


def _strip_handle_prefix(node_id: str, handle_id: str) -> str:
    """Strip 'nodeId-' prefix from a React Flow handle id; return as-is if already bare."""
    if not handle_id:
        return ""
    prefix = f"{node_id}-"
    if handle_id.startswith(prefix):
        return handle_id[len(prefix):]
    return handle_id


def _resolve_handle_value(source_out, src_handle: str) -> str:
    """Extract the value for a specific source handle without cross-handle bleed."""
    if not isinstance(source_out, dict):
        return str(source_out) if source_out is not None else ""

    # Explicit handle — use ONLY that key (None means inactive branch, not "try another key")
    if src_handle and src_handle in source_out:
        val = source_out[src_handle]
        return "" if val is None else str(val)

    # No handle specified — fall back to common output keys
    for key in ("output", "value", "response", "result", "sent"):
        if key in source_out and source_out[key] is not None:
            return str(source_out[key])

    return ""


def collect_handle_inputs(node_id, edges, node_outputs):
    """
    For every edge targeting this node, extract the source value and key it
    by the target handle name (e.g. 'system', 'prompt', 'value', 'a', 'b').
    Returns a dict with both the string value and the full output dict (for
    data_type propagation).
    """
    inputs = {}
    raw_outputs = {}

    for edge in edges:
        if edge.target != node_id:
            continue

        source_out = node_outputs.get(edge.source, {})

        src_handle = _strip_handle_prefix(edge.source, edge.sourceHandle or "")
        tgt_handle = _strip_handle_prefix(node_id, edge.targetHandle or "")

        value = _resolve_handle_value(source_out, src_handle)

        if tgt_handle:
            inputs[tgt_handle]      = value
            raw_outputs[tgt_handle] = source_out

    return inputs, raw_outputs


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

VAR_REGEX = re.compile(r"\{\{\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\}\}")


def _extract_variables(template: str) -> List[str]:
    found, seen = [], set()
    for m in VAR_REGEX.finditer(template or ""):
        name = m.group(1)
        if name not in seen:
            seen.add(name)
            found.append(name)
    return found


def _enrich_text_inputs(node_id, template, edges, node_outputs, handle_inputs, raw_outputs, node_map=None):
    """
    Ensure Text node variables are resolved from edges.
    Handles three cases:
    1. Edge has the correct targetHandle (e.g. text-1-n → n)
    2. Edge targetHandle is empty (user dropped on node body, not handle dot)
       → match by source Input node's inputName field
    3. Only one variable and one incoming edge → auto-assign
    """
    variables = _extract_variables(template)
    unresolved = [v for v in variables if not handle_inputs.get(v)]
    if not unresolved:
        return handle_inputs, raw_outputs

    # Gather all edges into this text node
    incoming = [e for e in edges if e.target == node_id]

    for var in unresolved:
        # Pass 1: edge with explicit matching targetHandle
        for edge in incoming:
            tgt = _strip_handle_prefix(node_id, edge.targetHandle or "")
            if tgt == var:
                src_h   = _strip_handle_prefix(edge.source, edge.sourceHandle or "")
                src_out = node_outputs.get(edge.source, {})
                val     = _resolve_handle_value(src_out, src_h)
                if val:
                    handle_inputs[var]  = val
                    raw_outputs[var]    = src_out
                break

        if handle_inputs.get(var):
            continue

        # Pass 2: edge has no targetHandle → match by source node's inputName
        if node_map:
            for edge in incoming:
                tgt = _strip_handle_prefix(node_id, edge.targetHandle or "")
                if tgt:          # has explicit handle — already handled above
                    continue
                src_node = node_map.get(edge.source)
                if not src_node:
                    continue
                src_name = (src_node.data or {}).get("inputName", "")
                if src_name == var:
                    src_h   = _strip_handle_prefix(edge.source, edge.sourceHandle or "")
                    src_out = node_outputs.get(edge.source, {})
                    val     = _resolve_handle_value(src_out, src_h)
                    if val:
                        handle_inputs[var]  = val
                        raw_outputs[var]    = src_out
                    break

        if handle_inputs.get(var):
            continue

        # Pass 3: only one unresolved variable and exactly one unhandled incoming edge → auto-assign
        unhandled_edges = [
            e for e in incoming
            if not _strip_handle_prefix(node_id, e.targetHandle or "")
        ]
        if len(unresolved) == 1 and len(unhandled_edges) == 1:
            edge    = unhandled_edges[0]
            src_h   = _strip_handle_prefix(edge.source, edge.sourceHandle or "")
            src_out = node_outputs.get(edge.source, {})
            val     = _resolve_handle_value(src_out, src_h)
            if val:
                handle_inputs[var]  = val
                raw_outputs[var]    = src_out

    return handle_inputs, raw_outputs


def _read_file(file_id: str):
    """Read an uploaded file and return (content_str, data_type, extra)."""
    import pandas as pd

    path = os.path.join(UPLOADS_DIR, file_id)
    if not os.path.exists(path):
        raise FileNotFoundError(f"Uploaded file not found on server: {file_id}")

    # Derive extension from the original filename part after the uuid prefix
    # file_id format: "<uuid32>_<originalname>"
    original = file_id[33:] if len(file_id) > 33 else file_id
    ext = original.rsplit(".", 1)[-1].lower() if "." in original else ""

    if ext in ("xlsx", "xls", "csv"):
        if ext == "csv":
            df = pd.read_csv(path)
        else:
            df = pd.read_excel(path, engine="openpyxl")
        content = df.to_markdown(index=False)
        return content, "excel", {"dataframe_json": df.to_json(orient="records"), "row_count": len(df), "columns": list(df.columns)}

    if ext == "pdf":
        from pypdf import PdfReader
        reader = PdfReader(path)
        pages  = [p.extract_text() or "" for p in reader.pages]
        content = "\n\n--- Page break ---\n\n".join(pages)
        return content, "pdf", {}

    # Plain text
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        content = f.read()
    return content, "text", {}


def _type_label(data_type: str) -> str:
    return {"excel": "Excel/CSV table", "pdf": "PDF document", "text": "plain text"}.get(data_type, "text")


# ---------------------------------------------------------------------------
# Individual node executors
# ---------------------------------------------------------------------------

def exec_input(data, _handle_inputs, _raw):
    file_id = data.get("fileId", "")
    if file_id:
        try:
            content, data_type, extra = _read_file(file_id)
            result = {"value": content, "data_type": data_type, "file_id": file_id}
            result.update(extra)
            return result
        except FileNotFoundError as exc:
            raise ValueError(str(exc))

    # Use Value field only — do not fall back to Name (avoids sending "n" instead of "144")
    value = (data.get("inputValue") or "").strip()
    if not value:
        name = data.get("inputName", "input")
        raise ValueError(
            f"Input '{name}' has no Value. Fill the Value field on the Input node."
        )
    return {"value": value, "data_type": "text"}


def exec_text(data, handle_inputs, raw_outputs):
    template = data.get("text", "")

    result = template
    for var, val in handle_inputs.items():
        result = re.sub(r"\{\{\s*" + re.escape(var) + r"\s*\}\}", str(val), result)

    # Warn if any {{var}} is still unresolved — raise so the user sees a clear error
    remaining = _extract_variables(result)
    if remaining:
        vars_str = ", ".join(f"{{{{{v}}}}}" for v in remaining)
        raise ValueError(
            f"Unresolved variable(s): {vars_str}. "
            f"Make sure the Input node's Name matches the variable name exactly, "
            f"and its right handle is connected to this Text node's left '{remaining[0]}' handle dot."
        )

    # Propagate data_type if only one input and no substitution was needed
    incoming_types = {
        (raw_outputs.get(h, {}) or {}).get("data_type", "text")
        for h in handle_inputs
    }
    data_type = "text"
    if len(incoming_types) == 1:
        data_type = incoming_types.pop()

    return {"output": result, "data_type": data_type}


def exec_llm(data, handle_inputs, _raw):
    model = data.get("model", "gpt-4o-mini")
    system_prompt = (
        handle_inputs.get("system")
        or data.get("systemPrompt", "You are a helpful assistant.")
    )
    user_prompt = (
        handle_inputs.get("prompt")
        or data.get("userPrompt", "")
    )

    if not user_prompt:
        return {"response": "[No prompt provided — connect a node to the prompt handle or fill the Prompt field]", "data_type": "text"}

    if "gemini" in model:
        result = _call_gemini(model, system_prompt, user_prompt)
    else:
        result = _call_openai(model, system_prompt, user_prompt)

    result["data_type"] = "text"
    return result


def _call_openai(model, system_prompt, user_prompt):
    if not OPENAI_API_KEY:
        return {"response": "[OpenAI API key not set — add OPENAI_API_KEY to backend/.env]"}
    try:
        from openai import OpenAI
        client = OpenAI(api_key=OPENAI_API_KEY)
        resp = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_prompt},
            ],
            max_tokens=1000,
        )
        return {"response": resp.choices[0].message.content}
    except Exception as exc:
        return {"response": f"[OpenAI error: {exc}]"}


def _call_gemini(model, system_prompt, user_prompt):
    key = _clean_env("GOOGLE_API_KEY") or _clean_env("GEMINI_API_KEY")
    if not key or key in ("your_google_api_key_here", "your_gemini_api_key_here"):
        return {
            "response": (
                "[Google API key not set — add GOOGLE_API_KEY (or GEMINI_API_KEY) "
                "to backend/.env, save the file, then restart the server]"
            )
        }
    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=key)
        resp = client.models.generate_content(
            model=model,
            contents=user_prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                max_output_tokens=1000,
            ),
        )
        return {"response": resp.text}
    except Exception as exc:
        return {"response": f"[Gemini error: {exc}]"}


def exec_output(data, handle_inputs, raw_outputs):
    value = handle_inputs.get("value", "")
    src   = raw_outputs.get("value", {}) or {}
    data_type = src.get("data_type", "text") if isinstance(src, dict) else "text"

    result = {"value": value, "data_type": data_type}

    # Carry through excel metadata for download generation
    if data_type == "excel":
        result["dataframe_json"] = src.get("dataframe_json", "")
        result["columns"]        = src.get("columns", [])

    return result


def exec_api(data, handle_inputs, _raw):
    import httpx
    method = data.get("method", "GET").upper()
    url    = handle_inputs.get("url") or data.get("url", "")
    body   = handle_inputs.get("body", "")

    if not url:
        raise ValueError("No URL provided. Fill the URL field or connect a node to the url handle.")

    try:
        with httpx.Client(timeout=10) as client:
            if method == "GET":
                r = client.get(url)
            elif method == "POST":
                r = client.post(url, content=body)
            elif method == "PUT":
                r = client.put(url, content=body)
            else:
                r = client.request(method, url, content=body)
        return {"response": r.text[:2000], "status_code": r.status_code, "data_type": "text"}
    except Exception as exc:
        raise ValueError(f"HTTP request failed: {exc}")


def exec_condition(data, handle_inputs, _raw):
    # Strip whitespace — LLM outputs often have trailing newlines
    raw_value   = (handle_inputs.get("value", "") or "").strip()
    operator    = data.get("operator", "==")
    compare_str = (data.get("compareValue", "") or "").strip()

    def _to_num(v):
        """Try to extract a float from v; fall back to None."""
        try:
            return float(v)
        except (ValueError, TypeError):
            # Try to pull the first number out of an LLM sentence ("The answer is 5.")
            import re as _re
            m = _re.search(r"-?\d+(?:\.\d+)?", str(v))
            if m:
                return float(m.group())
            return None

    # Prefer numeric comparison when both sides can be parsed
    num_val  = _to_num(raw_value)
    num_cmp  = _to_num(compare_str)
    use_nums = num_val is not None and num_cmp is not None

    # Lazy evaluation — only compute the requested operation
    try:
        if operator == "==":
            result = (num_val == num_cmp) if use_nums else (raw_value == compare_str)
        elif operator == "!=":
            result = (num_val != num_cmp) if use_nums else (raw_value != compare_str)
        elif operator == ">":
            if not use_nums:
                raise ValueError(
                    f"'>' requires numeric values. Got \"{raw_value}\" and \"{compare_str}\". "
                    "Check that the connected node produces a number."
                )
            result = num_val > num_cmp
        elif operator == "<":
            if not use_nums:
                raise ValueError(
                    f"'<' requires numeric values. Got \"{raw_value}\" and \"{compare_str}\". "
                    "Check that the connected node produces a number."
                )
            result = num_val < num_cmp
        elif operator == ">=":
            result = (num_val >= num_cmp) if use_nums else (raw_value >= compare_str)
        elif operator == "<=":
            result = (num_val <= num_cmp) if use_nums else (raw_value <= compare_str)
        else:
            result = False
    except ValueError:
        raise
    except Exception as exc:
        raise ValueError(f"Condition evaluation failed: {exc}")

    if result:
        return {"true": raw_value, "false": None, "data_type": "text"}
    return {"true": None, "false": raw_value, "data_type": "text"}


def exec_database(data, handle_inputs, raw_outputs):
    """
    Real SQLite execution.
    - SELECT: runs the SQL query and returns results as a markdown table.
    - INSERT: takes tabular data from an upstream node and writes it to a table.
    - UPDATE/DELETE: runs the SQL query directly.
    """
    import pandas as pd

    operation = data.get("operation", "SELECT")
    table     = (data.get("table", "") or "data").strip() or "data"
    query     = (data.get("query", "") or "").strip()

    # Accept data from any connected handle (data, params, or value)
    src = {}
    for handle_key in ("data", "params", "value"):
        candidate = raw_outputs.get(handle_key)
        if candidate and isinstance(candidate, dict):
            src = candidate
            input_val = handle_inputs.get(handle_key, "")
            break
    else:
        input_val = ""

    data_type = src.get("data_type", "text") if isinstance(src, dict) else "text"

    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

    try:
        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()

            # ── INSERT ────────────────────────────────────────────────────
            if operation == "INSERT":
                # Prefer structured Excel/CSV data from upstream
                if data_type == "excel" and src.get("dataframe_json"):
                    import io
                    # pandas 2.x: wrap literal JSON in StringIO (raw strings treated as paths)
                    df = pd.read_json(io.StringIO(src["dataframe_json"]), orient="records")
                    df.to_sql(table, conn, if_exists="replace", index=False)
                    conn.commit()
                    return {
                        "result": f"Stored {len(df)} rows × {len(df.columns)} columns into table '{table}'.",
                        "data_type": "text",
                        "table": table,
                    }
                # Fallback: try to parse plain text as CSV
                if input_val:
                    import io
                    try:
                        df = pd.read_csv(io.StringIO(input_val))
                        df.to_sql(table, conn, if_exists="replace", index=False)
                        conn.commit()
                        return {"result": f"Inserted {len(df)} rows into '{table}'.", "data_type": "text"}
                    except Exception as e:
                        raise ValueError(
                            f"Could not parse input as CSV for INSERT: {e}. "
                            "Connect an Excel / CSV Input node to this Database node."
                        )
                raise ValueError(
                    "INSERT requires tabular data. Connect an Input node (type: Excel/CSV) "
                    "to this Database node, then run the pipeline again."
                )

            # ── SELECT / UPDATE / DELETE ──────────────────────────────────
            if operation in ("SELECT", "UPDATE", "DELETE"):
                # Validate table exists for SELECT before running query
                if operation == "SELECT":
                    existing = cursor.execute(
                        "SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table,)
                    ).fetchone()
                    if not existing:
                        raise ValueError(
                            f"Table '{table}' does not exist yet. "
                            "Run an INSERT node first to create it, or check the table name."
                        )

                sql = query if query else f'SELECT * FROM "{table}" LIMIT 20'
                cursor.execute(sql)

                if operation == "SELECT":
                    rows    = cursor.fetchall()
                    headers = [d[0] for d in (cursor.description or [])]
                    if not rows:
                        return {"result": "Query returned no rows.", "data_type": "text"}
                    df = pd.DataFrame(rows, columns=headers)
                    return {
                        "result":         df.to_markdown(index=False),
                        "data_type":      "excel",
                        "dataframe_json": df.to_json(orient="records"),
                        "columns":        headers,
                    }
                else:
                    conn.commit()
                    return {"result": f"Affected {cursor.rowcount} rows.", "data_type": "text"}

    except sqlite3.OperationalError as exc:
        msg = str(exc)
        if "no such table" in msg:
            raise ValueError(
                f"Table '{table}' does not exist. "
                "Run an INSERT node first to populate it, or check the table name matches exactly."
            )
        raise ValueError(f"SQL error: {msg}")
    except ValueError:
        raise
    except Exception as exc:
        raise ValueError(str(exc))

    return {"result": "[No operation performed]", "data_type": "text"}


def exec_math(data, handle_inputs, _raw):
    a_str = handle_inputs.get("a", "") or "0"
    b_str = handle_inputs.get("b", "") or "0"

    try:
        a = float(a_str)
    except ValueError:
        raise ValueError(f"Input 'a' must be a number, got: \"{a_str}\"")
    try:
        b = float(b_str)
    except ValueError:
        raise ValueError(f"Input 'b' must be a number, got: \"{b_str}\"")

    op  = data.get("operation", "add")
    ops = {
        "add":      a + b,
        "subtract": a - b,
        "multiply": a * b,
        "divide":   None if b == 0 else a / b,
    }
    if op not in ops:
        raise ValueError(f"Unknown operation '{op}'.")
    result = ops[op]
    if result is None:
        raise ValueError("Division by zero — input 'b' is 0.")

    return {"result": str(result), "data_type": "text"}


def exec_notification(data, handle_inputs, _raw):
    channel   = data.get("channel", "Email")
    recipient = data.get("recipient", "recipient")
    message   = handle_inputs.get("message", "")

    if not message:
        raise ValueError("No message provided. Connect a node to the message handle.")

    icons = {"Email": "📧", "Slack": "💬", "Webhook": "🔗"}
    icon  = icons.get(channel, "🔔")
    return {"sent": f"{icon} [Mock {channel}] Sent to \"{recipient}\": \"{message}\"", "data_type": "text"}


# ---------------------------------------------------------------------------
# Dispatcher
# ---------------------------------------------------------------------------

_EXECUTORS = {
    "customInput":  exec_input,
    "text":         exec_text,
    "llm":          exec_llm,
    "customOutput": exec_output,
    "api":          exec_api,
    "condition":    exec_condition,
    "database":     exec_database,
    "math":         exec_math,
    "notification": exec_notification,
}


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

def run_pipeline(nodes, edges) -> Dict[str, Any]:
    """
    Execute the pipeline and return per-node outputs plus a summary of
    Output node values with their data types.
    """
    node_map     = {n.id: n for n in nodes}
    node_outputs: Dict[str, Any] = {}
    errors: Dict[str, Dict] = {}

    order = topological_order(nodes, edges)

    for node_id in order:
        node = node_map.get(node_id)
        if node is None:
            continue

        handle_inputs, raw_outputs = collect_handle_inputs(node_id, edges, node_outputs)

        if node.type == "text":
            template = (node.data or {}).get("text", "")
            handle_inputs, raw_outputs = _enrich_text_inputs(
                node_id, template, edges, node_outputs, handle_inputs, raw_outputs,
                node_map=node_map
            )

        executor = _EXECUTORS.get(node.type)

        if executor is None:
            node_outputs[node_id] = {"output": f"[Unknown node type: {node.type}]", "data_type": "text"}
            continue

        try:
            node_outputs[node_id] = executor(node.data or {}, handle_inputs, raw_outputs)
        except Exception as exc:
            label     = (node.data or {}).get("inputName") or (node.data or {}).get("outputName") or node_id
            error_msg = str(exc)
            node_outputs[node_id] = {"output": f"[Error: {error_msg}]", "data_type": "text"}
            errors[node_id] = {
                "node_type":  node.type,
                "node_label": label,
                "message":    error_msg,
            }

    # Collect Output node results
    output_summary: Dict[str, Dict] = {}
    for node in nodes:
        if node.type == "customOutput":
            out   = node_outputs.get(node.id, {})
            label = (node.data or {}).get("outputName", node.id)
            output_summary[label] = {
                "value":          out.get("value", ""),
                "data_type":      out.get("data_type", "text"),
                "dataframe_json": out.get("dataframe_json", ""),
                "columns":        out.get("columns", []),
            }

    return {
        "success":        len(errors) == 0,
        "node_outputs":   {nid: out for nid, out in node_outputs.items()},
        "output_summary": output_summary,
        "errors":         errors,
    }
