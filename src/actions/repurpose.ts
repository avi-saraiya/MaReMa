"use server";

import Anthropic from "@anthropic-ai/sdk";
import { analyzeMaterialsPhoto, type AnalysisResult } from "@/lib/repurpose";
import { requireUser } from "@/lib/session";
import { photoSchema, type PhotoMediaType } from "@/lib/validation";

export type AnalyzePhotoState = AnalysisResult | Record<string, never>;

// Sends the photo to Claude and returns the repurposing advice. The photo is never stored.
export async function analyzePhoto(_prev: AnalyzePhotoState, formData: FormData): Promise<AnalyzePhotoState> {
  await requireUser();

  const parsed = photoSchema.safeParse(formData.get("photo"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const file = parsed.data;
  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");

  try {
    return await analyzeMaterialsPhoto(base64, file.type as PhotoMediaType);
  } catch (error) {
    // Most specific first: retryable rate limits, then other API errors, then config or network errors.
    if (error instanceof Anthropic.RateLimitError) {
      return { error: "The photo checker is busy right now. Please try again in a minute." };
    }
    if (error instanceof Anthropic.AuthenticationError) {
      console.error("analyzePhoto: Anthropic authentication failed", error.message);
      return { error: "The photo checker isn't set up yet. You can still create your listing." };
    }
    if (error instanceof Anthropic.APIError) {
      console.error(`analyzePhoto: Anthropic API error ${error.status}`, error.message);
      return { error: "The photo couldn't be analyzed. Please try again." };
    }
    console.error("analyzePhoto: unexpected error", error);
    return { error: "The photo checker isn't available right now. You can still create your listing." };
  }
}
