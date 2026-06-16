import { useEffect } from "react";
import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSession } from "../lib/session";

const queryClient = new QueryClient();

export default function RootLayout() {
  const bootstrap = useSession((s) => s.bootstrap);
  useEffect(() => {
    bootstrap();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Stack screenOptions={{ headerTitleStyle: { fontWeight: "700" } }}>
        <Stack.Screen name="index" options={{ title: "ResumeForge" }} />
        <Stack.Screen name="new" options={{ title: "New Resume", presentation: "modal" }} />
        <Stack.Screen name="import" options={{ title: "Import Resume", presentation: "modal" }} />
        <Stack.Screen name="settings" options={{ title: "Settings" }} />
        <Stack.Screen name="resume/[id]" options={{ title: "Editor" }} />
      </Stack>
    </QueryClientProvider>
  );
}
