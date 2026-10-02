import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Text, TextInput, View } from "react-native";
import { getAppContext } from "@zijinhua/app-sdk";
import { Pressy, Surface, themedStyleSheet, useTheme } from "@zijinhua/app-sdk/ui";

type Draft = { title: string; purpose: string; features: string; excluded: string; acceptance: string; suggestions: string };
type Question = { text: string; options: string[] };
type Preparation = { original: string; answers: string[]; question?: Question; draft?: Draft };
const SYSTEM = `你是 Jolly 的需求整理助手，帮助用户把想法变成简洁、可交付的首版需求。只输出 JSON，不输出 Markdown。
需求已经明确时直接生成需求卡片，不为了完整而追问。不擅自扩展功能、技术架构、商业化或登录需求。
仅当关键歧义会影响实现时，一次问一个简短问题，给 2–3 个互斥快捷选项，允许自由回答。最多两轮，用户选择跳过或已有需求卡片时必须生成卡片。
追问格式：{"kind":"question","question":"问题","options":["选项一","选项二"]}。
卡片格式：{"kind":"draft","title":"短标题","purpose":"用途","features":["明确的核心功能"],"excluded":["明确暂不做的内容"],"acceptance":["用户可验证的完成标准"],"suggestions":["可选的 AI 建议，尚未纳入需求"]}。
不确定但非关键事项采用最小合理默认值，注明为可选建议。建议只能放在 suggestions，不偷偷加入 features。
features 和 acceptance 至少一项，其他数组可为空；每组最多八项。表达简洁，不复述 SDK、发包或平台实现要求。`;

function parseResult(text: string): { question?: Question; draft?: Draft } {
  const start = text.indexOf("{"); const end = text.lastIndexOf("}");
  const value = JSON.parse(text.slice(start, end + 1));
  const string = (input: unknown, max: number) => { if (typeof input !== "string" || !input.trim() || input.length > max) throw new Error("AI 返回的需求格式不完整，请重试"); return input.trim(); };
  const lines = (input: unknown, required = false) => { if (!Array.isArray(input) || input.length > 8 || required && !input.length) throw new Error("AI 返回的需求格式不完整，请重试"); return input.map(item => string(item, 500)).join("\n"); };
  if (value.kind === "question") {
    if (!Array.isArray(value.options) || value.options.length < 2 || value.options.length > 3) throw new Error("AI 返回的追问格式不完整，请重试");
    return { question: { text: string(value.question, 300), options: value.options.map((item: unknown) => string(item, 100)) } };
  }
  if (value.kind !== "draft") throw new Error("AI 返回的需求格式不完整，请重试");
  return { draft: { title: string(value.title, 80), purpose: string(value.purpose, 1000), features: lines(value.features, true), excluded: lines(value.excluded), acceptance: lines(value.acceptance, true), suggestions: lines(value.suggestions) } };
}

