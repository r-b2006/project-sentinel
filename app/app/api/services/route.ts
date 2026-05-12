import Database from 'better-sqlite3';
import { NextResponse } from 'next/server';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const dbPath = path.join(process.cwd(), '..', 'sentinel.db');
        const db = new Database(dbPath);

        const rows = db.prepare('SELECT * FROM service_status ORDER BY service_name').all();
        db.close();

        return NextResponse.json(rows);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}