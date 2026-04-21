import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';

// Load our lab.proto file dynamically without needing protoc
// We point to the backend folder relative to the frontend app.
// Since Next.js runs from frontend directory, the path is ../backend/protos/lab.proto
const PROTO_PATH = path.resolve(process.cwd(), '../backend/protos/lab.proto');

let packageDefinition;
try {
  packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
  });
} catch (error) {
  console.error("Failed to load generic proto:", error);
}

const labProto = grpc.loadPackageDefinition(packageDefinition).lab;

// We connect to the local vulnerable backend
const gRpcTarget = "localhost:50051";
const credentials = grpc.credentials.createInsecure();

// Helper to make gRPC calls returning Promises
export const executeGrpcCall = (serviceName, methodName, payload, metadataObj = {}) => {
  return new Promise((resolve, reject) => {
    try {
      const Service = labProto[serviceName];
      if (!Service) return reject(new Error(`Service ${serviceName} not found`));
      
      const client = new Service(gRpcTarget, credentials);
      if (!client[methodName]) return reject(new Error(`Method ${methodName} not found in ${serviceName}`));

      const meta = new grpc.Metadata();
      for (const [key, val] of Object.entries(metadataObj)) {
        meta.add(key, val);
      }

      client[methodName](payload, meta, (err, response) => {
        if (err) {
          resolve({ error: true, code: err.code, details: err.details, message: err.message });
        } else {
          resolve({ error: false, response });
        }
      });
    } catch (e) {
      reject(e);
    }
  });
};
