import { View, Text, Pressable, StyleSheet, Alert, Linking, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { api } from "../lib/api";
import { useSession } from "../lib/session";

export default function Settings() {
  const router = useRouter();
  const { user, signOut } = useSession();

  function exportData() {
    Linking.openURL(api.exportMyDataUrl());
  }

  function confirmDelete() {
    Alert.alert(
      "Delete account",
      "This permanently deletes your account, all resumes, conversations, and exports. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete everything",
          style: "destructive",
          onPress: async () => {
            try {
              await api.deleteAccount();
              await signOut();
              router.replace("/");
            } catch (e: any) {
              Alert.alert("Delete failed", String(e?.message ?? e));
            }
          },
        },
      ]
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.label}>Signed in as</Text>
        <Text style={styles.value}>{user?.email ?? "—"}</Text>
      </View>

      <Text style={styles.sectionLabel}>Privacy & data</Text>
      <Pressable style={styles.row} onPress={exportData}>
        <Text style={styles.rowText}>Export my data</Text>
        <Text style={styles.chevron}>›</Text>
      </Pressable>
      <Pressable style={styles.row} onPress={confirmDelete}>
        <Text style={[styles.rowText, { color: "#e02424" }]}>Delete account</Text>
        <Text style={styles.chevron}>›</Text>
      </Pressable>

      <Pressable
        style={styles.signout}
        onPress={async () => {
          await signOut();
          router.replace("/");
        }}
      >
        <Text style={styles.signoutText}>Sign out</Text>
      </Pressable>

      <Text style={styles.footer}>
        Your resume content is highly sensitive. Keys for AI/voice providers stay on the backend and are never shipped
        to the app.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 8, backgroundColor: "#f6f7f9" },
  card: { backgroundColor: "white", padding: 16, borderRadius: 12 },
  label: { color: "#666", fontSize: 13 },
  value: { fontSize: 16, fontWeight: "700", marginTop: 4 },
  sectionLabel: { marginTop: 16, marginBottom: 4, color: "#888", fontWeight: "700", fontSize: 12, textTransform: "uppercase" },
  row: { backgroundColor: "white", padding: 16, borderRadius: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rowText: { fontSize: 16 },
  chevron: { color: "#bbb", fontSize: 22 },
  signout: { padding: 16, alignItems: "center", marginTop: 16 },
  signoutText: { color: "#2563eb", fontWeight: "700", fontSize: 16 },
  footer: { color: "#999", fontSize: 12, marginTop: 24, lineHeight: 17 },
});
