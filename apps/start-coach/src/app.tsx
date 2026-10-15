import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  AppState,
  BackHandler,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import {
  ArrowLeft,
  Battery,
  BatteryCharging,
  BatteryLow,
  Check,
  ChevronRight,
  Flame,
  History,
  Pause,
  Play,
  RefreshCw,
  Scissors,
  Settings2,
  Sparkles,
  X,
} from 'lucide-react-native';
import {
  app,
  changeSession,
  clear,
  event,
  owner,
  read,
  recordFinished,
  update,
  useStore,
  voiceFiles,
} from './store';
import {
  completeStep,
  elapsed,
  finish,
  formatDuration,
  makeSession,
  nextStep,
  pause,
  resume,
  start,
  type EnergyLevel,
  type Session,
  type Step,
} from './domain';
import { useCoach } from './coach';
import {
  Arrival,
  Backdrop,
  GhostButton,
  IconButton,
  PillButton,
  PrimaryButton,
  PulseOrb,
  Rule,
  SparkTrail,
  styles,
  usePalette,
} from './ui';
import { VoiceCapture, type VoiceResult } from './voice';
import { Report } from './report';
import { syncReminder } from './reminders';

type Screen = 'home' | 'action' | 'timer' | 'report';
type Sheet = 'history' | 'settings' | 'blocker' | 'note' | null;
type Request = {
  id: string;
  instruction: string;
  note: string;
  previous?: Step | null;
};

const QUICK_PROMPTS = [
  '对着空白文档发呆，不知从哪写起',
  '事情太杂太多，脑子一团乱麻',
  '有一封重要消息/邮件一直拖着没回',
  '书桌/房间太乱，提不起劲收拾',
];

const ENERGY_OPTIONS: { key: EnergyLevel; label: string; desc: string }[] = [
  { key: 'low', label: '10% 躺平破冰', desc: '10秒上手的极微动作' },
  { key: 'mid', label: '50% 稳步推进', desc: '5分钟清晰小目标' },
  { key: 'high', label: '100% 满电攻坚', desc: '直奔核心模块' },
];

const screenFor = (s: Session): Screen =>
  s.status === 'ready'
    ? 'action'
    : s.status === 'finished'
    ? 'report'
    : 'timer';

