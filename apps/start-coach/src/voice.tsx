import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Video from 'react-native-video';
import { Mic, Play, Square } from 'lucide-react-native';
import {
  cancelAnimation,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { app, owner, voiceFiles } from './store';
import { type Recording } from './domain';
import { Pebble, styles, usePaper } from './ui';
export type VoiceResult = { text: string; recording: Recording };
const cleanups = new Set<() => void>();
export function disposeVoice() {
  cleanups.forEach((fn) => fn());
  cleanups.clear();
}
export function VoiceStone({
  active,
  recording,
  onResult,
  onBusy,
  compact = false,
}: {
  active: boolean;
  recording?: Recording | null;
  onResult: (result: VoiceResult) => void;
  onBusy?: (busy: boolean) => void;
  compact?: boolean;
}) {
  const c = usePaper(),
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
  const callbacks = useRef({ onResult, onBusy });
  callbacks.current = { onResult, onBusy };
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
        throw new Error('允许使用麦克风后，就可以说给搭子听。');
      const prepared = await app.phone.speech.prepare({
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      if (!prepared.ok) {
        if (prepared.code !== 'CANCELLED') throw new Error(prepared.error);
        return;
      }
      if (!held.current) {
        setError('语音已准备好，再按住说给搭子听。');
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
        onVolume: (db) => {
          if (!controller.signal.aborted)
            level.value = withTiming(Math.max(0, Math.min(1, (db + 55) / 40)), {
              duration: 110,
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
        throw new Error('这次没听清，再按住说一次。');
      if (result.text.length > 1000)
        throw new Error('这次说得有点长，先说眼前最想开始的一件事。');
      callbacks.current.onResult({
        text: result.text.trim(),
        recording: result.recording,
      });
      void app.haptics.trigger('notificationSuccess');
    } catch (e) {
      void voiceFiles.remove(path).catch(() => {});
      if (!controller.signal.aborted && version === token.current)
        setError(
          e instanceof Error ? e.message : '没能收下这段声音，请再试一次。'
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
    if (phaseRef.current === 'preparing') {
      // Permission/model setup may show a system dialog. Finish setup without
      // recording after the finger is lifted; the next hold starts capture.
      return;
    } else {
      phaseRef.current = 'finishing';
      setPhase('finishing');
      void app.phone.speech.finish().catch(() => session.current?.abort());
    }
  };
  const label =
    phase === 'preparing'
      ? '正在准备麦克风'
      : phase === 'listening'
      ? '我在听，松手结束'
      : phase === 'finishing'
      ? '收好这段声音…'
      : phase === 'playing'
      ? '正在回放，点击停止'
      : recording
      ? '点一下回放 · 按住重说'
      : '按住，说说想做的事';
  return (
    <View style={{ alignItems: 'center', gap: 16 }}>
      <Pressable
        style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint="长按开始录音，松手结束；有录音时轻点回放"
        accessibilityState={{
          busy: phase === 'preparing' || phase === 'finishing',
          disabled: !active,
        }}
        disabled={!active || phase === 'finishing'}
        delayLongPress={220}
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
        <Pebble
          size={compact ? 100 : 235}
          active={active}
          level={level}
          alive={phase === 'listening' || phase === 'playing'}
        >
          {phase === 'playing' ? (
            <Square size={compact ? 19 : 29} color={c.ink} strokeWidth={1.3} />
          ) : phase === 'idle' && recording ? (
            <Play size={compact ? 21 : 33} color={c.ink} strokeWidth={1.3} />
          ) : (
            <Mic size={compact ? 21 : 33} color={c.ink} strokeWidth={1.3} />
          )}
        </Pebble>
      </Pressable>
      <Text
        accessibilityLiveRegion="polite"
        style={[styles.small, { color: c.muted, textAlign: 'center' }]}
      >
        {label}
      </Text>
      {recording && phase === 'idle' ? (
        <Text style={[styles.eyebrow, { color: c.clay }]}>
          {Math.max(1, Math.round(recording.durationMs / 1000))} 秒的声音
        </Text>
      ) : null}
      {error ? (
        <Text
          accessibilityLiveRegion="polite"
          style={[styles.body, { color: c.clay, textAlign: 'center' }]}
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
            setError('这段录音暂时无法回放，可以按住重新录一段。');
          }}
        />
      ) : null}
    </View>
  );
}
