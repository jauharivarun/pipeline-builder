# Pipeline Builder

A visual workflow builder for creating and validating AI pipelines by connecting nodes on a canvas.

---

## Features

- **9 node types** — Input, Output, LLM, Text, API, Condition, Database, Math, Notification
- **BaseNode architecture** — all nodes share a single reusable base component
- **Dynamic Text Node** — type `{{variable}}` and handles appear automatically
- **DAG validation** — backend detects whether the pipeline is a valid directed acyclic graph
- **Modern UI** — Inter font, indigo/violet palette, soft shadows, responsive layout

---

## Project Structure

```
├── backend/
│   ├── main.py            # FastAPI app — POST /api/pipelines/parse
│   └── requirements.txt
└── frontend/
    └── src/
        ├── components/
        │   ├── nodes/
        │   │   ├── BaseNode.js      # Shared node wrapper
        │   │   ├── NodeHandles.js   # Config-driven Handle rendering
        │   │   ├── NodeField.js     # Reusable text input
        │   │   ├── NodeSelect.js    # Reusable dropdown
        │   │   └── icons.js         # SVG icons for all node types
        │   └── PipelineResultModal.js
        ├── config/
        │   └── nodeRegistry.js      # Single source of truth for all node types
        ├── hooks/
        │   └── useNodeData.js       # Read/write node fields via Zustand
        ├── nodes/                   # One file per node type
        ├── styles/                  # CSS Modules + design tokens
        ├── utils/
        │   └── parseVariables.js    # {{variable}} regex extractor
        ├── store.js                 # Zustand global state
        ├── ui.js                    # React Flow canvas
        ├── toolbar.js               # Node palette
        └── submit.js                # Submit + result modal
```

---

## Setup

### Prerequisites

- Node.js 18+
- Python 3.11+

### Backend

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8001
```

The API will be available at `http://localhost:8001`.

Verify it is running:
```
GET http://localhost:8001/
→ {"ping": "pong"}
```

### Frontend

```bash
cd frontend
npm install
npm start
```

The app will open at `http://localhost:3000`.

---

## Usage

1. **Drag** a node from the toolbar onto the canvas
2. **Configure** node fields (name, type, URL, etc.)
3. **Connect** nodes by dragging from a handle on one node to a handle on another
4. **Disconnect** by clicking an edge and pressing `Delete` or `Backspace`
5. **Submit** the pipeline — a modal shows node count, edge count, and DAG validation result

### Text Node — dynamic variables

Type `{{variable}}` anywhere in the template field. A new input handle appears for each unique variable name. Connect other nodes to supply values for each variable at runtime.

Example: `Hello {{name}}, your order {{orderId}} is ready`  
→ Creates handles: `name`, `orderId`

---

## API

### `POST /api/pipelines/parse`

**Request body:**
```json
{
  "nodes": [
    { "id": "customInput-1", "type": "customInput", "position": { "x": 100, "y": 100 }, "data": {} }
  ],
  "edges": [
    { "id": "e1", "source": "customInput-1", "target": "llm-1" }
  ]
}
```

**Response:**
```json
{
  "num_nodes": 3,
  "num_edges": 2,
  "is_dag": true
}
```

DAG validation uses **Kahn's topological sort** (O(V+E)). A pipeline is a DAG if it has no cycles.

---

## Node Types

| Node | Category | Inputs | Outputs |
|---|---|---|---|
| Input | Core | — | value |
| Text | Core | `{{variables}}` | output |
| LLM | Core | system, prompt | response |
| Output | Core | value | — |
| API | Tools | url, body | response |
| Condition | Tools | value | true, false |
| Database | Tools | params | result |
| Math | Tools | a, b | result |
| Notification | Tools | message | — |
