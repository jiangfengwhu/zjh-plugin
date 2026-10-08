import React from "react";
import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@zijinhua/app-sdk/ui";
export default function App() {
 const {colors}=useTheme();
 return <SafeAreaView style={{flex:1,backgroundColor:colors.canvas}}><View style={{flex:1,padding:24,gap:16}}><Text style={{color:colors.text}}>开始创作你的应用</Text></View></SafeAreaView>;
}
