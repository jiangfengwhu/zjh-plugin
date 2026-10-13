import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Keyboard, Pressable, Text, TextInput, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { History, Mic, Plus, Send, Square } from 'lucide-react-native';
import { app, copy, owner, readState, readTarget, uid, updateState, useField, useTarget } from './model';
import { matching, useCatalog } from './content-api';
import { useAi } from './use-ai';
import { startSpeechSession, type SpeechSession } from './speech-session';
import { Button, Card, Empty, ErrorText, IconButton, Markdown, Sheet, s, usePalette } from './ui';
import type { ChatMessage, ContentItem, Session } from './types';
const key = (item: ChatMessage) => item.id;
const bubbleType = (item: ChatMessage) => item.role;
const position = { startRenderingFromBottom: true, autoscrollToBottomThreshold: .1 };
const Bubble = memo(function Bubble({ item, streaming = false }: { item: ChatMessage; streaming?: boolean }) {
  const c = usePalette(), mine = item.role === 'user';
  return <View style={{ paddingHorizontal: 14, paddingVertical: 6, alignItems: mine ? 'flex-end' : 'stretch' }}><View style={{ maxWidth: '100%', padding: 12, borderRadius: 12, backgroundColor: mine ? c.wash : c.surface, borderWidth: 1, borderColor: c.line, gap: 6 }}><Text style={[s.small, { fontWeight: '700', color: mine ? c.accent : c.muted }]}>{mine ? '我的回答' : '面试官 · AI'}</Text>{mine ? <Text selectable style={[s.body, { color: c.text }]}>{item.text}</Text> : <Markdown text={item.text || '正在组织问题…'} streaming={streaming} />}{!mine && !streaming && item.text ? <Pressable accessibilityRole="button" onPress={() => copy(item.text)} style={{ alignSelf: 'flex-end', minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 }}><Text style={[s.small, { color: c.accent }]}>复制本轮内容</Text></Pressable> : null}</View></View>;
});
type VoiceRun = SpeechSession & { ending: boolean };
const Composer = memo(function Composer({ active, disabled, onSend, sessionId }: { active: boolean; disabled: boolean; onSend: (text: string) => boolean; sessionId: string }) {
  const c = usePalette(), [text, setText] = useState(''), [voice, setVoice] = useState<'idle' | 'starting' | 'listening' | 'processing'>('idle'), [voiceError, setVoiceError] = useState('');
  const current = useRef<VoiceRun | null>(null);
  useEffect(() => { setText(''); setVoiceError(''); }, [sessionId]);
  useEffect(() => {
    setVoice('idle');
    return () => { const run = current.current; current.current = null; run?.cancel(); };
  }, [active, disabled, sessionId]);
  const startVoice = () => {
    if (current.current || !active || disabled || text.length >= 6000) return;
    setVoice('starting'); setVoiceError(''); Keyboard.dismiss();
    const run: VoiceRun = { ...startSpeechSession(app.phone.speech, text, value => {
      if (current.current === run) setText(value);
    }, () => { if (current.current === run && !run.ending) setVoice('listening'); }), ending: false };
    current.current = run;
    void run.done.catch(error => {
      if (current.current === run) setVoiceError(error instanceof Error ? error.message : '语音录入失败，已保留输入内容。');
    }).finally(() => {
      if (current.current === run) { current.current = null; setVoice('idle'); }
    });
  };
  const finishVoice = () => {
    const run = current.current; if (!run || run.ending || voice !== 'listening') return;
    run.ending = true; setVoice('processing'); run.stop();
  };
  const recording = voice !== 'idle';
  return <View style={{ padding: 10, gap: 6, borderTopWidth: 1, borderColor: c.line, backgroundColor: c.surface }}>
    <Text accessibilityLiveRegion="polite" style={[s.small, { color: recording ? c.accent : c.muted }]}>{voice === 'starting' ? '正在准备麦克风…' : voice === 'listening' ? '正在听 · 点击停止按钮结束录入' : voice === 'processing' ? '正在确认识别文字…' : '点击麦克风开始，再点击结束；确认文字后发送'}</Text>
    <View style={[s.row, { alignItems: 'center' }]}><TextInput accessibilityLabel="本轮回答" value={text} onChangeText={setText} editable={!recording} multiline maxLength={6000} placeholder="输入或语音录入你的回答" placeholderTextColor={c.muted} style={[s.field, { flex: 1, minHeight: 44, maxHeight: 132, paddingHorizontal: 10, paddingTop: 10, paddingBottom: 10, includeFontPadding: false, color: c.text, backgroundColor: c.field, borderColor: c.line }]} /><IconButton label={voice === 'listening' ? '结束语音录入' : '开始语音录入'} selected={recording} busy={voice === 'starting' || voice === 'processing'} disabled={!active || disabled || !recording && text.length >= 6000} onPress={() => { if (current.current) void finishVoice(); else void startVoice(); }}>{voice === 'listening' ? <Square size={18} color={c.accent} /> : <Mic size={18} color={c.accent} />}</IconButton><Button label="发送" disabled={disabled || recording || !text.trim()} icon={<Send size={16} color={c.onAccent} />} onPress={() => { const answer = text.trim(); if (answer && onSend(answer)) setText(''); }} /></View>
    <ErrorText text={voiceError} />
  </View>;
});
const compact = (items: ContentItem[]) => items.map(i => ({ question: i.question, title: i.title, company: i.company, provenance: i.provenance, guide: i.body.slice(0, 1800), followups: i.followups }));
export const Interview = memo(function Interview({ active, onTarget, requested }: { active: boolean; onTarget: () => void; requested: ContentItem | null }) {
  const c = usePalette(), target = useTarget(), session = useField('session'), history = useField('history'), catalog = useCatalog(), ai = useAi(active), account = owner();
  const [historyOpen, setHistoryOpen] = useState(false), [error, setError] = useState(''), [starting, setStarting] = useState(false);
  const lock = useRef(false), lastRequested = useRef('');
  const pending: ChatMessage = useMemo(() => ({ id: 'stream', role: 'assistant', text: ai.output, at: 0 }), [ai.output]);
  const rows = useMemo(() => session ? ai.busy ? [...session.messages, pending] : session.messages : [], [session, ai.busy, pending]);
  const renderBubble = useCallback(({ item }: { item: ChatMessage }) => <Bubble item={item} streaming={item.id === 'stream'} />, []);
  const complete = useCallback((value: Session) => updateState(state => ({ ...state, session: value, ...(value.finished ? { history: [value, ...state.history.filter(s => s.id !== value.id)].slice(0, 10) } : {}) }), account), [account]);
  const ask = useCallback(async (value: Session, final = false, chosen?: ContentItem) => {
    const relevant = chosen ? [chosen, ...matching(catalog.items, 'question', value.target, 3)] : matching(catalog.items, 'question', value.target, 4);
    const instructions = matching(catalog.items, 'followup', value.target, 3);
    const stage = !value.messages.length ? '开场：仅提出一道与目标岗位相关的问题，不给示范答案。' : final || value.round >= 6 ? '结束这一轮：先点评最后回答并给示范，再汇总优势、薄弱点、3个练习动作，不再提出新问题。' : '针对用户最后一次回答给出实时反馈，然后只问一个追问或下一题。输出Markdown：## 本轮反馈（参考评分XX/100、优点和具体不足）；## 满分范例（优秀回答的组织方式，缺失用户事实标［待补充］，不可装成用户真实经历）；## 面试官追问（仅一个问题）。先核对候选人刚才说了什么，不重复已经问过的问题。';
    const result = await ai.run(`你在进行一场文字模拟面试，最多6轮回答。${stage}`, JSON.stringify({ target: value.target, jd: value.jd, resume: value.resume.slice(0, 12000), interviewHistory: value.messages.slice(-6), round: value.round, referenceQuestions: compact(relevant), followupRules: compact(instructions) }));
    if (!result || account !== owner() || readState().session?.id !== value.id) return;
    const next: Session = { ...value, messages: [...value.messages, { id: uid(), role: 'assistant', text: result, at: Date.now() }], finished: final || value.round >= 6 };
    complete(next); ai.clear();
  }, [catalog.items, account, ai.run, ai.clear, complete]);
  const start = useCallback(async (chosen?: ContentItem) => {
    if (lock.current || ai.busy) return;
    const current = readState(), currentTarget = readTarget(); if (!currentTarget.role.trim()) { onTarget(); app.toast.show('先填写目标岗位，再开始面试'); return; }
    lock.current = true; setStarting(true); setError(''); ai.clear(); Keyboard.dismiss();
    const value: Session = { id: uid(), target: currentTarget, jd: currentTarget.jd, resume: current.resume.text.slice(0, 12000), messages: [], round: 0, finished: false, createdAt: Date.now() };
    if (current.session?.messages.length) updateState(state => ({ ...state, history: [current.session!, ...state.history.filter(s => s.id !== current.session!.id)].slice(0, 10) }), account);
    complete(value);
    try { await ask(value, false, chosen); } finally { lock.current = false; setStarting(false); }
  }, [account, ai.busy, ai.clear, ask, complete, onTarget]);
  const newRound = useCallback(() => { if (session && !session.finished && session.messages.length) Alert.alert('开始新一轮？', '当前会话会保存到记录。新一轮使用标题栏中的目标公司与岗位。', [{ text: '继续当前面试', style: 'cancel' }, { text: '开始新一轮', onPress: () => void start() }]); else void start(); }, [session, start]);
  useEffect(() => { if (!requested || !active || lastRequested.current === requested.id) return; lastRequested.current = requested.id; if (session && !session.finished && session.messages.length) Alert.alert('用这道题开始新一轮？', requested.question || requested.title, [{ text: '取消', style: 'cancel' }, { text: '开始', onPress: () => void start(requested) }]); else void start(requested); }, [requested, active, session, start]);
  const send = useCallback((answer: string) => {
    if (lock.current || ai.busy) return false;
    const current = readState().session; if (!current || current.finished) return false;
    lock.current = true; setError(''); ai.clear();
    const value: Session = { ...current, round: current.round + 1, messages: [...current.messages, { id: uid(), role: 'user', text: answer, at: Date.now() }] };
    complete(value); void ask(value).finally(() => { lock.current = false; });
    return true;
  }, [ai.busy, ai.clear, ask, complete]);
  const retry = () => { const value = readState().session; if (!value || lock.current) return; lock.current = true; ai.clear(); void ask(value).finally(() => { lock.current = false; }); };
  const finish = () => { const value = readState().session; if (!value || lock.current) return; lock.current = true; ai.clear(); void ask(value, true).finally(() => { lock.current = false; }); };
  const awaiting = !!session && (!session.messages.length || session.messages.at(-1)?.role === 'user');
  return <View style={{ flex: 1 }}><View style={{ paddingHorizontal: 14, paddingTop: 10, paddingBottom: 8, gap: 8 }}><View style={s.spread}><View style={{ flex: 1 }}><Text numberOfLines={1} style={[s.heading, { color: c.text }]}>{session ? [session.target.company, session.target.role].filter(Boolean).join(' · ') : '和面试官练一轮真实表达'}</Text><Text style={[s.small, { color: c.muted }]}>{session ? `已回答 ${session.round} / 6 轮${session.finished ? ' · 已结束' : ''}` : '每次只问一个问题，回答后给反馈与示范'}</Text></View><View style={s.row}><IconButton label={session ? "开始新一轮模拟面试" : "开始模拟面试"} selected busy={starting} disabled={ai.busy && !starting} onPress={newRound}><Plus size={19} color={c.accent} /></IconButton><IconButton label="模拟面试记录" onPress={() => setHistoryOpen(true)}><History size={18} color={c.accent} /></IconButton></View></View><View style={s.row}>{session && !session.finished && session.messages.length ? <Button label="结束并复盘" subtle disabled={ai.busy} onPress={finish} /> : null}{ai.busy ? <IconButton label="停止生成" onPress={ai.cancel}><Square size={18} color={c.accent} /></IconButton> : null}</View>{session && (session.target.role !== target.role || session.target.company !== target.company || session.jd !== target.jd) ? <Text style={[s.small, { color: c.muted }]}>目标已变更；当前会话保留原目标，新一轮会使用新目标。</Text> : null}<ErrorText text={error || ai.error} />{ai.error || awaiting && !ai.busy && session ? <View style={s.row}><Button label="重试本轮" subtle onPress={retry} /><Button label="配置 AI" subtle onPress={() => app.ai.openSettings()} /></View> : null}</View>
    {session ? <FlashList key={session.id} data={rows} keyExtractor={key} getItemType={bubbleType} renderItem={renderBubble} maintainVisibleContentPosition={position} contentContainerStyle={{ paddingBottom: 10 }} ListFooterComponent={session.finished ? <View style={{ padding: 14 }}><Card><Text style={[s.heading, { color: c.text }]}>本轮已保存</Text><Text style={[s.body, { color: c.muted }]}>示范答案用于学习组织方式。把待补事实改成自己的经历，再练一次。</Text></Card></View> : null} /> : <View style={{ flex: 1, justifyContent: 'center', padding: 14 }}><Empty title="把回答练到能讲清楚" detail="点击右上角＋开始。问题、追问和点评参考岗位真题与追问规则，回答后点击发送。" /><Text style={[s.small, { color: c.muted, textAlign: 'center' }]}>目标：{target.role || '尚未设置'}{target.company ? ` · ${target.company}` : ''}</Text></View>}
    <Text style={[s.small, { color: c.muted, paddingHorizontal: 14, paddingVertical: 4 }]}>回答发送至你的 AI；参考评分与满分范例不是招聘承诺。</Text>{session && !session.finished ? <Composer active={active && !historyOpen} sessionId={session.id} disabled={ai.busy || awaiting} onSend={send} /> : null}
    <Sheet title="模拟面试记录" visible={historyOpen} onClose={() => setHistoryOpen(false)}>{history.length ? history.map(value => <Card key={value.id}><Text style={[s.heading, { color: c.text }]}>{value.target.company} · {value.target.role}</Text><Text style={[s.small, { color: c.muted }]}>{new Date(value.createdAt).toLocaleDateString()} · {value.round}轮 · {value.finished ? '已复盘' : '未结束'}</Text><Button label="查看 / 继续" subtle onPress={() => { ai.clear(); const current = readState().session; if (current && current.id !== value.id && current.messages.length) updateState(state => ({ ...state, history: [current, ...state.history.filter(s => s.id !== current.id)].slice(0, 10) }), account); complete(value); setHistoryOpen(false); }} /></Card>) : <Empty title="还没有历史会话" detail="开始新一轮或完成复盘后，这里保留最近10次记录。" />}</Sheet>
  </View>;
});
