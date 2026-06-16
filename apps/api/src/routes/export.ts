import { FastifyInstance } from "fastify";
import { ResumeSchema, Resume } from "@resumeforge/shared";
import { prisma } from "../db.js";
import { renderResumeHtml } from "../pipeline/export-html.js";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
} from "docx";

/** Thrown when Chromium isn't available in the runtime (e.g. a serverless host
 * without the browser). Lets the route degrade to a clear 503 instead of a 500
 * stack trace; DOCX/HTML export keep working. */
class PdfUnavailableError extends Error {}

/** Launch Chromium. On a serverless host (Vercel/Lambda) use the bundled
 * @sparticuz/chromium binary via playwright-core; elsewhere use full Playwright
 * (installed in docker/Dockerfile.api). */
async function launchBrowser() {
  const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  if (isServerless) {
    try {
      // Computed specifiers so TS doesn't require these optional deps at build.
      const sparticuzSpec = "@sparticuz/chromium";
      const pwCoreSpec = "playwright-core";
      const chromium = ((await import(sparticuzSpec)) as any).default;
      const { chromium: pw } = (await import(pwCoreSpec)) as any;
      return await pw.launch({
        args: chromium.args,
        executablePath: await chromium.executablePath(),
        headless: true,
      });
    } catch (e: any) {
      throw new PdfUnavailableError(
        `Serverless Chromium unavailable (${e?.message ?? e}). Use DOCX/HTML export, or run the API as a container (see DEPLOY_API.md).`
      );
    }
  }
  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    throw new PdfUnavailableError("Playwright is not installed in this runtime.");
  }
  try {
    return await chromium.launch();
  } catch (e: any) {
    throw new PdfUnavailableError(
      `Could not launch Chromium for PDF export (${e?.message ?? e}). Use DOCX/HTML, or run the API on a host with Chromium (see DEPLOY_API.md).`
    );
  }
}

async function renderPdf(html: string): Promise<Buffer> {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle" });
    const pdf = await page.pdf({ format: "Letter", printBackground: true });
    return pdf as Buffer;
  } finally {
    await browser.close();
  }
}

async function renderDocx(resume: Resume): Promise<Buffer> {
  const children: Paragraph[] = [
    new Paragraph({ text: resume.basics.fullName, heading: HeadingLevel.TITLE }),
  ];
  if (resume.basics.headline) children.push(new Paragraph({ text: resume.basics.headline }));
  const contact = [resume.basics.email, resume.basics.phone, resume.basics.location]
    .filter(Boolean)
    .join("  ·  ");
  if (contact) children.push(new Paragraph({ children: [new TextRun({ text: contact, size: 18 })] }));

  if (resume.basics.summary) {
    children.push(new Paragraph({ text: "Summary", heading: HeadingLevel.HEADING_1 }));
    children.push(new Paragraph({ text: resume.basics.summary }));
  }

  for (const section of resume.sections) {
    if (section.type === "experience") {
      children.push(new Paragraph({ text: "Experience", heading: HeadingLevel.HEADING_1 }));
      for (const i of section.items) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: `${i.role}`, bold: true }),
              new TextRun({ text: `  —  ${i.company}` }),
            ],
          })
        );
        for (const b of i.bullets) children.push(new Paragraph({ text: b, bullet: { level: 0 } }));
      }
    } else if (section.type === "education") {
      children.push(new Paragraph({ text: "Education", heading: HeadingLevel.HEADING_1 }));
      for (const i of section.items) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: i.institution, bold: true }), new TextRun({ text: `  —  ${i.degree ?? ""}` })],
          })
        );
      }
    } else if (section.type === "skills") {
      children.push(new Paragraph({ text: "Skills", heading: HeadingLevel.HEADING_1 }));
      for (const g of section.groups) {
        children.push(new Paragraph({ text: `${g.name ? g.name + ": " : ""}${g.skills.join(", ")}` }));
      }
    } else if (section.type === "projects") {
      children.push(new Paragraph({ text: "Projects", heading: HeadingLevel.HEADING_1 }));
      for (const i of section.items) {
        children.push(new Paragraph({ children: [new TextRun({ text: i.name, bold: true })] }));
        for (const b of i.bullets) children.push(new Paragraph({ text: b, bullet: { level: 0 } }));
      }
    } else if (section.type === "certifications") {
      children.push(new Paragraph({ text: "Certifications", heading: HeadingLevel.HEADING_1 }));
      for (const i of section.items)
        children.push(new Paragraph({ text: `${i.name}${i.issuer ? " — " + i.issuer : ""}`, bullet: { level: 0 } }));
    } else if (section.type === "custom") {
      children.push(new Paragraph({ text: section.heading, heading: HeadingLevel.HEADING_1 }));
      for (const i of section.items) children.push(new Paragraph({ text: i.text, bullet: { level: 0 } }));
    }
  }

  const doc = new Document({ sections: [{ children }] });
  return Packer.toBuffer(doc);
}

export async function exportRoutes(app: FastifyInstance) {
  app.post("/resumes/:id/export", async (req, reply) => {
    const { id } = req.params as { id: string };
    const format = ((req.query as any).format ?? "pdf") as "pdf" | "docx" | "html";

    const row = await prisma.resume.findUnique({ where: { id } });
    if (!row) return reply.code(404).send({ error: "not_found" });
    const resume = ResumeSchema.parse({ ...(row.data as object), id: row.id, userId: row.userId });

    if (format === "html") {
      reply.header("content-type", "text/html; charset=utf-8");
      return renderResumeHtml(resume);
    }
    if (format === "docx") {
      const buf = await renderDocx(resume);
      reply
        .header("content-type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
        .header("content-disposition", `attachment; filename="${resume.title}.docx"`);
      return reply.send(buf);
    }
    // pdf
    const html = renderResumeHtml(resume);
    try {
      const buf = await renderPdf(html);
      reply
        .header("content-type", "application/pdf")
        .header("content-disposition", `attachment; filename="${resume.title}.pdf"`);
      return reply.send(buf);
    } catch (e) {
      if (e instanceof PdfUnavailableError) {
        return reply.code(503).send({ error: "pdf_unavailable", detail: e.message });
      }
      throw e;
    }
  });
}
