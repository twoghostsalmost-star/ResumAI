import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <Stack screenOptions={{ headerTitleStyle: { fontWeight: "700" } }}>
        <Stack.Screen name="index" options={{ title: "ResumeForge" }} />
        <Stack.Screen name="new" options={{ title: "New Resume", presentation: "modal" }} />
        <Stack.Screen name="resume/[id]" options={{ title: "Editor" }} />
      </Stack>
    </QueryClientProvider>
  );
}
