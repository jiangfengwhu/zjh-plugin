import React, { useRef, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { useTheme } from '@zijinhua/app-sdk/ui';
import QRCode from 'react-native-qrcode-svg';
import { captureRef } from 'react-native-view-shot';
import { app, data, event, owner, update, useStore } from './store';
import { formatDuration, outcomeLabels, type Session } from './domain';
import { Button, Card, Seed, styles } from './ui';

export function Report({ session: s, onAgain, onHome }: { session: Session; onAgain: () => void; onHome: () => void }) {
  const { colors: c } = useTheme(), state = useStore(), account = useRef(owner()).current;
  const user = app.auth.getUser();
  const [anonymous, setAnonymous] = useState(true);
  const [includeTask, setIncludeTask] = useState(false), [publicTask, setPublicTask] = useState(''), [publicStep, setPublicStep] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [cardReady, setCardReady] = useState(false);
  const card = useRef<View>(null), inFlight = useRef(false);
  const label = s.outcome === 'none' ? '今天先停在这里' : s.outcome === 'more' ? '我又往前走了一点' : '我终于开始了';
  const duration = formatDuration(s.elapsedSec);
  const link = `https://zijinhua.297782.xyz/applications/${app.appId}?p=${encodeURIComponent(JSON.stringify({ source: 'report-image', variant: 'v1' }))}`;
  const markUseful = (useful: boolean) => { update(st => ({ ...st, session: st.session?.id === s.id ? { ...st.session, useful } : st.session, history: st.history.map(h => h.id === s.id ? { ...h, useful } : h) }), account); event(useful ? 'step_helpful' : 'step_unhelpful', account); };
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
      if (result.ok) { event(save ? 'report_saved' : 'image_share_opened', account); if (save) app.toast.show('图片保存操作已完成', 'success'); }
    } catch (e) { if (owner() === account) setError(e instanceof Error ? e.message : '图片未生成，请重试'); }
    finally { inFlight.current = false; if (owner() === account) { setBusy(false); void data.files.remove(path).catch(() => {}); } }
  };
  const shareApp = async () => {
    try { await app.sharing.open({ title: '开工搭子', description: '卡住时，先找一个小到能开始的动作。', params: { source: 'report', variant: 'v1' } }); event('app_share_opened', account); }
    catch (e) { if (owner() === account) setError(e instanceof Error ? e.message : '分享入口暂不可用'); }
  };
  return <View style={{ gap: 20 }}>
    <Text style={[styles.title, { color: c.text }]}>{label}</Text><Text style={[styles.body, { color: c.muted }]}>{s.outcome === 'none' ? '这次还没开始也没关系。换个更合适的入口，或者先休息。' : '记住帮你迈出第一步的办法，下次可以直接复用。'}</Text>
    <Card><Text style={[styles.heading, { color: c.text }]}>这个办法对你有帮助吗？</Text><View style={styles.wrap}><Button label={s.useful === true ? '已记住这个办法' : '有，记住它'} secondary={s.useful !== true} disabled={s.outcome === 'none'} onPress={() => markUseful(true)} style={{ flexGrow: 1 }} /><Button label={s.useful === false ? '下次换个办法' : '不太适合我'} secondary onPress={() => markUseful(false)} style={{ flexGrow: 1 }} /></View><Text style={[styles.small, { color: c.muted }]}>只有你确认有帮助，下次遇到同类任务才会推荐它。</Text></Card>
    <Text style={[styles.heading, { color: c.text }]}>可选：留下这次开工</Text>
    <View ref={card} collapsable={false} onLayout={() => setCardReady(true)} style={{ backgroundColor: c.surface, borderRadius: 28, padding: 28, gap: 24 }}>
      <View style={styles.spread}><Text style={[styles.small, { color: c.muted }]}>{anonymous ? '开工搭子' : user?.name || '开工搭子'} · {new Date(s.completedAt || s.startedAt).toLocaleDateString()}</Text><Seed size={44} /></View>
      <Text style={[styles.title, { color: c.text }]}>{label}</Text>
      {includeTask && publicTask.trim() ? <Text style={[styles.heading, { color: c.text }]}>{publicTask.trim()}</Text> : null}
      <View style={{ gap: 6 }}><Text style={{ color: c.accent, fontSize: 48, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{duration}</Text><Text style={[styles.small, { color: c.muted }]}>本轮计时 · 已扣除暂停，不代表实际专注时长</Text></View>
      <View style={{ backgroundColor: c.accentTint, borderRadius: 18, padding: 18, gap: 8 }}><Text style={[styles.body, { color: c.text }]}>{outcomeLabels[s.outcome || 'none']}</Text>{includeTask && publicStep.trim() && s.outcome !== 'none' ? <Text style={[styles.body, { color: c.text }]}>{publicStep.trim()}</Text> : null}<Text style={[styles.small, { color: c.muted }]}>进度由本人确认</Text></View>
      <View style={styles.spread}><View style={{ flex: 1, gap: 5 }}><Text style={{ color: c.text, fontSize: 15, fontWeight: '700' }}>开工搭子 · 生花</Text><Text style={[styles.small, { color: c.muted }]}>先做一小步，再决定要不要继续。</Text></View><QRCode value={link} size={66} color={c.text} backgroundColor={c.surface} /></View>
    </View>
    {user ? <Button label={anonymous ? '显示生花账号昵称' : '改为匿名显示'} secondary disabled={busy} onPress={() => setAnonymous(v => !v)} /> : null}
    <Button label={includeTask ? '隐藏任务和具体动作' : '添加公开任务说明（可选）'} secondary disabled={busy} onPress={() => setIncludeTask(v => !v)} />
    {includeTask ? <View style={{ gap: 10 }}><Text style={[styles.small, { color: c.muted }]}>不会自动填入私人任务。只写你愿意公开的内容，分享前核对上方预览。</Text><TextInput accessibilityLabel="公开任务名称" value={publicTask} onChangeText={setPublicTask} maxLength={80} placeholder="例如：开始写周报" placeholderTextColor={c.muted} editable={!busy} style={[styles.field, { minHeight: 52, color: c.text, backgroundColor: c.field }]} /><TextInput accessibilityLabel="公开第一步" value={publicStep} onChangeText={setPublicStep} maxLength={100} placeholder="例如：写下了第一句话" placeholderTextColor={c.muted} editable={!busy} style={[styles.field, { minHeight: 70, color: c.text, backgroundColor: c.field }]} /></View> : null}
    <View style={styles.wrap}><Button label="保存图片" secondary busy={busy} disabled={!cardReady} onPress={() => void image(true)} style={{ flexGrow: 1 }} /><Button label="分享图片" secondary busy={busy} disabled={!cardReady} onPress={() => void image(false)} style={{ flexGrow: 1 }} /></View><Button label="邀请朋友试一下" secondary onPress={() => void shareApp()} />
    {error ? <Text accessibilityLiveRegion="polite" style={[styles.body, { color: c.danger }]}>{error}</Text> : null}
    <Button label="再开一轮 · 先试 5 分钟" disabled={busy} onPress={onAgain} /><Button label="先休息，回到首页" secondary disabled={busy} onPress={onHome} />
  </View>;
}
