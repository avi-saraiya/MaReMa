import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
// The SDK's structured-output helper is built on Zod 4, which zod 3.25 ships under this subpath.
import { z } from "zod/v4";
import type { PhotoMediaType } from "@/lib/validation";

export const ANALYSIS_MODEL = "claude-opus-5-5";

// The shape Claude must return. Structured outputs guarantee the response matches it.
export const repurposeAnalysisSchema = z.object({
  notMaterials: z
    .boolean()
    .describe("True if the photo does not show physical materials or objects someone could give away."),
  objects: z
    .array(
      z.object({
        name: z.string().describe("Short name of the object, e.g. 'Plywood sheets'."),
        material: z.string().describe("What it is mainly made of, e.g. 'wood', 'glass', 'PET plastic'."),
      }),
    )
    .describe("Each distinct kind of object visible in the photo."),
  repurposable: z.boolean().describe("Whether the materials can realistically be repurposed."),
  summary: z.string().describe("Two or three sentences explaining the verdict."),
  ideas: z
    .array(
      z.object({
        title: z.string().describe("A short name for the idea."),
        description: z.string().describe("One to three sentences on how to do it."),
      }),
    )
    .describe("Practical repurposing ideas. Empty when the materials are not repurposable."),
  suggestedTitle: z.string().describe("A short listing title for these materials, at most 80 characters."),
});

export type RepurposeAnalysis = z.infer<typeof repurposeAnalysisSchema>;

const SYSTEM_PROMPT = `You help members of a university reusable-materials exchange. A member has photographed materials they are thinking of giving away or selling on the exchange.

Identify each kind of object in the photo and what it is made of. Then decide whether the materials can realistically be repurposed by a student or staff member, and if so suggest up to five practical ideas that suit campus life: dorm rooms, labs, studios, student clubs, events and teaching. Prefer ideas that need common tools and little skill. Be honest: if the items are damaged, contaminated, hazardous or too generic to reuse creatively, say they are not repurposable and leave the ideas empty. Mention safety concerns (sharp edges, chemicals, electrical parts) in the summary when they apply.

If the photo does not show materials or objects (for example a person, a screenshot or a landscape), set notMaterials to true, leave objects and ideas empty, and explain briefly in the summary.`;

// Capped to match the listing form's limits (20 materials, 100 characters each, 100-character title).
export function normalizeAnalysis(analysis: RepurposeAnalysis): RepurposeAnalysis {
  return {
    ...analysis,
    objects: analysis.objects.slice(0, 20).map((o) => ({ name: o.name.slice(0, 100), material: o.material })),
    ideas: analysis.repurposable ? analysis.ideas.slice(0, 5) : [],
    suggestedTitle: analysis.suggestedTitle.slice(0, 100),
  };
}

// Canned result so e2e tests never call the real API.
const FAKE_ANALYSIS: RepurposeAnalysis = {
  notMaterials: false,
  objects: [
    { name: "Cardboard boxes", material: "corrugated cardboard" },
    { name: "Glass jars", material: "glass" },
  ],
  repurposable: true,
  summary: "Clean cardboard boxes and glass jars are easy to reuse.",
  ideas: [
    { title: "Desk organizer", description: "Cut the boxes down into trays for a dorm desk." },
    { title: "Lab sample storage", description: "Use the jars to store dry samples or small parts." },
  ],
  suggestedTitle: "Cardboard boxes and glass jars",
};

export type AnalysisResult = { analysis: RepurposeAnalysis } | { error: string };

let client: Anthropic | undefined;

export async function analyzeMaterialsPhoto(base64: string, mediaType: PhotoMediaType): Promise<AnalysisResult> {
  if (process.env.MAREMA_FAKE_AI === "1") return { analysis: FAKE_ANALYSIS };

  client ??= new Anthropic();
  const message = await client.beta.messages.parse({
    model: ANALYSIS_MODEL,
    max_tokens: 16000,
    // On a safety decline, the API retries on a fallback model it picks for the decline's category.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format: betaZodOutputFormat(repurposeAnalysisSchema) },
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
          { type: "text", text: "Here are the materials. Can they be repurposed?" },
        ],
      },
    ],
  });

  if (message.stop_reason === "refusal") {
    return { error: "This photo couldn't be analyzed. Try a different photo of the materials." };
  }
  if (message.stop_reason === "max_tokens" || !message.parsed_output) {
    return { error: "The analysis didn't finish. Please try again." };
  }
  return { analysis: normalizeAnalysis(message.parsed_output) };
}
