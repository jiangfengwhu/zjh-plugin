import React from 'react';
import { Text, View } from 'react-native';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Action, Card, styles, usePalette } from './ui';
import { copy, draftIntro, roleName, useCareer } from './model';

export function QuickCard() {
  const c = usePalette(), state = useCareer(), p = state.profile;
  const intro = state.intro || draftIntro(p);
  const recent = state.history.find(h => h.profile.target === p.target && h.profile.role === p.role && h.profile.company === p.company && h.profile.jd === p.jd);
  const lines = [
    { title: '先说清我是谁', text: intro, note: '用自己的话讲 30–60 秒。保留一段最相关经历，括号里的内容需补齐。' },
    { title: '为什么选这个岗位', text: p.jd ? '从 JD 选一项具体工作 → 讲一段做过的相似任务 → 说明希望继续做它的原因。' : '先问清主要工作内容，再用一段真实经历说明你为什么想做。', note: '公司事实未核实就不说；可以问“我理解这个岗位主要做 X，对吗？”' },
    { title: '我能带来什么', text: p.experience || '先选一件自己真正做过的事：我负责什么 → 怎么做 → 实际交付了什么。没有数据，可以说具体产出和反馈。', note: '少说“学习能力强”，多说一次具体行动。' },
  ];
  return <BottomSheetScrollView contentContainerStyle={styles.content}><View style={{ gap: 6 }}><Text style={[styles.title, { color: c.text }]}>面试前 2 分钟</Text><Text style={[styles.body, { color: c.muted }]}>{roleName(p)}{p.company ? ` · ${p.company}` : ''} · 已有内容立即可看，无需联网。</Text></View>
    {recent?.report ? <Card><Text style={[styles.heading, { color: c.text }]}>上次练习，最该记住的事</Text><Text selectable style={[styles.body, { color: c.text }]}>{recent.report.reminder}</Text></Card> : null}
    {lines.map(item => <Card key={item.title}><Text style={[styles.heading, { color: c.text }]}>{item.title}</Text><Text selectable style={[styles.body, { color: c.text }]}>{item.text}</Text><Text style={[styles.small, { color: c.muted }]}>{item.note}</Text></Card>)}
    <Card><Text style={[styles.heading, { color: c.text }]}>来电时不方便，先争取准备时间</Text><Text selectable style={[styles.body, { color: c.text }]}>“感谢联系，我现在不方便完整交流，可以约在［具体时间］聊吗？也想先确认一下岗位名称和这次交流重点。”</Text><Action label="复制这句" subtle onPress={() => copy('感谢联系，我现在不方便完整交流，可以约在［具体时间］聊吗？也想先确认一下岗位名称和这次交流重点。')} /></Card>
  </BottomSheetScrollView>;
}
