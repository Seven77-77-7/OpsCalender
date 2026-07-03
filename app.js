const SHEET_ID = "1qcPhG5dCh-BS7NUsn15HIHxsMFGBt13PJleD9Y-bsR4";
const SHEET_NAME = "网页维护表";
const RANGE = "A1:R220";
const PUBLISHED_LINK_PREFIX = "xpin-published-link:";
const START_DATE = "2026-07-01";

let allRows = [];
let filteredRows = [];
let selectedDate = "";
let selectedEvent = null;
let currentMonth = "2026-07";

const els = {
  status: document.querySelector("#dataStatus"),
  prevMonth: document.querySelector("#prevMonth"),
  nextMonth: document.querySelector("#nextMonth"),
  calendar: document.querySelector("#calendar"),
  calendarTitle: document.querySelector("#calendarTitle"),
  selectedDateTitle: document.querySelector("#selectedDateTitle"),
  eventList: document.querySelector("#eventList"),
  dateFilter: document.querySelector("#dateFilter"),
  clearDateFilter: document.querySelector("#clearDateFilter"),
  weekRangeTitle: document.querySelector("#weekRangeTitle"),
  weekImpressions: document.querySelector("#weekImpressions"),
  weekLikes: document.querySelector("#weekLikes"),
  weekReplies: document.querySelector("#weekReplies"),
};

const monthLabels = [
  ["2026-07", "2026年7月"],
  ["2026-08", "2026年8月"],
  ["2026-09", "2026年9月"],
  ["2026-10", "2026年10月"],
  ["2026-11", "2026年11月"],
  ["2026-12", "2026年12月"],
  ["2027-01", "2027年1月"],
  ["2027-02", "2027年2月"],
];

