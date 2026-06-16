import { View, Text, Pressable, StyleSheet, Alert } from "react-native";
import { useRouter } from "expo-router";
import { api } from "../lib/api";
import { DEMO_USER_ID } from "../store/useResumeStore";

export default function NewResume() {
  const router = useRouter();

  async function start(source: "scratch" | "upload" | "linkedin") {
    try {
      const resume = await api.createResume(DEMO_USER_ID, "Untitled Resume", source);
      router.replace(`/resume/${resume.id}`);
    } catch (e: any) {
      Alert.alert("Could not create resume", String(e?.message ?? e));
    }
  }

  return (
    <View style={styles.container}>
      <Pressable style={styles.option} onPress={() => start("scratch")}>
        <Text style={styles.optTitle}>Build from scratch</Text>
        <Text style={styles.optSub}>Voice or guided conversation, with a form fallback.</Text>
      </Pressable>
      <Pressable style={styles.option} onPress={() => start("upload")}>
        <Text style={styles.optTitle}>Upload a resume</Text>
        <Text style={styles.optSub}>PDF or DOCX — we parse it into editable sections.</Text>
      </Pressable>
      <Pressable style={styles.option} onPress={() => start("linkedin")}>
        <Text style={styles.optTitle}>Import from LinkedIn</Text>
        <Text style={styles.optSub}>Sign in to seed basics, or upload your profile PDF for full history.</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12, backgroundColor: "#f6f7f9" },
  option: { backgroundColor: "white", padding: 18, borderRadius: 12 },
  optTitle: { fontSize: 17, fontWeight: "700" },
  optSub: { color: "#666", marginTop: 6 },
});
