import { requireUser } from '@/server/auth';
import { handle, json } from '@/server/http';
export async function GET() {return handle(async () => json({user: await requireUser()}));}
