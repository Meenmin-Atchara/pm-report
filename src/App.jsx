import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";

// ---------------------------------------------------------------------------
// Thai official public holidays 2026 (พ.ศ. 2569)
// ---------------------------------------------------------------------------
const TH_HOLIDAYS = {
  "2026-01-01": "วันขึ้นปีใหม่",
  "2026-01-02": "วันหยุดราชการกรณีพิเศษ",
  "2026-03-03": "วันมาฆบูชา",
  "2026-04-06": "วันจักรี",
  "2026-04-13": "วันสงกรานต์",
  "2026-04-14": "วันสงกรานต์",
  "2026-04-15": "วันสงกรานต์",
  "2026-05-01": "วันแรงงานแห่งชาติ",
  "2026-05-04": "วันฉัตรมงคล",
  "2026-05-13": "วันพืชมงคล",
  "2026-05-31": "วันวิสาขบูชา",
  "2026-06-01": "ชดเชยวันวิสาขบูชา",
  "2026-06-03": "วันเฉลิมฯ พระบรมราชินี",
  "2026-07-28": "วันเฉลิมฯ ร.10",
  "2026-07-29": "วันอาสาฬหบูชา",
  "2026-07-30": "วันเข้าพรรษา",
  "2026-08-12": "วันแม่แห่งชาติ",
  "2026-10-13": "วันคล้ายวันสวรรคต ร.9",
  "2026-10-16": "วันหยุดราชการกรณีพิเศษ",
  "2026-10-23": "วันปิยมหาราช",
  "2026-12-05": "วันพ่อแห่งชาติ",
  "2026-12-07": "ชดเชยวันพ่อแห่งชาติ",
  "2026-12-10": "วันรัฐธรรมนูญ",
  "2026-12-31": "วันสิ้นปี",
};

const KNOWN_ISSUES = [
  {
    code: "Alarm 25217: Switch to X axis",
    scope: "SHU01 / SHU02",
    cause: "เครื่องจักรจอดคลาดเคลื่อนจากตำแหน่ง ทำให้เซ็นเซอร์เช็ค 4 มุมทำงานไม่ครบ",
    fix: "Manual เครื่องจักรให้เซ็นเซอร์ตรวจจับทำงานครบทั้ง 4 มุม",
  },
  {
    code: "Alarm 25311: Encoder position lost",
    scope: "SHU01 / SHU02",
    cause: "สายสัญญาณ Encoder หลวมหรือหลุดจากจุดต่อ",
    fix: "ตรวจสอบและขันสายสัญญาณ Encoder ให้แน่น รีเซ็ตตำแหน่งศูนย์ใหม่",
  },
  {
    code: "Alarm 30104: Motor overload",
    scope: "Shuttle Rack",
    cause: "โหลดน้ำหนักเกินพิกัด หรือมอเตอร์ทำงานต่อเนื่องเกินรอบพัก",
    fix: "ลดน้ำหนักบรรทุกให้อยู่ในพิกัด พักเครื่องให้มอเตอร์เย็นก่อนใช้งานต่อ",
  },
];

const SITE_OPTIONS = ["ทองไทย", "AMW KK", "Cfot", "อื่นๆ"];
const STEPS = ["ข้อมูลงาน", "งานที่ทำ", "ปัญหาที่พบ", "รูปภาพ", "สรุป & ส่งออก"];
const WEEKDAYS_TH = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
const MONTHS_TH = [
  "มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน",
  "กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม",
];

const uid = () => Math.random().toString(36).slice(2, 9);
const pad2 = (n) => String(n).padStart(2, "0");
const toISO = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const nowStr = () => { const d = new Date(); return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };
const todayISO = () => toISO(new Date());

function thaiDateLabel(iso) {
  if (!iso) return "-";
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS_TH[m - 1]} ${y + 543}`;
}
function thaiDateShort(iso) {
  if (!iso) return "-";
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS_TH[m - 1].slice(0, 3)} ${String(y + 543).slice(-2)}`;
}

function emptyForm(dateISO) {
  return {
    site: "", siteCustom: "", date: dateISO, timeIn: nowStr(), timeOut: "",
    techs: [], techInput: "", tasks: [{ id: uid(), text: "" }], issues: [], photos: [],
  };
}

function buildSummaryText(form) {
  const siteLabel = form.site === "อื่นๆ" ? form.siteCustom : form.site;
  const lines = [];
  lines.push(`${siteLabel || "-"} ${thaiDateLabel(form.date)}`);
  if (form.techs?.length) lines.push(form.techs.join(", "));
  lines.push("");
  lines.push(`${form.timeIn || "--:--"}-${form.timeOut || "--:--"}`);
  lines.push("");
  (form.tasks || []).filter((t) => t.text.trim()).forEach((t) => lines.push(`-${t.text.trim()}`));
  (form.issues || []).forEach((i) => {
    lines.push(`-${i.scope ? i.scope + "  " : ""}${i.code}`);
    if (i.cause) lines.push(`*สาเหตุ : ${i.cause}`);
    if (i.fix) lines.push(`*แก้ไข : ${i.fix}`);
  });
  return lines.join("\n");
}
function siteLabelOf(form) { return form.site === "อื่นๆ" ? form.siteCustom : form.site; }

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------
async function getDraft(dateISO) {
  try { const res = await window.storage.get(`draft:${dateISO}`, false); return res ? JSON.parse(res.value) : null; }
  catch { return null; }
}
async function setDraftStore(dateISO, form) {
  try { await window.storage.set(`draft:${dateISO}`, JSON.stringify(form), false); } catch {}
}
async function deleteDraft(dateISO) {
  try { await window.storage.delete(`draft:${dateISO}`, false); } catch {}
}
async function getAllDrafts() {
  try {
    const res = await window.storage.list("draft:", false);
    const keys = res?.keys || [];
    const items = await Promise.all(keys.map(async (k) => {
      try { const r = await window.storage.get(k, false); return r ? { date: k.replace("draft:", ""), form: JSON.parse(r.value) } : null; }
      catch { return null; }
    }));
    return items.filter(Boolean).sort((a, b) => (a.date < b.date ? 1 : -1));
  } catch { return []; }
}
async function saveReport(form, existingId, originalDate) {
  const id = existingId || uid();
  // If the date was changed while editing, the storage key (which embeds the
  // date) must move — delete the old key so we don't leave a stale copy behind.
  if (existingId && originalDate && originalDate !== form.date) {
    try { await window.storage.delete(`report:${originalDate}:${existingId}`, true); } catch {}
  }
  const key = `report:${form.date}:${id}`;
  const payload = { ...form, id, finalizedAt: new Date().toISOString() };
  try { await window.storage.set(key, JSON.stringify(payload), true); } catch {}
  return payload;
}
async function deleteReport(dateISO, id) {
  try { await window.storage.delete(`report:${dateISO}:${id}`, true); } catch {}
}
async function listReportKeys() {
  try { const res = await window.storage.list("report:", true); return res?.keys || []; } catch { return []; }
}
async function getReportsForDate(dateISO) {
  try {
    const res = await window.storage.list(`report:${dateISO}:`, true);
    const keys = res?.keys || [];
    const items = await Promise.all(keys.map(async (k) => {
      try { const r = await window.storage.get(k, true); return r ? JSON.parse(r.value) : null; } catch { return null; }
    }));
    return items.filter(Boolean).sort((a, b) => (a.finalizedAt < b.finalizedAt ? 1 : -1));
  } catch { return []; }
}
async function getAllReports() {
  const keys = await listReportKeys();
  const items = await Promise.all(keys.map(async (k) => {
    try { const r = await window.storage.get(k, true); return r ? JSON.parse(r.value) : null; } catch { return null; }
  }));
  return items.filter(Boolean).sort((a, b) => (a.finalizedAt < b.finalizedAt ? 1 : -1));
}

