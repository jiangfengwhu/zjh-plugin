import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { FlashList } from '@shopify/flash-list';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { Bell, CalendarDays, ExternalLink, Plus, Trash2 } from 'lucide-react-native';
import { app, data, owner, updateState } from './model';
import { Action, Card, IconAction, styles, usePalette } from './ui';
import { blankJob, getWorkspace, removeJob, saveJob, stages, useWorkspace, type Job } from './workspace';

const points = ['86%'];
const backdrop = (p: React.ComponentProps<typeof BottomSheetBackdrop>) => <BottomSheetBackdrop {...p} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior="close" />;
const key = (j: Job) => j.id;
const contentStyle = { paddingHorizontal: 14, paddingBottom: 24 };
const fail = (e: unknown) => app.toast.show(e instanceof Error ? e.message : '操作失败，请重试', 'error');
export function formatTime(time: number | null) { if (!time) return '未设日期'; const d = new Date(time); return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; }
const JobRow = memo(function JobRow({ job, overdue, onOpen }: { job: Job; overdue: boolean; onOpen: (id: string) => void }) {
  const c = usePalette();
  return <Pressable accessibilityRole="button" onPress={() => onOpen(job.id)} style={({ pressed }) => ({ paddingVertical: 12, borderBottomWidth: 1, borderColor: c.line, gap: 5, opacity: pressed ? .65 : 1 })}><View style={styles.spread}><Text numberOfLines={1} style={[styles.heading, { color: c.text, flex: 1 }]}>{job.company} · {job.title}</Text><Text style={[styles.small, { color: c.primary }]}>{job.stage}</Text></View><Text style={[styles.body, { color: c.text }]}>{job.nextStep || '下一步：补充行动与时间'}</Text><View style={styles.spread}><Text style={[styles.small, { color: overdue ? c.orange : c.muted }]}>{formatTime(job.nextAt)}{overdue ? ' · 日期已过，请核对进展' : ''}</Text><Text style={[styles.small, { color: c.muted }]}>{job.reminderId ? '已设置提醒' : job.url ? '有原岗位链接' : '手动记录'}</Text></View></Pressable>;
});

