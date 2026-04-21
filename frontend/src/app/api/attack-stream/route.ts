import { NextResponse } from 'next/server';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';

const PROTO_PATH = path.resolve(process.cwd(), '../backend/protos/lab.proto');

let packageDefinition;
try {
  packageDefinition = protoLoader.loadSync(PROTO_PATH, { keepCase: true, longs: String, enums: String, defaults: true, oneofs: true });
} catch (error) {}

const labProto = grpc.loadPackageDefinition(packageDefinition).lab;
const gRpcTarget = "localhost:50051";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { chunk_count } = body;

    const Service = labProto.StreamingService;
    const client = new Service(gRpcTarget, grpc.credentials.createInsecure());

    const encoder = new TextEncoder();

    // Create a generic readable stream
    const stream = new ReadableStream({
      start(controller) {
        const call = client.downloadLargeDataset({ chunk_count });

        call.on('data', (data: any) => {
          controller.enqueue(encoder.encode(JSON.stringify(data) + '\\n'));
        });

        call.on('end', () => {
          controller.close();
        });

        call.on('error', (err: any) => {
          controller.enqueue(encoder.encode(JSON.stringify({ error: err.message }) + '\\n'));
          controller.close();
        });
      }
    });

    return new Response(stream, {
      headers: { 'Content-Type': 'application/x-ndjson' }
    });

  } catch (error: any) {
    return NextResponse.json({ error: true, details: error.message }, { status: 500 });
  }
}
