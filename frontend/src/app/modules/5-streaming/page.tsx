"use client";

import { useState } from "react";
import { Terminal, ShieldAlert, Cpu, Activity, BookOpen } from "lucide-react";
import CodeDiff from "@/components/CodeDiff";

const vulnerableCode = `// Vulnerability: Uncapped Application-Layer Loops
function downloadLargeDataset(call) {
  // Directly trusting the attacker's requested volume without limits
  const count = call.request.chunk_count || 1;

  let i = 0;
  function sendNext() {
    if (i < count) {
      call.write({ payload: "Chunk..." });
      i++;
      setTimeout(sendNext, 10);
    } else {
      call.end();
    }
  }
  sendNext();
}`;

const secureCode = `// Secure: Hard Limits & Backpressure checking
function downloadLargeDataset(call) {
  const count = call.request.chunk_count || 1;
  const MAX_SAFE_COUNT = 1000;

  // 1. Mandatory upper bounds
  if (count > MAX_SAFE_COUNT) {
     call.destroy(new Error("Rate Limit Exceeded: Maximum 1000 chunks allowed."));
     return;
  }

  let i = 0;
  function sendNext() {
     // 2. Ensuring the stream hasn't been cancelled by client/proxy
     if (call.cancelled) return;

     if (i < count) {
        call.write({ payload: "Chunk..." });
        i++;
        setTimeout(sendNext, 10);
     } else {
        call.end();
     }
  }
  sendNext();
}`;

