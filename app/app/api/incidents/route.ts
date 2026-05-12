import Database from 'better-sqlite3';
import { NextResponse } from 'next/server';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const { service_name, status, error_message, resolved_by, resolution_notes } = await request.json();

        const dbPath = path.join(process.cwd(), '..', 'sentinel.db');
        const db = new Database(dbPath);

        const stmt = db.prepare(`
            UPDATE service_status
            SET status = ?, error_message = ?, resolved_by = ?, resolution_notes = ?, updated_at = datetime('now')
            WHERE service_name = ?
        `);
        stmt.run(status, error_message || '', resolved_by || '', resolution_notes || '', service_name);
        db.close();

        return NextResponse.json({ success: true });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
