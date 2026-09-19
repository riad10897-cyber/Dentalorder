"use client";

import type { DirectoryRep } from "@/lib/reps/directory";
import { groupRepsByUniversity } from "@/lib/reps/group";

const HEADING = "px-0.5 pb-1.5 pt-1 text-micro uppercase text-ink-faint";

export function RepList({
  reps,
  university,
  value,
  onChange,
}: {
  reps: DirectoryRep[];
  university: string | null;
  value: string;
  onChange: (repId: string) => void;
}) {
  const { mine, others, grouped } = groupRepsByUniversity(reps, university);

  return (
    <div
      role="radiogroup"
      aria-label="Representative"
      className="flex flex-col rounded-card border border-rule bg-card p-2"
    >
      {grouped ? (
        <>
          <p className={HEADING}>{university}</p>
          {mine.length > 0 ? (
            mine.map((rep) => (
              <RepRow
                key={rep.id}
                rep={rep}
                showUniversity={false}
                selected={value === rep.id}
                onSelect={onChange}
              />
            ))
          ) : (
            <p className="px-2.5 py-2 text-caption text-ink-muted">
              No rep from {university} has joined yet. Pick one from another faculty below — you
              can change this later.
            </p>
          )}

          {others.length > 0 && (
            <>
              <p className={`${HEADING} mt-2 border-t border-hairline pt-3`}>Other faculties</p>
              {others.map((rep) => (
                <RepRow
                  key={rep.id}
                  rep={rep}
                  showUniversity
                  selected={value === rep.id}
                  onSelect={onChange}
                />
              ))}
            </>
          )}
        </>
      ) : (
        others.map((rep) => (
          <RepRow
            key={rep.id}
            rep={rep}
            showUniversity
            selected={value === rep.id}
            onSelect={onChange}
          />
        ))
      )}
    </div>
  );
}

function RepRow({
  rep,
  showUniversity,
  selected,
  onSelect,
}: {
  rep: DirectoryRep;
  showUniversity: boolean;
  selected: boolean;
  onSelect: (repId: string) => void;
}) {
  const meta = [showUniversity ? rep.university : null, rep.section].filter(Boolean).join(" · ");

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={() => onSelect(rep.id)}
      className={`pressable flex min-h-11 items-center gap-3 rounded-control px-2.5 py-2 text-left ${
        selected ? "bg-card-sunk" : ""
      }`}
    >
      <span
        aria-hidden
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
          selected ? "border-ink bg-ink" : "border-rule"
        }`}
      >
        {selected && <span className="h-1.5 w-1.5 rounded-full bg-card" />}
      </span>
      <span className="min-w-0">
        <span className="block truncate font-display text-body text-ink">{rep.displayName}</span>
        {meta && <span className="block truncate text-caption text-ink-muted">{meta}</span>}
      </span>
    </button>
  );
}
