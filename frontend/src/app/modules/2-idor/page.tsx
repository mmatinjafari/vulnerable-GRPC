"use client";

import { useState } from "react";
import { Terminal, ShieldAlert, Cpu, Lock, BookOpen } from "lucide-react";
import CodeDiff from "@/components/CodeDiff";

const vulnerableCode = `// Vulnerability: IDOR
// The backend trusts the user_id in the payload without verifying 
// if the caller actually owns that ID.
function getUserConfig(call, callback) {
  // Directly extracting the target ID from the attacker's payload
  const targetId = call.request.user_id;

  const targetUser = Object.values(users)
                     .find(u => u.id === targetId);

  if (targetUser) {
    callback(null, {
      user_id: targetUser.id,
      theme: targetUser.theme,
      api_key: targetUser.api_key
    });
  } else {
    callback({ code: grpc.status.NOT_FOUND });
  }
}`;

const secureCode = `// Secure: Authorizing the payload against the verified token context
function getUserConfig(call, callback) {
  const targetId = call.request.user_id;
  
  // SECURE: Retrieve the authenticated user ID from Metadata/Context
  // This assumes an Auth Interceptor has already validated the JWT
  // and set 'x-user-id' safely in the call metadata.
  const callerId = call.metadata.get('x-user-id')[0];

  if (targetId !== callerId && callerId !== 'ADMIN_ROLE') {
    return callback({ 
       code: grpc.status.PERMISSION_DENIED, 
       details: "You are not authorized to view this config." 
    });
  }

  const targetUser = Object.values(users)
                     .find(u => u.id === targetId);
                     
  // ... proceed to return data ...
}`;

export default function IdorModule() {
  const [targetId, setTargetId] = useState('1');
  const [response, setResponse] = useState<string>("Waiting for execution...");
  const [loading, setLoading] = useState(false);

  const executeAttack = async () => {
    setLoading(true);
    setResponse("Requesting config...");
    
    try {
      const res = await fetch('/api/attack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service: 'ConfigService',
          method: 'getUserConfig',
          payload: { user_id: targetId }
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
          <Lock className="text-purple-400" size={32} />
          <h1 className="text-4xl font-bold">Module 2: IDOR</h1>
        </div>
        <p className="text-xl text-muted-foreground">Insecure Direct Object Reference in Microservices</p>
      </div>

      <div className="glass-panel p-6 md:p-8 rounded-2xl space-y-6">
        <h2 className="text-2xl font-bold flex items-center gap-2 text-purple-400"><BookOpen size={24}/> The Protocol Deep Dive</h2>
        <div className="space-y-4 text-gray-300 leading-relaxed">
          <p>
            An <strong>IDOR (Insecure Direct Object Reference)</strong> occurs when an application provides direct access to objects based on user-supplied input without proper authorization checks.
          </p>
          <p>
            In modern architectures, gRPC is heavily heavily used for <em>internal</em> communication (e.g., an Express web server talking to a Go analytics microservice in the backend). Because these services are shielded from the public internet, developers often adopt a philosophy of <strong>"trust the network."</strong> They assume that any request reaching the gRPC server must have been authorized by the gateway.
          </p>
          <p>
            This leads to missing tenant-checks. If an attacker manages to compromise a frontend service or injects a payload that the gateway forwards to the backend, they can arbitrarily change identifiers (like <code>user_id = 1</code>). The gRPC server, lacking its own authorization checks, blindly returns the sensitive data for the requested entity.
          </p>
        </div>
        
        <CodeDiff vulnerableCode={vulnerableCode} secureCode={secureCode} />

        <div className="mt-8 border-t border-white/10 pt-8">
          <h3 className="text-xl font-bold flex items-center gap-2 text-red-400 mb-4">🦇 Bug Bounty: The Black Box Approach</h3>
          <p className="text-gray-300 text-sm leading-relaxed mb-4">
            If you do not have Server Reflection enabled, you must use a proxy like <strong>Burp Suite</strong> to intercept the web traffic. By default, Burp shows gRPC as unreadable binary byte buffers.
          </p>
          <p className="text-gray-300 text-sm leading-relaxed mb-4">
            <strong>Methodology:</strong> Install a Burp extension like <em>gRPC Proxy</em> or <em>gRPC-Web-Parser</em>. These plugins intercept the HTTP/2 stream, attempt to deserialize the binary fields based on their byte-tags, and present them to you as JSON.
          </p>
          <div className="bg-black/60 p-4 rounded-lg border border-red-500/20 font-mono text-xs text-gray-300">
            <span className="text-red-400"># 1. You intercept a request where Burp decoded a field tag '1' with value '2'</span><br />
            &#123;<br />
            &nbsp;&nbsp;"1": "2"  // This is likely your user_id!<br />
            &#125;<br /><br />
            <span className="text-red-400"># 2. You send it to Burp Repeater, blindly change the '2' to a '1', and execute.</span><br />
            &#123;<br />
            &nbsp;&nbsp;"1": "1"<br />
            &#125;
          </div>
          <p className="text-gray-300 text-sm mt-4">
            If the response returns different account data, you have successfully confirmed an IDOR without ever seeing the schema!
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="glass-panel p-6 rounded-2xl space-y-4 flex flex-col justify-between">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2 text-purple-400"><Cpu size={20}/> Attack Payload</h2>
            <p className="text-sm text-gray-300 mt-4 mb-4">
              <strong>Target:</strong> You are currently logged in as User ID <code>2</code>. We suspect the Admin API key is assigned to User ID <code>1</code>. Change the ID and execute.
            </p>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Target User ID (Binary Payload Field):</label>
              <input 
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className="w-full bg-black/50 border border-white/20 rounded-lg p-3 font-mono text-sm text-purple-400 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>
          </div>
          <button 
            onClick={executeAttack}
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-500 text-white font-mono rounded-lg py-3 flex justify-center items-center gap-2 transition-all mt-6"
          >
            <Terminal size={18} /> Retrieve Config
          </button>
        </div>

        <div className="h-[400px]">
          <div className="glass-panel p-4 rounded-2xl h-full flex flex-col font-mono text-sm">
            <div className="flex gap-2 mb-4 border-b border-white/10 pb-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="ml-2 text-xs text-gray-500">gRPC Response Stream</span>
            </div>
            <pre className="flex-1 overflow-x-auto text-purple-400 whitespace-pre-wrap">
              {response}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
