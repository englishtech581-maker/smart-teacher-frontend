import React, { lazy, Suspense } from "react";

const ImportPanel = lazy(() => import("./ImportPanel.jsx"));

// A folded "Upload from Excel" section that can sit at the bottom of any tab.
export default function UploadBox({ type, extra, onDone, title = "Upload from an Excel or CSV file" }) {
  return (
    <details className="sta-upload sta-noprint" style={{ marginTop: 16 }}>
      <summary className="sta-linkbtn" style={{ cursor: "pointer", fontWeight: 600 }}>📤 {title}</summary>
      <Suspense fallback={<div className="sta-loading">Loading…</div>}>
        <ImportPanel type={type} extra={extra} onDone={onDone} />
      </Suspense>
    </details>
  );
}
