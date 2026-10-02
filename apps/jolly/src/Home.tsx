import { useEffect, useRef, useState } from "react";
import { BackHandler, FlatList, Text, View } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { getAppContext } from "@zijinhua/app-sdk";
import { BackChip, Icon, Pressy, Screen, ScreenBar, Surface, themedStyleSheet, useTheme } from "@zijinhua/app-sdk/ui";
import { JollyPortrait } from "./ui";
import { workshopStageLabels, readJollyRun, subscribeJollyRun } from "./run";
import Workshop from "./Workshop";
type Workspace = { appId: string; title: string; originalAppId?: string };
function readWorkspaces(): Workspace[] { try { const value = JSON.parse(getAppContext().storage.get("workspaces") || "[]"); return Array.isArray(value) ? value.filter(item => item && /^[a-z][a-z0-9-]{0,63}$/.test(item.appId) && typeof item.title === "string") : []; } catch { return []; } }
export default function JollyHome() {
  const context = getAppContext(); const { colors } = useTheme();
  const focused = useIsFocused();
  const [workspaces, setWorkspaces] = useState(readWorkspaces);
  const [target, setTarget] = useState(() => context.storage.get("workshopTarget") || "");
  const [workshop, setWorkshop] = useState(false);
  const currentWorkspace = workspaces.find(item => item.appId === target);
  const [opened, setOpened] = useState(false);
  const [scope, setScope] = useState(() => context.storage.get("__accountScope"));
  useEffect(() => { if (workshop) setOpened(true); }, [workshop]);
  useEffect(() => context.storage.subscribe("__accountScope", () => { setScope(context.storage.get("__accountScope")); setWorkspaces(readWorkspaces()); setTarget(context.storage.get("workshopTarget") || ""); setOpened(false); setWorkshop(false); }), []);
  const selected = useRef(target); selected.current = target;
  useEffect(() => context.storage.subscribe("workspaces", () => { const next = readWorkspaces(); setWorkspaces(next); if (!next.some(item => item.appId === selected.current)) { setWorkshop(false); setTarget(""); } }), []);
  useEffect(() => {
    const accept = () => {
      if (!context.storage.get("openWorkshop")) return;
      context.storage.set("openWorkshop", ""); setWorkspaces(readWorkspaces());
      setTarget(context.storage.get("workshopTarget") || ""); setWorkshop(true);
    };
    accept(); return context.storage.subscribe("openWorkshop", accept);
  }, []);
  useEffect(() => {
    if (!workshop || !focused) return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => { setWorkshop(false); return true; });
    return () => subscription.remove();
  }, [workshop, focused]);
  return <View style={{ flex: 1 }}>
    <View style={{ flex: 1, display: workshop ? "none" : "flex" }}><Screen style={styles.screen}><ScreenBar style={styles.header}><BackChip onPress={context.navigation.back} /><Text style={styles.headerTitle}>Jolly</Text></ScreenBar><FlatList data={workspaces} keyExtractor={item => item.appId} initialNumToRender={8} windowSize={7} contentContainerStyle={styles.content} ListHeaderComponent={<View style={{ gap: 20 }}>
      <View style={styles.hero}><JollyPortrait size={132} animated={focused && !workshop} borderRadius={38} /><Text style={styles.title}>你好，我是 Jolly</Text><Text style={styles.caption}>每个应用都有自己的心愿工坊，可以同时制作。</Text></View>
      <Pressy accessibilityRole="button" onPress={() => context.navigation.create()}><Surface tone="raised" radius={24} style={styles.workshop}><Icon name="plus" size={25} color={colors.accent} /><View style={{ flex: 1, gap: 5 }}><Text style={styles.name}>创作新应用</Text><Text style={styles.copy}>说说心愿，让 Jolly 帮你实现</Text></View><Icon name="chevron" size={18} color={colors.ink3} /></Surface></Pressy>
      {workspaces.length ? <Text style={styles.name}>应用工坊</Text> : <Text style={styles.caption}>有一个想法，就从上面开始。作品和安装的应用都可以在“我的作品与应用”里管理。</Text>}
      </View>} renderItem={({ item }) => <WorkspaceRow item={item} onPress={() => { setTarget(item.appId); context.storage.set("workshopTarget", item.appId); setWorkshop(true); }} />} /></Screen></View>
    {currentWorkspace && (workshop || opened) ? <View key={`${scope}.${currentWorkspace.appId}`} style={{ flex: 1, display: workshop ? "flex" : "none" }}><Workshop visible={focused && workshop} title={currentWorkspace.title} appId={currentWorkspace.appId} originalAppId={currentWorkspace.originalAppId} onBack={() => setWorkshop(false)} onShowWorkshop={() => { if (focused && selected.current === currentWorkspace.appId) setWorkshop(true); }} /></View> : null}
  </View>;
}
function WorkspaceRow({ item, onPress }: { item: Workspace; onPress: () => void }) {
  const [run, setRun] = useState(() => readJollyRun(item.appId));
  useEffect(() => subscribeJollyRun(setRun, item.appId), [item.appId]);
  const context = getAppContext();
  const readSharing = () => { try { return JSON.parse(context.storage.get(`sharing.${item.appId}`) || "{}"); } catch { return {}; } };
  const [sharing, setSharing] = useState(readSharing);
  useEffect(() => context.storage.subscribe(`sharing.${item.appId}`, () => setSharing(readSharing())), [item.appId]);
  const label = run.stage ? workshopStageLabels[run.stage] : "尚未开始";
  return <Pressy accessibilityRole="button" onPress={onPress}><Surface radius={20} style={styles.progress}><Text style={styles.name}>{item.title}</Text><Text style={styles.copy}>{run.wish || "说说想做什么"}</Text><Text style={styles.caption}>{label}{sharing.releaseId ? sharing.hasUpdate ? " · 有新版本待分享" : " · 已分享" : " · 未分享"}</Text></Surface></Pressy>;
}
const styles = themedStyleSheet(t => ({ screen: { flex: 1, backgroundColor: t.canvas }, header: { padding: 20, gap: 12, flexDirection: "row", alignItems: "center" }, headerTitle: { color: t.ink1, fontSize: 18, fontWeight: "600" }, content: { padding: 24, paddingBottom: 40, gap: 20 }, hero: { alignItems: "center", gap: 14, paddingVertical: 14 }, title: { fontFamily: t.serif, fontSize: 28, color: t.ink1, fontWeight: "700" }, caption: { color: t.ink3, fontSize: 13, lineHeight: 20 }, workshop: { padding: 20, flexDirection: "row", gap: 15, alignItems: "center" }, name: { color: t.ink1, fontSize: 18, fontWeight: "600" }, copy: { color: t.ink2, fontSize: 14, lineHeight: 22 }, progress: { padding: 20, gap: 9 } }));
