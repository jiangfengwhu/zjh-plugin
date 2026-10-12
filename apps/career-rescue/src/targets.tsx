import React, { memo, useCallback, useState } from 'react';
import { Alert, Keyboard, Pressable, ScrollView, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Check, ChevronLeft, Pencil, Plus, Trash2 } from 'lucide-react-native';
import { app, owner, uid, updateTargets, useTargets } from './model';
import { Button, Empty, ErrorText, Field, IconButton, Sheet, s, usePalette } from './ui';
import type { Target } from './types';
const fresh = (): Target => ({ id: uid(), company: '', role: '', jd: '' });
const key = (item: Target) => item.id;
const TargetRow = memo(function TargetRow({ item, active, onUse, onEdit, onDelete }: { item: Target; active: boolean; onUse: (id: string) => void; onEdit: (item: Target) => void; onDelete: (item: Target) => void }) {
  const c = usePalette();
  return <View style={{ flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderColor: c.line, paddingVertical: 5 }}><Pressable accessibilityRole="button" accessibilityLabel={`使用${item.company || '不限公司'}，${item.role}`} accessibilityState={{ selected: active }} onPress={() => onUse(item.id)} style={({ pressed }) => ({ flex: 1, minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 9, opacity: pressed ? .6 : 1 })}><View style={{ width: 20 }}>{active ? <Check size={18} color={c.accent} /> : null}</View><View style={{ flex: 1, gap: 3 }}><Text numberOfLines={1} style={[s.body, { color: active ? c.accent : c.text, fontWeight: '700' }]}>{item.role}</Text><Text numberOfLines={1} style={[s.small, { color: c.muted }]}>{item.company || '公司不限'} · {item.jd.trim() ? '已保存 JD' : '未填写 JD'}{active ? ' · 当前目标' : ''}</Text></View></Pressable><IconButton label={`编辑${item.role}`} onPress={() => onEdit(item)}><Pencil size={17} color={c.muted} /></IconButton><IconButton label={`删除${item.role}`} onPress={() => onDelete(item)}><Trash2 size={17} color={c.muted} /></IconButton></View>;
});
export const TargetEditor = memo(function TargetEditor({ onClose }: { onClose: () => void }) {
  const c = usePalette(), targets = useTargets(), account = owner();
  const [draft, setDraft] = useState<Target | null>(() => targets.items.length ? null : fresh());
  const [error, setError] = useState('');
  const use = useCallback((id: string) => { Keyboard.dismiss(); updateTargets(state => ({ ...state, activeId: id }), account); onClose(); }, [account, onClose]);
  const edit = useCallback((item: Target) => { setError(''); setDraft({ ...item }); }, []);
  const remove = useCallback((item: Target) => Alert.alert('删除这套目标？', `${item.company || '公司不限'} · ${item.role}\n已保存的面试记录会保留。`, [{ text: '取消', style: 'cancel' }, { text: '删除', style: 'destructive', onPress: () => updateTargets(state => { const items = state.items.filter(value => value.id !== item.id); return { items, activeId: state.activeId === item.id ? items[0]?.id || '' : state.activeId }; }, account) }]), [account]);
  const render = useCallback(({ item }: { item: Target }) => <TargetRow item={item} active={item.id === targets.activeId} onUse={use} onEdit={edit} onDelete={remove} />, [targets.activeId, use, edit, remove]);
  const add = () => { if (targets.items.length >= 30) { setError('最多保存30套目标，请先删除不再需要的目标'); return; } setError(''); setDraft(fresh()); };
  const save = () => {
    if (!draft || !draft.role.trim()) { setError('填写目标岗位'); return; }
    const value = { ...draft, role: draft.role.trim(), company: draft.company.trim(), jd: draft.jd.trim() };
    Keyboard.dismiss(); updateTargets(state => ({ activeId: value.id, items: state.items.some(item => item.id === value.id) ? state.items.map(item => item.id === value.id ? value : item) : [...state.items, value] }), account); onClose();
  };
  return <Sheet title="求职目标" visible heightRatio={.8} scroll={false} onClose={onClose}>{draft ? <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}><Pressable accessibilityRole="button" onPress={() => { Keyboard.dismiss(); setDraft(null); }} style={[s.row, { minHeight: 44 }]}><ChevronLeft size={18} color={c.accent} /><Text style={[s.small, { color: c.accent }]}>返回目标列表</Text></Pressable><Field label="目标岗位" value={draft.role} onChangeText={role => setDraft(value => value ? { ...value, role } : value)} maxLength={100} placeholder="例如：Java 后端工程师、产品经理" /><Field label="目标公司（可选）" value={draft.company} onChangeText={company => setDraft(value => value ? { ...value, company } : value)} maxLength={100} placeholder="填写公司，匹配相关资料与问题" /><Field label="岗位 JD（可选）" value={draft.jd} onChangeText={jd => setDraft(value => value ? { ...value, jd } : value)} multiline maxLength={8000} placeholder="粘贴岗位职责和要求，简历诊断与模拟面试共用" /><ErrorText text={error} /><Button label="保存并使用" onPress={save} /></ScrollView> : <FlashList data={targets.items} keyExtractor={key} renderItem={render} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 16 }} ListHeaderComponent={<View style={{ gap: 8, paddingBottom: 10 }}><Text style={[s.small, { color: c.muted }]}>点击切换目标；公司、岗位和 JD 一起生效。</Text><ErrorText text={error} /><Button label="新增目标" subtle icon={<Plus size={18} color={c.accent} />} onPress={add} /></View>} ListEmptyComponent={<Empty title="还没有保存的目标" detail="添加一套公司、岗位和 JD，随时在这里切换。" />} ListFooterComponent={<View style={{ paddingTop: 14 }}><Button label="设置我的 AI 引擎" subtle onPress={() => { onClose(); app.ai.openSettings(); }} /></View>} />}</Sheet>;
});