export const Jobs = memo(function Jobs({ active, request, onInterview, onTopic }: { active: boolean; request: { job?: Job; id?: string; at: number }; onInterview: () => void; onTopic: (topic: string) => void }) {
  const c = usePalette(), work = useWorkspace(), account = owner(), visible = useRef(active); visible.current = active;
  const [filter, setFilter] = useState('待处理'), [draft, setDraft] = useState<Job | null>(null), [picker, setPicker] = useState<'date' | 'time' | null>(null), [error, setError] = useState('');
  const [now, setNow] = useState(Date.now);
  useEffect(() => { if (active) setNow(Date.now()); }, [active, request.at]);
  const modal = useRef<BottomSheetModal>(null), handled = useRef(0), mounted = useRef(true), reminderBusy = useRef(false);
  useEffect(() => () => { mounted.current = false; }, []);
  const open = useCallback((id: string) => { const value = getWorkspace().jobs.find(j => j.id === id); if (!value) return; setDraft({ ...value }); setError(''); modal.current?.present(); }, []);
  useEffect(() => { if (request.at === handled.current) return; handled.current = request.at; const value = request.job || getWorkspace().jobs.find(j => j.id === request.id); if (value) { setDraft({ ...value }); setError(''); modal.current?.present(); } }, [request]);
  useEffect(() => { if (!active) { modal.current?.dismiss(); setPicker(null); } }, [active]);
  const rows = useMemo(() => work.jobs.filter(j => filter === '全部' || filter === '待处理' && j.stage !== '结束' || j.stage === filter).sort((a,b) => (a.nextAt || Infinity) - (b.nextAt || Infinity) || b.updatedAt - a.updatedAt), [work.jobs, filter]);
  const render = useCallback(({ item }: { item: Job }) => <JobRow job={item} overdue={!!item.nextAt && item.nextAt < now && item.stage !== '结束'} onOpen={open} />, [open, now]);
  const setField = (name: keyof Job, value: string | number | null) => setDraft(j => j ? { ...j, [name]: value } : j);
  const remind = async (id: string) => {
    if (reminderBusy.current || !visible.current) return;
    const job = getWorkspace().jobs.find(j => j.id === id);
    if (!job?.nextAt || job.stage === '结束') return;
    reminderBusy.current = true;
    const reminderId = `cj.${account.replace(/-/g, '').slice(0, 12)}.${job.id}.${Date.now().toString(36)}`;
    try {
      const permission = await app.phone.requestNotifications();
      if (owner() !== account || !visible.current) return;
      if (!permission.ok || !permission.granted) throw new Error(permission.error || '记录已保存，通知未允许。可在系统设置中开启后重试。');
      const status = await app.phone.notificationStatus();
      if (!status.ok || !status.enabled) throw new Error('记录已保存，应用通知渠道未开启，请在通知设置中开启');
      const at = job.nextAt - 60 * 60_000 > Date.now() ? job.nextAt - 60 * 60_000 : Date.now() + 5000;
      if (job.nextAt <= Date.now()) throw new Error('记录已保存，日期已过，未设置提醒');
      if (owner() !== account || !visible.current || getWorkspace().jobs.find(j => j.id === id)?.updatedAt !== job.updatedAt) return;
      const result = await app.phone.schedule(reminderId, `${job.company} · ${job.nextStep || '求职事项'}`, `${job.title} · ${formatTime(job.nextAt)}`, at, { params: { job: id, account }, actions: [{ id: 'later', title: '稍后提醒', behavior: 'snooze', snoozeMs: 10 * 60_000 }] });
      if (!result.ok) throw new Error(result.error || '设置提醒失败，求职记录已保留');
      const current = owner() === account ? getWorkspace().jobs.find(j => j.id === id) : null;
      if (!current || current.updatedAt !== job.updatedAt) { await app.phone.cancelSchedule(reminderId); return; }
      saveJob({ ...current, reminderId, reminderAt: result.atMs || at }, account);
      if (job.reminderId && job.reminderId !== reminderId) void app.phone.cancelSchedule(job.reminderId).catch(() => { if (owner() === account) app.toast.show('新提醒已设置，旧提醒取消失败，请检查通知', 'error'); });
      app.toast.show(result.exact ? '提醒已设置' : '提醒已设置，送达时间可能受系统省电影响', 'success');
    } catch (e) { if (owner() === account) fail(e); }
    finally { if (mounted.current) reminderBusy.current = false; }
  };
  const commit = (withReminder = false) => {
    if (!draft) return;
    if (!draft.company.trim() || !draft.title.trim()) { setError('请补充公司与岗位名称'); return; }
    if (draft.url) { try { const u = new URL(draft.url); if (u.protocol !== 'https:' || u.username || u.password) throw new Error(); } catch { setError('岗位链接需为不含账号密码的 HTTPS 地址'); return; } }
    if (withReminder && (!draft.nextAt || draft.nextAt <= Date.now() || draft.stage === '结束')) { setError('请先设置未来的下一步时间'); return; }
    const value = { ...draft, company: draft.company.trim(), title: draft.title.trim() }; saveJob(value, account); modal.current?.dismiss();
    app.toast.show('求职记录已保存', 'success'); if (withReminder) void remind(value.id);
  };
  const prepare = () => { if (!draft) return; if (!draft.company.trim() || !draft.title.trim()) { setError('请先补充公司与岗位'); return; } const job = draft; saveJob(job, account); const role = ['前端','后端','数据分析','产品','运营','设计'].find(r => job.title.includes(r)) || '通用 / 还没想好'; updateState(s => ({ ...s, profile: { ...s.profile, company: job.company, target: job.title, role, jd: job.jd } }), account); modal.current?.dismiss(); onInterview(); };
  const calendar = async () => { if (!draft?.nextAt) return; try { const result = await app.phone.calendar.compose({ title: `${draft.company} · ${draft.nextStep || draft.title}`, startMs: draft.nextAt, endMs: draft.nextAt + 60 * 60_000, description: `${draft.title}\n${draft.url}\n${draft.note}` }); if (!result.ok) fail(new Error(result.error)); } catch (e) { fail(e); } };
  const field = (name: 'company'|'title'|'url'|'jd'|'nextStep'|'note', label: string, placeholder: string, max: number, multiline = false) => <View style={{ gap: 4 }}><Text style={[styles.label, { color: c.text }]}>{label}</Text><BottomSheetTextInput accessibilityLabel={label} value={draft?.[name] || ''} onChangeText={v => setField(name, v)} maxLength={max} multiline={multiline} placeholder={placeholder} placeholderTextColor={c.muted} style={[styles.field, { color: c.text, backgroundColor: c.field, borderColor: c.line, ...(multiline ? { minHeight: 80, maxHeight: 160 } : {}) }]} /></View>;
  return <View style={{ flex: 1 }}><View style={{ paddingHorizontal: 14, paddingTop: 8, gap: 6 }}><View style={styles.spread}><View><Text style={[styles.heading, { color: c.text }]}>每个岗位，都有明确下一步</Text><Text style={[styles.small, { color: c.muted }]}>{work.jobs.length} 条记录 · 本机保存 · 最多100条</Text></View><IconAction label="新增求职记录" onPress={() => { setDraft(blankJob()); setError(''); modal.current?.present(); }}><Plus size={22} color={c.primary} /></IconAction></View><ScrollView horizontal showsHorizontalScrollIndicator={false}>{['待处理', '全部', '想投', '已投递', '笔试', '面试', 'Offer', '结束'].map(x => <Pressable key={x} accessibilityRole="button" accessibilityState={{ selected: filter === x }} onPress={() => setFilter(x)} style={({ pressed }) => ({ minHeight: 44, paddingHorizontal: 10, justifyContent: 'center', opacity: pressed ? .6 : 1, borderBottomWidth: filter === x ? 2 : 0, borderColor: c.primary })}><Text style={{ color: filter === x ? c.primary : c.muted, fontSize: 13 }}>{x}</Text></Pressable>)}</ScrollView></View>
    <FlashList data={rows} renderItem={render} keyExtractor={key} contentContainerStyle={contentStyle} ListEmptyComponent={<View style={{ paddingVertical: 18, gap: 12 }}><Text style={[styles.body, { color: c.text }]}>把岗位链接、投递进度和下一步写在一起，面试和截止日期就有地方可查。</Text><Action label="记录第一个岗位" onPress={() => { setDraft(blankJob()); modal.current?.present(); }} /><Card><Text style={[styles.heading, { color: c.text }]}>找机会与核对资格</Text><Action label="校招与应届生资格资料" subtle onPress={() => onTopic('校招')} /><Action label="远程与公开招聘入口" subtle onPress={() => onTopic('机会')} /></Card></View>} ListFooterComponent={<View style={{ paddingTop: 14, gap: 8 }}><View style={styles.row}><Action label="谈薪 / Offer 核对" subtle onPress={() => onTopic('谈薪')} style={{ flex: 1 }} /><Action label="权益与避坑资料" subtle onPress={() => onTopic('权益')} style={{ flex: 1 }} /></View><Text style={[styles.small, { color: c.muted }]}>进度是你自己的记录。原岗位链接可随时核对，实际招聘状态以招聘方回复为准。</Text></View>} />
    <BottomSheetModal ref={modal} snapPoints={points} enableDynamicSizing={false} backdropComponent={backdrop} enablePanDownToClose keyboardBehavior="interactive" android_keyboardInputMode="adjustResize" backgroundStyle={{ backgroundColor: c.surface }} handleIndicatorStyle={{ backgroundColor: c.muted }} onDismiss={() => { setDraft(null); setPicker(null); setError(''); }}>
      {draft ? <BottomSheetScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}><View style={styles.spread}><Text style={[styles.heading, { color: c.text }]}>岗位与下一步</Text><IconAction label="删除求职记录" onPress={() => Alert.alert('删除这条记录？', '同时取消已设置的提醒。', [{ text: '取消', style: 'cancel' }, { text: '删除', style: 'destructive', onPress: () => { removeJob(draft.id, account); modal.current?.dismiss(); } }])}><Trash2 size={18} color={c.orange} /></IconAction></View>
        {field('company','公司','实际招聘方',100)}{field('title','岗位','岗位名称',100)}{field('url','原岗位链接（可选）','https://…',1000)}
        <Text style={[styles.label, { color: c.text }]}>当前进度</Text><View style={styles.chips}>{stages.map(x => <Pressable key={x} accessibilityRole="button" accessibilityState={{ selected: draft.stage === x }} onPress={() => setField('stage',x)} style={({ pressed }) => [styles.chip, { backgroundColor: draft.stage === x ? c.primary : c.field, borderColor: c.line, opacity: pressed ? .6 : 1 }]}><Text style={{ color: draft.stage === x ? c.onPrimary : c.text, fontSize: 13 }}>{x}</Text></Pressable>)}</View>
        {field('nextStep','下一步','网申截止 / 笔试 / 一面 / 问进度',200)}<View style={styles.row}><Action label={draft.nextAt ? formatTime(draft.nextAt).split(' ')[0] : '选择日期'} subtle onPress={() => setPicker('date')} style={{ flex: 1 }} /><Action label={draft.nextAt ? formatTime(draft.nextAt).split(' ')[1] : '选择时间'} subtle onPress={() => setPicker('time')} style={{ flex: 1 }} /><Action label="清除" subtle onPress={() => setField('nextAt',null)} /></View>
        {picker ? <DateTimePicker key={picker} mode={picker} value={new Date(draft.nextAt || Date.now() + 24 * 60 * 60_000)} onChange={(event,date) => { setPicker(null); if (event.type !== 'set' || !date) return; const next = new Date(draft.nextAt || Date.now() + 24 * 60 * 60_000); if (picker === 'date') next.setFullYear(date.getFullYear(),date.getMonth(),date.getDate()); else next.setHours(date.getHours(),date.getMinutes()); next.setSeconds(0,0); setField('nextAt',next.getTime()); }} /> : null}
        {field('jd','岗位描述（可选）','保存这次投递的 JD，后续面试可沿用',6000,true)}{field('note','我的记录','面试实际被问到什么、招聘方回复、待核对事项',4000,true)}
        {error ? <Text accessibilityLiveRegion="polite" style={[styles.body, { color: c.orange }]}>{error}</Text> : null}
        <View style={styles.row}><Action label="保存" onPress={() => commit()} style={{ flex: 1 }} /><Action label="保存并提醒" subtle icon={<Bell size={16} color={c.text} />} onPress={() => commit(true)} style={{ flex: 1 }} /></View><Text style={[styles.small, { color: c.muted }]}>提醒默认提前1小时；不足1小时则尽快提醒。仅点击“保存并提醒”时申请通知权限。</Text>
        <Action label="按这个岗位准备面试" subtle onPress={prepare} /><View style={styles.row}><Action label="加入系统日历" subtle icon={<CalendarDays size={16} color={c.text} />} disabled={!draft.nextAt} onPress={() => void calendar()} style={{ flex: 1 }} /><Action label="打开原链接" subtle icon={<ExternalLink size={16} color={c.text} />} disabled={!draft.url.startsWith('https://')} onPress={() => void Linking.openURL(draft.url).catch(fail)} style={{ flex: 1 }} /></View>
        <Action label="整理面经，分享到社区" subtle onPress={() => { if (owner() !== account) return; void app.feed.compose({ body: `${draft.company} · ${draft.title}\n面试时间：［填写实际日期］\n轮次：［填写］\n实际被问的问题：\n${draft.note.slice(0,1300) || '［填写亲历问题］'}\n\n我的准备建议：［填写］\n以上是个人经历，其他岗位与轮次可能不同。`, application: { appId: 'career-rescue' } }).catch(fail); }} />
      </BottomSheetScrollView> : <View />}
    </BottomSheetModal>
  </View>;
});