// ---------------------------------------------------------------------------
// Icons (simple inline SVG, matches the industrial/amber accent look)
// ---------------------------------------------------------------------------
const Icon = {
  Calendar: (p) => (
    <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  ),
  History: (p) => (
    <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M4 6h16M4 12h16M4 18h10" />
    </svg>
  ),
  Draft: (p) => (
    <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M14 3l7 7-11 11H3v-7L14 3z" />
    </svg>
  ),
  Plus: (p) => (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.2" {...p}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  Sun: (p) => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.4 1.4M17.6 17.6L19 19M19 5l-1.4 1.4M6.4 17.6L5 19" />
    </svg>
  ),
  Moon: (p) => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
    </svg>
  ),
  Trash: (p) => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M4 7h16M9 7V4.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1V7M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  ),
  Edit: (p) => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  ),
  Camera: (p) => (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M4 8h3l1.6-2.4A1 1 0 0 1 9.4 5h5.2a1 1 0 0 1 .8.6L17 8h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
      <circle cx="12" cy="13.5" r="3.3" />
    </svg>
  ),
  Gallery: (p) => (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <rect x="3" y="4" width="18" height="15" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.6" />
      <path d="M21 15l-5.5-5-9.5 8" />
    </svg>
  ),
};

const LOGO = () => (
  <span className="logoWrap">
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M6 2.5h7.5l4.5 4.5v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-17a1 1 0 0 1 1-1z" />
      <path d="M13.5 2.5v4.5H18" />
      <path d="M8 11.5h7M8 15h7M8 18.5h4" />
    </svg>
    <svg viewBox="0 0 24 24" width="13" height="13" className="logoWrench">
      <circle cx="12" cy="12" r="11" fill="var(--amber)" />
      <path d="M17.4 8.3a3.4 3.4 0 0 1-4.5 4.5l-3.8 3.8a1.15 1.15 0 0 1-1.6-1.6l3.8-3.8a3.4 3.4 0 0 1 4.5-4.5l-2.1 2.1 1.1 1.1 2.1-2.1c.2.2.4.3.5.5z" fill="#20220a" />
    </svg>
  </span>
);