function CoachApp() {
  const c = usePalette(),
    state = useStore(),
    s = state.session,
    account = useRef(owner()).current,
    insets = useSafeAreaInsets(),
    { width } = useWindowDimensions();

  const [screen, setScreen] = useState<Screen>('home'),
    [sheet, setSheet] = useState<Sheet>(null),
    [foreground, setForeground] = useState(AppState.currentState === 'active'),
    [now, setNow] = useState(Date.now());

  const [energy, setEnergy] = useState<EnergyLevel>('low'),
    [sheetInput, setSheetInput] = useState(''),
    [request, setRequest] = useState<Request | null>(null),
    [voiceBusy, setVoiceBusy] = useState(false),
    [minutes, setMinutes] = useState(3),
    [spoken, setSpoken] = useState<VoiceResult | null>(null);

  const focused = useIsFocused(),
    active = focused && foreground,
    generation = useRef(0),
    scroll = useRef<ScrollView>(null),
    spokenRef = useRef(spoken);
  spokenRef.current = spoken;

  const coach = useCoach(
    active && screen === 'action' && !sheet,
    state.aiAllowed
  );

  const cancel = useCallback(() => {
    generation.current++;
    setRequest(null);
    coach.cancel();
  }, [coach.cancel]);

  const go = useCallback((next: Screen) => {
    Keyboard.dismiss();
    setScreen(next);
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, []);

  const closeSheet = useCallback(() => {
    Keyboard.dismiss();
    const clip = spokenRef.current;
    if (clip) void voiceFiles.remove(clip.recording.path).catch(() => {});
    spokenRef.current = null;
    setSpoken(null);
    setSheetInput('');
    setSheet(null);
  }, []);

  const back = useCallback(() => {
    if (sheet) closeSheet();
    else {
      cancel();
      go('home');
    }
  }, [sheet, closeSheet, cancel, go]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (value) => {
      setForeground(value === 'active');
      setNow(Date.now());
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!active || s?.status !== 'running') return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active, s?.status]);

  useEffect(() => {
    syncReminder(s, state.reminders);
  }, [
    s?.id,
    s?.status,
    s?.resumedAt,
    s?.elapsedSec,
    s?.plannedSec,
    state.reminders,
  ]);

  useEffect(() => {
    if (!s || s.status !== 'running' || elapsed(s, now) < s.plannedSec) return;
    changeSession(
      s.id,
      (current) =>
        current.status === 'running'
          ? { ...pause(current, now), status: 'checkin' }
          : current,
      account
    );
  }, [s?.id, s?.status, now]);

  useEffect(() => {
    if (!request || !active || !state.aiAllowed || screen !== 'action' || sheet)
      return;
    const session = read().session;
    if (!session || session.id !== request.id) {
      setRequest(null);
      return;
    }
    const version = ++generation.current,
      priorAction = session.step?.action || '';
    setRequest(null);
    void coach
      .generate(
        { ...session, step: request.previous ?? session.step },
        request.instruction,
        request.note
      )
      .then((step) => {
        if (!step || version !== generation.current || account !== owner())
          return;
        setMinutes(Math.max(1, Math.round(step.durationSec / 60)));
        changeSession(
          session.id,
          (current) =>
            current.status === session.status &&
            (current.step?.action || '') === priorAction
              ? { ...current, step, stuckAt: request.note || current.stuckAt }
              : current,
          account
        );
        event('ai_step_generated', account);
      });
  }, [request, active, state.aiAllowed, screen, sheet]);

  useEffect(() => {
    if (!active) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (screen === 'home' && !sheet) return false;
      back();
      return true;
    });
    return () => sub.remove();
  }, [active, screen, sheet, back]);

  useEffect(() => {
    const receive = () => {
      const params = app.sharing.getParams();
      if (
        typeof params?.source === 'string' &&
        /^[a-zA-Z0-9_-]{1,64}$/.test(params.source)
      )
        update((st) => ({ ...st, source: params.source as string }), account);
    };
    const off = app.sharing.subscribe(receive);
    receive();
    event('app_opened', account);
    return () => {
      generation.current++;
      off();
      const clip = spokenRef.current;
      if (clip) void voiceFiles.remove(clip.recording.path).catch(() => {});
    };
  }, [account]);

  const generate = (instruction: string, note = '', previous = s?.step) => {
    if (!s) return;
    cancel();
    changeSession(
      s.id,
      (current) => ({ ...nextStep(current), stuckAt: note || current.stuckAt }),
      account
    );
    go('action');
    setRequest({ id: s.id, instruction, note, previous });
  };

  const create = () => {
    if (!state.draft.trim()) return;
    Keyboard.dismiss();
    const begin = () => {
      cancel();
      const session = {
        ...makeSession(state.draft, energy),
        ...(state.draftRecording ? { recording: state.draftRecording } : {}),
      };
      update(
        (st) => ({
          ...st,
          aiAllowed: true,
          session,
          draft: '',
          draftRecording: null,
        }),
        account
      );
      go('action');
      setRequest({
        id: session.id,
        instruction: '找到一个现在立刻能开始的微动作。',
        note: '',
      });
      event('task_submitted', account);
    };
    if (s && s.status !== 'finished')
      Alert.alert('先归档刚才那件事？', '归档后立刻为你拆解眼前这件事。', [
        { text: '取消', style: 'cancel' },
        {
          text: '保存并开启新事',
          onPress: () => {
            recordFinished(finish(s, s.note, false), account);
            begin();
          },
        },
      ]);
    else begin();
  };

  const continueTask = (saved: Session) => {
    const begin = () => {
      cancel();
      update(
        (st) => ({ ...st, session: { ...nextStep(saved), taskDone: false } }),
        account
      );
      closeSheet();
      go('action');
      setRequest({
        id: saved.id,
        instruction: '接着已完成动作、上次进展与卡点继续往下拆一步，不要从头开始。',
        note: saved.stuckAt,
      });
    };
    if (s && s.id !== saved.id && s.status !== 'finished')
      Alert.alert('切换到这件事？', '当前正在做的事会自动保存进展。', [
        { text: '取消', style: 'cancel' },
        {
          text: '保存并切换',
          onPress: () => {
            recordFinished(finish(s, s.note, false), account);
            begin();
          },
        },
      ]);
    else begin();
  };

  const openSheet = (next: Sheet) => {
    cancel();
    if (next === 'blocker' || next === 'note') {
      if (s?.status === 'running') changeSession(s.id, pause, account);
      setNow(Date.now());
    }
    setSheet(next);
  };

  const finishRound = (note = s?.note || '') => {
    if (!s) return;
    cancel();
    closeSheet();
    recordFinished(finish(read().session || s, note, false), account);
    go('report');
  };

  const beginTimer = () => {
    if (!s?.step) return;
    cancel();
    changeSession(
      s.id,
      (current) =>
        start({
          ...current,
          step: current.step
            ? { ...current.step, durationSec: minutes * 60 }
            : null,
        }),
      account
    );
    setNow(Date.now());
    go('timer');
    void app.haptics.trigger('impactLight');
  };

  const done = () => {
    if (!s?.step) return;
    changeSession(s.id, completeStep, account);
    setNow(Date.now());
    void app.haptics.trigger('notificationSuccess');
  };

  const busy = coach.busy || !!request,
    elapsedSec = s ? elapsed(s, now) : 0,
    orbSize = Math.min(240, width - 96),
    totalCompleted = state.history.reduce(
      (n, h) => n + h.completedSteps.length,
      0
    );

  const stageTitle =
    screen === 'home'
      ? 'IGNITION · 点火舱'
      : screen === 'action'
      ? 'MICRO-STEP · 破冰微步'
      : screen === 'timer'
      ? 'FLOW · 专注推进'
      : 'RECEIPT · 成果结算';

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={[styles.root, { backgroundColor: c.bg }]}
    >
      <Backdrop />
      <View style={styles.header}>
        <View style={[styles.row, { flex: 1 }]}>
          {screen !== 'home' ? (
            <IconButton label="返回" subtle onPress={back}>
              <ArrowLeft size={18} color={c.ink} />
            </IconButton>
          ) : (
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                backgroundColor: c.sparkSoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Flame size={18} color={c.spark} />
            </View>
          )}
          <View>
            <Text style={[styles.eyebrow, { color: c.spark }]}>{stageTitle}</Text>
            <Text style={[styles.small, { color: c.muted }]}>
              开工搭子 · 专治万事开头难
            </Text>
          </View>
        </View>
        <View style={styles.row}>
          <IconButton
            label="历史记录"
            subtle
            onPress={() => openSheet('history')}
          >
            <History size={18} color={c.ink} />
          </IconButton>
          <IconButton
            label="设置"
            subtle
            onPress={() => openSheet('settings')}
          >
            <Settings2 size={18} color={c.ink} />
          </IconButton>
        </View>
      </View>

      <ScrollView
        ref={scroll}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.page}
      >
        <Arrival id={screen}>
          {screen === 'home' ? (
            <View style={{ gap: 20, paddingTop: 8 }}>
              <View style={{ gap: 6 }}>
                <Text style={[styles.title, { color: c.ink }]}>
                  现在哪件事，{'\n'}让你迟迟不想动？
                </Text>
                <Text style={[styles.body, { color: c.muted }]}>
                  随便说一句或写几个字，剩下的拆解交给搭子。
                </Text>
              </View>

              <View style={{ gap: 8 }}>
                <Text style={[styles.small, { color: c.muted, fontWeight: '700' }]}>
                  1. 选择你此刻的能量状态：
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {ENERGY_OPTIONS.map((opt) => {
                    const activeOpt = energy === opt.key;
                    const Icon =
                      opt.key === 'low'
                        ? BatteryLow
                        : opt.key === 'mid'
                        ? Battery
                        : BatteryCharging;
                    return (
                      <Pressable
                        key={opt.key}
                        accessibilityRole="button"
                        accessibilityState={{ selected: activeOpt }}
                        onPress={() => setEnergy(opt.key)}
                        style={{
                          flex: 1,
                          padding: 10,
                          borderRadius: 14,
                          borderWidth: 1.5,
                          backgroundColor: activeOpt ? c.sparkSoft : c.surface,
                          borderColor: activeOpt ? c.spark : c.line,
                          gap: 4,
                        }}
                      >
                        <Icon
                          size={16}
                          color={activeOpt ? c.spark : c.muted}
                        />
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: '700',
                            color: activeOpt ? c.spark : c.ink,
                          }}
                        >
                          {opt.label}
                        </Text>
                        <Text
                          numberOfLines={1}
                          style={{ fontSize: 10, color: c.muted }}
                        >
                          {opt.desc}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View
                style={[
                  styles.card,
                  { backgroundColor: c.surface, borderColor: c.line },
                ]}
              >
                <TextInput
                  accessibilityLabel="输入让你卡住的事"
                  value={state.draft}
                  onChangeText={(text) =>
                    update((st) => ({ ...st, draft: text }), account)
                  }
                  multiline
                  maxLength={1000}
                  placeholder="直接打字，或者按住下方光环跟搭子语音吐槽…"
                  placeholderTextColor={c.muted}
                  style={{
                    minHeight: 76,
                    maxHeight: 140,
                    fontSize: 16,
                    lineHeight: 24,
                    color: c.ink,
                    textAlignVertical: 'top',
                  }}
                />

                {!state.draft.trim() ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {QUICK_PROMPTS.map((prompt) => (
                      <Pressable
                        key={prompt}
                        onPress={() =>
                          update((st) => ({ ...st, draft: prompt }), account)
                        }
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderRadius: 10,
                          backgroundColor: c.surfaceSubtle,
                        }}
                      >
                        <Text style={{ fontSize: 12, color: c.muted }}>
                          + {prompt}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                ) : (
                  <View style={styles.spread}>
                    <Text style={[styles.small, { color: c.muted }]}>
                      {state.draft.length} / 1000 字
                    </Text>
                    <GhostButton
                      label="清空重来"
                      onPress={() =>
                        update(
                          (st) => ({
                            ...st,
                            draft: '',
                            draftRecording: null,
                          }),
                          account
                        )
                      }
                    />
                  </View>
                )}

                <Rule />

                <VoiceCapture
                  active={active && !sheet}
                  recording={state.draftRecording}
                  onBusy={setVoiceBusy}
                  onPartialText={(partial) =>
                    update((st) => ({ ...st, draft: partial }), account)
                  }
                  onResult={(result) =>
                    update(
                      (st) => ({
                        ...st,
                        draft: result.text,
                        draftRecording: result.recording,
                      }),
                      account
                    )
                  }
                />

                {state.draft.trim() ? (
                  <PrimaryButton
                    label="帮我拆出第一步"
                    disabled={voiceBusy}
                    icon={<Sparkles size={18} color={c.onSpark} />}
                    onPress={create}
                  />
                ) : null}
              </View>

              {s && s.status !== 'finished' ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    go(screenFor(s));
                    if (s.status === 'ready' && !s.step)
                      setRequest({
                        id: s.id,
                        instruction: '接着这件事找一个开始。',
                        note: s.stuckAt,
                      });
                  }}
                  style={[
                    styles.card,
                    {
                      backgroundColor: c.sparkSoft,
                      borderColor: c.spark,
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 14,
                    },
                  ]}
                >
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text
                      style={[
                        styles.small,
                        { color: c.spark, fontWeight: '700' },
                      ]}
                    >
                      正在进行中的破冰 · 已完成 {s.completedSteps.length} 步
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={[styles.body, { color: c.ink, fontWeight: '600' }]}
                    >
                      {s.step?.action || s.task}
                    </Text>
                  </View>
                  <ChevronRight size={20} color={c.spark} />
                </Pressable>
              ) : (
                <View style={styles.spread}>
                  <Text style={[styles.small, { color: c.muted }]}>
                    录音与文本仅保存在本机，点击拆解才发送给 AI。
                  </Text>
                  <SparkTrail count={totalCompleted} />
                </View>
              )}
            </View>
          ) : null}

          {screen === 'action' && s ? (
            <View style={{ gap: 22, paddingTop: 12 }}>
              {busy ? (
                <View
                  style={{
                    alignItems: 'center',
                    paddingVertical: 48,
                    gap: 24,
                  }}
                >
                  <PulseOrb size={orbSize} alive active={active && !sheet}>
                    <View style={{ alignItems: 'center', gap: 6 }}>
                      <Sparkles size={28} color={c.spark} />
                      <Text
                        style={[
                          styles.small,
                          { color: c.ink, fontWeight: '700' },
                        ]}
                      >
                        正在拆解微动作…
                      </Text>
                    </View>
                  </PulseOrb>
                  <Text
                    style={[
                      styles.body,
                      { color: c.muted, textAlign: 'center', maxWidth: 280 },
                    ]}
                  >
                    正在把高难度任务压扁成一个 10 秒就能上手的动作
                  </Text>
                  <GhostButton label="取消并返回修改" onPress={back} />
                </View>
              ) : s.step ? (
                <>
                  <View style={styles.spread}>
                    <SparkTrail count={s.completedSteps.length} />
                    <Text style={[styles.small, { color: c.muted }]}>
                      别管全局，只看眼前这一步
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.card,
                      {
                        backgroundColor: c.surface,
                        borderColor: c.spark,
                        borderWidth: 1.5,
                        padding: 24,
                        gap: 16,
                      },
                    ]}
                  >
                    <View style={[styles.row, { justifyContent: 'space-between' }]}>
                      <Text style={[styles.eyebrow, { color: c.spark }]}>
                        NOW · 立刻可做的微动作
                      </Text>
                    </View>

                    <Text
                      selectable
                      style={[
                        styles.title,
                        { color: c.ink, fontSize: 26, lineHeight: 36 },
                      ]}
                    >
                      {s.step.action}
                    </Text>

                    <View
                      style={{
                        padding: 12,
                        borderRadius: 12,
                        backgroundColor: c.surfaceSubtle,
                        gap: 4,
                      }}
                    >
                      <Text
                        style={[
                          styles.small,
                          { color: c.ink, fontWeight: '600' },
                        ]}
                      >
                        💡 为什么这步毫无压力：{s.step.reason}
                      </Text>
                      {s.step.message ? (
                        <Text style={[styles.small, { color: c.moss }]}>
                          🌱 搭子：{s.step.message}
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  <View style={{ gap: 8 }}>
                    <Text style={[styles.small, { color: c.muted }]}>
                      觉得这一步还是有阻力？随时降维：
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      <PillButton
                        label="再切小一半"
                        icon={<Scissors size={14} color={c.ink} />}
                        onPress={() =>
                          generate(
                            '把刚才这个动作难度再砍掉一半，改成10秒内就能做完的准备动作。'
                          )
                        }
                      />
                      <PillButton
                        label="换个切入角度"
                        icon={<RefreshCw size={14} color={c.ink} />}
                        onPress={() =>
                          generate('换一个完全不同但同样轻松的切入动作。')
                        }
                      />
                      <PillButton
                        label="我有具体卡点…"
                        onPress={() => openSheet('blocker')}
                      />
                    </View>
                  </View>

                  <View
                    style={[
                      styles.card,
                      { backgroundColor: c.surface, borderColor: c.line },
                    ]}
                  >
                    <View style={styles.spread}>
                      <Text
                        style={[
                          styles.small,
                          { color: c.ink, fontWeight: '700' },
                        ]}
                      >
                        设定试做时长（时间到了不强制完成）：
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {[2, 5, 10, 15].map((val) => (
                        <Pressable
                          key={val}
                          onPress={() => setMinutes(val)}
                          style={{
                            flex: 1,
                            paddingVertical: 10,
                            borderRadius: 12,
                            borderWidth: 1,
                            alignItems: 'center',
                            backgroundColor:
                              minutes === val ? c.sparkSoft : c.surfaceSubtle,
                            borderColor: minutes === val ? c.spark : 'transparent',
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: '700',
                              color: minutes === val ? c.spark : c.ink,
                            }}
                          >
                            {val} 分钟
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                    <PrimaryButton
                      label={`点火开工 · 试做 ${minutes} 分钟`}
                      icon={<Play size={18} color={c.onSpark} />}
                      onPress={beginTimer}
                    />
                  </View>
                </>
              ) : (
                <View
                  style={[
                    styles.card,
                    { backgroundColor: c.surface, borderColor: c.line },
                  ]}
                >
                  <Text style={[styles.heading, { color: c.ink }]}>
                    还没拆出微步，再试一次
                  </Text>
                  {coach.error ? (
                    <Text style={[styles.body, { color: c.spark }]}>
                      {coach.error}
                    </Text>
                  ) : null}
                  <View style={styles.row}>
                    <PrimaryButton
                      label="重新拆解"
                      onPress={() => generate('给一个现在能开始的小动作。')}
                      style={{ flex: 1 }}
                    />
                    <PillButton
                      label="配置 AI"
                      onPress={() => app.ai.openSettings()}
                    />
                  </View>
                </View>
              )}
            </View>
          ) : null}

          {screen === 'timer' && s?.step ? (
            <View style={{ gap: 22, paddingTop: 12 }}>
              <View style={styles.spread}>
                <SparkTrail count={s.completedSteps.length} />
                <Text style={[styles.eyebrow, { color: c.spark }]}>
                  {s.firstConfirmed
                    ? 'MILESTONE · 破冰成功'
                    : s.status === 'checkin'
                    ? 'TIME UP · 计时到点'
                    : s.status === 'paused'
                    ? 'PAUSED · 已暂停'
                    : 'FOCUSING · 专注中'}
                </Text>
              </View>

              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: c.surface,
                    borderColor: c.line,
                    alignItems: 'center',
                    paddingVertical: 28,
                    gap: 22,
                  },
                ]}
              >
                <Text
                  selectable
                  style={[
                    styles.heading,
                    { color: c.ink, textAlign: 'center', paddingHorizontal: 12 },
                  ]}
                >
                  {s.step.action}
                </Text>

                <PulseOrb
                  size={orbSize}
                  alive={s.status === 'running'}
                  active={active && !sheet}
                  tone={s.firstConfirmed ? 'moss' : 'spark'}
                  progress={
                    s.plannedSec > 0 ? elapsedSec / s.plannedSec : 0
                  }
                >
                  {s.firstConfirmed ? (
                    <View style={{ alignItems: 'center', gap: 6 }}>
                      <Check size={48} color={c.moss} />
                      <Text
                        style={[
                          styles.small,
                          { color: c.moss, fontWeight: '700' },
                        ]}
                      >
                        这步已拿下！
                      </Text>
                    </View>
                  ) : (
                    <View style={{ alignItems: 'center', gap: 4 }}>
                      <Text
                        style={{
                          fontSize: 48,
                          fontWeight: '800',
                          color: c.ink,
                          fontVariant: ['tabular-nums'],
                        }}
                      >
                        {formatDuration(s.plannedSec - elapsedSec)}
                      </Text>
                      <Text style={[styles.small, { color: c.muted }]}>
                        {s.status === 'checkin'
                          ? '时间到，按你的真实进度确认'
                          : '只做眼前这件小事'}
                      </Text>
                    </View>
                  )}
                </PulseOrb>
              </View>

              {s.firstConfirmed ? (
                <View style={{ gap: 12 }}>
                  <PrimaryButton
                    tone="moss"
                    label="手感来了！顺势连击下一步"
                    icon={<Sparkles size={18} color={c.onSpark} />}
                    onPress={() =>
                      generate(
                        '用户已经完成上一动作，趁热打铁，沿着真实进展给顺理成章的下一步微动作，不重复已完成的动作。'
                      )
                    }
                  />
                  <PillButton
                    label="见好就收，生成今日行动小票"
                    onPress={() => finishRound()}
                  />
                </View>
              ) : (
                <View style={{ gap: 14 }}>
                  <PrimaryButton
                    tone="moss"
                    label="这步做完了，点亮它 ✓"
                    icon={<Check size={18} color={c.onSpark} />}
                    onPress={done}
                  />
                  <View style={[styles.spread, { flexWrap: 'wrap' }]}>
                    <PillButton
                      label={s.status === 'running' ? '暂停计时' : '继续计时'}
                      icon={
                        s.status === 'running' ? (
                          <Pause size={14} color={c.ink} />
                        ) : (
                          <Play size={14} color={c.ink} />
                        )
                      }
                      onPress={() => {
                        changeSession(
                          s.id,
                          (current) =>
                            current.status === 'running'
                              ? pause(current)
                              : resume(current),
                          account
                        );
                        setNow(Date.now());
                      }}
                    />
                    <PillButton
                      label="卡住了，换一招"
                      onPress={() => openSheet('blocker')}
                    />
                    <GhostButton
                      label="先停下留个进度"
                      onPress={() => openSheet('note')}
                    />
                  </View>
                </View>
              )}
            </View>
          ) : null}

          {screen === 'report' && s?.status === 'finished' ? (
            <Report
              session={s}
              onHome={() => go('home')}
              onAgain={() => continueTask(s)}
              onComplete={() => {
                recordFinished({ ...s, taskDone: true }, account);
                go('home');
              }}
            />
          ) : null}
        </Arrival>
      </ScrollView>

      <Modal
        transparent
        visible={!!sheet}
        animationType="slide"
        onRequestClose={closeSheet}
        statusBarTranslucent
      >
        <View
          style={{
            flex: 1,
            justifyContent: 'flex-end',
            backgroundColor: '#00000066',
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="关闭面板"
            onPress={closeSheet}
            style={{ flex: 1 }}
          />
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: c.sheet,
                paddingBottom: Math.max(insets.bottom, 20) + 12,
              },
            ]}
          >
            <View style={styles.spread}>
              <Text style={[styles.heading, { color: c.ink }]}>
                {sheet === 'history'
                  ? '历史破冰足迹'
                  : sheet === 'settings'
                  ? '偏好与隐私设置'
                  : sheet === 'blocker'
                  ? '卡在哪里了？告诉搭子'
                  : '留个进度锚点，下次接着做'}
              </Text>
              <IconButton label="关闭面板" subtle onPress={closeSheet}>
                <X size={18} color={c.ink} />
              </IconButton>
            </View>

            {sheet === 'history' ? (
              <View style={{ height: 360, flexShrink: 1 }}>
                <FlashList
                  data={state.history}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => {
                        if (item.taskDone) {
                          cancel();
                          const current = read().session;
                          if (
                            current &&
                            current.id !== item.id &&
                            current.status !== 'finished'
                          )
                            recordFinished(
                              finish(current, current.note, false),
                              account
                            );
                          update((st) => ({ ...st, session: item }), account);
                          closeSheet();
                          go('report');
                        } else continueTask(item);
                      }}
                      style={{
                        gap: 6,
                        paddingVertical: 14,
                        borderBottomWidth: 1,
                        borderColor: c.line,
                      }}
                    >
                      <View style={styles.spread}>
                        <Text style={[styles.small, { color: c.muted }]}>
                          {new Date(
                            item.completedAt || item.startedAt
                          ).toLocaleDateString()}{' '}
                          · 完成 {item.completedSteps.length} 步 ·{' '}
                          {formatDuration(item.elapsedSec)}
                        </Text>
                        <Text
                          style={[
                            styles.small,
                            {
                              color: item.taskDone ? c.moss : c.spark,
                              fontWeight: '700',
                            },
                          ]}
                        >
                          {item.taskDone ? '已完结' : '继续推进 →'}
                        </Text>
                      </View>
                      <Text
                        numberOfLines={2}
                        style={[styles.body, { color: c.ink, fontWeight: '600' }]}
                      >
                        {item.completedSteps.at(-1)?.action ||
                          item.step?.action ||
                          '一次破冰尝试'}
                      </Text>
                    </Pressable>
                  )}
                  ListEmptyComponent={
                    <Text
                      style={[
                        styles.body,
                        { color: c.muted, paddingVertical: 40, textAlign: 'center' },
                      ]}
                    >
                      还没有历史记录。每一次微小的启动都会留在这里。
                    </Text>
                  }
                />
              </View>
            ) : null}

            {sheet === 'settings' ? (
              <ScrollView style={{ flexShrink: 1 }}>
                <View style={{ gap: 14 }}>
                  <PillButton
                    label="配置 / 切换我的 AI 引擎"
                    onPress={() => {
                      closeSheet();
                      app.ai.openSettings();
                    }}
                  />
                  <PillButton
                    label={
                      state.reminders
                        ? '已开启倒计时到点通知（点击关闭）'
                        : '开启倒计时到点本地通知'
                    }
                    selected={state.reminders}
                    onPress={async () => {
                      if (state.reminders) {
                        update((st) => ({ ...st, reminders: false }), account);
                        return;
                      }
                      try {
                        await app.phone.requestNotifications();
                        if (owner() !== account) return;
                        const status = await app.phone.notificationStatus();
                        if (status.enabled)
                          update((st) => ({ ...st, reminders: true }), account);
                        else
                          app.toast.show('请先在系统设置中开启通知权限。');
                      } catch {
                        app.toast.show('通知设置失败，请稍后重试。');
                      }
                    }}
                  />
                  <Text style={[styles.small, { color: c.muted }]}>
                    隐私说明：原始语音仅保存在本机设备目录中，不会上传音频；仅在你点击拆解微步时将文字发送给你所配置的 AI。
                  </Text>
                  <Rule />
                  <GhostButton
                    danger
                    label="清除本机全部录音与破冰记录"
                    onPress={() =>
                      Alert.alert(
                        '确认清除全部数据？',
                        '所有本机录音与历史记录将被永久移除。',
                        [
                          { text: '取消', style: 'cancel' },
                          {
                            text: '确认清除',
                            style: 'destructive',
                            onPress: () => {
                              cancel();
                              clear(account);
                              closeSheet();
                              go('home');
                              syncReminder(null, false);
                            },
                          },
                        ]
                      )
                    }
                  />
                </View>
              </ScrollView>
            ) : null}

            {sheet === 'blocker' || sheet === 'note' ? (
              <ScrollView
                keyboardShouldPersistTaps="handled"
                style={{ flexShrink: 1 }}
              >
                <View style={{ gap: 16 }}>
                  <TextInput
                    accessibilityLabel={
                      sheet === 'blocker' ? '说明卡在哪里' : '记录当前进度'
                    }
                    value={sheetInput}
                    onChangeText={setSheetInput}
                    multiline
                    maxLength={800}
                    placeholder={
                      sheet === 'blocker'
                        ? '打字或按下方麦克风说说：哪一步让你觉得麻烦或卡住了？'
                        : '打字或语音记一句：现在做到哪了，下次打开直接接着做…'
                    }
                    placeholderTextColor={c.muted}
                    style={{
                      minHeight: 72,
                      padding: 12,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: c.line,
                      backgroundColor: c.surface,
                      color: c.ink,
                      fontSize: 15,
                      textAlignVertical: 'top',
                    }}
                  />
                  <VoiceCapture
                    active={active && !!sheet}
                    recording={spoken?.recording}
                    compact
                    onBusy={setVoiceBusy}
                    onPartialText={setSheetInput}
                    onResult={(result) => {
                      const old = spokenRef.current;
                      spokenRef.current = result;
                      setSpoken(result);
                      setSheetInput(result.text);
                      if (old)
                        void voiceFiles
                          .remove(old.recording.path)
                          .catch(() => {});
                    }}
                  />
                  {sheet === 'blocker' ? (
                    <PrimaryButton
                      label="根据这个卡点，重拆一个更轻的动作"
                      disabled={voiceBusy || !sheetInput.trim()}
                      onPress={() => {
                        const text = sheetInput.trim();
                        closeSheet();
                        generate(
                          '根据用户的实际卡点，绕开阻力，给一个更容易上手的微动作。',
                          text
                        );
                      }}
                    />
                  ) : (
                    <PrimaryButton
                      label="保存进度并查看今日小票"
                      disabled={voiceBusy}
                      onPress={() =>
                        finishRound(sheetInput.trim() || s?.note || '')
                      }
                    />
                  )}
                  <GhostButton
                    label="不留话，直接结束这一轮"
                    disabled={voiceBusy}
                    onPress={() => finishRound(s?.note || '')}
                  />
                </View>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

export default function StartCoach() {
  useStore();
  return <CoachApp key={owner()} />;
}
