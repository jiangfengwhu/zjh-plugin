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
    <View style={{ flex: 1, display: workshop ? "none" : "flex" }}><Screen style={styles.screen}><ScreenBar style={styles.header}><BackChip onPress={context.navigation.back} /><Text style={styles.headerTitle}>Jolly</Text></ScreenBar><FlatList data={workspaces} keyExtractor={item => item.appId} initialNumToRender={8} windowSize={7} contentContainerStyle={styles.content} ListHeaderComponent={<View style={{ gap: 12 }}>
      <View style={styles.hero}><View style={styles.companion}><JollyPortrait size={48} animated={focused && !workshop} borderRadius={16} /></View><View style={{ flex: 1, gap: 6 }}><Text style={styles.title}>把想法做成小应用</Text><Text style={styles.caption}>从一句话开始，一起慢慢完善。</Text></View></View>
      <Pressy accessibilityRole="button" style={styles.create} onPress={() => context.navigation.create()}><View style={styles.workshop}><Icon name="plus" size={20} color={colors.onAccent} /><View style={{ flex: 1, gap: 4 }}><Text style={[styles.name, { color: colors.onAccent }]}>创作新应用</Text><Text style={[styles.copy, { color: colors.onAccent }]}>说说你想解决的一件小事</Text></View><Icon name="chevron" size={16} color={colors.onAccent} /></View></Pressy>
      {workspaces.length ? <Text style={styles.caption}>最近制作</Text> : <Text style={styles.caption}>还没有作品。先说一个小想法，我来帮你整理。</Text>}
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
  return <Pressy accessibilityRole="button" onPress={onPress}><View style={styles.progress}><View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><Text style={[styles.name, { flex: 1 }]} numberOfLines={1}>{item.title}</Text><Icon name="chevron" size={16} /></View><Text style={styles.copy} numberOfLines={1}>{run.wish || "说说想做什么"}</Text><Text style={styles.caption}>{label}{sharing.releaseId ? sharing.hasUpdate ? " · 有新版本待分享" : " · 已分享" : " · 未分享"}</Text></View></Pressy>;
}
const styles = themedStyleSheet(t => ({
  screen: { flex: 1, backgroundColor: t.canvas },
  header: { paddingHorizontal: 12, paddingVertical: 2, gap: 8, flexDirection: "row", alignItems: "center", borderBottomWidth: 0.5, borderBottomColor: t.line },
  headerTitle: { color: t.ink1, fontSize: 19, fontWeight: "600" },
  content: { padding: 16, paddingBottom: 20, gap: 12 },
  hero: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 },
  companion: { padding: 6, borderRadius: 22, backgroundColor: t.surfaceRaised, boxShadow: `0 4px 8px ${t.shade}, inset 0 2px 3px ${t.sheen}` },
  create: { backgroundColor: t.accent, marginBottom: 8 },
  title: { fontSize: 17, color: t.ink1, fontWeight: "600" },
  caption: { color: t.ink3, fontSize: 12, lineHeight: 18 },
  workshop: { minHeight: 48, flexDirection: "row", gap: 12, alignItems: "center" },
  name: { color: t.ink1, fontSize: 15, fontWeight: "600" },
  copy: { color: t.ink2, fontSize: 14, lineHeight: 20 },
  progress: { paddingVertical: 12, gap: 4, borderBottomWidth: 0.5, borderBottomColor: t.line },
}));
