import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';
import { Bookmark, Check, ChevronDown, ChevronUp, RefreshCw, Send, Sparkles } from 'lucide-react-native';
import { getAppContext, type ShareParams } from '@zijinhua/app-sdk';
import { useTheme } from '@zijinhua/app-sdk/ui';
import { choose, MEALS, parseMeal, type Meal, type Preferences } from './meals';

const DEFAULT: Preferences = { taste: '随意', budget: 50, minutes: 30, vegetarian: false };
const app = getAppContext();
function readFavorites(): Meal[] {
  try { const value = JSON.parse(app.storage.get('favorites') || '[]'); return Array.isArray(value) ? value.map(parseMeal).filter((x): x is Meal => !!x).slice(0, 12) : []; } catch { return []; }
}
function Bowl({ color, muted }: { color: string; muted: string }) {
  return <Svg width={88} height={66} viewBox="0 0 180 130" accessibilityElementsHidden>
    <Ellipse cx="90" cy="114" rx="56" ry="6" fill={muted} opacity={0.15}/>
    <Path d="M29 58 Q35 111 90 111 Q145 111 151 58Z" fill={color}/>
    <Ellipse cx="90" cy="58" rx="61" ry="19" fill={muted}/>
    <Ellipse cx="90" cy="55" rx="52" ry="13" fill="#F5E5BB"/>
    <Path d="M48 54 Q64 32 86 52 M78 59 Q99 36 124 55" stroke="#D6AC60" strokeWidth="7" fill="none" strokeLinecap="round"/>
    <Circle cx="67" cy="49" r="8" fill="#E87953"/><Circle cx="112" cy="52" r="7" fill="#E87953"/>
    <Path d="M83 50 Q90 30 107 35 Q99 54 83 50 M54 61 Q51 45 39 44 Q37 61 54 61" fill="#71966A"/>
    <Path d="M124 32 L156 8 M131 36 L166 12" stroke={color} strokeWidth="5" strokeLinecap="round"/>
  </Svg>;
}

type MealCardProps = { colors: ReturnType<typeof useTheme>['colors']; current: Meal; shared: boolean; favorite: boolean; save: () => void; reroll: () => void; share: () => void };
const MealCard = React.memo(function MealCard({ colors: c, current, shared, favorite, save, reroll, share }: MealCardProps) {
  const [details, setDetails] = useState<string>();
  const expanded = details === current.id;
  return <View style={[s.card, { backgroundColor: c.surface, borderColor: c.line }]}>
    <View style={s.cardTop}><Text style={[s.eyebrow, { color: c.greenText }]}>{shared ? '朋友的晚餐邀请' : '今晚就试试这个'}</Text><Pressable accessibilityRole="button" accessibilityLabel={favorite ? '取消收藏' : '收藏这道菜'} accessibilityState={{ selected: favorite }} onPress={save} style={s.icon}><Bookmark size={21} color={favorite ? c.green : c.muted} fill={favorite ? c.green : 'transparent'}/></Pressable></View>
    <View style={s.mealHeading}><View style={{ flex: 1 }}><Text style={[s.mealName, { color: c.text }]}>{current.name}</Text><Text numberOfLines={2} style={[s.description, { color: c.muted }]}>{current.description}</Text></View><Bowl color={c.green} muted={c.greenTint}/></View>
    <View style={s.stats}>{[`约 ¥${current.price} / 人`, `${current.minutes} 分钟`, current.vegetarian ? '蛋奶素食' : current.taste].map(t => <Text key={t} style={[s.stat, { color: c.greenText, backgroundColor: c.greenTint }]}>{t}</Text>)}</View>
    <View style={s.actions}><Pressable accessibilityRole="button" onPress={reroll} style={({ pressed }) => [s.primary, { backgroundColor: c.greenTint, opacity: pressed ? 0.65 : 1 }]}><RefreshCw size={18} color={c.greenText}/><Text style={[s.buttonText, { color: c.greenText }]}>换一个</Text></Pressable><Pressable accessibilityRole="button" onPress={share} style={({ pressed }) => [s.secondary, { borderColor: c.line, opacity: pressed ? 0.65 : 1 }]}><Send size={17} color={c.text}/><Text style={[s.buttonText, { color: c.text }]}>一起吃</Text></Pressable></View>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setDetails(expanded ? undefined : current.id)} style={[s.detailsToggle, { borderTopColor: c.line }]}><Text style={{ color: c.muted, fontSize: 13 }}>{expanded ? '收起食材和做法' : '查看食材和做法'}</Text>{expanded ? <ChevronUp size={17} color={c.muted}/> : <ChevronDown size={17} color={c.muted}/>}</Pressable>
    {expanded && <View><Text style={[s.sectionTitle, { color: c.text }]}>准备这些就好</Text><Text style={[s.ingredients, { color: c.muted }]}>{current.ingredients.join('  ·  ')}</Text>{current.steps.map((step, i) => <View key={i} style={s.step}><Text style={[s.number, { color: c.greenText, backgroundColor: c.greenTint }]}>{i + 1}</Text><Text style={[s.stepText, { color: c.text }]}>{step}</Text></View>)}</View>}
  </View>;
});

