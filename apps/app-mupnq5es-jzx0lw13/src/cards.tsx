import React from "react";
import { Text } from "react-native";
import { FeedCardProps } from "@zijinhua/app-sdk";
import { PostFrame, PostAttachment, useTheme } from "@zijinhua/app-sdk/ui";

export function WelcomeCard(props: FeedCardProps) {
  const { colors } = useTheme();
  return (
    <PostFrame {...props}>
      <PostAttachment style={{ padding: 16, backgroundColor: colors.surfaceRaised, borderRadius: 12 }}>
        <Text style={{ color: colors.text }}>欢迎使用番茄钟！开始你的第一次专注吧。</Text>
      </PostAttachment>
    </PostFrame>
  );
}

export function UpdateCard(props: FeedCardProps) {
  const { colors } = useTheme();
  return (
    <PostFrame {...props}>
      <PostAttachment style={{ padding: 16, backgroundColor: colors.surfaceRaised, borderRadius: 12 }}>
        <Text style={{ color: colors.text }}>番茄钟有新版本更新啦！</Text>
      </PostAttachment>
    </PostFrame>
  );
}

export function ActivityCard(props: FeedCardProps) {
  const { colors } = useTheme();
  return (
    <PostFrame {...props}>
      <PostAttachment style={{ padding: 16, backgroundColor: colors.surfaceRaised, borderRadius: 12 }}>
        <Text style={{ color: colors.text }}>{props.friend.name} 刚刚完成了一次专注！</Text>
      </PostAttachment>
    </PostFrame>
  );
}
