import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const filePath = path.join(process.cwd(), '..', 'docs', 'incident-history.log');

        if (!fs.existsSync(filePath)) {
            return NextResponse.json({ log: 'No incidents yet', resolvedByClaude: 0 });
        }

        const fileContents = fs.readFileSync(filePath, 'utf8');
        const closedCount = (fileContents.match(/\|CLOSED\|/g) || []).length;
        return NextResponse.json({ log: fileContents, resolvedByClaude: closedCount });
    } catch (error) {
        return NextResponse.json({ log: 'No incidents yet', resolvedByClaude: 0 });
    }
}