function sheetUrl() {
  const query = new URLSearchParams({
    tqx: "out:json;responseHandler:__xpinSheetLoaded",
    sheet: SHEET_NAME,
    range: RANGE,
  });
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?${query.toString()}`;
}

async function loadSheetRows() {
  if (Array.isArray(window.LOCAL_CALENDAR_ROWS) && window.LOCAL_CALENDAR_ROWS.length) {
    els.status.textContent = "已加载发布包最新数据";
    return window.LOCAL_CALENDAR_ROWS;
  }

  try {
    const json = await loadSheetJsonp();
    const rows = parseGviz(json);
    if (!rows.length) throw new Error("empty sheet");
    els.status.textContent = "已读取 Google Sheet 最新数据";
    return rows;
  } catch (error) {
    console.warn(error);
    els.status.textContent = "未能读取在线表格，请检查网络或 Google Sheet 权限";
    return [];
  }
}

function loadSheetJsonp() {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("Google Sheet load timeout"));
    }, 6500);

    function cleanup() {
      window.clearTimeout(timeout);
      script.remove();
      delete window.__xpinSheetLoaded;
    }

    window.__xpinSheetLoaded = (json) => {
      cleanup();
      resolve(json);
    };
    script.onerror = () => {
      cleanup();
      reject(new Error("Google Sheet script failed"));
    };
    script.src = sheetUrl();
    document.head.appendChild(script);
  });
}

function parseGviz(json) {
  const table = json.table;
  const headers = table.cols.map((col) => col.label || col.id);
  return table.rows
    .map((row) => {
      const item = {};
      headers.forEach((header, index) => {
        item[header] = row.c[index]?.f ?? row.c[index]?.v ?? "";
      });
      return item;
    })
    .filter((item) => item["日期"] && item["日期"] !== "日期");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isVisibleRow(item) {
  return item?.["日期"] >= START_DATE;
}

function eventMonth(item) {
  return item?.["日期"]?.slice(0, 7) || "";
}

function stageDisplayLabel() {
  return "活动";
}

function formatDate(date) {
  const d = new Date(`${date}T00:00:00`);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getWeekRange(dateKey) {
  const base = new Date(`${dateKey || currentMonth + "-01"}T00:00:00`);
  const day = base.getDay() === 0 ? 7 : base.getDay();
  const start = addDays(base, 1 - day);
  const end = addDays(start, 6);
  return {
    start: toDateKey(start),
    end: toDateKey(end),
  };
}

function formatNumber(value) {
  const number = Number(String(value || "").replace(/,/g, ""));
  if (!Number.isFinite(number) || number <= 0) return "0";
  return new Intl.NumberFormat("en-US").format(number);
}

function metricValue(item, key) {
  const value = Number(String(item?.[key] || "").replace(/,/g, ""));
  return Number.isFinite(value) ? value : 0;
}

function hasMetrics(item) {
  return ["Twitter阅读量", "点赞量", "回复互动量"].some((key) => String(item?.[key] || "").trim() !== "");
}

function eventKey(item) {
  if (!item) return "";
  return [item["日期"], item["活动名称"], item["渠道"]].join("|");
}

function normalizePublishedLink(value) {
  const link = String(value || "").trim();
  return /^https?:\/\//i.test(link) ? link : "";
}

function getStoredPublishedLink(item) {
  if (!item) return "";
  return window.localStorage.getItem(`${PUBLISHED_LINK_PREFIX}${eventKey(item)}`) || "";
}

function getPublishedLink(item) {
  return normalizePublishedLink(item?.["实际发布链接"]) || normalizePublishedLink(getStoredPublishedLink(item));
}

function setStoredPublishedLink(item, value) {
  if (!item) return;
  const key = `${PUBLISHED_LINK_PREFIX}${eventKey(item)}`;
  const link = normalizePublishedLink(value);
  if (link) {
    window.localStorage.setItem(key, link);
  } else {
    window.localStorage.removeItem(key);
  }
}

async function syncPublishedLink(item, value) {
  const endpoint = String(window.XPIN_SYNC_ENDPOINT || "").trim();
  if (!endpoint) {
    els.status.textContent = "链接已本地保存；配置同步接口后可写回表格";
    return;
  }

  const link = normalizePublishedLink(value);
  const response = await fetch(endpoint, {
    method: "POST",
    mode: "cors",
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },
    body: JSON.stringify({
      date: item["日期"],
      activityName: item["活动名称"],
      channel: item["渠道"],
      publishedUrl: link,
    }),
  });
  const result = await response.json();
  if (!result.ok) throw new Error(result.error || "sync failed");
  els.status.textContent = "实际发布链接已同步到 Google Sheet";
}

function confirmationBadge(item) {
  return item?.["是否确认"] === "已确认" ? '<span class="confirm-pill">已确认</span>' : "";
}

function isConfirmed(item) {
  return item?.["是否确认"] === "已确认";
}

function productDetails(item) {
  const product = escapeHtml(item["主推套餐"]);
  const code = escapeHtml(item["产品编码"] || "暂无产品编码");
  const price = escapeHtml(item["活动价"]);
  const regular = escapeHtml(item["日常售价"]);
  const crossed = escapeHtml(item["划线价"]);
  const description = escapeHtml(item["套餐说明"] || "暂无套餐说明");
  return `
    <details class="product-detail">
      <summary>${product}</summary>
      <dl>
        <div><dt>产品编码</dt><dd>${code}</dd></div>
        <div><dt>活动价</dt><dd>$${price}</dd></div>
        <div><dt>日常售价</dt><dd>$${regular}</dd></div>
        <div><dt>划线价</dt><dd>$${crossed}</dd></div>
        <div><dt>套餐说明</dt><dd>${description}</dd></div>
      </dl>
    </details>
  `;
}

function metricsBlock(item) {
  if (!hasMetrics(item)) {
    return `
      <div class="event-section metric-section">
        <h4>发布数据</h4>
        <p class="muted">暂未记录。推文发布超过 24 小时后自动写入一次。</p>
      </div>
    `;
  }
  return `
    <div class="event-section metric-section">
      <h4>发布数据</h4>
      <div class="event-metrics">
        <span><em>阅读</em><strong>${formatNumber(item["Twitter阅读量"])}</strong></span>
        <span><em>点赞</em><strong>${formatNumber(item["点赞量"])}</strong></span>
        <span><em>回复</em><strong>${formatNumber(item["回复互动量"])}</strong></span>
      </div>
    </div>
  `;
}

function renderWeeklySummary() {
  const range = getWeekRange(selectedDate || `${currentMonth}-01`);
  const rows = allRows.filter((item) => item["日期"] >= range.start && item["日期"] <= range.end);
  const totals = rows.reduce(
    (sum, item) => {
      sum.impressions += metricValue(item, "Twitter阅读量");
      sum.likes += metricValue(item, "点赞量");
      sum.replies += metricValue(item, "回复互动量");
      return sum;
    },
    { impressions: 0, likes: 0, replies: 0 },
  );

  els.weekRangeTitle.textContent = `${formatDate(range.start)} - ${formatDate(range.end)}`;
  els.weekImpressions.textContent = formatNumber(totals.impressions);
  els.weekLikes.textContent = formatNumber(totals.likes);
  els.weekReplies.textContent = formatNumber(totals.replies);
}

function applyFilters() {
  filteredRows = allRows.filter((item) => eventMonth(item) === currentMonth);

  if (!selectedDate || !filteredRows.some((item) => item["日期"] === selectedDate)) {
    selectedDate = filteredRows[0]?.["日期"] || "";
    selectedEvent = filteredRows.find((item) => item["日期"] === selectedDate) || null;
  }

  renderCalendar();
  renderEventList();
  renderWeeklySummary();
}

function currentMonthIndex() {
  return monthLabels.findIndex(([value]) => value === currentMonth);
}

function updateMonthNav() {
  const index = currentMonthIndex();
  els.prevMonth.disabled = index <= 0;
  els.nextMonth.disabled = index < 0 || index >= monthLabels.length - 1;
}

function switchMonth(direction) {
  const index = currentMonthIndex();
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= monthLabels.length) return;
  currentMonth = monthLabels[nextIndex][0];
  const monthRows = allRows.filter((item) => eventMonth(item) === currentMonth);
  selectedDate = monthRows[0]?.["日期"] || "";
  selectedEvent = monthRows[0] || null;
  if (els.dateFilter) els.dateFilter.value = selectedDate;
  applyFilters();
}

function renderCalendar() {
  const month = currentMonth;
  const [year, monthNumber] = month.split("-").map(Number);
  const label = monthLabels.find(([value]) => value === month)?.[1] || "运营日历";
  els.calendarTitle.textContent = label;
  updateMonthNav();

  if (!year || !monthNumber) {
    els.calendar.innerHTML = '<div class="empty-state">没有可显示的日历数据。</div>';
    return;
  }

  const first = new Date(year, monthNumber - 1, 1);
  const daysInMonth = new Date(year, monthNumber, 0).getDate();
  const leading = first.getDay() === 0 ? 6 : first.getDay() - 1;
  const weekdayHtml = ["一", "二", "三", "四", "五", "六", "日"]
    .map((day) => `<div class="weekday">周${day}</div>`)
    .join("");

  const monthRows = filteredRows.filter((item) => eventMonth(item) === month);
  const byDate = monthRows.reduce((map, item) => {
    const date = item["日期"];
    if (!map.has(date)) map.set(date, []);
    map.get(date).push(item);
    return map;
  }, new Map());
  const cells = [];

  for (let i = 0; i < leading; i += 1) {
    cells.push('<button class="day empty" type="button" tabindex="-1"></button>');
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = `${year}-${String(monthNumber).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const events = byDate.get(date) || [];
    const selected = date === selectedDate ? " selected" : "";
    const hasEvents = events.length ? " has-events" : "";
    const preview = events
      .slice(0, 3)
      .map(
        (item) =>
          `<span class="mini-event${isConfirmed(item) ? " confirmed" : ""}">${escapeHtml(item["活动名称"])}</span>`,
      )
      .join("");
    cells.push(`
      <button class="day${hasEvents}${selected}" type="button" data-date="${date}">
        <span class="day-number">${day}<em class="event-count">${events.length ? `${events.length}条` : ""}</em></span>
        ${preview}
      </button>
    `);
  }

  els.calendar.innerHTML = weekdayHtml + cells.join("");
}

