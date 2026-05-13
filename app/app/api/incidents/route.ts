import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const filePath = path.join(process.cwd(), '..', 'docs', 'incident-history.log');

        if (!fs.existsSync(filePath)) {
            return NextResponse.json({ log: 'No incidents yet' });
        }

        const fileContents = fs.readFileSync(filePath, 'utf8');
        return NextResponse.json({ log: fileContents });
    } catch (error) {
        return NextResponse.json({ log: 'No incidents yet' });
    }
}