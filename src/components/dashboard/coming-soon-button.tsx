"use client";

import { useState, type ReactNode } from "react";

// Wraps a button whose backend isn't built yet (video recording needs
// MediaRecorder + R2 upload, file upload needs R2) so it's an honest,
// responsive affordance instead of a dead or fully-disabled control.
export function ComingSoonButton({
  children,
  className,
  label,
}: {
  children: ReactNode;
  className?: string;
  label: string;
}) {
  const [showTooltip, setShowTooltip] = useState(false);

  function handleClick() {
    setShowTooltip(true);
    setTimeout(() => setShowTooltip(false), 1800);
  }

  return (
    <div className="relative inline-flex">
      <button type="button" onClick={handleClick} className={className} aria-label={label}>
        {children}
      </button>
      {showTooltip && (
        <span
          className="absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium text-white shadow-lg"
          style={{ background: "#1E2A3B" }}
          role="status"
        >
          Coming soon
        </span>
      )}
    </div>
  );
}
