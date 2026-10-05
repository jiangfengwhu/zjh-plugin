import React, { useState, useEffect, useMemo } from "react";
import { View, Text, TextInput, ScrollView, ActivityIndicator } from "react-native";
import { getAppContext } from "@zijinhua/app-sdk";
import { BackChip, useTheme, Pressy, Icon, RichMarkdown } from "@zijinhua/app-sdk/ui";
import { Calendar } from "react-native-calendars";

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
    const [selectedDate, setSelectedDate] = useState<string>("");
    const [isPolishing, setIsPolishing] = useState(false);
    const [sharingId, setSharingId] = useState<string | null>(null);

    useEffect(() => {
        const stored = ctx.storage.get("diary_entries");
        if (stored) {
            try {
                setEntries(JSON.parse(stored));
            } catch (e) {
                console.error("Failed to parse diary entries", e);
            }
        }

        // Set today as default selected date
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        setSelectedDate(`${yyyy}-${mm}-${dd}`);
    }, []);

    const markedDates = useMemo(() => {
        const marks: Record<string, any> = {};
        entries.forEach(entry => {
            const date = new Date(entry.timestamp);
            const yyyy = date.getFullYear();
            const mm = String(date.getMonth() + 1).padStart(2, '0');
            const dd = String(date.getDate()).padStart(2, '0');
            const dateStr = `${yyyy}-${mm}-${dd}`;
            marks[dateStr] = { marked: true, dotColor: colors.accent };
        });

        if (selectedDate) {
            marks[selectedDate] = {
                ...marks[selectedDate],
                selected: true,
                selectedColor: colors.accent
            };
        }
        return marks;
    }, [entries, selectedDate, colors]);

    const filteredEntries = useMemo(() => {
        if (!selectedDate) return entries;
        return entries.filter(entry => {
            const date = new Date(entry.timestamp);
            const yyyy = date.getFullYear();
            const mm = String(date.getMonth() + 1).padStart(2, '0');
            const dd = String(date.getDate()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd}` === selectedDate;
        });
    }, [entries, selectedDate]);

    const polishDraft = async () => {
        if (!draft.trim()) {
            ctx.toast.show("请先写点内容再润色", "warning" as any);
            return;
        }

        setIsPolishing(true);
        try {
            const result = await ctx.ai.complete({
                messages: [
                    { role: "system", content: "你是一个专业的散文作家，请帮我润色这篇日记，使其语言更加优美、生动，并保留原意。使用markdown格式，直接输出润色后的内容，不要输出任何额外的解释或对话。如果原文使用了markdown，请保留其格式。" },
                    { role: "user", content: draft }
                ]
            });

            if (result.ok) {
                setDraft(result.text);
                ctx.toast.show("润色完成", "success");
                ctx.haptics.trigger("notificationSuccess");
            } else {
                ctx.toast.show(`润色失败: ${result.error}`, "error" as any);
            }
        } catch (e) {
            ctx.toast.show("润色出错", "error" as any);
        } finally {
            setIsPolishing(false);
        }
    };

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

    const shareDiary = async (entry: DiaryEntry) => {
        if (sharingId) return;
        setSharingId(entry.id);

        try {
            const summaryResult = await ctx.ai.complete({
                messages: [
                    { role: "system", content: "你是一个优秀的编辑。请用一句话总结下面这篇日记的核心内容或情感，不超过30个字。直接输出总结，不要输出多余内容。" },
                    { role: "user", content: entry.content }
                ]
            });

            const summary = summaryResult.ok ? summaryResult.text : "分享了一篇日记";
            const dateStr = new Date(entry.timestamp).toLocaleDateString();

            const html = `
<div style="background: linear-gradient(135deg, ${colors.surface}, ${colors.surfaceRaised}); border-radius: 16px; padding: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); font-family: sans-serif; border: 1px solid ${colors.line};">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 1px dashed ${colors.lineStrong}; padding-bottom: 12px;">
        <span style="font-size: 14px; color: ${colors.muted}; font-weight: bold;">📝 岁月留声</span>
        <span style="font-size: 12px; color: ${colors.muted}; background: ${colors.inset}; padding: 4px 12px; border-radius: 12px;">${dateStr}</span>
    </div>
    <h3 style="color: ${colors.accentText}; margin-top: 0; font-size: 18px; line-height: 1.4;">${summary}</h3>
    <div style="color: ${colors.text}; font-size: 15px; line-height: 1.6; white-space: pre-wrap; margin-top: 16px;">
        ${entry.content.length > 200 ? entry.content.substring(0, 200) + '...' : entry.content}
    </div>
    <div style="margin-top: 24px; font-size: 12px; color: ${colors.muted}; text-align: right; font-style: italic;">
        —— 记录于 日记本 App
    </div>
</div>`;

            await ctx.feed.compose({ html });
        } catch (e) {
            console.error("Share failed", e);
            ctx.toast.show("分享准备失败", "error" as any);
        } finally {
            setSharingId(null);
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.canvas }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 48, backgroundColor: colors.surface }}>
                <BackChip onPress={ctx.navigation.back} />
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text, marginLeft: 8 }}>日记本</Text>
            </View>

            <ScrollView style={{ flex: 1 }}>
                <Calendar
                    current={selectedDate}
                    onDayPress={(day: any) => {
                        setSelectedDate(day.dateString);
                    }}
                    markedDates={markedDates}
                    theme={{
                        calendarBackground: colors.surface,
                        textSectionTitleColor: colors.muted,
                        dayTextColor: colors.text,
                        todayTextColor: colors.accent,
                        selectedDayTextColor: colors.onAccent,
                        monthTextColor: colors.text,
                        arrowColor: colors.accent,
                        dotColor: colors.accent,
                        selectedDotColor: colors.onAccent,
                    }}
                    style={{ marginBottom: 16 }}
                />

                <View style={{ paddingHorizontal: 16 }}>
                    <TextInput
                        style={{
                            backgroundColor: colors.field,
                            color: colors.text,
                            borderRadius: 8,
                            padding: 12,
                            minHeight: 120,
                            textAlignVertical: 'top'
                        }}
                        placeholder="写下今天的日记... 支持 Markdown"
                        placeholderTextColor={colors.muted}
                        multiline
                        value={draft}
                        onChangeText={setDraft}
                    />
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8, gap: 12 }}>
                        <Pressy
                            onPress={polishDraft}
                            disabled={isPolishing}
                            style={{
                                backgroundColor: colors.inset,
                                paddingHorizontal: 16,
                                paddingVertical: 10,
                                borderRadius: 20,
                                flexDirection: 'row',
                                alignItems: 'center'
                            }}
                        >
                            {isPolishing ? (
                                <ActivityIndicator size="small" color={colors.accent} style={{ marginRight: 4 }} />
                            ) : (
                                <Icon name="workshop" color={colors.accent} size={16} />
                            )}
                            <Text style={{ color: colors.accent, fontWeight: 'bold', marginLeft: isPolishing ? 0 : 4 }}>
                                {isPolishing ? "润色中" : "AI 润色"}
                            </Text>
                        </Pressy>
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

                <View style={{ padding: 16 }}>
                    <Text style={{ color: colors.muted, fontWeight: 'bold', marginBottom: 12 }}>
                        {selectedDate ? `${selectedDate} 的日记` : '全部日记'} ({filteredEntries.length})
                    </Text>
                    {filteredEntries.map(entry => (
                        <View key={entry.id} style={{
                            backgroundColor: colors.surface,
                            borderRadius: 12,
                            padding: 16,
                            marginBottom: 16,
                            borderWidth: 1,
                            borderColor: colors.line
                        }}>
                            <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 8 }}>
                                {new Date(entry.timestamp).toLocaleString()}
                            </Text>

                            <RichMarkdown
                                markdown={entry.content}
                                style={{ marginBottom: 16 }}
                            />

                            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 12 }}>
                                <Pressy onPress={() => deleteDiary(entry.id)} style={{ padding: 8, marginRight: 8 }}>
                                    <Icon name="close" color={colors.danger} size={20} />
                                </Pressy>
                                <Pressy onPress={() => shareDiary(entry)} style={{ padding: 8 }}>
                                    {sharingId === entry.id ? (
                                        <ActivityIndicator size="small" color={colors.accent} />
                                    ) : (
                                        <Icon name="send" color={colors.accent} size={20} />
                                    )}
                                </Pressy>
                            </View>
                        </View>
                    ))}
                    <View style={{ height: 40 }} />
                </View>
            </ScrollView>
        </View>
    );
}
