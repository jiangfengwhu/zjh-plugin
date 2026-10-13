import React, { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { Share2 } from 'lucide-react-native';
import { captureRef } from 'react-native-view-shot';
import { app, data, owner } from './store';
import { formatDuration, type Session } from './domain';
import {
  IconButton,
  InkButton,
  Pebble,
  QuietButton,
  Rule,
  styles,
  Trace,
  usePaper,
} from './ui';
export function Report({
  session: s,
  onAgain,
  onHome,
  onComplete,
}: {
  session: Session;
  onAgain: () => void;
  onHome: () => void;
  onComplete: () => void;
}) {
  const c = usePaper(),
    card = useRef<View>(null),
    account = useRef(owner()).current,
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    inFlight = useRef(false);
  const share = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError('');
    const path = `moments/${Date.now()}.png`;
    try {
      const image = await captureRef(card, {
        format: 'png',
        quality: 1,
        result: 'base64',
      });
      if (owner() !== account) return;
      await data.files.writeBase64(path, image);
      if (owner() !== account) return;
      const result = await data.files.share(path, {
        title: '一个小小的开始',
        mime: 'image/png',
      });
      if (!result.ok) setError(result.error);
    } catch {
      if (owner() === account) setError('这一刻暂时没能生成图片，再试一次。');
    } finally {
      inFlight.current = false;
      if (owner() === account) {
        setBusy(false);
        void data.files.remove(path).catch(() => {});
      }
    }
  };
  return (
    <View style={{ gap: 24, paddingTop: 20 }}>
      <View
        ref={card}
        collapsable={false}
        style={{ backgroundColor: c.paper, paddingVertical: 24, gap: 24 }}
      >
        <Text style={[styles.eyebrow, { color: c.clay }]}>
          开工搭子 /{' '}
          {new Date(s.completedAt || s.startedAt).toLocaleDateString()}
        </Text>
        <Text style={[styles.title, { color: c.ink }]}>
          {s.completedSteps.length
            ? '石头很小，\n也是一座山。'
            : '停下来，\n也没有关系。'}
        </Text>
        <View style={{ alignItems: 'center' }}>
          <Pebble size={180}>
            <Text style={{ fontFamily: 'serif', fontSize: 52, color: c.ink }}>
              {s.completedSteps.length}
            </Text>
          </Pebble>
        </View>
        <View style={styles.spread}>
          <Trace count={s.completedSteps.length} />
          <Text style={[styles.small, { color: c.muted }]}>
            {formatDuration(s.elapsedSec)} · 留给这件事
          </Text>
        </View>
        <Rule />
        {s.completedSteps.slice(-5).map((step, i) => (
          <Text key={`${step.at}-${i}`} style={[styles.body, { color: c.ink }]}>
            {step.action}
          </Text>
        ))}
        <Text style={[styles.small, { color: c.muted }]}>
          不必连续，不必完美。下次从这里继续。
        </Text>
      </View>
      {!s.taskDone ? (
        <InkButton
          label="还没做完，下次接着来"
          disabled={busy}
          onPress={onAgain}
        />
      ) : null}
      <View style={styles.spread}>
        <QuietButton
          label={s.taskDone ? '回到首页' : '整件事，已经做完了'}
          disabled={busy}
          onPress={s.taskDone ? onHome : onComplete}
        />
        <IconButton
          label="分享这一刻"
          disabled={busy}
          onPress={() => void share()}
        >
          <Share2 size={19} color={c.clay} strokeWidth={1.3} />
        </IconButton>
      </View>
      {error ? (
        <Text
          accessibilityLiveRegion="polite"
          style={[styles.body, { color: c.clay }]}
        >
          {error}
        </Text>
      ) : null}
      <QuietButton
        label="邀请一个搭子"
        disabled={busy}
        onPress={() => {
          void app.sharing
            .open({
              title: '开工搭子',
              description: '把心里的事，轻轻放下来。',
              params: { source: 'report' },
            })
            .catch(() => setError('分享入口暂时没有打开，请再试一次。'));
        }}
      />
      {!s.taskDone ? <QuietButton label="回到首页" onPress={onHome} /> : null}
    </View>
  );
}
