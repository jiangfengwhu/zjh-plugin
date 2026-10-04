import { memo, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { getAppContext } from "@zijinhua/app-sdk";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView as ScrollView, KeyboardAvoidingView, type KeyboardAwareScrollViewRef } from "react-native-keyboard-controller";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOutUp,
  LinearTransition,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { EdgeModal as Modal, Screen, ScreenBar } from "@zijinhua/app-sdk/ui";
import { BackChip, GiltLine, Icon, Pressy, SectionTitle, Surface } from "@zijinhua/app-sdk/ui";
import { JollyLoading, JollyVideoPlayer, type JollyState } from "./ui";
import { themedStyleSheet, useTheme, type Theme } from "@zijinhua/app-sdk/ui";
import { AGENT_PROVIDERS } from "./agentProviders";
import { getCreationService } from "@zijinhua/app-sdk/creation";
const { readPreference: readShellValue, writePreference: writeShellValue } = getCreationService("jolly");

export type AgentTrace = {
  id: string;
  kind: "text" | "tool" | "status";
  title: string;
  detail?: string;
  state: "running" | "done" | "error";
};

const nameListeners = new Set<(name: string) => void>();

type Props = {
  visible: boolean;
  stage: import("./run").WorkshopStage;
  canContinue: boolean;
  targetTitle: string;
  value: string;
  prompt: string;
  status: string;
  busy: boolean;
  traces: AgentTrace[];
  report: string;
  startedAt?: number;
  sessionId: string;
  sessionLoading: boolean;
  onNewSession: () => void;
  showDelivery: boolean;
  versionLoaded: boolean;
  awaitingReply: boolean;
  deliveryBusy: boolean;
  deliveryMessage: string;
  onLoadWish: () => void;
  onPublish: () => void;
  providerId: string;
  onProviderChange: (id: string) => void;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onEdit?: () => void;
  onStop: () => void;
  onBack?: () => void;
  publicReleaseId?: string;
  candidateReleaseId?: string;
  history: AgentTrace[];
  historyCursor?: string;
  historyBusy: boolean;
  historyError: string;
  onLoadHistory: () => void;
  scrollKey: string;
  preparation?: ReactNode;
};

type Idea = {
  category: string;
  title: string;
  prompt: string;
};

const IDEAS: Idea[] = [
  {
    category: "专注",
    title: "森林番茄钟",
    prompt: "温暖治愈的番茄钟：带 25 分钟倒计时环、今日专注小花朵计数、休息提醒与柔和音效",
  },
  {
    category: "手账",
    title: "每日心晴手账",
    prompt: "随身心晴手账：按日期记录今日心动瞬间、待办小愿望与随笔想法，支持一键清空与本地保存",
  },
  {
    category: "打卡",
    title: "七日小习惯",
    prompt: "温馨可爱的习惯打卡：7 日打卡连胜点亮、喝水/早睡小目标计数与鼓励贴纸面板",
  },
];

type Tone = "cyan" | "orchid" | "amber" | "emerald";

function cleanTraceDetail(raw?: string): string {
  if (!raw) return "";
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/^[\s\n\r]+/, "")
    .replace(/[\s\n\r]+$/, "")
    .replace(/\n{3,}/g, "\n\n");
}

function classifyToolChip(title: string): { chip: string; tone: Tone } {
  const lower = title.toLowerCase();
  if (
    lower.includes("read") ||
    lower.includes("view") ||
    lower.includes("grep") ||
    lower.includes("search") ||
    lower.includes("find") ||
    lower.includes("list") ||
    title.includes("读取") ||
    title.includes("查看") ||
    title.includes("搜索")
  ) {
    return { chip: "查阅", tone: "cyan" };
  }
  if (
    lower.includes("write") ||
    lower.includes("edit") ||
    lower.includes("replace") ||
    lower.includes("patch") ||
    lower.includes("create") ||
    title.includes("写入") ||
    title.includes("修改") ||
    title.includes("生成")
  ) {
    return { chip: "编制", tone: "orchid" };
  }
  if (
    lower.includes("bash") ||
    lower.includes("exec") ||
    lower.includes("run") ||
    lower.includes("cmd") ||
    lower.includes("tsc") ||
    lower.includes("build") ||
    title.includes("执行") ||
    title.includes("编译")
  ) {
    return { chip: "运行", tone: "amber" };
  }
  return { chip: "步骤", tone: "emerald" };
}

function toneColors(tone: Tone, colors: Theme): { text: string; tint: string } {
  if (tone === "cyan") return { text: colors.cyanText, tint: colors.cyanTint };
  if (tone === "orchid") return { text: colors.orchidText, tint: colors.orchidTint };
  if (tone === "amber") return { text: colors.amberText, tint: colors.amberTint };
  return { text: colors.greenText, tint: colors.greenTint };
}

