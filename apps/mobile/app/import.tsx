import { useState } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet, ScrollView, ActivityIndicator, Alert,
} from "react-native";
import { useRouter } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import type { Resume } from "@resumeforge/shared";
import { api, ParseResult } from "../lib/api";

/**
 * Import + review. Paste resume text (or pick a .txt/.md file we can read on
 * device) → backend parse → editable review screen with low-confidence fields
 * highlighted → confirm creates the resume and opens the editor. Parsing is
 * never assumed perfect; the user always confirms here first.
 */
export default function Import() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ParseResult | null>(null);

  async function pickFile() {
    const res = await DocumentPicker.getDocumentAsync({ type: ["text/*", "application/pdf"] });
    if (res.canceled || !res.assets?.[0]) return;
    const asset = res.assets[0];
    try {
      const content = await FileSystem.readAsStringAsync(asset.uri);
      setText(content);
    } catch {
      Alert.alert(
        "Can't read that file on device",
        "Paste the resume text instead, or use a PDF export of your LinkedIn profile via the web app."
      );
    }
  }

  async function parse() {
    if (text.trim().length < 20) {
      Alert.alert("Add more text", "Paste your resume content first.");
      return;
    }
    setBusy(true);
    try {
      setResult(await api.parseText(text));
    } catch (e: any) {
      Alert.alert("Parse failed", String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    if (!result) return;
    setBusy(true);
    try {
      const created = await api.createResume(undefined, result.resume.title, "upload", result.resume);
      router.replace(`/resume/${created.id}`);
    } catch (e: any) {
      Alert.alert("Could not create resume", String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  if (result) return <Review result={result} resume={result.resume} onConfirm={confirm} busy={busy} />;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.label}>Paste your resume text</Text>
      <TextInput
        style={[styles.input, { height: 220 }]}
        multiline
        value={text}
        onChangeText={setText}
        placeholder="Paste the full text of your existing resume…"
      />
      <Pressable style={styles.btnAlt} onPress={pickFile}>
        <Text style={styles.btnAltText}>Pick a text file</Text>
      </Pressable>
      <Pressable style={styles.btn} onPress={parse} disabled={busy}>
        <Text style={styles.btnText}>{busy ? "Parsing…" : "Parse resume"}</Text>
      </Pressable>
      <Text style={styles.hint}>
        Tip: for LinkedIn, use “Save to PDF” on your profile, then import it through the web app for full history.
      </Text>
    </ScrollView>
  );
}

function Review({
  result, resume, onConfirm, busy,
}: {
  result: ParseResult;
  resume: Resume;
  onConfirm: () => void;
  busy: boolean;
}) {
  const low = new Set(result.lowConfidenceFields);
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.reviewTitle}>Review imported resume</Text>
      <Text style={styles.hint}>Parsed via {result.method}. Fields flagged in amber were low-confidence — confirm them after import.</Text>

      <Field label="Name" value={resume.basics.fullName} flagged={low.has("basics.fullName")} />
      <Field label="Email" value={resume.basics.email ?? "—"} />
      <Field label="Phone" value={resume.basics.phone ?? "—"} />

      {resume.sections.map((s, i) => (
        <View key={s.id} style={styles.sectionCard}>
          <Text style={styles.sectionHead}>{("heading" in s ? s.heading : s.type).toUpperCase()}</Text>
          {s.type === "experience" &&
            s.items.map((it, j) => (
              <Text key={it.id} style={[styles.sectionLine, low.has(`experience.${j}`) && styles.flagged]}>
                {it.role} — {it.company} · {it.bullets.length} bullet(s)
              </Text>
            ))}
          {s.type === "skills" && <Text style={styles.sectionLine}>{s.groups.flatMap((g) => g.skills).join(", ")}</Text>}
          {s.type === "education" && s.items.map((it) => <Text key={it.id} style={styles.sectionLine}>{it.institution}</Text>)}
          {s.type === "projects" && s.items.map((it) => <Text key={it.id} style={styles.sectionLine}>{it.name}</Text>)}
          {s.type === "certifications" && s.items.map((it) => <Text key={it.id} style={styles.sectionLine}>{it.name}</Text>)}
        </View>
      ))}

      <Pressable style={styles.btn} onPress={onConfirm} disabled={busy}>
        <Text style={styles.btnText}>{busy ? "Creating…" : "Looks good — create resume"}</Text>
      </Pressable>
      {busy && <ActivityIndicator style={{ marginTop: 10 }} />}
    </ScrollView>
  );
}

function Field({ label, value, flagged }: { label: string; value: string; flagged?: boolean }) {
  return (
    <View style={[styles.fieldRow, flagged && styles.flagged]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 10, backgroundColor: "#f6f7f9" },
  label: { fontWeight: "600" },
  input: { backgroundColor: "white", borderRadius: 10, padding: 12, borderWidth: 1, borderColor: "#e3e3e3" },
  btn: { backgroundColor: "#1f2933", padding: 15, borderRadius: 10, alignItems: "center", marginTop: 8 },
  btnText: { color: "white", fontWeight: "700" },
  btnAlt: { backgroundColor: "white", padding: 14, borderRadius: 10, alignItems: "center", borderWidth: 1, borderColor: "#1f2933" },
  btnAltText: { color: "#1f2933", fontWeight: "700" },
  hint: { color: "#777", fontSize: 13, marginTop: 4 },
  reviewTitle: { fontSize: 20, fontWeight: "800" },
  fieldRow: { backgroundColor: "white", padding: 12, borderRadius: 8, flexDirection: "row", justifyContent: "space-between" },
  fieldLabel: { color: "#666", fontWeight: "600" },
  fieldValue: { color: "#111", flexShrink: 1, textAlign: "right" },
  sectionCard: { backgroundColor: "white", padding: 12, borderRadius: 8, marginTop: 4 },
  sectionHead: { fontWeight: "800", color: "#1f2933", marginBottom: 6, fontSize: 12 },
  sectionLine: { color: "#333", marginBottom: 3 },
  flagged: { backgroundColor: "#fef3c7", borderColor: "#f59e0b", borderWidth: 1 },
});
