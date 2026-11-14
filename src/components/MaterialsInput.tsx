"use client";

import { useRef, useState } from "react";

type MaterialsInputProps = { inputClassName: string; describedBy?: string };

// Uncontrolled inputs that all submit under the "materials" key; rows are tracked by id so removal keeps values intact.
export default function MaterialsInput({ inputClassName, describedBy }: MaterialsInputProps) {
  const nextId = useRef(1);
  const [rows, setRows] = useState<number[]>([0]);

  return (
    <div className="space-y-2">
      {rows.map((id, index) => (
        <div key={id} className="flex gap-2">
          <input
            name="materials"
            type="text"
            maxLength={100}
            aria-label={`Material ${index + 1}`}
            aria-describedby={describedBy}
            placeholder={index === 0 ? "e.g. Plywood sheets" : undefined}
            className={inputClassName}
          />
          {rows.length > 1 && (
            <button
              type="button"
              onClick={() => setRows((r) => r.filter((rowId) => rowId !== id))}
              aria-label={`Remove material ${index + 1}`}
              className="rounded-md border border-gray-300 px-3 text-gray-600 hover:bg-gray-100"
            >
              ✕
            </button>
          )}
        </div>
      ))}
      {rows.length < 20 && (
        <button
          type="button"
          onClick={() => setRows((r) => [...r, nextId.current++])}
          className="text-sm font-medium text-emerald-700 hover:text-emerald-900"
        >
          + Add another material
        </button>
      )}
    </div>
  );
}
