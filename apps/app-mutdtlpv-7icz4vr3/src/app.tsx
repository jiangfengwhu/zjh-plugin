import React, { useState } from "react";
import HomeScreen from "./screens/HomeScreen";
import EditorScreen from "./screens/EditorScreen";

export default function App() {
  const [route, setRoute] = useState<{ name: "Home" | "Editor"; id?: string }>({ name: "Home" });

  if (route.name === "Editor") {
    return (
      <EditorScreen
        id={route.id}
        onGoBack={() => setRoute({ name: "Home" })}
      />
    );
  }

  return (
    <HomeScreen
      onNavigateToEditor={(id) => setRoute({ name: "Editor", id })}
    />
  );
}