export const AgentScreen = memo(function AgentScreen({
  visible, stage, canContinue, targetTitle,
  value,
  prompt,
  status,
  busy,
  traces,
  report,
  startedAt = 0,
  sessionId,
  sessionLoading,
  onNewSession,
  showDelivery,
  versionLoaded,
  awaitingReply,
  deliveryBusy,
  deliveryMessage,
  onLoadWish,
  onPublish,
  providerId,
  onProviderChange,
  onChange,
  onSubmit,
  onEdit,
  onStop,
  onBack,
  publicReleaseId, candidateReleaseId, history, historyCursor, historyBusy, historyError, onLoadHistory, scrollKey, preparation,
}: Props) {
  const { colors } = useTheme();
  const scrollRef = useRef<KeyboardAwareScrollViewRef>(null);
  const scrollTarget = useRef(Number(getAppContext().storage.get(scrollKey)) || 0);
  const scrollRestored = useRef(scrollTarget.current === 0);
  const viewport = useRef(0);
  const contentHeight = useRef(0);
  function restoreScroll() {
    if (scrollRestored.current || sessionLoading || contentHeight.current <= 0 || viewport.current <= 0) return;
    const y = Math.min(Math.max(0, scrollTarget.current), Math.max(0, contentHeight.current - viewport.current));
    scrollRef.current?.scrollTo({ y, animated: false });
    scrollRestored.current = true;
    getAppContext().storage.set(scrollKey, String(y));
  }
  useEffect(() => { restoreScroll(); }, [sessionLoading, visible]);

  const [companionName, setCompanionName] = useState("狗蛋");
  const [nameInput, setNameInput] = useState("狗蛋");
  const [nameModalVisible, setNameModalVisible] = useState(false);

  const [traceExpanded, setTraceExpanded] = useState(false);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [recordsOpen, setRecordsOpen] = useState(false);
  const [stepsOpen, setStepsOpen] = useState(false);
  const [detailTrace, setDetailTrace] = useState<AgentTrace>();
  const [showLastSnapshot, setShowLastSnapshot] = useState(false);

  useEffect(() => {
    let live = true;
    const update = (name: string) => { if (live) { setCompanionName(name); setNameInput(name); } };
    nameListeners.add(update);
    if (visible) void readShellValue("shell.companion.name.v1").then(saved => { if (saved) update(saved); }).catch(() => {});
    return () => { live = false; nameListeners.delete(update); };
  }, [visible]);

  const handleSaveName = async () => {
    const trimmed = nameInput.trim() || "狗蛋";
    setCompanionName(trimmed);
    setNameModalVisible(false);
    try {
      writeShellValue("shell.companion.name.v1", trimmed);
      for (const listener of nameListeners) listener(trimmed);
    } catch (err) {
      console.log("save companion name failed", err);
    }
  };

  const openNameEditor = () => {
    setNameInput(companionName);
    setNameModalVisible(true);
  };


  const actionTraces = useMemo(() => traces.filter((t) => t.kind !== "text"), [traces]);
  const stillRunning = busy;
  const latestText = useMemo(
    () => cleanTraceDetail([...traces].reverse().find((t) => t.kind === "text")?.detail),
    [traces]
  );
  const finalReport = cleanTraceDetail(report) || (!stillRunning ? latestText : "");

  const hasError = useMemo(
    () =>
      traces.some((t) => t.state === "error") ||
      status.includes("失败") ||
      status.toLowerCase().includes("error"),
    [traces, status]
  );

  const hasSession = busy || Boolean(prompt) || traces.length > 0;

  const currentTicker = useMemo(() => {
    const latestAction = actionTraces[actionTraces.length - 1];
    if (stillRunning) {
      if (status && (status.includes("下载") || status.includes("同步") || status.includes("停止"))) {
        return { key: `status-${status}`, badge: "同步", text: status.trim() };
      }
      if (latestAction) {
        const chip =
          latestAction.kind === "tool"
            ? classifyToolChip(latestAction.title).chip
            : latestAction.title.includes("思考")
              ? "思考"
              : "阶段";
        return { key: latestAction.id, badge: chip, text: latestAction.title.trim() };
      }
      return { key: `boot-${status || "init"}`, badge: "准备", text: (status || "正在构思你的想法").trim() };
    }

    if (["paused", "reply", "blocked"].includes(stage)) return { key: stage, badge: stage === "paused" ? "暂停" : "等待", text: status || "需要你的回应，尚未完成" };
    if (hasError) {
      const errNode = [...traces].reverse().find((t) => t.state === "error");
      return {
        key: `err-${errNode?.id ?? status}`,
        badge: "提示",
        text: (errNode?.title || status || "遇到一点小波折").trim(),
      };
    }

    return {
      key: `done-${actionTraces.length}-${status}`,
      badge: stage === "ready" ? "完成" : stage === "load" ? "交付" : "状态",
      text: showDelivery ? versionLoaded ? "作品已打开" : "请查看上方交付状态" : canContinue ? "可以继续修改" : status || "尚未开始",
    };
  }, [stillRunning, status, actionTraces, hasError, traces, stage, showDelivery, versionLoaded, canContinue]);


  const runningTrace = useMemo(() => traces.find((t) => t.state === "running"), [traces]);

  const jollyLiveState: JollyState = useMemo(() => {
    if (!hasSession && !busy) return "idle";
    if (stillRunning) {
      if (traces.length === 0 || runningTrace?.id === "boot") {
        return "waking";
      }
      if (
        runningTrace?.id === "thinking" ||
        status.includes("下载") ||
        status.includes("打包") ||
        status.includes("构想")
      ) {
        return "making";
      }
      return "working";
    }
    if (hasError) return "waking";
    if (hasSession && finalReport) return "level_up";
    return "idle";
  }, [hasSession, stillRunning, traces.length, runningTrace, status, hasError, finalReport]);

  const phase: "busy" | "error" | "done" | "idle" = stage === "making" ? "busy" : stage === "failed" || stage === "blocked" ? "error" : stage === "ready" || stage === "load" ? "done" : "idle";
  const publicCurrent = Boolean(candidateReleaseId && publicReleaseId === candidateReleaseId);
  const phaseLabel = stage === "ready" && publicCurrent ? "已公开" : stage === "ready" && versionLoaded ? "已打开" : { draft: "尚未开始", making: "制作中", reply: "需要回应", load: "待体验", ready: "可继续修改", paused: "已暂停", failed: "制作未完成", blocked: "需要处理" }[stage];
  const phaseTone =
    phase === "busy"
      ? { dot: colors.accent, text: colors.accentText, tint: colors.accentTint }
      : phase === "error"
        ? { dot: colors.red, text: colors.redText, tint: colors.redTint }
        : phase === "done"
          ? { dot: colors.green, text: colors.greenText, tint: colors.greenTint }
          : { dot: colors.ink3, text: colors.ink2, tint: colors.inset };

  return (
    <Screen style={styles.screen}>
      <ScreenBar style={styles.header}>
        {onBack ? <BackChip onPress={onBack} /> : null}
        <View style={styles.headerCopy}>
          <Text style={styles.title} numberOfLines={1}>{targetTitle}</Text>
          <Text style={styles.caption} numberOfLines={1}>
            和 {companionName} 一起制作
          </Text>
        </View>
        <View style={[styles.phase, { backgroundColor: phaseTone.tint }]}>
          {phase === "busy" ? <PulseDot color={phaseTone.dot} /> : <View style={[styles.phaseDot, { backgroundColor: phaseTone.dot }]} />}
          <Text style={[styles.phaseText, { color: phaseTone.text }]}>{phaseLabel}</Text>
        </View>
      </ScreenBar>

      <ScrollView removeClippedSubviews={false}
        ref={scrollRef}
        onLayout={event => { viewport.current = event.nativeEvent.layout.height; restoreScroll(); }}
        onContentSizeChange={(_, height) => {
          contentHeight.current = height; restoreScroll();
        }}
        onScroll={event => {
          if (scrollRestored.current) getAppContext().storage.set(scrollKey, String(Math.max(0, event.nativeEvent.contentOffset.y)));
        }}
        scrollEventThrottle={200}
        style={styles.fill}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        // 保留视频的原生视图，滚出屏幕后回来时不重建播放表面。
      >
        {sessionId || sessionLoading ? (
          <Surface tone="inset" style={styles.sessionPanel}>
            <View style={styles.sessionSeal}><Icon name="edit" size={16} color={colors.accentText} /></View>
            <View style={styles.heroCopy}>
              <Text style={styles.sessionTitle}>{sessionLoading ? "正在接回你的心愿" : "这一份心愿，我们接着做"}</Text>
              <Text style={styles.caption}>{showDelivery ? (publicCurrent ? "这个版本已公开，后续修改由你决定何时更新市场。" : versionLoaded ? "这个版本已打开，满意后可以发布到市场。" : "这个版本可以体验，体验后再决定是否发布。") : awaitingReply ? "可以在下方继续描述需求，沿用这份作品制作。" : "这份作品会接着上次的进度制作，其他作品也可以同时开始。"}</Text>
            </View>
            {!busy && !showDelivery && !awaitingReply ? (
              <Pressy accessibilityRole="button" disabled={sessionLoading} onPress={onNewSession} style={styles.sessionButton}>
                <Text style={styles.sessionButtonText}>接回心愿</Text>
              </Pressy>
            ) : null}
          </Surface>
        ) : hasSession ? (
          <Pressy accessibilityRole="button" onPress={onNewSession} style={styles.sessionButton}>
            <Text style={styles.sessionButtonText}>开启新的心愿</Text>
          </Pressy>
        ) : null}
        {awaitingReply && deliveryMessage ? (
          <Surface tone="raised" radius={colors.radius.xl} style={styles.deliveryPanel}>
            <Text style={styles.reportTitle}>作品交付需要处理</Text>
            <Text accessibilityLiveRegion="polite" style={styles.deliveryPanelMessage}>{deliveryMessage}</Text>
            <Text style={styles.deliveryPanelHint}>可以在下方回复伙伴修复问题；修复发包后重新检查交付。</Text>
            <Pressy accessibilityRole="button" disabled={sessionLoading || busy} onPress={onNewSession} style={styles.ghost}>
              <Text style={styles.ghostText}>重新检查交付</Text>
            </Pressy>
          </Surface>
        ) : null}
        {showDelivery ? (
          <Animated.View>
            <Surface tone="raised" radius={colors.radius.xl} lifted style={styles.deliveryPanel}>
              <GiltLine style={styles.reportEdge} />
              <View style={styles.reportHead}>
                <View style={styles.sessionSeal}><Icon name="check" size={17} color={colors.accentText} /></View>
                <Text style={styles.reportTitle}>{publicCurrent ? "这个版本已公开" : "作品可以体验了"}</Text>
              </View>
              <Text style={styles.deliveryPanelText}>可以打开体验，在下方继续提出修改，满意后发布到应用市场。</Text>
              {deliveryMessage ? <Text accessibilityLiveRegion="polite" style={styles.deliveryPanelMessage}>{deliveryMessage}</Text> : null}
              <View style={styles.deliveryPanelActions}>
                <Pressy accessibilityRole="button" disabled={deliveryBusy || sessionLoading} onPress={onLoadWish} style={styles.primary}>
                  <Text style={styles.primaryText}>{deliveryBusy ? "正在处理…" : versionLoaded ? "打开作品" : "体验作品"}</Text>
                </Pressy>
                <Pressy accessibilityRole="button" disabled={deliveryBusy || sessionLoading} onPress={onPublish} style={styles.ghost}>
                  <Text style={styles.ghostText}>{publicCurrent ? "管理公开版本" : publicReleaseId ? "更新市场版本" : "发布到市场"}</Text>
                </Pressy>
              </View>
              <Text style={styles.deliveryPanelHint}>后续发包不会自动改变市场上的公开版本。</Text>
            </Surface>
          </Animated.View>
        ) : null}
        {hasSession ? (
          <View style={styles.compactHero}>
            <View style={styles.portraitSmall}>
              <JollyVideoPlayer state={jollyLiveState} still={!visible} width={44} height={44} borderRadius={12} resizeMode="cover" />
            </View>
            <View style={styles.heroCopy}>
              <Pressy accessibilityRole="button" accessibilityLabel="修改昵称" onPress={openNameEditor} scale={0.97} style={styles.nameRow}>
                <Text style={styles.heroName}>{companionName}</Text>
                <Icon name="edit" size={15} color={colors.ink3} />
              </Pressy>
              <Text style={styles.heroStatus}>
                {stillRunning ? "正在把你的想法慢慢做好" : showDelivery ? (versionLoaded ? "这次作品已打开，等你体验" : "代码完成，交付状态见上方提示") : awaitingReply ? "还有一句话想听你说" : hasError ? "遇到一点阻碍" : "这份心愿已经完成"}
              </Text>
            </View>
          </View>
        ) : (
          <Animated.View style={styles.stage}>
            <View style={styles.portraitLarge}>
              <JollyVideoPlayer state={jollyLiveState} still={!visible} width={48} height={48} borderRadius={12} resizeMode="cover" />
            </View>
            <View style={{ flex: 1, gap: 4 }}><Text style={styles.stageTitle}>从一句想法开始</Text>
            <Text style={styles.stageBody}>先一起整理，确认后再制作。</Text></View>
            <Pressy accessibilityRole="button" onPress={openNameEditor} scale={0.95} style={styles.renameChip}>
              <Icon name="edit" size={14} color={colors.ink3} />
            </Pressy>
          </Animated.View>
        )}

        {prompt ? (
          <Animated.View>
            <Surface style={styles.wish}>
              <View style={styles.wishHead}>
                <Text style={styles.wishLabel}>心愿</Text>
                {!stillRunning ? (
                  <Pressy accessibilityRole="button" onPress={() => onChange(prompt)} hitSlop={8} scale={0.94}>
                    <Text style={styles.wishAction}>修改心愿</Text>
                  </Pressy>
                ) : null}
              </View>
              <Text style={styles.wishText}>{prompt}</Text>
            </Surface>
          </Animated.View>
        ) : null}

        {hasSession ? (
          <Animated.View>
            <Surface tone="raised" style={styles.progress}>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  if (actionTraces.length > 0) setTraceExpanded((open) => !open);
                }}
                style={styles.ticker}
              >
                <View style={styles.glyph}>
                  {stillRunning ? (
                    <JollyLoading size="sm" color={colors.accent} />
                  ) : (
                    <View style={[styles.glyphBadge, { backgroundColor: hasError ? colors.redTint : colors.greenTint }]}>
                      <Icon
                        name={hasError ? "alert" : "check"}
                        size={16}
                        color={hasError ? colors.redText : colors.greenText}
                        strokeWidth={2.1}
                      />
                    </View>
                  )}
                </View>

                <View style={styles.tickerWindow}>
                  <Animated.View
                    key={currentTicker.key}
                    style={styles.tickerSlide}
                  >
                    <Text style={styles.tickerBadge}>{currentTicker.badge}</Text>
                    <Text style={[styles.tickerText, hasError && !stillRunning && { color: colors.redText }]} numberOfLines={1}>
                      {currentTicker.text}
                    </Text>
                  </Animated.View>
                </View>

                <View style={styles.tickerRight}>
                  <ElapsedTime startedAt={startedAt} busy={busy} visible={visible} />
                  {actionTraces.length > 0 ? (
                    <View style={[styles.expand, traceExpanded && styles.expandOpen]}>
                      <Icon name="chevron" size={14} color={colors.ink3} strokeWidth={2} />
                    </View>
                  ) : null}
                </View>
              </Pressable>

              {traceExpanded && actionTraces.length > 0 ? (
                <Animated.View style={styles.steps}>
                  <Text style={styles.stepsHead}>共 {actionTraces.length} 步，显示最近 40 步</Text>
                  {actionTraces.length > 40 ? <Pressy onPress={() => setStepsOpen(true)}><Text style={styles.ghostText}>查看全部步骤</Text></Pressy> : null}
                  {actionTraces.slice(-40).map((item, idx, recent) => {
                    const cleanedDetail = cleanTraceDetail(item.detail);
                    const hasDetail = cleanedDetail.length > 0;
                    const rowOpen = expandedRowId === item.id;
                    const isLatest = idx === recent.length - 1;
                    const isErr = item.state === "error";
                    const isRun = stillRunning && isLatest && item.state === "running" && !isErr;
                    const { chip, tone } =
                      item.kind === "tool"
                        ? classifyToolChip(item.title)
                        : item.title.includes("思考")
                          ? { chip: "思考", tone: "orchid" as const }
                          : { chip: "状态", tone: "cyan" as const };
                    const tint = toneColors(tone, colors);
                    const dotColor = isRun ? colors.accent : isErr ? colors.red : colors.green;
                    return (
                      <View key={item.id}>
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => (hasDetail ? setExpandedRowId(rowOpen ? null : item.id) : undefined)}
                          style={styles.step}
                        >
                          <View style={styles.stepRail}>
                            {isRun ? <PulseDot color={dotColor} /> : <View style={[styles.stepDot, { backgroundColor: dotColor }]} />}
                            {idx === recent.length - 1 ? null : <View style={styles.stepLine} />}
                          </View>
                          <Text style={[styles.stepTitle, isErr && { color: colors.redText }]} numberOfLines={1}>
                            {item.title.trim()}
                          </Text>
                          <View style={[styles.stepChip, { backgroundColor: tint.tint }]}>
                            <Text style={[styles.stepChipText, { color: tint.text }]}>{chip}</Text>
                          </View>
                        </Pressable>
                        {rowOpen && hasDetail ? (
                          <Animated.View style={styles.detail}>
                            <Text style={styles.detailText}>
                              {cleanedDetail.slice(0, 800)}
                              {cleanedDetail.length > 800 ? "\n… 已截断" : ""}
                            </Text>
                            <Pressy accessibilityRole="button" onPress={() => setDetailTrace(item)}><Text style={styles.ghostText}>查看完整输出</Text></Pressy>
                          </Animated.View>
                        ) : null}
                      </View>
                    );
                  })}
                </Animated.View>
              ) : null}
            </Surface>
          </Animated.View>
        ) : null}

        {hasSession && finalReport ? (
          <Animated.View>
            <Surface tone="raised" radius={colors.radius.xl} lifted style={styles.report}>
              <GiltLine style={styles.reportEdge} />
              <View style={styles.reportHead}>
                <View style={styles.reportSeal}>
                  <Icon name="check" size={16} color={colors.onAccent} strokeWidth={2.4} />
                </View>
                <Text style={styles.reportTitle}>这次为你做了什么</Text>
              </View>
              <Text style={styles.reportText}>{finalReport}</Text>
              {!stillRunning && !sessionId && onBack ? (
                <View style={styles.reportActions}>
                  <Pressy accessibilityRole="button" onPress={onBack} style={styles.primary}>
                    <Text style={styles.primaryText}>去体验新应用</Text>
                  </Pressy>
                  {prompt && !sessionId ? (
                    <Pressy accessibilityRole="button" onPress={() => onChange(prompt)} style={styles.ghost}>
                      <Text style={styles.ghostText}>继续完善</Text>
                    </Pressy>
                  ) : null}
                </View>
              ) : null}
            </Surface>
          </Animated.View>
        ) : null}
        {history.length || historyCursor || historyError ? <Surface tone="inset" style={styles.progress}>
          <Text style={styles.reportTitle}>制作记录</Text>
          {history.slice(0, 3).map(item => <Text key={item.id} style={styles.stepTitle} numberOfLines={1}>{item.title}</Text>)}
          <Pressy accessibilityRole="button" onPress={() => setRecordsOpen(true)} style={styles.ghost}><Text style={styles.ghostText}>查看制作记录</Text></Pressy>
          {historyError ? <><Text accessibilityLiveRegion="polite" style={styles.deliveryPanelMessage}>{historyError}</Text>{!historyCursor ? <Pressy disabled={busy || sessionLoading} onPress={onNewSession} style={styles.ghost}><Text style={styles.ghostText}>重新同步记录</Text></Pressy> : null}</> : null}
          {historyCursor ? <Pressy disabled={historyBusy} onPress={onLoadHistory} style={styles.ghost}><Text style={styles.ghostText}>{historyBusy ? "正在加载…" : "加载更多制作记录"}</Text></Pressy> : null}
        </Surface> : null}

        {preparation}
        {!hasSession ? (
          <Animated.View style={styles.ideas}>
            <SectionTitle>试试这些</SectionTitle>
            {IDEAS.map((idea) => {
              const selected = value.trim() === idea.prompt.trim();
              return (
                <Pressy
                  key={idea.title}
                  accessibilityRole="button"
                  onPress={() => onChange(idea.prompt)}
                  scale={0.985}
                >
                  <Surface style={[styles.idea, selected && { borderColor: colors.accentSoft }]}>
                    <View style={styles.ideaHead}>
                      <Text style={styles.ideaTitle}>{idea.title}</Text>
                      <Text style={styles.ideaCategory}>{idea.category}</Text>
                      <View style={styles.ideaMark}>
                        <Icon
                          name={selected ? "check" : "plus"}
                          size={16}
                          color={selected ? colors.accentText : colors.ink3}
                          strokeWidth={selected ? 2.2 : 1.8}
                        />
                      </View>
                    </View>
                    <Text style={styles.ideaPrompt} numberOfLines={2}>
                      {idea.prompt}
                    </Text>
                  </Surface>
                </Pressy>
              );
            })}

            {report ? (
              <Pressable accessibilityRole="button" onPress={() => setShowLastSnapshot((prev) => !prev)}>
                <Surface tone="inset" style={styles.last}>
                  <View style={styles.lastHead}>
                    <Text style={styles.lastTitle}>上一次做出的应用</Text>
                    <View style={[styles.expand, showLastSnapshot && styles.expandOpen]}>
                      <Icon name="chevron" size={14} color={colors.ink3} strokeWidth={2} />
                    </View>
                  </View>
                  {showLastSnapshot ? (
                    <Animated.Text style={styles.lastText}>
                      {cleanTraceDetail(report)}
                    </Animated.Text>
                  ) : null}
                </Surface>
              </Pressable>
            ) : null}
          </Animated.View>
        ) : null}
      </ScrollView>

      {!preparation ? <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 }}>
        <Pressy accessibilityRole="button" disabled={!busy && (sessionLoading || deliveryBusy || Boolean(sessionId && !awaitingReply && !canContinue))} onPress={busy ? onStop : onEdit ?? onSubmit} scale={1} style={{ minHeight: 48, borderRadius: 8, backgroundColor: busy ? colors.redTint : colors.accent, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <Icon name={busy ? "stop" : "plus"} size={18} color={busy ? colors.redText : colors.onAccent} />
          <Text style={{ fontFamily: colors.mono, fontSize: 14, color: busy ? colors.redText : colors.onAccent }}>{busy ? "停止制作" : hasSession ? "继续修改" : "填写制作需求"}</Text>
        </Pressy>
      </View> : null}

      <Modal visible={recordsOpen || stepsOpen} onRequestClose={() => { setRecordsOpen(false); setStepsOpen(false); }}>
        <Screen style={styles.screen}><ScreenBar style={styles.header}><BackChip onPress={() => { setRecordsOpen(false); setStepsOpen(false); }} /><Text style={styles.title}>{stepsOpen ? "全部步骤" : "制作记录"}</Text></ScreenBar>
          <FlatList data={stepsOpen ? actionTraces : history} keyExtractor={item => item.id} initialNumToRender={8} windowSize={5} contentContainerStyle={styles.content} renderItem={({ item }) => <Pressy onPress={() => setDetailTrace(item)}><Surface style={styles.report}><Text style={styles.stepTitle}>{item.title}</Text>{item.detail ? <Text numberOfLines={6} style={styles.detailText}>{item.detail}</Text> : null}<Text style={styles.ghostText}>查看完整输出</Text></Surface></Pressy>} ListFooterComponent={!stepsOpen && historyCursor ? <Pressy disabled={historyBusy} onPress={onLoadHistory} style={styles.ghost}><Text style={styles.ghostText}>{historyBusy ? "正在加载…" : "加载更多"}</Text></Pressy> : null} />
        </Screen>
      </Modal>
      <Modal visible={!!detailTrace} onRequestClose={() => setDetailTrace(undefined)}><Screen style={styles.screen}><ScreenBar style={styles.header}><BackChip onPress={() => setDetailTrace(undefined)} /><Text style={styles.title}>完整输出</Text></ScreenBar><ScrollView contentContainerStyle={styles.content}><Text selectable style={styles.stepTitle}>{detailTrace?.title}</Text><Text selectable style={styles.detailText}>{detailTrace?.detail || "没有输出内容"}</Text></ScrollView></Screen></Modal>
      <Modal visible={nameModalVisible} transparent animationType="fade" onRequestClose={() => setNameModalVisible(false)}>
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}><Pressable style={styles.modalOverlay} onPress={() => setNameModalVisible(false)}>
          <Pressable onPress={(e) => e.stopPropagation()} style={styles.modalWrap}>
            <Surface tone="raised" radius={colors.radius.xl} lifted style={styles.modalCard}>
              <Text style={styles.modalTitle}>给搭子起个名字</Text>
              <Text style={styles.modalHint}>它会出现在工坊里陪你做东西</Text>
              <TextInput
                style={styles.modalInput}
                value={nameInput}
                onChangeText={setNameInput}
                placeholder="例如：狗蛋、小助手"
                placeholderTextColor={colors.ink3}
                maxLength={12}
                autoFocus
                selectTextOnFocus
              />
              <View style={styles.modalActions}>
                <Pressy accessibilityRole="button" style={styles.modalCancel} onPress={() => setNameModalVisible(false)}>
                  <Text style={styles.modalCancelText}>取消</Text>
                </Pressy>
                <Pressy accessibilityRole="button" style={styles.modalSave} onPress={handleSaveName}>
                  <Text style={styles.modalSaveText}>保存</Text>
                </Pressy>
              </View>
            </Surface>
          </Pressable>
        </Pressable></KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
});

