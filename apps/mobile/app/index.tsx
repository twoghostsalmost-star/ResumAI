import { View, Text, FlatList, Pressable, StyleSheet } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Link, useRouter } from "expo-router";
import { api } from "../lib/api";
import { DEMO_USER_ID as USER } from "../store/useResumeStore";

export default function Home() {
  const router = useRouter();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["resumes", USER],
    queryFn: () => api.listResumes(USER),
  });

  return (
    <View style={styles.container}>
      <FlatList
        data={data ?? []}
        keyExtractor={(r) => r.id}
        refreshing={isLoading}
        onRefresh={refetch}
        ListEmptyComponent={
          !isLoading ? <Text style={styles.empty}>No resumes yet. Tap + to start.</Text> : null
        }
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => router.push(`/resume/${item.id}`)}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardMeta}>
              {item.source} · {item.atsScore ? `ATS ${item.atsScore.overall}` : "unscored"}
            </Text>
          </Pressable>
        )}
      />
      <Link href="/new" asChild>
        <Pressable style={styles.fab}>
          <Text style={styles.fabText}>+</Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f6f7f9" },
  empty: { textAlign: "center", marginTop: 80, color: "#888" },
  card: { backgroundColor: "white", margin: 12, marginBottom: 0, padding: 16, borderRadius: 12 },
  cardTitle: { fontSize: 16, fontWeight: "700" },
  cardMeta: { color: "#666", marginTop: 4 },
  fab: {
    position: "absolute", right: 24, bottom: 36, width: 56, height: 56, borderRadius: 28,
    backgroundColor: "#1f2933", alignItems: "center", justifyContent: "center",
  },
  fabText: { color: "white", fontSize: 28, lineHeight: 30 },
});
