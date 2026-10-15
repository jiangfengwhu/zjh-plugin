import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Video from 'react-native-video';
import { Mic, Play, Square, Volume2 } from 'lucide-react-native';
import {
  cancelAnimation,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { app, owner, voiceFiles } from './store';
import { type Recording } from './domain';
import { PulseOrb, styles, usePalette } from './ui';

export type VoiceResult = { text: string; recording: Recording };
const cleanups = new Set<() => void>();

export function disposeVoice() {
  cleanups.forEach((fn) => fn());
  cleanups.clear();
}

export function VoiceCapture({
  active,
  recording,
  onResult,
  onPartialText,
  onBusy,
  compact = false,
}: {
  active: boolean;
  recording?: Recording | null;
  onResult: (result: VoiceResult) => void;
  onPartialText?: (text: string) => void;
  onBusy?: (busy: boolean) => void;
  compact?: boolean;
}) {
  const c = usePalette(),
    [phase, setPhase] = useState<
      'idle' | 'preparing' | 'listening' | 'finishing' | 'playing'
    >('idle'),
    [error, setError] = useState('');

  const session = useRef<AbortController | null>(null),
    long = useRef(false),
    held = useRef(false),
    wasActive = useRef(active),
    phaseRef = useRef(phase);
  phaseRef.current = phase;
  const callbacks = useRef({ onResult, onPartialText, onBusy });
  callbacks.current = { onResult, onPartialText, onBusy };
  wasActive.current = active;
  const level = useSharedValue(0),
    token = useRef(0);

  useEffect(() => {
    const stop = () => {
      held.current = false;
      token.current++;
      session.current?.abort();
      session.current = null;
      cancelAnimation(level);
      level.value = 0;
      callbacks.current.onBusy?.(false);
      setPhase('idle');
    };
    if (!active) stop();
    cleanups.add(stop);
    return () => {
      stop();
      cleanups.delete(stop);
    };
  }, [active]);

  useEffect(() => {
    if (phaseRef.current === 'playing') setPhase('idle');
  }, [recording?.path]);

  const begin = async () => {
    if (session.current || !wasActive.current) return;
    long.current = true;
    held.current = true;
    setError('');
    setPhase('preparing');
    phaseRef.current = 'preparing';
    callbacks.current.onBusy?.(true);

    const controller = new AbortController(),
      account = owner(),
      version = ++token.current,
      path = `voice/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 10)}.wav`;
    session.current = controller;

    try {
      const permission = await app.phone.speech.requestPermission();
      if (controller.signal.aborted) return;
      if (!permission.granted)
        throw new Error('需要开启麦克风权限，或者直接在上方输入框打字。');

      const prepared = await app.phone.speech.prepare({
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      if (!prepared.ok) {
        if (prepared.code !== 'CANCELLED') throw new Error(prepared.error);
        return;
      }
      if (!held.current) {
        setError('麦克风已就绪，请再按住说话。');
        return;
      }

      const result = await app.phone.speech.recognize({
        signal: controller.signal,
        recordingPath: path,
        onState: (state) => {
          if (version !== token.current || controller.signal.aborted) return;
          if (state === 'listening' || state === 'hearing') {
            if (!held.current) {
              void app.phone.speech.finish();
              return;
            }
            phaseRef.current = 'listening';
            setPhase('listening');
            if (state === 'listening') void app.haptics.trigger('impactLight');
          } else if (state === 'processing') {
            phaseRef.current = 'finishing';
            setPhase('finishing');
          }
        },
        onPartial: (spoken) => {
          if (!controller.signal.aborted && spoken.trim()) {
            callbacks.current.onPartialText?.(spoken.trim().slice(0, 1000));
          }
        },
        onVolume: (db) => {
          if (!controller.signal.aborted)
            level.value = withTiming(Math.max(0, Math.min(1, (db + 55) / 40)), {
              duration: 100,
            });
        },
      });

      if (
        controller.signal.aborted ||
        version !== token.current ||
        owner() !== account
      ) {
        void voiceFiles.remove(path).catch(() => {});
        return;
      }
      if (!result.ok) {
        if (result.code !== 'CANCELLED') throw new Error(result.error);
        return;
      }
      if (!result.recording || !result.text.trim())
        throw new Error('没听清，可以再按住说一次，或直接打字输入。');
      if (result.text.length > 1000)
        throw new Error('内容有点长，先挑最想破冰的一件事吧。');

      callbacks.current.onResult({
        text: result.text.trim(),
        recording: result.recording,
      });
      void app.haptics.trigger('notificationSuccess');
    } catch (e) {
      void voiceFiles.remove(path).catch(() => {});
      if (!controller.signal.aborted && version === token.current)
        setError(
          e instanceof Error ? e.message : '录音未成功，可重试或直接打字。'
        );
    } finally {
      if (session.current === controller) {
        session.current = null;
        level.value = withTiming(0);
        phaseRef.current = 'idle';
        setPhase('idle');
        callbacks.current.onBusy?.(false);
      }
    }
  };

  const release = () => {
    held.current = false;
    if (!session.current) return;
    if (phaseRef.current === 'preparing') return;
    phaseRef.current = 'finishing';
    setPhase('finishing');
    void app.phone.speech.finish().catch(() => session.current?.abort());
  };

  const label =
    phase === 'preparing'
      ? '正在唤醒麦克风…'
      : phase === 'listening'
      ? '正在听，松手完成识别…'
      : phase === 'finishing'
      ? '正在整理你说的话…'
      : phase === 'playing'
      ? '正在回放原声 · 轻点停止'
      : recording
      ? '按住重新说 · 轻点回放原声'
      : '按住倾诉卡住的事';

  const orbSize = compact ? 88 : 124;

  return (
    <View style={{ alignItems: 'center', gap: 10 }}>
      <Pressable
        style={({ pressed }) => ({
          opacity: pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.96 : 1 }],
        })}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint="长按开始语音倾诉，松手结束；有录音时轻点回放"
        accessibilityState={{
          busy: phase === 'preparing' || phase === 'finishing',
          disabled: !active,
        }}
        disabled={!active || phase === 'finishing'}
        delayLongPress={180}
        onPressIn={() => {
          long.current = false;
        }}
        onLongPress={() => {
          void begin();
        }}
        onPressOut={release}
        onPress={() => {
          if (long.current || session.current || !recording) return;
          setError('');
          setPhase((p) => (p === 'playing' ? 'idle' : 'playing'));
        }}
      >
        <PulseOrb
          size={orbSize}
          active={active}
          level={level}
          alive={phase === 'listening' || phase === 'playing'}
          tone={phase === 'listening' ? 'spark' : 'moss'}
        >
          <View
            style={{
              width: orbSize - 36,
              height: orbSize - 36,
              borderRadius: (orbSize - 36) / 2,
              backgroundColor:
                phase === 'listening' ? c.spark : c.surfaceSubtle,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {phase === 'playing' ? (
              <Square size={compact ? 18 : 24} color={c.ink} />
            ) : phase === 'idle' && recording ? (
              <Volume2 size={compact ? 20 : 26} color={c.moss} />
            ) : (
              <Mic
                size={compact ? 20 : 26}
                color={phase === 'listening' ? c.onSpark : c.spark}
              />
            )}
          </View>
        </PulseOrb>
      </Pressable>

      <View style={[styles.row, { gap: 6 }]}>
        <Text
          accessibilityLiveRegion="polite"
          style={[
            styles.small,
            {
              color: phase === 'listening' ? c.spark : c.muted,
              fontWeight: phase === 'listening' ? '700' : '500',
            },
          ]}
        >
          {label}
        </Text>
        {recording && phase === 'idle' ? (
          <View
            style={{
              paddingHorizontal: 7,
              paddingVertical: 2,
              borderRadius: 8,
              backgroundColor: c.mossSoft,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 3,
            }}
          >
            <Play size={10} color={c.moss} />
            <Text style={{ fontSize: 10, fontWeight: '700', color: c.moss }}>
              {Math.max(1, Math.round(recording.durationMs / 1000))}s
            </Text>
          </View>
        ) : null}
      </View>

      {error ? (
        <Text
          accessibilityLiveRegion="polite"
          style={[styles.small, { color: c.spark, textAlign: 'center' }]}
        >
          {error}
        </Text>
      ) : null}

      {active && recording && phase === 'playing' ? (
        <Video
          source={{ uri: voiceFiles.uri(recording.path) }}
          playInBackground={false}
          playWhenInactive={false}
          paused={false}
          style={{ width: 1, height: 1, position: 'absolute' }}
          onEnd={() => setPhase('idle')}
          onError={() => {
            setPhase('idle');
            setError('原声回放失败，可以重新按住录一段。');
          }}
        />
      ) : null}
    </View>
  );
}
