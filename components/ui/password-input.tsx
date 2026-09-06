"use client";

import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

/**
 * A password field with a reveal toggle.
 *
 * Every password input in the product goes through this, so the toggle cannot
 * be present on one screen and missing on the next. Each field keeps its own
 * reveal state: on the change-password form, showing what you are typing into
 * "new password" is not a reason to expose the current one.
 */
export function PasswordInput({
  label,
  labelAction,
  className,
  ...props
}: Omit<React.ComponentProps<"input">, "type"> & {
  label: string;
  /** Rendered on the label row, e.g. the "forgot?" link on sign-in. */
  labelAction?: React.ReactNode;
}) {
  const [shown, setShown] = useState(false);
  const id = useId();
  const Icon = shown ? EyeOff : Eye;

  return (
    <div className={className}>
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="u-label">
          {label}
        </label>
        {labelAction}
      </div>

      <div className="relative mt-1.5">
        <input
          {...props}
          id={id}
          type={shown ? "text" : "password"}
          className="w-full rounded-md border border-border-2 bg-surface-2 py-2 pl-3 pr-11 text-sm text-text outline-none focus:border-accent"
        />
        {/* type="button" is load-bearing: a bare button inside a form defaults
            to submit, so tapping reveal would try to sign you in. */}
        <button
          type="button"
          onClick={() => setShown((s) => !s)}
          aria-label={shown ? "Hide password" : "Show password"}
          aria-pressed={shown}
          aria-controls={id}
          className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-md text-text-3 outline-none hover:text-text focus-visible:text-text"
        >
          <Icon size={15} aria-hidden />
        </button>
      </div>
    </div>
  );
}
