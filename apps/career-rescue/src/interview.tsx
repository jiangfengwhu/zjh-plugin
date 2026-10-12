import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Keyboard, ScrollView, Text, TextInput, View } from 'react-native';
import { Mic, Square } from 'lucide-react-native';
import { Action, Card, styles, usePalette } from './ui';
import { app, copy, data, owner, roleName, updateState, useCareer } from './model';
import { AiPrivacy, useAi } from './coach';
import { applyFeedback, createSession, decodeJson, parseFeedback, reportText, sessionContext, validateReport, type InterviewSession } from './interview-model';
import { startSpeechSession, type SpeechSession } from './speech-session';
import { materialQuestion, recommendMaterials, useMaterials } from './materials';

export function Interview({ active, onProfile, onIntro, onPrepare }: { active: boolean; onProfile: () => void; onIntro: () => void; onPrepare: () => void }) {
  const c = usePalette(), state = useCareer(), ai = useAi(active), s = state.session;
  const { items } = useMaterials();
  const [error, setError] = useState(''), [hint, setHint] = useState(false), [recording, setRecording] = useState(false), [finishing, setFinishing] = useState(false), [elapsed, setElapsed] = useState(0), [exporting, setExporting] = useState(false);
  const scroll = useRef<ScrollView>(null), speech = useRef<SpeechSession | null>(null), visible = useRef(active); visible.current = active;
  const account = useRef(owner()).current;
  const turn = s?.turns[s.index], revising = !!s?.report && !!s.revision && !s.revision.comparison;
  const answer = revising ? s!.revision!.answer : turn?.answer || '';
  const setSession = useCallback((change: (session: InterviewSession) => InterviewSession, id: string) => updateState(st => st.session?.id === id ? { ...st, session: change(st.session) } : st, account), [account]);
  const saveAnswer = (text: string) => {
    if (!s) return;
    const id = s.id, index = s.index, revisionIndex = revising ? s.revision!.turnIndex : null;
    setSession(current => revisionIndex !== null ? { ...current, revision: { turnIndex: revisionIndex, answer: text, comparison: '' } } : { ...current, turns: current.turns.map((t, i) => i === index ? { ...t, answer: text } : t) }, id);
  };
  const stopSpeech = useCallback(() => { speech.current?.cancel(); speech.current = null; setRecording(false); setFinishing(false); }, []);
  useEffect(() => { if (!active) stopSpeech(); return stopSpeech; }, [active, stopSpeech]);
  useEffect(() => { stopSpeech(); ai.clear(); }, [s?.id, stopSpeech]);
  useEffect(() => { setHint(false); setError(''); setElapsed(0); scroll.current?.scrollTo({ y: 0, animated: false }); }, [s?.id, s?.index, !!s?.report]);
  useEffect(() => {
    if (!active || !s || s.finished || turn?.feedback) return;
    const started = Date.now(); const timer = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [active, s?.id, s?.index, s?.finished, !!turn?.feedback]);
  const start = () => {
    const begin = () => { stopSpeech(); ai.clear(); setError(''); updateState(st => { const targeted = recommendMaterials(items, st.profile).find(r => r.item.kind === '考点' && r.item.roles.includes(st.profile.role)); return { ...st, session: createSession(st.profile, targeted ? materialQuestion(targeted.item) : undefined) }; }, account); };
    if (s && !s.report) Alert.alert('开始新一轮？', '当前未完成的练习将被替换。已完成的复盘仍保留。', [{ text: '继续当前练习', style: 'cancel' }, { text: '开始新一轮', onPress: begin }]); else begin();
  };
  const record = () => {
    if (!s || !active || ai.busy || speech.current) return;
    Keyboard.dismiss(); setRecording(true); setError('');
    const session = startSpeechSession(app.phone.speech, answer, text => { if (speech.current === session && account === owner()) saveAnswer(text.slice(0, 4000)); });
    speech.current = session;
    void session.done.catch(e => { if (speech.current === session && account === owner()) setError(`${e instanceof Error ? e.message : '语音不可用'}。已识别内容保留，你可以修改文字后提交。`); }).finally(() => { if (speech.current === session) { speech.current = null; setRecording(false); setFinishing(false); } });
  };
  const finishRecording = () => { setRecording(false); setFinishing(true); speech.current?.stop(); };
  const review = async () => {
    if (!s || !turn || ai.busy || !answer.trim()) return;
    Keyboard.dismiss(); setError('');
    const raw = await ai.run('只返回JSON，不要markdown。逐题点评返回 {"evidence":"当前回答中逐字引用的一小段原话，不能修改标点","good":"基于引用的一项具体优点","gap":"最优先补充的一点","example":"仅基于已有事实的精简表达示例，未知信息用［待补充］","followUp":"仅当前kind=project且未追问时，围绕该回答提出一道具体追问；否则空字符串","nextQuestion":"按nextSeed的考察方向，结合JD、用户经历和之前回答，提出下一道具体问题，不与已回答问题重复"}。不替用户补造经历或结果。不把JD要求当成用户已有能力。', JSON.stringify({ ...sessionContext(s), currentKind: turn.kind, followedUp: s.followedUp, nextSeed: s.turns[s.index + 1]?.title || '结束' }));
    if (!raw || !visible.current || account !== owner()) return;
    try { const reply = parseFeedback(raw, answer); setSession(current => applyFeedback(current, reply), s.id); ai.clear(); }
    catch (e) { ai.clear(); setError(e instanceof Error ? e.message : '点评失败，请重试'); }
  };
  const summarize = async () => {
    if (!s || ai.busy) return;
    setError('');
    const raw = await ai.run('只返回JSON：{"strength":"依据本轮实际回答的具体优势，注明哪些能力证据不足","priorities":[{"turnIndex":0,"issue":"具体缺口","action":"今晚可以完成的补充动作，例如补哪项证据、重写哪一句"}],"reminder":"面试前只需回顾的三个要点"}。给1至3个优先改进项，turnIndex使用输入中的实际编号且必须有回答。不评分、不预测offer，不评价文字无法判断的声音或自信。', JSON.stringify(sessionContext(s)));
    if (!raw || !visible.current || account !== owner()) return;
    try {
      const report = validateReport(decodeJson(raw), s.turns);
      updateState(st => {
        if (st.session?.id !== s.id) return st;
        const completed = { ...st.session, finished: true, report };
        return { ...st, session: completed, history: [completed, ...st.history.filter(h => h.id !== s.id)].slice(0, 10) };
      }, account); ai.clear();
    } catch (e) { ai.clear(); setError(e instanceof Error ? e.message : '复盘失败，请重试'); }
  };
  const compare = async () => {
    if (!s?.revision || !answer.trim() || ai.busy) return;
    Keyboard.dismiss(); setError('');
    const original = s.turns[s.revision.turnIndex];
    const raw = await ai.run('对比第一次回答和重答，只评估文字中可观察的变化。依次写：真正改善的一点（分别引用两版原话）、仍未补齐的证据、面试前下一步。没有改善就具体说明，不为鼓励而夸大。不添新事实、不评分。250字以内。', JSON.stringify({ question: original.title, original: original.answer, feedback: original.feedback, revised: answer }));
    if (!raw || !visible.current || account !== owner()) return;
    updateState(st => {
      if (st.session?.id !== s.id || !st.session.revision) return st;
      const revised = { ...st.session, revision: { ...st.session.revision, comparison: raw } };
      return { ...st, session: revised, history: st.history.map(h => h.id === s.id ? revised : h) };
    }, account); ai.clear();
  };
  const exportReport = async () => {
    if (!s || exporting) return;
    setExporting(true); setError('');
    const path = `exports/${s.id}.txt`;
    try {
      await data.files.writeText(path, reportText(s));
      if (account !== owner()) return;
      const result = await data.files.exportFile(path, { name: '我的面试复盘.txt', mime: 'text/plain' });
      if (!result.ok && result.code !== 'CANCELLED') throw new Error(result.error);
    } catch (e) { if (account === owner()) setError(e instanceof Error ? e.message : '导出失败'); }
    finally { if (account === owner()) { setExporting(false); void data.files.remove(path).catch(() => {}); } }
  };
  const status = <>{ai.busy ? <Card><View style={styles.row}><ActivityIndicator color={c.primary} /><Text style={[styles.body, { color: c.text, flex: 1 }]}>正在结合本轮回答整理建议…</Text></View><Action label="停止生成，保留回答" subtle onPress={ai.cancel} /></Card> : null}{error || ai.error ? <Card><Text accessibilityLiveRegion="polite" style={[styles.body, { color: c.orange }]}>{error || ai.error}</Text>{ai.error ? <Action label="设置 AI" subtle onPress={() => app.ai.openSettings()} /> : null}</Card> : null}</>;
  const editor = (onSubmit: () => void, label: string) => <View style={{ gap: 12 }}><TextInput accessibilityLabel={revising ? '重答内容' : '本题回答'} value={answer} onChangeText={saveAnswer} editable={!recording && !finishing && !ai.busy} multiline maxLength={4000} placeholder="先说自己的真实做法。可以打字，也可以语音录入后修改。" placeholderTextColor={c.muted} style={[styles.field, { minHeight: 160, backgroundColor: c.field, borderColor: c.line, color: c.text }]} /><Text style={[styles.small, { color: c.muted }]}>本机自动保存 · 语音结果可编辑 · 不保存录音</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}><Action label={finishing ? '正在整理语音' : recording ? '结束录入' : '语音录入'} busy={finishing} subtle disabled={ai.busy} icon={recording ? <Square size={18} color={c.text} /> : <Mic size={18} color={c.text} />} onPress={recording ? finishRecording : record} style={{ flexGrow: 1 }} /><Action label={label} busy={ai.busy} disabled={!answer.trim() || recording || finishing} onPress={onSubmit} style={{ flexGrow: 1 }} /></View></View>;
  if (!s) return <ScrollView contentContainerStyle={styles.content}><View style={{ backgroundColor: c.hero, padding: 24, borderRadius: 24, gap: 16 }}><Text style={[styles.title, { color: c.heroText }]}>练一轮，找出真正卡住你的地方。</Text><Text style={[styles.body, { color: c.heroText }]}>5 道主问题，经历题最多追问 1 次。每题给具体建议，最后挑出最值得补的三个问题。</Text><Action label="开始一轮陪练 · 约 15 分钟" onPress={start} /></View><Card><Text style={[styles.heading, { color: c.text }]}>{roleName(state.profile)}</Text><Text style={[styles.body, { color: c.muted }]}>不需要完整简历。写一段你做过的事、粘贴 JD，建议会更贴合这次面试。没有资料也能先练。</Text><Action label="补充岗位和经历" subtle onPress={onProfile} /><Action label="先准备自我介绍" subtle onPress={onIntro} /></Card><AiPrivacy /><Text style={[styles.small, { color: c.muted }]}>陪练模式：逐题点评，不预测录用结果。离开后可继续，已有回答不会丢失。</Text></ScrollView>;
  return <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
    <AiPrivacy />
    <View style={styles.spread}><View style={{ flex: 1, gap: 4 }}><Text style={[styles.heading, { color: c.text }]}>{s.report ? '这一轮，下一步很清楚' : s.finished ? '回答已保存，生成复盘' : '一轮面试陪练'}</Text><Text style={[styles.small, { color: c.muted }]}>{roleName(s.profile)}{s.profile.company ? ` · ${s.profile.company}` : ''} · {s.profile.round}</Text></View>{s.report ? <Action label="再练一轮" subtle onPress={start} /> : null}</View>
    {!s.finished && turn ? <><View style={{ backgroundColor: c.hero, borderRadius: 24, padding: 22, gap: 12 }}><Text style={[styles.small, { color: c.heroText }]}>{turn.kind === 'followup' ? '经历追问' : '主问题'} · {s.index + 1}/{s.turns.length}</Text><Text style={[styles.title, { color: c.heroText }]}>{turn.title}</Text><Text style={[styles.small, { color: c.heroText }]}>{elapsed >= 180 ? '已练 3 分钟，可以先提交，也可以继续补充。' : `本题 ${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')} · 建议 1–3 分钟`}</Text></View>
      {!turn.feedback ? <><Action label={hint ? '收起思路' : '卡住了，给我一点提示'} subtle onPress={() => setHint(v => !v)} />{hint ? <Card><Text style={[styles.body, { color: c.text }]}>{turn.hint}</Text></Card> : null}{editor(() => void review(), '提交并点评')}</> : <><Card><Text selectable style={[styles.body, { color: c.text }]}>你的回答：{turn.answer}</Text><Text style={[styles.small, { color: c.primary }]}>AI 点评依据：“{turn.feedback.evidence}”</Text><Text style={[styles.heading, { color: c.text }]}>这点值得保留</Text><Text style={[styles.body, { color: c.text }]}>{turn.feedback.good}</Text><Text style={[styles.heading, { color: c.text }]}>优先补这一点</Text><Text style={[styles.body, { color: c.text }]}>{turn.feedback.gap}</Text><Text style={[styles.small, { color: c.muted }]}>表达参考，请核对事实：{turn.feedback.example}</Text></Card><Action label={s.index === s.turns.length - 1 ? '完成回答，准备复盘' : s.turns[s.index + 1].kind === 'followup' ? '接着回答这道追问' : '继续下一题'} onPress={() => { ai.clear(); setSession(current => current.index === current.turns.length - 1 ? { ...current, finished: true } : { ...current, index: current.index + 1 }, s.id); }} /></>}
      {!ai.busy && !recording && !finishing ? <Action label={s.turns.some(t => t.answer.trim()) ? '先结束，复盘已回答的部分' : '暂时退出，保留进度'} subtle onPress={() => { if (s.turns.some(t => t.answer.trim())) setSession(current => ({ ...current, finished: true }), s.id); else onPrepare(); }} /> : null}
    </> : null}
    {s.finished && !s.report ? <Card><Text style={[styles.body, { color: c.text }]}>已回答 {s.turns.filter(t => t.answer.trim()).length} 题。复盘只依据这些回答，未练到的能力暂不评价。</Text><Action label="生成本轮复盘" busy={ai.busy} disabled={!s.turns.some(t => t.answer.trim())} onPress={() => void summarize()} /><Action label="返回最后一题，继续练" subtle disabled={ai.busy} onPress={() => setSession(current => ({ ...current, finished: false }), s.id)} /></Card> : null}
    {s.report ? <><Card><Text style={[styles.heading, { color: c.text }]}>本轮优势 · AI 练习建议</Text><Text selectable style={[styles.body, { color: c.text }]}>{s.report.strength}</Text></Card>{s.report.priorities.map((p, i) => <Card key={i}><Text style={[styles.small, { color: c.primary }]}>优先级 {i + 1} · 第 {p.turnIndex + 1} 题</Text><Text style={[styles.heading, { color: c.text }]}>{p.issue}</Text><Text style={[styles.body, { color: c.text }]}>{p.action}</Text><Action label="重答这题，验证改进" subtle disabled={ai.busy || recording || finishing} onPress={() => { stopSpeech(); ai.clear(); setSession(current => ({ ...current, revision: { turnIndex: p.turnIndex, answer: '', comparison: '' } }), s.id); }} /></Card>)}
      {s.revision ? <Card><Text style={[styles.heading, { color: c.text }]}>重答：{s.turns[s.revision.turnIndex].title}</Text><Text selectable style={[styles.small, { color: c.muted }]}>第一次：{s.turns[s.revision.turnIndex].answer}</Text>{revising ? editor(() => void compare(), '对比两次回答') : <><Text selectable style={[styles.body, { color: c.text }]}>这一次：{s.revision.answer}</Text><Text selectable style={[styles.body, { color: c.text }]}>{s.revision.comparison}</Text></>}</Card> : null}
      <Card><Text style={[styles.heading, { color: c.text }]}>面试前，只回顾这些</Text><Text selectable style={[styles.body, { color: c.text }]}>{s.report.reminder}</Text><Text style={[styles.small, { color: c.muted }]}>复盘已保存在本机，可在“今晚准备”重新打开。</Text><Action label="复制面前回顾" subtle onPress={() => copy(s.report!.reminder)} /><Action label="导出完整复盘（含个人回答）" subtle busy={exporting} onPress={() => void exportReport()} /></Card>
    </> : null}{status}
  </ScrollView>;
}
