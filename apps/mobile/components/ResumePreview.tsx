import { Canvas, Rect, Text as SkText, useFont, Group } from "@shopify/react-native-skia";
import { View, StyleSheet } from "react-native";
import type { Resume } from "@resumeforge/shared";

/**
 * Native on-device resume preview rendered with Skia. This is the LIVE preview
 * only — the exported PDF is rendered server-side from semantic HTML so it keeps
 * selectable text for ATS. (See spec §3 / §12.)
 */
const PAGE_W = 612; // Letter @ 72dpi
const PAGE_H = 792;

export function ResumePreview({ resume, width }: { resume: Resume; width: number }) {
  const scale = width / PAGE_W;
  const font = useFont(require("../assets/Helvetica.ttf"), 11);
  const bold = useFont(require("../assets/Helvetica-Bold.ttf"), 13);
  const h1 = useFont(require("../assets/Helvetica-Bold.ttf"), 22);

  if (!font || !bold || !h1) {
    return <View style={[styles.placeholder, { width, height: width * (PAGE_H / PAGE_W) }]} />;
  }

  const accent = resume.design.accentColor;
  let y = 48;
  const x = 40;
  const lines: JSX.Element[] = [];

  lines.push(<SkText key="name" x={x} y={y} text={resume.basics.fullName || "Your Name"} font={h1} color={accent} />);
  y += 22;
  if (resume.basics.headline) {
    lines.push(<SkText key="head" x={x} y={y} text={resume.basics.headline} font={font} color="#444" />);
    y += 18;
  }
  const contact = [resume.basics.email, resume.basics.phone, resume.basics.location].filter(Boolean).join("  ·  ");
  if (contact) {
    lines.push(<SkText key="contact" x={x} y={y} text={contact} font={font} color="#333" />);
    y += 22;
  }

  for (const section of resume.sections) {
    const heading =
      section.type === "custom" ? section.heading : section.type[0].toUpperCase() + section.type.slice(1);
    lines.push(<SkText key={`h-${section.id}`} x={x} y={y} text={heading.toUpperCase()} font={bold} color={accent} />);
    y += 16;

    if (section.type === "experience") {
      for (const i of section.items) {
        lines.push(<SkText key={`r-${i.id}`} x={x} y={y} text={`${i.role} — ${i.company}`} font={bold} color="#1a1a1a" />);
        y += 14;
        for (const b of i.bullets.slice(0, 4)) {
          lines.push(<SkText key={`b-${i.id}-${b.slice(0, 6)}`} x={x + 10} y={y} text={`• ${b.slice(0, 70)}`} font={font} color="#222" />);
          y += 13;
        }
        y += 6;
      }
    } else if (section.type === "skills") {
      for (const g of section.groups) {
        lines.push(<SkText key={`sk-${g.name ?? "x"}`} x={x} y={y} text={g.skills.join(", ").slice(0, 80)} font={font} color="#222" />);
        y += 14;
      }
      y += 6;
    }
    if (y > PAGE_H - 40) break;
  }

  return (
    <Canvas style={{ width, height: width * (PAGE_H / PAGE_W) }}>
      <Group transform={[{ scale }]}>
        <Rect x={0} y={0} width={PAGE_W} height={PAGE_H} color="white" />
        <Rect x={40} y={56} width={PAGE_W - 80} height={2} color={accent} />
        {lines}
      </Group>
    </Canvas>
  );
}

const styles = StyleSheet.create({
  placeholder: { backgroundColor: "white", borderRadius: 4 },
});