export default function StreamingModule() {
  const [chunkCount, setChunkCount] = useState('50');
  const [response, setResponse] = useState<string>("Waiting for execution...");
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState({ cpu: 2, mem: 45 });

  const executeAttack = async () => {
    setLoading(true);
    setResponse("");
    setMetrics({ cpu: 5, mem: 46 });

    try {
      const res = await fetch('/api/attack-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chunk_count: parseInt(chunkCount) })
      });

      if (!res.body) return;

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");

      let currentCpu = 5;
      let currentMem = 46;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        setResponse((prev) => prev + chunk);

        // Simulate server CPU/Memory spiking
        currentCpu = Math.min(100, currentCpu + Math.random() * 5);
        currentMem = Math.min(100, currentMem + Math.random() * 2);
        setMetrics({ cpu: currentCpu, mem: currentMem });
      }
    } catch (e: any) {
      setResponse((prev) => prev + "\\n" + e.message);
    } finally {
      setLoading(false);
      setTimeout(() => setMetrics({ cpu: 2, mem: 45 }), 2000); // Cool down
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-12 pb-24 max-w-5xl">
       <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Activity className="text-orange-400" size={32} />
          <h1 className="text-4xl font-bold">Module 5: Server Streaming DoS</h1>
        </div>
        <p className="text-xl text-muted-foreground">Exhausting resources via infinite loops.</p>
      </div>

       <div className="glass-panel p-6 md:p-8 rounded-2xl space-y-6">
        <h2 className="text-2xl font-bold flex items-center gap-2 text-orange-400"><BookOpen size={24}/> The Protocol Deep Dive</h2>
        <div className="space-y-4 text-gray-300 leading-relaxed">
          <p>
            gRPC's crown jewel is native <strong>Streaming</strong>. Over a single TCP connection, a server can blast millions of messages to a client continuously.
          </p>
          <p>
            If a developer creates an RPC like <code>DownloadLargeDataset</code> but fails to implement strict Pagination, Rate Limiting, and Maximum Upper Bounds, an attacker can request an astronomical amount of data (e.g., 999,999,999 chunks). 
          </p>
          <p>
            This triggers a severe Denial of Service (DoS). The Node.js event loop gets blocked allocating memory for the chunks, CPU spikes, and eventually the server crashes due to Out-Of-Memory (OOM) errors, taking down the microservice for all legitimate users.
          </p>
        </div>
        <CodeDiff vulnerableCode={vulnerableCode} secureCode={secureCode} />

        <div className="mt-8 border-t border-white/10 pt-8">
          <h3 className="text-xl font-bold flex items-center gap-2 text-red-400 mb-4">🦇 Bug Bounty: The Black Box Approach</h3>
          <p className="text-gray-300 text-sm leading-relaxed mb-4">
            Security researchers use specialized HTTP/2 Load generation tools to discover Missing Rate Limits in streaming endpoints. The gold-standard tool for this is <strong>ghz</strong>.
          </p>
          <div className="bg-black/60 p-4 rounded-lg border border-red-500/20 font-mono text-xs text-gray-300 mb-4">
            <span className="text-red-400"># Use ghz to slam the streaming endpoint with 500 concurrent connections</span><br />
            $ ghz --insecure \<br />
            &nbsp;&nbsp;&nbsp;&nbsp;--proto lab.proto \<br />
            &nbsp;&nbsp;&nbsp;&nbsp;--call lab.StreamingService.DownloadLargeDataset \<br />
            &nbsp;&nbsp;&nbsp;&nbsp;-d '&#123;"chunk_count": 9999999&#125;' \<br />
            &nbsp;&nbsp;&nbsp;&nbsp;-c 500 -n 10000 \<br />
            &nbsp;&nbsp;&nbsp;&nbsp;localhost:50051
          </div>
          <p className="text-gray-300 text-sm">
            If the server lacks Stream Iteration Limits (like the vulnerable code above), the metrics output of <code>ghz</code> will show the server latency skyrocketing from 10ms to 5000ms+, ultimately culminating in <code>14 UNAVAILABLE</code> socket hangups as the server runs completely out of memory and crashes.
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="glass-panel p-6 rounded-2xl space-y-4 flex flex-col justify-between">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2 text-orange-400"><Cpu size={20}/> Attack Payload</h2>
                        <div className="mt-4 p-4 bg-black/40 border border-white/5 rounded-xl space-y-2">
               <div className="flex justify-between text-sm">
                 <span className="text-muted-foreground">Simulated Server CPU:</span>
                 <span className={`font-mono ${metrics.cpu > 80 ? 'text-red-500' : 'text-green-500'}`}>{metrics.cpu.toFixed(1)}%</span>
               </div>
               <div className="w-full bg-zinc-800 rounded-full h-2">
                 <div className="bg-orange-500 h-2 rounded-full transition-all" style={{width: `${metrics.cpu}%`}}></div>
               </div>

               <div className="flex justify-between text-sm pt-2">
                 <span className="text-muted-foreground">Simulated Server Memory:</span>
                 <span className={`font-mono ${metrics.mem > 80 ? 'text-red-500' : 'text-blue-500'}`}>{metrics.mem.toFixed(1)}%</span>
               </div>
               <div className="w-full bg-zinc-800 rounded-full h-2">
                 <div className="bg-blue-500 h-2 rounded-full transition-all" style={{width: `${metrics.mem}%`}}></div>
               </div>
            </div>

            <div className="mt-4">
              <label className="text-xs text-muted-foreground mb-1 block">Requested Chunks:</label>
              <input 
                type="number"
                value={chunkCount}
                onChange={(e) => setChunkCount(e.target.value)}
                className="w-full bg-black/50 border border-white/20 rounded-lg p-3 font-mono text-sm text-orange-400 focus:outline-none focus:border-orange-500 transition-colors"
              />
            </div>
          </div>
          <button 
            onClick={executeAttack}
            disabled={loading}
            className="w-full bg-orange-600 hover:bg-orange-500 text-white font-mono rounded-lg py-3 flex justify-center items-center gap-2 transition-all mt-6"
          >
            <Terminal size={18} /> Flood Server Stream
          </button>
        </div>

        <div className="h-[400px]">
          <div className="glass-panel p-4 rounded-2xl h-full flex flex-col font-mono text-sm">
            <pre className="flex-1 overflow-x-auto text-orange-400 whitespace-pre-wrap text-xs">
              {response}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
