// store.js

import { create } from "zustand";
import {
    addEdge,
    applyNodeChanges,
    applyEdgeChanges,
    MarkerType,
  } from 'reactflow';

export const useStore = create((set, get) => ({
    nodes: [],
    edges: [],
    nodeIDs: {},
    // React Flow instance + canvas element, shared so the toolbar (which lives
    // outside the ReactFlowProvider) can place click-added nodes in the viewport.
    rfInstance: null,
    flowWrapper: null,
    setRfInstance: (instance) => set({ rfInstance: instance }),
    setFlowWrapper: (element) => set({ flowWrapper: element }),
    getNodeID: (type) => {
        const newIDs = {...get().nodeIDs};
        if (newIDs[type] === undefined) {
            newIDs[type] = 0;
        }
        newIDs[type] += 1;
        set({nodeIDs: newIDs});
        return `${type}-${newIDs[type]}`;
    },
    addNode: (node) => {
        set({
            nodes: [...get().nodes, node]
        });
    },
    // Add a node by clicking a palette item. Places it at the center of the
    // current viewport, with a small cascade so repeated clicks don't stack.
    addNodeByType: (type, buildData) => {
        const { rfInstance, flowWrapper, nodes } = get();
        let position = { x: 250, y: 150 };
        if (rfInstance && flowWrapper) {
            const bounds = flowWrapper.getBoundingClientRect();
            position = rfInstance.project({
                x: bounds.width / 2,
                y: bounds.height / 2,
            });
        }
        const offset = (nodes.length % 6) * 28;
        position = { x: position.x + offset, y: position.y + offset };

        const nodeID = get().getNodeID(type);
        get().addNode({
            id: nodeID,
            type,
            position,
            data: buildData(nodeID, type),
        });
    },
    onNodesChange: (changes) => {
      set({
        nodes: applyNodeChanges(changes, get().nodes),
      });
    },
    onEdgesChange: (changes) => {
      set({
        edges: applyEdgeChanges(changes, get().edges),
      });
    },
    onConnect: (connection) => {
      set({
        edges: addEdge({...connection, type: 'smoothstep', animated: true, markerEnd: {type: MarkerType.Arrow, height: '20px', width: '20px'}}, get().edges),
      });
    },
    updateNodeField: (nodeId, fieldName, fieldValue) => {
      set({
        nodes: get().nodes.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, [fieldName]: fieldValue } }
            : node
        ),
      });
    },
  }));
