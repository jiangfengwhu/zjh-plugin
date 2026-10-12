import React, { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Linking, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { ArrowLeft, ArrowRight, Bookmark, Copy, Download, ExternalLink, RefreshCw, Search, Share2 } from 'lucide-react-native';
import { app, copy, data, owner, updateState, type Profile } from './model';
import { type Question } from './content';
import { Action, Card, IconAction, styles, usePalette, type Palette } from './ui';
import { learningStatus, materialQuestion, materialText, materialTopic, recommendMaterials, refreshMaterials, saveLearning, useLearning, useMaterials, type Material } from './materials';

const keyExtractor = (item: Material) => item.id;
const listStyle = { paddingHorizontal: 14, paddingBottom: 24 };
const fail = (e: unknown) => app.toast.show(e instanceof Error ? e.message : '操作未完成，请重试', 'error');
function Choice({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const c = usePalette();
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={({ pressed }) => ({ minHeight: 44, paddingHorizontal: 11, justifyContent: 'center', borderBottomWidth: selected ? 2 : 0, borderColor: c.primary, opacity: pressed ? .6 : 1 })}><Text style={{ fontSize: 13, color: selected ? c.primary : c.muted, fontWeight: selected ? '700' : '400' }}>{label}</Text></Pressable>;
}
const MaterialRow = memo(function MaterialRow({ item, saved, status, reason, onOpen }: { item: Material; saved: boolean; status: string; reason?: string; onOpen: (id: string) => void }) {
  const c = usePalette();
  return <Pressable accessibilityRole="button" onPress={() => onOpen(item.id)} style={({ pressed }) => ({ paddingVertical: 11, borderBottomWidth: 1, borderColor: c.line, opacity: pressed ? .65 : 1, gap: 5 })}>
    <View style={styles.spread}><Text style={{ color: c.primary, fontSize: 12 }}>{item.kind} · {item.roles.join('/')} {item.company ? `· ${item.company}` : ''}</Text><Text style={{ color: status === '已掌握' ? c.primary : c.muted, fontSize: 12 }}>{saved ? '已收藏 · ' : ''}{status}</Text></View>
    <View style={styles.row}><Text style={{ flex: 1, color: c.text, fontSize: 15, lineHeight: 21, fontWeight: '700' }}>{item.title}</Text><ArrowRight size={16} color={c.muted} /></View>
    <Text numberOfLines={2} style={{ color: c.muted, fontSize: 13, lineHeight: 19 }}>{item.summary}</Text>
    <Text numberOfLines={1} style={{ color: c.muted, fontSize: 12, lineHeight: 18 }}>{reason || `${item.minutes} 分钟 · ${item.level} · ${item.sources[0]?.label || '官方原创模板'}`} · {item.interviewDate ? `面试 ${item.interviewDate}` : item.updatedAt}</Text>
  </Pressable>;
});
function Note({ item, c }: { item: Material; c: Palette }) {
  const stored = useLearning()[item.id]?.note || '', account = owner();
  const [text, setText] = useState(stored), latest = useRef(text), dirty = useRef(false);
  const save = useCallback(() => { if (dirty.current) { saveLearning(item, { note: latest.current }, account); dirty.current = false; } }, [item, account]);
  useEffect(() => () => save(), [save]);
  useEffect(() => { if (!dirty.current) { latest.current = stored; setText(stored); } }, [stored]);
  useEffect(() => { if (!dirty.current) return; const timer = setTimeout(save, 800); return () => clearTimeout(timer); }, [text, save]);
  return <View style={{ gap: 6 }}><Text style={[styles.heading, { color: c.text }]}>我的理解 / 可用经历</Text><TextInput accessibilityLabel="资料学习笔记" multiline maxLength={2000} value={text} onChangeText={v => { latest.current = v; dirty.current = true; setText(v); }} onBlur={save} placeholder="把这个知识点和你的项目联系起来。本机自动保存。" placeholderTextColor={c.muted} style={[styles.field, { color: c.text, backgroundColor: c.field, borderColor: c.line, minHeight: 88 }]} /></View>;
}
function MaterialReader({ item, active, saved, onBack, onPractice, onTrack }: { item: Material; active: boolean; saved: boolean; onBack: () => void; onPractice: (q: Question) => void; onTrack: (item: Material) => void }) {
  const c = usePalette(), progress = useLearning()[item.id], [exporting, setExporting] = useState(false), question = materialQuestion(item);
  useEffect(() => { if (!active) return; const sub = BackHandler.addEventListener('hardwareBackPress', () => { onBack(); return true; }); return () => sub.remove(); }, [active, onBack]);
  const exportText = async () => {
    if (exporting) return; setExporting(true); const account = owner();
    try { const path = `materials/${item.id}.txt`; await data.files.writeText(path, materialText(item)); if (owner() !== account) return; const result = await data.files.exportFile(path, { name: item.title + '.txt', mime: 'text/plain' }); if (!result.ok && result.code !== 'CANCELLED') throw new Error(result.error); }
    catch (e) { if (owner() === account) fail(e); } finally { setExporting(false); }
  };
  return <View style={{ flex: 1 }}><View style={[styles.spread, { borderBottomWidth: 1, borderColor: c.line, paddingHorizontal: 6 }]}><IconAction label="返回资料目录" onPress={onBack}><ArrowLeft size={21} color={c.text} /></IconAction><Text numberOfLines={1} style={{ flex: 1, color: c.muted, fontSize: 13 }}>{item.kind} · {item.roles.join(' / ')}</Text><IconAction label={saved ? '取消收藏' : '收藏资料'} selected={saved} onPress={() => updateState(s => ({ ...s, saved: saved ? s.saved.filter(id => id !== item.id) : [...s.saved, item.id] }))}><Bookmark size={20} color={c.primary} fill={saved ? c.primary : 'transparent'} /></IconAction><IconAction label="分享资料" onPress={() => void app.sharing.open({ title: item.title, description: item.summary, params: { material: item.id } }).catch(fail)}><Share2 size={20} color={c.text} /></IconAction></View>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 14, paddingBottom: 24, gap: 14 }}>
      <View style={{ gap: 6 }}><Text style={{ color: c.text, fontSize: 19, lineHeight: 27, fontWeight: '800' }}>{item.title}</Text><Text style={[styles.small, { color: c.muted }]}>{item.company ? `${item.company} · ` : ''}{item.level} · 约 {item.minutes} 分钟 · 更新 {item.updatedAt}{item.interviewDate ? `\n面试时间 ${item.interviewDate}` : ''}</Text><Text selectable style={[styles.body, { color: c.text }]}>{item.summary}</Text></View>
      <View style={{ backgroundColor: c.field, paddingHorizontal: 8, borderRadius: 8 }}><Text style={[styles.small, { color: c.muted, paddingTop: 8, paddingHorizontal: 4 }]}>学习状态（自己标记） · {learningStatus(item, progress)}</Text><View style={styles.row}><Choice label="读过，待复习" selected={learningStatus(item, progress) === '待复习'} onPress={() => saveLearning(item, { status: 'review' })} /><Choice label="已掌握" selected={learningStatus(item, progress) === '已掌握'} onPress={() => saveLearning(item, { status: 'mastered' })} /></View></View>
      {item.sections.map((s, i) => <View key={i} style={{ gap: 6 }}><Text style={[styles.heading, { color: c.text }]}>{`${String(i + 1).padStart(2, '0')}  ${s.title}`}</Text><Text selectable style={[styles.body, { color: c.text }]}>{s.body}</Text></View>)}
      {item.question ? <View style={{ padding: 12, backgroundColor: c.wash, borderLeftWidth: 3, borderColor: c.primary, gap: 5 }}><Text style={[styles.small, { color: c.primary, fontWeight: '700' }]}>练习题</Text><Text selectable style={[styles.body, { color: c.text }]}>{item.question}</Text></View> : null}
      {item.kind === '机会' ? <Card><Text style={[styles.body, { color: c.text }]}>投递截止：{item.deadlineAt ? new Date(item.deadlineAt).toLocaleString() : '原公告未录入截止时间，请核对来源'}</Text><Action label="加入我的求职进度" onPress={() => onTrack(item)} />{item.applicationUrl ? <Action label="打开原投递地址" subtle onPress={() => void Linking.openURL(item.applicationUrl!).catch(fail)} /> : null}</Card> : null}
      {item.followUps.length ? <View style={{ gap: 6 }}><Text style={[styles.heading, { color: c.text }]}>继续追问</Text>{item.followUps.map((line, i) => <Text selectable key={i} style={[styles.body, { color: c.text }]}>{i + 1}. {line}</Text>)}</View> : null}
      {item.pitfalls.length ? <View style={{ gap: 6 }}><Text style={[styles.heading, { color: c.text }]}>容易答错的地方</Text>{item.pitfalls.map((line, i) => <Text selectable key={i} style={[styles.body, { color: c.text }]}>• {line}</Text>)}</View> : null}
      <Note key={owner() + item.id} item={item} c={c} />
      <View style={{ gap: 4, borderTopWidth: 1, borderColor: c.line, paddingTop: 10 }}><Text style={[styles.heading, { color: c.text }]}>来源与延伸阅读</Text>{item.sources.length ? item.sources.map(s => <Pressable key={s.url} accessibilityRole="link" onPress={() => void Linking.openURL(s.url).catch(fail)} style={({ pressed }) => ({ minHeight: 48, justifyContent: 'center', opacity: pressed ? .6 : 1, gap: 3 })}><View style={styles.row}><ExternalLink size={14} color={c.primary} /><Text style={[styles.small, { color: c.primary, flex: 1 }]}>{s.label}</Text></View><Text numberOfLines={1} style={{ color: c.muted, fontSize: 12 }}>{s.url}</Text></Pressable>) : <Text style={[styles.small, { color: c.muted }]}>生花官方原创模板，可复制后改写成自己的内容。</Text>}</View>
      <View style={styles.row}><Action label="复制全文" subtle icon={<Copy size={16} color={c.text} />} onPress={() => copy(materialText(item))} style={{ flex: 1 }} /><Action label="导出文本" subtle busy={exporting} icon={<Download size={16} color={c.text} />} onPress={() => void exportText()} style={{ flex: 1 }} /></View>
    </ScrollView>
    {question ? <View style={{ padding: 10, borderTopWidth: 1, borderColor: c.line, backgroundColor: c.surface }}><Action label="练这道题 · 回答会保存在本机" onPress={() => { saveLearning(item, {}); onPractice(question); }} icon={<ArrowRight size={17} color={c.onPrimary} />} /></View> : null}
  </View>;
}
export const Library = memo(function Library({ profile, active, saved, onPractice, onTrack, requested }: { profile: Profile; active: boolean; saved: string[]; onPractice: (q: Question) => void; onTrack: (item: Material) => void; requested: { id?: string; topic?: string; at: number } }) {
  const c = usePalette(), catalog = useMaterials(), learning = useLearning();
  const [filter, setFilter] = useState('全部'), [role, setRole] = useState('全部岗位'), [query, setQuery] = useState(''), [selected, setSelected] = useState<Material | null>(null), [missing, setMissing] = useState('');
  const [topic, setTopic] = useState('全部主题'), [showRoles, setShowRoles] = useState(false);
  const deferred = useDeferredValue(query.trim().toLowerCase()), recommendations = useMemo(() => recommendMaterials(catalog.items, profile), [catalog.items, profile]);
  const open = useCallback((id: string) => { const item = catalog.items.find(i => i.id === id); if (item) { setSelected(item); setMissing(''); } }, [catalog.items]);
  const back = useCallback(() => setSelected(null), []);
  const handled = useRef(0);
  useEffect(() => {
    if (handled.current === requested.at) return;
    if (requested.topic) { handled.current = requested.at; setSelected(null); setTopic(requested.topic); setFilter('全部'); setRole('全部岗位'); setQuery(''); setMissing(''); return; }
    if (!requested.id) return;
    const item = catalog.items.find(i => i.id === requested.id);
    if (item) { handled.current = requested.at; setSelected(item); setMissing(''); } else setMissing('这份资料暂未找到，请刷新目录后重试。');
  }, [requested, catalog.items]);
  const rows = useMemo(() => {
    const recommendationIds = new Set(recommendations.map(r => r.item.id));
    return catalog.items.filter(item => (topic === '全部主题' || materialTopic(item) === topic) && (filter === '全部' || filter === '与你相关' && recommendationIds.has(item.id) || filter === '收藏' && saved.includes(item.id) || filter === '待复习' && ['待复习', '资料已更新'].includes(learningStatus(item, learning[item.id])) || item.kind === filter) && (role === '全部岗位' || item.roles.includes(role) || item.roles.includes('通用')) && (!deferred || [item.title, item.summary, item.company || '', ...item.tags].join(' ').toLowerCase().includes(deferred))).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id));
  }, [catalog.items, topic, filter, role, deferred, saved, learning, recommendations]);
  const render = useCallback(({ item }: { item: Material }) => <MaterialRow item={item} saved={saved.includes(item.id)} status={learningStatus(item, learning[item.id])} reason={filter === '与你相关' ? recommendations.find(r => r.item.id === item.id)?.reason : undefined} onOpen={open} />, [saved, learning, filter, recommendations, open]);
  const completed = catalog.items.filter(i => learningStatus(i, learning[i.id]) === '已掌握').length;
  // Keep the directory mounted so opening an article preserves filters and scroll position.
  return <View style={{ flex: 1 }}><View style={{ flex: 1, display: selected ? 'none' : 'flex' }}>
    <View style={{ paddingHorizontal: 14, paddingTop: 8, gap: 6 }}><View style={styles.spread}><View><Text style={[styles.heading, { color: c.text }]}>有出处的求职资料</Text><Text style={[styles.small, { color: c.muted }]}>{catalog.items.length} 份 · 自标掌握 {completed} · {catalog.catalog.revision ? `同步 ${catalog.catalog.updatedAt.slice(0, 10)}` : '已内置，可离线阅读'}</Text></View><IconAction label="刷新资料" onPress={() => void refreshMaterials(true)}>{catalog.refreshing ? <ActivityIndicator size="small" color={c.primary} /> : <RefreshCw size={19} color={c.primary} />}</IconAction></View>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, borderWidth: 1, borderColor: c.line, backgroundColor: c.surface, borderRadius: 8 }}><Search size={17} color={c.muted} /><TextInput accessibilityLabel="搜索资料、公司或考点" value={query} onChangeText={setQuery} placeholder="搜索公司、考点、React、SQL…" placeholderTextColor={c.muted} style={{ flex: 1, minHeight: 44, paddingHorizontal: 8, color: c.text, fontSize: 14 }} /></View>
      {catalog.error || missing ? <Text style={[styles.small, { color: c.orange }]}>{missing || catalog.error}</Text> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">{['全部主题', '简历', '面试', '谈薪', '校招', '权益', '机会'].map(x => <Choice key={x} label={x} selected={topic === x} onPress={() => setTopic(x)} />)}</ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled"><Choice label={showRoles ? '收起岗位' : role} selected={showRoles} onPress={() => setShowRoles(v => !v)} />{['全部', '与你相关', '考点', '面经', '指南', '机会', '模板', '求职入口', '收藏', '待复习'].map(kind => <Choice key={kind} label={kind} selected={filter === kind} onPress={() => setFilter(kind)} />)}</ScrollView>
      {showRoles ? <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">{['全部岗位', '产品', '运营', '前端', '后端', '数据分析', '设计'].map(value => <Choice key={value} label={value} selected={role === value} onPress={() => { setRole(value); setShowRoles(false); }} />)}</ScrollView> : null}
    </View>
    <FlashList data={rows} renderItem={render} keyExtractor={keyExtractor} contentContainerStyle={listStyle} keyboardShouldPersistTaps="handled" ListHeaderComponent={<Text style={[styles.small, { color: c.muted, paddingVertical: 6 }]}>{rows.length} 份结果 · 阅读 → 写笔记 → 练习 → 复习</Text>} ListEmptyComponent={<View style={{ paddingVertical: 28, gap: 10 }}><Text style={[styles.body, { color: c.text }]}>{filter === '面经' ? '真实面经正在收集，发布后会在这里展示公司、轮次、日期和原文来源。' : filter === '待复习' ? '读完资料标记“待复习”，就能在这里集中回顾。' : '没有匹配资料，试试其他关键词或筛选条件。'}</Text><Action label="查看全部资料" subtle onPress={() => { setFilter('全部'); setTopic('全部主题'); setRole('全部岗位'); setQuery(''); }} /></View>} />
    </View>{selected ? <MaterialReader key={selected.id} item={selected} active={active} saved={saved.includes(selected.id)} onBack={back} onPractice={onPractice} onTrack={onTrack} /> : null}</View>;
});

export function RecommendedMaterials({ profile, onOpen }: { profile: Profile; onOpen: (id: string) => void }) {
  const c = usePalette(), { items } = useMaterials(), learning = useLearning(), recommendations = useMemo(() => recommendMaterials(items, profile), [items, profile]);
  return <View style={{ gap: 4 }}><View style={styles.spread}><Text style={[styles.heading, { color: c.text }]}>这次先学这 {recommendations.length} 个</Text><Text style={[styles.small, { color: c.muted }]}>按岗位与 JD 匹配</Text></View>{recommendations.map(r => <MaterialRow key={r.item.id} item={r.item} reason={r.reason} saved={false} status={learningStatus(r.item, learning[r.item.id])} onOpen={onOpen} />)}</View>;
}
