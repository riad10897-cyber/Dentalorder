"use client";

import { categoryName } from "@/lib/products/categories";
import { PillStepper, type ExtraOption } from "./extras-section";
import { BottomSheet, SheetTitle, sheetPrimary } from "./bottom-sheet";

const MAX_QTY = 10;

/**
 * One extra, opened from the list: everything the seller wrote about it,
 * and the same stepper the list row has. Changes apply as they are made,
 * exactly like the row's stepper, so "Done" only closes. Swipe it down,
 * tap outside or tap Done: all three slide it away.
 */
export function ProductSheet({
  option,
  quantity,
  onChange,
  onClose,
}: {
  option: ExtraOption;
  quantity: number;
  onChange: (quantity: number) => void;
  onClose: () => void;
}) {
  const facts = [
    option.brand ? { label: "Brand", value: option.brand } : null,
    option.unit ? { label: "Pack size", value: option.unit } : null,
    { label: "Category", value: categoryName(option.category) },
  ].filter((f): f is { label: string; value: string } => f !== null);

  return (
    <BottomSheet
      label={option.name}
      onClose={onClose}
      zIndex="z-50"
      className="flex max-h-[85vh] flex-col"
      header={
        <SheetTitle
          title={option.name}
          subtitle={
            <span className="tnum">
              ${option.price.toFixed(2)}
              {option.unit ? ` · ${option.unit}` : " each"}
            </span>
          }
        />
      }
    >
      {(dismiss) => (
        <>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <p className={`mx-[1.375rem] mt-2 whitespace-pre-line ${option.description ? "text-native-body text-ink" : "text-list-secondary text-ink-faint"}`}>
              {option.description ?? "The seller hasn’t added a description."}
            </p>

            <dl className="mx-4 mt-2.5 overflow-hidden rounded-button bg-fill-faint">
              {facts.map((fact, i) => (
                <div
                  key={fact.label}
                  className={`flex justify-between gap-3 px-3.5 py-3 ${
                    i < facts.length - 1 ? "border-b-[0.5px] border-separator" : ""
                  }`}
                >
                  <dt className="text-list-secondary text-ink-faint">{fact.label}</dt>
                  <dd className="min-w-0 text-right text-list-secondary text-ink">{fact.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="mx-4 mt-2.5 flex shrink-0 items-center justify-between rounded-button bg-fill-faint px-3.5 py-3">
            <span className="text-native-body text-ink">In this order</span>
            <PillStepper
              name={option.name}
              value={quantity}
              onChange={(q) => onChange(Math.max(0, Math.min(MAX_QTY, q)))}
              max={MAX_QTY}
              height="h-9"
              surface="bg-card"
              countClass="text-native-body"
              buttonWidth="w-11"
            />
          </div>

          <div className="shrink-0 px-4 pt-4">
            <button type="button" onClick={dismiss} className={`${sheetPrimary} w-full`}>
              Done
            </button>
          </div>
        </>
      )}
    </BottomSheet>
  );
}
