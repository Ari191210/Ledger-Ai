"use client";

import { useEffect, useState } from "react";
import "./editorial-range.css";

export interface EditorialRangeProps {
  defaultValue?: number;
  startingValue?: number;
  maxValue?: number;
  className?: string;
  isStepped?: boolean;
  stepSize?: number;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onChange?: (value: number) => void;
  showValue?: boolean;
}

/**
 * Editorial range input — a native <input type="range"> styled as a flat,
 * financial-publication control. Replaces the former ElasticSlider (Framer
 * Motion overflow physics + hover scale), which violated Product Constitution
 * §4 (no attention-seeking interactions) and was pointer-only. Native range
 * gives full keyboard + a11y support for free.
 */
export default function EditorialRange({
  defaultValue = 50,
  startingValue = 0,
  maxValue = 100,
  className = "",
  isStepped = false,
  stepSize = 1,
  leftIcon = <>−</>,
  rightIcon = <>+</>,
  onChange,
  showValue = true,
}: EditorialRangeProps) {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);

  const pct =
    maxValue === startingValue
      ? 0
      : ((value - startingValue) / (maxValue - startingValue)) * 100;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = Number(e.target.value);
    setValue(v);
    onChange?.(v);
  }

  return (
    <div className={`erange ${className}`}>
      {leftIcon != null && (
        <span className="erange-icon" aria-hidden="true">
          {leftIcon}
        </span>
      )}
      <input
        type="range"
        className="erange-input"
        min={startingValue}
        max={maxValue}
        step={isStepped ? stepSize : "any"}
        value={value}
        onChange={handleChange}
        style={{ ["--erange-pct" as string]: `${pct}%` }}
      />
      {rightIcon != null && (
        <span className="erange-icon" aria-hidden="true">
          {rightIcon}
        </span>
      )}
      {showValue && <span className="erange-value">{Math.round(value)}</span>}
    </div>
  );
}
