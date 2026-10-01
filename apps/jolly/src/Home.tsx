import { useEffect, useState } from "react";
import { BackHandler, ScrollView, Text, View } from "react-native";
import { getAppContext } from "@zijinhua/app-sdk";
import { BackChip, Icon, Pressy, Screen, ScreenBar, Surface, themedStyleSheet, useTheme } from "@zijinhua/app-sdk/ui";
import { JollyPortrait } from "./ui";
import { describeJollyRun, readJollyRun, subscribeJollyRun } from "./run";
import Workshop from "./Workshop";
export default function JollyHome() {
  const context = getAppContext(); const { colors } = useTheme();
  const [workshop, setWorkshop] = useState(() => Boolean(context.storage.get("openWorkshop") || context.storage.get("pendingPrompt")));
  const [run, setRun] = useState(readJollyRun);
  useEffect(() => subscribeJollyRun(setRun), []);
  useEffect(() => {
    const accept = () => {
      if (context.storage.get("openWorkshop")) { context.storage.set("openWorkshop", ""); setWorkshop(true); }
    };
    accept(); return context.storage.subscribe("openWorkshop", accept);
  }, []);
  useEffect(() => {
    if (!workshop) return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => { setWorkshop(false); return true; });
    return () => subscription.remove();
  }, [workshop]);
  return <View style={{ flex: 1 }}>
    <View style={{ flex: 1, display: workshop ? "none" : "flex" }}>
      <Screen style={styles.screen}><ScreenBar style={styles.header}><BackChip onPress={context.navigation.back} /><Text style={styles.headerTitle}>Jolly</Text></ScreenBar>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.hero}><JollyPortrait size={148} animated borderRadius={40} /><Text style={styles.title}>你好，我是 Jolly</Text><Text style={styles.caption}>陪你发现灵感，把心愿做成小应用。</Text></View>
          <Pressy accessibilityRole="button" onPress={() => setWorkshop(true)}><Surface tone="raised" radius={24} style={styles.workshop}><Icon name="workshop" size={28} color={colors.accent} /><View style={{ flex: 1, gap: 5 }}><Text style={styles.name}>心愿工坊</Text><Text style={styles.copy}>说说想做什么，我们一起把它做出来</Text></View><Icon name="chevron" size={18} color={colors.ink3} /></Surface></Pressy>
          {run.wish ? <Pressy accessibilityRole="button" onPress={() => setWorkshop(true)}><Surface radius={20} style={styles.progress}><Text style={styles.name}>{run.phase === "making" ? "正在制作" : run.phase === "ready" ? "这次的作品" : "上一次心愿"}</Text><Text style={styles.copy}>{run.wish}</Text><Text style={styles.caption}>{describeJollyRun(run)}</Text><Text style={{ color: colors.accentText, fontSize: 13 }}>进入工坊查看</Text></Surface></Pressy> : null}
        </ScrollView>
      </Screen>
    </View>
    <View style={{ flex: 1, display: workshop ? "flex" : "none" }}><Workshop onBack={() => setWorkshop(false)} onShowWorkshop={() => setWorkshop(true)} /></View>
  </View>;
}
const styles = themedStyleSheet(t => ({ screen: { flex: 1, backgroundColor: t.canvas }, header: { padding: 20, gap: 12, flexDirection: "row", alignItems: "center" }, headerTitle: { color: t.ink1, fontSize: 18, fontWeight: "600" }, content: { padding: 24, paddingBottom: 40, gap: 24 }, hero: { alignItems: "center", gap: 16, paddingVertical: 18 }, title: { fontFamily: t.serif, fontSize: 28, color: t.ink1, fontWeight: "700" }, caption: { color: t.ink3, fontSize: 13, lineHeight: 20 }, workshop: { padding: 20, flexDirection: "row", gap: 15, alignItems: "center" }, name: { color: t.ink1, fontSize: 18, fontWeight: "600" }, copy: { color: t.ink2, fontSize: 14, lineHeight: 22 }, progress: { padding: 20, gap: 12 } }));
