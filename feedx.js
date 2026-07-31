const reports = Array.isArray(window.FEEDX_REPORTS) ? window.FEEDX_REPORTS : [];

const els = {
  status: document.querySelector("#feedxStatus"),
  title: document.querySelector("#feedxTitle"),
  subtitle: document.querySelector("#feedxSubtitle"),
  metrics: document.querySelector("#feedxMetrics"),
  list: document.querySelector("#feedxReportList"),
  detail: document.querySelector("#feedxDetail"),
};

let selectedIndex = 0;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function priorityClass(priority) {
  return String(priority || "").toLowerCase();
}

function renderMetrics(report) {
  const categoryText = report.stats.categories
    .map((item) => `${item.name} ${item.builders}/${item.tweets}`)
    .join(" · ");
  els.metrics.innerHTML = `
    <div class="metric-card">
      <span>账号 / 推文</span>
      <strong>${report.stats.totalBuilders} / ${report.stats.totalTweets}</strong>
    </div>
    <div class="metric-card">
      <span>分类</span>
      <strong class="metric-text">${escapeHtml(categoryText)}</strong>
    </div>
    <div class="metric-card">
      <span>数据源</span>
      <strong class="metric-text">FeedX JSON</strong>
    </div>
  `;
}

function renderList() {
  els.list.innerHTML = reports
    .map(
      (report, index) => `
        <button class="feedx-report-button${index === selectedIndex ? " active" : ""}" type="button" data-report="${index}">
          <strong>${escapeHtml(report.date)}</strong>
          <span>${escapeHtml(report.generatedAtShanghai)} 生成</span>
        </button>
      `,
    )
    .join("");
}

function renderSection(section) {
  return `
    <section class="feedx-section">
      <div class="panel-head compact">
        <div>
          <p class="kicker">REPORT SECTION</p>
          <h2>${escapeHtml(section.title)}</h2>
        </div>
      </div>
      <div class="feedx-card-grid">
        ${section.items
          .map(
            (item) => `
              <article class="feedx-card">
                <div class="event-top">
                  <strong class="feedx-card-title">${escapeHtml(item.label)}</strong>
                  <span class="priority-pill ${priorityClass(item.priority)}">${escapeHtml(item.priority)}</span>
                </div>
                <p>${escapeHtml(item.text)}</p>
                ${
                  item.source
                    ? `<a class="table-link" href="${escapeHtml(item.source)}" target="_blank" rel="noreferrer">查看来源</a>`
                    : `<span class="muted">无直接来源链接</span>`
                }
              </article>
            `,
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderDetail() {
  const report = reports[selectedIndex];
  if (!report) {
    els.status.textContent = "暂无 FeedX 日报";
    els.title.textContent = "暂无 FeedX 日报";
    els.subtitle.textContent = "";
    els.metrics.innerHTML = "";
    els.list.innerHTML = '<div class="empty-state">还没有同步内容。</div>';
    els.detail.innerHTML = "";
    return;
  }

  els.status.textContent = report.updated ? "FeedX 已更新" : "FeedX 未更新";
  els.title.textContent = `${report.date} FeedX 日报`;
  els.subtitle.textContent = `生成于 ${report.generatedAtShanghai} 上海时间；覆盖 ${report.coverage}`;
  renderMetrics(report);
  renderList();

  els.detail.innerHTML = `
    <article class="feedx-summary-card">
      <div class="event-top">
        <span class="stage-pill">${report.updated ? "已更新" : "未更新"}</span>
        <a class="table-link" href="${escapeHtml(report.sourceUrl)}" target="_blank" rel="noreferrer">FeedX JSON</a>
      </div>
      <h2>今日判断</h2>
      <p>${escapeHtml(report.summary)}</p>
    </article>
    ${report.sections.map(renderSection).join("")}
    <section class="feedx-section">
      <div class="panel-head compact">
        <div>
          <p class="kicker">TAKEAWAYS</p>
          <h2>行动建议</h2>
        </div>
      </div>
      <ol class="takeaway-list">
        ${report.takeaways.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
      </ol>
    </section>
  `;
}

els.list.addEventListener("click", (event) => {
  const button = event.target.closest("[data-report]");
  if (!button) return;
  selectedIndex = Number(button.dataset.report);
  renderDetail();
});

renderDetail();
