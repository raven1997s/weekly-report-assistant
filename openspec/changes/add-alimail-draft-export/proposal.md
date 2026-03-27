# Change: 添加阿里企业邮箱草稿箱导出能力

## Why

当前系统支持复制周报内容，但用户最终需要将周报发送到阿里企业邮箱。手动打开邮箱、创建草稿、粘贴内容的步骤较繁琐，且富文本格式容易在复制链路中丢失。需要提供“一键保存到阿里企业邮箱草稿箱”的能力，减少手动操作成本。

## What Changes

- 新增阿里企业邮箱草稿箱导出能力
- 设置页新增企业邮箱配置项（邮箱地址、IMAP 服务器、端口、安全密码、草稿箱文件夹、默认收件人/抄送/密送、邮箱网页地址）
- 系统内置邮件模板，并基于用户提供的真实阿里邮箱 HTML 周报模板进行参数化渲染
- 后端新增“创建邮件草稿”接口，通过 IMAP 写入企业邮箱草稿箱
- 周报预览新增模板选择与“保存到阿里邮箱草稿箱”入口
- 成功创建草稿后支持打开阿里邮箱草稿箱页面，供用户复核
- 增加邮箱配置校验、连接失败提示、草稿创建结果提示

## Impact

- Affected specs: `email-draft-export`
- Affected code:
  - `src/views/SettingsView.vue`
  - `src/components/ReportPreview.vue`
  - `src/stores/settings.js`
  - `server/api.js`
  - `server/db.js`
  - 可能新增邮件服务文件，如 `server/mail.js`
- New dependency:
  - IMAP 客户端库（建议 `imapflow`）