function renderEventList() {
  const events = filteredRows.filter((item) => item["日期"] === selectedDate);
  els.selectedDateTitle.textContent = selectedDate ? `${formatDate(selectedDate)} · ${events.length} 个动作` : "选择一个日期";

  if (!events.length) {
    els.eventList.innerHTML = '<div class="empty-state">这个日期没有活动。</div>';
    return;
  }

  if (!selectedEvent || selectedEvent["日期"] !== selectedDate) selectedEvent = events[0];

  els.eventList.innerHTML = events
    .map((item, index) => {
      const active = item === selectedEvent ? " active" : "";
      const confirmed = isConfirmed(item) ? " confirmed" : "";
      const publishedLink = getPublishedLink(item);
      return `
        <article class="event-card${active}${confirmed}" data-event-index="${index}">
          <div class="event-top">
            <span class="stage-pill">${escapeHtml(stageDisplayLabel())}</span>
            <span class="channel-pill">${escapeHtml(item["渠道"])}</span>
            ${confirmationBadge(item)}
          </div>
          <h3>${escapeHtml(item["活动名称"])}</h3>
          <div class="event-section">
            <h4>发布时间</h4>
            <p>${escapeHtml(item["日期"])} · ${escapeHtml(item["渠道"])}</p>
          </div>
          <div class="event-section">
            <h4>活动时间</h4>
            <p>${escapeHtml(item["活动时间"])}</p>
          </div>
          <div class="event-section">
            <h4>活动形式</h4>
            <p>${escapeHtml(item["活动形式"])}</p>
          </div>
          <div class="event-section">
            <h4>活动内容</h4>
            <p>${escapeHtml(item["活动内容"])}</p>
          </div>
          <div class="event-section">
            <h4>宣发文案</h4>
            <p class="post-text">${escapeHtml(item["宣发文案"])}</p>
          </div>
          <div class="price-line">
            <span class="deal">活动价 $${escapeHtml(item["活动价"])}</span>
            <span>日常 $${escapeHtml(item["日常售价"])}</span>
            <span>划线 $${escapeHtml(item["划线价"])}</span>
          </div>
          ${productDetails(item)}
          ${metricsBlock(item)}
        </article>
        <div class="event-link-editor${active}" data-link-index="${index}">
          <label>
            实际发布链接
            <input type="url" value="${escapeHtml(publishedLink)}" placeholder="粘贴已发布内容链接" data-published-input="${index}" />
          </label>
          <div class="link-actions">
            <button type="button" data-save-link="${index}">保存链接</button>
            ${
              publishedLink
                ? `<a href="${escapeHtml(publishedLink)}" target="_blank" rel="noreferrer">打开链接</a>`
                : '<span class="muted">待填写</span>'
            }
          </div>
        </div>
      `;
    })
    .join("");
}

