import React from "react";
import { View, Text } from "react-native";
import { getAppContext } from "@zijinhua/app-sdk";
import { BackChip, useTheme } from "@zijinhua/app-sdk/ui";
export default function App() {
 const ctx=getAppContext();const {colors}=useTheme();
 return <View style={{flex:1,padding:24,backgroundColor:colors.canvas}}><BackChip onPress={ctx.navigation.back}/><Text style={{color:colors.text}}>开始创作你的应用</Text></View>;
}
