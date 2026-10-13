import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  AppState,
  BackHandler,
  Modal,
  Pressable,
  ScrollView,
  Text,
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
  ArrowRight,
  Check,
  ChevronRight,
  History,
  Pause,
  Play,
  Settings2,
  X,
} from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
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
  type Session,
  type Step,
} from './domain';
import { useCoach } from './coach';
import {
  Arrival,
  IconButton,
  InkButton,
  Paper,
  Pebble,
  QuietButton,
  Rule,
  styles,
  Trace,
  usePaper,
} from './ui';
import { VoiceStone, type VoiceResult } from './voice';
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
const screenFor = (s: Session): Screen =>
  s.status === 'ready'
    ? 'action'
    : s.status === 'finished'
    ? 'report'
    : 'timer';
function CoachApp() {
  const c = usePaper(),
    state = useStore(),
    s = state.session,
    account = useRef(owner()).current,
    insets = useSafeAreaInsets(),
    { width } = useWindowDimensions();
  const [screen, setScreen] = useState<Screen>('home'),
    [sheet, setSheet] = useState<Sheet>(null),
    [foreground, setForeground] = useState(AppState.currentState === 'active'),
    [now, setNow] = useState(Date.now());
  const [request, setRequest] = useState<Request | null>(null),
    [voiceBusy, setVoiceBusy] = useState(false),
    [minutes, setMinutes] = useState(5),
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
    setScreen(next);
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, []);
  const closeSheet = useCallback(() => {
    const clip = spokenRef.current;
    if (clip) void voiceFiles.remove(clip.recording.path).catch(() => {});
    spokenRef.current = null;
    setSpoken(null);
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
    if (!state.draft.trim() || !state.draftRecording) return;
    const begin = () => {
      cancel();
      const session = {
        ...makeSession(state.draft),
        recording: state.draftRecording!,
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
        instruction: '找到一个现在能开始的动作。',
        note: '',
      });
      event('task_submitted', account);
    };
    if (s && s.status !== 'finished')
      Alert.alert('先留下刚才的进展？', '然后开始新的这件事。', [
        { text: '取消', style: 'cancel' },
        {
          text: '保存并开始',
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
        instruction: '接着已完成动作、上次进展与卡点继续，不要从头开始。',
        note: saved.stuckAt,
      });
    };
    if (s && s.id !== saved.id && s.status !== 'finished')
      Alert.alert('接着另一件事？', '当前进展会先保存。', [
        { text: '取消', style: 'cancel' },
        {
          text: '保存并接着做',
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
    stoneSize = Math.min(260, width - 90);
  const aiError = coach.error ? (
    <View style={{ gap: 8 }}>
      <Text
        accessibilityLiveRegion="polite"
        style={[styles.body, { color: c.clay }]}
      >
        {coach.error}
      </Text>
      <View style={styles.spread}>
        <QuietButton
          label="再试一次"
          onPress={() => generate('给一个适合现在的小动作。')}
        />
        <QuietButton label="连接 AI" onPress={() => app.ai.openSettings()} />
      </View>
    </View>
  ) : null;
  const durations = (
    <View style={[styles.row, { gap: 24 }]}>
      {[3, 5, 10, 15].map((value) => (
        <Pressable
          key={value}
          accessibilityRole="button"
          accessibilityState={{ selected: minutes === value }}
          onPress={() => setMinutes(value)}
          style={{
            minHeight: 48,
            justifyContent: 'center',
            borderBottomWidth: 1,
            borderColor: minutes === value ? c.clay : 'transparent',
          }}
        >
          <Text
            style={{
              color: minutes === value ? c.clay : c.muted,
              fontSize: 13,
            }}
          >
            {value} 分
          </Text>
        </Pressable>
      ))}
    </View>
  );
  const caption =
    screen === 'home'
      ? 'KAIGONG / 慢慢开始'
      : screen === 'action'
      ? '一件事 · 一个开始'
      : screen === 'timer'
      ? '留在这一刻'
      : '留下的痕迹';
  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={[styles.root, { backgroundColor: c.paper }]}
    >
      <Paper />
      <View style={styles.header}>
        <View style={[styles.row, { flex: 1 }]}>
          {screen !== 'home' ? (
            <IconButton label="回到首页" onPress={back}>
              <ArrowLeft size={19} color={c.ink} strokeWidth={1.3} />
            </IconButton>
          ) : null}
          <Text style={[styles.eyebrow, { color: c.muted, flexShrink: 1 }]}>
            {caption}
          </Text>
        </View>
        <View style={styles.row}>
          <IconButton label="开工记录" onPress={() => openSheet('history')}>
            <History size={19} color={c.muted} strokeWidth={1.3} />
          </IconButton>
          <IconButton label="设置" onPress={() => openSheet('settings')}>
            <Settings2 size={19} color={c.muted} strokeWidth={1.3} />
          </IconButton>
        </View>
      </View>
      <ScrollView ref={scroll} contentContainerStyle={styles.page}>
        <Arrival id={screen}>
          {screen === 'home' ? (
            <View
              style={{ flexGrow: 1, justifyContent: 'space-between', gap: 28 }}
            >
              <View style={{ paddingTop: 24, paddingLeft: 10 }}>
                <Text style={[styles.title, { color: c.ink }]}>
                  把心里的事，
                  <Text style={{ color: c.clay }}>{'\n'}轻轻放下来。</Text>
                </Text>
                <Text
                  style={[
                    styles.small,
                    { color: c.muted, marginTop: 18, paddingLeft: 24 },
                  ]}
                >
                  不用组织语言。搭子在这儿。
                </Text>
              </View>
              <View style={{ alignSelf: 'center', paddingVertical: 14 }}>
                <VoiceStone
                  active={active && !sheet}
                  recording={
                    state.draftRecording ||
                    (s?.status !== 'finished' ? s?.recording : undefined)
                  }
                  onBusy={setVoiceBusy}
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
              </View>
              {state.draftRecording ? (
                <View style={{ gap: 12 }}>
                  <InkButton
                    label="交给搭子，找个开始"
                    disabled={voiceBusy}
                    icon={<ArrowRight size={17} color={c.paper} />}
                    onPress={create}
                  />
                  {!state.aiAllowed ? (
                    <Text style={[styles.small, { color: c.muted }]}>
                      仅将转成的文字交给你连接的 AI。录音留在本机。
                    </Text>
                  ) : null}
                </View>
              ) : null}
              <View style={{ gap: 12 }}>
                <Rule />
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
                    style={[styles.spread, { minHeight: 64 }]}
                  >
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={[styles.small, { color: c.clay }]}>
                        有一件事，等你回来
                      </Text>
                      <Text
                        numberOfLines={1}
                        style={[styles.body, { color: c.ink }]}
                      >
                        {s.step?.action || '刚才的声音，还在这里。'}
                      </Text>
                    </View>
                    <ChevronRight size={18} color={c.muted} />
                  </Pressable>
                ) : (
                  <View style={[styles.spread, { minHeight: 44 }]}>
                    <Text style={[styles.small, { color: c.muted }]}>
                      不赶路，也是在往前走。
                    </Text>
                    <Trace
                      count={state.history.reduce(
                        (n, h) => n + h.completedSteps.length,
                        0
                      )}
                    />
                  </View>
                )}
              </View>
            </View>
          ) : null}
          {screen === 'action' && s ? (
            <View
              style={{
                flexGrow: 1,
                justifyContent: 'space-between',
                gap: 28,
                paddingTop: 24,
              }}
            >
              {busy ? (
                <>
                  <Text style={[styles.title, { color: c.ink }]}>
                    不必一下子，{'\n'}想明白所有。
                  </Text>
                  <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                    <Pebble size={stoneSize} alive active={active && !sheet}>
                      <Text style={[styles.eyebrow, { color: c.ink }]}>
                        搭子在想
                      </Text>
                    </Pebble>
                  </View>
                  <Text style={[styles.body, { color: c.muted }]}>
                    从你说的这件事里，找一个轻一点的落脚处。
                  </Text>
                  <QuietButton label="先回来，稍后再试" onPress={back} />
                </>
              ) : s.step ? (
                <>
                  <View style={styles.spread}>
                    <Text style={[styles.eyebrow, { color: c.clay }]}>
                      就从这里
                    </Text>
                    <Trace count={s.completedSteps.length} />
                  </View>
                  <View style={{ gap: 24, paddingVertical: 24 }}>
                    <Text
                      selectable
                      style={[
                        styles.title,
                        { color: c.ink, fontSize: 32, lineHeight: 48 },
                      ]}
                    >
                      {s.step.action}
                    </Text>
                    <Svg width="65" height="18" viewBox="0 0 65 18">
                      <Path
                        d="M2 12C18 5 29 14 41 8L62 5"
                        stroke={c.clay}
                        strokeWidth="1.5"
                        fill="none"
                      />
                    </Svg>
                    <Text
                      style={[styles.body, { color: c.muted, maxWidth: 290 }]}
                    >
                      {s.step.reason}
                    </Text>
                  </View>
                  {s.step.message ? (
                    <Text style={[styles.body, { color: c.moss }]}>
                      {s.step.message}
                    </Text>
                  ) : null}
                  <View style={{ gap: 14 }}>
                    {durations}
                    <InkButton
                      label={`给它 ${minutes} 分钟`}
                      icon={<Play size={17} color={c.paper} />}
                      onPress={beginTimer}
                    />
                    <View style={styles.spread}>
                      <QuietButton
                        label="再轻一点"
                        onPress={() =>
                          generate('把刚才这个动作再缩小，保留任务方向。')
                        }
                      />
                      <QuietButton
                        label="我卡在别处"
                        onPress={() => openSheet('blocker')}
                      />
                    </View>
                  </View>
                </>
              ) : (
                <View style={{ gap: 24 }}>
                  <Text style={[styles.title, { color: c.ink }]}>
                    声音已经留下。{'\n'}再找一次开始。
                  </Text>
                  {aiError}
                  {!coach.error ? (
                    <InkButton
                      label="让搭子再想一次"
                      onPress={() => generate('给一个现在能开始的小动作。')}
                    />
                  ) : null}
                </View>
              )}
            </View>
          ) : null}
          {screen === 'timer' && s?.step ? (
            <View
              style={{
                flexGrow: 1,
                gap: 22,
                paddingTop: 18,
                justifyContent: 'space-between',
              }}
            >
              <View style={styles.spread}>
                <Text style={[styles.eyebrow, { color: c.clay }]}>
                  {s.firstConfirmed
                    ? '又往前了一点'
                    : s.status === 'checkin'
                    ? '不用赶，按你的节奏'
                    : s.status === 'paused'
                    ? '暂时停在这里'
                    : '现在，只做这一件'}
                </Text>
                <Trace count={s.completedSteps.length} />
              </View>
              <Text
                selectable
                style={[styles.heading, { color: c.ink, maxWidth: 320 }]}
              >
                {s.step.action}
              </Text>
              <View style={{ alignItems: 'center', paddingVertical: 16 }}>
                <Pebble
                  size={stoneSize}
                  alive={s.status === 'running'}
                  active={active && !sheet}
                >
                  {s.firstConfirmed ? (
                    <Check size={52} strokeWidth={1} color={c.moss} />
                  ) : (
                    <View style={{ alignItems: 'center', gap: 6 }}>
                      <Text
                        style={{
                          fontFamily: 'serif',
                          fontSize: 56,
                          color: c.ink,
                          fontVariant: ['tabular-nums'],
                          letterSpacing: -1,
                        }}
                      >
                        {formatDuration(s.plannedSec - elapsedSec)}
                      </Text>
                      <Text style={[styles.eyebrow, { color: c.muted }]}>
                        给自己一点时间
                      </Text>
                    </View>
                  )}
                </Pebble>
              </View>
              {s.firstConfirmed ? (
                <View style={{ gap: 14 }}>
                  <Text style={[styles.body, { color: c.moss }]}>
                    做到了，就让这一刻停留一下。
                  </Text>
                  <InkButton
                    label="还有力气，接着走"
                    onPress={() =>
                      generate(
                        '用户已经完成上一动作，沿着真实进展给下一步，不重复已完成的动作。'
                      )
                    }
                  />
                  <QuietButton
                    label="今天就到这里"
                    onPress={() => finishRound()}
                  />
                </View>
              ) : (
                <View style={{ gap: 12 }}>
                  <InkButton label="这一小步，做到了" onPress={done} />
                  <View style={styles.spread}>
                    <IconButton
                      label={s.status === 'running' ? '暂停' : '继续做'}
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
                    >
                      {s.status === 'running' ? (
                        <Pause size={20} color={c.muted} />
                      ) : (
                        <Play size={20} color={c.muted} />
                      )}
                    </IconButton>
                    <QuietButton
                      label="卡住了，说给搭子听"
                      onPress={() => openSheet('blocker')}
                    />
                    <QuietButton
                      label="先到这里"
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
            backgroundColor: '#00000055',
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
                  ? '那些小小的开始'
                  : sheet === 'settings'
                  ? '按自己的节奏'
                  : sheet === 'blocker'
                  ? '卡在哪里了？'
                  : '留一句，下次接着来'}
              </Text>
              <IconButton label="关闭面板" onPress={closeSheet}>
                <X size={19} color={c.muted} />
              </IconButton>
            </View>
            {sheet === 'history' ? (
              <View style={{ height: 340, flexShrink: 1 }}>
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
                        gap: 8,
                        paddingVertical: 20,
                        borderBottomWidth: 1,
                        borderColor: c.line,
                      }}
                    >
                      <View style={styles.spread}>
                        <Text style={[styles.eyebrow, { color: c.muted }]}>
                          {new Date(
                            item.completedAt || item.startedAt
                          ).toLocaleDateString()}{' '}
                          · {item.completedSteps.length} 步
                        </Text>
                        <Text style={[styles.small, { color: c.clay }]}>
                          {item.taskDone ? '已完成' : '接着做'}
                        </Text>
                      </View>
                      <Text
                        numberOfLines={2}
                        style={[styles.body, { color: c.ink }]}
                      >
                        {item.completedSteps.at(-1)?.action ||
                          item.step?.action ||
                          '一个留在这里的开始'}
                      </Text>
                    </Pressable>
                  )}
                  ListEmptyComponent={
                    <Text
                      style={[
                        styles.body,
                        { color: c.muted, paddingVertical: 40 },
                      ]}
                    >
                      还没有记录。每个小小的开始，都会留在这里。
                    </Text>
                  }
                />
              </View>
            ) : null}
            {sheet === 'settings' ? (
              <ScrollView style={{ flexShrink: 1 }}>
                <View style={{ gap: 16 }}>
                  <QuietButton
                    label="连接你的 AI"
                    onPress={() => {
                      closeSheet();
                      app.ai.openSettings();
                    }}
                  />
                  <Rule />
                  <QuietButton
                    label={state.reminders ? '关闭时间提醒' : '开启时间提醒'}
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
                          app.toast.show('通知还未开启，可以到系统设置看看。');
                      } catch {
                        app.toast.show('暂时没有设好提醒，请稍后再试。');
                      }
                    }}
                  />
                  <Text style={[styles.small, { color: c.muted }]}>
                    声音和进展留在本机。仅在你点击交给搭子时，将文字发送给你连接的
                    AI。
                  </Text>
                  <Rule />
                  <QuietButton
                    label="清除本机声音与记录"
                    onPress={() =>
                      Alert.alert(
                        '清除所有开工记录？',
                        '录音和进展会从本机移除。',
                        [
                          { text: '取消', style: 'cancel' },
                          {
                            text: '清除',
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
              <ScrollView style={{ flexShrink: 1 }}>
                <View style={{ gap: 18 }}>
                  <Text style={[styles.body, { color: c.muted }]}>
                    {sheet === 'blocker'
                      ? '不用解释清楚。说说哪一步，让你停住了。'
                      : '做到哪里了，下次从哪里继续。也可以什么都不说。'}
                  </Text>
                  <VoiceStone
                    active={active && !!sheet}
                    recording={spoken?.recording}
                    compact
                    onBusy={setVoiceBusy}
                    onResult={(result) => {
                      const old = spokenRef.current;
                      spokenRef.current = result;
                      setSpoken(result);
                      if (old)
                        void voiceFiles
                          .remove(old.recording.path)
                          .catch(() => {});
                    }}
                  />
                  {sheet === 'blocker' ? (
                    <InkButton
                      label="换一个更轻的办法"
                      disabled={voiceBusy || !spoken}
                      onPress={() => {
                        const text = spoken?.text || '';
                        closeSheet();
                        generate(
                          '根据这个实际卡点，给一个更合适的小动作。',
                          text
                        );
                      }}
                    />
                  ) : (
                    <InkButton
                      label="把这一刻留下"
                      disabled={voiceBusy}
                      onPress={() => finishRound(spoken?.text || s?.note || '')}
                    />
                  )}
                  <QuietButton
                    label={
                      sheet === 'blocker' ? '今天先到这里' : '不留话，直接保存'
                    }
                    disabled={voiceBusy}
                    onPress={() => {
                      if (sheet === 'blocker' && s && spoken)
                        changeSession(
                          s.id,
                          (current) => ({ ...current, stuckAt: spoken.text }),
                          account
                        );
                      finishRound(
                        sheet === 'blocker' ? s?.note : spoken?.text || s?.note
                      );
                    }}
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
