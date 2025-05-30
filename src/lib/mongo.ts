import { MongoClient, Db } from 'mongodb';
import { Logger } from './logger';

const uri = process.env.PAYMENT_DB_URI!;
const client = new MongoClient(uri);

let db: Db;

export const connectToMongo = async () => {
  if (!db) {
    await client.connect();
    db = client.db();
    Logger('✅ Connected to DB Payments');
  }
  return db;
};
