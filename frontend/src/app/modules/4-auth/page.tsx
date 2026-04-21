"use client";

import { useState } from "react";
import { Terminal, ShieldAlert, Cpu, Key, BookOpen } from "lucide-react";
import CodeDiff from "@/components/CodeDiff";

const vulnerableCode = `// Vulnerability: Missing Metadata Authorization
function getSystemLogs(call, callback) {
  // Directly accessing sensitive logs without ANY token check.
  // The developer forgot to attach the "RequireAuth" interceptor 
  // to this specific RPC route because it was added late in the sprint.
  
  const filter = call.request.filter || "";
  const filteredLogs = logs.filter(l => l.includes(filter));
  
  callback(null, { logs: filteredLogs });
}`;

const secureCode = `// Secure: Checking Metadata or Using Interceptors
function getSystemLogs(call, callback) {
  
  // 1. Manually check metadata (though normally done in an Interceptor)
  const authHeader = call.metadata.get('authorization')[0];
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return callback({ 
       code: grpc.status.UNAUTHENTICATED, 
       details: "Missing valid token" 
    });
  }

  try {
     const token = authHeader.split(' ')[1];
     verifyAdminToken(token); // Validate cryptography
     
     // Proceed to return secure logs
     const filter = call.request.filter || "";
     callback(null, { logs: filteredLogs });
  } catch (err) {
     return callback({ code: grpc.status.PERMISSION_DENIED });
  }
}`;

export default function AuthModule() {
  const [response, setResponse] = useState<string>("Waiting for execution...");
  const [loading, setLoading] = useState(false);
  const [injectMetadata, setInjectMetadata] = useState(false);

  const executeAttack = async () => {
    setLoading(true);
    setResponse("Calling AdminService.getSystemLogs...");
    
    try {
      const meta = injectMetadata ? { "authorization": "Bearer fake_token" } : {};

      const res = await fetch('/api/attack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service: 'AdminService',
          method: 'getSystemLogs',
          payload: {},
          metadata: meta
        })
      });

      const data = await res.json();
      setResponse(JSON.stringify(data, null, 2));
    } catch (e: any) {
      setResponse("Error executing request: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-12 pb-24 max-w-5xl">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Key className="text-yellow-400" size={32} />
          <h1 className="text-4xl font-bold">Module 4: Missing Metadata Authorization</h1>
        </div>
        <p className="text-xl text-muted-foreground">Bypassing broken method-level checks.</p>
      </div>

      <div className="glass-panel p-6 md:p-8 rounded-2xl space-y-6">
        <h2 className="text-2xl font-bold flex items-center gap-2 text-yellow-400"><BookOpen size={24}/> The Protocol Deep Dive</h2>
        <div className="space-y-4 text-gray-300 leading-relaxed">
          <p>
            In HTTP/REST applications, authentication is typically handled by passing headers (like <code>Authorization: Bearer</code>). In gRPC, the equivalent of HTTP headers is called <strong>Metadata</strong>. 
          </p>
          <p>
            REST frameworks (like Express or Next.js) often have robust global middleware systems that make it easy to protect an entire folder of routes at once (e.g., <code>app.use('/admin', requireAdmin)</code>). 
          </p>
          <p>
            gRPC servers, however, often require developers to explicitly write code inside each RPC method handler to check the context, or to carefully wire up a "gRPC Interceptor" to wrap incoming calls. Because gRPC routing is based on the service/method name inside the binary Protobuf frame—not a URL path—it is extremely common for developers to add a new method to a `.proto` file but forget to update the authorization interceptor list to include it.
          </p>
        </div>
        
        <CodeDiff vulnerableCode={vulnerableCode} secureCode={secureCode} />

        <div className="mt-8 border-t border-white/10 pt-8">
          <h3 className="text-xl font-bold flex items-center gap-2 text-red-400 mb-4">🦇 Bug Bounty: The Black Box Approach</h3>
          <p className="text-gray-300 text-sm leading-relaxed mb-4">
            If you manage to obtain a valid JWT token (e.g., from another logged-in service), you must aggressively map which gRPC methods actually process it.
          </p>
          <div className="bg-black/60 p-4 rounded-lg border border-red-500/20 font-mono text-xs text-gray-300 mb-4">
            <span className="text-red-400"># 1. Enumerate endpoints WITHOUT the token first</span><br />
            $ grpcurl -plaintext target lab.AdminService/ClearSystemLogs<br />
            <span className="text-gray-500">Error: 16 UNAUTHENTICATED</span><br /><br />
            
            <span className="text-red-400"># 2. But what happens if we test another method?</span><br />
            $ grpcurl -plaintext target lab.AdminService/GetSystemLogs<br />
            <span className="text-gray-500">// BINGO! Returns 0 OK and dumps the logs! The dev forgot the middleware here.</span><br /><br />

            <span className="text-red-400"># 3. How to inject headers/metadata via CLI?</span><br />
            $ grpcurl -rpc-header "authorization: Bearer eyJhbGci..." -plaintext target lab.AdminService/ClearSystemLogs
          </div>
          <p className="text-gray-300 text-sm">
            Due to the lack of wildcard routing defaults in gRPC compared to Express/Django routers, method-level authorization bypasses are significantly more common in gRPC backends than in REST APIs.
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="glass-panel p-6 rounded-2xl space-y-4 flex flex-col justify-between">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2 text-yellow-400"><Cpu size={20}/> Attack Payload</h2>
            <p className="text-sm text-gray-300 mt-4 mb-4">
              <strong>Target:</strong> We will invoke the <code>AdminService.getSystemLogs</code> method. It is meant to be highly restricted.
            </p>
            
            <div className="flex items-center gap-3 pb-2 mt-4 bg-black/40 p-3 rounded-lg border border-white/10">
              <input 
                type="checkbox"
                id="metadata"
                checked={injectMetadata}
                onChange={(e) => setInjectMetadata(e.target.checked)}
                className="w-4 h-4 text-yellow-500 bg-zinc-800 border-zinc-700 rounded focus:ring-yellow-500 focus:bg-yellow-500"
              />
              <label htmlFor="metadata" className="text-sm text-muted-foreground flex-1 cursor-pointer">
                Inject Fake Authorization Metadata Block
              </label>
            </div>
          </div>
          <button 
            onClick={executeAttack}
            disabled={loading}
            className="w-full bg-yellow-600 hover:bg-yellow-500 text-white font-mono rounded-lg py-3 flex justify-center items-center gap-2 transition-all mt-6"
          >
            <Terminal size={18} /> Retrieve System Logs
          </button>
        </div>

        <div className="h-[400px]">
          <div className="glass-panel p-4 rounded-2xl h-full flex flex-col font-mono text-sm">
            <div className="flex gap-2 mb-4 border-b border-white/10 pb-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="ml-2 text-xs text-gray-500">API Response</span>
            </div>
            <pre className="flex-1 overflow-x-auto text-yellow-400 whitespace-pre-wrap">
              {response}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
