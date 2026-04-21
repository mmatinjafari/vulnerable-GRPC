"use client";

import { useState } from "react";
import { Terminal, ShieldAlert, Cpu, BookOpen } from "lucide-react";
import CodeDiff from "@/components/CodeDiff";

const vulnerableCode = `const { ReflectionService } = require('@grpc/reflection');

function main() {
  const server = new grpc.Server();
  // ... add services ...

  // VULNERABILITY: Reflection enabled in production!
  const reflection = new ReflectionService(packageDefinition);
  reflection.addToServer(server);

  server.bindAsync('0.0.0.0:50051', ...);
}`;

const secureCode = `const { ReflectionService } = require('@grpc/reflection');

function main() {
  const server = new grpc.Server();
  // ... add services ...

  // SECURE: Only enable in non-production environments
  if (process.env.NODE_ENV !== 'production') {
    const reflection = new ReflectionService(packageDefinition);
    reflection.addToServer(server);
  }

  server.bindAsync('0.0.0.0:50051', ...);
}`;

export default function ReflectionModule() {
  const [response, setResponse] = useState<string>("Waiting for execution...");
  const [loading, setLoading] = useState(false);

  const executeRecon = async () => {
    setLoading(true);
    setResponse("Executing reflection attack via grpcurl format...");
    
    setTimeout(() => {
      setResponse(`$ grpcurl -plaintext localhost:50051 list
grpc.reflection.v1alpha.ServerReflection
lab.AdminService
lab.ConfigService
lab.DataService

$ grpcurl -plaintext localhost:50051 describe lab.AdminService
lab.AdminService is a service:
service AdminService {
  rpc ClearSystemLogs ( .lab.ClearRequest ) returns ( .lab.ClearResponse );
  rpc GetSystemLogs ( .lab.LogRequest ) returns ( .lab.LogResponse );
}`);
      setLoading(false);
    }, 1200);
  };

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-12 pb-24 max-w-5xl">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Terminal className="text-cyan-400" size={32} />
          <h1 className="text-4xl font-bold">Module 1: Reconnaissance (Reflection)</h1>
        </div>
        <p className="text-xl text-muted-foreground">Mapping binary schemas without documentation.</p>
      </div>

      <div className="glass-panel p-6 md:p-8 rounded-2xl space-y-6">
        <h2 className="text-2xl font-bold flex items-center gap-2 text-cyan-400"><BookOpen size={24}/> The Protocol Deep Dive</h2>
        <div className="space-y-4 text-gray-300 leading-relaxed">
          <p>
            In a traditional REST architecture, the API surface is text-based. Without documentation like Swagger, attackers must use wordlists to "fuzz" or guess endpoints (e.g., <code>/api/v1/users</code>, <code>/api/v1/admin</code>). 
          </p>
          <p>
            gRPC operates differently. It relies on <strong>Protocol Buffers</strong> (.proto files) which compile down to strict binary. If you intercept gRPC traffic, it looks like unreadable binary soup unless you have the exact schema to decode it.
          </p>
          <p>
            To help developers debug, the gRPC community created a standard service called <code>grpc.reflection.v1alpha.ServerReflection</code>. When enabled, a client can ask the server: "What services do you run? What do your messages look like?" The server replies with the entire `.proto` schema. If a developer forgets to disable this in production environments, they completely surrender their API schema to attackers.
          </p>
        </div>
        
        <CodeDiff vulnerableCode={vulnerableCode} secureCode={secureCode} />

        <div className="mt-8 border-t border-white/10 pt-8">
          <h3 className="text-xl font-bold flex items-center gap-2 text-red-400 mb-4">🦇 Bug Bounty: The Black Box Approach</h3>
          <p className="text-gray-300 text-sm leading-relaxed mb-4">
            If you are attacking a target and intercept undefined binary traffic, you immediately test for exposed Server Reflection. You do not need source code. Just download <a href="https://github.com/fullstorydev/grpcurl" className="text-cyan-400 underline" target="_blank">grpcurl</a> and execute:
          </p>
          <div className="bg-black/60 p-4 rounded-lg border border-red-500/20 font-mono text-xs text-gray-300">
            <span className="text-red-400"># 1. Ask the server: "List all your services"</span><br />
            $ grpcurl -plaintext target-server:50051 list<br /><br />
            <span className="text-red-400"># 2. Ask the server: "Describe exactly what the AdminService requires"</span><br />
            $ grpcurl -plaintext target-server:50051 describe lab.AdminService
          </div>
          <p className="text-gray-300 text-sm mt-4">
            Alternatively, if you prefer a graphical UI to attack the target, launch <a href="https://github.com/fullstorydev/grpcui" className="text-cyan-400 underline" target="_blank">grpcui</a>: <code>$ grpcui -plaintext target-server:50051</code>. It will use reflection to automatically build a "Postman-like" interface against the API for you!
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="glass-panel p-6 rounded-2xl space-y-4 flex flex-col justify-between">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2 text-cyan-400"><Cpu size={20}/> Execute the Exploit</h2>
            <p className="text-sm text-gray-300 mt-4">
              We will simulate running <code>grpcurl</code> against our backend. <code>grpcurl</code> automatically detects if the reflection service is enabled and queries it. Click below to map our lab backend.
            </p>
          </div>
          <button 
            onClick={executeRecon}
            disabled={loading}
            className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-mono rounded-lg py-3 flex justify-center items-center gap-2 transition-all mt-6"
          >
            <Terminal size={18} /> Run `grpcurl list`
          </button>
        </div>

        <div className="h-[400px]">
          <div className="glass-panel p-4 rounded-2xl h-full flex flex-col font-mono text-sm leading-relaxed">
            <div className="flex gap-2 mb-4 border-b border-white/10 pb-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="ml-2 text-xs text-gray-500">attacker_terminal ~ bash</span>
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
