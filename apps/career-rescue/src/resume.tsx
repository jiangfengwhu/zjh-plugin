import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Image, Keyboard, Modal, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Pdf from 'react-native-pdf';
import { Copy, Eye, FileUp, Sparkles, Square, X } from 'lucide-react-native';
import type { AiAttachment } from '@zijinhua/app-sdk';
import { app, copy, data, inputKey, owner, readState, uid, updateState, useField } from './model';
import { matching, useCatalog } from './content-api';
import { useAi } from './use-ai';
import { Button, Card, Chip, ErrorText, Field, IconButton, Markdown, s, Sheet, usePalette } from './ui';
import type { ResumeFile } from './types';
const mimeByExtension: Record<string, string> = { pdf: 'application/pdf', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', txt: 'text/plain', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
const Preview = memo(function Preview({ file, text, onClose }: { file: ResumeFile; text: string; onClose: () => void }) {
  const c = usePalette(), [error, setError] = useState('');
  const source = useMemo(() => ({ uri: data.files.uri(file.path) }), [file.path]);
  return <Modal visible animationType="slide" onRequestClose={onClose}><SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}><View style={[s.spread, { paddingLeft: 14 }]}><View style={{ flex: 1 }}><Text numberOfLines={1} style={[s.heading, { color: c.text }]}>{file.name}</Text><Text style={[s.small, { color: c.muted }]}>{file.kind === 'pdf' || file.kind === 'image' ? '原文件预览' : 'Word / TXT 正文预览，版式以原文件为准'}</Text></View><IconButton label="关闭预览" onPress={onClose}><X size={20} color={c.text} /></IconButton></View><ErrorText text={error} />{file.kind === 'pdf' ? <Pdf source={source} trustAllCerts={false} onError={() => setError('原文件预览失败，可返回查看解析正文')} style={{ flex: 1, backgroundColor: c.bg }} /> : file.kind === 'image' ? <Image source={source} resizeMode="contain" style={{ flex: 1 }} /> : <ScrollView contentContainerStyle={s.content}><Text selectable style={[s.body, { color: c.text }]}>{text || '尚无解析正文。返回后可手动解析，或直接交给支持文件的模型。'}</Text></ScrollView>}</SafeAreaView></Modal>;
});
export const Resume = memo(function Resume({ active }: { active: boolean }) {
  const c = usePalette(), work = useField('resume'), target = useField('target'), catalog = useCatalog(), ai = useAi(active), account = owner();
  const [text, setText] = useState(work.text), [jd, setJd] = useState(work.jd), [editor, setEditor] = useState(false), [preview, setPreview] = useState(false), [formExpanded, setFormExpanded] = useState(!work.diagnosis && !work.improved), [resultTab, setResultTab] = useState<'diagnosis' | 'improved'>('diagnosis'), [runKind, setRunKind] = useState<'diagnosis' | 'improved'>('diagnosis'), [status, setStatus] = useState(''), [error, setError] = useState('');
  const dirty = useRef(false), latest = useRef({ text, jd }), operation = useRef<AbortController | null>(null), editSequence = useRef(0), generating = useRef(false), previousTarget = useRef(JSON.stringify(target));
  latest.current = { text, jd };
  const save = useCallback(() => { if (!dirty.current) return; const value = latest.current; updateState(state => ({ ...state, resume: { ...state.resume, text: value.text, jd: value.jd } }), account); dirty.current = false; }, [account]);
  useEffect(() => { if (!dirty.current) { setText(work.text); setJd(work.jd); } }, [work.text, work.jd]);
  useEffect(() => { if (!dirty.current) return; const timer = setTimeout(save, 450); return () => clearTimeout(timer); }, [text, jd, save]);
  useEffect(() => { if (!active) { save(); operation.current?.abort(); } return () => { save(); operation.current?.abort(); }; }, [active, save]);
  useEffect(() => { const value = JSON.stringify(target); if (previousTarget.current !== value && generating.current) { operation.current?.abort(); operation.current = null; generating.current = false; setStatus(''); ai.clear(); } previousTarget.current = value; }, [target, ai.clear]);
  const parse = async (file: ResumeFile, token: AbortController) => {
    const startSequence = editSequence.current;
    setStatus('解析正文');
    let body = '';
    if (file.kind === 'txt') body = await data.files.readText(file.path, { signal: token.signal });
    else if (file.kind === 'image') { const result = await data.files.recognizeText(file.path, { signal: token.signal }); if (!result.ok) throw new Error(result.error); body = result.text; }
    else { const result = await data.files.extractText(file.path, { signal: token.signal, maxChars: 50000 }); if (!result.ok) throw new Error(result.error); if (result.truncated) throw new Error('正文超过50000字，请精简后导入，或直接交给模型读取文件'); body = result.text; }
    if (token.signal.aborted || account !== owner() || readState().resume.file?.path !== file.path) return;
    if (editSequence.current !== startSequence) { setError('正文已手动修改，解析结果没有覆盖你的编辑'); return; }
    if (body.length > 50000) throw new Error('正文超过50000字，请精简后导入');
    if (!body.trim()) { setError('未找到文字层。可改用直接文件输入（需模型支持），或上传清晰截图识字。'); return; }
    dirty.current = false; setText(body); latest.current.text = body;
    updateState(state => ({ ...state, resume: { ...state.resume, text: body, jd: latest.current.jd } }), account);
  };
  const upload = async () => {
    if (operation.current) return; save(); ai.clear(); setError(''); setFormExpanded(true);
    const token = new AbortController(); operation.current = token; setStatus('选择文件');
    try {
      const path = 'resume/' + uid(), result = await data.files.importFile(path, { mime: '*/*', maxBytes: 20 * 1024 * 1024, signal: token.signal });
      if (!result.ok) { if (result.code !== 'CANCELLED') throw new Error(result.error); return; }
      const ext = result.name.split('.').pop()?.toLowerCase() ?? '', mime = mimeByExtension[ext];
      if (!mime) { await data.files.remove(path); throw new Error('支持 PDF、DOCX、DOC、TXT、JPG、PNG 和 WebP'); }
      const stat = await data.files.stat(path, { signal: token.signal }); if (!stat.exists || stat.type !== 'file') throw new Error('无法读取文件');
      if (token.signal.aborted || account !== owner()) return;
      const file: ResumeFile = { path, name: result.name, mime, bytes: stat.size, kind: ['pdf', 'doc', 'docx', 'txt'].includes(ext) ? ext as ResumeFile['kind'] : 'image' };
      const previous = readState().resume.file;
      updateState(state => ({ ...state, resume: { ...state.resume, file, text: '', mode: 'text' } }), account);
      dirty.current = false; setText(''); latest.current.text = '';
      if (previous) void data.files.remove(previous.path).catch(() => {});
      await parse(file, token);
    } catch (e) { if (!token.signal.aborted && account === owner()) setError(e instanceof Error ? e.message : '上传失败'); }
    finally { if (operation.current === token) { operation.current = null; setStatus(''); } }
  };
  const parseAgain = async () => {
    if (!work.file || operation.current) return;
    const token = new AbortController(); operation.current = token; setError('');
    try { await parse(work.file, token); } catch (e) { if (!token.signal.aborted) setError(e instanceof Error ? e.message : '解析失败'); }
    finally { if (operation.current === token) { operation.current = null; setStatus(''); } }
  };
  const generate = async (kind: 'diagnosis' | 'improved') => {
    if (operation.current || ai.busy) return; save(); Keyboard.dismiss(); setError(''); setResultTab(kind); setRunKind(kind); ai.clear();
    const source = readState().resume, currentTarget = readState().target, sourceText = latest.current.text, sourceJd = latest.current.jd;
    if (source.mode === 'text' && sourceText.trim().length < 30) { setEditor(true); setError('先上传并解析简历，或粘贴至少一段真实经历'); return; }
    setFormExpanded(false); generating.current = true;
      const mark = inputKey(JSON.stringify([source.mode === 'text' ? sourceText : '', source.file?.path, source.mode]), sourceJd, currentTarget);
    const token = new AbortController(); operation.current = token;
    try {
      let attachments: AiAttachment[] | undefined;
      if (source.mode === 'file') {
        if (!source.file) throw new Error('先上传简历');
        if (source.file.bytes > 6 * 1024 * 1024) throw new Error('直接文件输入最大6MB，请先解析正文');
        setStatus('准备文件'); const bytes = await data.files.readBase64(source.file.path);
        if (token.signal.aborted || account !== owner()) return;
        attachments = source.file.kind === 'image' ? [{ type: 'image', url: `data:${source.file.mime};base64,${bytes}` }] : [{ type: 'file', name: source.file.name, mime: source.file.mime, data: bytes }];
      }
      setStatus('');
      const examples = matching(catalog.items, 'resume', currentTarget, 4).map(i => ({ title: i.title, company: i.company, provenance: i.provenance, before: i.before, after: i.after, guide: i.body.slice(0, 2000) }));
      const instruction = kind === 'diagnosis' ? '输出一份简历诊断：开头固定写“综合评分：XX/100”，分数0–100。给出表达结构20、具体行动20、成果证据20、岗位匹配30、可读性10各项得分与扣分依据。无JD时明确岗位匹配未评估，将其余70分归一到100，不猜测招聘方筛选。随后列出最优先的3项问题；有JD时逐项引用JD要求、现有证据、缺失项与补充动作。列出可直接修改的句子和STAR改造方向。只从读取到的内容评估；原文件版式不确定时标明。最后列出投递前检查清单。' : '输出完整可复制的润色后简历，用Markdown标题和精简条目，按STAR思想改造经历，突出真实行动、交付物和结果。依据目标岗位JD与参考语料的表达方式组织，但绝不把案例中的雇主、学历、职责或数字移植到用户身上。事实不足标［待补充］。保留真实工作、教育和项目信息，不删掉重要事实。结尾加“改造说明”，简述改变与待补事实。';
      const context = { target: currentTarget, jd: sourceJd || '未提供JD', resume: source.mode === 'text' ? sourceText : '请读取所附简历文件', referenceExamples: examples };
      while (JSON.stringify(context).length > 118000 && examples.length) examples.pop();
      if (JSON.stringify(context).length > 118000) throw new Error('正文与JD过长，请精简后重新生成');
      const result = await ai.run(instruction, JSON.stringify(context), attachments);
      if (!result || token.signal.aborted || account !== owner()) return;
      const now = readState();
      if (inputKey(JSON.stringify([now.resume.mode === 'text' ? latest.current.text : '', now.resume.file?.path, now.resume.mode]), latest.current.jd, now.target) !== mark) { setError('输入或目标已修改，本次结果未覆盖已保存的报告'); return; }
      updateState(state => ({ ...state, resume: { ...state.resume, [kind]: result, resultInput: { ...state.resume.resultInput, [kind]: mark } } }), account); ai.clear();
    } catch (e) { if (!token.signal.aborted && account === owner()) setError(e instanceof Error ? e.message : '处理失败'); }
    finally { if (operation.current === token) { operation.current = null; generating.current = false; setStatus(''); } }
  };
  const report = (ai.busy || ai.output) && runKind === resultTab ? ai.output : work[resultTab];
  const score = report.replace(/[*_]/g, '').match(/综合评分[：:]\s*(\d{1,3}(?:\.\d+)?)\s*\/\s*100/)?.[1];
  const stale = !!work.resultInput[resultTab] && work.resultInput[resultTab] !== inputKey(JSON.stringify([work.mode === 'text' ? text : '', work.file?.path, work.mode]), jd, target);
  const mode = (value: 'text' | 'file') => { operation.current?.abort(); operation.current = null; generating.current = false; setStatus(''); ai.clear(); save(); updateState(state => ({ ...state, resume: { ...state.resume, mode: value } })); };
  const exportReport = async () => { try { const path = 'resume/result.md'; await data.files.writeText(path, report); if (account !== owner()) return; const result = await data.files.exportFile(path, { name: resultTab === 'diagnosis' ? '简历诊断.md' : 'STAR简历.md', mime: 'text/markdown' }); if (!result.ok && result.code !== 'CANCELLED') throw new Error(result.error); } catch (e) { setError(e instanceof Error ? e.message : '导出失败'); } };
  return <><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
    <View><Text style={[s.title, { color: c.text }]}>诊断问题，改成有说服力的经历</Text><Text style={[s.small, { color: c.muted }]}>上传 → 预览 / 解析 → 诊断 → STAR 改造</Text></View>
    {formExpanded ? <><Card><View style={s.spread}><View style={{ flex: 1 }}><Text numberOfLines={2} style={[s.heading, { color: c.text }]}>{work.file?.name || '上传你的简历'}</Text><Text style={[s.small, { color: c.muted }]}>{work.file ? `${(work.file.bytes / 1024).toFixed(0)} KB · ${work.file.kind.toUpperCase()} · 本机保存` : 'PDF / Word / TXT / 图片，最大20MB'}</Text></View>{work.file ? <IconButton label="预览简历" onPress={() => setPreview(true)}><Eye size={21} color={c.accent} /></IconButton> : null}</View><View style={s.row}><Button label={status || (work.file ? '重新上传' : '上传简历')} busy={!!status} disabled={ai.busy} icon={<FileUp size={17} color={c.onAccent} />} onPress={() => void upload()} style={{ flex: 1 }} /><Button label="粘贴 / 编辑正文" subtle onPress={() => setEditor(true)} style={{ flex: 1 }} /></View>
      {work.file ? <View style={s.chips}><Chip label="本地解析后发送" selected={work.mode === 'text'} onPress={() => mode('text')} /><Chip label="原文件交给模型" selected={work.mode === 'file'} onPress={() => mode('file')} />{work.mode === 'text' ? <Chip label="重新解析" onPress={() => void parseAgain()} /> : null}</View> : null}
      <Text style={[s.small, { color: c.muted }]}>{work.mode === 'file' ? '直接文件输入需引擎和模型支持相应文件；最大6MB。' : `已解析 ${text.length} 字。正文可编辑，解析不会自动发送给AI。`}</Text>
    </Card>
    <Field label="目标岗位 JD（可选）" value={jd} onChangeText={v => { dirty.current = true; latest.current.jd = v; setJd(v); }} multiline maxLength={8000} placeholder="粘贴岗位职责和要求，诊断会对照匹配缺失项" /></> : <Card><View style={s.spread}><View style={{ flex: 1 }}><Text numberOfLines={1} style={[s.heading, { color: c.text }]}>{work.file?.name || "已粘贴简历正文"}</Text><Text style={[s.small, { color: c.muted }]}>{status || `${text.length} 字 · ${jd.trim() ? "已提供JD" : "未提供JD"} · ${work.mode === "file" ? "文件输入" : "正文输入"}`}</Text></View>{work.file ? <IconButton label="预览简历" onPress={() => setPreview(true)}><Eye size={20} color={c.accent} /></IconButton> : null}<Button label="调整输入" subtle onPress={() => setFormExpanded(true)} /></View></Card>}
    <View style={s.row}><Button label="AI 打分与诊断" busy={ai.busy && runKind === 'diagnosis'} disabled={!!status || ai.busy && runKind !== 'diagnosis'} onPress={() => void generate('diagnosis')} style={{ flex: 1 }} /><Button label="一键 STAR 润色" busy={ai.busy && runKind === 'improved'} disabled={!!status || ai.busy && runKind !== 'improved'} icon={<Sparkles size={16} color={c.onAccent} />} onPress={() => void generate('improved')} style={{ flex: 1 }} /></View>
    <Text style={[s.small, { color: c.muted }]}>内容发送至你配置的 AI。评分是训练参考，不代表企业筛选结果；润色依据真实经历和已收录语料。</Text><ErrorText text={error || ai.error} />{ai.error ? <Button label="配置 AI 引擎" subtle onPress={() => app.ai.openSettings()} /> : null}
    {report || ai.busy || work.diagnosis || work.improved ? <Card><View style={s.spread}><View style={s.chips}><Chip label="诊断报告" selected={resultTab === 'diagnosis'} onPress={() => setResultTab('diagnosis')} /><Chip label="STAR 改造" selected={resultTab === 'improved'} onPress={() => setResultTab('improved')} /></View>{ai.busy ? <IconButton label="停止生成" onPress={() => { operation.current?.abort(); ai.cancel(); }}><Square size={18} color={c.accent} /></IconButton> : report ? <IconButton label="复制输出" onPress={() => copy(report)}><Copy size={19} color={c.accent} /></IconButton> : null}</View>
      {score && Number(score) <= 100 ? <View style={[s.row, { alignItems: 'baseline' }]}><Text style={{ fontSize: 28, fontWeight: '800', color: c.accent }}>{score}<Text style={[s.small, { color: c.muted }]}> / 100</Text></Text><Text style={[s.small, { color: c.muted }]}>AI 参考评分</Text></View> : null}
      {ai.output && !ai.busy && !ai.completed ? <Text style={[s.small, { color: c.danger }]}>本次输出未完成，以下为已生成的部分。</Text> : null}{stale && !ai.busy ? <Text style={[s.small, { color: c.danger }]}>正文、JD或目标已变化，请按新输入重新生成。</Text> : null}{ai.busy && !report ? <Text style={[s.body, { color: c.muted }]}>正在对照简历与岗位要求…</Text> : report ? <Markdown text={report} streaming={ai.busy} /> : <Text style={[s.body, { color: c.muted }]}>此类报告尚未生成。</Text>}{report && !ai.busy ? <Button label="导出 Markdown" subtle onPress={() => void exportReport()} /> : null}</Card> : <Card><Text style={[s.heading, { color: c.text }]}>从具体扣分点开始修改简历</Text><Text style={[s.body, { color: c.muted }]}>诊断会指出证据缺口与修改优先级；润色输出可预览、复制和导出，不替你投递。</Text></Card>}
  </ScrollView><Sheet title="简历正文" visible={editor} onClose={() => { save(); setEditor(false); }}><Field label={`正文 · ${text.length} 字`} value={text} onChangeText={v => { dirty.current = true; editSequence.current++; latest.current.text = v; setText(v); }} multiline maxLength={50000} placeholder="粘贴工作、项目、教育与技能经历" /><Button label="保存正文" onPress={() => { save(); setEditor(false); }} /></Sheet>{preview && work.file ? <Preview file={work.file} text={text} onClose={() => setPreview(false)} /> : null}</>;
});
