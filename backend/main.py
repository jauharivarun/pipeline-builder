import os
import uuid

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel
from typing import Any, Dict, List, Optional
from collections import defaultdict, deque

from dotenv import load_dotenv

_ENV_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
load_dotenv(dotenv_path=_ENV_PATH)

UPLOADS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)

app = FastAPI(title="VectorShift Pipeline API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class NodePosition(BaseModel):
    x: float
    y: float

class PipelineNode(BaseModel):
    id: str
    type: str
    position: Optional[NodePosition] = None
    data: Optional[Dict[str, Any]] = {}

class PipelineEdge(BaseModel):
    id: str
    source: str
    target: str
    sourceHandle: Optional[str] = None
    targetHandle: Optional[str] = None

class PipelineRequest(BaseModel):
    nodes: List[PipelineNode]
    edges: List[PipelineEdge]

class PipelineResponse(BaseModel):
    num_nodes: int
    num_edges: int
    is_dag: bool

class ExecuteResponse(BaseModel):
    success: bool
    node_outputs: Dict[str, Any]
    output_summary: Dict[str, Any]
    errors: Dict[str, Any]


# ---------------------------------------------------------------------------
# DAG validation — Kahn's algorithm  O(V + E)
# ---------------------------------------------------------------------------

def is_dag(nodes: List[PipelineNode], edges: List[PipelineEdge]) -> bool:
    node_ids  = {n.id for n in nodes}
    adjacency: Dict[str, List[str]] = defaultdict(list)
    in_degree: Dict[str, int]       = defaultdict(int)

    for node_id in node_ids:
        in_degree[node_id] = in_degree.get(node_id, 0)

    for edge in edges:
        src, tgt = edge.source, edge.target
        if src not in node_ids or tgt not in node_ids:
            continue
        adjacency[src].append(tgt)
        in_degree[tgt] += 1

    queue   = deque(n for n in node_ids if in_degree[n] == 0)
    visited = 0

    while queue:
        node = queue.popleft()
        visited += 1
        for neighbour in adjacency[node]:
            in_degree[neighbour] -= 1
            if in_degree[neighbour] == 0:
                queue.append(neighbour)

    return visited == len(node_ids)


# ---------------------------------------------------------------------------
# Endpoints — health + validation + execution
# ---------------------------------------------------------------------------

@app.get("/")
def read_root():
    return {"ping": "pong"}


# Registered under both paths: the assignment's canonical "/pipelines/parse"
# and the "/api"-prefixed path the frontend uses.
@app.post("/pipelines/parse", response_model=PipelineResponse)
@app.post("/api/pipelines/parse", response_model=PipelineResponse)
def parse_pipeline(pipeline: PipelineRequest):
    return PipelineResponse(
        num_nodes=len(pipeline.nodes),
        num_edges=len(pipeline.edges),
        is_dag=is_dag(pipeline.nodes, pipeline.edges),
    )


@app.post("/api/pipelines/execute", response_model=ExecuteResponse)
def execute_pipeline(pipeline: PipelineRequest):
    from executor import run_pipeline
    result = run_pipeline(pipeline.nodes, pipeline.edges)
    return ExecuteResponse(**result)


# ---------------------------------------------------------------------------
# File upload
# ---------------------------------------------------------------------------

_ALLOWED_EXTENSIONS = {
    "xlsx": "excel", "xls": "excel", "csv": "excel",
    "pdf":  "pdf",
    "txt":  "text",
}

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    filename = file.filename or "upload"
    ext      = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    if ext not in _ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '.{ext}'. Allowed types: xlsx, xls, csv, pdf, txt",
        )

    file_type = _ALLOWED_EXTENSIONS[ext]
    contents  = await file.read()

    # Unique ID so filenames never collide
    file_id   = f"{uuid.uuid4().hex}_{filename}"
    file_path = os.path.join(UPLOADS_DIR, file_id)

    with open(file_path, "wb") as f:
        f.write(contents)

    # Extract a quick preview
    preview    = ""
    row_count  = None
    col_count  = None

    try:
        if file_type == "excel":
            import pandas as pd
            import io
            if ext == "csv":
                df = pd.read_csv(io.BytesIO(contents))
            else:
                df = pd.read_excel(io.BytesIO(contents), engine="openpyxl")
            row_count = len(df)
            col_count = len(df.columns)
            preview   = df.head(3).to_markdown(index=False)

        elif file_type == "pdf":
            from pypdf import PdfReader
            import io
            reader  = PdfReader(io.BytesIO(contents))
            preview = (reader.pages[0].extract_text() or "")[:300]

        else:
            preview = contents.decode("utf-8", errors="replace")[:300]

    except Exception as exc:
        preview = f"(Preview unavailable: {exc})"

    return {
        "file_id":   file_id,
        "filename":  filename,
        "type":      file_type,
        "ext":       ext,
        "preview":   preview,
        "row_count": row_count,
        "col_count": col_count,
        "size_kb":   round(len(contents) / 1024, 1),
    }


# ---------------------------------------------------------------------------
# File download (original uploaded file)
# ---------------------------------------------------------------------------

@app.get("/api/files/{file_id:path}")
def download_file(file_id: str):
    file_path = os.path.join(UPLOADS_DIR, file_id)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    original_name = file_id[33:] if len(file_id) > 33 else file_id
    return FileResponse(
        path=file_path,
        filename=original_name,
        media_type="application/octet-stream",
    )


# ---------------------------------------------------------------------------
# Generate Excel from processed data
# ---------------------------------------------------------------------------

class GenerateExcelRequest(BaseModel):
    data: List[Dict[str, Any]]       # list of row dicts
    columns: Optional[List[str]] = None
    filename: Optional[str] = "output"

@app.post("/api/generate-excel")
def generate_excel(req: GenerateExcelRequest):
    import pandas as pd
    import io

    df = pd.DataFrame(req.data, columns=req.columns)
    buf = io.BytesIO()
    df.to_excel(buf, index=False, engine="openpyxl")
    buf.seek(0)

    filename = (req.filename or "output").rstrip(".xlsx") + ".xlsx"
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