export default function App() {
  const { colors: c } = useTheme();
  const [prefs, setPrefs] = useState(DEFAULT);
  const [filter, setFilter] = useState<'taste' | 'budget' | 'time'>();
  const [current, setCurrent] = useState<Meal>(() => { try { return parseMeal(JSON.parse(app.storage.get('last-meal') || 'null')) || MEALS[0]; } catch { return MEALS[0]; } });
  const [favorites, setFavorites] = useState(readFavorites);
  const [shared, setShared] = useState(false);
  const [busy, setBusy] = useState(false);
  const [wish, setWish] = useState('');
  const [error, setError] = useState('');
  const [showSaved, setShowSaved] = useState(false);
  const request = useRef<AbortController | null>(null);
  const revision = useRef(0);
  const scroll = useRef<ScrollView>(null);
  const favorite = favorites.some(m => m.id === current.id);
  const cancelAi = useCallback(() => { revision.current++; request.current?.abort(); request.current = null; setBusy(false); }, []);
  useEffect(() => {
    function receive(params?: ShareParams) {
      cancelAi(); const meal = parseMeal(params?.meal); setShared(!!meal);
      if (meal) { setCurrent(meal); setError(''); scroll.current?.scrollTo({ y: 0, animated: false }); }
      else if (params?.meal) setError('这个分享内容不完整，先看看今天的推荐吧。');
    }
    const unsubscribe = app.sharing.subscribe(receive); receive(app.sharing.getParams());
    return () => { unsubscribe(); revision.current++; request.current?.abort(); };
  }, [cancelAi]);
  useEffect(() => { try { app.storage.set('last-meal', JSON.stringify(current)); } catch {} }, [current]);
  useEffect(() => app.storage.subscribe('favorites', () => setFavorites(readFavorites())), []);
  const change = useCallback((next: Preferences) => {
    cancelAi(); setPrefs(next); setShared(false);
    const meal = choose(next, current.id);
    setError(meal ? '' : '这些条件暂时没有匹配，试试放宽预算或时间。');
    if (meal) setCurrent(meal);
  }, [cancelAi, current.id]);
  const reroll = useCallback(() => { change(prefs); app.haptics.trigger('selection'); }, [change, prefs]);
  const save = useCallback(() => {
    const next = favorite ? favorites.filter(m => m.id !== current.id) : [current, ...favorites].slice(0, 12);
    setFavorites(next); app.haptics.trigger('selection');
    try { app.storage.set('favorites', JSON.stringify(next)); } catch { app.toast.show('收藏未能保存，请重试'); }
  }, [current, favorites, favorite]);
  const share = useCallback(() => {
    void app.sharing.open({ title: `今晚吃${current.name}？`, description: current.description, params: { meal: { ...current } } }).catch(() => app.toast.show('分享面板未能打开，请重试'));
  }, [current]);
  const ai = async () => {
    if (request.current) return;
    const controller = new AbortController(); request.current = controller;
    const ownRevision = ++revision.current; setBusy(true); setError('');
    try {
      const result = await app.ai.complete({ messages: [
        { role: 'system', content: '你是晚餐灵感助手。只输出一个JSON对象，不加markdown：{id,name,description,price,minutes,taste,vegetarian,ingredients,steps}。id用英文短横线；name最多30字；description最多80字；price为单人食材估算人民币数值；minutes为正整数；taste仅清淡/香辣/家常；vegetarian为布尔值（可以含蛋奶，不含肉、鱼或肉汤）；ingredients为3到8个短字符串，steps为3到6个简短烹饪步骤。必须符合用户条件，步骤说明肉类完全熟透。' },
        { role: 'user', content: `请推荐一道与${current.name}不同的家常晚餐。口味${prefs.taste}，食材预算不超过${prefs.budget}元，制作不超过${prefs.minutes}分钟，${prefs.vegetarian ? '蛋奶素食' : '荤素均可'}。额外想法：${wish.trim() || '简单好做'}。` },
      ], maxTokens: 900 }, { signal: controller.signal });
      if (revision.current !== ownRevision || controller.signal.aborted) return;
      if (!result.ok) {
        if (result.code === 'NOT_CONFIGURED') { setError('先在生花中配置 AI 引擎，再来生成专属晚餐。'); app.ai.openSettings(); }
        else if (result.code !== 'CANCELLED') setError('AI 暂时没给出建议，当前选择还在，可以重试。');
        return;
      }
      const text = result.text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
      const meal = parseMeal(JSON.parse(text));
      if (!meal || meal.price > prefs.budget || meal.minutes > prefs.minutes || prefs.vegetarian && !meal.vegetarian || prefs.taste !== '随意' && meal.taste !== prefs.taste) { setError('AI 的建议不符合当前条件，换个想法再试试。'); return; }
      setCurrent({ ...meal, id: `ai-${Date.now().toString(36)}` }); setShared(false); scroll.current?.scrollTo({ y: 0, animated: true });
    } catch { if (!controller.signal.aborted && revision.current === ownRevision) setError('没能生成有效建议，当前选择已保留，请重试。'); }
    finally { if (request.current === controller) { request.current = null; setBusy(false); } }
  };
  const chip = (label: string, selected: boolean, onPress: () => void) => <Pressable key={label} onPress={onPress} accessibilityRole="button" accessibilityState={{ selected }} style={({ pressed }) => [s.chip, { backgroundColor: selected ? c.greenTint : c.surface, borderColor: selected ? c.green : c.line, opacity: pressed ? 0.65 : 1 }]}><Text style={{ color: selected ? c.greenText : c.muted, fontSize: 13, fontWeight: selected ? '700' : '500' }}>{label}</Text></Pressable>;
  return <SafeAreaView style={[s.root, { backgroundColor: c.canvas }]}>
    <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
      <View style={s.header}><View><Text style={[s.title, { color: c.text }]}>今晚吃啥</Text><Text style={[s.subtitle, { color: c.muted }]}>少一点纠结，好好吃饭。</Text></View><Pressable accessibilityRole="button" accessibilityLabel="查看收藏" onPress={() => { setShowSaved(v => !v); }} style={[s.icon, { backgroundColor: c.surface }]}><Bookmark size={21} color={showSaved ? c.green : c.text}/></Pressable></View>
      <View style={s.controls}>
        <View style={s.filterRow}>{(['taste', 'budget', 'time'] as const).map(key => <Pressable key={key} accessibilityRole="button" accessibilityState={{ expanded: filter === key }} accessibilityLabel={key === 'taste' ? '选择口味' : key === 'budget' ? '选择预算' : '选择时间'} onPress={() => setFilter(value => value === key ? undefined : key)} style={[s.filter, { backgroundColor: c.surface, borderColor: filter === key ? c.green : c.line }]}><Text style={{ color: c.text, fontSize: 12 }}>{key === 'taste' ? prefs.vegetarian ? '蛋奶素 · ' + prefs.taste : '口味 · ' + prefs.taste : key === 'budget' ? '预算 · ¥' + prefs.budget : '时间 · ' + prefs.minutes + '分'}</Text><ChevronDown size={14} color={c.muted}/></Pressable>)}</View>
        {filter && <View style={[s.filterOptions, { backgroundColor: c.surface, borderColor: c.line }]}><View style={s.chips}>{filter === 'taste' ? ['随意', '家常', '清淡', '香辣'].map(t => chip(t, prefs.taste === t, () => { change({ ...prefs, taste: t }); setFilter(undefined); })) : filter === 'budget' ? [15, 30, 50].map(n => chip('¥' + n + '以内', prefs.budget === n, () => { change({ ...prefs, budget: n }); setFilter(undefined); })) : [10, 20, 30].map(n => chip(n + '分钟内', prefs.minutes === n, () => { change({ ...prefs, minutes: n }); setFilter(undefined); }))}</View>{filter === 'taste' && <View style={s.chips}>{chip('只看蛋奶素食', prefs.vegetarian, () => change({ ...prefs, vegetarian: !prefs.vegetarian }))}</View>}</View>}
        <View style={[s.aiCard, { borderColor: c.line, backgroundColor: c.surface }]}><View style={s.aiHeading}><Sparkles size={14} color={c.green}/><Text style={{ color: c.muted, fontSize: 12 }}>家里有什么？让 AI 帮你搭配</Text></View><View style={s.aiRow}><TextInput value={wish} onChangeText={setWish} maxLength={120} placeholder="土豆、鸡蛋，想少洗一个锅…" placeholderTextColor={c.muted} accessibilityLabel="告诉AI现有食材和想法" style={[s.input, { color: c.text, backgroundColor: c.field }]}/><Pressable accessibilityRole="button" accessibilityLabel={busy ? '取消AI推荐' : '生成AI晚餐建议'} onPress={busy ? cancelAi : () => void ai()} style={[s.aiButton, { backgroundColor: c.greenTint }]}>{busy ? <ActivityIndicator size="small" color={c.green}/> : <Sparkles size={15} color={c.greenText}/>}<Text style={{ color: c.greenText, fontWeight: '700', fontSize: 12 }}>{busy ? '取消' : '出主意'}</Text></Pressable></View></View>
      </View>
      {showSaved && <View style={[s.saved, { backgroundColor: c.surface, borderColor: c.line }]}><Text style={[s.sectionTitle, { color: c.text }]}>我的收藏 · {favorites.length}</Text>{!favorites.length ? <Text style={{ color: c.muted }}>遇到喜欢的菜，点卡片上的收藏就能留下。</Text> : favorites.map(m => <Pressable key={m.id} accessibilityRole="button" onPress={() => { cancelAi(); setCurrent(m); setShared(false); setError(''); setShowSaved(false); }} style={[s.savedRow, { borderBottomColor: c.line }]}><Text style={{ color: c.text, flex: 1 }}>{m.name}</Text>{m.id === current.id ? <Check size={18} color={c.green}/> : <Text style={{ color: c.muted }}>{m.minutes} 分钟</Text>}</Pressable>)}</View>}
      <MealCard colors={c} current={current} shared={shared} favorite={favorite} save={save} reroll={reroll} share={share}/>
      {error ? <Text accessibilityRole="alert" style={[s.error, { color: c.orangeText, backgroundColor: c.orangeTint }]}>{error}</Text> : null}


      <Text style={[s.footnote, { color: c.muted }]}>单人食材估算 · 时间不含采购 · AI 需配置引擎</Text>
    </ScrollView>
  </SafeAreaView>;
}
const s = StyleSheet.create({
  root: { flex: 1 }, content: { padding: 16, gap: 12, paddingBottom: 24 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, title: { fontSize: 24, fontWeight: '800' }, subtitle: { fontSize: 12, marginTop: 4 }, eyebrow: { fontSize: 12, fontWeight: '700' }, icon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  controls: { gap: 8 }, filterRow: { flexDirection: 'row', gap: 6 }, filter: { flex: 1, minHeight: 44, borderWidth: 1, borderRadius: 12, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 2 }, filterOptions: { padding: 10, gap: 8, borderWidth: 1, borderRadius: 14 }, chips: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' }, chip: { borderWidth: 1, borderRadius: 10, minHeight: 44, paddingHorizontal: 12, justifyContent: 'center' },
  aiCard: { padding: 10, gap: 8, borderWidth: 1, borderRadius: 16 }, aiHeading: { flexDirection: 'row', gap: 6, alignItems: 'center' }, aiRow: { flexDirection: 'row', gap: 8 }, input: { flex: 1, minWidth: 0, minHeight: 44, paddingHorizontal: 10, borderRadius: 10, fontSize: 13 }, aiButton: { minWidth: 80, minHeight: 44, paddingHorizontal: 10, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  card: { borderRadius: 22, borderWidth: 1, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 }, cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, mealHeading: { flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 2 }, mealName: { fontSize: 23, fontWeight: '800' }, description: { fontSize: 13, lineHeight: 20, marginTop: 6 }, stats: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 12 }, stat: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, fontSize: 11 }, actions: { flexDirection: 'row', gap: 8, marginTop: 14 }, primary: { flex: 1, minHeight: 44, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, secondary: { flex: 1, minHeight: 44, borderRadius: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, buttonText: { fontSize: 14, fontWeight: '700' }, detailsToggle: { minHeight: 44, marginTop: 12, borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, sectionTitle: { fontSize: 14, fontWeight: '700' }, ingredients: { fontSize: 13, lineHeight: 21, marginTop: 8, marginBottom: 6 }, step: { flexDirection: 'row', gap: 10, marginVertical: 6 }, number: { width: 22, height: 22, borderRadius: 11, textAlign: 'center', lineHeight: 22, fontSize: 11, overflow: 'hidden' }, stepText: { flex: 1, fontSize: 13, lineHeight: 22 }, saved: { gap: 8, padding: 14, borderRadius: 16, borderWidth: 1 }, savedRow: { minHeight: 48, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }, error: { padding: 10, borderRadius: 12, fontSize: 12, lineHeight: 18 }, footnote: { fontSize: 10, lineHeight: 16, textAlign: 'center' },
});
