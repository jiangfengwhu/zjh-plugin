import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, BackHandler, Keyboard, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { useTheme } from '@zijinhua/app-sdk/ui';
import { ArrowLeft, ArrowRight, Check, Pause, Play, Settings2, X } from 'lucide-react-native';
import { app, changeSession, clear, data, event, owner, read, recordFinished, remember, update, useStore } from './store';
import { blockerLabels, elapsed, examples, finish, formatDuration, localStep, makeSession, pause, resume, start, stop, type Blocker, type Outcome, type Session, type Step } from './domain';
import { useCoach } from './coach';
import { Button, Card, ClockRing, IconButton, Seed, styles } from './ui';
import { Report } from './report';
import { syncReminder } from './reminders';

type Screen = 'home' | 'step' | 'timer' | 'confirm' | 'report' | 'settings';
const screenFor = (s: Session | null): Screen => !s ? 'home' : s.status === 'ready' ? 'step' : s.status === 'finished' ? 'report' : s.status === 'confirm' ? 'confirm' : 'timer';

function CoachApp() {
  const { colors: c } = useTheme(), state = useStore(), s = state.session, account = useRef(owner()).current;
  const [screen, setScreen] = useState<Screen>(() => screenFor(read().session)), [foreground, setForeground] = useState(AppState.currentState === 'active'), [now, setNow] = useState(Date.now());
  const [blockerOpen, setBlockerOpen] = useState(false), [duration, setDuration] = useState(300);
  const focused = useIsFocused(), active = focused && foreground;
  const coach = useCoach(active && screen !== 'settings', state.aiAllowed);
  const scroll = useRef<ScrollView>(null), generation = useRef(0), previousScreen = useRef<Screen>('home');
  const generationOwner = useRef(account);
  const go = useCallback((next: Screen) => { Keyboard.dismiss(); setScreen(next); scroll.current?.scrollTo({ y: 0, animated: false }); }, []);
  useEffect(() => { const sub = AppState.addEventListener('change', next => { setForeground(next === 'active'); setNow(Date.now()); }); return () => sub.remove(); }, []);
  useEffect(() => { if (!active) return; setNow(Date.now()); const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, [active]);
  useEffect(() => { syncReminder(s, state.reminders); }, [s?.id, s?.status, s?.resumedAt, s?.elapsedSec, s?.plannedSec, state.reminders]);
  useEffect(() => {
    if (!s || s.status !== 'running' || elapsed(s, now) < s.plannedSec) return;
    coach.cancel(); changeSession(s.id, current => current.status === 'running' ? stop(current, now) : current, account);
    if (screen !== 'settings' && screen !== 'home') go('confirm');
  }, [s?.id, s?.status, now]);
  const back = useCallback(() => {
    coach.cancel(); generation.current++;
    if (screen === 'settings') go(previousScreen.current === 'timer' && read().session?.status === 'confirm' ? 'confirm' : previousScreen.current);
    else go('home');
  }, [screen, go, coach.cancel]);
  useEffect(() => { if (!active) return; const sub = BackHandler.addEventListener('hardwareBackPress', () => { if (screen === 'home') return false; back(); return true; }); return () => sub.remove(); }, [active, screen, back]);
  useEffect(() => {
    const receive = () => { const params = app.sharing.getParams(); if (typeof params?.source === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(params.source)) { update(st => ({ ...st, source: params.source as string }), account); event('attributed_open', account); } };
    const off = app.sharing.subscribe(receive); receive(); return off;
  }, [account]);
  useEffect(() => { event('app_opened', account); return () => { generation.current++; }; }, [account]);
  useEffect(() => { setBlockerOpen(false); coach.clearError(); scroll.current?.scrollTo({ y: 0, animated: false }); }, [screen]);
  const improve = async (session: Session, base: Step) => {
    const version = ++generation.current;
    const result = await coach.generate(session, base);
    if (!result || version !== generation.current || account !== owner() || generationOwner.current !== account) return;
    changeSession(session.id, current => current.step.action === base.action && current.status === session.status ? { ...current, step: result } : current, account);
  };
  const create = (task: string) => {
    if (!task.trim()) { app.toast.show('先说一件你想开始的事'); return; }
    const begin = () => {
      coach.cancel(); generation.current++;
      const fallback = localStep(task), memory = remember(fallback.category, task), session = makeSession(task, memory);
      go('step'); setDuration(300); update(st => ({ ...st, draft: task, session }), account); event('step_shown', account);
      if (state.aiAllowed && !memory && !/自杀|自残|伤害自己|杀人|诈骗|偷盗/.test(task)) void improve(session, session.step);
    };
    if (s && ['running', 'paused', 'confirm'].includes(s.status)) Alert.alert('开始另一件事？', '当前这轮会被替换。也可以先回到当前计时，确认已推进的部分。', [{ text: '保留当前这轮', style: 'cancel' }, { text: '开始新任务', onPress: begin }]); else begin();
  };
  const beginTimer = () => {
    if (!s) return;
    coach.cancel(); generation.current++; go('timer');
    const session = start(s, s.adjustments >= 2 ? 300 : duration); update(st => st.session?.id === s.id ? { ...st, session } : st, account); setNow(Date.now()); event('timer_started', account);
  };
  const adjust = (blocker: Blocker | null, simpler: boolean) => {
    if (!s) return;
    coach.cancel(); generation.current++;
    const capped = screen === 'step' && s.adjustments >= 2;
    if (capped) { app.toast.show('先试 5 分钟，过程中随时可以停'); return; }
    const next: Session = { ...s, blocker, firstConfirmed: false, adjustments: screen === 'step' ? Math.min(2, s.adjustments + 1) : s.adjustments, coachRounds: screen === 'timer' ? Math.min(5, s.coachRounds + 1) : s.coachRounds, step: localStep(s.task, blocker, simpler ? 1 : 0) };
    if (next.adjustments >= 2) setDuration(300);
    changeSession(s.id, () => next, account); setBlockerOpen(false); event('blocker_adjusted', account);
    if (state.aiAllowed && s.coachRounds < 5 && !/自杀|自残|伤害自己|杀人|诈骗|偷盗/.test(s.task)) void improve(next, next.step);
  };
  const end = () => { if (!s) return; coach.cancel(); generation.current++; go('confirm'); changeSession(s.id, current => stop(current), account); event('round_ended', account); };
  const confirm = (outcome: Outcome) => { if (!s) return; go('report'); recordFinished(finish(s, outcome), account); app.haptics.trigger('notificationSuccess'); };
  const reset = () => { coach.cancel(); generation.current++; go('home'); update(st => ({ ...st, session: null, draft: '' }), account); };
  const privacy = <Card><Text style={[styles.heading, { color: c.text }]}>AI 可选，本地也能直接开始</Text><Text style={[styles.small, { color: c.muted }]}>开启后，只把本次任务和卡点发送给你配置的 AI 服务。请不要填写客户信息、保密内容等。记录保存在本机，随时可清除。</Text><Button label={state.aiAllowed ? '关闭 AI，使用本地小动作' : '我已了解，开启 AI 建议'} secondary onPress={() => { update(st => ({ ...st, aiAllowed: !st.aiAllowed }), account); if (state.aiAllowed) { coach.cancel(); generation.current++; } }} /></Card>;
  const feedback = <>{coach.busy ? <View style={{ gap: 8 }}><Text accessibilityLiveRegion="polite" style={[styles.small, { color: c.muted }]}>AI 正在找更贴合你的动作，下面这一步已可以直接做。</Text><Button label="停止等待，使用当前动作" secondary onPress={() => { coach.cancel(); generation.current++; }} /></View> : null}{coach.error ? <Text accessibilityLiveRegion="polite" style={[styles.small, { color: c.muted }]}>{coach.error}</Text> : null}</>;
  const blockers = <Card><Text style={[styles.heading, { color: c.text }]}>这不是你卡住的地方？</Text><Text style={[styles.body, { color: c.muted }]}>告诉我哪种更像现在的你，只换一个小动作。</Text>{(Object.keys(blockerLabels) as Blocker[]).map(b => <Button key={b} label={blockerLabels[b]} secondary onPress={() => adjust(b, false)} />)}<Button label="先不改，收起" secondary onPress={() => setBlockerOpen(false)} /></Card>;
  const title = screen === 'home' ? '开工搭子' : screen === 'step' ? '先做这一小步' : screen === 'timer' ? '这一轮，慢慢来' : screen === 'confirm' ? '看看真实进度' : screen === 'report' ? '我的开工记录' : '设置';
  const runningTime = s ? elapsed(s, now) : 0;
  return <SafeAreaView style={[styles.root, { backgroundColor: c.canvas }]} edges={['top', 'bottom']}>
    <View style={[styles.spread, { paddingHorizontal: 12, minHeight: 56 }]}>{screen !== 'home' ? <IconButton label="返回" onPress={back}><ArrowLeft size={23} color={c.text} /></IconButton> : <View style={{ width: 48 }} />}<Text style={{ flex: 1, color: c.text, fontSize: 17, fontWeight: '700', textAlign: 'center' }}>{title}</Text><IconButton label={screen === 'settings' ? '关闭设置' : '打开设置'} onPress={() => { if (screen === 'settings') back(); else { previousScreen.current = screen; coach.cancel(); generation.current++; go('settings'); } }}>{screen === 'settings' ? <X size={22} color={c.text} /> : <Settings2 size={22} color={c.text} />}</IconButton></View>
    <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.page}>
      {screen === 'home' ? <>
        <View style={{ gap: 20, paddingTop: 12 }}><Seed size={76} /><Text style={[styles.title, { color: c.text }]}>你现在最不想开始的，{'\n'}是哪件事？</Text><Text style={[styles.body, { color: c.muted }]}>不用先想好计划。我们只找一个小到能开始的动作。</Text></View>
        <TextInput accessibilityLabel="想开始的任务" value={state.draft} onChangeText={draft => update(st => ({ ...st, draft }), account)} maxLength={1000} multiline placeholder="例如：周报明天要交，但我盯着空白文档很久了…" placeholderTextColor={c.muted} style={[styles.field, { color: c.text, backgroundColor: c.field }]} />
        <Button label="给我一个能开始的小动作" icon={<ArrowRight size={20} color={c.onAccent} />} onPress={() => create(state.draft)} />
        <View style={{ gap: 6 }}><Text style={[styles.small, { color: c.muted }]}>没想好怎么说？点一个直接试</Text>{examples.map(task => <Pressable accessibilityRole="button" key={task} onPress={() => create(task)} style={({ pressed }) => ({ paddingVertical: 13, opacity: pressed ? .6 : 1 })}><Text style={[styles.body, { color: c.text }]}>{task} <Text style={{ color: c.accent }}>→</Text></Text></Pressable>)}</View>
        {s && s.status !== 'finished' ? <Card tint><Text style={[styles.heading, { color: c.text }]}>还有一轮，已经帮你留好了</Text><Text numberOfLines={2} style={[styles.body, { color: c.text }]}>{s.task}</Text><Button label={s.status === 'confirm' ? '确认这一轮的进度' : '回到当前这轮'} secondary onPress={() => go(screenFor(s))} /></Card> : null}
        {state.history.length ? <View style={{ gap: 10 }}><Text style={[styles.heading, { color: c.text }]}>最近开始的事</Text>{state.history.slice(0, 3).map(h => <Card key={h.id}><Text style={[styles.body, { color: c.text }]}>{h.task}</Text><Text style={[styles.small, { color: c.muted }]}>{h.outcome === 'none' ? '下次换个入口' : h.useful ? '已记住有帮助的办法' : '已经做出了动作'}</Text><Button label="从这件事再开始" secondary onPress={() => create(h.task)} /></Card>)}</View> : null}
        <Text style={[styles.small, { color: c.muted }]}>无需登录，没有打卡惩罚。AI 没准备好时，本地小动作也能用。</Text>
      </> : null}
      {screen === 'step' && s ? <>
        <Text style={[styles.small, { color: c.muted }]}>{s.task}</Text><Card tint><View style={styles.row}><Seed size={44} /><Text style={[styles.small, { color: c.accentText }]}>{s.step.source === 'ai' ? 'AI 建议 · 请按实际条件调整' : s.step.source === 'remembered' ? '上次你确认有帮助的办法' : '不用等待，现在就能试'}</Text></View><Text selectable style={[styles.title, { color: c.text }]}>{s.step.action}</Text><Text style={[styles.body, { color: c.muted }]}>{s.step.reason}</Text><Text style={[styles.small, { color: c.muted }]}>10 秒内能开始就够了，不要求现在完成。</Text></Card>
        <View style={styles.wrap}>{[300, 600, 1500].map(seconds => <Button key={seconds} label={`${seconds / 60} 分钟${seconds === 300 ? ' · 推荐' : ''}`} secondary={duration !== seconds} disabled={s.adjustments >= 2 && seconds !== 300} onPress={() => { setDuration(seconds); app.haptics.trigger('selection'); }} style={{ flexGrow: 1 }} />)}</View>
        <Button label={`先开工 ${s.adjustments >= 2 ? 5 : duration / 60} 分钟`} icon={<Play size={20} color={c.onAccent} />} onPress={beginTimer} />
        {s.adjustments < 2 ? <View style={styles.wrap}><Button label="再简单一点" secondary onPress={() => adjust(s.blocker, true)} style={{ flexGrow: 1 }} /><Button label="这不是我的卡点" secondary onPress={() => setBlockerOpen(v => !v)} style={{ flexGrow: 1 }} /></View> : <Text style={[styles.body, { color: c.muted }]}>已经缩小两次了。先试一下，过程中可以暂停、换动作或提前结束。</Text>}
        {blockerOpen ? blockers : null}{feedback}
        {!state.aiAllowed ? <Button label="想让 AI 更贴合任务？去设置开启" secondary onPress={() => { previousScreen.current = 'step'; go('settings'); }} /> : <Button label="请 AI 重新找一个动作" secondary busy={coach.busy} disabled={s.adjustments >= 2} onPress={() => adjust(s.blocker, false)} />}
      </> : null}
      {screen === 'timer' && s ? <>
        <Text style={[styles.body, { color: c.muted }]}>{s.task}</Text>
        <View style={{ width: '100%', maxWidth: 270, aspectRatio: 1, alignSelf: 'center' }}><ClockRing progress={1 - runningTime / s.plannedSec} /><View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', padding: 36 }}><Text style={{ color: c.text, fontSize: 48, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{formatDuration(s.plannedSec - runningTime)}</Text><Text style={[styles.small, { color: c.muted }]}>{s.status === 'paused' ? '暂停中，时间不计入' : '先做一点，就够了'}</Text></View></View>
        <Card tint><Text style={[styles.small, { color: c.accentText }]}>眼前只做这一件</Text><Text selectable style={[styles.heading, { color: c.text }]}>{s.step.action}</Text><Button label={s.firstConfirmed ? '已确认：第一步做到了' : '第一步做到了'} secondary={s.firstConfirmed} disabled={s.firstConfirmed} icon={<Check size={19} color={s.firstConfirmed ? c.text : c.onAccent} />} onPress={() => { changeSession(s.id, current => ({ ...current, firstConfirmed: true }), account); event('first_step_done_clicked', account); }} /></Card>
        <View style={styles.wrap}><Button label={s.status === 'paused' ? '继续这一轮' : '暂停一下'} secondary icon={s.status === 'paused' ? <Play size={18} color={c.text} /> : <Pause size={18} color={c.text} />} onPress={() => { coach.cancel(); generation.current++; changeSession(s.id, current => current.status === 'paused' ? resume(current) : pause(current), account); setNow(Date.now()); }} style={{ flexGrow: 1 }} /><Button label="先结束，确认进度" secondary onPress={end} style={{ flexGrow: 1 }} /></View>
        <Button label="卡住了，换一个入口" secondary onPress={() => setBlockerOpen(v => !v)} />{blockerOpen ? blockers : null}{feedback}
        <Text style={[styles.small, { color: c.muted }]}>可以把手机放下，去做这件事。离开页面不暂停计时，回来的时候进度还在。不会根据无操作来催你。</Text>
      </> : null}
      {screen === 'confirm' && s ? <><Seed /><Text style={[styles.title, { color: c.text }]}>这轮计时结束了。{'\n'}你实际推进了什么？</Text><Text style={[styles.body, { color: c.muted }]}>本轮计时 {formatDuration(s.elapsedSec)}，已扣除暂停。时间经过不代表任务完成，由你来确认。</Text><Card tint><Text style={[styles.body, { color: c.text }]}>{s.step.action}</Text></Card><Button label="做出了第一步" onPress={() => confirm('first')} /><Button label="又推进了一点" secondary onPress={() => confirm('more')} /><Button label="还没动起来，换个办法" secondary onPress={() => confirm('none')} /></> : null}
      {screen === 'report' && s?.status === 'finished' ? <Report key={s.id} session={s} onHome={reset} onAgain={() => create(s.task)} /> : null}
      {screen === 'settings' ? <>
        <Text style={[styles.title, { color: c.text }]}>按你舒服的方式来。</Text>
        <Card><Text style={[styles.heading, { color: c.text }]}>跟随生花账号</Text><Text style={[styles.body, { color: c.text }]}>{app.auth.getUser()?.name || '当前为游客，也可以直接开工'}</Text><Text style={[styles.small, { color: c.muted }]}>昵称直接使用生花账号资料，不另外收集。分享卡默认匿名，你可以在预览时选择显示账号昵称。</Text></Card>
        {privacy}<Button label="配置 AI 引擎" secondary onPress={() => app.ai.openSettings()} />
        <Card><Text style={[styles.heading, { color: c.text }]}>结束时，轻轻提醒</Text><Text style={[styles.body, { color: c.muted }]}>默认关闭，只提醒这一轮结束。不包含任务原文，不发送中点或无操作提醒。系统省电与权限可能影响送达。</Text><Button label={state.reminders ? '关闭结束提醒' : '开启结束提醒'} secondary onPress={async () => { if (state.reminders) { update(st => ({ ...st, reminders: false }), account); return; } try { await app.phone.requestNotifications(); if (account !== owner()) return; const status = await app.phone.notificationStatus(); if (status.enabled) update(st => ({ ...st, reminders: true }), account); else app.toast.show('通知未开启，计时仍正常。可在系统设置中调整。'); } catch { app.toast.show('提醒暂不可用，计时仍正常'); } }} /></Card>
        <Card><Text style={[styles.heading, { color: c.text }]}>本机记录</Text><Text style={[styles.body, { color: c.muted }]}>保留最近 60 轮。任务、进度和“有帮助”的办法不自动同步，不放进分享链接。分享图片默认隐藏任务。</Text><Button label="导出匿名使用事件" secondary onPress={async () => { try { await data.files.writeText('exports/events.json', JSON.stringify(state.events, null, 2)); if (account !== owner()) return; const result = await data.files.exportFile('exports/events.json', { name: '开工搭子使用事件.json', mime: 'application/json' }); if (!result.ok && result.code !== 'CANCELLED') app.toast.show(result.error); } catch { app.toast.show('导出未完成，请重试'); } }} /><Text style={[styles.small, { color: c.muted }]}>事件不含任务和昵称，仅用于内测核对开工、真实动作确认和分享入口。不能据此判断安装归因或分享完成。</Text></Card>
        <Button label="清除本机数据" secondary onPress={() => Alert.alert('清除本机数据？', '会删除当前账号的任务、计时和记录，关闭提醒。生花账号资料及已导出的图片和文件不受影响。', [{ text: '取消', style: 'cancel' }, { text: '清除', style: 'destructive', onPress: () => { coach.cancel(); generation.current++; clear(account); syncReminder(null, false); go('home'); } }])} />
      </> : null}
    </ScrollView>
  </SafeAreaView>;
}
export default function StartCoach() { const state = useStore(); return <CoachApp key={owner()} />; }
