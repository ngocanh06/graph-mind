/* ============================================================
   GRAPH MIND (AEGIS EKMP) — CORE APPLICATION LOGIC
   Fullstack Client with Live Backend API Integration & Offline Fallback
   ============================================================ */

(function () {
  const API_BASE = "http://localhost:5000/api";

  // Application State
  const state = {
    lang: localStorage.getItem('aegis_lang') || 'en',
    theme: localStorage.getItem('aegis_theme') || 'light',
    role: 'executive',
    currentView: 'executive',
    selectedEntity: 'abc',
    pendingValidations: 7,
    isRailOpen: true,
    apiConnected: false
  };

  // View Titles Map
  const viewTitles = {
    executive: { en: ["Executive", "Enterprise Intelligence Overview"], vi: ["Tổng quan Lãnh đạo", "Toàn cảnh Trí tuệ Doanh nghiệp"] },
    copilot: { en: ["AI Copilot", "Knowledge Command Center"], vi: ["Trợ lý AI Copilot", "Trung tâm Chỉ huy Tri thức"] },
    knowledge: { en: ["Knowledge", "Entities, graph and human verification"], vi: ["Không gian Tri thức", "Đồ thị Thực thể & Xác thực Con người"] },
    search: { en: ["Smart Search", "Enterprise Knowledge Search"], vi: ["Tìm kiếm Thông minh", "Tìm kiếm Tri thức Doanh nghiệp"] },
    connectors: { en: ["Data Connectors", "Data Control Center"], vi: ["Kết nối Dữ liệu", "Trung tâm Điều khiển Dữ liệu"] },
    risk: { en: ["Risk Center", "Business Risk Observatory"], vi: ["Trung tâm Rủi ro", "Đài Quan sát Rủi ro Doanh nghiệp"] },
    documents: { en: ["Document Explorer", "Ingested files and extracted knowledge"], vi: ["Khám phá Tài liệu", "Tài liệu thu nạp & Tri thức trích xuất"] },
    reports: { en: ["Reports", "Executive Briefing generator"], vi: ["Báo cáo Chiến lược", "Tạo Báo cáo Tổng hợp Lãnh đạo"] },
    admin: { en: ["Administration", "Permissions, audit and AI operations"], vi: ["Quản trị Hệ thống", "Phân quyền, Audit & Chi phí LLMOps"] }
  };

  // DOM Elements Cache
  let dom = {};

  function initDOM() {
    dom = {
      html: document.documentElement,
      rail: document.getElementById('rail'),
      railToggle: document.getElementById('railToggle'),
      crumb: document.getElementById('crumb'),
      views: document.querySelectorAll('.view'),
      navItems: document.querySelectorAll('.nav-item'),
      langBtns: document.querySelectorAll('.btn-lang'),
      themeBtns: document.querySelectorAll('.btn-theme'),
      roleSelect: document.getElementById('roleSelect'),
      execEntityPanel: document.getElementById('execEntityPanel'),
      chatStream: document.getElementById('chatStream'),
      chatInput: document.getElementById('chatInput'),
      chatSend: document.getElementById('chatSend'),
      landingView: document.getElementById('landingView'),
      loginView: document.getElementById('loginView'),
      appContainer: document.getElementById('appContainer'),
      validationBadge: document.getElementById('validationBadge')
    };
  }

  // ---- BACKEND CONNECTIVITY CHECK ----
  async function checkBackendHealth() {
    try {
      const res = await fetch(`${API_BASE}/health`);
      if (res.ok) {
        state.apiConnected = true;
        const pulseLabel = document.querySelector('.kpulse-label');
        if (pulseLabel) {
          pulseLabel.innerHTML = `${state.lang === 'vi' ? '247 nguồn đã đồng bộ' : '247 sources synced'} · <b>API Live (:5000)</b>`;
        }
      }
    } catch (e) {
      state.apiConnected = false;
    }
  }

  // ---- THEME SWITCHER ----
  function switchTheme(newTheme) {
    state.theme = newTheme;
    localStorage.setItem('aegis_theme', newTheme);
    dom.html.setAttribute('data-theme', newTheme);
    dom.themeBtns.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-t') === newTheme);
    });
  }

  // ---- LANGUAGE SWITCHER ----
  function switchLang(newLang) {
    state.lang = newLang;
    localStorage.setItem('aegis_lang', newLang);
    const dict = window.AEGIS_I18N[newLang] || window.AEGIS_I18N.en;

    dom.langBtns.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-l') === newLang);
    });

    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (dict[key]) el.innerHTML = dict[key];
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (dict[key]) el.setAttribute('placeholder', dict[key]);
    });

    updateTopbarTitle();
    renderSelectedEntity(state.selectedEntity);
  }

  // ---- TOPBAR TITLE ----
  function updateTopbarTitle() {
    if (!dom.crumb) return;
    const tInfo = viewTitles[state.currentView];
    if (tInfo) {
      const langTitles = tInfo[state.lang] || tInfo.en;
      dom.crumb.innerHTML = `${langTitles[0]} <span class="crumb-sub">${langTitles[1]}</span>`;
    }
  }

  // ---- VIEW SWITCHER ----
  function switchView(viewName) {
    state.currentView = viewName;
    if (dom.landingView) dom.landingView.classList.remove('active');
    if (dom.loginView) dom.loginView.classList.remove('active');
    if (dom.appContainer) dom.appContainer.style.display = 'flex';

    dom.navItems.forEach(item => {
      item.classList.toggle('active', item.getAttribute('data-view') === viewName);
    });

    dom.views.forEach(view => {
      view.classList.remove('active');
    });

    const target = document.getElementById(`view-${viewName}`);
    if (target) {
      target.classList.add('active');
      target.scrollTop = 0;
    }

    updateTopbarTitle();
  }

  // ---- ROLE SWITCHER ----
  function switchRole(roleKey) {
    state.role = roleKey;
    const roleTitles = {
      executive: { en: "Executive · CFO", vi: "Lãnh đạo · Giám đốc Tài chính" },
      knowledge_manager: { en: "Knowledge Manager · Lead", vi: "Quản lý Tri thức · Trưởng nhóm" },
      it_admin: { en: "IT Administrator · SecOps", vi: "Quản trị viên IT · SecOps" },
      standard: { en: "Standard User · Sales Specialist", vi: "Người dùng · Chuyên viên Kinh doanh" }
    };
    const userRoleEl = document.getElementById('userRoleText');
    if (userRoleEl) {
      userRoleEl.textContent = (roleTitles[roleKey] && roleTitles[roleKey][state.lang]) || roleTitles[roleKey].en;
    }
  }

  // ---- ENTITY INSPECTOR ----
  function renderSelectedEntity(entityKey) {
    state.selectedEntity = entityKey;
    const ent = window.AEGIS_DATA.entities[entityKey];
    if (!ent) return;

    const isVi = state.lang === 'vi';

    document.querySelectorAll('.g-node').forEach(node => {
      const key = node.getAttribute('data-entity');
      node.classList.toggle('selected', key === entityKey);
    });

    if (dom.execEntityPanel) {
      const body = dom.execEntityPanel.querySelector('.entity-inspect');
      if (body) {
        body.innerHTML = `
          <div style="font-weight:700;color:var(--text-1);font-family:var(--f-display);font-size:14px;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;">
            ${ent.name}
            <span class="pill ${ent.verified ? 'green' : 'amber'}">${ent.status}</span>
          </div>
          <div style="margin-bottom:5px;font-size:12px;"><span style="color:var(--text-3);">${isVi ? 'Ngành nghề' : 'Industry'}:</span> <b>${ent.industry}</b></div>
          <div style="margin-bottom:5px;font-size:12px;"><span style="color:var(--text-3);">${isVi ? 'Liên hệ' : 'Contact'}:</span> <b>${ent.contact}</b></div>
          <div style="margin-bottom:5px;font-size:12px;"><span style="color:var(--text-3);">${isVi ? 'Doanh thu tích lũy' : 'Lifetime Revenue'}:</span> <b class="num">${ent.revenue}</b></div>
          <div style="margin-bottom:8px;font-size:12px;"><span style="color:var(--text-3);">${isVi ? 'Mức rủi ro' : 'Risk Level'}:</span> <b style="color:${ent.risk === 'Elevated' || ent.risk === 'High' ? 'var(--red)' : 'var(--green)'};">${ent.risk}</b></div>
          <div style="border-top:1px solid var(--border-soft);padding-top:8px;font-size:11.5px;color:var(--cyan);font-weight:600;cursor:pointer;" onclick="window.AEGIS_APP.switchView('knowledge')">
            → ${isVi ? 'Xem chi tiết trong Không gian Tri thức' : 'Inspect in Knowledge Workspace'}
          </div>
        `;
      }
    }

    const kwPanel = document.getElementById('kwEntityPanel');
    if (kwPanel) {
      kwPanel.innerHTML = `
        <div class="entity-head">
          <div class="entity-type">${ent.type}</div>
          <div class="entity-name">${ent.name}</div>
          <div class="entity-badges">
            <span class="pill ${ent.verified ? 'green' : 'amber'}">${ent.status}</span>
            <span class="pill ${ent.risk === 'Elevated' || ent.risk === 'High' ? 'red' : 'green'}">${isVi ? 'Rủi ro: ' : 'Risk: '}${ent.risk}</span>
          </div>
        </div>
        <div class="prop-row"><span class="p-key">${isVi ? 'Ngành nghề' : 'Industry'}</span><span class="p-val">${ent.industry}</span></div>
        <div class="prop-row"><span class="p-key">${isVi ? 'Liên hệ chính' : 'Primary Contact'}</span><span class="p-val">${ent.contact}</span></div>
        <div class="prop-row"><span class="p-key">${isVi ? 'Doanh thu tích lũy' : 'Lifetime Revenue'}</span><span class="p-val num">${ent.revenue}</span></div>
        <div class="prop-row"><span class="p-key">${isVi ? 'Số đơn hàng' : 'Order Count'}</span><span class="p-val num">${ent.ordersCount}</span></div>
        <div class="prop-row"><span class="p-key">${isVi ? 'Hợp đồng hiệu lực' : 'Active Contracts'}</span><span class="p-val num">${ent.activeContracts}</span></div>
        
        <div class="rel-block">
          <div class="rel-block-title">${isVi ? 'MỐI QUAN HỆ TRÍ TUỆ' : 'RELATIONSHIPS'}</div>
          ${ent.relationships.map(r => `
            <div class="rel-chain">
              <span class="rel-node">${ent.name}</span>
              <div class="rel-arrow">↓ ${r.rel} ${r.warning ? `<span class="pill amber" style="margin-left:4px">${isVi ? 'Cần duyệt' : 'Review'}</span>` : ''}</div>
              <span class="rel-node">${r.target}</span>
            </div>
          `).join('')}
        </div>

        <div class="entity-actions">
          <button class="btn">${isVi ? 'Sửa Nút' : 'Edit Node'}</button>
          <button class="btn">${isVi ? 'Thêm Quan hệ' : 'Add Relation'}</button>
          <button class="btn primary" onclick="window.AEGIS_APP.verifyEntity('${ent.id}')">${isVi ? 'Xác thực Trích xuất' : 'Verify Extraction'}</button>
        </div>
      `;
    }
  }

  // ---- COPILOT CHAT INTERACTION (LIVE BACKEND + FALLBACK) ----
  async function sendCopilotMessage(customText) {
    const inputVal = customText || (dom.chatInput ? dom.chatInput.value.trim() : "");
    if (!inputVal) return;

    if (dom.chatInput) dom.chatInput.value = "";

    const userMsg = document.createElement('div');
    userMsg.className = 'msg-user';
    userMsg.textContent = inputVal;
    dom.chatStream.appendChild(userMsg);

    const isVi = state.lang === 'vi';
    let qa = window.AEGIS_DATA.copilotQA['q-risk'];

    // Try fetching live reasoning from backend API
    try {
      const res = await fetch(`${API_BASE}/copilot/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: inputVal, lang: state.lang })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          qa = {
            intel_main_en: json.data.insight,
            intel_main_vi: json.data.insight,
            why_en: json.data.whyItMatters,
            why_vi: json.data.whyItMatters,
            evidence_chips: json.data.evidenceChips,
            confidence: json.data.confidenceScore,
            action_en: json.data.recommendedAction,
            action_vi: json.data.recommendedAction
          };
        }
      }
    } catch (e) {
      // Offline fallback already loaded
    }

    const intelCard = document.createElement('div');
    intelCard.className = 'intel-card';
    intelCard.innerHTML = `
      <div class="intel-head">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l2.5 6.5L21 11l-6.5 2.5L12 20l-2.5-6.5L3 11l6.5-2.5z"/></svg>
        <span class="it-label">${isVi ? 'PHÂN TÍCH & TRÍ TUỆ' : 'INSIGHT & REASONING'}</span>
        <span class="pill cyan" style="margin-left:auto;">${state.apiConnected ? 'API Live Engine' : 'Hybrid GraphRAG'}</span>
      </div>
      <div class="intel-body">
        <div class="intel-main">${isVi ? qa.intel_main_vi : qa.intel_main_en}</div>

        <div class="intel-block">
          <div class="intel-block-label">${isVi ? 'TẠI SAO ĐIỀU NÀY QUAN TRỌNG (WHY THIS MATTERS)' : 'WHY THIS MATTERS'}</div>
          <div class="intel-block-body">${isVi ? qa.why_vi : qa.why_en}</div>
        </div>

        <div class="intel-block">
          <div class="intel-block-label">${isVi ? 'BẰNG CHỨNG XÁC THỰC (EVIDENCE PROVENANCE)' : 'EVIDENCE'}</div>
          <div class="intel-block-body">
            ${qa.evidence_chips.map(c => `<span class="evid-chip" onclick="window.AEGIS_APP.inspectSource('${c.label}')">${c.label}</span>`).join('')}
          </div>
        </div>

        <div class="intel-block">
          <div class="intel-block-label">${isVi ? 'ĐỘ TIN CẬY CỦA AI (CONFIDENCE)' : 'CONFIDENCE'}</div>
          <div class="conf-row">
            <div class="conf-bar"><div class="conf-fill" style="width:${qa.confidence}%"></div></div>
            <span class="conf-pct">${qa.confidence}%</span>
          </div>
        </div>

        <div class="intel-block">
          <div class="intel-block-label">${isVi ? 'HÀNH ĐỘNG ĐỀ XUẤT (RECOMMENDED ACTION)' : 'RECOMMENDED ACTION'}</div>
          <div class="action-row">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v4M12 17h.01M10.3 3.9L2.9 17a2 2 0 001.7 3h14.8a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"/></svg>
            ${isVi ? qa.action_vi : qa.action_en}
          </div>
        </div>
      </div>
    `;

    dom.chatStream.appendChild(intelCard);
    dom.chatStream.scrollTop = dom.chatStream.scrollHeight;
  }

  // ---- VALIDATION QUEUE ACTION ----
  function handleValidation(id, action) {
    const item = document.getElementById(id);
    if (!item) return;

    if (action === 'verify') {
      item.style.borderLeft = '4px solid var(--green)';
      item.style.opacity = '0.5';
      setTimeout(() => item.remove(), 400);
    } else if (action === 'reject') {
      item.style.borderLeft = '4px solid var(--red)';
      item.style.opacity = '0.5';
      setTimeout(() => item.remove(), 400);
    }

    state.pendingValidations = Math.max(0, state.pendingValidations - 1);
    if (dom.validationBadge) {
      dom.validationBadge.textContent = `${state.pendingValidations} ${state.lang === 'vi' ? 'đang chờ' : 'pending'}`;
    }
  }

  // ---- GUIDED DEMO WALKTHROUGH ----
  function runDemoStep(stepNumber) {
    document.querySelectorAll('.demo-step-btn').forEach((btn, idx) => {
      btn.classList.toggle('active', idx + 1 === stepNumber);
    });

    switch (stepNumber) {
      case 1:
        switchView('executive');
        renderSelectedEntity('abc');
        break;
      case 2:
        switchView('copilot');
        sendCopilotMessage(state.lang === 'vi' 
          ? "Những khách hàng VIP nào đang có dấu hiệu sụt giảm tần suất mua hàng?" 
          : "Which VIP customers are showing signs of declining purchasing activity?");
        break;
      case 3:
        switchView('knowledge');
        renderSelectedEntity('abc');
        break;
      case 4:
        switchView('risk');
        break;
      case 5:
        switchView('reports');
        break;
    }
  }

  // Public Interface
  window.AEGIS_APP = {
    switchTheme,
    switchLang,
    switchView,
    switchRole,
    renderSelectedEntity,
    sendCopilotMessage,
    handleValidation,
    runDemoStep,
    verifyEntity: async (id) => {
      try {
        await fetch(`${API_BASE}/graph/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entityId: id, verified: true, auditor: "Dieu Hoang (CFO)" })
        });
      } catch (e) {}

      alert(state.lang === 'vi' ? `Đã xác thực thực thể ${id} thành công!` : `Entity ${id} successfully verified by human auditor!`);
      if (window.AEGIS_DATA.entities[id]) {
        window.AEGIS_DATA.entities[id].verified = true;
        window.AEGIS_DATA.entities[id].status = "Human Verified";
        renderSelectedEntity(id);
      }
    },
    inspectSource: (srcName) => {
      switchView('documents');
    },
    showLanding: () => {
      if (dom.appContainer) dom.appContainer.style.display = 'none';
      if (dom.loginView) dom.loginView.classList.remove('active');
      if (dom.landingView) dom.landingView.classList.add('active');
    },
    showLogin: () => {
      if (dom.appContainer) dom.appContainer.style.display = 'none';
      if (dom.landingView) dom.landingView.classList.remove('active');
      if (dom.loginView) dom.loginView.classList.add('active');
    },
    enterPlatform: () => {
      switchView('executive');
    }
  };

  // ---- INITIALIZATION ON DOM READY ----
  document.addEventListener('DOMContentLoaded', () => {
    initDOM();
    switchTheme(state.theme);
    switchLang(state.lang);
    checkBackendHealth();

    if (dom.railToggle && dom.rail) {
      dom.rail.classList.add('open');
      dom.railToggle.addEventListener('click', () => {
        dom.rail.classList.toggle('open');
      });
    }

    dom.navItems.forEach(item => {
      item.addEventListener('click', () => {
        const v = item.getAttribute('data-view');
        if (v) switchView(v);
      });
    });

    document.querySelectorAll('.g-node').forEach(node => {
      node.addEventListener('click', () => {
        const entId = node.getAttribute('data-entity') || 'abc';
        renderSelectedEntity(entId);
      });
    });

    if (dom.chatSend) {
      dom.chatSend.addEventListener('click', () => sendCopilotMessage());
    }
    if (dom.chatInput) {
      dom.chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') sendCopilotMessage();
      });
    }

    document.querySelectorAll('.suggest-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        sendCopilotMessage(chip.textContent);
      });
    });

    document.querySelectorAll('.admin-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
      });
    });

    renderSelectedEntity('abc');
  });
})();
