"use client";

import { useState } from "react";
import { Terminal, ShieldAlert, Cpu, Database, BookOpen } from "lucide-react";
import CodeDiff from "@/components/CodeDiff";

const vulnerableCode = `// Vulnerability: NoSQL/JS Injection
function getUserData(call, callback) {
  // 1. The string is extracted from the binary payload
  const reqUsername = call.request.username;
  
  if (!reqUsername) return callback({ code: 3 });

  try {
    // 2. The string is insecurely interpolated into a dynamic query
    // and executed via eval() (simulating a loose query engine).
    const query = \`Object.values(users).find(u => u.username == "\${reqUsername}")\`;
    const foundUser = eval(query);

    if (foundUser) callback(null, foundUser);
    else callback({ code: 5, details: "Not found" });
  } catch (e) {
    // 3. Information Leakage in error states
    callback({ code: 13, details: e.message });
  }
}`;

const secureCode = `// Secure: Parameterized Logic / Strict Type checking
function getUserData(call, callback) {
  // 1. Extract string from payload
  const reqUsername = call.request.username;
  
  // 2. STRICT Input Validation (e.g. Alphanumeric only)
  if (!reqUsername || !/^[a-zA-Z0-9]+$/.test(reqUsername)) {
    return callback({ code: grpc.status.INVALID_ARGUMENT });
  }

  try {
    // 3. SECURE Parameterized querying (No eval/interpolation)
    // Finding exactly where u.username === reqUsername
    const foundUser = Object.values(users).find(u => u.username === reqUsername);

    if (foundUser) callback(null, foundUser);
    else callback({ code: grpc.status.NOT_FOUND });
  } catch (e) {
    // 4. Secure logging (Don't return stacktraces to client)
    console.error("Internal Error:", e);
    callback({ code: grpc.status.INTERNAL, details: "Internal Server Error" });
  }
}`;

export default function InjectionModule() {
  const [payload, setPayload] = useState('admin" || "1"=="1');
  const [response, setResponse] = useState<string>("Waiting for execution...");
  const [loading, setLoading] = useState(false);

  const executeAttack = async () => {
    setLoading(true);
    setResponse("Sending Protobuf payload...");
    
    try {
      const res = await fetch('/api/attack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service: 'DataService',
          method: 'getUserData',
          payload: { username: payload }
        })
      });

      const data = await res.json();
      setResponse(JSON.stringify(data, null, 2));
    } catch (e: any) {
      setResponse("Error executing attack: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-12 pb-24 max-w-5xl">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Database className="text-green-400" size={32} />
          <h1 className="text-4xl font-bold">Module 3: Protobuf Data Injection</h1>
        </div>
        <p className="text-xl text-muted-foreground">Bypassing Binary Serialization Assumptions.</p>
      </div>

      <div className="glass-panel p-6 md:p-8 rounded-2xl space-y-6">
        <h2 className="text-2xl font-bold flex items-center gap-2 text-green-400"><BookOpen size={24}/> The Protocol Deep Dive</h2>
        <div className="space-y-4 text-gray-300 leading-relaxed">
          <p>
            A devastating and unfortunately common misconception among backend engineers is that: <strong>"Because Protocol Buffers serialize into binary format, they are immune to traditional injection attacks like SQLi."</strong>
          </p>
          <p>
            This is dangerously false. Protocol Buffers enforce <em>structural types</em> (e.g., ensuring a field is a string and not an integer), but they do absolutely nothing to validate the <em>contents</em> of that string.
          </p>
          <p>
            If a client sends the string `<code>'; DROP TABLE Users; --</code>` inside a Protobuf message, the gRPC server will gladly deserialize it exactly as `<code>'; DROP TABLE Users; --</code>`. If the backend handler then takes that string and interpolates it into a raw database query, the database will execute the malicious code. You must validate inputs exactly identically to a REST API.
          </p>
        </div>
        
        <CodeDiff vulnerableCode={vulnerableCode} secureCode={secureCode} />

        <div className="mt-8 border-t border-white/10 pt-8">
          <h3 className="text-xl font-bold flex items-center gap-2 text-red-400 mb-4">🦇 Bug Bounty: The Black Box Approach</h3>
          <p className="text-gray-300 text-sm leading-relaxed mb-4">
            Finding SQLi/NoSQLi in gRPC looks exactly like finding it in REST, except you analyze gRPC Status Codes instead of HTTP Status Codes.
          </p>
          <div className="bg-black/60 p-4 rounded-lg border border-red-500/20 font-mono text-xs text-gray-300 mb-4">
            <span className="text-red-400"># 1. Normal Request (Returns Status: 0 OK)</span><br />
            $ grpcurl -d '&#123;"username":"test"&#125;' target list<br /><br />
            
            <span className="text-red-400"># 2. Syntax Fuzzing (Returns Status: 13 INTERNAL_ERROR or 2 UNKNOWN)</span><br />
            $ grpcurl -d '&#123;"username":"test'"&#125;' target list<br />
            <span className="text-gray-500">// The syntax error indicates the backend database tried to process the quote!</span><br /><br />

            <span className="text-red-400"># 3. Logic Bypass (Returns Status: 0 OK + Sensitive Data!)</span><br />
            $ grpcurl -d '&#123;"username":"admin\" || \"1\"==\"1"&#125;' target list
          </div>
          <p className="text-gray-300 text-sm">
            Because Protobuf strictly enforces types (e.g., this array expects an integer), you cannot test for injection by putting strings into integer fields—the proxy will drop it before it reaches the backend. You must focus your injection payloads strictly against <strong>string fields</strong>.
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="glass-panel p-6 rounded-2xl space-y-4 flex flex-col justify-between">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2 text-green-400"><Cpu size={20}/> Attack Payload</h2>
            <p className="text-sm text-gray-300 mt-4 mb-4">
              <strong>Target:</strong> The <code>DataService.getUserData</code> method expects a username. The vulnerable backend insecurely evaluates the string simulating a loose ORM or NoSQL query. 
            </p>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Username Protobuf Array Payload:</label>
              <input 
                value={payload}
                onChange={(e) => setPayload(e.target.value)}
                className="w-full bg-black/50 border border-white/20 rounded-lg p-3 font-mono text-sm text-green-400 focus:outline-none focus:border-green-500 transition-colors"
                spellCheck="false"
              />
            </div>
          </div>
          <button 
            onClick={executeAttack}
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-500 text-white font-mono rounded-lg py-3 flex justify-center items-center gap-2 transition-all mt-6"
          >
            <Terminal size={18} /> Execute Binary Payload
          </button>
        </div>

        <div className="h-[400px]">
          <div className="glass-panel p-4 rounded-2xl h-full flex flex-col font-mono text-sm">
            <div className="flex gap-2 mb-4 border-b border-white/10 pb-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="ml-2 text-xs text-gray-500">Backend Decode Stream</span>
            </div>
            <pre className="flex-1 overflow-x-auto text-green-400 whitespace-pre-wrap">
              {response}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
