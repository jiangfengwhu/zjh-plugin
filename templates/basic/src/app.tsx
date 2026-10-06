import React from "react";
import { View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getAppContext } from "@zijinhua/app-sdk";
import { useTheme } from "@zijinhua/app-sdk/ui";
export default function App() {
 const ctx=getAppContext();const {colors}=useTheme();
 return <SafeAreaView style={{flex:1,backgroundColor:colors.canvas}}><View style={{flex:1,padding:24,gap:16}}><Pressable accessibilityRole="button" onPress={ctx.navigation.back} style={{minHeight:44,justifyContent:"center"}}><Text style={{color:colors.accentText}}>返回</Text></Pressable><Text style={{color:colors.text}}>开始创作你的应用</Text></View></SafeAreaView>;
}
