const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const { ReflectionService } = require('@grpc/reflection');

const PROTO_PATH = path.join(__dirname, 'protos', 'lab.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const labProto = grpc.loadPackageDefinition(packageDefinition).lab;

// --- Mock Database ---
const users = {
  "admin": { id: "1", username: "admin", email: "admin@grpc-lab.local", role: "admin", theme: "dark", api_key: "sup3r_s3cr3t_4dm1n_k3y" },
  "user1": { id: "2", username: "user1", email: "user1@grpc-lab.local", role: "user", theme: "light", api_key: "usr_k3y_abc" },
  "user2": { id: "3", username: "user2", email: "user2@grpc-lab.local", role: "user", theme: "light", api_key: "usr_k3y_xyz" }
};

const logs = [
  "System started",
  "User connection from 192.168.1.5",
  "Error: Failed to connect to database in module auth",
  "Warning: High memory usage detected"
];


// --- Module 1 & 4: Admin Service (Reflection enabled & Auth Bypass) ---
function getSystemLogs(call, callback) {
  // Vulnerability: Missing Authentication / Authorization. 
  // An attacker can call this just by discovering it via Reflection.
  const filter = call.request.filter || "";
  const filteredLogs = logs.filter(l => l.includes(filter));
  callback(null, { logs: filteredLogs });
}

function clearSystemLogs(call, callback) {
  // Vulnerability: Missing Auth. Destructive action!
  if (call.request.force) {
    logs.length = 0; // Clear array
    callback(null, { success: true, message: "Logs successfully cleared. (You shouldn't be able to do this!)" });
  } else {
    callback(null, { success: false, message: "Force flag required." });
  }
}

// --- Module 3: Data Service (Injection Attacks) ---
function getUserData(call, callback) {
  // Vulnerability: JS/NoSQL Injection Payload
  // If an attacker sends a string like: `admin" || "1"=="1` they can manipulate the logic
  // Here we simulate an injection by passing the string to eval (which is commonly similar to NoSQL $where or loose SQL building)
  const reqUsername = call.request.username;
  
  if (!reqUsername) {
    return callback({ code: grpc.status.INVALID_ARGUMENT, details: "Username required" });
  }

  try {
    // Intentionally terrible simulated query:
    const query = `Object.values(users).find(u => u.username == "${reqUsername}")`;
    const foundUser = eval(query);

    if (foundUser) {
      callback(null, foundUser);
    } else {
      callback({ code: grpc.status.NOT_FOUND, details: "User not found" });
    }
  } catch (e) {
    // Information Leakage (returning stack traces directly in gRPC errors)
    callback({ code: grpc.status.INTERNAL, details: "Database Query Error: " + e.message });
  }
}

// --- Module 2: Config Service (IDOR & Interception) ---
function getUserConfig(call, callback) {
  // Vulnerability: Insecure Direct Object Reference (IDOR)
  // The service only checks if user_id exists, it doesn't check if the *current logged in user* 
  // is authorized to view this specific config (because there is no session tracking here!).
  const targetId = call.request.user_id;

  const targetUser = Object.values(users).find(u => u.id === targetId);

  if (targetUser) {
    callback(null, {
      user_id: targetUser.id,
      theme: targetUser.theme,
      api_key: targetUser.api_key
    });
  } else {
    callback({ code: grpc.status.NOT_FOUND, details: "Config for user not found" });
  }
}

// --- Module 5: Streaming DoS ---
function downloadLargeDataset(call) {
  // Vulnerability: The server blindly respects the attacker's requested chunk count
  // without any rate limiting or hard maximums.
  const count = call.request.chunk_count || 1;
  const maxSafeCount = 100;

  // In a real DoS, this would blow up memory. For the lab, we just sleep/simulate.
  let i = 0;
  function sendNext() {
    if (i < count) {
      call.write({ payload: `Chunk \${i}: ` + "A".repeat(1024) });
      i++;
      // Simulate heavy load delaying the event loop
      setTimeout(sendNext, 10);
    } else {
      call.end();
    }
  }
  sendNext();
}

// --- Module 6: Interceptors (Mismatched Route Flaw) ---
function triggerSystemBackup(call, callback) {
  // The handler assumes the JWT Interceptor has already vetted the caller.
  callback(null, { status: "System Backup Initiated Successfully. Root Access Granted." });
}

// --- The Flawed Interceptor ---
// In true gRPC Node (grpc-js), there isn't a native "global middleware" easily like Express.
// Instead, people often write wrappers around the server methods. We will simulate this 
// by wrapping the methods when we add them to the server, checking metadata.
function withAuthInterceptor(handler, requiredRole) {
  return function(call, callback) {
    const authHeader = call.metadata ? call.metadata.get('authorization')[0] : null;
    
    // Vulnerability Flaw 1: It accepts the 'none' algorithm or easily spoofed headers
    // Vulnerability Flaw 2 (often): The auth check is skipped if the metadata key is named differently, etc.
    if (!authHeader) {
      if (callback) return callback({ code: grpc.status.UNAUTHENTICATED, details: "Missing JWT Token" });
      else return call.destroy(new Error("Missing JWT Token")); // For streams
    }

    // A real vulnerable parser: it base64 decodes the JWT without checking the signature!
    try {
      const payloadB64 = authHeader.split('.')[1];
      const payloadStr = Buffer.from(payloadB64, 'base64').toString('utf8');
      const payload = JSON.parse(payloadStr);

      if (payload.role !== requiredRole) {
        if (callback) return callback({ code: grpc.status.PERMISSION_DENIED, details: "Insufficient Role" });
        else return call.destroy(new Error("Insufficient Role"));
      }

      // Proceed
      return handler(call, callback);
    } catch (e) {
      if (callback) return callback({ code: grpc.status.UNAUTHENTICATED, details: "Invalid JWT format" });
      else return call.destroy(new Error("Invalid JWT"));
    }
  };
}

function main() {
  const server = new grpc.Server();

  // Add services
  server.addService(labProto.AdminService.service, { getSystemLogs, clearSystemLogs });
  server.addService(labProto.DataService.service, { getUserData });
  server.addService(labProto.ConfigService.service, { getUserConfig });
  
  // New services
  server.addService(labProto.StreamingService.service, { downloadLargeDataset });
  
  // We wrap the SecureAdminService with our "flawed" interceptor
  server.addService(labProto.SecureAdminService.service, { 
    triggerSystemBackup: withAuthInterceptor(triggerSystemBackup, 'admin') 
  });

  // Add Reflection! (Vulnerability: Enabled in "production")
  const reflection = new ReflectionService(packageDefinition);
  reflection.addToServer(server);

  server.bindAsync('0.0.0.0:50051', grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
      console.error(err);
      return;
    }
    console.log('[gRPC Security Lab] Target Backend running on port ' + port);
    // server.start(); // Not needed in newer versions of grpc-js, bindAsync starts it if not explicitly stopped, wait, actually we might need it, but let's check
    // Actually wait, for grpc-js, start() is not strictly needed after bindAsync finishes, but we can call it. Wait, `server.start()` has been deprecated or changed in some versions. Let's just call it.
    server.start();
  });
}

main();
