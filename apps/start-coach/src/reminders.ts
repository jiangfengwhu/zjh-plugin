import { app, owner } from './store';
import { elapsed, type Session } from './domain';
let queue = Promise.resolve(), revision = 0;
const id = 'round.end';
export function syncReminder(session: Session | null, enabled: boolean) {
  const version = ++revision, account = owner();
  queue = queue.catch(() => {}).then(async () => {
    if (version !== revision) return;
    const next = enabled && session?.status === 'running' && session.resumedAt !== null && elapsed(session) < session.plannedSec ? session : null;
    await app.phone.cancelSchedule(id);
    if (!next || version !== revision || account !== owner()) return;
    const atMs = next.resumedAt! + (next.plannedSec - next.elapsedSec) * 1000;
    const result = await app.phone.schedule(id, '这一轮结束了', '要继续，还是先看看已经推进了什么？', atMs, { params: { round: next.id } });
    if (!result.ok && version === revision && account === owner()) app.toast.show('结束提醒未设置成功，仍可回到应用查看计时。');
  });
}
