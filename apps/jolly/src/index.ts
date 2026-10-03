import { defineApp } from "@zijinhua/app-sdk";
import { JollyPortrait } from "./ui";
export default defineApp({
  main: () => require("./Home").default,
  avatar: JollyPortrait,
});
