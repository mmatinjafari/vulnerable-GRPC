import FlowGraph from "@/components/FlowGraph";
import { ArrowRight, ShieldAlert, Cpu, Lock, Terminal, Activity, KeySquare } from "lucide-react";

export default function Home() {
  return (
    <div className="container mx-auto p-4 md:p-8 space-y-12 pb-24">
      {/* Hero Section */}
      <section className="text-center max-w-4xl mx-auto mt-12 space-y-6">
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight">
          Master <span className="gradient-text">gRPC Security</span>
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground">
          An interactive laboratory designed to teach Protocol Buffers, gRPC-Web architecture, and common security misconfigurations through hands-on offensive testing.
        </p>
        <div className="flex justify-center gap-4 pt-4">
          <a href="/modules/1-reflection" className="flex items-center gap-2 bg-primary hover:bg-blue-700 text-white px-6 py-3 rounded-full font-semibold transition-all">
            Start Lab <ArrowRight size={20} />
          </a>
          <a href="#architecture" className="flex items-center gap-2 bg-secondary hover:bg-zinc-800 text-white px-6 py-3 rounded-full font-semibold transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
            View Architecture
          </a>
        </div>
      </section>

      {/* Architecture Section */}
      <section id="architecture" className="max-w-6xl mx-auto space-y-6 pt-12">
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-bold flex items-center gap-3"><Cpu className="text-accent" /> Architecture Overvew</h2>
          <p className="text-muted-foreground max-w-3xl">
            Because browsers lack native support for HTTP/2 trailers, they cannot communicate directly with gRPC servers. They send gRPC-Web (HTTP/1.1 or HTTP/2) frames to a proxy, which translates them into native gRPC binary streams.
          </p>
        </div>
        
        <FlowGraph />
      </section>

      {/* Modules Section */}
      <section className="max-w-6xl mx-auto space-y-8 pt-12">
        <h2 className="text-3xl font-bold flex items-center gap-3"><ShieldAlert className="text-red-500" /> Vulnerability Modules</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-6">
          <ModuleCard
            title="1. Reconnaissance (Reflection)"
            description="Learn how developers accidentally leave gRPC Reflection enabled, allowing attackers to dump the entire API schema without .proto files."
            icon={<Terminal className="text-cyan-400" size={32} />}
            link="/modules/1-reflection"
          />
          <ModuleCard
            title="2. Insecure Direct Object Reference"
            description="Understand how assuming 'internal' means 'secure' leads to missing multi-tenant authorization checks in gRPC microservices."
            icon={<Lock className="text-purple-400" size={32} />}
            link="/modules/2-idor"
          />
          <ModuleCard
            title="3. Injection via Protobuf"
            description="Binary serialization doesn't prevent injection! See how malformed strings in Protobuf messages can execute arbitrary database queries."
            icon={<Cpu className="text-green-400" size={32} />}
            link="/modules/3-injection"
          />
          <ModuleCard
            title="4. Metadata Authentication Bypass"
            description="Explore how gRPC Metadata (the equivalent of HTTP headers) can be tampered with or omitted to bypass broken method-level authorization flows."
            icon={<ShieldAlert className="text-yellow-400" size={32} />}
            link="/modules/4-auth"
          />
          <ModuleCard
            title="5. Streaming Resource Exhaustion"
            description="gRPC's crown jewel is continuous streams. Exploit missing rate limits in a server-stream to cause a simulated CPU and Memory Denial of Service."
            icon={<Activity className="text-orange-400" size={32} />}
            link="/modules/5-streaming"
          />
          <ModuleCard
            title="6. Custom Interceptor Logic Flaws"
            description="Bypass a fully implemented middleware JWT authenticator by forging the Metadata structure and exploiting missing cryptographic validation."
            icon={<KeySquare className="text-pink-400" size={32} />}
            link="/modules/6-interceptors"
          />
        </div>
      </section>
    </div>
  );
}

function ModuleCard({ title, description, icon, link }: { title: string, description: string, icon: React.ReactNode, link: string }) {
  return (
    <a href={link} className="block group glass-panel p-6 rounded-2xl hover:bg-white/[0.03] transition-all duration-300 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
      <div className="flex gap-4 relative z-10 w-full items-start">
        <div className="bg-black/40 p-3 rounded-xl border border-white/5">
          {icon}
        </div>
        <div className="space-y-2 flex-1">
          <h3 className="text-xl font-bold group-hover:text-primary transition-colors">{title}</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
        </div>
      </div>
    </a>
  );
}
