import React from "react";

export default function DemoBanner({ currentStep, onStepClick, t }) {
  return (
    <div className="demo-banner">
      <div className="demo-banner-left">
        <div className="icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
        </div>
        <div className="demo-banner-text">
          <strong>{t.demo_tour_title}</strong>
          <div style={{ fontSize: "11px", color: "var(--text-3)" }}>
            Fullstack React + Python FastAPI Reasoning Flow
          </div>
        </div>
      </div>
      <div className="demo-steps">
        <button
          className={`demo-step-btn ${currentStep === 1 ? "active" : ""}`}
          onClick={() => onStepClick(1)}
        >
          1. Executive
        </button>
        <button
          className={`demo-step-btn ${currentStep === 2 ? "active" : ""}`}
          onClick={() => onStepClick(2)}
        >
          2. Ask Copilot
        </button>
        <button
          className={`demo-step-btn ${currentStep === 3 ? "active" : ""}`}
          onClick={() => onStepClick(3)}
        >
          3. Graph & Validate
        </button>
        <button
          className={`demo-step-btn ${currentStep === 4 ? "active" : ""}`}
          onClick={() => onStepClick(4)}
        >
          4. Risk Center
        </button>
        <button
          className={`demo-step-btn ${currentStep === 5 ? "active" : ""}`}
          onClick={() => onStepClick(5)}
        >
          5. Executive Briefing
        </button>
      </div>
    </div>
  );
}
