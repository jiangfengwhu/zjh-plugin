import { defineApp } from "@zijinhua/app-sdk";
import { WelcomeCard, UpdateCard, ActivityCard } from "./cards";

export default defineApp({
  main: () => require("./app").default,
  cards: {
    welcome: WelcomeCard,
    update: UpdateCard,
    activity: ActivityCard
  }
});
