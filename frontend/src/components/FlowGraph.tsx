"use client";

import React, { useCallback, useState, useEffect } from 'react';
import ReactFlow, { Background, Controls, Edge, Node, MarkerType } from 'reactflow';
import 'reactflow/dist/style.css';

const initialNodes: Node[] = [
  { id: '1', position: { x: 50, y: 150 }, data: { label: 'Web Browser\nClient' }, type: 'input', style: { background: '#18181b', color: 'white', border: '1px solid #2563eb', borderRadius: '8px', padding: '10px' } },
  { id: '2', position: { x: 300, y: 150 }, data: { label: 'gRPC-Web Proxy\n(Envoy/Node)' }, style: { background: '#18181b', color: 'white', border: '1px solid #8b5cf6', borderRadius: '8px', padding: '10px' } },
  { id: '3', position: { x: 550, y: 150 }, data: { label: 'Vulnerable gRPC Server\n(:50051)' }, type: 'output', style: { background: '#1e1b4b', color: '#fb7185', border: '1px solid #e11d48', borderRadius: '8px', padding: '10px' } },
];

const initialEdges: Edge[] = [
  { 
    id: 'e1-2', source: '1', target: '2', animated: true, 
    label: 'gRPC-Web (HTTP/1.1)', 
    style: { stroke: '#3b82f6', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' }
  },
  { 
    id: 'e2-3', source: '2', target: '3', animated: true, 
    label: 'Native gRPC (HTTP/2 binary)', 
    style: { stroke: '#e11d48', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#e11d48' }
  },
];

export default function FlowGraph() {
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return <div className="h-[300px] w-full flex items-center justify-center bg-black/20 rounded-xl border border-white/10">Loading Architecture...</div>;

  return (
    <div className="h-[300px] w-full bg-black/20 rounded-xl border border-white/10 overflow-hidden">
      <ReactFlow nodes={nodes} edges={edges} fitView>
        <Background gap={16} size={1} color="#333" />
        <Controls />
      </ReactFlow>
    </div>
  );
}