export default function PMFieldReport() {
  const [tab, setTab] = useState("calendar"); // calendar | history | drafts
  const [stack, setStack] = useState(null); // { screen: 'daylist'|'form'|'viewreport', ... }
  const [viewMonth, setViewMonth] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [reportDates, setReportDates] = useState({});
  const [draftDates, setDraftDates] = useState({});
  const [toast, setToast] = useState(null);
  const [printPayload, setPrintPayload] = useState(null);
  const [theme, setTheme] = useState("dark");

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2600); };

  useEffect(() => {
    window.storage.get("theme", false).then((r) => { if (r?.value) setTheme(r.value); }).catch(() => {});
  }, []);
  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    window.storage.set("theme", next, false).catch(() => {});
  }

  const refreshIndex = useCallback(async () => {
    const keys = await listReportKeys();
    const counts = {};
    keys.forEach((k) => { const d = k.split(":")[1]; counts[d] = (counts[d] || 0) + 1; });
    setReportDates(counts);
    const drafts = await getAllDrafts();
    const dmap = {};
    drafts.forEach((d) => (dmap[d.date] = true));
    setDraftDates(dmap);
  }, []);

  useEffect(() => { refreshIndex(); }, [refreshIndex]);
  useEffect(() => {
    if (printPayload) { const t = setTimeout(() => window.print(), 80); return () => clearTimeout(t); }
  }, [printPayload]);

  async function openDay(iso) {
    setStack({ screen: "daylist", date: iso, loading: true, reports: [], draft: null });
    const [reports, draft] = await Promise.all([getReportsForDate(iso), getDraft(iso)]);
    setStack({ screen: "daylist", date: iso, loading: false, reports, draft });
  }
  function openForm(iso, draft, editingReport) { setStack({ screen: "form", date: iso, draft, editingReport }); }
  function openEditReport(report) { setStack({ screen: "form", date: report.date, draft: null, editingReport: report }); }
  function openViewReport(report) { setStack({ screen: "viewreport", report }); }
  function closeStack() { setStack(null); }

  const showTabBar = stack === null;

  return (
    <div className="app" data-theme={theme}>
      <GlobalStyle />
      <div className="phone">
        <SystemHeader theme={theme} onToggleTheme={toggleTheme} />
        <DesktopNav
          tab={tab} setTab={setTab}
          onQuickAdd={async () => {
            const draft = await getDraft(todayISO());
            openForm(todayISO(), draft || null);
          }}
          disabled={stack !== null}
        />
        <div className="screenArea">
          {stack === null && tab === "calendar" && (
            <CalendarScreen
              viewMonth={viewMonth} setViewMonth={setViewMonth}
              reportDates={reportDates} draftDates={draftDates}
              onSelectDay={openDay}
            />
          )}
          {stack === null && tab === "history" && (
            <HistoryScreen onOpenReport={openViewReport} />
          )}
          {stack === null && tab === "drafts" && (
            <DraftsScreen
              onResume={(d) => openForm(d.date, d.form)}
              onDeleted={refreshIndex}
            />
          )}

          {stack?.screen === "daylist" && (
            <DayListScreen
              dateISO={stack.date} reports={stack.reports} draft={stack.draft} loading={stack.loading}
              onBack={closeStack}
              onNewOrResume={() => openForm(stack.date, stack.draft)}
              onViewReport={openViewReport}
              onDraftDeleted={async () => { await deleteDraft(stack.date); await refreshIndex(); showToast("ลบฉบับร่างแล้ว"); await openDay(stack.date); }}
            />
          )}
          {stack?.screen === "form" && (
            <ReportForm
              dateISO={stack.date} initialDraft={stack.draft} editingReport={stack.editingReport}
              onExitToDay={async () => {
                if (stack.editingReport) { setStack({ screen: "viewreport", report: stack.editingReport }); }
                else { await openDay(stack.date); }
              }}
              onDraftSaved={async (form) => { await refreshIndex(); showToast("บันทึกฉบับร่างแล้ว"); }}
              onFinalized={async () => {
                await deleteDraft(stack.date);
                await refreshIndex();
                showToast("บันทึกเข้าประวัติแล้ว");
                await openDay(stack.date);
              }}
              onUpdated={async (updated) => {
                await refreshIndex();
                showToast("บันทึกการแก้ไขแล้ว");
                setStack({ screen: "viewreport", report: updated });
              }}
              onPrint={(form) => setPrintPayload(form)}
              showToast={showToast}
            />
          )}
          {stack?.screen === "viewreport" && (
            <ViewReportScreen
              report={stack.report}
              onBack={() => setStack(null)}
              onPrint={() => setPrintPayload(stack.report)}
              onEdit={() => openEditReport(stack.report)}
              onDelete={async () => {
                await deleteReport(stack.report.date, stack.report.id);
                await refreshIndex();
                showToast("ลบบันทึกแล้ว");
                setStack(null);
              }}
            />
          )}
        </div>

        {showTabBar && (
          <TabBar
            tab={tab} setTab={setTab}
            onQuickAdd={(draft) => openForm(todayISO(), draft || null)}
          />
        )}

        {toast && <div className="toast">{toast}</div>}

        <div className="copyrightBar">© 2026 By Meenmin-Atchara.</div>

        <div className="printArea">
          {printPayload && (
            <>
              <h1>PM FIELD REPORT</h1>
              <div className="meta">
                {siteLabelOf(printPayload) || "-"} · {thaiDateLabel(printPayload.date)} · {(printPayload.techs || []).join(", ")}
              </div>
              <pre>{buildSummaryText(printPayload)}</pre>
              {printPayload.photos?.length > 0 && (
                <div className="printPhotos">{printPayload.photos.map((p) => <img key={p.id} src={p.src} alt={p.name} />)}</div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quick-add: resolve today's draft before opening the form
// ---------------------------------------------------------------------------
function useQuickAddResolver() {}

// ---------------------------------------------------------------------------
// Confirm-to-delete button — first tap arms it, second tap (within a few
// seconds) confirms. Avoids window.confirm, which some embedded/preview
// browsers block.
// ---------------------------------------------------------------------------
function ConfirmDeleteButton({ onConfirm, label = "ลบ", confirmLabel = "ยืนยันลบ?", className = "" }) {
  const [armed, setArmed] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  function handleClick(e) {
    e.stopPropagation();
    if (!armed) {
      setArmed(true);
      timerRef.current = setTimeout(() => setArmed(false), 3000);
      return;
    }
    clearTimeout(timerRef.current);
    setArmed(false);
    onConfirm();
  }

  return (
    <button className={`${className} ${armed ? "confirmArmed" : ""}`} onClick={handleClick}>
      <Icon.Trash />
      {armed ? confirmLabel : label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// System header — always visible, holds branding + theme switch
// ---------------------------------------------------------------------------
function SystemHeader({ theme, onToggleTheme }) {
  return (
    <div className="systemHeader">
      <div className="sysBrand">
        <LOGO />
        <div>
          <div className="sysTitle">PM FIELD REPORT</div>
          <div className="sysSub">ฉบับร่าง</div>
        </div>
      </div>
      <button className="themeToggle" onClick={onToggleTheme} aria-label="สลับโหมดสี">
        <span className={`themeSeg ${theme === "dark" ? "active" : ""}`}><Icon.Moon /></span>
        <span className={`themeSeg ${theme === "light" ? "active" : ""}`}><Icon.Sun /></span>
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Desktop top nav — same 3 destinations as the mobile tab bar, shown only on
// wide viewports (see .desktopNav media query); mobile keeps the bottom bar.
// ---------------------------------------------------------------------------
function DesktopNav({ tab, setTab, onQuickAdd, disabled }) {
  return (
    <div className="desktopNav">
      <button className={`deskTab ${tab === "calendar" ? "active" : ""}`} onClick={() => setTab("calendar")} disabled={disabled}>
        <Icon.Calendar /> ปฏิทิน
      </button>
      <button className={`deskTab ${tab === "history" ? "active" : ""}`} onClick={() => setTab("history")} disabled={disabled}>
        <Icon.History /> ประวัติ
      </button>
      <button className={`deskTab ${tab === "drafts" ? "active" : ""}`} onClick={() => setTab("drafts")} disabled={disabled}>
        <Icon.Draft /> ฉบับร่าง
      </button>
      <button className="deskAdd" onClick={onQuickAdd} disabled={disabled}>
        <Icon.Plus /> บันทึกงานวันนี้
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bottom tab bar
// ---------------------------------------------------------------------------
function TabBar({ tab, setTab, onQuickAdd }) {
  const [resolving, setResolving] = useState(false);
  async function handlePlus() {
    setResolving(true);
    const draft = await getDraft(todayISO());
    setResolving(false);
    onQuickAdd(draft);
  }
  return (
    <div className="tabBar">
      <button className={`tabBtn ${tab === "calendar" ? "active" : ""}`} onClick={() => setTab("calendar")}>
        <Icon.Calendar /><span>ปฏิทิน</span>
      </button>
      <button className={`tabBtn ${tab === "history" ? "active" : ""}`} onClick={() => setTab("history")}>
        <Icon.History /><span>ประวัติ</span>
      </button>
      <button className={`tabBtn ${tab === "drafts" ? "active" : ""}`} onClick={() => setTab("drafts")}>
        <Icon.Draft /><span>ฉบับร่าง</span>
      </button>
      <button className="tabBtn tabBtnAdd" onClick={handlePlus} disabled={resolving}>
        <span className="addBadge"><Icon.Plus /></span><span>บันทึกงาน</span>
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Calendar screen
// ---------------------------------------------------------------------------
function CalendarScreen({ viewMonth, setViewMonth, reportDates, draftDates, onSelectDay }) {
  const { y, m } = viewMonth;
  const firstOfMonth = new Date(y, m, 1);
  const startOffset = firstOfMonth.getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const todayIso = todayISO();

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  function changeMonth(delta) {
    let nm = m + delta, ny = y;
    if (nm < 0) { nm = 11; ny -= 1; }
    if (nm > 11) { nm = 0; ny += 1; }
    setViewMonth({ y: ny, m: nm });
  }

  return (
    <>
      <div className="topbar">
        <div className="calHead">
          <button className="navArrow" onClick={() => changeMonth(-1)}>‹</button>
          <span className="calTitle">{MONTHS_TH[m]} {y + 543}</span>
          <button className="navArrow" onClick={() => changeMonth(1)}>›</button>
        </div>
      </div>
      <div className="content">
        <div className="weekRow">{WEEKDAYS_TH.map((w) => <div key={w} className="weekCell">{w}</div>)}</div>
        <div className="grid">
          {cells.map((d, idx) => {
            if (d === null) return <div key={idx} className="dayCell empty" />;
            const iso = `${y}-${pad2(m + 1)}-${pad2(d)}`;
            const holiday = TH_HOLIDAYS[iso];
            const isToday = iso === todayIso;
            const hasReport = !!reportDates[iso];
            const hasDraft = !!draftDates[iso];
            return (
              <button key={idx} className={`dayCell ${isToday ? "today" : ""} ${holiday ? "holiday" : ""}`} onClick={() => onSelectDay(iso)}>
                <span className="dayNum">{d}</span>
                {holiday && <span className="holidayTag">{holiday}</span>}
                <span className="dotRow">
                  {hasReport && <span className="dot dotReport" />}
                  {hasDraft && <span className="dot dotDraft" />}
                </span>
              </button>
            );
          })}
        </div>
        <div className="legend">
          <span><i className="dot dotReport" /> มีบันทึกแล้ว</span>
          <span><i className="dot dotDraft" /> มีฉบับร่างค้างไว้</span>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// History tab — flat list of all finalized reports, newest first
// ---------------------------------------------------------------------------
function HistoryScreen({ onOpenReport }) {
  const [items, setItems] = useState(null);
  const [siteFilter, setSiteFilter] = useState("ทั้งหมด");

  useEffect(() => { getAllReports().then(setItems); }, []);

  const sites = useMemo(() => {
    if (!items) return ["ทั้งหมด"];
    const s = new Set(items.map((r) => siteLabelOf(r)).filter(Boolean));
    return ["ทั้งหมด", ...Array.from(s)];
  }, [items]);

  const filtered = useMemo(() => {
    if (!items) return [];
    if (siteFilter === "ทั้งหมด") return items;
    return items.filter((r) => siteLabelOf(r) === siteFilter);
  }, [items, siteFilter]);

  return (
    <>
      <div className="topbar">
        <p className="stepTitle">ประวัติการบันทึก</p>
      </div>
      <div className="content">
        {items === null && <p className="muted">กำลังโหลด...</p>}
        {items !== null && (
          <>
            <div className="chipRow" style={{ marginBottom: 14 }}>
              {sites.map((s) => (
                <div key={s} className={`chip ${siteFilter === s ? "active" : ""}`} onClick={() => setSiteFilter(s)}>{s}</div>
              ))}
            </div>
            {filtered.length === 0 && <p className="muted">ยังไม่มีบันทึกในประวัติ</p>}
            {filtered.map((r) => (
              <div className="reportCard" key={r.id} onClick={() => onOpenReport(r)}>
                <div className="reportTime">{thaiDateShort(r.date)} · {siteLabelOf(r) || "-"}</div>
                <div className="summaryPreview">{buildSummaryText(r).slice(0, 140)}...</div>
              </div>
            ))}
          </>
        )}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Drafts tab — flat list of all pending drafts across every date
// ---------------------------------------------------------------------------
function DraftsScreen({ onResume, onDeleted }) {
  const [items, setItems] = useState(null);
  const load = () => getAllDrafts().then(setItems);
  useEffect(() => { load(); }, []);

  async function handleDelete(dateISO) {
    await deleteDraft(dateISO);
    await load();
    onDeleted?.();
  }

  return (
    <>
      <div className="topbar">
        <p className="stepTitle">ฉบับร่างที่ค้างไว้</p>
      </div>
      <div className="content">
        {items === null && <p className="muted">กำลังโหลด...</p>}
        {items !== null && items.length === 0 && <p className="muted">ไม่มีฉบับร่างค้างอยู่</p>}
        {items !== null && items.map((d) => (
          <div className="draftCard" key={d.date} onClick={() => onResume(d)}>
            <div className="draftCardHead">
              <div className="draftBadge">{thaiDateShort(d.date)} · {siteLabelOf(d.form) || "ยังไม่ระบุหน้างาน"}</div>
              <ConfirmDeleteButton className="miniDeleteBtn" onConfirm={() => handleDelete(d.date)} label="" confirmLabel="ยืนยัน?" />
            </div>
            <div className="summaryPreview">{buildSummaryText(d.form).slice(0, 140)}...</div>
            <div className="draftCta">แตะเพื่อทำต่อ →</div>
          </div>
        ))}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Day list (all entries for one date, reached from the calendar)
// ---------------------------------------------------------------------------
function DayListScreen({ dateISO, reports, draft, loading, onBack, onNewOrResume, onViewReport, onDraftDeleted }) {
  const holiday = TH_HOLIDAYS[dateISO];
  return (
    <>
      <div className="topbar">
        <div className="backRow"><button className="backBtn" onClick={onBack}>‹ ปฏิทิน</button></div>
        <p className="stepTitle" style={{ marginTop: 6 }}>{thaiDateLabel(dateISO)}</p>
        {holiday && <p className="holidayNote">วันหยุด: {holiday}</p>}
      </div>
      <div className="content">
        {loading && <p className="muted">กำลังโหลด...</p>}
        {!loading && draft && (
          <div className="draftCard" onClick={onNewOrResume}>
            <div className="draftCardHead">
              <div className="draftBadge">ฉบับร่าง — ยังไม่บันทึกเข้าประวัติ</div>
              <ConfirmDeleteButton className="miniDeleteBtn" onConfirm={onDraftDeleted} label="" confirmLabel="ยืนยัน?" />
            </div>
            <div className="summaryPreview">{buildSummaryText(draft).slice(0, 140)}...</div>
            <div className="draftCta">แตะเพื่อทำต่อ →</div>
          </div>
        )}
        {!loading && reports.length === 0 && !draft && <p className="muted">ยังไม่มีบันทึกงานสำหรับวันนี้</p>}
        {!loading && reports.map((r) => (
          <div className="reportCard" key={r.id} onClick={() => onViewReport(r)}>
            <div className="reportTime">บันทึกเวลา {new Date(r.finalizedAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}</div>
            <div className="summaryPreview">{buildSummaryText(r).slice(0, 140)}...</div>
          </div>
        ))}
      </div>
      <div className="footer">
        <button className="btn btnPrimary" onClick={onNewOrResume}>{draft ? "ทำต่อจากฉบับร่าง" : "+ เพิ่มบันทึกงาน"}</button>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// View a single finalized report
// ---------------------------------------------------------------------------
function ViewReportScreen({ report, onBack, onPrint, onEdit, onDelete }) {
  return (
    <>
      <div className="topbar">
        <div className="backRow"><button className="backBtn" onClick={onBack}>‹ กลับ</button></div>
        <p className="stepTitle" style={{ marginTop: 6 }}>{thaiDateLabel(report.date)}</p>
      </div>
      <div className="content">
        <div className="summaryBox">{buildSummaryText(report)}</div>
        {report.photos?.length > 0 && (
          <div className="summaryPhotos">{report.photos.map((p) => <img key={p.id} src={p.src} alt={p.name} />)}</div>
        )}
      </div>
      <div className="footer footerWrap">
        <button className="btn btnGhost" onClick={onEdit}><Icon.Edit /> แก้ไข</button>
        <button className="btn btnPdf" onClick={onPrint}>บันทึกเป็น PDF</button>
        <ConfirmDeleteButton className="btn btnDanger" onConfirm={onDelete} label="ลบบันทึกนี้" confirmLabel="ยืนยันลบ?" />
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// The 5-step report form
// ---------------------------------------------------------------------------
function ReportForm({ dateISO, initialDraft, editingReport, onExitToDay, onDraftSaved, onFinalized, onUpdated, onPrint, showToast }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(() => editingReport || initialDraft || emptyForm(dateISO));
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  function addTech() { const name = form.techInput.trim(); if (!name) return; set({ techs: [...form.techs, name], techInput: "" }); }
  function removeTech(i) { set({ techs: form.techs.filter((_, idx) => idx !== i) }); }
  function updateTask(id, text) { set({ tasks: form.tasks.map((t) => (t.id === id ? { ...t, text } : t)) }); }
  function addTask() { set({ tasks: [...form.tasks, { id: uid(), text: "" }] }); }
  function removeTask(id) { set({ tasks: form.tasks.filter((t) => t.id !== id) }); }
  function addIssue(known) {
    const base = known ? { id: uid(), scope: known.scope, code: known.code, cause: known.cause, fix: known.fix }
      : { id: uid(), scope: "", code: "", cause: "", fix: "" };
    set({ issues: [...form.issues, base] });
  }
  function updateIssue(id, patch) { set({ issues: form.issues.map((i) => (i.id === id ? { ...i, ...patch } : i)) }); }
  function removeIssue(id) { set({ issues: form.issues.filter((i) => i.id !== id) }); }
  function onPhotoPick(e) {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => setForm((f) => ({ ...f, photos: [...f.photos, { id: uid(), src: reader.result, name: file.name }] }));
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  }
  function setPhotos(updater) { setForm((f) => ({ ...f, photos: updater(f.photos) })); }

  const siteLabel = siteLabelOf(form);
  const summaryText = useMemo(() => buildSummaryText(form), [form]);
  const holiday = TH_HOLIDAYS[form.date];
  const isEditing = !!editingReport;

  async function saveDraft() { await setDraftStore(form.date, form); onDraftSaved(form); }
  function copySummary() {
    navigator.clipboard?.writeText(summaryText).then(
      () => showToast("คัดลอกข้อความสรุปแล้ว"),
      () => showToast("คัดลอกไม่สำเร็จ ลองแตะค้างที่ข้อความแทน")
    );
  }
  function sendToLine() {
    const text = encodeURIComponent(summaryText);
    navigator.clipboard?.writeText(summaryText).catch(() => {});
    window.location.href = `line://msg/text/${text}`;
    showToast("เปิดไลน์แล้ว เลือกกลุ่มปลายทาง (แนบรูปเพิ่มเองในแชท)");
  }
  async function finalizeToHistory() {
    if (isEditing) {
      const updated = await saveReport(form, editingReport.id, editingReport.date);
      onUpdated(updated);
    } else {
      await saveReport(form);
      onFinalized();
    }
  }

  const canNext = [!!siteLabel && !!form.date, true, true, true];

  return (
    <>
      <div className="topbar">
        <div className="backRow">
          <button className="backBtn" onClick={onExitToDay}>‹ ออก</button>
          {isEditing
            ? <span className="editingBadge">กำลังแก้ไขบันทึกเดิม</span>
            : <button className="draftLink" onClick={saveDraft}>💾 บันทึกฉบับร่าง</button>}
        </div>
        <div className="stepRow">
          <span className="stepTitle">{STEPS[step]}</span>
          <span className="stepNum">{step + 1} / {STEPS.length}</span>
        </div>
        <div className="progressTrack"><div className="progressFill" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} /></div>
      </div>

      <div className="content">
        {step === 0 && (
          <>
            <label>วันที่</label>
            <input type="date" value={form.date} onChange={(e) => set({ date: e.target.value })} />
            <div className="dateSub">{thaiDateLabel(form.date)}{holiday && <span className="holidayInline"> · วันหยุด: {holiday}</span>}</div>

            <label>หน้างาน</label>
            <div className="chipRow">
              {SITE_OPTIONS.map((s) => <div key={s} className={`chip ${form.site === s ? "active" : ""}`} onClick={() => set({ site: s })}>{s}</div>)}
            </div>
            {form.site === "อื่นๆ" && (
              <input type="text" placeholder="ระบุชื่อหน้างาน" value={form.siteCustom} onChange={(e) => set({ siteCustom: e.target.value })} style={{ marginTop: 10 }} />
            )}

            <label>เวลาเริ่ม — เวลาเสร็จ</label>
            <div style={{ display: "flex", gap: 10 }}>
              <input type="time" value={form.timeIn} onChange={(e) => set({ timeIn: e.target.value })} />
              <input type="time" value={form.timeOut} onChange={(e) => set({ timeOut: e.target.value })} />
            </div>

            <label>ผู้ดำเนินการ</label>
            <div className="tagRow">
              <input type="text" placeholder="พิมพ์ชื่อแล้วกดเพิ่ม" value={form.techInput}
                onChange={(e) => set({ techInput: e.target.value })} onKeyDown={(e) => e.key === "Enter" && addTech()} />
              <button className="addBtn" onClick={addTech}>เพิ่ม</button>
            </div>
            <div className="techList">{form.techs.map((t, i) => <div className="techPill" key={i}>{t}<button onClick={() => removeTech(i)}>×</button></div>)}</div>
          </>
        )}

        {step === 1 && (
          <>
            <p className="stepEyebrow">รายการงานที่ดำเนินการ</p>
            {form.tasks.map((t) => (
              <div className="taskRow" key={t.id}>
                <input type="text" placeholder="เช่น ช่วยงาน R&D กางพาเลท..." value={t.text} onChange={(e) => updateTask(t.id, e.target.value)} />
                {form.tasks.length > 1 && <button className="rowRemove" onClick={() => removeTask(t.id)}>×</button>}
              </div>
            ))}
            <button className="addLink" onClick={addTask}>+ เพิ่มรายการงาน</button>
          </>
        )}

        {step === 2 && (
          <>
            <p className="stepEyebrow">เจอแบบนี้บ่อย — แตะเพื่อเติมให้อัตโนมัติ</p>
            <div className="knownList">
              {KNOWN_ISSUES.map((k) => <button key={k.code} className="knownItem" onClick={() => addIssue(k)}><b>{k.scope}</b> {k.code}</button>)}
            </div>
            {form.issues.map((i) => (
              <div className="issueCard" key={i.id}>
                <div className="issueHead"><span className="issueScope">รายการปัญหา</span><button className="rowRemove" onClick={() => removeIssue(i.id)}>×</button></div>
                <label style={{ marginTop: 8 }}>เครื่อง / จุดที่เกิด</label>
                <input type="text" value={i.scope} onChange={(e) => updateIssue(i.id, { scope: e.target.value })} />
                <label>อาการ / รหัส Alarm</label>
                <input type="text" value={i.code} onChange={(e) => updateIssue(i.id, { code: e.target.value })} />
                <label>สาเหตุ</label>
                <textarea value={i.cause} onChange={(e) => updateIssue(i.id, { cause: e.target.value })} />
                <label>วิธีแก้ไข</label>
                <textarea value={i.fix} onChange={(e) => updateIssue(i.id, { fix: e.target.value })} />
              </div>
            ))}
            <button className="addLink" onClick={() => addIssue(null)}>+ เพิ่มปัญหาใหม่ที่ไม่อยู่ในลิสต์</button>
          </>
        )}

        {step === 3 && (
          <>
            <p className="stepEyebrow">ถ่ายรูปหรือแนบรูปหน้างาน</p>
            <div className="photoGrid">
              {form.photos.map((p) => (
                <div className="photoThumb" key={p.id}><img src={p.src} alt={p.name} /><button className="photoRemove" onClick={() => setPhotos((prev) => prev.filter((x) => x.id !== p.id))}>×</button></div>
              ))}
              <label className="photoAdd">
                <Icon.Camera />ถ่ายรูป
                <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={onPhotoPick} />
              </label>
              <label className="photoAdd">
                <Icon.Gallery />เลือกจากอัลบัม
                <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={onPhotoPick} />
              </label>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <p className="stepEyebrow">ตัวอย่างข้อความสรุป</p>
            <div className="summaryBox">{summaryText || "(ยังไม่มีข้อมูล)"}</div>
            {form.photos.length > 0 && <div className="summaryPhotos">{form.photos.map((p) => <img key={p.id} src={p.src} alt={p.name} />)}</div>}
            <div className="finalActions">
              <button className="btn btnLine" onClick={sendToLine}>ส่งเข้ากลุ่มไลน์</button>
              <button className="btn btnPdf" onClick={() => onPrint(form)}>บันทึกเป็น PDF</button>
              <button className="copyLink" onClick={copySummary}>คัดลอกข้อความอย่างเดียว</button>
              <button className="btn btnFinish" onClick={finalizeToHistory}>
                {isEditing ? "✓ บันทึกการแก้ไข" : "✓ จบงานวันนี้ / บันทึกเข้าประวัติ"}
              </button>
            </div>
          </>
        )}
      </div>

      <div className="footer">
        {step > 0 && <button className="btn btnGhost" onClick={() => setStep((s) => s - 1)}>ย้อนกลับ</button>}
        {step < STEPS.length - 1 && (
          <button className="btn btnPrimary" disabled={!canNext[step]} style={{ opacity: canNext[step] ? 1 : 0.5 }} onClick={() => setStep((s) => s + 1)}>ถัดไป</button>
        )}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@500;600;700&family=Sarabun:wght@400;500;600&display=swap');
      :root{
        --bg:#15181A; --surface:#1D2220; --surface2:#262C29; --border:#333F38;
        --amber:#FFC93C; --amber-dim:#8A6E1F; --amber-tint:rgba(255,201,60,0.10); --rust:#E4572E; --text:#EDEFEC;
        --muted:#8D958E; --ok:#6FBF73; --line:#06C755;
      }
      .app[data-theme="light"]{
        --bg:#E9ECEA; --surface:#FFFFFF; --surface2:#F3F5F4; --border:#D6DBD8;
        --amber:#B57900; --amber-dim:#B57900; --amber-tint:rgba(181,121,0,0.10); --rust:#C23B1C; --text:#171A18;
        --muted:#5C655F; --ok:#2E7D46; --line:#06A24A;
      }
      html, body{margin:0;padding:0;min-height:100%;background:#15181A;}
      #root{min-height:100vh;}
      *{box-sizing:border-box;}
      .app{font-family:'Sarabun',sans-serif;background:var(--bg);color:var(--text);min-height:100vh;display:flex;justify-content:center;}
      .phone{width:100%;max-width:460px;min-height:100vh;background:var(--surface);display:flex;flex-direction:column;position:relative;}
      .screenArea{flex:1;display:flex;flex-direction:column;min-height:0;}
      .systemHeader{display:flex;align-items:center;justify-content:space-between;padding:12px 20px;background:var(--bg);border-bottom:1px solid var(--border);}
      .sysBrand{display:flex;align-items:center;gap:9px;color:var(--amber);}
      .sysTitle{font-family:'Chakra Petch',sans-serif;font-weight:700;font-size:14px;color:var(--amber);line-height:1.2;}
      .sysSub{font-size:10.5px;color:var(--muted);line-height:1.2;}
      .themeToggle{display:flex;background:var(--surface2);border:1px solid var(--border);border-radius:20px;padding:3px;cursor:pointer;gap:2px;}
      .themeSeg{width:26px;height:22px;border-radius:16px;display:flex;align-items:center;justify-content:center;color:var(--muted);}
      .themeSeg.active{background:var(--amber);color:#20220a;}
      .topbar{padding:18px 20px 14px;border-bottom:1px solid var(--border);}
      .brand{font-family:'Chakra Petch',sans-serif;font-weight:700;font-size:15px;color:var(--amber);margin:0 0 10px;}
      .stepRow{display:flex;align-items:center;justify-content:space-between;}
      .stepTitle{font-family:'Chakra Petch',sans-serif;font-weight:600;font-size:19px;}
      .stepNum{font-family:'Chakra Petch',sans-serif;color:var(--muted);font-size:13px;}
      .progressTrack{height:3px;background:var(--border);margin-top:12px;border-radius:2px;overflow:hidden;}
      .progressFill{height:100%;background:var(--amber);transition:width .25s ease;}
      .content{flex:1;padding:20px 20px 30px;overflow-y:auto;}
      label{display:block;font-size:13px;color:var(--muted);margin:18px 0 7px;}
      label:first-child{margin-top:0;}
      input[type=text],input[type=time],input[type=date],textarea{
        width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:6px;
        color:var(--text);font-family:'Sarabun',sans-serif;font-size:15px;padding:11px 12px;outline:none;
      }
      input[type=date]{color-scheme:dark;}
      .app[data-theme="light"] input[type=date]{color-scheme:light;}
      input:focus,textarea:focus{border-color:var(--amber);}
      textarea{resize:vertical;min-height:64px;}
      .dateSub{font-size:13px;color:var(--muted);margin-top:6px;}
      .holidayInline{color:var(--rust);}
      .chipRow{display:flex;flex-wrap:wrap;gap:8px;}
      .chip{padding:9px 14px;border-radius:6px;border:1px solid var(--border);background:var(--surface2);font-size:14px;cursor:pointer;}
      .chip.active{border-color:var(--amber);background:var(--amber-tint);color:var(--amber);}
      .tagRow{display:flex;gap:8px;margin-top:8px;}
      .tagRow input{flex:1;}
      .addBtn{background:var(--surface2);border:1px solid var(--border);color:var(--amber);border-radius:6px;padding:0 16px;font-family:'Chakra Petch',sans-serif;font-weight:600;cursor:pointer;}
      .techList{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;}
      .techPill{background:var(--surface2);border:1px solid var(--border);border-radius:20px;padding:6px 10px 6px 14px;font-size:13px;display:flex;align-items:center;gap:8px;}
      .techPill button{background:none;border:none;color:var(--muted);cursor:pointer;font-size:14px;}
      .taskRow,.issueCard{background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:12px;margin-bottom:10px;}
      .taskRow{display:flex;gap:8px;align-items:center;padding:6px 10px;}
      .taskRow input{border:none;background:none;padding:8px 0;}
      .rowRemove{background:none;border:none;color:var(--rust);font-size:18px;cursor:pointer;line-height:1;padding:4px;}
      .addLink{color:var(--amber);font-family:'Chakra Petch',sans-serif;font-size:14px;font-weight:600;background:none;border:none;cursor:pointer;padding:6px 0;}
      .stepEyebrow{font-family:'Chakra Petch',sans-serif;font-size:12px;color:var(--amber);margin-bottom:2px;}
      .issueHead{display:flex;justify-content:space-between;align-items:flex-start;gap:8px;}
      .issueScope{font-family:'Chakra Petch',sans-serif;font-size:12px;color:var(--muted);}
      .knownList{display:flex;flex-direction:column;gap:6px;margin-bottom:16px;}
      .knownItem{text-align:left;background:var(--surface2);border:1px dashed var(--border);border-radius:8px;padding:10px 12px;color:var(--text);font-size:13.5px;cursor:pointer;}
      .knownItem b{color:var(--amber);font-family:'Chakra Petch',sans-serif;font-weight:600;font-size:12.5px;}
      .photoGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px;}
      .photoThumb{position:relative;aspect-ratio:1;border-radius:6px;overflow:hidden;border:1px solid var(--border);}
      .photoThumb img{width:100%;height:100%;object-fit:cover;display:block;}
      .photoRemove{position:absolute;top:4px;right:4px;width:20px;height:20px;background:rgba(0,0,0,0.65);color:#fff;border:none;border-radius:4px;font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;}
      .photoAdd{aspect-ratio:1;border-radius:6px;border:1px dashed var(--border);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:5px;color:var(--muted);font-size:10.5px;text-align:center;line-height:1.3;cursor:pointer;background:var(--surface2);padding:4px;}
      .photoAdd svg{color:var(--amber);}
      .summaryBox{background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:14px;white-space:pre-wrap;font-size:14px;line-height:1.7;}
      .summaryPreview{font-size:13px;color:var(--muted);line-height:1.6;white-space:pre-wrap;margin-top:6px;}
      .summaryPhotos{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:12px;}
      .summaryPhotos img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:5px;}
      .footer{background:var(--surface);border-top:1px solid var(--border);padding:14px 20px;display:flex;gap:10px;}
      .btn{flex:1;padding:14px;border-radius:7px;font-family:'Chakra Petch',sans-serif;font-weight:600;font-size:15px;border:none;cursor:pointer;}
      .btnGhost{background:var(--surface2);color:var(--text);border:1px solid var(--border);}
      .btnPrimary{background:var(--amber);color:#20220a;}
      .btnFinish{background:var(--ok);color:#0d2210;}
      .finalActions{display:flex;flex-direction:column;gap:10px;margin-top:20px;}
      .btnLine{background:var(--line);color:#fff;}
      .btnPdf{background:var(--surface2);color:var(--amber);border:1px solid var(--amber-dim);}
      .copyLink{text-align:center;font-size:13px;color:var(--muted);background:none;border:none;text-decoration:underline;cursor:pointer;padding:4px;}
      .toast{position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:var(--surface2);border:1px solid var(--amber);color:var(--text);padding:10px 16px;border-radius:8px;font-size:13px;max-width:380px;text-align:center;z-index:50;}
      .muted{color:var(--muted);font-size:14px;}
      .copyrightBar{text-align:center;font-size:10.5px;color:var(--muted);padding:8px 10px;border-top:1px solid var(--border);background:var(--surface);}
      .editingBadge{font-size:12px;color:var(--amber);font-family:'Chakra Petch',sans-serif;font-weight:600;}
      .footerWrap{flex-wrap:wrap;}
      .btnDanger{background:none;border:1px solid var(--rust);color:var(--rust);display:flex;align-items:center;justify-content:center;gap:6px;}
      .btnDanger.confirmArmed{background:var(--rust);color:#fff;}
      .btnGhost{display:flex;align-items:center;justify-content:center;gap:6px;}
      .draftCardHead{display:flex;align-items:center;justify-content:space-between;gap:8px;}
      .miniDeleteBtn{background:none;border:1px solid var(--border);color:var(--muted);border-radius:6px;padding:5px 8px;display:flex;align-items:center;gap:4px;font-size:11px;cursor:pointer;flex-shrink:0;}
      .miniDeleteBtn.confirmArmed{background:var(--rust);border-color:var(--rust);color:#fff;}

      .desktopNav{display:none;}
      .tabBar{display:grid;grid-template-columns:repeat(4,1fr);align-items:stretch;background:var(--surface);border-top:1px solid var(--border);padding:8px 6px calc(8px + env(safe-area-inset-bottom));}
      .tabBtn{background:none;border:none;color:var(--muted);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;font-size:11px;font-family:'Sarabun',sans-serif;cursor:pointer;padding:6px 4px;}
      .tabBtn.active{color:var(--amber);}
      .tabBtnAdd{color:var(--amber);}
      .addBadge{width:26px;height:26px;border-radius:50%;background:var(--amber);color:#20220a;display:flex;align-items:center;justify-content:center;}

      /* Calendar */
      .calHead{display:flex;align-items:center;justify-content:space-between;}
      .calTitle{font-family:'Chakra Petch',sans-serif;font-weight:600;font-size:18px;}
      .navArrow{background:var(--surface2);border:1px solid var(--border);color:var(--amber);width:34px;height:34px;border-radius:6px;font-size:18px;cursor:pointer;}
      .weekRow{display:grid;grid-template-columns:repeat(7,1fr);margin-bottom:6px;}
      .weekCell{text-align:center;font-size:12px;color:var(--muted);font-family:'Chakra Petch',sans-serif;}
      .grid{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;}
      .dayCell{aspect-ratio:0.85;background:var(--surface2);border:1px solid var(--border);border-radius:6px;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding:6px 2px;cursor:pointer;color:var(--text);position:relative;}
      .dayCell.empty{background:transparent;border:none;cursor:default;}
      .dayCell.today{border-color:var(--amber);}
      .dayCell.holiday .dayNum{color:var(--rust);}
      .dayNum{font-family:'Chakra Petch',sans-serif;font-size:14px;font-weight:600;}
      .holidayTag{font-size:8px;line-height:1.1;color:var(--rust);text-align:center;margin-top:2px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
      .dotRow{display:flex;gap:3px;margin-top:auto;padding-top:4px;}
      .dot{width:5px;height:5px;border-radius:50%;display:inline-block;}
      .dotReport{background:var(--ok);}
      .dotDraft{background:var(--amber);}
      .legend{display:flex;gap:16px;margin-top:16px;font-size:12px;color:var(--muted);align-items:center;}
      .legend .dot{margin-right:5px;}

      /* Day list / report cards */
      .backRow{display:flex;justify-content:space-between;align-items:center;}
      .backBtn{background:none;border:none;color:var(--amber);font-family:'Chakra Petch',sans-serif;font-size:14px;cursor:pointer;padding:0;}
      .draftLink{background:none;border:none;color:var(--amber);font-size:13px;cursor:pointer;}
      .holidayNote{color:var(--rust);font-size:13px;margin-top:4px;}
      .draftCard{background:var(--amber-tint);border:1px dashed var(--amber-dim);border-radius:8px;padding:14px;margin-bottom:14px;cursor:pointer;}
      .draftBadge{font-family:'Chakra Petch',sans-serif;font-size:12px;color:var(--amber);font-weight:600;}
      .draftCta{font-size:13px;color:var(--amber);margin-top:8px;}
      .reportCard{background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:14px;margin-bottom:10px;cursor:pointer;}
      .reportTime{font-family:'Chakra Petch',sans-serif;font-size:12px;color:var(--ok);margin-bottom:4px;}

      /* ---- Responsive: tablet / desktop ---- */
      @media (min-width: 860px){
        .app{padding:0;align-items:flex-start;}
        .phone{max-width:none;width:100%;min-height:100vh;}
        .systemHeader{padding:18px 32px;}
        .sysBrand{gap:12px;}
        .sysBrand svg{width:26px;height:26px;}
        .logoWrench{width:16px !important;height:16px !important;}
        .sysTitle{font-size:19px;}
        .sysSub{font-size:12.5px;}
        .themeToggle{padding:4px;}
        .themeSeg{width:32px;height:28px;}
        .themeSeg svg{width:18px;height:18px;}
        .desktopNav{display:flex;align-items:center;gap:6px;padding:10px 32px;background:var(--surface);border-bottom:1px solid var(--border);}
        .deskTab{display:flex;align-items:center;gap:8px;background:none;border:none;color:var(--muted);font-family:'Chakra Petch',sans-serif;font-size:14px;font-weight:600;padding:10px 16px;border-radius:6px;cursor:pointer;}
        .deskTab svg{width:18px;height:18px;}
        .deskTab.active{color:var(--amber);background:var(--amber-tint);}
        .deskAdd{margin-left:auto;display:flex;align-items:center;gap:8px;background:var(--amber);color:#20220a;border:none;font-family:'Chakra Petch',sans-serif;font-size:14px;font-weight:700;padding:11px 20px;border-radius:6px;cursor:pointer;}
        .deskAdd svg{width:18px;height:18px;}
        .stepTitle{font-size:22px;}
        .calTitle{font-size:20px;}
        .deskTab:disabled,.deskAdd:disabled{opacity:0.4;cursor:default;}
        .tabBar{display:none;}
        .content{max-width:900px;margin:0 auto;width:100%;padding:32px 32px 48px;}
        .topbar{max-width:900px;margin:0 auto;width:100%;padding:22px 32px 16px;}
        .footer{max-width:900px;margin:0 auto;width:100%;padding:18px 32px;}
        .grid{gap:8px;}
        .dayCell{aspect-ratio:1.1;}
        .photoGrid{grid-template-columns:repeat(6,1fr);}
        .knownList{max-width:640px;}
        .taskRow,.issueCard{max-width:640px;}
        .summaryBox{max-width:640px;}
      }
      @media (min-width: 1400px){
        .content,.topbar,.footer{max-width:1100px;}
        .photoGrid{grid-template-columns:repeat(8,1fr);}
      }

      .printArea{display:none;}
      @media print{
        .app,.phone{background:#fff !important;color:#000 !important;max-width:none;}
        .topbar,.footer,.content,.tabBar{display:none !important;}
        .printArea{display:block !important;padding:24px;font-family:'Sarabun',sans-serif;color:#000;}
        .printArea h1{font-family:'Chakra Petch',sans-serif;font-size:20px;margin:0 0 4px;}
        .printArea .meta{color:#333;font-size:13px;margin-bottom:16px;}
        .printArea pre{white-space:pre-wrap;font-family:'Sarabun',sans-serif;font-size:14px;line-height:1.8;}
        .printPhotos{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-top:16px;}
        .printPhotos img{width:100%;border-radius:4px;}
      }
    `}</style>
  );
}
