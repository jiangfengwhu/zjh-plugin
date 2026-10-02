import { Text, TextInput, View } from "react-native";
import FastImage from "@d11/react-native-fast-image";
import { Pressy, Surface, themedStyleSheet, useTheme } from "@zijinhua/app-sdk/ui";
export type ApplicationFeedback = { appId: string; releaseId: string; title: string; body: string; images: string[] };
export function readFeedback(raw?: string): ApplicationFeedback | undefined {
  try {
    const value = JSON.parse(raw || "null");
    if (!value || !/^[a-z][a-z0-9-]{0,63}$/.test(value.appId) || !/^[a-f0-9]{64}$/.test(value.releaseId) || typeof value.title !== "string" || typeof value.body !== "string" || value.body.length > 2000 || !Array.isArray(value.images) || value.images.length > 3 || value.images.some((url: unknown) => typeof url !== "string" || !/^https:\/\/[^/]+\/v1\/feedback-images\/[a-z][a-z0-9-]{0,63}\/[a-f0-9-]{36}\/[a-f0-9]{64}$/.test(url))) return undefined;
    return value;
  } catch { return undefined; }
}
export function feedbackPrompt(value: ApplicationFeedback) {
  return `修改「${value.title}」\n用户体验的应用 ID：${value.appId}\n体验版本 releaseId：${value.releaseId}\n以上版本用于复现和理解问题，遵守平台指定的目标应用与工作分支。\n\n用户确认的修改反馈：\n${value.body.trim()}${value.images.length ? `\n\n参考截图（R2 链接）：\n${value.images.join("\n")}\n请用可用的图片查看工具读取这些附图。如果无法读取，请明确告知，不能假装看过。不要把反馈截图作为应用素材打包。` : ""}`;
}
export function FeedbackReview({ value, owned, disabled, onChange, onConfirm, onDiscard }: { value: ApplicationFeedback; owned: boolean; disabled: boolean; onChange: (body: string) => void; onConfirm: () => void; onDiscard: () => void }) {
  const { colors } = useTheme();
  return <Surface style={styles.card}><Text style={styles.title}>确认这次修改</Text><Text style={styles.caption}>{value.title} · 体验版本 {value.releaseId.slice(0, 12)}</Text>
    <Text style={styles.caption}>{owned ? "继续这个作品原有的 Jules 会话，保留本机应用数据。" : "基于原作的公开版本创作新作品，不修改原作者的应用。"}</Text>
    <TextInput accessibilityLabel="确认修改反馈" multiline maxLength={2000} value={value.body} onChangeText={onChange} editable={!disabled} style={styles.input} />
    <View style={styles.images}>{value.images.map(url => <FastImage key={url} source={{ uri: url }} resizeMode={FastImage.resizeMode.contain} style={styles.image} />)}</View>
    <Text style={styles.caption}>确认后，反馈和截图链接会发送给 Jules。此前不会开始制作。</Text>
    <View style={styles.actions}><Pressy disabled={disabled} onPress={onDiscard}><Text style={styles.secondary}>暂不发送</Text></Pressy><Pressy disabled={disabled || !value.body.trim()} onPress={onConfirm}><Text style={styles.link}>{owned ? "确认并继续制作" : "确认并开始改造"}</Text></Pressy></View>
  </Surface>;
}
const styles = themedStyleSheet(t => ({ card: { padding: 18, gap: 14 }, title: { color: t.ink1, fontSize: 18, fontWeight: "600" }, caption: { color: t.ink3, lineHeight: 20, fontSize: 13 }, input: { color: t.ink1, backgroundColor: t.field, padding: 12, minHeight: 100, borderRadius: 12, textAlignVertical: "top" as const }, images: { flexDirection: "row", gap: 12 }, image: { width: 85, height: 135, backgroundColor: t.field, borderRadius: 10 }, actions: { flexDirection: "row", flexWrap: "wrap", gap: 20 }, link: { color: t.accentText, paddingVertical: 10 }, secondary: { color: t.ink3, paddingVertical: 10 } }));
