import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, ActivityIndicator, Animated, Keyboard, Linking, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PagerView from 'react-native-pager-view';
import { useIsFocused } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import { BottomSheetModal, BottomSheetModalProvider, BottomSheetBackdrop, BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { ArrowDownToLine, ArrowRight, Bookmark, BriefcaseBusiness, Check, ChevronRight, Copy, FileText, Lightbulb, Mic, Settings2, Share2, Sparkles, Square } from 'lucide-react-native';
import type { ShareParams } from '@zijinhua/app-sdk';
import { checklist, questions, resources, roles, type Resource } from './content';
import { app, data, owner, copy, draftIntro, toggleCheck, updateState, useCareer, type Profile } from './model';
import { Action, Card, IconAction, styles, usePalette, type Palette } from './ui';
import { holdSpeech, type HeldSpeechSession } from './hold-speech';

const AnimatedPager = Animated.createAnimatedComponent(PagerView);
const tabs = ['今晚准备', '面试练习', '资料袋'];
const backdrop = (p: React.ComponentProps<typeof BottomSheetBackdrop>) => <BottomSheetBackdrop {...p} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior="close" />;
const snapPoints = ['85%'];
const resourceKey = (item: Resource) => item.id;
const taskKey = (item: typeof checklist[number]) => item.id;
const fail = (error: unknown) => app.toast.show(error instanceof Error ? error.message : '操作未完成，请重试', 'error');
const share = (params?: ShareParams, title = '求职急救站') => { void app.sharing.open({ title, description: '面试前一晚，把准备变成可以完成的行动。', params }).catch(fail); };
const fieldStyle = (c: Palette) => [styles.field, { color: c.text, backgroundColor: c.field, borderColor: c.line }];
const Section = ({ title, note, c }: { title: string; note?: string; c: Palette }) => <View style={{ flexShrink: 1, gap: 4 }}><Text style={[styles.heading, { color: c.text }]}>{title}</Text>{note ? <Text style={[styles.small, { color: c.muted }]}>{note}</Text> : null}</View>;

function useAi(active = true) {
  const [busy, setBusy] = useState(false), [output, setOutput] = useState(''), [error, setError] = useState('');
  const request = useRef<AbortController | null>(null);
  const cancel = useCallback(() => { request.current?.abort(); request.current = null; setBusy(false); }, []);
  useEffect(() => { if (!active) cancel(); return cancel; }, [active, cancel]);
  useEffect(() => app.auth.subscribe(() => { cancel(); setOutput(''); setError(''); }), [cancel]);
  const run = useCallback(async (instruction: string, input: string) => {
    if (request.current) return;
    const controller = new AbortController(), account = owner(); request.current = controller;
    setBusy(true); setError(''); setOutput('');
    try {
      const result = await app.ai.stream({ messages: [
        { role: 'system', content: '你是务实、友善的应届生求职教练。只依据用户提供的真实信息，不捏造学校、经历、数字、公司情况或招聘结果。缺失信息用明确占位符或标为待确认。给可以实际执行的建议，不打虚假的分数，不保证录用。用简洁中文、小标题与短段落，不使用表格。' + instruction },
        { role: 'user', content: input },
      ], temperature: .5, maxTokens: 1600 }, { signal: controller.signal, onText: text => { if (!controller.signal.aborted && account === owner()) setOutput(text); } });
      if (controller.signal.aborted || account !== owner()) return;
      if (!result.ok) { setError(result.error); if (result.code === 'NOT_CONFIGURED') app.ai.openSettings(); } else setOutput(result.text);
    } catch (e) { if (!controller.signal.aborted && account === owner()) setError(e instanceof Error ? e.message : '生成失败'); }
    finally { if (request.current === controller) { request.current = null; setBusy(false); } }
  }, []);
  const clear = useCallback(() => { cancel(); setOutput(''); setError(''); }, [cancel]);
  return { busy, output, error, run, cancel, clear };
}
function AiResult({ ai, c }: { ai: ReturnType<typeof useAi>; c: Palette }) {
  if (!ai.busy && !ai.output && !ai.error) return null;
  return <Card><View style={styles.spread}><View style={styles.row}><Sparkles size={18} color={c.primary} /><Text style={[styles.heading, { color: c.text }]}>教练建议</Text></View>{ai.busy ? <IconAction label="停止生成" onPress={ai.cancel}><Square size={17} color={c.text} /></IconAction> : ai.output ? <IconAction label="复制建议" onPress={() => copy(ai.output)}><Copy size={19} color={c.text} /></IconAction> : null}</View>
    {ai.busy && !ai.output ? <View style={styles.row}><ActivityIndicator color={c.primary} /><Text style={[styles.small, { color: c.muted }]}>正在整理，可以随时停止</Text></View> : null}
    {ai.output ? <Text selectable style={[styles.body, { color: c.text }]}>{ai.output}</Text> : null}
    {ai.error ? <Text style={[styles.body, { color: c.orange }]}>{ai.error}。输入已保留，可再次尝试。</Text> : null}
  </Card>;
}
function ProfileEditor({ profile, onSave, c }: { profile: Profile; onSave: (p: Profile) => void; c: Palette }) {
  const [draft, setDraft] = useState(profile);
  const field = (key: keyof Profile, label: string, placeholder: string, limit: number, multiline = false) => <View><Text style={[styles.label, { color: c.text }]}>{label}</Text><BottomSheetTextInput style={[fieldStyle(c), multiline && { minHeight: 112 }]} placeholder={placeholder} placeholderTextColor={c.muted} multiline={multiline} maxLength={limit} value={draft[key]} onChangeText={text => setDraft(p => ({ ...p, [key]: text }))} /></View>;
  return <BottomSheetScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
    <Section c={c} title="这次面试" note="写到哪算哪，随时可以补充。内容保存在当前账号本机。" />
    <Text style={[styles.label, { color: c.text }]}>目标方向</Text><View style={styles.chips}>{roles.map(role => <Pressable accessibilityRole="button" accessibilityState={{ selected: draft.role === role }} key={role} onPress={() => setDraft(p => ({ ...p, role }))} style={({ pressed }) => [styles.chip, { backgroundColor: draft.role === role ? c.primary : c.field, borderColor: draft.role === role ? c.primary : c.line, opacity: pressed ? .7 : 1 }]}><Text style={{ color: draft.role === role ? c.onPrimary : c.text }}>{role}</Text></Pressable>)}</View>
    {field('name', '怎么称呼你', '姓名或昵称，可不填', 40)}{field('background', '当前背景', '例如：应届生 / 计算机专业', 300)}
    {field('experience', '一段真实经历', '课程项目、实习、社团或个人作品。写清你做了什么、实际结果是什么。', 4000, true)}
    {field('jd', '岗位描述（可选）', '粘贴职位要求，AI 会据此判断匹配点和准备重点。', 6000, true)}
    <Action label="保存，开始准备" icon={<Check size={18} color={c.onPrimary} />} onPress={() => { Keyboard.dismiss(); onSave(draft); }} />
  </BottomSheetScrollView>;
}
const Prepare = memo(function Prepare({ profile, checked, active, onProfile, onPractice, onIntro, onResource }: { profile: Profile; checked: string[]; active: boolean; onProfile: () => void; onPractice: (id?: string) => void; onIntro: () => void; onResource: (id: string) => void }) {
  const c = usePalette(), ai = useAi(active);
  const renderTask = useCallback(({ item, index }: { item: typeof checklist[number]; index: number }) => <View style={[styles.row, { paddingVertical: 11, borderBottomWidth: 1, borderColor: c.line }]}>
    <Pressable accessibilityRole="checkbox" accessibilityLabel={`完成：${item.title}`} accessibilityState={{ checked: checked.includes(item.id) }} onPress={() => toggleCheck(item.id)} style={({ pressed }) => ({ width: 48, height: 48, borderRadius: 15, backgroundColor: checked.includes(item.id) ? c.primary : c.field, alignItems: 'center', justifyContent: 'center', opacity: pressed ? .7 : 1 })}>{checked.includes(item.id) ? <Check size={22} color={c.onPrimary} /> : <Text style={{ fontSize: 16, color: c.muted, fontWeight: '700' }}>0{index + 1}</Text>}</Pressable>
    <Pressable accessibilityRole="button" onPress={() => { if (item.action === 'profile') onProfile(); else if (item.action === 'intro') onIntro(); else if (item.action === 'logistics') onResource('day-before'); else onPractice(item.action === 'practice' ? undefined : item.action); }} style={({ pressed }) => ({ flex: 1, gap: 3, paddingVertical: 5, opacity: pressed ? .65 : 1 })}><Text style={[styles.heading, { color: c.text }]}>{item.title}</Text><Text style={[styles.small, { color: c.muted }]}>{item.detail}</Text></Pressable><ChevronRight size={18} color={c.muted} />
  </View>, [checked, c, onProfile, onPractice, onIntro, onResource]);
  return <FlashList data={checklist} keyExtractor={taskKey} renderItem={renderTask} contentContainerStyle={{ padding: 20, paddingBottom: 32 }} extraData={checked} ListHeaderComponent={<View style={{ gap: 20, paddingBottom: 12 }}>
    <View style={{ backgroundColor: c.hero, borderRadius: 24, padding: 22, gap: 15 }}><View style={styles.spread}><Text style={{ color: c.heroText, fontSize: 12, fontWeight: '800', letterSpacing: 2 }}>INTERVIEW FIRST AID</Text><BriefcaseBusiness size={23} color={c.heroText} /></View><Text style={{ color: c.heroText, fontSize: 31, fontWeight: '800', lineHeight: 39, letterSpacing: -1 }}>明天面试，{'\n'}今晚准备好。</Text><Text style={[styles.body, { color: c.heroText }]}>不用一次变完美。把最重要的几件事，一件一件准备好。</Text><Action label="先练一分钟自我介绍" onPress={() => onPractice('intro')} icon={<ArrowRight size={18} color={c.onPrimary} />} /></View>
    <View style={styles.spread}><Section c={c} title={profile.role} note="这次面试的方向" /><Action label="调整" subtle icon={<Settings2 size={16} color={c.text} />} onPress={onProfile} /></View>
    <View style={styles.row}><Action label="写自我介绍" subtle onPress={onIntro} style={{ flex: 1 }} /><Action label="AI 定制准备" busy={ai.busy} onPress={() => { if (!profile.jd.trim() && !profile.experience.trim()) { onProfile(); app.toast.show('补充岗位描述或经历，教练才能给出具体建议'); return; } void ai.run('根据岗位与经历，给出：三个准备重点、三道最相关的面试题、一个今晚就能补齐的短板。总计不超过 650 字。', JSON.stringify(profile)); }} style={{ flex: 1 }} /></View><AiResult ai={ai} c={c} />
    <View style={styles.spread}><Section c={c} title={checked.length === checklist.length ? '准备好了，带着底气出发' : '今晚的准备清单'} note="点内容开始准备，点左侧标记完成。" /><Text style={{ color: c.primary, fontWeight: '800', fontSize: 17 }}>{checked.length}/{checklist.length}</Text></View><View style={{ height: 5, borderRadius: 4, backgroundColor: c.line, overflow: 'hidden' }}><View style={{ width: `${checked.length / checklist.length * 100}%`, height: 5, backgroundColor: c.primary }} /></View>
  </View>} />;
});
const Practice = memo(function Practice({ profile, active, requested }: { profile: Profile; active: boolean; requested: { id?: string; at: number } }) {
  const c = usePalette(), state = useCareer(), ai = useAi(active);
  const pool = useMemo(() => questions.filter(q => q.role === '通用' || q.role === profile.role), [profile.role]);
  const [index, setIndex] = useState(0), [hint, setHint] = useState(false), [answer, setAnswer] = useState(''), [listening, setListening] = useState(false), [started, setStarted] = useState<number | null>(null), [seconds, setSeconds] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const question = pool[index % pool.length], speech = useRef<(HeldSpeechSession & { save: () => void }) | null>(null);
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
    const session: HeldSpeechSession & { save: () => void } = { ...holdSpeech(app.phone.speech, answer, text => { if (speech.current === session && owner() === account) { latest = text; setAnswer(text); } }),
      save: () => updateState(s => ({ ...s, answers: { ...s.answers, [id]: latest } }), account) };
    speech.current = session;
    void session.done.catch(e => { if (speech.current === session && owner() === account) fail(e); }).finally(() => {
      if (speech.current === session) { session.save(); speech.current = null; setListening(false); setFinishing(false); }
    });
  };
  const releaseRecording = () => { const session = speech.current; if (!session) return; setListening(false); setFinishing(true); session.save(); session.release(); };
  return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
    <View style={styles.spread}><Section c={c} title="把答案说出来" note={`${profile.role} · ${pool.length} 道核心问题`} /><IconAction label="分享这道练习" onPress={() => share({ question: question.id }, question.title)}><Share2 size={20} color={c.text} /></IconAction></View>
    <View style={{ backgroundColor: c.hero, borderRadius: 23, padding: 22, gap: 15 }}><View style={styles.spread}><Text style={{ color: c.heroText, fontWeight: '700', fontSize: 13 }}>{question.tag}</Text><Text style={{ color: c.heroText, fontSize: 13 }}>{index + 1} / {pool.length}</Text></View><Text style={[styles.title, { color: c.heroText }]}>{question.title}</Text><View style={styles.spread}><Pressable accessibilityRole="button" onPress={() => started ? setStarted(null) : (setSeconds(0), setStarted(Date.now()))} style={({ pressed }) => ({ minHeight: 44, paddingVertical: 10, opacity: pressed ? .6 : 1 })}><Text style={{ color: c.heroText, fontWeight: '700' }}>{started ? `计时 ${seconds} 秒 · 停止` : seconds ? `用了 ${seconds} 秒 · 再练一次` : '开始计时 · 建议 60–90 秒'}</Text></Pressable><IconAction label="下一题" onPress={next}><ArrowRight size={22} color={c.heroText} /></IconAction></View></View>
    <Action label={hint ? '收起回答思路' : '卡住了？看看回答思路'} subtle icon={<Lightbulb size={18} color={c.text} />} onPress={() => setHint(v => !v)} />
    {hint ? <Card><Text style={[styles.body, { color: c.muted }]}>{question.intent}</Text>{question.outline.map((line, i) => <Text key={line} style={[styles.body, { color: c.text }]}>{i + 1}. {line}</Text>)}<Text style={[styles.small, { color: c.orange }]}>{question.avoid}</Text></Card> : null}
    <View style={styles.spread}><Text style={[styles.heading, { color: c.text }]}>你的回答</Text><Text style={[styles.small, { color: c.muted }]}>本机自动保存</Text></View><TextInput value={answer} onChangeText={setAnswer} multiline maxLength={8000} editable={!listening && !finishing} placeholder="先按自己的方式说。真实经历比漂亮话更重要。" placeholderTextColor={c.muted} style={[fieldStyle(c), { minHeight: 140 }]} />
    <View style={styles.row}><Pressable accessibilityRole="button" accessibilityLabel={listening ? '正在录入，松开结束' : finishing ? '正在整理语音' : '按住说话，松开结束'} accessibilityState={{ disabled: finishing, busy: finishing }} disabled={finishing} onPressIn={record} onPressOut={releaseRecording} style={({ pressed }) => [styles.action, { flex: 1, backgroundColor: listening ? c.primary : c.field, opacity: finishing ? .6 : pressed ? .8 : 1 }]}>{finishing ? <ActivityIndicator size="small" color={c.text} /> : <Mic size={18} color={listening ? c.onPrimary : c.text} />}<Text style={{ color: listening ? c.onPrimary : c.text, fontSize: 15, fontWeight: '700', flexShrink: 1, textAlign: 'center' }}>{finishing ? '正在整理…' : listening ? '松开结束' : '按住说话'}</Text></Pressable><Action label="请教练点评" busy={ai.busy} disabled={!answer.trim() || listening || finishing} icon={<Sparkles size={17} color={c.onPrimary} />} style={{ flex: 1 }} onPress={() => { Keyboard.dismiss(); void ai.run('针对回答，依次给出：讲得好的地方、最值得补充的两点、一版精简表达、面试官可能追问的一道题。总计不超过 650 字。', JSON.stringify({ profile, question: question.title, answer })); }} /></View><AiResult ai={ai} c={c} />
    <View style={styles.row}><Action label="复制回答" disabled={!answer.trim()} subtle onPress={() => copy(answer)} style={{ flex: 1 }} /><Action label="换一道题" subtle onPress={next} style={{ flex: 1 }} /></View>
  </ScrollView>;
});
function IntroEditor({ profile, active }: { profile: Profile; active: boolean }) {
  const c = usePalette(), state = useCareer(), ai = useAi(active), account = useRef(owner()).current;
  const [text, setText] = useState(() => state.intro || draftIntro(profile));
  const save = (value: string) => { setText(value); updateState(s => ({ ...s, intro: value }), account); };
  return <BottomSheetScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}><Section c={c} title="一分钟自我介绍" note="先有一版，再练自然。括号里的内容需要你自己补齐。" />
    <BottomSheetTextInput value={text} onChangeText={setText} onBlur={() => updateState(s => ({ ...s, intro: text }), account)} maxLength={8000} multiline style={[fieldStyle(c), { minHeight: 220 }]} />
    <View style={styles.row}><Action label="复制这版" subtle icon={<Copy size={18} color={c.text} />} onPress={() => { save(text); copy(text); }} style={{ flex: 1 }} /><Action label="AI 打磨" busy={ai.busy} disabled={!text.trim()} icon={<Sparkles size={18} color={c.onPrimary} />} style={{ flex: 1 }} onPress={() => { Keyboard.dismiss(); save(text); void ai.run('改写成适合口头表达的 60 秒自我介绍，180–260 个汉字。保留真实信息；缺失内容用［待补充］。只输出介绍正文。', JSON.stringify({ profile, current: text })); }} /></View><AiResult ai={ai} c={c} />
    {ai.output && !ai.busy && !ai.error ? <Action label="采用并保存这版" onPress={() => { save(ai.output); app.toast.show('已保存，可以开始计时练习', 'success'); }} /> : null}<Action label="按当前经历重新起草" subtle onPress={() => save(draftIntro(profile))} />
  </BottomSheetScrollView>;
}
const ResourceRow = memo(function ResourceRow({ item, saved, onOpen }: { item: Resource; saved: boolean; onOpen: (id: string) => void }) {
  const c = usePalette();
  return <Pressable accessibilityRole="button" onPress={() => onOpen(item.id)} style={({ pressed }) => ({ marginBottom: 12, opacity: pressed ? .7 : 1 })}><Card><View style={styles.row}><View style={{ width: 45, height: 50, backgroundColor: c.wash, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}><FileText size={23} color={c.primary} /></View><View style={{ flex: 1, gap: 4 }}><Text style={[styles.heading, { color: c.text }]}>{item.title}</Text><Text style={[styles.small, { color: c.muted }]}>{item.subtitle}</Text></View>{saved ? <Bookmark size={18} color={c.primary} fill={c.primary} /> : <ArrowRight size={18} color={c.muted} />}</View><View style={styles.spread}><Text style={[styles.small, { color: c.primary }]}>{item.category}</Text><Text style={[styles.small, { color: c.muted }]}>{item.url ? '官方外部入口' : '可复制 · 可导出'}</Text></View></Card></Pressable>;
});
function ResourceDetail({ item, saved, c }: { item: Resource; saved: boolean; c: Palette }) {
  const [exporting, setExporting] = useState(false);
  const download = async () => { if (exporting) return; const account = owner(), path = `resources/${item.id}.txt`; setExporting(true);
    try { await data.files.writeText(path, item.title + '\n\n' + item.text + (item.url ? '\n\n' + item.url : '') + '\n\n生花官方 · 求职急救站'); if (owner() !== account) return; const result = await data.files.exportFile(path, { name: item.title + '.txt', mime: 'text/plain' }); if (!result.ok && result.code !== 'CANCELLED') throw new Error(result.error); }
    catch (e) { if (owner() === account) fail(e); } finally { setExporting(false); }
  };
  return <BottomSheetScrollView contentContainerStyle={styles.content}><View style={styles.spread}><Section c={c} title={item.title} note={item.category} /><IconAction label={saved ? '取消收藏' : '收藏资料'} selected={saved} onPress={() => updateState(s => ({ ...s, saved: s.saved.includes(item.id) ? s.saved.filter(id => id !== item.id) : [...s.saved, item.id] }))}><Bookmark size={22} color={c.primary} fill={saved ? c.primary : 'transparent'} /></IconAction></View><Text selectable style={[styles.body, { color: c.text }]}>{item.text}</Text>
    {item.url ? <Action label="打开官方站点" onPress={() => void Linking.openURL(item.url!).catch(fail)} /> : null}<View style={styles.row}><Action label="复制内容" subtle icon={<Copy size={18} color={c.text} />} onPress={() => copy(item.text + (item.url ? '\n' + item.url : ''))} style={{ flex: 1 }} /><Action label="导出文本" subtle busy={exporting} icon={<ArrowDownToLine size={18} color={c.text} />} onPress={() => void download()} style={{ flex: 1 }} /></View><Action label="把这份资料分享给朋友" icon={<Share2 size={18} color={c.onPrimary} />} onPress={() => share({ resource: item.id }, item.title)} />
  </BottomSheetScrollView>;
}
const ResourceBag = memo(function ResourceBag({ saved, onOpen }: { saved: string[]; onOpen: (id: string) => void }) {
  const c = usePalette(), [filter, setFilter] = useState('全部');
  const rows = useMemo(() => resources.filter(r => filter === '全部' ? true : filter === '收藏' ? saved.includes(r.id) : r.category === filter), [filter, saved]);
  const render = useCallback(({ item }: { item: Resource }) => <ResourceRow item={item} saved={saved.includes(item.id)} onOpen={onOpen} />, [saved, onOpen]);
  return <FlashList data={rows} renderItem={render} keyExtractor={resourceKey} contentContainerStyle={{ padding: 20, paddingBottom: 32 }} ListHeaderComponent={<View style={{ gap: 16, paddingBottom: 18 }}><Section title="有用的，装进资料袋" note="表达框架、可改的模板和官方求职入口。" c={c} /><View style={styles.chips}>{['全部', '表达', '模板', '求职入口', '收藏'].map(tag => <Pressable key={tag} accessibilityRole="button" accessibilityState={{ selected: filter === tag }} onPress={() => setFilter(tag)} style={({ pressed }) => [styles.chip, { backgroundColor: filter === tag ? c.primary : c.field, borderColor: filter === tag ? c.primary : c.line, opacity: pressed ? .7 : 1 }]}><Text style={{ color: filter === tag ? c.onPrimary : c.text, fontSize: 14 }}>{tag}</Text></Pressable>)}</View></View>} ListEmptyComponent={<View style={{ minHeight: 180, alignItems: 'center', justifyContent: 'center', gap: 9 }}><Bookmark size={30} color={c.muted} /><Text style={[styles.body, { color: c.muted }]}>打开一份资料，点右上角收藏。</Text></View>} />;
});
export default function CareerRescue() {
  const c = usePalette(), state = useCareer(), account = owner(), previousAccount = useRef(account), focused = useIsFocused();
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  useEffect(() => { const listener = AppState.addEventListener('change', value => setForeground(value === 'active')); return () => listener.remove(); }, []);
  const visible = focused && foreground;
  const profile = useMemo(() => state.profile, [JSON.stringify(state.profile)]), checked = useMemo(() => state.checked, [JSON.stringify(state.checked)]), saved = useMemo(() => state.saved, [JSON.stringify(state.saved)]);
  const [tab, setTab] = useState(0), [width, setWidth] = useState(0), [resourceId, setResourceId] = useState<string | null>(null), [sheet, setSheet] = useState<'profile' | 'intro' | 'resource' | null>(null), [practice, setPractice] = useState<{ id?: string; at: number }>({ at: 0 });
  const pager = useRef<PagerView>(null), modal = useRef<BottomSheetModal>(null), position = useRef(new Animated.Value(0)).current, offset = useRef(new Animated.Value(0)).current;
  const visit = useCallback((next: number) => { Keyboard.dismiss(); setTab(next); pager.current?.setPage(next); }, []);
  const openProfile = useCallback(() => { setSheet('profile'); modal.current?.present(); }, []);
  const openIntro = useCallback(() => { setSheet('intro'); modal.current?.present(); }, []);
  const openResource = useCallback((id: string) => { if (!resources.some(item => item.id === id)) return; setResourceId(id); setSheet('resource'); modal.current?.present(); }, []);
  const openPractice = useCallback((id?: string) => { setPractice({ id, at: Date.now() }); visit(1); }, [visit]);
  useEffect(() => { if (previousAccount.current !== account) { previousAccount.current = account; modal.current?.dismiss(); setSheet(null); } }, [account]);
  useEffect(() => {
    const receive = (params?: ShareParams) => { if (typeof params?.resource === 'string') { visit(2); openResource(params.resource); } else if (typeof params?.question === 'string') { const q = questions.find(q => q.id === params.question); if (q) { if (q.role !== '通用') updateState(s => ({ ...s, profile: { ...s.profile, role: q.role } })); openPractice(q.id); } } };
    const off = app.sharing.subscribe(receive); receive(app.sharing.getParams()); return off;
  }, [visit, openResource, openPractice]);
  const selected = resources.find(r => r.id === resourceId);
  const indicator = Animated.add(position, offset).interpolate({ inputRange: [0, 2], outputRange: [0, width * 2 / 3] });
  return <BottomSheetModalProvider><SafeAreaView edges={['top', 'bottom']} style={[styles.root, { backgroundColor: c.bg }]}>
    <View style={[styles.spread, { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 4 }]}><View style={[styles.row, { flex: 1 }]}><View style={{ width: 39, height: 39, backgroundColor: c.primary, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}><BriefcaseBusiness size={22} color={c.onPrimary} /></View><View style={{ flex: 1 }}><Text style={{ color: c.text, fontWeight: '800', fontSize: 18 }}>求职急救站</Text><Text style={{ color: c.muted, fontSize: 12, marginTop: 2 }}>生花官方 · 给第一次面试的你</Text></View></View><IconAction label="分享求职急救站" onPress={() => share()}><Share2 size={21} color={c.text} /></IconAction></View>
    <View onLayout={e => setWidth(e.nativeEvent.layout.width)} style={{ marginHorizontal: 16, borderBottomWidth: 1, borderBottomColor: c.line }}><View style={{ flexDirection: 'row' }}>{tabs.map((title, i) => <Pressable key={title} accessibilityRole="tab" accessibilityState={{ selected: tab === i }} onPress={() => visit(i)} style={({ pressed }) => ({ flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', opacity: pressed ? .6 : 1 })}><Text style={{ color: tab === i ? c.primary : c.muted, fontSize: 15, fontWeight: tab === i ? '800' : '500' }}>{title}</Text></Pressable>)}</View><Animated.View style={{ width: width / 3, height: 3, borderRadius: 2, backgroundColor: c.primary, transform: [{ translateX: indicator }] }} /></View>
    <AnimatedPager ref={pager} initialPage={0} style={{ flex: 1 }} offscreenPageLimit={2} onPageSelected={e => setTab(e.nativeEvent.position)} onPageScroll={Animated.event([{ nativeEvent: { position, offset } }], { useNativeDriver: false })}>
      <View key="prepare" collapsable={false}><Prepare profile={profile} checked={checked} active={tab === 0 && visible} onProfile={openProfile} onPractice={openPractice} onIntro={openIntro} onResource={openResource} /></View>
      <View key="practice" collapsable={false}><Practice key={account} profile={profile} active={tab === 1 && visible} requested={practice} /></View>
      <View key="resources" collapsable={false}><ResourceBag saved={saved} onOpen={openResource} /></View>
    </AnimatedPager>
    <BottomSheetModal ref={modal} snapPoints={snapPoints} enableDynamicSizing={false} enablePanDownToClose backdropComponent={backdrop} keyboardBehavior="interactive" keyboardBlurBehavior="restore" android_keyboardInputMode="adjustResize" backgroundStyle={{ backgroundColor: c.surface }} handleIndicatorStyle={{ backgroundColor: c.muted }} onDismiss={() => { setSheet(null); Keyboard.dismiss(); }}>
      {sheet === 'profile' ? <ProfileEditor key={account} profile={profile} c={c} onSave={profile => { updateState(s => ({ ...s, profile }), account); modal.current?.dismiss(); app.toast.show('准备方向已更新', 'success'); }} /> : sheet === 'intro' ? <IntroEditor key={account} profile={profile} active={visible} /> : sheet === 'resource' && selected ? <ResourceDetail key={selected.id + account} item={selected} saved={saved.includes(selected.id)} c={c} /> : <View style={{ minHeight: 1 }} />}
    </BottomSheetModal>
  </SafeAreaView></BottomSheetModalProvider>;
}