function bindEvents() {
  els.prevMonth.addEventListener("click", () => switchMonth(-1));
  els.nextMonth.addEventListener("click", () => switchMonth(1));
  els.dateFilter.addEventListener("change", () => {
    const date = els.dateFilter.value;
    if (!date) return;
    currentMonth = date.slice(0, 7);
    selectedDate = date;
    selectedEvent = allRows.find((item) => item["日期"] === selectedDate) || null;
    applyFilters();
  });
  els.clearDateFilter.addEventListener("click", () => {
    els.dateFilter.value = "";
    selectedDate = filteredRows[0]?.["日期"] || "";
    selectedEvent = filteredRows.find((item) => item["日期"] === selectedDate) || null;
    renderCalendar();
    renderEventList();
    renderWeeklySummary();
  });

  els.calendar.addEventListener("click", (event) => {
    const button = event.target.closest(".day[data-date]");
    if (!button) return;
    selectedDate = button.dataset.date;
    if (els.dateFilter) els.dateFilter.value = selectedDate;
    selectedEvent = filteredRows.find((item) => item["日期"] === selectedDate) || null;
    renderCalendar();
    renderEventList();
    renderWeeklySummary();
  });

  els.eventList.addEventListener("click", (event) => {
    const saveButton = event.target.closest("[data-save-link]");
    if (saveButton) {
      const events = filteredRows.filter((item) => item["日期"] === selectedDate);
      const item = events[Number(saveButton.dataset.saveLink)];
      const input = els.eventList.querySelector(`[data-published-input="${saveButton.dataset.saveLink}"]`);
      if (!item || !input) return;
      setStoredPublishedLink(item, input.value);
      item["实际发布链接"] = normalizePublishedLink(input.value);
      selectedEvent = item;
      renderEventList();
      syncPublishedLink(item, input.value).catch((error) => {
        console.error(error);
        els.status.textContent = "链接已本地保存，但同步到表格失败";
      });
      return;
    }

    const card = event.target.closest(".event-card[data-event-index]");
    if (!card) return;
    const events = filteredRows.filter((item) => item["日期"] === selectedDate);
    selectedEvent = events[Number(card.dataset.eventIndex)];
    renderEventList();
  });
}

async function init() {
  allRows = (await loadSheetRows()).filter(isVisibleRow).sort((a, b) => a["日期"].localeCompare(b["日期"]));
  const firstMonthWithData = monthLabels.find(([value]) => allRows.some((item) => eventMonth(item) === value))?.[0];
  currentMonth = firstMonthWithData || currentMonth;
  selectedDate = allRows.find((item) => eventMonth(item) === currentMonth)?.["日期"] || "";
  if (els.dateFilter) els.dateFilter.value = selectedDate;
  selectedEvent = allRows.find((item) => item["日期"] === selectedDate) || null;
  bindEvents();
  applyFilters();
}

init();
