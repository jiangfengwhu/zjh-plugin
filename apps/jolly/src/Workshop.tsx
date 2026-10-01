import { useEffect, useRef, useState } from "react";
import { getAppContext } from "@zijinhua/app-sdk";
import { getCreationService } from "@zijinhua/app-sdk/creation";
import { AgentScreen, type AgentTrace } from "./AgentScreen";
import { noteJollyRun, readJollyRun, syncJollyFeedPost, type JollyPhase, type WorkshopStage } from "./run";
type PendingPackage = { id: string; kind: "layer" | "application"; bytes: number; sha256: string };
export default function Workshop({ appId, title, originalAppId, onBack, onShowWorkshop }: { appId: string; title: string; originalAppId?: string; onBack?: () => void; onShowWorkshop?: () => void }) {
  const context = getAppContext();
  const [accountScope] = useState(() => context.storage.get("__accountScope"));
  const [service] = useState(() => getCreationService(appId, originalAppId));
  const [targetTitle, setTargetTitle] = useState(title === appId ? "新作品" : title);
  const { runCloudEvolve, cancelCloudRun, loadJulesRun, loadJulesSession, saveJulesRun, clearJulesRun, clearJulesSession, inspectJulesSession, julesSessionLive, watchJulesSession, workshopStatus, checkPackageUpdates, applyPackageUpdates } = service;
  const pluginsReady = true;
  const [requirement, setRequirement] = useState("");
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
  const cloudStop = useRef(false);
  const stopRequested = useRef(false);
  const cloudRun = useRef<{ runId?: string } | null>(null);
  const busyRef = useRef(false);
  const resumedCloud = useRef(false);
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

  async function refreshUpdates(force = false, strict = false): Promise<PendingPackage[]> {
    try { return await checkPackageUpdates(); } catch (error) { if (strict) throw error; return []; }
  }
  async function applyUpdatesNow() { setUpdateBusy(true); try { await applyPackageUpdates(); } finally { setUpdateBusy(false); } }
  useEffect(() => { void resumeCloud(); }, []);
  useEffect(() => {
    const accept = () => {
      const prompt = context.storage.get(`pendingPrompt.${appId}`);
      if (prompt) { setRequirement(prompt); context.storage.set(`pendingPrompt.${appId}`, ""); }
    };
    accept(); return context.storage.subscribe(`pendingPrompt.${appId}`, accept);
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
    if (sessionId && !canContinue) {
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

  async function checkWorkshopDelivery(session: string) {
    setVersionLoaded(false);
    try {
      const workshop = await workshopStatus(session);
      setCanContinue(workshop.completed);
      if (workshop.application?.title && workshop.application.title !== appId) setTargetTitle(workshop.application.title);
      setDeliveryStage(workshop.delivery === "loaded" ? "ready" : workshop.delivery === "update" ? "load" : "blocked");
      setDeliveryMessage(workshop.message || "暂时无法核对作品发布状态，请稍后重试。");
      if (workshop.delivery === "loaded") {
        setVersionLoaded(true);
        setStatus("正在体验这次作品");
      } else if (workshop.delivery === "update") {
        const ready = await refreshUpdates(true, true);
        setStatus(ready.length ? "这次作品可以加载" : "新包暂未就绪，请重新检查");
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
    if (updateBusy || !sessionId) return;
    try {
      const workshop = await checkWorkshopDelivery(sessionId);
      if (workshop.delivery === "loaded") { context.navigation.open(appId); return; }
      if (workshop.delivery === "update") {
        const ready = await refreshUpdates(true, true);
        if (ready.length) await applyUpdatesNow();
        else setDeliveryMessage("新包暂未就绪，请重新检查。");
      }
    } catch (error) {
      setDeliveryMessage(error instanceof Error ? error.message : "新作品暂时没接好，请稍后再试");
    }
  }

  function noteError(where: string, detail: string) {
    console.log("app error", where, detail.trim().slice(0, 4000));
  }

  async function runCloud(text: string, status = "正在生成") {
    busyRef.current = true;
    setBusy(true);
    // 回复同一份心愿沿用动态身份；轮次消息的时间由 cloudEvolve 单独管理。
    const continuing = sessionId && !canContinue;
    const startedAt = continuing && runStartedAt > 0 ? runStartedAt : Date.now();
    const wish = continuing && prompt.trim() ? prompt : text;
    setCanContinue(false);
    setShowDelivery(false);
    setDeliveryStage("making");
    if (title === "新应用" || title === "未命名作品") {
      const workspaces = JSON.parse(context.storage.get("workspaces") || "[]");
      const workspace = workspaces.find((item: { appId: string }) => item.appId === appId);
      if (workspace) { workspace.title = text.replace(/\s+/g, " ").slice(0, 20); context.storage.set("workspaces", JSON.stringify(workspaces)); }
    }
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
          setSessionId(runId);
          cloudRun.current = { runId };
          saveJulesRun({ session: runId, prompt: wish, startedAt });
          if (stopRequested.current && !detached.current) void stop();
        },
        shouldStop: () => cloudStop.current,
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
      await workshopStatus(cloudRun.current?.runId || await loadJulesSession());
      
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
    if (resumedCloud.current || busyRef.current) return;
    resumedCloud.current = true;
    const run = await loadJulesRun();
    const session = run?.session || await loadJulesSession();
    setSessionId(session);
    if (!session) {
      setSessionLoading(false);
      return;
    }
    let info: { state: string; url: string; title: string; startedAt: number } | undefined;
    try {
      info = await inspectJulesSession(session);
      if (info) {
        const workshop = await workshopStatus(session);
        setShowDelivery(workshop.completed);
        setAwaitingReply(workshop.state === "AWAITING_USER_FEEDBACK" || workshop.state === "PAUSED");
        if (workshop.state === "PAUSED") info.state = "PAUSED";
      }
    } catch (error) {
      console.log("jules resume failed", error instanceof Error ? error.message : error);
      return;
    } finally {
      setSessionLoading(false);
    }
    if (!info || info.state === "FAILED") {
      setRunStartedAt(run?.startedAt || info?.startedAt || 0);
      setWorkshopPhase(info?.state === "FAILED" ? "failed" : "stopped");
      setAwaitingReply(true);
      busyRef.current = false;
      setBusy(false);
      setStatus(info?.state === "FAILED" ? "Jules 失败" : "上次的生成已经中断");
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
      setTraces([{ id: "jules", kind: "status", title: "正在接上", state: "running", detail: info.url }]);
      cloudStop.current = false;
    stopRequested.current = false;
      cloudRun.current = { runId: session };
      let waiting = false;
      try {
        const outcome = await watchJulesSession(session, info.url, {
          onStatus: setStatus,
          onTrace: setTraces,
          shouldStop: () => cloudStop.current,
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
        await workshopStatus(session);
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
        
        await checkWorkshopDelivery(session);
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
    console.log("evolve submit", providerId, text);
    await runCloud(text);
  }

  return <AgentScreen
    canContinue={canContinue} targetTitle={targetTitle}
    value={requirement} prompt={prompt} status={status} busy={busy} traces={traces} report={report}
    startedAt={runStartedAt} sessionId={sessionId} sessionLoading={sessionLoading} onNewSession={newSession}
    showDelivery={showDelivery} versionLoaded={versionLoaded} awaitingReply={awaitingReply}
    deliveryBusy={updateBusy} deliveryMessage={deliveryMessage}
    onLoadWish={() => void loadWish()}
    providerId={providerId} onProviderChange={setProviderId} onChange={setRequirement}
    onSubmit={() => void submit()} onStop={() => void stop()} onBack={onBack ?? context.navigation.back}
  />;
}
