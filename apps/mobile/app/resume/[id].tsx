import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TextInput, Pressable, StyleSheet,
  useWindowDimensions, ActivityIndicator, Linking, Alert,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import type { AtsScoreResult, ResumePatch } from "@resumeforge/shared";
import { useResumeStore } from "../../store/useResumeStore";
import { ResumePreview } from "../../components/ResumePreview";
import { api } from "../../lib/api";

type Tab = "preview" | "content" | "assistant" | "ats";

export default function Editor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { resume, load, save, setResume, acceptPatches, loading } = useResumeStore();
  const { width } = useWindowDimensions();
  const [tab, setTab] = useState<Tab>("preview");

  useEffect(() => {
    if (id) load(id);
  }, [id]);

  if (loading || !resume) {
    return <View style={styles.center}><ActivityIndicator /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        {(["preview", "content", "assistant", "ats"] as Tab[]).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabActive]}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t}</Text>
          </Pressable>
        ))}
      </View>

      {tab === "preview" && (
        <ScrollView contentContainerStyle={styles.previewWrap}>
          <ResumePreview resume={resume} width={width - 32} />
          <View style={styles.exportRow}>
            <Pressable style={styles.btn} onPress={() => Linking.openURL(api.exportUrl(resume.id, "pdf"))}>
              <Text style={styles.btnText}>Export PDF</Text>
            </Pressable>
            <Pressable style={styles.btnAlt} onPress={() => Linking.openURL(api.exportUrl(resume.id, "docx"))}>
              <Text style={styles.btnAltText}>Export DOCX</Text>
            </Pressable>
          </View>
        </ScrollView>
      )}

      {tab === "content" && <ContentTab />}
      {tab === "assistant" && <AssistantTab />}
      {tab === "ats" && <AtsTab />}
    </View>
  );

  function ContentTab() {
    const r = resume!;
    return (
      <ScrollView contentContainerStyle={styles.form}>
        <Text style={styles.label}>Full name</Text>
        <TextInput
          style={styles.input}
          value={r.basics.fullName}
          onChangeText={(v) => setResume({ ...r, basics: { ...r.basics, fullName: v } })}
        />
        <Text style={styles.label}>Headline</Text>
        <TextInput
          style={styles.input}
          value={r.basics.headline ?? ""}
          onChangeText={(v) => setResume({ ...r, basics: { ...r.basics, headline: v } })}
        />
        <Text style={styles.label}>Summary</Text>
        <TextInput
          style={[styles.input, { height: 90 }]}
          multiline
          value={r.basics.summary ?? ""}
          onChangeText={(v) => setResume({ ...r, basics: { ...r.basics, summary: v } })}
        />
        <Text style={styles.label}>Target job description (for ATS keyword match)</Text>
        <TextInput
          style={[styles.input, { height: 90 }]}
          multiline
          value={r.targetJobDescription ?? ""}
          onChangeText={(v) => setResume({ ...r, targetJobDescription: v })}
        />
        <Pressable style={styles.btn} onPress={() => save()}>
          <Text style={styles.btnText}>Save</Text>
        </Pressable>
      </ScrollView>
    );
  }

  function AssistantTab() {
    const [msg, setMsg] = useState("");
    const [log, setLog] = useState<{ role: string; text: string; patches?: ResumePatch[] }[]>([]);
    const [busy, setBusy] = useState(false);

    async function send() {
      if (!msg.trim()) return;
      const userMsg = msg.trim();
      setMsg("");
      setLog((l) => [...l, { role: "user", text: userMsg }]);
      setBusy(true);
      try {
        const res = await api.assistant(resume!.id, userMsg);
        setLog((l) => [...l, { role: "assistant", text: res.reply, patches: res.patches }]);
      } catch (e: any) {
        setLog((l) => [...l, { role: "assistant", text: `Error: ${e?.message ?? e}` }]);
      } finally {
        setBusy(false);
      }
    }

    return (
      <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.chat}>
          {log.map((m, i) => (
            <View key={i} style={[styles.bubble, m.role === "user" ? styles.bubbleUser : styles.bubbleAi]}>
              <Text style={m.role === "user" ? styles.bubbleUserText : undefined}>{m.text}</Text>
              {m.patches && m.patches.length > 0 && (
                <Pressable
                  style={styles.applyBtn}
                  onPress={async () => {
                    await acceptPatches(m.patches!);
                    Alert.alert("Applied", "The suggested changes were applied.");
                  }}
                >
                  <Text style={styles.applyText}>Apply {m.patches.length} change(s)</Text>
                </Pressable>
              )}
            </View>
          ))}
          {busy && <ActivityIndicator style={{ marginTop: 12 }} />}
        </ScrollView>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.chatInput}
            value={msg}
            onChangeText={setMsg}
            placeholder="Ask for improvements…"
          />
          <Pressable style={styles.sendBtn} onPress={send}>
            <Text style={styles.btnText}>Send</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  function AtsTab() {
    const [score, setScore] = useState<AtsScoreResult | null>(resume!.atsScore ?? null);
    const [busy, setBusy] = useState(false);

    async function run() {
      setBusy(true);
      try {
        setScore(await api.score(resume!.id));
      } finally {
        setBusy(false);
      }
    }

    return (
      <ScrollView contentContainerStyle={styles.form}>
        <Pressable style={styles.btn} onPress={run}>
          <Text style={styles.btnText}>{busy ? "Scoring…" : "Run ATS scan"}</Text>
        </Pressable>
        {score && (
          <>
            <Text style={styles.overall}>{score.overall}<Text style={styles.overallMax}> / 100</Text></Text>
            {Object.entries(score.subscores).map(([k, v]) => (
              <View key={k} style={styles.subRow}>
                <Text style={styles.subLabel}>{k}</Text>
                <Text style={styles.subVal}>{v}</Text>
              </View>
            ))}
            <Text style={[styles.label, { marginTop: 16 }]}>Findings</Text>
            {score.findings.map((f) => (
              <View key={f.id} style={[styles.finding, sevStyle(f.severity)]}>
                <Text style={styles.findingSev}>{f.severity.toUpperCase()} · {f.area}</Text>
                <Text>{f.message}</Text>
                {f.fix?.autoApplyPatch && (
                  <Pressable
                    style={styles.applyBtn}
                    onPress={async () => {
                      await acceptPatches(f.fix!.autoApplyPatch!);
                      setScore(await api.score(resume!.id));
                    }}
                  >
                    <Text style={styles.applyText}>Apply fix</Text>
                  </Pressable>
                )}
              </View>
            ))}
          </>
        )}
      </ScrollView>
    );
  }
}

