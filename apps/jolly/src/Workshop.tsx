import { useEffect, useRef, useState } from "react";
import { getAppContext } from "@zijinhua/app-sdk";
import { getCreationService } from "@zijinhua/app-sdk/creation";
import type { WorkshopStatus } from "@zijinhua/app-sdk/creation";
import { AppState } from "react-native";
import { AgentScreen, type AgentTrace } from "./AgentScreen";
import { RequirementComposer } from "./RequirementComposer";
import { FeedbackReview, readFeedback, feedbackPrompt, type ApplicationFeedback } from "./FeedbackReview";
import { noteJollyRun, readJollyRun, syncJollyFeedPost, type JollyPhase, type WorkshopStage } from "./run";
export default function Workshop({ appId, title, originalAppId, visible, onBack, onShowWorkshop }: { appId: string; title: string; originalAppId?: string; visible: boolean; onBack?: () => void; onShowWorkshop?: () => void }) {
  const context = getAppContext();
  const [accountScope] = useState(() => context.storage.get("__accountScope"));
  const [service] = useState(() => getCreationService(appId, originalAppId));
  const [targetTitle, setTargetTitle] = useState(title === appId ? "新作品" : title);
  const { runCloudEvolve, cancelCloudRun, loadJulesRun, loadJulesSession, saveJulesRun, clearJulesRun, clearJulesSession, inspectJulesSession, julesSessionLive, watchJulesSession, workshopStatus, applyPackageUpdates, openPublication } = service;
  const pluginsReady = true;
  const [requirement, setRequirement] = useState("");
  const [feedback, setFeedback] = useState<ApplicationFeedback>();
  const [prompt, updatePrompt] = useState("");
  const [status, updateStatus] = useState("");
  const [report, setReport] = useState("");
  const [traces, updateTraces] = useState<AgentTrace[]>([]);
  const [busy, setBusy] = useState(false);
  const [providerId, setProviderId] = useState("jules");
  const [updateBusy, setUpdateBusy] = useState(false);
  const [runStartedAt, updateStartedAt] = useState(0);
  const [workshopPhase, updateWorkshopPhase] = useState<JollyPhase>("idle");
  const [canContinue, setCanContinue] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [sessionLoading, setSessionLoading] = useState(true);
  const [showDelivery, setShowDelivery] = useState(false);
  const [versionLoaded, setVersionLoaded] = useState(false);
  const [awaitingReply, setAwaitingReply] = useState(false);
  const [deliveryMessage, setDeliveryMessage] = useState("");
  const [deliveryStage, setDeliveryStage] = useState<WorkshopStage>("draft");
  const [publicReleaseId, setPublicReleaseId] = useState<string>();
  const [candidateReleaseId, setCandidateReleaseId] = useState<string>();
  const [historyCursor, setHistoryCursor] = useState<string>();
  const [history, setHistory] = useState<AgentTrace[]>([]);
  const [historyBusy, setHistoryBusy] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [pendingDelivery, setPendingDelivery] = useState(false);
  const visibleRef = useRef(visible); visibleRef.current = visible;
  const cacheKey = `workshopView.${accountScope}.${appId}`;
  const cloudStop = useRef(false);
  const stopRequested = useRef(false);
  const cloudRun = useRef<{ runId?: string } | null>(null);
  const busyRef = useRef(false);
  const resumedCloud = useRef(false);
  const resumeFlight = useRef(false);
  const detached = useRef(false);
  useEffect(() => () => { detached.current = true; cloudStop.current = true; }, []);

  // Persist from polling callbacks as well as the visible page: leaving Jolly
  // must not lose progress or keep a failed creation's feed post around.
  const live = useRef({ startedAt: 0, wish: "", status: "", phase: "idle" as JollyPhase, steps: [] as string[] });
  function persistProgress() {
    if (detached.current || context.storage.get("__accountScope") !== accountScope) return;
    const value = live.current;
    if (!value.wish.trim() || !value.startedAt) return;
    noteJollyRun({ appId, phase: value.phase, wish: value.wish, status: value.status, steps: value.steps });
    syncJollyFeedPost({ ...value, appId });
  }
  function setPrompt(value: string) { live.current.wish = value; updatePrompt(value); persistProgress(); }
  function setRunStartedAt(value: number) { live.current.startedAt = value; updateStartedAt(value); }
  function setStatus(value: string) { live.current.status = value; updateStatus(value); persistProgress(); }
  function setTraces(value: AgentTrace[]) { live.current.steps = [...new Set(value.map(item => item.title.trim()).filter(Boolean))].slice(-4); updateTraces(value); persistProgress(); }
  function setWorkshopPhase(value: JollyPhase) { live.current.phase = value; updateWorkshopPhase(value); persistProgress(); }

  useEffect(() => {
    if (detached.current || context.storage.get("__accountScope") !== accountScope) return;
    if (sessionLoading) return;
    const prev = readJollyRun(appId);
    const stage: WorkshopStage = busy ? "making" : workshopPhase === "failed" ? "failed" : workshopPhase === "stopped" ? "paused" : awaitingReply ? deliveryStage === "blocked" ? "blocked" : "reply" : showDelivery ? deliveryStage : canContinue ? "ready" : "draft";
    if (stage === "draft" && sessionId) return;
    noteJollyRun({ appId, stage, phase: canContinue ? "ready" : workshopPhase, wish: prompt || prev.wish, status: status || prev.status, steps: prev.steps });
  }, [busy, canContinue, workshopPhase, awaitingReply, showDelivery, deliveryStage, prompt, status, sessionLoading, sessionId]);

  useEffect(() => {
    if (!visible) return;
    if (!busyRef.current) { resumedCloud.current = false; void resumeCloud(); }
    const subscription = AppState.addEventListener("change", state => {
      if (state === "active" && visibleRef.current && !busyRef.current) { resumedCloud.current = false; void resumeCloud(); }
    });
    return () => subscription.remove();
  }, [visible]);
  useEffect(() => {
    if (!visible || !pendingDelivery) return;
    const timer = setInterval(() => {
      if (AppState.currentState === "active" && !busyRef.current) { resumedCloud.current = false; void resumeCloud(); }
    }, 15000);
    return () => clearInterval(timer);
  }, [visible, pendingDelivery]);
  useEffect(() => {
    if (!sessionId || sessionLoading || detached.current || context.storage.get("__accountScope") !== accountScope) return;
    context.storage.set(cacheKey, JSON.stringify({ sessionId, prompt, status, traces, requirement, startedAt: runStartedAt }));
  }, [sessionId, sessionLoading, prompt, status, traces, requirement, runStartedAt]);
  async function loadHistory() {
    if (!historyCursor || historyBusy || !sessionId) return;
    setHistoryBusy(true); setHistoryError("");
    try {
      const page = await service.readWorkshopHistory(sessionId, historyCursor);
      if (detached.current || context.storage.get("__accountScope") !== accountScope) return;
      setHistory(previous => [...new Map([...previous, ...page.traces].map(item => [item.id, item])).values()]);
      setHistoryCursor(page.nextCursor);
    } catch (error) { setHistoryError(error instanceof Error ? error.message : "记录加载失败，请重试"); }
    finally { setHistoryBusy(false); }
  }
  useEffect(() => {
    const accept = () => {
      const prompt = context.storage.get(`pendingPrompt.${appId}`);
      if (prompt) { setRequirement(prompt); context.storage.set(`pendingPrompt.${appId}`, ""); }
    };
    const acceptFeedback = () => setFeedback(readFeedback(context.storage.get(`pendingFeedback.${appId}`)));
    accept(); acceptFeedback(); const offPrompt = context.storage.subscribe(`pendingPrompt.${appId}`, accept); const offFeedback = context.storage.subscribe(`pendingFeedback.${appId}`, acceptFeedback);
    return () => { offPrompt(); offFeedback(); };
  }, []);
  async function stop() {
    const cloud = cloudRun.current;
    if (!cloud) return;
    stopRequested.current = true;
    setStatus("正在请求停止");
    if (!cloud.runId) return;
    try {
      await cancelCloudRun(cloud.runId);
      cloudStop.current = true;
      setAwaitingReply(true);
      setStatus("已发送停止请求");
    } catch (error) {
      stopRequested.current = false;
      setStatus(error instanceof Error ? error.message : "停止请求未成功，请重试");
    }
  }

  function newSession() {
    if (busyRef.current || sessionLoading || updateBusy) return;
    if (sessionId) {
      resumedCloud.current = false;
      setSessionLoading(true);
      void resumeCloud();
      return;
    }
    clearJulesRun();
    setPrompt("");
    setStatus("");
    setTraces([]);
    setReport("");
    setRunStartedAt(0);
    setWorkshopPhase("idle");
    setShowDelivery(false);
    setVersionLoaded(false);
    setAwaitingReply(false);
    setDeliveryMessage("");
  }

  async function checkWorkshopDelivery(session: string, supplied?: WorkshopStatus) {
    setVersionLoaded(false);
    try {
      const workshop = supplied || await workshopStatus(session);
      setPendingDelivery(workshop.completed && !workshop.application);
      setCanContinue(workshop.completed);
      if (workshop.application?.title && workshop.application.title !== appId) setTargetTitle(workshop.application.title);
      setCandidateReleaseId(workshop.application?.releaseId);
      setDeliveryStage(workshop.delivery === "loaded" ? "ready" : workshop.delivery === "update" ? "load" : "blocked");
      setDeliveryMessage(workshop.message || "暂时无法核对作品发布状态，请稍后重试。");
      if (workshop.delivery === "loaded") {
        setVersionLoaded(true);
        setStatus("正在体验这次作品");
      } else if (workshop.delivery === "update") {
        setStatus("这次作品可以体验");
      } else {
        if ((workshop.delivery === "blocked" || workshop.delivery === "unpublished")) { setAwaitingReply(true); setShowDelivery(false); }
        setStatus(workshop.delivery === "blocked" ? "作品交付需要处理" : "代码已完成，等待发布");
      }
      return workshop;
    } catch (error) {
      setDeliveryMessage(error instanceof Error ? error.message : "作品更新检查失败，请稍后重试");
      setStatus("作品更新检查失败");
      throw error;
    }
  }

  async function loadWish() {
    if (updateBusy || sessionLoading || !sessionId) return;
    if (typeof openPublication !== "function") { setDeliveryMessage("请先重载到最新平台版本，再体验或发布作品。"); return; }
    setUpdateBusy(true);
    try {
      const workshop = await checkWorkshopDelivery(sessionId);
      if (workshop.delivery === "loaded") { context.navigation.open(appId); return; }
      if (workshop.delivery === "update") {
        setDeliveryMessage("正在下载并打开这次作品…");
        await applyPackageUpdates();
      }
    } catch (error) {
      setDeliveryMessage(error instanceof Error ? error.message : "新作品暂时没接好，请稍后再试");
    } finally { setUpdateBusy(false); }
  }

  async function publishWish() {
    if (updateBusy) return;
    setUpdateBusy(true);
    try {
      if (typeof openPublication !== "function") throw new Error("请先重载到最新平台版本，再发布作品。");
      await openPublication();
    } catch (error) { setDeliveryMessage(error instanceof Error ? error.message : "暂时无法打开发布页面"); }
    finally { setUpdateBusy(false); }
  }

  function noteError(where: string, detail: string) {
    console.log("app error", where, detail.trim().slice(0, 4000));
  }

  async function runCloud(text: string, status = "正在生成", original = text, preparedTitle?: string) {
    if (busyRef.current || detached.current || context.storage.get("__accountScope") !== accountScope) return;
    if (!text.trim() || text.length > 8000) { context.toast.show("修改需求需为 1 到 8000 个字符，内容已保留", "error"); return; }
    let workspaces: Array<{ appId: string; title: string }>;
    try { workspaces = JSON.parse(context.storage.get("workspaces") || "[]"); if (!Array.isArray(workspaces) || workspaces.some(item => !item || typeof item.appId !== "string" || typeof item.title !== "string")) throw new Error("invalid"); }
    catch { context.toast.show("作品记录暂时无法读取，请重新打开工坊；需求已保留", "error"); return; }
    busyRef.current = true;
    setBusy(true);
    // 回复同一份心愿沿用动态身份；轮次消息的时间由 cloudEvolve 单独管理。
    const continuing = sessionId && !canContinue;
    const startedAt = continuing && runStartedAt > 0 ? runStartedAt : Date.now();
    const wish = continuing && prompt.trim() ? prompt : original;
    setCanContinue(false);
    setShowDelivery(false);
    setDeliveryStage("making");
    setPendingDelivery(false); setHistory([]); setHistoryCursor(undefined);
    if (title === "新应用" || title === "未命名作品") {
      const workspace = workspaces.find((item: { appId: string }) => item.appId === appId);
      if (workspace) { workspace.title = (preparedTitle || original).replace(/\s+/g, " ").slice(0, 20); context.storage.set("workspaces", JSON.stringify(workspaces)); }
    }
    if (preparedTitle) setTargetTitle(preparedTitle);
    setRunStartedAt(startedAt);
    setPrompt(wish);
    setWorkshopPhase("making");
    setAwaitingReply(false);
    setDeliveryMessage("");
    setTraces([]);
    setReport("");
    onShowWorkshop?.();
    setStatus(status);
    cloudStop.current = false;
    stopRequested.current = false;
    cloudRun.current = {};
    let waiting = false;
    try {
      const outcome = await runCloudEvolve({
        requirement: text,
        onStatus: setStatus,
        onTrace: setTraces,
        onRunId: (runId) => {
          context.storage.remove(`requirementDraft.${appId}`);
          context.storage.remove(`pendingFeedback.${appId}`);
          setSessionId(runId);
          cloudRun.current = { runId };
          saveJulesRun({ session: runId, prompt: wish, startedAt });
          if (stopRequested.current && !detached.current) void stop();
        },
        shouldStop: () => cloudStop.current,
        shouldPause: () => !visibleRef.current,
      });
      if (outcome === "cancelled") {
        if (detached.current) return;
        setAwaitingReply(true);
        setWorkshopPhase("stopped");
        setStatus("已发送停止请求");
        setBusy(false);
        return;
      }
      if (outcome === "waiting") {
        waiting = true;
        setAwaitingReply(true);
        return;
      }
      waiting = true;
      setShowDelivery(true);
      setWorkshopPhase("ready");
      setRequirement("");
      setStatus("正在检查新包");
      await checkWorkshopDelivery(cloudRun.current?.runId || await loadJulesSession());
      setBusy(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log("evolve failed", message);
      setWorkshopPhase(waiting ? "ready" : "failed");
      if (!waiting) setAwaitingReply(true);
      setStatus(message);
      setBusy(false);
    } finally {
      cloudRun.current = null;
      busyRef.current = false;
      setBusy(false);
      if (!waiting && !detached.current) clearJulesRun();
    }
  }

  async function resumeCloud() {
    if (resumeFlight.current) return;
    resumeFlight.current = true;
    try { await resumeCloudImpl(); } finally { resumeFlight.current = false; }
  }
  async function resumeCloudImpl() {
    if (resumedCloud.current || busyRef.current) return;
    resumedCloud.current = true;
    const run = await loadJulesRun();
    const session = run?.session || await loadJulesSession();
    setSessionId(session);
    if (!session) {
      setSessionLoading(false);
      return;
    }
    if (detached.current || context.storage.get("__accountScope") !== accountScope) return;
    try {
      const cached = JSON.parse(context.storage.get(cacheKey) || "null");
      if (cached?.sessionId === session && !live.current.startedAt) {
        setRunStartedAt(cached.startedAt || 0); setPrompt(cached.prompt || ""); setStatus(cached.status || "");
        setTraces(cached.traces || []); setRequirement(value => value || cached.requirement || "");
      }
    } catch {}
    let info: { state: string; url: string; title: string; startedAt: number } | undefined;
    let delivery: WorkshopStatus | undefined;
    try {
      if (typeof service.readWorkshopDetail !== "function") throw new Error("请先重载紫金花平台，再接回工坊");
      const detail = await service.readWorkshopDetail(session);
      if (detached.current || context.storage.get("__accountScope") !== accountScope) return;
      info = detail?.session; delivery = detail?.status;
      if (detail) {
        const workshop = detail.status;
        setTraces(detail.traces);
        setHistoryCursor(detail.historyCursor); setHistory([]);
        setPublicReleaseId(detail.publicReleaseId);
        setCandidateReleaseId(workshop.application?.releaseId);
        setPendingDelivery(workshop.completed && !workshop.application);
        setShowDelivery(workshop.completed);
        setAwaitingReply(workshop.state === "AWAITING_USER_FEEDBACK" || workshop.state === "PAUSED");
        if (detail.stale) setHistoryError("制作记录暂未同步，稍后重试"); else setHistoryError("");
      }
    } catch (error) {
      console.log("jules resume failed", error instanceof Error ? error.message : error);
      setDeliveryMessage(error instanceof Error ? error.message : "同步失败，请重试"); setAwaitingReply(true);
      resumedCloud.current = false;
      return;
    } finally {
      setSessionLoading(false);
    }
    if (!visibleRef.current || detached.current) return;
    if (!info || info.state === "FAILED") {
      setRunStartedAt(run?.startedAt || info?.startedAt || 0);
      setWorkshopPhase(info?.state === "FAILED" ? "failed" : "stopped");
      setAwaitingReply(true);
      busyRef.current = false;
      setBusy(false);
      setStatus(info?.state === "FAILED" ? "制作失败，可以继续处理" : "上次的制作已经中断");
      setPrompt(run?.prompt || info?.title || "这份作品");
      if (info?.state === "FAILED") setDeliveryMessage(live.current.steps.join(" · ") || "请在下方描述需要修复的问题，继续这个作品。");
      console.log("jules resume dropped", session, info?.state ?? "missing");
      return;
    }
    if (julesSessionLive(info.state)) {
      const promptText = run?.prompt || info.title || "线上定制";
      const startedAt = run?.startedAt || info.startedAt;
      setPrompt(promptText);
      setRunStartedAt(startedAt);
      setWorkshopPhase("making");
      showAgent();
      saveJulesRun({ session, prompt: promptText, startedAt });
      console.log("jules resume", session, info.state);
      busyRef.current = true;
      setBusy(true);
      setStatus("正在接上");
      cloudStop.current = false;
    stopRequested.current = false;
      cloudRun.current = { runId: session };
      let waiting = false;
      try {
        const outcome = await watchJulesSession(session, info.url, {
          onStatus: setStatus,
          onTrace: setTraces,
          shouldStop: () => cloudStop.current,
          shouldPause: () => !visibleRef.current,
        }, startedAt);
        if (outcome === "cancelled") {
        if (detached.current) return;
          setAwaitingReply(true);
          setWorkshopPhase("stopped");
          setStatus("已发送停止请求");
          setBusy(false);
          return;
        }
        if (outcome === "waiting") {
          waiting = true;
          setAwaitingReply(true);
          return;
        }
        waiting = true;
        setShowDelivery(true);
        setWorkshopPhase("ready");
        setStatus("正在检查新包");
        await checkWorkshopDelivery(session);
        setBusy(false);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.log("jules resume failed", message);
        setWorkshopPhase(waiting ? "ready" : "failed");
        setStatus(message);
        setBusy(false);
      } finally {
        cloudRun.current = null;
        busyRef.current = false;
        setBusy(false);
        if (!waiting && !detached.current) clearJulesRun();
      }
      return;
    }
    if (info.state === "COMPLETED") {
      setPrompt(run?.prompt || info.title || "这次的心愿");
      setRunStartedAt(run?.startedAt || info.startedAt);
      setWorkshopPhase("ready");
      showAgent();
      busyRef.current = false;
      setBusy(false);
      setStatus("正在检查新包");
      console.log("jules resume completed", session);
      try {
        
        await checkWorkshopDelivery(session, delivery);
      } catch (error) {
        console.log("jules resume check failed", error instanceof Error ? error.message : error);
      }
      // 保留这轮制作记录，后续可以直接继续迭代。
      return;
    }
    if (info.state === "PAUSED") {
      setRunStartedAt(run?.startedAt || info.startedAt);
      setWorkshopPhase("stopped");
      setAwaitingReply(true);
      setPrompt(run?.prompt || info.title || "线上定制");
      showAgent();
      busyRef.current = false;
      setBusy(false);
      setStatus("制作已暂停，可以继续这个应用");
      console.log("jules resume paused", session);
    }
  }

  function showAgent() {
    onShowWorkshop?.();
  }

  async function submit() {
    const text = requirement.trim();
    if (!text || busyRef.current || sessionLoading || updateBusy || (sessionId && !awaitingReply && !canContinue)) return;
    console.log("evolve submit", providerId);
    await runCloud(text);
  }

  const stage: WorkshopStage = busy ? "making" : workshopPhase === "failed" ? "failed" : workshopPhase === "stopped" ? "paused" : awaitingReply ? deliveryStage === "blocked" ? "blocked" : "reply" : showDelivery ? deliveryStage : canContinue ? "ready" : "draft";
  return <AgentScreen visible={visible} stage={stage}
    preparation={feedback && !busy ? <FeedbackReview value={feedback} owned={feedback.appId === appId} disabled={sessionLoading || updateBusy || Boolean(sessionId && !awaitingReply && !canContinue)} onChange={body => context.storage.set(`pendingFeedback.${appId}`, JSON.stringify({ ...feedback, body }))} onDiscard={() => context.storage.remove(`pendingFeedback.${appId}`)} onConfirm={() => {
      if (busyRef.current || sessionLoading || updateBusy || detached.current || !visibleRef.current || context.storage.get("__accountScope") !== accountScope || (sessionId && !awaitingReply && !canContinue)) return;
      const text = feedbackPrompt(feedback); setRequirement(text); void runCloud(text, "正在提交修改反馈", feedback.body, feedback.appId !== appId ? `基于${feedback.title}` : undefined);
    }} /> : !sessionId && !busy ? <RequirementComposer key={`${accountScope}.${appId}`} appId={appId} value={requirement} onChange={setRequirement} disabled={sessionLoading || updateBusy} visible={visible} onStart={(text, original, preparedTitle) => {
      if (busyRef.current || sessionLoading || updateBusy || detached.current || context.storage.get("__accountScope") !== accountScope) return;
      void runCloud(text, "正在生成", original, preparedTitle);
    }} /> : undefined}
    canContinue={canContinue} targetTitle={targetTitle}
    value={requirement} prompt={prompt} status={status} busy={busy} traces={traces} report={report}
    startedAt={runStartedAt} sessionId={sessionId} sessionLoading={sessionLoading} onNewSession={newSession}
    showDelivery={showDelivery} versionLoaded={versionLoaded} awaitingReply={awaitingReply}
    deliveryBusy={updateBusy} deliveryMessage={deliveryMessage}
    publicReleaseId={publicReleaseId} candidateReleaseId={candidateReleaseId}
    history={history} historyCursor={historyCursor} historyBusy={historyBusy} historyError={historyError} onLoadHistory={() => void loadHistory()}
    scrollKey={`workshopScroll.${accountScope}.${appId}`}
    onLoadWish={() => void loadWish()}
    onPublish={() => void publishWish()}
    providerId={providerId} onProviderChange={setProviderId} onChange={setRequirement}
    onSubmit={() => void submit()} onStop={() => void stop()} onBack={onBack ?? context.navigation.back}
  />;
}
