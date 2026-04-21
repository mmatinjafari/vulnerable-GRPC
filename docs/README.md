# 🛡️ gRPC Security Attack Laboratory (Chaeter)

A comprehensive, locally-hosted training ground designed to teach developers, security engineers, and Bug Bounty hunters the intricacies of attacking and defending **gRPC (gRPC Remote Procedure Calls)** and **Protocol Buffers**.

Unlike traditional REST/JSON, gRPC operates on strict binary serialization over HTTP/2. This laboratory demystifies the binary protocol, proving that gRPC is vulnerable to the same logic flaws as REST (IDOR, Injection, DoS) but requires vastly different tooling and methodologies to exploit.

---

## 🎯 What You Will Learn

This project features **6 High-Density Interactive Test Beds** covering:
1. **Reconnaissance:** Discovering internal APIs via uncontrolled `ServerReflection`.
2. **Insecure Direct Object Reference (IDOR):** Attacking strict internal microservice boundaries.
3. **Protobuf Data Injection:** Why binary serialization fails to prevent backend database injections (SQLi/NoSQL).
4. **Authentication Bypass (Metadata):** Exploiting missing method-level gRPC Interceptors.
5. **Streaming Resource Exhaustion (DoS):** Causing CPU/Memory panic attacks via infinite gRPC Server Streams.
6. **Interceptor Logic Flaws:** Forging JWT metadata (e.g., `alg: none`) to bypass global Security Middlewares.

For every module, the laboratory provides:
- A textbook **Protocol Deep Dive**.
- A live **Browser-to-Backend Exploit Terminal**.
- A **"Vulnerable vs Secure" Code Diff** showing exactly how to patch the flaw.
- A **Black Box Bug Bounty Methodology** guide teaching you how to exploit it in the wild using tools like `grpcurl` and Burp Suite.

---

## 🏗️ Architecture

The lab eliminates the pain of Docker and Envoy proxies, running natively on your local machine:
- **Backend:** A highly vulnerable Node.js `grpc-js` server listening natively on `localhost:50051`.
- **Frontend / Client:** A premium Next.js (React) application. It utilizes Next.js API Routes to dynamically translate your web actions into raw HTTP/2 Protocol Buffer streams sent directly to the backend.

---

## 🚀 Installation & Setup Guide

### Prerequisites
You need **Node.js (v18+)** installed on your system.

### Step 1: Clone the Repository
\`\`\`bash
git clone https://github.com/yourusername/chaeter.git
cd chaeter
\`\`\`

### Step 2: Start the Vulnerable Backend Server
Open a new terminal window, install dependencies, and run the backend. It will initialize the `.proto` schemas and listen on port `50051`.
\`\`\`bash
cd backend
npm install
node server.js
\`\`\`
*Expected Output: `[gRPC Security Lab] Target Backend running on port 50051`*

### Step 3: Start the Learning Dashboard
Open a **second** terminal window, install dependencies, and run the Next.js frontend application.
\`\`\`bash
cd frontend
npm install
npm run dev
\`\`\`

### Step 4: Begin Hacking
Open your web browser and navigate to:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 🧰 Bug Bounty Tooling (Optional but Recommended)
While the UI provides an interactive attack terminal, to truly practice the Black Box methodologies taught in the lessons, we highly recommend installing the following CLI tools:

1. **`grpcurl`**: The cURL for gRPC. ([Installation Guide](https://github.com/fullstorydev/grpcurl))
2. **`grpcui`**: An interactive web UI for gRPC. ([Installation Guide](https://github.com/fullstorydev/grpcui))
3. **Burp Suite**: With a gRPC proxy extension installed (e.g., *gRPC Proxy* or *RouteSpider*).

---

*Disclaimer: This repository is intended for authorized security research and educational purposes only.*
