import React, { useRef, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { useTheme } from '@zijinhua/app-sdk/ui';
import QRCode from 'react-native-qrcode-svg';
import { captureRef } from 'react-native-view-shot';
import { app, data, event, owner, useStore } from './store';
import { formatDuration, type Session } from './domain';
import { Button, Seed, Separator, styles, TextButton } from './ui';

export function Report({ session: s, onAgain, onHome, onComplete }: { session: Session; onAgain: () => void; onHome: () => void; onComplete: () => void }) {
  const { colors: c } = useTheme(), account = useRef(owner()).current;
  useStore();
  const user = app.auth.getUser();
  const [anonymous, setAnonymous] = useState(true);
  const [includeTask, setIncludeTask] = useState(false), [publicTask, setPublicTask] = useState(''), [publicStep, setPublicStep] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [cardReady, setCardReady] = useState(false), [sharing, setSharing] = useState(false);
  const card = useRef<View>(null), inFlight = useRef(false);
  const duration = formatDuration(s.elapsedSec);
  const link = `https://zijinhua.297782.xyz/applications/${app.appId}?p=${encodeURIComponent(JSON.stringify({ source: 'report-image', variant: 'v1.1' }))}`;
  const image = async (save: boolean) => {
    if (inFlight.current || !card.current || !cardReady) return;
    inFlight.current = true; setBusy(true); setError('');
    const path = `reports/${s.id}.png`;
    try {
      const base64 = await captureRef(card, { format: 'png', result: 'base64', width: 720 });
      if (owner() !== account) return;
      await data.files.writeBase64(path, base64);
      if (owner() !== account) return;
      const result = save ? await data.files.saveToGallery(path, { name: '我的开工记录.png', mime: 'image/png' }) : await data.files.share(path, { title: '我的开工记录', mime: 'image/png' });
      if (owner() !== account) return;
      if (!result.ok && result.code !== 'CANCELLED') throw new Error(result.error);
      if (result.ok) { event(save ? 'report_saved' : 'image_share_opened', account); if (save) app.toast.show('已保存', 'success'); }
    } catch (e) { if (owner() === account) setError(e instanceof Error ? e.message : '图片未生成，请重试'); }
    finally { inFlight.current = false; if (owner() === account) { setBusy(false); void data.files.remove(path).catch(() => {}); } }
  };
  const shareApp = async () => {
    try { await app.sharing.open({ title: '开工搭子', description: '说说想做的事，让 AI 陪你从一小步开始。', params: { source: 'report', variant: 'v1.1' } }); event('app_share_opened', account); }
    catch (e) { if (owner() === account) setError(e instanceof Error ? e.message : '分享入口暂不可用'); }
  };
  return <View style={{ gap: 24 }}>
    <Text style={[styles.heading,{color:c.text}]}>{s.task}</Text>
    <Text style={[styles.title, { color: c.text }]}>{s.outcome === 'none' ? '下次，再一起开始。' : '今天，已经不一样了。'}</Text>
    {s.completedSteps.length ? <View style={{ gap: 10 }}>{s.completedSteps.map((step, i) => <Text selectable key={i} style={[styles.body, { color: c.ink2 }]}>{i + 1}. {step.action}</Text>)}</View> : null}
    {s.stuckAt ? <Text style={[styles.body,{color:c.ink2}]}>上次卡在：{s.stuckAt}</Text> : null}
    {s.note ? <Text selectable style={[styles.body, { color: c.ink2 }]}>{s.note}</Text> : null}
    <Separator />
    {!s.taskDone ? <><Button label="接着这件事继续" disabled={busy} onPress={onAgain} /><TextButton label="整件事已经做完了" onPress={onComplete} /></> : null}
    <TextButton label="回到首页" onPress={onHome} />
    <TextButton label={sharing ? '收起分享卡' : '生成一张分享卡'} onPress={() => setSharing(v=>!v)} />
    {sharing ? <>
    <View ref={card} collapsable={false} onLayout={() => setCardReady(true)} style={{ backgroundColor: c.canvas, borderColor: c.line, borderWidth: 1, borderRadius: 24, padding: 26, gap: 30 }}>
      <View style={styles.spread}><Text style={[styles.small, { color: c.ink2 }]}>{anonymous ? '开工搭子' : user?.name || '开工搭子'}</Text><Seed size={34} /></View>
      <Text style={[styles.title, { color: c.text, fontSize: 38, lineHeight: 52 }]}>{s.outcome === 'none' ? '慢一点，\n也没关系。' : '今天，\n我开始了。'}</Text>
      {includeTask && publicTask.trim() ? <Text style={[styles.heading, { color: c.text }]}>{publicTask.trim()}</Text> : null}
      <View style={[styles.row, { alignItems: 'baseline' }]}><Text style={{ color: c.greenText, fontSize: 52, fontWeight: '500', letterSpacing: -2 }}>{s.completedSteps.length}</Text><Text style={[styles.body, { color: c.ink2 }]}>个小步骤</Text></View>
      {includeTask && publicStep.trim() ? <Text style={[styles.body, { color: c.text }]}>{publicStep.trim()}</Text> : null}
      <View style={{ gap: 5 }}><Text style={[styles.small, { color: c.ink2 }]}>累计投入 · {duration}</Text><Text style={[styles.small, { color: c.ink2 }]}>{new Date(s.completedAt || s.startedAt).toLocaleDateString()}</Text></View>
      <Separator />
      <View style={styles.spread}><View style={{ flex: 1, gap: 5 }}><Text style={{ color: c.text, fontSize: 15, fontWeight: '600' }}>开工搭子 · 生花</Text><Text style={[styles.small, { color: c.ink2 }]}>先开始，不用想太远。</Text></View><QRCode value={link} size={58} color={c.ink1} backgroundColor={c.canvas} /></View>
    </View>
    <View style={styles.wrap}>{user ? <TextButton label={anonymous ? '显示昵称' : '隐藏昵称'} disabled={busy} onPress={() => setAnonymous(v => !v)} /> : null}<TextButton label={includeTask ? '隐藏文字' : '添一句想分享的话'} disabled={busy} onPress={() => setIncludeTask(v => !v)} /></View>
    {includeTask ? <View style={{ gap: 12 }}><TextInput accessibilityLabel="想公开的任务" value={publicTask} onChangeText={setPublicTask} maxLength={80} placeholder="想让大家知道，你开始了什么？" placeholderTextColor={c.muted} editable={!busy} style={[styles.field, { minHeight: 80, color: c.text, backgroundColor: c.canvas, borderWidth: 1, borderColor: c.line }]} /><TextInput accessibilityLabel="想分享的话" value={publicStep} onChangeText={setPublicStep} maxLength={100} placeholder="只写愿意公开的内容。" placeholderTextColor={c.muted} editable={!busy} style={[styles.field, { minHeight: 80, color: c.text, backgroundColor: c.canvas, borderWidth: 1, borderColor: c.line }]} /></View> : null}
    <View style={styles.wrap}><Button label="保存图片" secondary busy={busy} disabled={!cardReady} onPress={() => void image(true)} style={{ flexGrow: 1 }} /><Button label="分享图片" secondary busy={busy} disabled={!cardReady} onPress={() => void image(false)} style={{ flexGrow: 1 }} /></View>
    {error ? <Text accessibilityLiveRegion="polite" style={[styles.body, { color: c.ink2 }]}>{error}</Text> : null}
    <TextButton label="邀请朋友一起开始" disabled={busy} onPress={() => void shareApp()} /></> : null}
  </View>;
}
