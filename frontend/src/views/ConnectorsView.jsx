import React from "react";

export default function ConnectorsView({ t, lang }) {
  const isVi = lang === "vi";

  return (
    <section className="view active">
      <div className="section-label">{t.connectors_title}</div>
      <div className="section-sub">{t.connectors_sub}</div>

      {/* Pipeline Flow Strip */}
      <div className="flow-strip">
        <div className="flow-stage live">
          <div className="flow-icon">
            <i className="fa-solid fa-database text-[14px]"></i>
          </div>
          <div className="flow-stage-label">{isVi ? "Nguồn" : "Source"}</div>
        </div>
        <div className="flow-line"></div>
        <div className="flow-stage live">
          <div className="flow-icon">
            <i className="fa-solid fa-cloud-arrow-down text-[14px]"></i>
          </div>
          <div className="flow-stage-label">{isVi ? "Thu nạp" : "Ingestion"}</div>
        </div>
        <div className="flow-line"></div>
        <div className="flow-stage live">
          <div className="flow-icon">
            <i className="fa-solid fa-file-code text-[14px]"></i>
          </div>
          <div className="flow-stage-label">{isVi ? "Phân giải" : "Parsing"}</div>
        </div>
        <div className="flow-line"></div>
        <div className="flow-stage live">
          <div className="flow-icon">
            <i className="fa-solid fa-filter text-[14px]"></i>
          </div>
          <div className="flow-stage-label">{isVi ? "Trích xuất" : "Extraction"}</div>
        </div>
        <div className="flow-line"></div>
        <div className="flow-stage live">
          <div className="flow-icon">
            <i className="fa-solid fa-diagram-project text-[14px]"></i>
          </div>
          <div className="flow-stage-label">{isVi ? "Đồ thị Tri thức" : "Knowledge Graph"}</div>
        </div>
        <div className="flow-line"></div>
        <div className="flow-stage live">
          <div className="flow-icon">
            <i className="fa-solid fa-magnifying-glass text-[14px]"></i>
          </div>
          <div className="flow-stage-label">{isVi ? "Tìm kiếm AI" : "AI Search"}</div>
        </div>
      </div>

      <div className="connector-grid">
        <div className="conn-card">
          <div className="conn-head">
            <div className="conn-ic">
              <i className="fa-brands fa-google-drive" style={{ fontSize: "20px", color: "#34a853" }}></i>
            </div>
            <div>
              <div className="conn-name">Google Drive</div>
              <div className="conn-status"><span className="pulse-dot"></span>Connected · Continuous</div>
            </div>
          </div>
          <div className="conn-body">
            <div className="conn-stat"><div className="cs-label">Last sync</div><div className="cs-val">2 min ago</div></div>
            <div className="conn-stat"><div className="cs-label">Next sync</div><div className="cs-val">in 13 min</div></div>
            <div className="conn-stat"><div className="cs-label">Files processed</div><div className="cs-val">4,208</div></div>
            <div className="conn-stat"><div className="cs-label">Records extracted</div><div className="cs-val">18,930</div></div>
          </div>
          <div className="conn-foot"><span className="pill green">0 errors</span><span className="pill neutral">Mode: Continuous</span></div>
        </div>

        <div className="conn-card">
          <div className="conn-head">
            <div className="conn-ic">
              <i className="fa-solid fa-table text-green-500" style={{ fontSize: "20px" }}></i>
            </div>
            <div>
              <div className="conn-name">Google Sheets</div>
              <div className="conn-status"><span className="pulse-dot"></span>Connected · Continuous</div>
            </div>
          </div>
          <div className="conn-body">
            <div className="conn-stat"><div className="cs-label">Last sync</div><div className="cs-val">9 min ago</div></div>
            <div className="conn-stat"><div className="cs-label">Next sync</div><div className="cs-val">in 6 min</div></div>
            <div className="conn-stat"><div className="cs-label">Files processed</div><div className="cs-val">312</div></div>
            <div className="conn-stat"><div className="cs-label">Records extracted</div><div className="cs-val">52,104</div></div>
          </div>
          <div className="conn-foot"><span className="pill green">0 errors</span><span className="pill neutral">Mode: Continuous</span></div>
        </div>

        <div className="conn-card">
          <div className="conn-head">
            <div className="conn-ic">
              <i className="fa-solid fa-server" style={{ fontSize: "18px", color: "var(--cyan)" }}></i>
            </div>
            <div>
              <div className="conn-name">Local Agent — AEGIS</div>
              <div className="conn-status"><span className="pulse-dot" style={{ background: "var(--amber)" }}></span>3 machines online</div>
            </div>
          </div>
          <div className="conn-body">
            <div className="conn-stat"><div className="cs-label">Last heartbeat</div><div className="cs-val">14s ago</div></div>
            <div className="conn-stat"><div className="cs-label">Watched folders</div><div className="cs-val">11</div></div>
            <div className="conn-stat"><div className="cs-label">Files detected</div><div className="cs-val">86 / 24h</div></div>
            <div className="conn-stat"><div className="cs-label">Sync queue</div><div className="cs-val">4 pending</div></div>
          </div>
          <div className="conn-foot"><span className="pill amber">1 offline</span><span className="pill neutral">Mode: Real-time</span></div>
        </div>

        <div className="conn-card">
          <div className="conn-head">
            <div className="conn-ic">
              <i className="fa-solid fa-eye" style={{ fontSize: "18px", color: "var(--cyan)" }}></i>
            </div>
            <div>
              <div className="conn-name">File Watcher</div>
              <div className="conn-status"><span className="pulse-dot"></span>Active</div>
            </div>
          </div>
          <div className="conn-body">
            <div className="conn-stat"><div className="cs-label">Events today</div><div className="cs-val">212</div></div>
            <div className="conn-stat"><div className="cs-label">Auto-ingested</div><div className="cs-val">198</div></div>
            <div className="conn-stat"><div className="cs-label">Flagged for review</div><div className="cs-val">14</div></div>
            <div className="conn-stat"><div className="cs-label">Avg. latency</div><div className="cs-val">4.2s</div></div>
          </div>
          <div className="conn-foot"><span className="pill green">Healthy</span><span className="pill neutral">Mode: Watch</span></div>
        </div>
      </div>
    </section>
  );
}
