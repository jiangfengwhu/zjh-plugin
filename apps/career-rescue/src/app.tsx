import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Alert, Animated, Keyboard, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PagerView from 'react-native-pager-view';
import { useIsFocused } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import { BottomSheetModal, BottomSheetModalProvider, BottomSheetBackdrop, BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { ArrowRight, BriefcaseBusiness, Check, ChevronRight, Copy, Lightbulb, Mic, Settings2, Share2, Sparkles, Square } from 'lucide-react-native';
import type { ShareParams } from '@zijinhua/app-sdk';
import { checklist, questions, roles, type Question } from './content';
import { app, data, owner, copy, draftIntro, toggleCheck, updateState, useCareer, roleName, aiProfile, profileContext, type Profile } from './model';
import { Action, Card, IconAction, styles, usePalette, type Palette } from './ui';
import { startSpeechSession, type SpeechSession } from './speech-session';
import { useAi, AiResult, AiPrivacy } from './coach';
import { Interview } from './interview';
import { QuickCard } from './quick-card';
import { Library, RecommendedMaterials } from './library';
import { clearLearning, refreshMaterials, type Material } from './materials';
import { Resume } from './resume';
import { Jobs } from './jobs';
import { blankJob, clearWorkspace, getWorkspace, type Job } from './workspace';

const AnimatedPager = Animated.createAnimatedComponent(PagerView);
const tabs = ['简历', '面试', '求职', '资料'];
const backdrop = (p: React.ComponentProps<typeof BottomSheetBackdrop>) => <BottomSheetBackdrop {...p} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior="close" />;
const snapPoints = ['85%'];
const taskKey = (item: typeof checklist[number]) => item.id;
const fail = (error: unknown) => app.toast.show(error instanceof Error ? error.message : '操作未完成，请重试', 'error');
const share = (params?: ShareParams, title = '求职急救站') => { void app.sharing.open({ title, description: '面试前一晚，把准备变成可以完成的行动。', params }).catch(fail); };
const fieldStyle = (c: Palette) => [styles.field, { color: c.text, backgroundColor: c.field, borderColor: c.line }];
const Section = ({ title, note, c }: { title: string; note?: string; c: Palette }) => <View style={{ flexShrink: 1, gap: 4 }}><Text style={[styles.heading, { color: c.text }]}>{title}</Text>{note ? <Text style={[styles.small, { color: c.muted }]}>{note}</Text> : null}</View>;

function ProfileEditor({ profile, onSave, c }: { profile: Profile; onSave: (p: Profile) => void; c: Palette }) {
  const [draft, setDraft] = useState(profile);
  const [details, setDetails] = useState(false);
  const state = useCareer(), account = owner();
  const field = (key: keyof Profile, label: string, placeholder: string, limit: number, multiline = false) => <View><Text style={[styles.label, { color: c.text }]}>{label}</Text><BottomSheetTextInput accessibilityLabel={label} style={[fieldStyle(c), multiline && { minHeight: 112 }]} placeholder={placeholder} placeholderTextColor={c.muted} multiline={multiline} maxLength={limit} value={draft[key]} onChangeText={text => setDraft(p => ({ ...p, [key]: text }))} /></View>;
  return <BottomSheetScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
    <Section c={c} title="这次面试" note="写到哪算哪，随时可以补充。内容保存在当前账号本机。" />
    <Text style={[styles.label, { color: c.text }]}>目标方向</Text><View style={styles.chips}>{roles.map(role => <Pressable accessibilityRole="button" accessibilityState={{ selected: draft.role === role }} key={role} onPress={() => setDraft(p => ({ ...p, role }))} style={({ pressed }) => [styles.chip, { backgroundColor: draft.role === role ? c.primary : c.field, borderColor: draft.role === role ? c.primary : c.line, opacity: pressed ? .7 : 1 }]}><Text style={{ color: draft.role === role ? c.onPrimary : c.text }}>{role}</Text></Pressable>)}</View>
    {field('target', '具体岗位（可选）', '例如：新媒体运营 / 行政助理 / 销售', 80)}
    {field('experience', '一段真实经历', '课程项目、实习、社团或个人作品。写清你做了什么、实际结果是什么。', 4000, true)}
    {field('concern', '最担心被问到什么？（可选）', '没有相关实习、转行原因、项目没亮点，或粘贴上次没答好的题。', 600, true)}
    {field('jd', '岗位描述（可选）', '粘贴职位要求，AI 会据此判断匹配点和准备重点。', 6000, true)}
    <Action label={details ? '收起其他信息' : '补充公司、轮次和背景（可选）'} subtle onPress={() => setDetails(v => !v)} />
    {details ? <>{field('company', '面试公司（可选）', '只用于区分准备记录，不生成公司事实', 80)}{field('round', '这次交流的类型', '例如：HR 电话 / 一面 / 二面 / 终面', 40)}{field('name', '怎么称呼你', '姓名或昵称，可不填', 40)}{field('background', '当前背景', '例如：应届生 / 在职转行 / 6 年运营经验', 300)}</> : null}
    <Text style={[styles.small, { color: c.muted }]}>只填你愿意用于练习的内容。AI 处理时会发送相关资料，请先去掉联系方式、客户姓名和保密信息。修改资料后请重新核对旧版自我介绍；进行中的陪练保留开始时的背景。</Text>
    <Action label="保存，开始准备" icon={<Check size={18} color={c.onPrimary} />} onPress={() => { Keyboard.dismiss(); onSave(draft); }} />
    <Action label={state.aiAllowed ? '停止允许 AI 处理资料' : '我已了解数据说明，允许使用 AI'} subtle onPress={() => updateState(s => ({ ...s, aiAllowed: !s.aiAllowed }), account)} />
    <Action label="清空本机准备记录" subtle onPress={() => Alert.alert('清空准备记录？', '将删除本账号的经历、回答、介绍、清单、复盘、收藏、学习状态、笔记、简历版本与求职进度，并取消对应提醒。已自行导出的文件不会被删除。', [{ text: '取消', style: 'cancel' }, { text: '清空', style: 'destructive', onPress: () => { clearLearning(account); clearWorkspace(account); updateState(s => ({ ...s, profile: { ...s.profile, name: '', company: '', experience: '', background: '', jd: '', concern: '' }, answers: {}, intro: '', checked: [], saved: [], plan: null, session: null, history: [], aiAllowed: false }), account); onSave({ ...draft, name: '', company: '', experience: '', background: '', jd: '', concern: '' }); } }])} />
  </BottomSheetScrollView>;
}
const Prepare = memo(function Prepare({ profile, checked, active, onProfile, onPractice, onInterview, onQuick, onIntro, onResource }: { profile: Profile; checked: string[]; active: boolean; onProfile: () => void; onPractice: (id?: string) => void; onInterview: () => void; onQuick: () => void; onIntro: () => void; onResource: (id: string) => void }) {
  const c = usePalette(), ai = useAi(active), state = useCareer(), context = profileContext(profile);
  const currentPlan = state.plan?.context === context ? state.plan.text : '';
  const generate = async () => {
    if (!profile.jd.trim() && !profile.experience.trim()) { onProfile(); app.toast.show('补充一段经历或 JD，就能给你更具体的准备重点'); return; }
    const account = owner();
    const text = await ai.run('用简洁中文短段落输出，不用表格。总计500字以内：①今晚最该补的三个问题，结合用户担心的点，各给一个小动作，三个动作合计建议8分钟内可完成；②三个岗位要求与真实经历的对应证据，缺少证据就标待补充，不把岗位要求当作已有能力；③三道优先练的问题，解释为什么问；④面试前要确认的两件事。没有JD时标注“依据岗位一般要求”。公司部分仅给调研方向，不给未核实事实。', JSON.stringify(aiProfile(profile)));
    if (text) { updateState(s => s.aiAllowed && profileContext(s.profile) === context ? ({ ...s, plan: { context, text } }) : s, account); ai.clear(); }
  };
  const renderTask = useCallback(({ item, index }: { item: typeof checklist[number]; index: number }) => <View style={[styles.row, { paddingVertical: 11, borderBottomWidth: 1, borderColor: c.line }]}>
    <Pressable accessibilityRole="checkbox" accessibilityLabel={`完成：${item.title}`} accessibilityState={{ checked: checked.includes(item.id) }} onPress={() => toggleCheck(item.id)} style={({ pressed }) => ({ width: 48, height: 48, borderRadius: 15, backgroundColor: checked.includes(item.id) ? c.primary : c.field, alignItems: 'center', justifyContent: 'center', opacity: pressed ? .7 : 1 })}>{checked.includes(item.id) ? <Check size={22} color={c.onPrimary} /> : <Text style={{ fontSize: 16, color: c.muted, fontWeight: '700' }}>0{index + 1}</Text>}</Pressable>
    <Pressable accessibilityRole="button" onPress={() => { if (item.action === 'profile') onProfile(); else if (item.action === 'intro') onIntro(); else if (item.action === 'logistics') onResource('day-before'); else if (item.action === 'practice') onInterview(); else onPractice(item.action); }} style={({ pressed }) => ({ flex: 1, gap: 3, paddingVertical: 5, opacity: pressed ? .65 : 1 })}><Text style={[styles.heading, { color: c.text }]}>{item.title}</Text><Text style={[styles.small, { color: c.muted }]}>{item.detail}</Text></Pressable><ChevronRight size={18} color={c.muted} />
  </View>, [checked, c, onProfile, onPractice, onInterview, onIntro, onResource]);
  return <FlashList data={checklist} keyExtractor={taskKey} renderItem={renderTask} contentContainerStyle={{ padding: 14, paddingBottom: 24 }} extraData={checked} ListHeaderComponent={<View style={{ gap: 12, paddingBottom: 12 }}>
    <View style={{ backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, borderRadius: 10, padding: 12, gap: 8 }}><Text style={[styles.heading, { color: c.text }]}>有资料可查，有答案可练</Text><Text style={[styles.small, { color: c.muted }]}>核对岗位 → 学考点 → 开口回答 → 补薄弱点</Text><View style={styles.row}><Action label={state.session && !state.session.report ? '继续陪练' : '整轮面试陪练'} onPress={onInterview} style={{ flex: 1 }} /><Action label="面前回顾" subtle onPress={onQuick} style={{ flex: 1 }} /></View></View>
    <View style={styles.spread}><View style={{ flex: 1 }}><Section c={c} title={roleName(profile)} note={[profile.company, profile.round, profile.jd ? '已提供 JD' : '尚未提供 JD'].filter(Boolean).join(' · ')} /></View><Action label="调整" subtle icon={<Settings2 size={16} color={c.text} />} onPress={onProfile} /></View>
    {profile.concern ? <Text style={[styles.body, { color: c.muted }]}>这次先解决：{profile.concern}</Text> : null}
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}><Action label="准备自我介绍" subtle onPress={onIntro} style={{ flexGrow: 1 }} /><Action label={currentPlan ? '重新整理准备重点' : '帮我找准备重点'} busy={ai.busy} onPress={() => void generate()} style={{ flexGrow: 1 }} /></View>
    <RecommendedMaterials profile={profile} onOpen={onResource} />
    <AiPrivacy /><AiResult ai={ai} c={c} />
    {currentPlan ? <Card><Text style={[styles.heading, { color: c.text }]}>这次面试的准备重点</Text><Text style={[styles.small, { color: c.muted }]}>AI 生成 · 已保存在本机，离线也能回顾</Text><Text selectable style={[styles.body, { color: c.text }]}>{currentPlan}</Text><Action label="带着这些重点去练一轮" onPress={onInterview} /></Card> : null}
    {state.history.length ? <View style={{ gap: 12 }}><Section c={c} title="上次卡住的，这次补上" note="最近 10 次完整或部分复盘，本机保存。" />{state.history.slice(0, 3).map(h => <Card key={h.id}><Text style={[styles.heading, { color: c.text }]}>{roleName(h.profile)}{h.profile.company ? ` · ${h.profile.company}` : ''}</Text><Text style={[styles.small, { color: c.muted }]}>{new Date(h.createdAt).toLocaleDateString()} · {h.turns.filter(t => t.answer.trim()).length} 道回答</Text><Text style={[styles.body, { color: c.text }]}>{h.report?.priorities[0]?.issue}</Text><Action label="打开复盘，重答薄弱题" subtle onPress={() => {
      const account = owner(); const open = () => { updateState(s => ({ ...s, session: h }), account); onInterview(); };
      if (state.session && !state.session.report && state.session.id !== h.id) Alert.alert('打开这份复盘？', '当前未完成的陪练将被替换。', [{ text: '继续陪练', style: 'cancel' }, { text: '打开复盘', onPress: open }]); else open();
    }} /></Card>)}{state.history.length > 3 ? <Action label={`查看全部 ${state.history.length} 份复盘`} subtle onPress={() => onResource('history')} /> : null}</View> : null}
    <View style={styles.spread}><Section c={c} title="补充准备清单" note="点内容开始准备，左侧标记完成。" /><Text style={{ color: c.primary, fontWeight: '800', fontSize: 17 }}>{checked.length}/{checklist.length}</Text></View><View style={{ height: 5, borderRadius: 4, backgroundColor: c.line, overflow: 'hidden' }}><View style={{ width: `${checked.length / checklist.length * 100}%`, height: 5, backgroundColor: c.primary }} /></View>
  </View>} />;
});
const Practice = memo(function Practice({ profile, active, requested }: { profile: Profile; active: boolean; requested: { id?: string; question?: Question; at: number } }) {
  const c = usePalette(), state = useCareer(), ai = useAi(active);
  const pool = useMemo(() => { const base = questions.filter(q => q.role === '通用' || q.role === profile.role); return requested.question ? [requested.question, ...base.filter(q => q.id !== requested.question!.id)] : base; }, [profile.role, requested.question]);
  const [index, setIndex] = useState(0), [hint, setHint] = useState(false), [answer, setAnswer] = useState(''), [listening, setListening] = useState(false), [started, setStarted] = useState<number | null>(null), [seconds, setSeconds] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const question = pool[index % pool.length], speech = useRef<(SpeechSession & { save: () => void }) | null>(null);
  const cancelRecording = useCallback(() => { speech.current?.save(); speech.current?.cancel(); speech.current = null; setListening(false); setFinishing(false); }, []);
  useEffect(() => { setIndex(Math.max(0, pool.findIndex(q => q.id === requested.id))); }, [requested, pool]);
  useEffect(() => { cancelRecording(); setAnswer(state.answers[question.id] || ''); setHint(false); setStarted(null); setSeconds(0); ai.clear(); }, [question.id, cancelRecording]);
  useEffect(() => { const account = owner(), id = question.id; const timer = setTimeout(() => { if (account === owner()) updateState(s => ({ ...s, answers: { ...s.answers, [id]: answer } })); }, 300); return () => clearTimeout(timer); }, [answer, question.id]);
  const next = () => { updateState(s => ({ ...s, answers: { ...s.answers, [question.id]: answer } })); setIndex(i => (i + 1) % pool.length); };
  useEffect(() => { if (!active) { setStarted(null); cancelRecording(); } return cancelRecording; }, [active, cancelRecording]);
  useEffect(() => { if (!started || !active) return; const tick = () => setSeconds(Math.floor((Date.now() - started) / 1000)); tick(); const timer = setInterval(tick, 1000); return () => clearInterval(timer); }, [started, active]);
  const record = () => {
    if (!active || speech.current) return;
    Keyboard.dismiss(); setListening(true);
    const account = owner(), id = question.id;
    let latest = answer;
    const session: SpeechSession & { save: () => void } = { ...startSpeechSession(app.phone.speech, answer, text => { if (speech.current === session && owner() === account) { latest = text; setAnswer(text); } }),
      save: () => updateState(s => ({ ...s, answers: { ...s.answers, [id]: latest } }), account) };
    speech.current = session;
    void session.done.catch(e => { if (speech.current === session && owner() === account) fail(e); }).finally(() => {
      if (speech.current === session) { session.save(); speech.current = null; setListening(false); setFinishing(false); }
    });
  };
  const stopRecording = () => { const session = speech.current; if (!session) return; setListening(false); setFinishing(true); session.save(); session.stop(); };
  return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
    <AiPrivacy />
    <View style={styles.spread}><Section c={c} title="把答案说出来" note={`${profile.role} · ${pool.length} 道核心问题`} /><IconAction label="分享这道练习" onPress={() => share({ question: question.id }, question.title)}><Share2 size={20} color={c.text} /></IconAction></View>
    <View style={{ backgroundColor: c.hero, borderRadius: 10, padding: 12, gap: 8 }}><View style={styles.spread}><Text style={{ color: c.heroText, fontWeight: '700', fontSize: 13 }}>{question.tag}</Text><Text style={{ color: c.heroText, fontSize: 13 }}>{index + 1} / {pool.length}</Text></View><Text style={[styles.title, { color: c.heroText }]}>{question.title}</Text><View style={styles.spread}><Pressable accessibilityRole="button" onPress={() => started ? setStarted(null) : (setSeconds(0), setStarted(Date.now()))} style={({ pressed }) => ({ minHeight: 44, paddingVertical: 10, opacity: pressed ? .6 : 1 })}><Text style={{ color: c.heroText, fontWeight: '700' }}>{started ? `计时 ${seconds} 秒 · 停止` : seconds ? `用了 ${seconds} 秒 · 再练一次` : '开始计时 · 建议 60–90 秒'}</Text></Pressable><IconAction label="下一题" onPress={next}><ArrowRight size={22} color={c.heroText} /></IconAction></View></View>
    <Action label={hint ? '收起回答思路' : '卡住了？看看回答思路'} subtle icon={<Lightbulb size={18} color={c.text} />} onPress={() => setHint(v => !v)} />
    {hint ? <Card><Text style={[styles.body, { color: c.muted }]}>{question.intent}</Text>{question.outline.map((line, i) => <Text key={line} style={[styles.body, { color: c.text }]}>{i + 1}. {line}</Text>)}<Text style={[styles.small, { color: c.orange }]}>{question.avoid}</Text></Card> : null}
    <View style={styles.spread}><Text style={[styles.heading, { color: c.text }]}>你的回答</Text><Text style={[styles.small, { color: c.muted }]}>本机自动保存</Text></View><TextInput value={answer} onChangeText={setAnswer} multiline maxLength={8000} editable={!listening && !finishing} placeholder="先按自己的方式说。真实经历比漂亮话更重要。" placeholderTextColor={c.muted} style={[fieldStyle(c), { minHeight: 140 }]} />
    <View style={styles.row}><Action label={finishing ? '正在整理…' : listening ? '结束录入' : '开始录入'} subtle={!listening} busy={finishing} icon={listening ? <Square size={18} color={c.onPrimary} /> : <Mic size={18} color={c.text} />} onPress={() => speech.current ? stopRecording() : record()} style={{ flex: 1 }} /><Action label="请教练点评" busy={ai.busy} disabled={!answer.trim() || listening || finishing} icon={<Sparkles size={17} color={c.onPrimary} />} style={{ flex: 1 }} onPress={() => { Keyboard.dismiss(); void ai.run('参考资料中的要点，核对用户回答的具体内容；指出技术或口径错误，但不要捏造用户经历。针对回答，依次给出：讲得好的地方、最值得补充的两点、一版精简表达、面试官可能追问的一道题。总计不超过 650 字。', JSON.stringify({ profile: aiProfile(profile), question: question.title, referencePoints: question.outline, commonMistakes: question.avoid, answer })); }} /></View><AiResult ai={ai} c={c} />
    <View style={styles.row}><Action label="复制回答" disabled={!answer.trim()} subtle onPress={() => copy(answer)} style={{ flex: 1 }} /><Action label="换一道题" subtle onPress={next} style={{ flex: 1 }} /></View>
  </ScrollView>;
});
function IntroEditor({ profile, active }: { profile: Profile; active: boolean }) {
  const c = usePalette(), state = useCareer(), ai = useAi(active), account = useRef(owner()).current;
  const [text, setText] = useState(() => state.intro || draftIntro(profile));
  const save = (value: string) => { setText(value); updateState(s => ({ ...s, intro: value }), account); };
  return <BottomSheetScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}><AiPrivacy /><Section c={c} title="一分钟自我介绍" note="先有一版，再练自然。括号里的内容需要你自己补齐。" />
    <BottomSheetTextInput value={text} accessibilityLabel="自我介绍正文" onChangeText={save} maxLength={8000} multiline style={[fieldStyle(c), { minHeight: 220 }]} />
    <View style={styles.row}><Action label="复制这版" subtle icon={<Copy size={18} color={c.text} />} onPress={() => { save(text); copy(text); }} style={{ flex: 1 }} /><Action label="AI 打磨" busy={ai.busy} disabled={!text.trim()} icon={<Sparkles size={18} color={c.onPrimary} />} style={{ flex: 1 }} onPress={() => { Keyboard.dismiss(); save(text); void ai.run('改写成适合口头表达的 60 秒自我介绍，180–260 个汉字。保留真实信息；缺失内容用［待补充］。只输出介绍正文。', JSON.stringify({ profile: aiProfile(profile), current: text })); }} /></View><AiResult ai={ai} c={c} />
    {ai.output && !ai.busy && !ai.error ? <Action label="采用并保存这版" onPress={() => { save(ai.output); app.toast.show('已保存，可以开始计时练习', 'success'); }} /> : null}<Action label="按当前经历重新起草" subtle onPress={() => save(draftIntro(profile))} />
  </BottomSheetScrollView>;
}
export default function CareerRescue() {
  const c = usePalette(), state = useCareer(), account = owner(), previousAccount = useRef(account), focused = useIsFocused();
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  useEffect(() => { const listener = AppState.addEventListener('change', value => setForeground(value === 'active')); return () => listener.remove(); }, []);
  const visible = focused && foreground;
  const profile = useMemo(() => state.profile, [JSON.stringify(state.profile)]), checked = useMemo(() => state.checked, [JSON.stringify(state.checked)]), saved = useMemo(() => state.saved, [JSON.stringify(state.saved)]);
  const [practiceMode, setPracticeMode] = useState<'prepare' | 'interview' | 'single'>('interview');
  const [tab, setTab] = useState(0), [width, setWidth] = useState(0), [sheet, setSheet] = useState<'profile' | 'intro' | 'quick' | 'history' | null>(null), [practice, setPractice] = useState<{ id?: string; question?: Question; at: number }>({ at: 0 });
  const [libraryRequest, setLibraryRequest] = useState<{ id?: string; topic?: string; at: number }>({ at: 0 });
  const [jobRequest, setJobRequest] = useState<{ job?: Job; id?: string; at: number }>({ at: 0 });
  const pager = useRef<PagerView>(null), modal = useRef<BottomSheetModal>(null), position = useRef(new Animated.Value(0)).current, offset = useRef(new Animated.Value(0)).current;
  const visit = useCallback((next: number) => { Keyboard.dismiss(); setTab(next); pager.current?.setPage(next); }, []);
  const openProfile = useCallback(() => { setSheet('profile'); modal.current?.present(); }, []);
  const openIntro = useCallback(() => { setSheet('intro'); modal.current?.present(); }, []);
  const openResource = useCallback((id: string) => { if (id === 'history') { setSheet('history'); modal.current?.present(); return; } setLibraryRequest({ id, at: Date.now() }); visit(3); }, [visit]);
  const openQuick = useCallback(() => { setSheet('quick'); modal.current?.present(); }, []);
  const openInterview = useCallback(() => { setPracticeMode('interview'); visit(1); }, [visit]);
  const openPractice = useCallback((id?: string) => { setPracticeMode('single'); setPractice({ id, at: Date.now() }); visit(1); }, [visit]);
  const practiceMaterial = useCallback((question: Question) => { setPracticeMode('single'); setPractice({ id: question.id, question, at: Date.now() }); visit(1); }, [visit]);
  const openTopic = useCallback((topic: string) => { setLibraryRequest({ topic, at: Date.now() }); visit(3); }, [visit]);
  const trackJob = useCallback((job: Job) => { setJobRequest({ job, at: Date.now() }); visit(2); }, [visit]);
  const trackMaterial = useCallback((item: Material) => { const job = blankJob(item.company || '', item.title); job.url = item.applicationUrl || item.sources[0]?.url || ''; job.nextAt = item.deadlineAt ? Date.parse(item.deadlineAt) : null; job.nextStep = item.deadlineAt ? '投递截止' : ''; trackJob(job); }, [trackJob]);
  const openPrepare = useCallback(() => { setPracticeMode('prepare'); visit(1); }, [visit]);
  useEffect(() => { if (visible) void refreshMaterials(); }, [visible]);
  useEffect(() => app.phone.onNotification(event => {
    if (event.params.account !== account || owner() !== account) return;
    if (event.action === 'open' && typeof event.params.job === 'string' && getWorkspace().jobs.some(j => j.id === event.params.job)) { setJobRequest({ id: event.params.job, at: Date.now() }); visit(2); }
    void app.phone.acknowledgeNotification(event.token);
  }), [account, visit]);
  useEffect(() => { if (previousAccount.current !== account) { previousAccount.current = account; modal.current?.dismiss(); setSheet(null); } }, [account]);
  useEffect(() => {
    const receive = (params?: ShareParams) => { if (typeof params?.material === 'string' || typeof params?.resource === 'string') { openResource(String(params.material || params.resource)); } else if (typeof params?.question === 'string') { if (params.question.startsWith('material-')) { openResource(params.question.slice(9)); return; } const q = questions.find(q => q.id === params.question); if (q) { if (q.role !== '通用') updateState(s => ({ ...s, profile: { ...s.profile, role: q.role } })); openPractice(q.id); } } };
    const off = app.sharing.subscribe(receive); receive(app.sharing.getParams()); return off;
  }, [visit, openResource, openPractice]);
  const indicator = Animated.add(position, offset).interpolate({ inputRange: [0, 3], outputRange: [0, width * 3 / 4] });
  return <BottomSheetModalProvider><SafeAreaView edges={['top', 'bottom']} style={[styles.root, { backgroundColor: c.bg }]}>
    <View style={[styles.spread, { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 4 }]}><View style={[styles.row, { flex: 1 }]}><View style={{ width: 39, height: 39, backgroundColor: c.primary, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}><BriefcaseBusiness size={22} color={c.onPrimary} /></View><View style={{ flex: 1 }}><Text style={{ color: c.text, fontWeight: '800', fontSize: 18 }}>求职急救站</Text><Text style={{ color: c.muted, fontSize: 12, marginTop: 2 }}>生花官方 · 对齐岗位，准备答案，跟进机会</Text></View></View><IconAction label="分享求职急救站" onPress={() => share()}><Share2 size={21} color={c.text} /></IconAction></View>
    <View onLayout={e => setWidth(e.nativeEvent.layout.width)} style={{ marginHorizontal: 16, borderBottomWidth: 1, borderBottomColor: c.line }}><View style={{ flexDirection: 'row' }}>{tabs.map((title, i) => <Pressable key={title} accessibilityRole="tab" accessibilityState={{ selected: tab === i }} onPress={() => visit(i)} style={({ pressed }) => ({ flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', opacity: pressed ? .6 : 1 })}><Text style={{ color: tab === i ? c.primary : c.muted, fontSize: 15, fontWeight: tab === i ? '800' : '500' }}>{title}</Text></Pressable>)}</View><Animated.View style={{ width: width / 4, height: 3, borderRadius: 2, backgroundColor: c.primary, transform: [{ translateX: indicator }] }} /></View>
    <AnimatedPager ref={pager} initialPage={0} style={{ flex: 1 }} offscreenPageLimit={2} onPageSelected={e => setTab(e.nativeEvent.position)} onPageScroll={Animated.event([{ nativeEvent: { position, offset } }], { useNativeDriver: false })}>
      <View key="resume" collapsable={false} style={{ flex: 1 }}><Resume key={account} active={tab === 0 && visible} onProfile={openProfile} onTrack={trackJob} onPractice={practiceMaterial} onTopic={openTopic} /></View>
      <View key="practice" collapsable={false} style={{ flex: 1 }}><View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 14, paddingTop: 8 }}><Action label="准备重点" subtle={practiceMode !== 'prepare'} onPress={() => setPracticeMode('prepare')} style={{ flex: 1 }} /><Action label="整轮陪练" subtle={practiceMode !== 'interview'} onPress={() => setPracticeMode('interview')} style={{ flex: 1 }} /><Action label="单题" subtle={practiceMode !== 'single'} onPress={() => setPracticeMode('single')} style={{ flex: 1 }} /></View>
        <View style={{ flex: 1, display: practiceMode === 'prepare' ? 'flex' : 'none' }}><Prepare profile={profile} checked={checked} active={tab === 1 && visible && practiceMode === 'prepare'} onProfile={openProfile} onPractice={openPractice} onInterview={openInterview} onQuick={openQuick} onIntro={openIntro} onResource={openResource} /></View>
        <View style={{ flex: 1, display: practiceMode === 'interview' ? 'flex' : 'none' }}><Interview key={account} active={tab === 1 && visible && practiceMode === 'interview'} onProfile={openProfile} onIntro={openIntro} onPrepare={openPrepare} /></View><View style={{ flex: 1, display: practiceMode === 'single' ? 'flex' : 'none' }}><Practice key={account} profile={profile} active={tab === 1 && visible && practiceMode === 'single'} requested={practice} /></View>
      </View>
      <View key="jobs" collapsable={false} style={{ flex: 1 }}><Jobs key={account} active={tab === 2 && visible} request={jobRequest} onInterview={openPrepare} onTopic={openTopic} /></View>
      <View key="resources" collapsable={false} style={{ flex: 1 }}><Library profile={profile} active={tab === 3 && visible} saved={saved} onPractice={practiceMaterial} onTrack={trackMaterial} requested={libraryRequest} /></View>
    </AnimatedPager>
    <BottomSheetModal ref={modal} snapPoints={snapPoints} enableDynamicSizing={false} enablePanDownToClose backdropComponent={backdrop} keyboardBehavior="interactive" keyboardBlurBehavior="restore" android_keyboardInputMode="adjustResize" backgroundStyle={{ backgroundColor: c.surface }} handleIndicatorStyle={{ backgroundColor: c.muted }} onDismiss={() => { setSheet(null); Keyboard.dismiss(); }}>
      {sheet === 'quick' ? <QuickCard key={account} /> : sheet === 'history' ? <BottomSheetScrollView contentContainerStyle={styles.content}><Section title="我的面试复盘" c={c} />{state.history.map(h => <Card key={h.id}><Text style={[styles.heading, { color: c.text }]}>{roleName(h.profile)} · {new Date(h.createdAt).toLocaleDateString()}</Text><Text style={[styles.body, { color: c.muted }]}>{h.report?.priorities[0]?.issue}</Text><Action label="打开这份复盘" subtle onPress={() => { const open = () => { updateState(s => ({ ...s, session: h }), account); modal.current?.dismiss(); openInterview(); }; if (state.session && !state.session.report && state.session.id !== h.id) Alert.alert('打开这份复盘？', '当前未完成的陪练将被替换。', [{ text: '取消', style: 'cancel' }, { text: '打开复盘', onPress: open }]); else open(); }} /></Card>)}</BottomSheetScrollView> : sheet === 'profile' ? <ProfileEditor key={account} profile={profile} c={c} onSave={profile => { updateState(s => ({ ...s, profile }), account); modal.current?.dismiss(); app.toast.show('准备方向已更新', 'success'); }} /> : sheet === 'intro' ? <IntroEditor key={account} profile={profile} active={visible} /> : <View style={{ minHeight: 1 }} />}
    </BottomSheetModal>
  </SafeAreaView></BottomSheetModalProvider>;
}
