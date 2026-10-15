import React, { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { CheckCircle2, Flame, Share2, Sparkles } from 'lucide-react-native';
import { captureRef } from 'react-native-view-shot';
import { app, data, owner } from './store';
import { formatDuration, type Session } from './domain';
import {
  GhostButton,
  PillButton,
  PrimaryButton,
  Rule,
  styles,
  usePalette,
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
  const c = usePalette(),
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
        title: '开工搭子 · 行动小票',
        mime: 'image/png',
      });
      if (!result.ok) setError(result.error);
    } catch {
      if (owner() === account) setError('生成分享卡片失败，请稍后再试。');
    } finally {
      inFlight.current = false;
      if (owner() === account) {
        setBusy(false);
        void data.files.remove(path).catch(() => {});
      }
    }
  };

  const count = s.completedSteps.length;

  return (
    <View style={{ gap: 20, paddingTop: 10 }}>
      <View
        ref={card}
        collapsable={false}
        style={[
          styles.card,
          {
            backgroundColor: c.surface,
            borderColor: c.line,
            padding: 24,
            gap: 18,
          },
        ]}
      >
        <View style={styles.spread}>
          <View style={styles.row}>
            <Flame size={18} color={c.spark} />
            <Text style={[styles.eyebrow, { color: c.spark }]}>
              SPARK RECEIPT · 行动小票
            </Text>
          </View>
          <Text style={[styles.small, { color: c.muted }]}>
            {new Date(s.completedAt || s.startedAt).toLocaleDateString()}
          </Text>
        </View>

        <Text style={[styles.title, { color: c.ink }]}>
          {count > 0
            ? `跨出了 ${count} 个微步，\n惯性已经打破。`
            : '允许自己停下来，\n也是蓄力的一部分。'}
        </Text>

        <View
          style={{
            flexDirection: 'row',
            gap: 12,
            paddingVertical: 6,
          }}
        >
          <View
            style={{
              flex: 1,
              padding: 14,
              borderRadius: 16,
              backgroundColor: c.sparkSoft,
              gap: 4,
            }}
          >
            <Text style={[styles.small, { color: c.spark, fontWeight: '600' }]}>
              点亮微步
            </Text>
            <Text style={{ fontSize: 28, fontWeight: '800', color: c.spark }}>
              {count} <Text style={{ fontSize: 13 }}>步</Text>
            </Text>
          </View>
          <View
            style={{
              flex: 1,
              padding: 14,
              borderRadius: 16,
              backgroundColor: c.mossSoft,
              gap: 4,
            }}
          >
            <Text style={[styles.small, { color: c.moss, fontWeight: '600' }]}>
              真实投入
            </Text>
            <Text style={{ fontSize: 28, fontWeight: '800', color: c.moss }}>
              {formatDuration(s.elapsedSec)}
            </Text>
          </View>
        </View>

        {count > 0 ? (
          <>
            <Rule />
            <View style={{ gap: 10 }}>
              <Text style={[styles.small, { color: c.muted, fontWeight: '700' }]}>
                已确认完成的动作轨迹：
              </Text>
              {s.completedSteps.slice(-5).map((step, i) => (
                <View key={`${step.at}-${i}`} style={[styles.row, { alignItems: 'flex-start' }]}>
                  <CheckCircle2 size={16} color={c.moss} style={{ marginTop: 4 }} />
                  <Text style={[styles.body, { color: c.ink, flex: 1 }]}>
                    {step.action}
                  </Text>
                </View>
              ))}
            </View>
          </>
        ) : null}

        <Rule />
        <View style={styles.spread}>
          <Text style={[styles.small, { color: c.muted }]}>
            开工搭子 · 不必完美，动起来就赢了
          </Text>
          <Sparkles size={14} color={c.amber} />
        </View>
      </View>

      {!s.taskDone ? (
        <PrimaryButton
          label="还没做完，顺着往下推一步"
          disabled={busy}
          onPress={onAgain}
        />
      ) : null}

      <View style={[styles.spread, { flexWrap: 'wrap' }]}>
        <PillButton
          label="生成小票图片分享"
          disabled={busy}
          icon={<Share2 size={15} color={c.ink} />}
          onPress={() => void share()}
        />
        <PillButton
          label="邀请朋友一起破冰"
          disabled={busy}
          onPress={() => {
            void app.sharing
              .open({
                title: '开工搭子',
                description: '万事开头难？拆成10秒微动作，马上破冰。',
                params: { source: 'report' },
              })
              .catch(() => setError('分享入口暂未打开，请重试。'));
          }}
        />
      </View>

      {error ? (
        <Text
          accessibilityLiveRegion="polite"
          style={[styles.small, { color: c.spark, textAlign: 'center' }]}
        >
          {error}
        </Text>
      ) : null}

      <View style={styles.spread}>
        {!s.taskDone ? (
          <GhostButton
            label="整件事已彻底搞定 ✓"
            disabled={busy}
            onPress={onComplete}
          />
        ) : null}
        <GhostButton label="返回点火舱首页" disabled={busy} onPress={onHome} />
      </View>
    </View>
  );
}
