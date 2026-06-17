import { useState, useRef, useCallback } from 'react';
import ReactFlow, {
  Controls,
  Background,
  MiniMap,
  ReactFlowProvider,
} from 'reactflow';
import { useStore } from './store';
import { shallow } from 'zustand/shallow';
import { getNodeTypes, getDefaultNodeData } from './config/nodeRegistry';

import 'reactflow/dist/style.css';

const gridSize = 20;
const proOptions = { hideAttribution: true };

// defined outside to be stable across renders
const nodeTypes = getNodeTypes();

const selector = (state) => ({
  nodes: state.nodes,
  edges: state.edges,
  getNodeID: state.getNodeID,
  addNode: state.addNode,
  onNodesChange: state.onNodesChange,
  onEdgesChange: state.onEdgesChange,
  onConnect: state.onConnect,
  setRfInstance: state.setRfInstance,
  setFlowWrapper: state.setFlowWrapper,
});

const canvasStyle = {
  width: '100%',
  height: '65vh',
  minHeight: '400px',
};

const FlowCanvas = () => {
  const wrapperRef = useRef(null);
  const [rfInstance, setRfInstance] = useState(null);

  const {
    nodes,
    edges,
    getNodeID,
    addNode,
    onNodesChange,
    onEdgesChange,
    onConnect,
    setRfInstance: setStoreRfInstance,
    setFlowWrapper,
  } = useStore(selector, shallow);

  // Share the instance + canvas element with the store so the toolbar can
  // place click-added nodes. Does not affect drag-and-drop (which uses the
  // local rfInstance below).
  const handleInit = useCallback(
    (instance) => {
      setRfInstance(instance);
      setStoreRfInstance(instance);
      setFlowWrapper(wrapperRef.current);
    },
    [setStoreRfInstance, setFlowWrapper]
  );

  const onDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();

      if (!rfInstance || !wrapperRef.current) return;

      const type = e.dataTransfer.getData('application/reactflow');
      if (!type) return;

      const bounds = wrapperRef.current.getBoundingClientRect();
      const position = rfInstance.project({
        x: e.clientX - bounds.left,
        y: e.clientY - bounds.top,
      });

      const nodeID = getNodeID(type);
      addNode({
        id: nodeID,
        type,
        position,
        data: getDefaultNodeData(nodeID, type),
      });
    },
    [rfInstance, getNodeID, addNode]
  );

  return (
    <div ref={wrapperRef} style={canvasStyle}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={handleInit}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={nodeTypes}
        proOptions={proOptions}
        snapToGrid
        snapGrid={[gridSize, gridSize]}
        connectionLineType="smoothstep"
        deleteKeyCode={['Backspace', 'Delete']}
        style={{ background: '#f8fafc' }}
      >
        <Background color="#cbd5e1" gap={gridSize} size={1} />
        <Controls />
        <MiniMap nodeColor="#4f46e5" pannable zoomable />
      </ReactFlow>
    </div>
  );
};

export const PipelineUI = () => (
  <ReactFlowProvider>
    <FlowCanvas />
  </ReactFlowProvider>
);
