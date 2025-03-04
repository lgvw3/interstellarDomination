import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI || "your-mongodb-connection-string";
let client;
let clientPromise: Promise<MongoClient>;

if (!process.env.MONGODB_URI) {
    throw new Error("Please add your MongoDB URI to .env.local");
}

if (process.env.NODE_ENV === "development") {
    const globalWithMongo = global as typeof globalThis & {
        _mongoClientPromise?: Promise<MongoClient>;
    };
    
    if (!globalWithMongo._mongoClientPromise) {
        client = new MongoClient(uri);
        globalWithMongo._mongoClientPromise = client.connect();
    }
    clientPromise = globalWithMongo._mongoClientPromise;
} else {
    // In production, use a new client instance
    client = new MongoClient(uri);
    clientPromise = client.connect();
}

export default clientPromise;