function sevStyle(sev: string) {
  if (sev === "critical") return { borderLeftColor: "#e02424" };
  if (sev === "warning") return { borderLeftColor: "#d97706" };
  return { borderLeftColor: "#3b82f6" };
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f6f7f9" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  tabs: { flexDirection: "row", backgroundColor: "white", borderBottomWidth: 1, borderColor: "#eee" },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center" },
  tabActive: { borderBottomWidth: 2, borderColor: "#1f2933" },
  tabText: { color: "#888", textTransform: "capitalize" },
  tabTextActive: { color: "#1f2933", fontWeight: "700" },
  previewWrap: { padding: 16, alignItems: "center" },
  exportRow: { flexDirection: "row", gap: 12, marginTop: 16 },
  form: { padding: 16, gap: 8 },
  label: { fontWeight: "600", marginTop: 8 },
  input: { backgroundColor: "white", borderRadius: 8, padding: 12, borderWidth: 1, borderColor: "#e3e3e3" },
  btn: { backgroundColor: "#1f2933", padding: 14, borderRadius: 10, alignItems: "center", marginTop: 12 },
  btnText: { color: "white", fontWeight: "700" },
  btnAlt: { backgroundColor: "white", padding: 14, borderRadius: 10, alignItems: "center", borderWidth: 1, borderColor: "#1f2933" },
  btnAltText: { color: "#1f2933", fontWeight: "700" },
  chat: { padding: 16, gap: 10 },
  bubble: { padding: 12, borderRadius: 12, maxWidth: "90%" },
  bubbleUser: { backgroundColor: "#1f2933", alignSelf: "flex-end" },
  bubbleUserText: { color: "white" },
  bubbleAi: { backgroundColor: "white", alignSelf: "flex-start" },
  applyBtn: { marginTop: 8, backgroundColor: "#16a34a", padding: 8, borderRadius: 8, alignItems: "center" },
  applyText: { color: "white", fontWeight: "600" },
  inputRow: { flexDirection: "row", padding: 10, gap: 8, backgroundColor: "white" },
  chatInput: { flex: 1, backgroundColor: "#f0f0f0", borderRadius: 10, padding: 12 },
  sendBtn: { backgroundColor: "#1f2933", paddingHorizontal: 18, borderRadius: 10, justifyContent: "center" },
  overall: { fontSize: 56, fontWeight: "800", textAlign: "center", color: "#1f2933" },
  overallMax: { fontSize: 18, color: "#999", fontWeight: "500" },
  subRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderBottomWidth: 1, borderColor: "#eee" },
  subLabel: { textTransform: "capitalize", color: "#444" },
  subVal: { fontWeight: "700" },
  finding: { backgroundColor: "white", padding: 12, borderRadius: 8, borderLeftWidth: 4, marginTop: 8 },
  findingSev: { fontSize: 11, color: "#666", marginBottom: 4, fontWeight: "700" },
});
