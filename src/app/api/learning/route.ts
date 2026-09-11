import { requireUser } from '@/server/auth';
import { transaction } from '@/server/db';
import { handle, json } from '@/server/http';
import { ApiError, limit, readBody } from '@/server/security';
import { validateLearningEvent } from '@/lib/learning-event';
export async function POST(request: Request) {
  return handle(async () => {
    const user = await requireUser();
    const event = validateLearningEvent(await readBody(request));
    if (!event) throw new ApiError(400, 'กิจกรรมไม่ถูกต้อง');
    await transaction(async client => {
      await limit(client, 'learning:' + user.id, 120, 60);
      await client.query(`INSERT INTO learning_events(id,user_id,kind,item_id,category,status,score)
        VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
        [event.id,user.id,event.kind,event.itemId,event.category,event.status,event.score]);
    });
    return json({ok:true});
  });
}
