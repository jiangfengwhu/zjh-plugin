import React, { useState, useEffect } from "react";
import { View, Text, TextInput, ScrollView, StyleSheet } from "react-native";
import { getAppContext } from "@zijinhua/app-sdk";
import { BackChip, useTheme, Pressy, Icon } from "@zijinhua/app-sdk/ui";

type DiaryEntry = {
    id: string;
    content: string;
    timestamp: number;
};

export default function App() {
    const ctx = getAppContext();
    const { colors } = useTheme();

    const [draft, setDraft] = useState("");
    const [entries, setEntries] = useState<DiaryEntry[]>([]);

    useEffect(() => {
        const stored = ctx.storage.get("diary_entries");
        if (stored) {
            try {
                setEntries(JSON.parse(stored));
            } catch (e) {
                console.error("Failed to parse diary entries", e);
            }
        }
    }, []);

    const saveDiary = () => {
        if (!draft.trim()) {
            ctx.toast.show("内容不能为空", "warning" as any);
            return;
        }

        const newEntry: DiaryEntry = {
            id: Date.now().toString(),
            content: draft.trim(),
            timestamp: Date.now()
        };

        const updated = [newEntry, ...entries];
        setEntries(updated);
        ctx.storage.set("diary_entries", JSON.stringify(updated));
        setDraft("");
        ctx.haptics.trigger("notificationSuccess");
    };

    const deleteDiary = (id: string) => {
        const updated = entries.filter(e => e.id !== id);
        setEntries(updated);
        ctx.storage.set("diary_entries", JSON.stringify(updated));
        ctx.haptics.trigger("selection");
    };

    const shareDiary = (entry: DiaryEntry) => {
        const html = `<p>${entry.content.replace(/\n/g, '<br/>')}</p>`;
        ctx.feed.compose({ html }).catch(e => console.error("Share failed", e));
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.canvas }}>
            {/* Custom Header area instead of unverified PageHeader or ScreenBar */}
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 48, backgroundColor: colors.surface }}>
                <BackChip onPress={ctx.navigation.back} />
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text, marginLeft: 8 }}>日记本</Text>
            </View>

            <View style={{ padding: 16 }}>
                <TextInput
                    style={{
                        backgroundColor: colors.field,
                        color: colors.text,
                        borderRadius: 8,
                        padding: 12,
                        minHeight: 100,
                        textAlignVertical: 'top'
                    }}
                    placeholder="写下今天的日记..."
                    placeholderTextColor={colors.muted}
                    multiline
                    value={draft}
                    onChangeText={setDraft}
                />
                <View style={{ alignItems: 'flex-end', marginTop: 8 }}>
                    <Pressy
                        onPress={saveDiary}
                        style={{
                            backgroundColor: colors.accent,
                            paddingHorizontal: 20,
                            paddingVertical: 10,
                            borderRadius: 20
                        }}
                    >
                        <Text style={{ color: colors.onAccent, fontWeight: 'bold' }}>保存</Text>
                    </Pressy>
                </View>
            </View>

            <ScrollView style={{ flex: 1, paddingHorizontal: 16 }}>
                {entries.map(entry => (
                    <View key={entry.id} style={{
                        backgroundColor: colors.surface,
                        borderRadius: 12,
                        padding: 16,
                        marginBottom: 12,
                        borderWidth: 1,
                        borderColor: colors.line
                    }}>
                        <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 8 }}>
                            {new Date(entry.timestamp).toLocaleString()}
                        </Text>
                        <Text style={{ color: colors.text, fontSize: 16, lineHeight: 24, marginBottom: 16 }}>
                            {entry.content}
                        </Text>

                        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 12 }}>
                            <Pressy onPress={() => deleteDiary(entry.id)} style={{ padding: 8, marginRight: 8 }}>
                                <Icon name="close" color={colors.danger} size={20} />
                            </Pressy>
                            <Pressy onPress={() => shareDiary(entry)} style={{ padding: 8 }}>
                                <Icon name="send" color={colors.accent} size={20} />
                            </Pressy>
                        </View>
                    </View>
                ))}
                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}
