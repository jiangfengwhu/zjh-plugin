import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Keyboard, Pressable, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import PagerView from 'react-native-pager-view';
import { BriefcaseBusiness, FileText, MessagesSquare, Target, UsersRound } from 'lucide-react-native';
import { app, owner, readState, updateState, useAccount, useField } from './model';
import { refreshContent } from './content-api';
import { Resume } from './resume';
import { Interview } from './interview';
import { Community } from './community';
import { Schedule } from './schedule';
import { Button, Field, s, Sheet, usePalette } from './ui';
import type { ContentItem } from './types';
const tabs = [{ title: '简历', icon: FileText }, { title: '模拟面试', icon: MessagesSquare }, { title: '社区', icon: UsersRound }, { title: '我的面试', icon: BriefcaseBusiness }];
const TargetEditor = memo(function TargetEditor({ onClose }: { onClose: () => void }) {
  const target = useField('target'), c = usePalette(), [company, setCompany] = useState(target.company), [role, setRole] = useState(target.role);
  return <Sheet title="共同的求职目标" visible heightRatio={.56} onClose={onClose}><Text style={[s.small, { color: c.muted }]}>简历诊断、语料匹配和新一轮模拟面试共用这个目标。</Text><Field label="目标岗位" value={role} onChangeText={setRole} maxLength={100} placeholder="例如：Java 后端工程师、产品经理" /><Field label="目标公司（可选）" value={company} onChangeText={setCompany} maxLength={100} placeholder="填写公司，匹配相关资料与问题" /><Button label="保存目标" onPress={() => { updateState(state => ({ ...state, target: { company: company.trim(), role: role.trim() } })); onClose(); }} /><Button label="设置我的 AI 引擎" subtle onPress={() => { onClose(); app.ai.openSettings(); }} /></Sheet>;
});
function Workspace() {
  const c = usePalette(), inset = useSafeAreaInsets(), target = useField('target');
  const [tab, setTab] = useState(0), [visited, setVisited] = useState(new Set([0])), [targetOpen, setTargetOpen] = useState(false), [keyboard, setKeyboard] = useState(false), [question, setQuestion] = useState<ContentItem | null>(null), [requestedJob, setRequestedJob] = useState<{ id: string; token: string } | null>(null);
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
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboard(true)), hide = Keyboard.addListener('keyboardDidHide', () => setKeyboard(false));
    return () => { state.remove(); show.remove(); hide.remove(); if (frame.current !== undefined) cancelAnimationFrame(frame.current); };
  }, []);
  useEffect(() => {
    const handled = new Set<string>();
    return app.phone.onNotification(event => {
      if (handled.has(event.token)) return; handled.add(event.token); if (handled.size > 64) handled.delete(handled.values().next().value!);
      if (event.params.account === owner() && typeof event.params.job === 'string' && readState().jobs.some(j => j.id === event.params.job)) { setRequestedJob({ id: event.params.job, token: event.token }); navigate(3); }
      requestAnimationFrame(() => void app.phone.acknowledgeNotification(event.token));
    });
  }, [navigate]);
  return <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: c.bg }}><View style={[s.spread, { paddingHorizontal: 14, paddingVertical: 6, borderBottomWidth: 1, borderColor: c.line, backgroundColor: c.surface }]}><View style={{ flex: 1 }}><Text style={[s.heading, { color: c.text }]}>求职急救站</Text><Text style={[s.small, { color: c.muted }]}>{tabs[tab].title}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="编辑共同的目标公司与岗位" onPress={openTarget} style={({ pressed }) => ({ minHeight: 48, maxWidth: '62%', flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 10, borderRadius: 10, backgroundColor: c.field, opacity: pressed ? .65 : 1 })}><Target size={19} color={c.accent} /><View style={{ flexShrink: 1 }}><Text numberOfLines={1} style={[s.small, { color: c.text, fontWeight: '700' }]}>{target.role || '设置目标岗位'}</Text><Text numberOfLines={1} style={[s.small, { color: c.muted }]}>{target.company || '公司不限 · 点击编辑'}</Text></View></Pressable></View>
    <PagerView ref={pager} style={{ flex: 1 }} initialPage={0} scrollEnabled={false} offscreenPageLimit={3}><View key="resume" collapsable={false}><Resume active={tab === 0} /></View><View key="interview" collapsable={false}>{visited.has(1) ? <Interview active={tab === 1} onTarget={openTarget} requested={question} /> : null}</View><View key="community" collapsable={false}>{visited.has(2) ? <Community onPractice={practice} /> : null}</View><View key="schedule" collapsable={false}>{visited.has(3) ? <Schedule active={tab === 3} requestedJob={requestedJob} /> : null}</View></PagerView>
    {!keyboard ? <View style={{ flexDirection: 'row', borderTopWidth: 1, borderColor: c.line, backgroundColor: c.surface, paddingBottom: Math.max(inset.bottom, 8), paddingTop: 5 }}>{tabs.map(({ title, icon: Icon }, index) => <Pressable key={title} accessibilityRole="tab" accessibilityState={{ selected: tab === index }} onPress={() => navigate(index)} style={({ pressed }) => ({ flex: 1, minHeight: 52, alignItems: 'center', justifyContent: 'center', gap: 3, opacity: pressed ? .55 : 1 })}><View style={{ paddingHorizontal: 16, paddingVertical: 4, borderRadius: 14, backgroundColor: tab === index ? c.wash : 'transparent' }}><Icon size={21} color={tab === index ? c.accent : c.muted} /></View><Text style={{ fontSize: 12, fontWeight: tab === index ? '700' : '500', color: tab === index ? c.accent : c.muted }}>{title}</Text></Pressable>)}</View> : null}{targetOpen ? <TargetEditor onClose={() => setTargetOpen(false)} /> : null}
  </SafeAreaView>;
}
export default function CareerRescue() { const account = useAccount(); return <Workspace key={account} />; }
