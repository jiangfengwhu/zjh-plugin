import { useEffect, useRef, useState } from "react";
import { BackHandler, ScrollView, Text, View } from "react-native";
import { getAppContext } from "@zijinhua/app-sdk";
import { BackChip, Icon, Pressy, Screen, ScreenBar, Surface, themedStyleSheet, useTheme } from "@zijinhua/app-sdk/ui";
import { JollyPortrait } from "./ui";
import { workshopStageLabels, readJollyRun, subscribeJollyRun } from "./run";
import Workshop from "./Workshop";
type Workspace = { appId: string; title: string; originalAppId?: string };
function readWorkspaces(): Workspace[] { try { return JSON.parse(getAppContext().storage.get("workspaces") || "[]"); } catch { return []; } }
export default function JollyHome() {
  const context = getAppContext(); const { colors } = useTheme();
  const [workspaces, setWorkspaces] = useState(readWorkspaces);
  const [target, setTarget] = useState(() => context.storage.get("workshopTarget") || "");
  const [workshop, setWorkshop] = useState(false);
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
    if (!workshop) return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => { setWorkshop(false); return true; });
    return () => subscription.remove();
  }, [workshop]);
  return <View style={{ flex: 1 }}>
    <View style={{ flex: 1, display: workshop ? "none" : "flex" }}><Screen style={styles.screen}><ScreenBar style={styles.header}><BackChip onPress={context.navigation.back} /><Text style={styles.headerTitle}>Jolly</Text></ScreenBar><ScrollView contentContainerStyle={styles.content}>
      <View style={styles.hero}><JollyPortrait size={132} animated borderRadius={38} /><Text style={styles.title}>你好，我是 Jolly</Text><Text style={styles.caption}>每个应用都有自己的心愿工坊，可以同时制作。</Text></View>
      <Pressy accessibilityRole="button" onPress={() => context.navigation.create()}><Surface tone="raised" radius={24} style={styles.workshop}><Icon name="plus" size={25} color={colors.accent} /><View style={{ flex: 1, gap: 5 }}><Text style={styles.name}>创作新应用</Text><Text style={styles.copy}>说说心愿，让 Jolly 帮你实现</Text></View><Icon name="chevron" size={18} color={colors.ink3} /></Surface></Pressy>
      {workspaces.length ? <Text style={styles.name}>应用工坊</Text> : <Text style={styles.caption}>有一个想法，就从上面开始。作品和安装的应用都可以在“我的作品与应用”里管理。</Text>}
      {workspaces.map(item => <WorkspaceRow key={item.appId} item={item} onPress={() => { setTarget(item.appId); context.storage.set("workshopTarget", item.appId); setWorkshop(true); }} />)}
    </ScrollView></Screen></View>
    {workspaces.map(item => <View key={item.appId} style={{ flex: 1, display: workshop && target === item.appId ? "flex" : "none" }}><Workshop visible={workshop && target === item.appId} title={item.title} appId={item.appId} originalAppId={item.originalAppId} onBack={() => setWorkshop(false)} onShowWorkshop={() => { if (selected.current === item.appId) setWorkshop(true); }} /></View>)}
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
