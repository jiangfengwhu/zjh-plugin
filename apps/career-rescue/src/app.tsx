import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Keyboard, Pressable, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import PagerView from 'react-native-pager-view';
import Animated, { useAnimatedReaction, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useKeyboardContext } from 'react-native-keyboard-controller';
import { BriefcaseBusiness, FileText, MessagesSquare, Target, UsersRound } from 'lucide-react-native';
import { app, owner, readState, useAccount, useTarget } from './model';
import { refreshContent } from './content-api';
import { Resume } from './resume';
import { Interview } from './interview';
import { Community } from './community';
import { Schedule } from './schedule';
import { s, usePalette } from './ui';
import { TargetEditor } from './targets';
import type { ContentItem } from './types';
const tabs = [{ title: '简历', icon: FileText }, { title: '模拟面试', icon: MessagesSquare }, { title: '社区', icon: UsersRound }, { title: '我的面试', icon: BriefcaseBusiness }];
function Workspace() {
  const c = usePalette(), inset = useSafeAreaInsets(), target = useTarget();
  const [tab, setTab] = useState(0), [visited, setVisited] = useState(new Set([0])), [targetOpen, setTargetOpen] = useState(false), [question, setQuestion] = useState<ContentItem | null>(null), [requestedJob, setRequestedJob] = useState<{ id: string; token: string } | null>(null);
  const { progress, height } = useKeyboardContext().reanimated, dockHeight = useSharedValue(50 + Math.max(inset.bottom, 8)), closedBottom = useSharedValue(Math.max(inset.bottom, 8));
  useAnimatedReaction(() => ({ bottom: inset.bottom, progress: progress.value, height: height.value }), value => { if (value.progress === 0 && value.height === 0 && value.bottom > 0) closedBottom.value = Math.max(value.bottom, 8); });
  const contentInset = useAnimatedStyle(() => ({ paddingBottom: dockHeight.value * (1 - Math.max(0, Math.min(1, progress.value))) }));
  const dockStyle = useAnimatedStyle(() => ({ paddingBottom: closedBottom.value, opacity: 1 - Math.max(0, Math.min(1, progress.value)), transform: [{ translateY: dockHeight.value * Math.max(0, Math.min(1, progress.value)) }] }));
  const pager = useRef<PagerView>(null), frame = useRef<number | undefined>(undefined);
  const navigate = useCallback((index: number) => {
    Keyboard.dismiss(); setVisited(old => old.has(index) ? old : new Set([...old, index])); setTab(index);
    if (frame.current !== undefined) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => { pager.current?.setPageWithoutAnimation(index); frame.current = undefined; });
  }, []);
  const openTarget = useCallback(() => setTargetOpen(true), []);
  const practice = useCallback((item: ContentItem) => { setQuestion({ ...item, id: item.id + '-' + Date.now() }); navigate(1); }, [navigate]);
  useEffect(() => {
    void refreshContent(); const state = AppState.addEventListener('change', value => { if (value === 'active') void refreshContent(); });
    return () => { state.remove(); if (frame.current !== undefined) cancelAnimationFrame(frame.current); };
  }, []);
  useEffect(() => {
    const handled = new Set<string>();
    return app.phone.onNotification(event => {
      if (handled.has(event.token)) return; handled.add(event.token); if (handled.size > 64) handled.delete(handled.values().next().value!);
      if (event.params.account === owner() && typeof event.params.job === 'string' && readState().jobs.some(j => j.id === event.params.job)) { setRequestedJob({ id: event.params.job, token: event.token }); navigate(3); }
      requestAnimationFrame(() => void app.phone.acknowledgeNotification(event.token));
    });
  }, [navigate]);
  return <SafeAreaView edges={['left', 'right']} style={{ flex: 1, backgroundColor: c.bg }}><View style={[s.spread, { paddingHorizontal: 14, paddingTop: inset.top + 6, paddingBottom: 6, borderBottomWidth: 1, borderColor: c.line, backgroundColor: c.surface }]}><View style={{ flex: 1 }}><Text style={[s.heading, { color: c.text }]}>求职急救站</Text><Text style={[s.small, { color: c.muted }]}>{tabs[tab].title}</Text></View><Pressable accessibilityRole="button" accessibilityLabel={`管理求职目标，${target.company || '公司不限'}，${target.role || '未设置岗位'}`} onPress={openTarget} style={({ pressed }) => ({ minHeight: 48, maxWidth: '48%', justifyContent: 'center', opacity: pressed ? .65 : 1 })}><View style={[s.row, { gap: 5, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 9, backgroundColor: c.field }]}><Target size={15} color={c.accent} /><Text numberOfLines={1} style={[s.small, { flexShrink: 1, color: c.accent, fontWeight: '700' }]}>{[target.company, target.role].filter(Boolean).join(' · ') || '设定目标'}</Text></View></Pressable></View>
    <Animated.View style={[{ flex: 1 }, contentInset]}><PagerView ref={pager} style={{ flex: 1 }} initialPage={0} scrollEnabled={false} offscreenPageLimit={3}><View key="resume" collapsable={false}><Resume active={tab === 0} /></View><View key="interview" collapsable={false}>{visited.has(1) ? <Interview active={tab === 1} onTarget={openTarget} requested={question} /> : null}</View><View key="community" collapsable={false}>{visited.has(2) ? <Community onPractice={practice} /> : null}</View><View key="schedule" collapsable={false}>{visited.has(3) ? <Schedule active={tab === 3} requestedJob={requestedJob} /> : null}</View></PagerView></Animated.View>
    <Animated.View onLayout={event => { dockHeight.value = event.nativeEvent.layout.height; }} style={[{ position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', borderTopWidth: 1, borderColor: c.line, backgroundColor: c.surface, paddingTop: 5 }, dockStyle]}>{tabs.map(({ title, icon: Icon }, index) => <Pressable key={title} accessibilityRole="tab" accessibilityState={{ selected: tab === index }} onPress={() => navigate(index)} style={({ pressed }) => ({ flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', gap: 3, opacity: pressed ? .55 : 1 })}><View style={{ paddingHorizontal: 12, paddingVertical: 3, borderRadius: 12, backgroundColor: tab === index ? c.wash : 'transparent' }}><Icon size={19} color={tab === index ? c.accent : c.muted} /></View><Text style={{ fontSize: 11, fontWeight: tab === index ? '700' : '500', color: tab === index ? c.accent : c.muted }}>{title}</Text></Pressable>)}</Animated.View>{targetOpen ? <TargetEditor onClose={() => setTargetOpen(false)} /> : null}
  </SafeAreaView>;
}
export default function CareerRescue() { const account = useAccount(); return <Workspace key={account} />; }
