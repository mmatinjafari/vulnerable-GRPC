import React from "react";
import { CheckCircle, XCircle } from "lucide-react";

interface CodeDiffProps {
  vulnerableCode: string;
  secureCode: string;
}

export default function CodeDiff({ vulnerableCode, secureCode }: CodeDiffProps) {
  return (
    <div className="grid md:grid-cols-2 gap-4 mt-6">
      <div className="rounded-xl border border-red-500/30 overflow-hidden glass-panel">
        <div className="bg-red-950/40 px-4 py-2 border-b border-red-500/30 flex items-center gap-2">
          <XCircle className="text-red-400" size={16} />
          <span className="text-sm font-semibold text-red-200">Vulnerable Implementation</span>
        </div>
        <pre className="p-4 overflow-x-auto text-xs font-mono text-gray-300">
          <code>{vulnerableCode}</code>
        </pre>
      </div>

      <div className="rounded-xl border border-green-500/30 overflow-hidden glass-panel">
        <div className="bg-green-950/40 px-4 py-2 border-b border-green-500/30 flex items-center gap-2">
          <CheckCircle className="text-green-400" size={16} />
          <span className="text-sm font-semibold text-green-200">Secure Implementation</span>
        </div>
        <pre className="p-4 overflow-x-auto text-xs font-mono text-gray-300">
          <code>{secureCode}</code>
        </pre>
      </div>
    </div>
  );
}
