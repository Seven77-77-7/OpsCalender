# XPIN市场运营日历

这是可发布的静态网页文件包。

## 文件

- `index.html`: 网页入口
- `styles.css`: 页面样式
- `app.js`: 页面交互逻辑
- `data.js`: 本地备用日历数据
- `sync-config.js`: Google Sheet 写回接口配置
- `google_apps_script_writeback.gs`: Google Apps Script 写回接口源码

## 使用

直接打开 `index.html` 即可预览。

部署到网站时，将本目录内所有文件一起上传到同一个目录。

## 实际发布链接写回 Google Sheet

静态网页不能直接安全写入 Google Sheet，需要先部署 `google_apps_script_writeback.gs`：

1. 在 Google Apps Script 新建项目。
2. 粘贴 `google_apps_script_writeback.gs` 内容。
3. 部署为 Web App。
4. 执行身份选择拥有表格编辑权限的账号。
5. 访问权限按分享范围选择。
6. 将部署后的 Web App URL 填入 `sync-config.js`：

```js
window.XPIN_SYNC_ENDPOINT = "你的 Web App URL";
```

配置完成后，网页保存“实际发布链接”会同步写回 Google Sheet。

## 每日更新

已在 Codex 中创建每日自动化：每 24 小时读取 Google Sheet，更新本地 `data.js` 备用数据，并重新生成发布包。
