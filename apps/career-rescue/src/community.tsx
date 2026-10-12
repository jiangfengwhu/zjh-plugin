import React, { memo, useCallback, useDeferredValue, useMemo, useRef, useState } from 'react';
import { Keyboard, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import PagerView from 'react-native-pager-view';
import { FlashList } from '@shopify/flash-list';
import { Bookmark, ChevronRight, RefreshCw, Search, X } from 'lucide-react-native';
import { app, updateState, useField, useTarget } from './model';
import { refreshContent, useContent } from './content-api';
import { Button, Chip, Empty, ErrorText, IconButton, Markdown, Sheet, s, usePalette } from './ui';
import type { ContentItem } from './types';

type RiskGroup = { id: string; company: string; reports: ContentItem[]; count: number; severity: number; updatedAt: string };
const severity = { 高: 3, 中: 2, 低: 1 };
const itemKey = (item: { id: string }) => item.id;
const rowStyle = { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, gap: 4 };
function RiskTag({ value }: { value: number }) {
  const c = usePalette(), tone = value === 3 ? c.danger : value === 2 ? c.warning : c.accent;
  return <View style={{ paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, borderWidth: StyleSheet.hairlineWidth, borderColor: tone, backgroundColor: c.field }}><Text style={{ fontSize: 10, lineHeight: 15, color: tone, fontWeight: '600' }}>风险{value === 3 ? '高' : value === 2 ? '中' : '低'}</Text></View>;
}
const QuestionRow = memo(function QuestionRow({ item, saved, onOpen }: { item: ContentItem; saved: boolean; onOpen: (item: ContentItem) => void }) {
  const c = usePalette();
  return <Pressable accessibilityRole="button" onPress={() => onOpen(item)} style={({ pressed }) => [rowStyle, { borderColor: c.line, backgroundColor: pressed ? c.field : 'transparent' }]}><View style={s.spread}><Text numberOfLines={1} style={[s.small, { color: c.accent, flex: 1 }]}>{item.company || '通用岗位'} · {item.provenance === '示例' ? '训练题' : item.provenance}</Text>{saved ? <Bookmark size={14} color={c.accent} fill={c.accent} /> : <ChevronRight size={16} color={c.muted} />}</View><Text numberOfLines={2} style={[s.body, { fontWeight: '700', color: c.text }]}>{item.question || item.title}</Text><Text numberOfLines={1} style={[s.small, { color: c.muted }]}>{item.body.replace(/[#*_`]/g, '')}</Text><Text numberOfLines={1} style={[s.small, { color: c.muted }]}>{item.roles.join(' / ') || '通用'} · {item.interviewDate ? `面试 ${item.interviewDate}` : `更新 ${item.updatedAt}`}</Text></Pressable>;
});
const RiskRow = memo(function RiskRow({ item, onOpen }: { item: RiskGroup; onOpen: (item: RiskGroup) => void }) {
  const c = usePalette();
  return <Pressable accessibilityRole="button" onPress={() => onOpen(item)} style={({ pressed }) => [rowStyle, { borderColor: c.line, backgroundColor: pressed ? c.field : 'transparent' }]}><View style={s.spread}><View style={[s.row, { flex: 1, gap: 6 }]}><Text numberOfLines={1} style={[s.heading, { flexShrink: 1, color: c.text }]}>{item.company}</Text><RiskTag value={item.severity} /></View><ChevronRight size={16} color={c.muted} /></View><Text numberOfLines={2} style={[s.body, { color: c.text }]}>{item.reports.slice(0, 3).map(report => report.title).join(' · ')}</Text><Text numberOfLines={1} style={[s.small, { color: c.muted }]}>{item.count} 条反馈 · {item.reports.length} 个来源 · 更新 {item.updatedAt}</Text></Pressable>;
});
const ReportRow = memo(function ReportRow({ item }: { item: ContentItem }) {
  const c = usePalette();
  return <View style={[rowStyle, { borderColor: c.line, gap: 7 }]}><View style={s.row}><Text style={[s.heading, { flex: 1, color: c.text }]}>{item.title}</Text><RiskTag value={severity[item.severity || '低']} /></View><Text style={[s.small, { color: c.muted }]}>{item.updatedAt} · 收录反馈 {item.reportCount} 条</Text><Markdown text={item.body} /><Button label={`查看来源：${item.source?.label}`} subtle onPress={() => { if (item.source) void app.phone.openUrl(item.source.url); }} /></View>;
});
const renderReport = ({ item }: { item: ContentItem }) => <ReportRow item={item} />;
export const Community = memo(function Community({ onPractice }: { onPractice: (item: ContentItem) => void }) {
  const c = usePalette(), target = useTarget(), saved = useField('saved'), { catalog, error } = useContent();
  const [page, setPage] = useState(0), [query, setQuery] = useState(''), [searchOpen, setSearchOpen] = useState(false), [mine, setMine] = useState(false), [refreshing, setRefreshing] = useState(false), [question, setQuestion] = useState<ContentItem | null>(null), [risk, setRisk] = useState<RiskGroup | null>(null);
  const searchQuery = useDeferredValue(query);
  const pager = useRef<PagerView>(null), input = useRef<TextInput>(null), savedIds = useMemo(() => new Set(saved), [saved]);
  const select = (index: number) => { Keyboard.dismiss(); setPage(index); pager.current?.setPage(index); };
  const toggleSearch = () => { if (searchOpen) { Keyboard.dismiss(); setQuery(''); } setSearchOpen(value => !value); };
  const rows = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();
    return catalog.items.filter(item => item.kind === 'question' && (!mine || savedIds.has(item.id)) && (!search || [item.title, item.question, item.company, item.roles.join(' '), item.tags.join(' ')].join(' ').toLowerCase().includes(search))).sort((a, b) => Number(!!b.company && b.company === target.company) - Number(!!a.company && a.company === target.company));
  }, [catalog.items, searchQuery, mine, savedIds, target.company]);
  const risks = useMemo(() => {
    const groups = new Map<string, RiskGroup>(), search = query.trim().toLowerCase();
    for (const item of catalog.items) {
      if (item.kind !== 'risk' || !item.company || !item.source || search && ![item.company, item.title, item.body].join(' ').toLowerCase().includes(search)) continue;
      const current = groups.get(item.company) ?? { id: item.company, company: item.company, reports: [], count: 0, severity: 0, updatedAt: '' };
      current.reports.push(item); current.count += item.reportCount || 1; current.severity = Math.max(current.severity, severity[item.severity || '低']); if (item.updatedAt > current.updatedAt) current.updatedAt = item.updatedAt; groups.set(item.company, current);
    }
    return [...groups.values()].sort((a, b) => b.severity - a.severity || b.count - a.count);
  }, [catalog.items, searchQuery]);
  const openQuestion = useCallback((item: ContentItem) => setQuestion(item), []), openRisk = useCallback((item: RiskGroup) => setRisk(item), []);
  const renderQuestion = useCallback(({ item }: { item: ContentItem }) => <QuestionRow item={item} saved={savedIds.has(item.id)} onOpen={openQuestion} />, [savedIds, openQuestion]);
  const renderRisk = useCallback(({ item }: { item: RiskGroup }) => <RiskRow item={item} onOpen={openRisk} />, [openRisk]);
  const refresh = useCallback(() => { setRefreshing(true); void refreshContent(true).finally(() => setRefreshing(false)); }, []);
  const toggleSave = () => { if (!question) return; updateState(state => ({ ...state, saved: state.saved.includes(question.id) ? state.saved.filter(id => id !== question.id) : [...state.saved, question.id] })); };
  return <View style={{ flex: 1 }}><View style={{ paddingHorizontal: 14, paddingVertical: 8, gap: 7, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: c.line }}><View style={s.spread}><View style={[s.row, { flex: 1, gap: 6 }]}><Chip label="避雷榜" selected={page === 0} onPress={() => select(0)} /><Chip label="真题" selected={page === 1} onPress={() => select(1)} />{page === 1 ? <Chip label="收藏" selected={mine} onPress={() => setMine(value => !value)} /> : null}</View><View style={s.row}><IconButton label={searchOpen ? '收起搜索' : '搜索资料'} selected={searchOpen} onPress={toggleSearch}><Search size={18} color={c.accent} /></IconButton><IconButton label="刷新社区资料" busy={refreshing} onPress={refresh}><RefreshCw size={18} color={c.accent} /></IconButton></View></View>{searchOpen ? <View style={[s.row, { paddingLeft: 10, paddingRight: 3, borderRadius: 9, backgroundColor: c.field }]}><TextInput ref={input} autoFocus accessibilityLabel="搜索公司、岗位或题目" value={query} onChangeText={setQuery} maxLength={100} placeholder="公司、岗位或题目关键词" placeholderTextColor={c.muted} returnKeyType="search" onSubmitEditing={Keyboard.dismiss} style={{ flex: 1, color: c.text, minHeight: 38, fontSize: 13 }} /><IconButton label="清空搜索" onPress={() => { setQuery(''); input.current?.focus(); }}><X size={16} color={c.muted} /></IconButton></View> : null}<ErrorText text={error} /></View>
    <PagerView ref={pager} style={{ flex: 1 }} onPageSelected={event => setPage(event.nativeEvent.position)} initialPage={0}><View key="risk" collapsable={false}><FlashList data={risks} keyExtractor={itemKey} renderItem={renderRisk} contentContainerStyle={{ paddingBottom: 16 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.accent} colors={[c.accent]} />} ListEmptyComponent={<Empty title="暂未收录有来源的避雷反馈" detail="官方持续收录公开反馈。可以先查看真题，准备接下来的面试。" />} /></View><View key="questions" collapsable={false}><FlashList data={rows} keyExtractor={itemKey} renderItem={renderQuestion} contentContainerStyle={{ paddingBottom: 16 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.accent} colors={[c.accent]} />} ListEmptyComponent={<Empty title="没有匹配的题目" detail="试试其他关键词，或取消收藏筛选。" />} /></View></PagerView>
    <Sheet title={question?.title || '题目详情'} visible={!!question} onClose={() => setQuestion(null)}>{question ? <><Text style={[s.small, { color: c.accent }]}>{question.company || '通用岗位'} · {question.provenance === '示例' ? '训练题，非真实面经' : question.provenance} · {question.updatedAt}</Text><Text selectable style={[s.heading, { color: c.text }]}>{question.question}</Text><Markdown text={question.body} />{question.followups?.length ? <View style={{ gap: 5, paddingVertical: 8 }}><Text style={[s.heading, { color: c.text }]}>面试官可能继续问</Text>{question.followups.map((text, index) => <Text key={index} style={[s.body, { color: c.text }]}>{index + 1}. {text}</Text>)}</View> : null}{question.source ? <Button label={`查看来源：${question.source.label}`} subtle onPress={() => void app.phone.openUrl(question.source!.url)} /> : null}<View style={s.row}><Button label="带这题模拟面试" onPress={() => { setQuestion(null); onPractice(question); }} style={{ flex: 1 }} /><Button label={savedIds.has(question.id) ? '已收藏' : '收藏题目'} subtle onPress={toggleSave} /></View></> : null}</Sheet>
    <Sheet title={risk ? `${risk.company} · 反馈来源` : '避雷反馈'} visible={!!risk} scroll={false} onClose={() => setRisk(null)}><FlashList data={risk?.reports || []} keyExtractor={itemKey} contentContainerStyle={{ paddingBottom: 14 }} renderItem={renderReport} /></Sheet>
  </View>;
});
