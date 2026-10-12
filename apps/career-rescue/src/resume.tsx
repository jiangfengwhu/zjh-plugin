import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Keyboard, ScrollView, Text, TextInput, View } from 'react-native';
import { Copy, FileText, Image, Save, Square, Upload } from 'lucide-react-native';
import { app, data, owner, roleName, updateState, useCareerField } from './model';
import { AiPrivacy, useAi } from './coach';
import { Action, Card, IconAction, styles, usePalette } from './ui';
import { blankJob, getWorkspace, parseResumeReview, saveResume, uniqueId, updateWorkspace, useWorkspace, type Job, type ResumeReview } from './workspace';
import type { Question } from './content';
const fail = (e: unknown) => app.toast.show(e instanceof Error ? e.message : '操作未完成，请重试', 'error');

const Review = memo(function Review({ result, stale, onAdopt, onPractice }: { result: ResumeReview; stale: boolean; onAdopt: (before: string, after: string) => void; onPractice: (q: Question) => void }) {
  const c = usePalette();
  return <View style={{ gap: 12 }}><View style={styles.spread}><Text style={[styles.heading, { color: c.text }]}>JD 与原文证据对照</Text><Text style={[styles.small, { color: stale ? c.orange : c.muted }]}>{stale ? '正文或 JD 已改，请重新诊断' : '基于本次输入'}</Text></View><Text selectable style={[styles.body, { color: c.text }]}>{result.summary}</Text>
    {result.requirements.map((r, i) => <View key={i} style={{ paddingVertical: 9, borderTopWidth: 1, borderColor: c.line, gap: 5 }}><View style={styles.spread}><Text style={[styles.heading, { flex: 1, color: c.text }]}>{i + 1}. {r.requirement}</Text><Text style={[styles.small, { color: r.status === '有证据' ? c.primary : c.orange }]}>{r.status}</Text></View><Text selectable style={[styles.small, { color: c.muted }]}>JD 原文：{r.quotedJd}</Text><Text selectable style={[styles.body, { color: c.text }]}>简历证据：{r.evidence || '当前正文未找到对应证据'}</Text><Text selectable style={[styles.body, { color: c.primary }]}>下一步：{r.action}</Text></View>)}
    <Text style={[styles.heading, { color: c.text }]}>逐段改写，自己确认后采用</Text>{result.rewrites.map((r, i) => <Card key={i}><Text style={[styles.small, { color: c.muted }]}>改写前 · 你的原文</Text><Text selectable style={[styles.body, { color: c.text }]}>{r.before}</Text><View style={{ borderLeftWidth: 3, borderColor: c.primary, paddingLeft: 9, gap: 4 }}><Text style={[styles.small, { color: c.primary }]}>改写后 · 待确认表达</Text><Text selectable style={[styles.body, { color: c.text }]}>{r.after}</Text></View><Text style={[styles.small, { color: c.muted }]}>{r.why}</Text>{r.missingFacts.length ? <Text style={[styles.small, { color: c.orange }]}>先补事实：{r.missingFacts.join('；')}</Text> : null}<Action label="采用这一段" subtle onPress={() => onAdopt(r.before, r.after)} /></Card>)}
    <Text style={[styles.heading, { color: c.text }]}>面试官可能沿着这些地方追问</Text>{result.interviewQuestions.map((r, i) => <Card key={i}><Text style={[styles.body, { color: c.text }]}>{r.question}</Text><Text style={[styles.small, { color: c.muted }]}>{r.basis}</Text><Action label="拿这题练一次" subtle onPress={() => onPractice({ id: 'resume-' + i + '-' + uniqueId(), role: '通用', tag: '简历追问', title: r.question, intent: r.basis, outline: ['只讲真实职责、动作和结果。', '缺少信息时直接说明，再补充证据。'], avoid: '不编造经历、数字或公司事实。' })} /></Card>)}
    {result.formatChecks.length ? <View style={{ gap: 5 }}><Text style={[styles.heading, { color: c.text }]}>提交前自行核对</Text>{result.formatChecks.map((s, i) => <Text key={i} style={[styles.body, { color: c.text }]}>{i + 1}. {s}</Text>)}<Text style={[styles.small, { color: c.muted }]}>这里只检查正文。原文件的栏位、字体和 PDF 文字层需在投递前核对。</Text></View> : null}
  </View>;
});
export const Resume = memo(function Resume({ active, onProfile, onTrack, onPractice, onTopic }: { active: boolean; onProfile: () => void; onTrack: (job: Job) => void; onPractice: (q: Question) => void; onTopic: (topic: string) => void }) {
  const c = usePalette(), career = { profile: useCareerField('profile') }, work = useWorkspace(), ai = useAi(active), account = owner();
  const [draft, setDraft] = useState(work.resume), latest = useRef(draft), dirty = useRef(false), [showInput, setShowInput] = useState(!work.resume), [showJd, setShowJd] = useState(!career.profile.jd), [jd, setJd] = useState(career.profile.jd), latestJd = useRef(jd), jdDirty = useRef(false);
  const [importing, setImporting] = useState(false), [error, setError] = useState('');
  const controller = useRef<AbortController | null>(null);
  const save = useCallback(() => { if (dirty.current) { saveResume(latest.current, account); dirty.current = false; } if (jdDirty.current) { updateState(s => ({ ...s, profile: { ...s.profile, jd: latestJd.current } }), account); jdDirty.current = false; } }, [account]);
  useEffect(() => () => { save(); controller.current?.abort(); }, [save]);
  useEffect(() => { if (!active) { save(); controller.current?.abort(); } }, [active, save]);
  useEffect(() => { if (!dirty.current) { setDraft(work.resume); latest.current = work.resume; } }, [work.resume]);
  useEffect(() => { if (!jdDirty.current) { setJd(career.profile.jd); latestJd.current = career.profile.jd; } }, [career.profile.jd]);
  useEffect(() => { if (!dirty.current && !jdDirty.current) return; const timer = setTimeout(save, 600); return () => clearTimeout(timer); }, [draft, jd, save]);
  const setText = (v: string) => { latest.current = v; dirty.current = true; setDraft(v); };
  const importFile = async (image: boolean) => {
    if (controller.current) return; const token = new AbortController(); controller.current = token; setImporting(true); setError('');
    try {
      const path = image ? 'resume/input-image' : 'resume/input-document', input = await data.files.importFile(path, { mime: image ? 'image/*' : '*/*', maxBytes: image ? 10 * 1024 * 1024 : 20 * 1024 * 1024, signal: token.signal });
      if (!input.ok) { if (input.code !== 'CANCELLED') throw new Error(input.error); return; }
      let body: string;
      if (image) { const result = await data.files.recognizeText(path, { signal: token.signal }); if (!result.ok) throw new Error(result.error); body = result.text; }
      else {
        const extension = input.name.split('.').pop()?.toLowerCase();
        if (extension === 'txt') body = await data.files.readText(path, { signal: token.signal });
        else if (extension && ['pdf', 'docx', 'doc'].includes(extension)) {
          const result = await data.files.extractText(path, { maxChars: 16001, signal: token.signal });
          if (!result.ok) throw new Error(result.error);
          if (result.truncated) throw new Error('正文超过16000字，请精简简历后重新导入');
          body = result.text;
        } else throw new Error('请选择 PDF、Word（DOCX / DOC）或 TXT 简历');
      }
      if (owner() !== account || token.signal.aborted) return;
      if (!body.trim()) throw new Error('没有提取到正文。扫描版 PDF 请用截图识字，或直接粘贴文字');
      if (body.length > 16000) throw new Error('正文超过16000字，请删减后粘贴');
      const replace = () => { if (owner() !== account) return; setText(body); saveResume(body, account); dirty.current = false; setShowInput(true); };
      if (latest.current.trim()) Alert.alert('替换简历正文？', '当前正文会被替换。已保存的投递版本保留。', [{ text: '取消', style: 'cancel' }, { text: '替换', onPress: replace }]); else replace();
    } catch (e) { if (!token.signal.aborted && owner() === account) setError(e instanceof Error ? e.message : '导入失败'); }
    finally { if (controller.current === token) { controller.current = null; setImporting(false); } }
  };
  const diagnose = async () => {
    save(); Keyboard.dismiss(); setError('');
    const resume = latest.current, job = latestJd.current, sourceAt = getWorkspace().resumeAt;
    if (resume.trim().length < 30) { setShowInput(true); setError('先粘贴至少一段真实经历，再做对照'); return; }
    const raw = await ai.run('只返回JSON，不用markdown，不给ATS分数、匹配分、通过率或满分范例。格式 {"summary":"先修改什么","requirements":[{"requirement":"一项岗位要求","quotedJd":"JD中逐字引用的连续原文","evidence":"简历中逐字引用的连续原文，没有则空字符串","status":"有证据/待补证据/未体现","action":"具体补证据动作"}],"rewrites":[{"before":"逐字引用简历原段落","after":"保留事实的精简改写","why":"改变的理由","missingFacts":["需用户补充的事实"]}],"interviewQuestions":[{"question":"依据简历的一道追问","basis":"追问依据"}],"formatChecks":["用户投递前可自行验证的检查"]}。requirements最多5项，无JD时必须为[]并说明只检查表达；rewrites最多2段，必须至少一段，不能新增学校、雇主、职务、职责范围、日期、数字或成果，缺少信息用［待补充具体内容］。只引用原文已有数据。interviewQuestions给2题。不能从纯文本断言原文件的版式或ATS解析结果。', JSON.stringify({ resume, jd: job, target: roleName(career.profile) }), 3200);
    if (!raw || owner() !== account) return;
    if (latest.current !== resume || latestJd.current !== job) { ai.clear(); setError('输入已修改，这次诊断未保存，请按新正文重新检查'); return; }
    try { const result = parseResumeReview(raw, resume, job); updateWorkspace(s => s.resume === resume && latestJd.current === job ? { ...s, review: { resumeAt: sourceAt, jd: job, result } } : s, account); setShowInput(false); setShowJd(false); ai.clear(); }
    catch (e) { setError(e instanceof Error ? e.message : '诊断格式无效'); ai.clear(); }
  };
  const adopt = useCallback((before: string, after: string) => {
    if (!latest.current.includes(before)) { fail(new Error('这一段原文已改，请重新诊断')); return; }
    Alert.alert('确认这段表达符合事实？', '缺失信息请自行补齐；不会替你提交给招聘方。', [{ text: '再看看', style: 'cancel' }, { text: '采用', onPress: () => { if (owner() !== account || !latest.current.includes(before)) return; const text = latest.current.replace(before, after); latest.current = text; setDraft(text); saveResume(text, account); dirty.current = false; } }]);
  }, [account]);
  const practice = useCallback((q: Question) => { save(); onPractice(q); }, [save, onPractice]);
  const saveVersion = () => { save(); if (!latest.current.trim()) return; const title = [career.profile.company, roleName(career.profile)].filter(Boolean).join(' · '); updateWorkspace(s => ({ ...s, versions: [{ id: uniqueId(), title, body: latest.current, jd: latestJd.current, createdAt: Date.now() }, ...s.versions].slice(0, 8) }), account); app.toast.show('已保存投递版本', 'success'); };
  const exportVersion = async (body: string) => { try { const path = 'resume/export.txt'; await data.files.writeText(path, body); if (owner() !== account) return; const result = await data.files.exportFile(path, { name: '求职简历.txt', mime: 'text/plain' }); if (!result.ok && result.code !== 'CANCELLED') throw new Error(result.error); } catch (e) { fail(e); } };
  const review = work.review, stale = !!review && (review.resumeAt !== work.resumeAt || review.jd !== career.profile.jd);
  return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
    <View style={styles.spread}><View style={{ flex: 1 }}><Text style={[styles.heading, { color: c.text }]}>投递前，先对齐这个岗位</Text><Text style={[styles.small, { color: c.muted }]}>{roleName(career.profile)}{career.profile.company ? ` · ${career.profile.company}` : ''}</Text></View><Action label="调整目标" subtle onPress={onProfile} /></View>
    <View style={{ gap: 4 }}><View style={styles.row}><Action label="导入简历" subtle busy={importing} icon={<Upload size={16} color={c.text} />} onPress={() => void importFile(false)} style={{ flex: 1 }} /><Action label="截图识字" subtle disabled={importing} icon={<Image size={16} color={c.text} />} onPress={() => void importFile(true)} style={{ flex: 1 }} /></View><Text style={[styles.small, { color: c.muted }]}>支持 PDF / Word / TXT · 提取后可编辑，正文保存在本机</Text></View>
    <View style={{ gap: 6 }}><View style={styles.spread}><Text style={[styles.heading, { color: c.text }]}>简历正文 · {draft.length} 字</Text><Action label={showInput ? '收起' : '编辑'} subtle onPress={() => setShowInput(v => !v)} /></View>{showInput ? <TextInput accessibilityLabel="简历正文" value={draft} multiline maxLength={16000} onChangeText={setText} onBlur={save} placeholder="粘贴经历、项目和技能。删去电话、地址等非必要信息；内容保存在本机。" placeholderTextColor={c.muted} style={[styles.field, { color: c.text, backgroundColor: c.surface, borderColor: c.line, minHeight: 100, maxHeight: 180 }]} /> : <Text numberOfLines={3} style={[styles.body, { color: c.muted }]}>{draft || '还没有正文，先粘贴或导入。'}</Text>}</View>
    <View style={{ gap: 6 }}><View style={styles.spread}><Text style={[styles.heading, { color: c.text }]}>目标 JD · {jd.length} 字</Text><Action label={showJd ? '收起' : '编辑'} subtle onPress={() => setShowJd(v => !v)} /></View>{showJd ? <TextInput accessibilityLabel="目标岗位描述" value={jd} multiline maxLength={6000} onChangeText={v => { latestJd.current = v; jdDirty.current = true; setJd(v); }} onBlur={save} placeholder="粘贴这个岗位的职责与要求。没有JD时只做表达检查。" placeholderTextColor={c.muted} style={[styles.field, { color: c.text, backgroundColor: c.surface, borderColor: c.line, minHeight: 80, maxHeight: 160 }]} /> : <Text numberOfLines={3} style={[styles.body, { color: c.muted }]}>{jd || '尚未提供 JD，只能检查表达。'}</Text>}</View>
    <AiPrivacy />{error || ai.error ? <Text accessibilityLiveRegion="polite" style={[styles.body, { color: c.orange }]}>{error || ai.error}</Text> : null}
    <View style={styles.row}><Action label={ai.busy ? '正在对照原文' : jd.trim() ? '检查岗位匹配与表达' : '检查简历表达'} busy={ai.busy} onPress={() => void diagnose()} style={{ flex: 1 }} />{ai.busy ? <IconAction label="停止诊断" onPress={ai.cancel}><Square size={18} color={c.text} /></IconAction> : null}</View>
    <View style={styles.row}><Action label="保存投递版" subtle icon={<Save size={16} color={c.text} />} disabled={!draft.trim()} onPress={saveVersion} style={{ flex: 1 }} /><Action label="记下这个岗位" subtle onPress={() => { save(); onTrack(blankJob(career.profile.company, career.profile.target, latestJd.current)); }} style={{ flex: 1 }} /></View>
    <Text style={[styles.small, { color: c.muted }]}>输出逐项引用你的原文。新增成果、数字和职责必须由你核实；ATS、招聘方筛选结果不会在这里预测。</Text>
    {review ? <Review result={review.result} stale={stale} onAdopt={adopt} onPractice={practice} /> : <Card><Text style={[styles.heading, { color: c.text }]}>现在就能检查三件事</Text><Text style={[styles.body, { color: c.text }]}>① 每段经历有没有具体动作与交付物？{ '\n'}② 岗位要求是否有真实项目证据？{ '\n'}③ 从文件复制出的文字顺序是否正常？</Text><Action label="查看简历改写与 ATS 资料" subtle onPress={() => onTopic('简历')} /></Card>}
    {work.versions.length ? <View style={{ gap: 7 }}><Text style={[styles.heading, { color: c.text }]}>最近投递版本 · 最多 8 份</Text>{work.versions.map(v => <Card key={v.id}><Text style={[styles.body, { color: c.text }]}>{v.title} · {new Date(v.createdAt).toLocaleDateString()}</Text><View style={styles.row}><Action label="复制" subtle icon={<Copy size={15} color={c.text} />} onPress={() => { app.clipboard.set(v.body); app.toast.show('已复制'); }} style={{ flex: 1 }} /><Action label="导出 TXT" subtle icon={<FileText size={15} color={c.text} />} onPress={() => void exportVersion(v.body)} style={{ flex: 1 }} /></View></Card>)}</View> : null}
    <Action label="看看如何解释空窗期、转行与项目成果" subtle onPress={() => onTopic('面试')} />
  </ScrollView>;
});
