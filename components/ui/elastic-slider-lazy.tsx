"use client";

import { useEffect, useState, type ComponentType } from "react";
import type { ElasticSliderProps } from "./elastic-slider";
import "./elastic-slider.css";

// The real slider drags the whole motion lib (~45 KB gz) into any page that
// imports it eagerly. This wrapper code-splits it: a static, visually
// identical placeholder renders until the chunk arrives (a frame or two).
function SliderPlaceholder({
  defaultValue = 50,
  startingValue = 0,
  maxValue = 100,
  className = "",
  leftIcon = <>−</>,
  rightIcon = <>+</>,
  showValue = true,
}: ElasticSliderProps) {
  const pct = maxValue === startingValue ? 0 : ((defaultValue - startingValue) / (maxValue - startingValue)) * 100;
  return (
    <div className={`elastic-slider-container ${className}`}>
      <div className="elastic-slider-wrapper" style={{ opacity: 0.75 }}>
        <div className="elastic-slider-icon">{leftIcon}</div>
        <div className="elastic-slider-root">
          <div className="elastic-slider-track-wrapper" style={{ height: 6 }}>
            <div className="elastic-slider-track">
              <div className="elastic-slider-range" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>
        <div className="elastic-slider-icon">{rightIcon}</div>
      </div>
      {showValue && <p className="elastic-slider-value">{Math.round(defaultValue)}</p>}
    </div>
  );
}

let Loaded: ComponentType<ElasticSliderProps> | null = null;

export default function ElasticSlider(props: ElasticSliderProps) {
  const [Comp, setComp] = useState<ComponentType<ElasticSliderProps> | null>(() => Loaded);
  useEffect(() => {
    if (Comp) return;
    let alive = true;
    import("./elastic-slider").then(m => {
      Loaded = m.default;
      if (alive) setComp(() => m.default);
    });
    return () => { alive = false; };
  }, [Comp]);
  return Comp ? <Comp {...props} /> : <SliderPlaceholder {...props} />;
}