export function RequirementComposer({ appId, value, onChange, disabled, visible, onStart }: { appId: string; value: string; onChange: (value: string) => void; disabled: boolean; visible: boolean; onStart: (prompt: string) => void }) {
  const context = getAppContext(); const { colors } = useTheme();
  const [scope] = useState(() => context.storage.get("__accountScope")); const key = `requirementDraft.${appId}`;
  const [saved] = useState<Preparation | undefined>(() => { try {
    const item = JSON.parse(context.storage.get(key) || "null");
    if (!item || typeof item.original !== "string" || !Array.isArray(item.answers) || item.answers.length > 2 || item.answers.some((answer: unknown) => typeof answer !== "string")) return undefined;
    if (item.question && (typeof item.question.text !== "string" || !Array.isArray(item.question.options) || item.question.options.some((option: unknown) => typeof option !== "string"))) return undefined;
    if (item.draft && ["title", "purpose", "features", "excluded", "acceptance", "suggestions"].some(field => typeof item.draft[field] !== "string")) return undefined;
    return item;
  } catch { return undefined; } });
  const [preparation, setPreparation] = useState<Preparation>(saved || { original: value, answers: [] });
  const [answer, setAnswer] = useState(""); const [revision, setRevision] = useState(""); const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [needsConfig, setNeedsConfig] = useState(false);
  const request = useRef(0); const working = useRef(false); const alive = useRef(true); const initial = useRef(true);
  useEffect(() => () => { alive.current = false; request.current++; }, []);
  useEffect(() => { if (!visible) { request.current++; working.current = false; setBusy(false); } }, [visible]);
  useEffect(() => {
    if (initial.current) { initial.current = false; if (!value && saved?.original) { onChange(saved.original); return; } }
    if (value !== preparation.original) { request.current++; working.current = false; setBusy(false); setError(""); setPreparation({ original: value, answers: [] }); setAnswer(""); setRevision(""); setEditing(false); }
  }, [value]);
  useEffect(() => { if (context.storage.get("__accountScope") === scope) context.storage.set(key, JSON.stringify(preparation)); }, [preparation]);
  const valid = (id: number) => alive.current && request.current === id && context.storage.get("__accountScope") === scope;
  async function organize(reply?: string, forceDraft = false) {
    if (working.current || disabled || !visible || !preparation.original.trim()) return;
    const next = { ...preparation, question: reply ? undefined : preparation.question, answers: reply ? [...preparation.answers, `${preparation.question?.text || "补充说明"}：${reply}`] : preparation.answers };
    // Preserve answers even if this request fails; retry does not repeat a question.
    setPreparation(next); setAnswer(""); const id = ++request.current; working.current = true; setBusy(true); setError(""); setNeedsConfig(false);
    try {
      if (!context.ai) throw new Error("请先更新紫金花平台，再整理想法");
      const providers = await context.ai.listProviders();
      if (!valid(id)) return;
      if (!providers.length) { setNeedsConfig(true); throw new Error("还没有配置 AI 引擎，可以配置后整理，也可以直接按原文制作。"); }
      const result = await context.ai.complete({ messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: JSON.stringify({ original: next.original, answers: next.answers, existingDraft: next.draft, modification: revision.trim() || undefined, mustDraft: forceDraft || Boolean(next.draft) || next.answers.length >= 2 }) },
      ] });
      if (!valid(id)) return;
      if (!result.ok) { if (result.code === "NOT_CONFIGURED") setNeedsConfig(true); throw new Error(result.error); }
      const parsed = parseResult(result.text);
      if (parsed.question && (forceDraft || next.draft || next.answers.length >= 2)) throw new Error("AI 仍在追问，请重试生成需求卡片，或直接按原文制作。");
      setPreparation({ original: next.original, answers: next.answers, ...parsed }); setRevision(""); setEditing(false);
    } catch (e) { if (valid(id)) { setError(e instanceof Error ? e.message : "整理失败，请重试"); context.toast.show("需求整理未完成，原文已保留", "error"); } }
    finally { if (valid(id)) { working.current = false; setBusy(false); } }
  }
  function start(raw = false) {
    if (disabled || working.current || !visible || context.storage.get("__accountScope") !== scope) return;
    const draft = preparation.draft;
    if (!raw && draft && (!draft.title.trim() || !draft.purpose.trim() || !draft.features.trim() || !draft.acceptance.trim())) { setError("请补全名称、用途、首版功能和完成标准"); return; }
    const original = preparation.original.trim(); if (!original) return;
    const text = raw || !draft ? original : `用户原始想法：\n${original}\n\n以下是用户已确认的首版需求，以此为实现范围：\n应用名称：${draft.title}\n用途：${draft.purpose}\n首版功能：\n${draft.features}\n暂不包含：\n${draft.excluded || "无额外排除项"}\n完成标准：\n${draft.acceptance}\n不要将未确认的 AI 建议自动加入首版。`;
    onStart(text);
  }
  const locked = disabled || busy;
  return <Surface style={styles.card}>
    <Text style={styles.title}>先把想法说清楚</Text>
    <Text style={styles.caption}>整理和追问不会开始制作，确认后再开工。</Text>
    {!preparation.draft && !preparation.question ? <TextInput accessibilityLabel="原始想法" multiline maxLength={6000} editable={!locked} value={value} onChangeText={onChange} placeholder="说说你想做什么小应用" placeholderTextColor={colors.ink3} style={styles.input} /> : <Text selectable style={styles.caption}>原始想法：{preparation.original}</Text>}
    {preparation.question ? <View style={styles.section}><Text style={styles.title}>{preparation.question.text}</Text><Text style={styles.caption}>补充问题 {Math.min(preparation.answers.length + 1, 2)}/2</Text>
      {preparation.question.options.map(option => <Pressy key={option} disabled={locked} onPress={() => void organize(option)} style={styles.option}><Text style={styles.link}>{option}</Text></Pressy>)}
      <TextInput accessibilityLabel="补充回答" multiline maxLength={1500} editable={!locked} value={answer} onChangeText={setAnswer} placeholder="也可以自己补充" placeholderTextColor={colors.ink3} style={styles.input} />
      <View style={styles.actions}><Pressy disabled={locked || !answer.trim()} onPress={() => void organize(answer.trim())}><Text style={styles.link}>提交回答</Text></Pressy><Pressy disabled={locked} onPress={() => void organize(undefined, true)}><Text style={styles.link}>跳过，生成需求</Text></Pressy></View>
    </View> : null}
    {preparation.draft ? <View style={styles.section}><Text style={styles.caption}>需求卡片 · 可以直接修改</Text>
      {([["title", "应用名称"], ["purpose", "用途"], ["features", "首版功能"], ["excluded", "暂不包含"], ["acceptance", "完成标准"]] as const).map(([field, label]) => <View key={field}><Text style={styles.caption}>{label}</Text><TextInput accessibilityLabel={label} multiline maxLength={field === "title" ? 80 : 4000} editable={!locked} value={preparation.draft![field]} onChangeText={text => setPreparation(current => ({ ...current, draft: { ...current.draft!, [field]: text } }))} style={styles.input} /></View>)}
      {preparation.draft.suggestions ? <View><Text style={styles.caption}>AI 建议 · 未纳入首版</Text><Text style={styles.copy}>{preparation.draft.suggestions}</Text></View> : null}
      {editing ? <View style={styles.section}><TextInput accessibilityLabel="修改想法" multiline maxLength={2000} editable={!locked} value={revision} onChangeText={setRevision} placeholder="例如：再加一个预算提醒" placeholderTextColor={colors.ink3} style={styles.input} /><Pressy disabled={locked || !revision.trim()} onPress={() => void organize(undefined, true)}><Text style={styles.link}>更新需求卡片</Text></Pressy></View> : null}
      <View style={styles.actions}><Pressy disabled={locked} onPress={() => setEditing(value => !value)}><Text style={styles.link}>{editing ? "收起修改" : "修改想法"}</Text></Pressy><Pressy disabled={locked || Boolean(revision.trim())} onPress={() => start()}><Text style={styles.link}>开始制作</Text></Pressy></View>
      {revision.trim() ? <Text style={styles.caption}>先更新卡片，再确认开始制作。</Text> : null}
    </View> : null}
    {busy ? <View style={styles.actions}><ActivityIndicator color={colors.accent} /><Text accessibilityLiveRegion="polite" style={styles.caption}>正在整理你的想法…</Text></View> : null}
    {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
    {needsConfig ? <Pressy disabled={locked} onPress={() => context.ai.openSettings()}><Text style={styles.link}>配置 AI 引擎</Text></Pressy> : null}
    {preparation.question ? <Pressy disabled={locked} onPress={() => { setPreparation({ original: value, answers: [] }); setError(""); setAnswer(""); }}><Text style={styles.caption}>返回修改原始想法</Text></Pressy> : null}
    {!preparation.draft ? <View style={styles.actions}>{!preparation.question || error ? <Pressy disabled={locked || !value.trim()} onPress={() => void organize(undefined, preparation.answers.length >= 2)}><Text style={styles.link}>{error ? "重新整理" : "整理想法"}</Text></Pressy> : null}<Pressy disabled={locked || !value.trim()} onPress={() => start(true)}><Text style={styles.caption}>直接按原文制作</Text></Pressy></View> : null}
  </Surface>;
}
const styles = themedStyleSheet(t => ({ card: { padding: 18, gap: 14 }, section: { gap: 12 }, title: { color: t.ink1, fontSize: 17, fontWeight: "600" }, caption: { color: t.ink3, fontSize: 13, lineHeight: 20 }, copy: { color: t.ink2, lineHeight: 22 }, input: { color: t.ink1, backgroundColor: t.field, borderRadius: 12, padding: 12, minHeight: 48, textAlignVertical: "top" as const }, actions: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 20 }, link: { color: t.accentText, fontSize: 14, paddingVertical: 10 }, option: { backgroundColor: t.field, paddingHorizontal: 12, borderRadius: 12 }, error: { color: t.orangeText, fontSize: 13, lineHeight: 20 } }));
