import { useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, TextInput, ActivityIndicator } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Link, useRouter } from "expo-router";
import { api } from "../lib/api";
import { useSession } from "../lib/session";

export default function Home() {
  const router = useRouter();
  const { ready, user, signIn } = useSession();

  if (!ready) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!user) return <SignIn onSignIn={signIn} />;

  return <ResumeList onOpen={(id) => router.push(`/resume/${id}`)} />;
}

function SignIn({ onSignIn }: { onSignIn: (email: string, name?: string) => Promise<void> }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    if (!email.includes("@")) {
      setErr("Enter a valid email.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await onSignIn(email.trim(), name.trim() || undefined);
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.signin}>
      <Text style={styles.brand}>ResumeForge</Text>
      <Text style={styles.tagline}>Build an ATS-ready resume with an AI assistant.</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput style={styles.input} placeholder="Name (optional)" value={name} onChangeText={setName} />
      {err && <Text style={styles.err}>{err}</Text>}
      <Pressable style={styles.btn} onPress={submit} disabled={busy}>
        <Text style={styles.btnText}>{busy ? "Signing in…" : "Continue"}</Text>
      </Pressable>
    </View>
  );
}

function ResumeList({ onOpen }: { onOpen: (id: string) => void }) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["resumes"],
    queryFn: () => api.listResumes(),
  });

  return (
    <View style={styles.container}>
      <View style={styles.topbar}>
        <Text style={styles.h1}>Your resumes</Text>
        <Link href="/settings" asChild>
          <Pressable>
            <Text style={styles.settingsLink}>Settings</Text>
          </Pressable>
        </Link>
      </View>
      <FlatList
        data={data ?? []}
        keyExtractor={(r) => r.id}
        refreshing={isLoading}
        onRefresh={refetch}
        ListEmptyComponent={
          !isLoading ? <Text style={styles.empty}>No resumes yet. Tap + to start.</Text> : null
        }
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => onOpen(item.id)}>
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
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  topbar: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, paddingBottom: 4,
  },
  h1: { fontSize: 22, fontWeight: "800" },
  settingsLink: { color: "#2563eb", fontWeight: "600" },
  empty: { textAlign: "center", marginTop: 80, color: "#888" },
  card: { backgroundColor: "white", margin: 12, marginBottom: 0, padding: 16, borderRadius: 12 },
  cardTitle: { fontSize: 16, fontWeight: "700" },
  cardMeta: { color: "#666", marginTop: 4 },
  fab: {
    position: "absolute", right: 24, bottom: 36, width: 56, height: 56, borderRadius: 28,
    backgroundColor: "#1f2933", alignItems: "center", justifyContent: "center",
  },
  fabText: { color: "white", fontSize: 28, lineHeight: 30 },
  signin: { flex: 1, padding: 24, justifyContent: "center", backgroundColor: "#f6f7f9", gap: 10 },
  brand: { fontSize: 34, fontWeight: "900", color: "#1f2933" },
  tagline: { color: "#555", marginBottom: 16, fontSize: 15 },
  input: { backgroundColor: "white", borderRadius: 10, padding: 14, borderWidth: 1, borderColor: "#e3e3e3" },
  err: { color: "#e02424" },
  btn: { backgroundColor: "#1f2933", padding: 16, borderRadius: 12, alignItems: "center", marginTop: 8 },
  btnText: { color: "white", fontWeight: "700", fontSize: 16 },
});
