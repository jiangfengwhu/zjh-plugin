import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, BackHandler, Keyboard, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { useTheme } from '@zijinhua/app-sdk/ui';
import { ArrowLeft, ArrowRight, Check, ChevronRight, Pause, Play, Settings2, X } from 'lucide-react-native';
import { app, changeSession, clear, event, owner, read, recordFinished, update, useStore } from './store';
import { completeStep, elapsed, finish, formatDuration, makeSession, nextStep, pause, resume, start, stop, type Session } from './domain';
import { useCoach } from './coach';
import { Button, ClockRing, IconButton, Seed, Separator, styles, TextButton } from './ui';
import { Report } from './report';
import { syncReminder } from './reminders';

type Screen = 'home' | 'step' | 'timer' | 'milestone' | 'confirm' | 'report' | 'settings';
type Request = { id: string; instruction: string; note: string };
const screenFor = (s: Session | null): Screen => !s ? 'home' : s.status === 'ready' ? 'step' : s.status === 'finished' ? 'report' : s.status === 'confirm' ? 'confirm' : s.status === 'milestone' ? 'milestone' : 'timer';
function CoachApp() {
  const { colors: c } = useTheme(), state = useStore(), s = state.session, account = useRef(owner()).current;
  const [screen, setScreen] = useState<Screen>(() => screenFor(read().session));
  const [foreground, setForeground] = useState(AppState.currentState === 'active'), [now, setNow] = useState(Date.now());
  const [request, setRequest] = useState<Request | null>(() => s?.status === 'ready' && !s.step ? { id: s.id, instruction: s.completedSteps.length ? '接着已完成的动作，给一个下一步。' : '帮用户找到第一个能开始的动作。', note: '' } : null);
  const [stuckOpen, setStuckOpen] = useState(false), [stuckText, setStuckText] = useState(''), [note, setNote] = useState(''), [confirmCurrent, setConfirmCurrent] = useState(false);
  const focused = useIsFocused(), active = focused && foreground;
  const coach = useCoach(active && screen !== 'settings' && screen !== 'home', state.aiAllowed);
  const scroll = useRef<ScrollView>(null), generation = useRef(0), previousScreen = useRef<Screen>('home');
  const go = useCallback((next: Screen) => { Keyboard.dismiss(); setScreen(next); scroll.current?.scrollTo({ y: 0, animated: false }); }, []);
  const cancel = useCallback(() => { generation.current++; setRequest(null); coach.cancel(); }, [coach.cancel]);
  useEffect(() => { const sub = AppState.addEventListener('change', value => { setForeground(value === 'active'); setNow(Date.now()); }); return () => sub.remove(); }, []);
  useEffect(() => { if (!active || s?.status !== 'running') return; setNow(Date.now()); const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, [active, s?.status]);
  useEffect(() => { syncReminder(s, state.reminders); }, [s?.id, s?.status, s?.resumedAt, s?.elapsedSec, s?.plannedSec, state.reminders]);
  useEffect(() => {
    if (!s || s.status !== 'running' || elapsed(s, now) < s.plannedSec) return;
    cancel(); changeSession(s.id, current => current.status === 'running' ? stop(current, now) : current, account);
    if (screen !== 'settings' && screen !== 'home') go('confirm');
  }, [s?.id, s?.status, now]);
  useEffect(() => {
    if (!request || !active || !state.aiAllowed || screen === 'settings' || screen === 'home') return;
    const session = read().session;
    if (!session || session.id !== request.id) { setRequest(null); return; }
    const version = ++generation.current, priorAction = session.step?.action || '';
    setRequest(null);
    void coach.generate(session, request.instruction, request.note).then(step => {
      if (!step || version !== generation.current || account !== owner()) return;
      changeSession(session.id, current => current.status === session.status && (current.step?.action || '') === priorAction ? { ...current, step } : current, account);
      event('ai_step_generated', account);
    });
  }, [request, active, state.aiAllowed, screen]);
  useEffect(() => { setStuckOpen(false); setStuckText(''); setNote(''); setConfirmCurrent(false); coach.clearError(); scroll.current?.scrollTo({ y: 0, animated: false }); }, [screen]);
  const back = useCallback(() => { cancel(); if (screen === 'settings') { const current = read().session; go(previousScreen.current === 'timer' && current?.status === 'confirm' ? 'confirm' : previousScreen.current); } else go('home'); }, [screen, cancel, go]);
  useEffect(() => { if (!active) return; const sub = BackHandler.addEventListener('hardwareBackPress', () => { if (screen === 'home') return false; back(); return true; }); return () => sub.remove(); }, [active, screen, back]);
  useEffect(() => {
    const receive = () => { const params = app.sharing.getParams(); if (typeof params?.source === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(params.source)) { update(st => ({ ...st, source: params.source as string }), account); event('attributed_open', account); } };
    const off = app.sharing.subscribe(receive); receive(); return off;
  }, [account]);
  useEffect(() => { event('app_opened', account); return () => { generation.current++; }; }, [account]);
  const create = (task: string) => {
    if (!task.trim()) { app.toast.show('说说你想开始的事吧'); return; }
    const begin = () => { cancel(); const session = makeSession(task); go('step'); update(st => ({ ...st, draft: task, session }), account); setRequest({ id: session.id, instruction: '帮用户找到第一个能开始的动作。', note: '' }); event('task_submitted', account); };
    if (s && ['running', 'paused', 'milestone', 'confirm'].includes(s.status)) Alert.alert('换一件事开始？', '这轮还没保存，先留下已经做的部分吧。', [{ text: '继续这一轮', style: 'cancel' }, { text: '换一件事', onPress: begin }]); else begin();
  };
  const ask = (instruction: string, detail = '') => {
    if (!s) return; cancel(); Keyboard.dismiss(); setStuckOpen(false);
    setRequest({ id: s.id, instruction, note: detail });
  };
  const beginTimer = () => { if (!s?.step) return; cancel(); go('timer'); changeSession(s.id, current => start(current), account); setNow(Date.now()); event('timer_started', account); };
  const done = () => { if (!s?.step) return; cancel(); go('milestone'); changeSession(s.id, current => completeStep(current), account); app.haptics.trigger('notificationSuccess'); event('first_step_done_clicked', account); };
  const advance = () => { if (!s) return; cancel(); go('step'); changeSession(s.id, current => nextStep(current), account); setRequest({ id: s.id, instruction: '用户已经做完上一小步，沿着实际进展给一个下一步，不要重复已完成的动作。', note: '' }); };
  const end = () => { if (!s) return; cancel(); go('confirm'); changeSession(s.id, current => stop(current), account); event('round_ended', account); };
  const save = () => { if (!s) return; cancel(); go('report'); recordFinished(finish(s, note, confirmCurrent), account); };
  const reset = () => { cancel(); go('home'); update(st => ({ ...st, session: null, draft: '' }), account); };
  const settings = () => { if (screen === 'settings') back(); else { previousScreen.current = screen; cancel(); go('settings'); } };
  const busy = coach.busy || !!request && state.aiAllowed;
  const waiting = <View style={{ gap: 20, paddingVertical: 30 }}><ActivityIndicator color={c.ink1} /><Text accessibilityLiveRegion="polite" style={[styles.heading, { color: c.text, textAlign: 'center' }]}>让我想一个，适合你的开始。</Text><TextButton label="先返回" onPress={back} /></View>;
  const error = coach.error ? <View style={{ gap: 12 }}><Text accessibilityLiveRegion="polite" style={[styles.body, { color: c.ink2 }]}>{coach.error}</Text><Button label="再试一次" secondary onPress={() => ask(s?.completedSteps.length ? '给一个顺着已完成进展的下一步。' : '重新给一个贴合任务的小动作。', stuckText)} /><TextButton label="连接 AI" onPress={() => app.ai.openSettings()} /></View> : null;
  const consent = <View style={{ gap: 20, paddingVertical: 24 }}><Seed size={48} /><Text style={[styles.title, { color: c.text }]}>一起找个开始。</Text><Text style={[styles.body, { color: c.ink2 }]}>你的任务会交给 AI 帮忙拆成小步骤。请别写入私人或保密信息。</Text><Button label="继续" onPress={() => { update(st => ({ ...st, aiAllowed: true }), account); if (s && !request) setRequest({ id: s.id, instruction: '帮用户找到一个现在能开始的小动作。', note: '' }); }} /><TextButton label="先返回" onPress={back} /></View>;
  const stuckForm = <View style={{ gap: 14 }}><Separator /><Text style={[styles.heading, { color: c.text }]}>卡在哪儿了？</Text><TextInput accessibilityLabel="现在的卡点" value={stuckText} onChangeText={setStuckText} maxLength={1000} multiline placeholder="直接说就好，我来想办法。" placeholderTextColor={c.muted} style={[styles.field, { color: c.text, backgroundColor: c.canvas, borderWidth: 1, borderColor: c.line }]} /><Button label="帮我换个办法" disabled={!stuckText.trim()} onPress={() => ask('根据用户的实际卡点，换一个更合适、更小的动作。', stuckText)} /></View>;
  const title = screen === 'home' ? '开工搭子' : screen === 'step' ? '现在这一小步' : screen === 'timer' ? '陪你开工' : screen === 'milestone' ? '已经开始了' : screen === 'confirm' ? '留下这次进展' : screen === 'report' ? '开工记录' : '设置';
  const time = s ? elapsed(s, now) : 0;
  return <SafeAreaView style={[styles.root, { backgroundColor: c.surface }]} edges={['top', 'bottom']}>
    <View style={[styles.spread, { paddingHorizontal: 16, minHeight: 60 }]}>{screen === 'home' ? <Seed size={38} /> : <IconButton label="返回" onPress={back}><ArrowLeft size={21} color={c.text} /></IconButton>}<Text style={{ flex: 1, color: c.text, fontSize: 15, fontWeight: '600', textAlign: screen === 'home' ? 'left' : 'center' }}>{title}</Text><IconButton label={screen === 'settings' ? '关闭设置' : '设置'} onPress={settings}>{screen === 'settings' ? <X size={21} color={c.text} /> : <Settings2 size={20} color={c.ink2} />}</IconButton></View>
    <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.page}>
      {screen === 'home' ? <>
        <View style={{ gap: 16, paddingVertical: 20 }}><Text style={[styles.eyebrow, { color: c.greenText }]}>从这里开始</Text><Text style={[styles.title, { color: c.text, fontSize: 40, lineHeight: 54 }]}>先开始。{'\n'}不用想太远。</Text><Text style={[styles.body, { color: c.ink2 }]}>说说那件一直没动手的事。</Text></View>
        <View style={{ borderRadius: 24, backgroundColor: c.canvas, borderWidth: 1, borderColor: c.line, padding: 10, gap: 8 }}><TextInput accessibilityLabel="想开始的任务" value={state.draft} onChangeText={draft => update(st => ({ ...st, draft }), account)} maxLength={1000} multiline placeholder="现在，想做什么？" placeholderTextColor={c.muted} style={[styles.field, { minHeight: 165, backgroundColor: 'transparent', color: c.text }]} /><Button label="帮我开工" icon={<ArrowRight size={19} color={c.surface} />} onPress={() => create(state.draft)} /></View>
        {s && s.status !== 'finished' ? <Pressable accessibilityRole="button" onPress={() => { go(screenFor(s)); if (s.status === 'ready' && !s.step) setRequest({ id: s.id, instruction: s.completedSteps.length ? '给一个顺着已完成进展的下一步。' : '帮用户找到一个能开始的小动作。', note: '' }); }} style={({ pressed }) => [styles.spread, { paddingVertical: 18, borderBottomWidth: 1, borderColor: c.line, opacity: pressed ? .6 : 1 }]}><View style={{ flex: 1, gap: 5 }}><Text style={[styles.small, { color: c.greenText }]}>接着刚才的</Text><Text numberOfLines={2} style={[styles.body, { color: c.text }]}>{s.task}</Text></View><ChevronRight size={20} color={c.ink2} /></Pressable> : null}
        {state.history.length ? <View style={{ gap: 6, paddingTop: 12 }}><Text style={[styles.small, { color: c.muted }]}>最近在做</Text>{state.history.slice(0, 3).map(h => <Pressable accessibilityRole="button" key={h.id} onPress={() => create(h.task)} style={({ pressed }) => [styles.spread, { minHeight: 60, paddingVertical: 15, borderBottomWidth: 1, borderColor: c.line, opacity: pressed ? .6 : 1 }]}><Text numberOfLines={2} style={[styles.body, { color: c.text, flex: 1 }]}>{h.task}</Text><ArrowRight size={18} color={c.ink2} /></Pressable>)}</View> : null}
      </> : null}
      {screen === 'step' && s ? !state.aiAllowed ? consent : <>
        <Text numberOfLines={3} style={[styles.small, { color: c.ink2 }]}>{s.task}</Text>
        {busy && !s.step ? waiting : s.step ? <>
          <View style={{ gap: 20, paddingVertical: 24 }}><Text style={[styles.eyebrow, { color: c.greenText }]}>{s.completedSteps.length ? '接下来' : '第一步'}</Text><Text selectable style={[styles.title, { color: c.text }]}>{s.step.action}</Text><Text style={[styles.body, { color: c.ink2 }]}>{s.step.reason}</Text></View>
          {s.step.message ? <Text style={[styles.body, { color: c.ink2 }]}>{s.step.message}</Text> : null}
          <Button label={`先试 ${Math.round(s.step.durationSec / 60)} 分钟`} icon={<Play size={18} color={c.surface} />} onPress={beginTimer} />
          <View style={styles.spread}><TextButton label="再轻一点" disabled={busy} onPress={() => ask('把当前动作再缩小一点，不增加准备和选择。')} /><TextButton label="我卡在别处" disabled={busy} onPress={() => setStuckOpen(v => !v)} /></View>
        </> : null}
        {busy && s.step ? <View style={styles.row}><ActivityIndicator color={c.ink2} /><Text style={[styles.small, { color: c.ink2 }]}>正在想一个更合适的办法…</Text></View> : null}{error}{stuckOpen ? stuckForm : null}
        {s.completedSteps.length && !s.step && !busy ? <TextButton label="今天先到这里" onPress={end} /> : null}
        {!busy && !s.step && !coach.error ? <Button label={s.completedSteps.length ? "帮我找下一步" : "帮我找第一步"} onPress={() => ask(s.completedSteps.length ? '顺着已完成的动作给下一步。' : '给一个能开始的小动作。')} /> : null}
      </> : null}
      {screen === 'timer' && s?.step ? <>
        <Text numberOfLines={2} style={[styles.small, { color: c.ink2 }]}>{s.task}</Text>
        <View style={{ width: '100%', maxWidth: 270, aspectRatio: 1, alignSelf: 'center', marginVertical: 4 }}><ClockRing progress={(s.plannedSec - time) / s.step.durationSec} /><View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', padding: 30 }}><Text adjustsFontSizeToFit minimumFontScale={.5} numberOfLines={1} style={{ color: c.text, fontSize: 58, fontWeight: '400', fontVariant: ['tabular-nums'], letterSpacing: -2 }}>{formatDuration(s.plannedSec - time)}</Text><Text style={[styles.small, { color: c.ink2 }]}>{s.status === 'paused' ? '歇一会儿' : '就做眼前这一件'}</Text></View></View>
        <Text selectable style={[styles.heading, { color: c.text, textAlign: 'center' }]}>{s.step.action}</Text><Button label="这一步做到了" icon={<Check size={20} color={c.surface} />} onPress={done} />
        <View style={styles.spread}><TextButton label={s.status === 'paused' ? '继续' : '暂停'} onPress={() => { cancel(); changeSession(s.id, current => current.status === 'paused' ? resume(current) : pause(current), account); setNow(Date.now()); }} /><TextButton label="先到这里" onPress={end} /><TextButton label="卡住了" disabled={busy} onPress={() => setStuckOpen(v => !v)} /></View>
        {stuckOpen ? stuckForm : null}{busy ? <View style={styles.row}><ActivityIndicator color={c.ink2} /><Text style={[styles.small, { color: c.ink2 }]}>一起换个办法…</Text></View> : null}{error}
      </> : null}
      {screen === 'milestone' && s ? <>
        <View style={{ paddingVertical: 22, gap: 24 }}><View style={{ width: 68, height: 68, borderRadius: 34, backgroundColor: c.greenTint, alignItems: 'center', justifyContent: 'center' }}><Check size={31} color={c.greenText} /></View><Text style={[styles.title, { color: c.text }]}>{s.completedSteps.length > 1 ? '又往前走了一步。' : '你已经开始了。'}</Text><Text style={[styles.body, { color: c.ink2 }]}>刚才一直没动手的事，已经有了进展。</Text><Separator /><Text selectable style={[styles.heading, { color: c.text }]}>{s.completedSteps.at(-1)?.action}</Text></View>
        <Button label="继续下一步" icon={<ArrowRight size={19} color={c.surface} />} onPress={advance} /><TextButton label="今天先到这里" onPress={end} />
      </> : null}
      {screen === 'confirm' && s ? <>
        <Text style={[styles.title, { color: c.text }]}>{s.completedSteps.length ? '这次，已经往前走了。' : '先歇一下也好。'}</Text>
        {s.completedSteps.length ? <View style={{ gap: 12 }}>{s.completedSteps.map((t, i) => <View key={i} style={styles.row}><Check size={18} color={c.greenText} /><Text selectable style={[styles.body, { color: c.text, flex: 1 }]}>{t.action}</Text></View>)}</View> : null}
        {!s.firstConfirmed && s.step ? <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: confirmCurrent }} onPress={() => setConfirmCurrent(v => !v)} style={[styles.row, { minHeight: 54 }]}><View style={{ width: 24, height: 24, borderRadius: 7, borderWidth: 1, borderColor: confirmCurrent ? c.ink1 : c.lineStrong, backgroundColor: confirmCurrent ? c.ink1 : c.surface, alignItems: 'center', justifyContent: 'center' }}>{confirmCurrent ? <Check size={17} color={c.surface} /> : null}</View><Text style={[styles.body, { color: c.text, flex: 1 }]}>这一小步，我做到了</Text></Pressable> : null}
        <TextInput accessibilityLabel="想留下的进展" value={note} onChangeText={setNote} maxLength={1000} multiline placeholder="想记下什么？也可以不写。" placeholderTextColor={c.muted} style={[styles.field, { color: c.text, backgroundColor: c.canvas, borderWidth: 1, borderColor: c.line }]} /><Button label="留下这次进展" onPress={save} />
      </> : null}
      {screen === 'report' && s?.status === 'finished' ? <Report key={s.id} session={s} onHome={reset} onAgain={() => s.completedSteps.length ? advance() : create(s.task)} /> : null}
      {screen === 'settings' ? <>
        <Text style={[styles.title, { color: c.text }]}>按自己的节奏。</Text>
        <View style={{ gap: 8 }}><Text style={[styles.small, { color: c.ink2 }]}>当前账号</Text><Text style={[styles.heading, { color: c.text }]}>{app.auth.getUser()?.name || '游客'}</Text></View><Separator />
        <Pressable accessibilityRole="button" onPress={() => app.ai.openSettings()} style={[styles.spread, { minHeight: 60 }]}><View style={{ gap: 6 }}><Text style={[styles.body, { color: c.text }]}>AI 连接</Text><Text style={[styles.small, { color: c.ink2 }]}>选择陪你开工的 AI</Text></View><ChevronRight size={20} color={c.ink2} /></Pressable><Separator />
        <Button label={state.reminders ? '关闭结束提醒' : '开启结束提醒'} secondary onPress={async () => { if (state.reminders) { update(st => ({ ...st, reminders: false }), account); return; } try { await app.phone.requestNotifications(); if (account !== owner()) return; const status = await app.phone.notificationStatus(); if (status.enabled) update(st => ({ ...st, reminders: true }), account); else app.toast.show('通知还没开启，可以到系统设置看看。'); } catch { app.toast.show('提醒暂时没设好，请稍后再试。'); } }} />
        <Text style={[styles.small, { color: c.ink2 }]}>只在这一轮结束时提醒。通知里不会显示你的任务。</Text><Separator />
        <View style={{ gap: 10 }}><Text style={[styles.body, { color: c.text }]}>隐私</Text><Text style={[styles.small, { color: c.ink2 }]}>任务和记录保存在本机。使用 AI 时，本次任务和卡点会发送给你连接的 AI。分享前可隐藏任务和昵称。</Text></View>
        <TextButton label="清除开工记录" onPress={() => Alert.alert('清除所有开工记录？', '本机任务和计时会被清除，已保存的图片不受影响。', [{ text: '取消', style: 'cancel' }, { text: '清除', style: 'destructive', onPress: () => { cancel(); clear(account); syncReminder(null, false); go('home'); } }])} />
      </> : null}
    </ScrollView>
  </SafeAreaView>;
}
export default function StartCoach() { useStore(); return <CoachApp key={owner()} />; }