function ElapsedTime({ startedAt, busy, visible }: { startedAt: number; busy: boolean; visible: boolean }) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => { if (!startedAt) { setSeconds(0); return; } if (!busy || !visible) return;
    const tick = () => setSeconds(Math.max(0, Math.floor((Date.now() - startedAt) / 1000))); tick();
    const timer = setInterval(tick, 1000); return () => clearInterval(timer);
  }, [startedAt, busy, visible]);
  return seconds ? <Text style={styles.elapsed}>{seconds < 60 ? seconds + "s" : Math.floor(seconds / 60) + "m " + seconds % 60 + "s"}</Text> : null;
}

/** 正在进行的事用一颗缓慢明灭的点表示，不用转圈。 */
function PulseDot({ color }: { color: string }) {
  const level = useSharedValue(1);
  useEffect(() => {
    level.value = withRepeat(withSequence(withTiming(0.3, { duration: 720 }), withTiming(1, { duration: 720 })), -1, false);
    return () => cancelAnimation(level);
  }, [level]);
  const motion = useAnimatedStyle(() => ({ opacity: level.value, transform: [{ scale: 0.8 + level.value * 0.3 }] }));
  return <Animated.View style={[{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }, motion]} />;
}

const styles = themedStyleSheet((t) => ({
  sessionSeal: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: t.accentTint,
    alignItems: "center",
    justifyContent: "center",
  },
  deliveryPanel: {
    padding: 16,
    gap: 12,
    overflow: "hidden",
  },
  deliveryPanelText: { color: t.ink2, fontSize: 14, lineHeight: 22 },
  deliveryPanelMessage: { color: t.accentText, fontSize: 13, lineHeight: 20 },
  deliveryPanelActions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  deliveryPanelHint: { color: t.ink3, fontSize: 11, lineHeight: 17 },
  sessionPanel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
  },
  sessionTitle: {
    color: t.ink1,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 4,
  },
  sessionButton: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: t.accentTint,
  },
  sessionButtonText: {
    color: t.accentText,
    fontSize: 12,
    fontWeight: "600",
  },
  screen: {
    backgroundColor: t.canvas,
  },
  fill: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 2,
    paddingBottom: 2,
    backgroundColor: t.canvas,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: t.line,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  title: {
    fontFamily: t.serif,
    fontSize: 20,
    lineHeight: 25,
    fontWeight: "700",
    color: t.ink1,
    letterSpacing: 0,
  },
  caption: {
    fontSize: 12.5,
    lineHeight: 17,
    color: t.ink3,
  },
  phase: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 15,
  },
  phaseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  phaseText: {
    fontSize: 12.5,
    fontWeight: "600",
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
    gap: 12,
  },
  stage: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 8,
    gap: 10,
  },
  portraitLarge: {
    width: 60,
    height: 60,
    padding: 6,
    borderRadius: 22,
    borderWidth: 0,
    borderColor: t.accentSoft,
    backgroundColor: t.surfaceRaised,
    boxShadow: `0 4px 8px ${t.shade}, inset 0 2px 3px ${t.sheen}`,
    marginBottom: 0,
  },
  stageTitle: {
    fontFamily: t.serif,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "700",
    color: t.ink1,
    letterSpacing: 0,
  },
  stageBody: {
    maxWidth: 280,
    fontSize: 14.5,
    lineHeight: 22,
    textAlign: "left",
    color: t.ink3,
  },
  renameChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  renameText: {
    fontSize: 12.5,
    color: t.ink3,
  },
  compactHero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingTop: 4,
  },
  portraitSmall: {
    width: 56,
    height: 56,
    padding: 6,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 0,
    borderColor: t.accentSoft,
    backgroundColor: t.surfaceRaised,
    boxShadow: `0 4px 8px ${t.shade}, inset 0 2px 3px ${t.sheen}`,
  },
  heroCopy: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
  },
  heroName: {
    fontFamily: t.serif,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "700",
    color: t.ink1,
  },
  heroStatus: {
    fontSize: 13.5,
    color: t.ink2,
  },
  wish: {
    padding: 16,
    gap: 8,
    borderRadius: t.radius.xl,
  },
  wishHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  wishLabel: {
    fontSize: 12.5,
    fontWeight: "600",
    color: t.accentText,
  },
  wishAction: {
    fontSize: 13,
    fontWeight: "600",
    color: t.ink2,
  },
  wishText: {
    fontFamily: t.serif,
    fontSize: 17,
    lineHeight: 27,
    color: t.ink1,
  },
  progress: {
    borderRadius: t.radius.xl,
  },
  ticker: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  glyph: {
    width: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  glyphBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  tickerWindow: {
    flex: 1,
    minWidth: 0,
    height: 22,
    overflow: "hidden",
    justifyContent: "center",
  },
  tickerSlide: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tickerBadge: {
    fontSize: 12,
    fontWeight: "700",
    color: t.accentText,
  },
  tickerText: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: "500",
    color: t.ink1,
  },
  tickerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  elapsed: {
    fontFamily: t.mono,
    fontSize: 12,
    color: t.ink3,
  },
  expand: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "90deg" }],
  },
  expandOpen: {
    transform: [{ rotate: "-90deg" }],
  },
  steps: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: t.line,
  },
  stepsHead: {
    paddingTop: 12,
    paddingBottom: 6,
    fontSize: 12,
    color: t.ink3,
  },
  step: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 38,
  },
  stepRail: {
    width: 10,
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stepLine: {
    position: "absolute",
    top: 25,
    bottom: -15,
    width: StyleSheet.hairlineWidth * 2,
    backgroundColor: t.line,
  },
  stepTitle: {
    flex: 1,
    fontSize: 13.5,
    color: t.ink1,
  },
  stepChip: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  stepChipText: {
    fontSize: 11,
    fontWeight: "600",
  },
  detail: {
    marginLeft: 22,
    marginBottom: 6,
    padding: 12,
    borderRadius: t.radius.md,
    backgroundColor: t.inset,
  },
  detailText: {
    fontFamily: t.mono,
    fontSize: 11.5,
    lineHeight: 17,
    color: t.ink2,
  },
  report: {
    padding: 16,
    gap: 12,
  },
  reportEdge: {
    position: "absolute",
    top: 0,
    left: 24,
    right: 24,
  },
  reportHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  reportSeal: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: t.accent,
  },
  reportTitle: {
    fontFamily: t.serif,
    fontSize: 19,
    fontWeight: "700",
    color: t.ink1,
  },
  reportText: {
    fontSize: 14.5,
    lineHeight: 23,
    color: t.ink2,
  },
  reportActions: {
    flexDirection: "row",
    gap: 10,
    paddingTop: 4,
  },
  primary: {
    flex: 1,
    height: 46,
    borderRadius: t.radius.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: t.accent,
  },
  primaryText: {
    fontSize: 15,
    fontWeight: "700",
    color: t.onAccent,
  },
  ghost: {
    height: 46,
    paddingHorizontal: 16,
    borderRadius: t.radius.lg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.lineStrong,
  },
  ghostText: {
    fontSize: 15,
    fontWeight: "600",
    color: t.ink1,
  },
  ideas: {
    gap: 10,
  },
  idea: {
    padding: 16,
    gap: 6,
    borderRadius: t.radius.xl,
  },
  ideaHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  ideaTitle: {
    fontFamily: t.serif,
    fontSize: 17,
    fontWeight: "700",
    color: t.ink1,
  },
  ideaCategory: {
    flex: 1,
    fontSize: 12,
    color: t.accentText,
  },
  ideaMark: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: t.inset,
  },
  ideaPrompt: {
    fontSize: 13.5,
    lineHeight: 20,
    color: t.ink2,
  },
  last: {
    padding: 14,
    gap: 8,
    borderRadius: t.radius.lg,
  },
  lastHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  lastTitle: {
    fontSize: 13.5,
    fontWeight: "600",
    color: t.ink2,
  },
  lastText: {
    fontSize: 13.5,
    lineHeight: 21,
    color: t.ink2,
  },
  modalOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    backgroundColor: "rgba(8, 5, 12, 0.6)",
  },
  modalWrap: {
    width: "100%",
    maxWidth: 360,
  },
  modalCard: {
    padding: 16,
    gap: 8,
  },
  modalTitle: {
    fontFamily: t.serif,
    fontSize: 20,
    fontWeight: "700",
    color: t.ink1,
  },
  modalHint: {
    fontSize: 13.5,
    color: t.ink3,
    marginBottom: 8,
  },
  modalInput: {
    height: 48,
    paddingHorizontal: 14,
    borderRadius: t.radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.accentSoft,
    backgroundColor: t.field,
    color: t.ink1,
    fontSize: 16,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  modalCancel: {
    flex: 1,
    height: 46,
    borderRadius: t.radius.lg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.lineStrong,
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: t.ink2,
  },
  modalSave: {
    flex: 1,
    height: 46,
    borderRadius: t.radius.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: t.accent,
  },
  modalSaveText: {
    fontSize: 15,
    fontWeight: "700",
    color: t.onAccent,
  },
}));
