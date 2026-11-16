"use client";

import { startTransition, useActionState, useEffect, useState } from "react";
import { analyzePhoto, type AnalyzePhotoState } from "@/actions/repurpose";
import type { RepurposeAnalysis } from "@/lib/repurpose";
import { MAX_PHOTO_BYTES, photoSchema } from "@/lib/validation";

// Claude downsizes anything larger, so sending more pixels only costs upload time and tokens.
const MAX_EDGE_PX = 1568;

// Re-encode as a JPEG no larger than MAX_EDGE_PX on its long edge. Falls back to the original if the browser can't decode it.
async function downscale(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE_PX / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    if (!blob || blob.size > MAX_PHOTO_BYTES) return file;
    return new File([blob], "photo.jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

type PhotoAnalyzerProps = { onContinue: (analysis: RepurposeAnalysis) => void };

// Not a <form>: it sits inside the listing form, and its file input has no name so it is never submitted with the listing.
export default function PhotoAnalyzer({ onContinue }: PhotoAnalyzerProps) {
  const [state, analyzeAction, pending] = useActionState<AnalyzePhotoState, FormData>(analyzePhoto, {});
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function handleAnalyze() {
    if (!file) return;
    setPreparing(true);
    const upload = await downscale(file);
    setPreparing(false);
    const result = photoSchema.safeParse(upload);
    if (!result.success) {
      setClientError(result.error.issues[0].message);
      return;
    }
    setClientError(null);
    const formData = new FormData();
    formData.set("photo", upload);
    startTransition(() => analyzeAction(formData));
  }

  const error = clientError ?? ("error" in state ? state.error : null);
  const analysis = !clientError && "analysis" in state ? state.analysis : null;
  const busy = preparing || pending;

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="photo" className="block text-sm font-medium">
          Photo of the materials
        </label>
        <input
          id="photo"
          type="file"
          accept="image/*"
          capture="environment"
          aria-describedby="photo-hint photo-error"
          onChange={(event) => {
            setFile(event.target.files?.[0] ?? null);
            setClientError(null);
          }}
          className="mt-1 block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-emerald-50 file:px-3 file:py-2 file:font-medium file:text-emerald-800 hover:file:bg-emerald-100"
        />
        <p id="photo-hint" className="mt-1 text-sm text-gray-500">
          On a phone this opens the camera. The photo is only used for this check and is not saved.
        </p>
      </div>

      {previewUrl && (
        // A local object URL, so next/image adds nothing here.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={previewUrl} alt="Preview of your photo" className="max-h-60 rounded-md border border-gray-200" />
      )}

      <button
        type="button"
        onClick={handleAnalyze}
        disabled={!file || busy}
        className="rounded-md border border-emerald-700 px-4 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-50 disabled:opacity-50"
      >
        {busy ? "Analyzing…" : "Analyze photo"}
      </button>

      {error && (
        <p id="photo-error" className="text-sm text-red-600">
          {error}
        </p>
      )}

      {analysis && !busy && (
        <section aria-label="Repurposing advice" className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
          {analysis.notMaterials ? (
            <p className="text-sm text-gray-700">{analysis.summary}</p>
          ) : (
            <>
              <p
                className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${
                  analysis.repurposable ? "bg-emerald-100 text-emerald-900" : "bg-amber-100 text-amber-900"
                }`}
              >
                {analysis.repurposable ? "These can be repurposed" : "Probably not repurposable"}
              </p>
              <p className="text-sm text-gray-700">{analysis.summary}</p>

              <div>
                <h3 className="text-sm font-medium">What we found</h3>
                <ul className="mt-1 list-inside list-disc text-sm text-gray-700">
                  {analysis.objects.map((object, i) => (
                    <li key={i}>
                      {object.name} <span className="text-gray-500">({object.material})</span>
                    </li>
                  ))}
                </ul>
              </div>

              {analysis.ideas.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium">Ideas for repurposing</h3>
                  <ul className="mt-1 space-y-2 text-sm">
                    {analysis.ideas.map((idea, i) => (
                      <li key={i}>
                        <span className="font-medium">{idea.title}.</span>{" "}
                        <span className="text-gray-700">{idea.description}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-wrap gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => onContinue(analysis)}
                  className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
                >
                  Continue to listing
                </button>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
