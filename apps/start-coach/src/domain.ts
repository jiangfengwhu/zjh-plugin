export type Blocker = 'unclear' | 'big' | 'tired';
export type Outcome = 'first' | 'more' | 'none';
export type Step = { action: string; reason: string; source: 'local' | 'ai' | 'remembered'; category: string };
export type Session = {
  id: string; task: string; step: Step; startedAt: number; plannedSec: number;
  elapsedSec: number; resumedAt: number | null; status: 'ready' | 'running' | 'paused' | 'confirm' | 'finished';
  firstConfirmed: boolean; adjustments: number; coachRounds: number; blocker: Blocker | null;
  outcome: Outcome | null; completedAt: number | null; useful: boolean | null;
};
export const examples = ['周报明天要交，但我不想写', '方案一直停在空白页', '邮件不知道怎么开头'];
export const blockerLabels: Record<Blocker, string> = { unclear: '不知道具体做什么', big: '事情太多，无从下手', tired: '太累，只想少做一点' };
export const outcomeLabels: Record<Outcome, string> = { first: '做出了第一步', more: '又推进了一点', none: '还没动起来' };

export function localStep(task: string, blocker: Blocker | null = null, level = 0): Step {
  const safety = /自杀|自残|伤害自己|杀人|诈骗|偷盗/.test(task);
  if (safety) return { category: 'other', source: 'local', action: '先暂停这件事，给信任的人发一句“我需要你陪我一下”。', reason: '先让自己安全、有人陪伴，不急着推进任务。' };
  const category = /周报|日报|总结/.test(task) ? 'weekly' : /邮件|邮箱/.test(task) ? 'email' : /论文|毕业/.test(task) ? 'paper' : /方案|PPT|演示|策划/.test(task) ? 'proposal' : /视频|剪辑|素材/.test(task) ? 'video' : /复习|考试|英语|学习|考研/.test(task) ? 'study' : /跑步|运动|锻炼/.test(task) ? 'exercise' : 'other';
  const actions: Record<string, string[]> = {
    weekly: ['打开周报文档，写下“本周完成”。', '在“本周完成”下面，写下“我做了”。', '打开周报文档，先不用写内容。'],
    email: ['打开一封新邮件，在正文写下“您好”。', '在邮件正文写下“这封邮件想确认”。', '打开邮箱，先不用找收件人。'],
    paper: ['打开论文文档，写下“待补充”。', '在文档末尾写下“我已知道”。', '打开论文文档，先不用修改。'],
    proposal: ['打开方案文档，在第一页写下“初稿”。', '在“初稿”下面写下“这次想解决”。', '打开一个空白文档，先不用选模板。'],
    video: ['打开剪辑软件，先停在首页。', '新建一个空白项目，先不用挑素材。', '打开剪辑软件，先不用做任何编辑。'],
    study: ['打开手边的学习材料，停在上次读到的地方。', '在纸上写下“今天只看这一页”。', '拿起手边的学习材料，先不用翻页。'],
    exercise: ['站起来，把跑鞋放到脚边。', '拿起一只跑鞋，先不用出门。', '把脚放到地面，先不用站起来。'],
    other: ['打开便签，写下“先试一下”。', '在便签写下“我先只做一点”。', '打开便签，先不用写计划。'],
  };
  const index = level > 0 || blocker === 'tired' ? 2 : blocker === 'unclear' ? 1 : 0;
  return { action: actions[category][index], reason: index === 2 ? '先碰到工具就够了，不要求现在做完。' : '先让任务有一个可见的起点，不必把整件事想清楚。', source: 'local', category };
}
export function makeSession(task: string, remembered?: Step, now = Date.now()): Session {
  return { id: `start-${now}-${Math.random().toString(36).slice(2, 8)}`, task: task.trim().slice(0, 1000), step: remembered || localStep(task), startedAt: now, plannedSec: 300, elapsedSec: 0, resumedAt: null, status: 'ready', firstConfirmed: false, adjustments: 0, coachRounds: 0, blocker: null, outcome: null, completedAt: null, useful: null };
}
export function elapsed(s: Session, now = Date.now()): number {
  const extra = s.status === 'running' && s.resumedAt !== null ? Math.max(0, (now - s.resumedAt) / 1000) : 0;
  return Math.min(s.plannedSec, Math.max(0, s.elapsedSec + extra));
}
export function start(s: Session, durationSec: number, now = Date.now()): Session {
  return { ...s, plannedSec: durationSec, startedAt: now, elapsedSec: 0, resumedAt: now, status: 'running' };
}
export function pause(s: Session, now = Date.now()): Session { return { ...s, elapsedSec: elapsed(s, now), resumedAt: null, status: 'paused' }; }
export function resume(s: Session, now = Date.now()): Session { return { ...s, resumedAt: now, status: 'running' }; }
export function stop(s: Session, now = Date.now()): Session { return { ...pause(s, now), status: 'confirm' }; }
export function finish(s: Session, outcome: Outcome, now = Date.now()): Session {
  return { ...stop(s, now), status: 'finished', outcome, firstConfirmed: outcome !== 'none', completedAt: now };
}
export function formatDuration(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}
export function parseStep(raw: string, base: Step): Step {
  const start = raw.indexOf('{'), end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('格式不完整');
  const value = JSON.parse(raw.slice(start, end + 1));
  const action = typeof value.first_step === 'string' ? value.first_step.trim() : '';
  const reason = typeof value.why_easy === 'string' ? value.why_easy.trim() : '';
  if (!action || action.length > 70 || !reason || reason.length > 70 || /ADHD|疾病|疗效|治疗|执行功能障碍|必须坚持|失败|自残|自杀/i.test(action + reason)) throw new Error('建议不适合开工');
  if (!/^(打开|写下|拿起|站|把|在|复制|穿|放|点击|先)/.test(action)) throw new Error('缺少明确动作');
  return { ...base, action, reason, source: 'ai' };
}
