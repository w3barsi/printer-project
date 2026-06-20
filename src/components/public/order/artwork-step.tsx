import { CheckCircle2Icon, FileUpIcon, ShoppingBagIcon } from "lucide-react";

import { ARTWORK_OPTIONS } from "@/lib/public-order";

import { Field } from "./field";
import type { ItemDraft } from "./types";
import {
  acceptedUploadExtensions,
  artworkDescription,
  artworkLabel,
  inputClassName,
} from "./utils";

export function ArtworkStep({
  draft,
  files,
  updateDraft,
  onFilesChange,
  onBack,
  onAdd,
}: {
  draft: ItemDraft;
  files: File[];
  updateDraft: (patch: Partial<ItemDraft>) => void;
  onFilesChange: (files: FileList | null) => void;
  onBack: () => void;
  onAdd: () => void;
}) {
  return (
    <section className="rounded-[2rem] border border-(--shop-line) bg-(--shop-panel) p-6 shadow-[0_18px_50px_rgba(139,39,32,0.07)] md:p-8">
      <h2 className="shop-font-display text-4xl">Artwork handling</h2>
      <p className="mt-3 text-sm leading-relaxed text-(--shop-ink-dim)">
        Tell us whether you have print-ready files or need layout help. Design fees are
        quoted separately by staff.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {ARTWORK_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            className={`rounded-[1.5rem] border p-5 text-left transition ${draft.artworkOption === option ? "border-(--shop-red) bg-[#ffe5df]" : "border-(--shop-line) bg-white/60 hover:bg-white"}`}
            onClick={() => updateDraft({ artworkOption: option })}
          >
            <CheckCircle2Icon className="size-5 text-(--shop-red)" />
            <h3 className="shop-font-wide mt-4 text-sm font-black uppercase">
              {artworkLabel(option)}
            </h3>
            <p className="mt-2 text-sm text-(--shop-ink-dim)">
              {artworkDescription(option)}
            </p>
          </button>
        ))}
      </div>

      {draft.artworkOption === "upload-now" ? (
        <div className="mt-6 rounded-[1.5rem] border border-dashed border-(--shop-line-2) bg-white/50 p-6">
          <label className="flex cursor-pointer flex-col items-center justify-center gap-3 text-center">
            <FileUpIcon className="size-8 text-(--shop-red)" />
            <span className="font-black">Choose artwork files</span>
            <span className="text-sm text-(--shop-ink-dim)">
              PDF, JPG, PNG, or WEBP. Up to 5 files, 25 MB each.
            </span>
            <input
              className="sr-only"
              type="file"
              multiple
              accept={acceptedUploadExtensions}
              onChange={(event) => onFilesChange(event.target.files)}
            />
          </label>
          {files.length ? (
            <ul className="mt-4 space-y-2 text-sm font-semibold text-(--shop-ink-dim)">
              {files.map((file) => (
                <li key={`${file.name}-${file.size}`}>{file.name}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {draft.artworkOption === "design-requested" ? (
        <Field label="Design instructions" className="mt-6">
          <textarea
            className={`${inputClassName} min-h-32 resize-y`}
            value={draft.designInstructions}
            onChange={(event) => updateDraft({ designInstructions: event.target.value })}
            placeholder="Example: grand opening banner, red and gold, include logo and phone number..."
          />
        </Field>
      ) : null}

      <div className="mt-7 flex flex-wrap gap-3">
        <button
          type="button"
          className="shop-btn shop-btn-ghost !rounded-full"
          onClick={onBack}
        >
          Back
        </button>
        <button
          type="button"
          className="shop-btn shop-btn-primary !rounded-full"
          onClick={onAdd}
        >
          {draft.editingId ? "Update cart item" : "Add to cart"}{" "}
          <ShoppingBagIcon className="size-4" />
        </button>
      </div>
    </section>
  );
}
