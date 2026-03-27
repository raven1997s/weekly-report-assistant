## Context

用户当前将周报复制到阿里企业邮箱使用。系统已经具备周报 Markdown、纯文本、HTML 预览等内容基础，但尚无邮件导出能力。目标是让用户在当前应用内直接把周报保存到阿里企业邮箱草稿箱，再登录网页邮箱检查后发送。

约束：

- 不在前端直接连接邮箱服务器，避免暴露账号和安全密码
- 第一阶段只支持“保存草稿”，不支持直接发信
- 优先适配阿里企业邮箱
- 保持现有周报生成链路不变

## Goals

- 在设置页保存阿里企业邮箱连接配置
- 从周报预览一键创建草稿
- 邮件正文尽量保留现有周报预览格式
- 提供清晰的错误提示与连接失败反馈

## Non-Goals

- 不实现自动发信
- 不支持多邮箱提供商
- 不在第一阶段实现多账号切换

## Architecture

### 前端

- 设置页新增“企业邮箱草稿箱”配置区域
- 周报预览新增模板选择器和“保存到阿里邮箱草稿箱”按钮
- 调用后端 API 创建草稿，前端提交当前报告内容、模板 key 与收件人信息
- 草稿创建成功后可打开配置的阿里邮箱网页地址，默认落到草稿箱页面

### 后端

- 新增邮件草稿服务模块，封装 IMAP 连接与草稿写入
- 使用 IMAP `APPEND` 将 MIME 邮件写入草稿箱，并带上 `\\Draft` 标记
- 草稿箱目录优先使用用户配置值；若为空，则尝试常见候选目录（如 `Drafts`、`草稿箱`）

### 数据存储

- 复用 `settings` 表新增以下键：
  - `mail_enabled`
  - `mail_account`
  - `mail_imap_host`
  - `mail_imap_port`
  - `mail_secure`
  - `mail_password`
  - `mail_drafts_mailbox`
  - `mail_web_url`
  - `mail_default_to`
  - `mail_default_cc`
  - `mail_default_bcc`
  - `mail_default_template`
- 密码在第一阶段按现有设置模式存入数据库，但 UI 默认掩码展示，并提示“本地保存，仅供当前系统连接邮箱使用”

### 模板策略

- 第一阶段不读取阿里邮箱现有模板列表
- 系统内置模板，并基于用户提供的真实阿里邮箱 HTML 模板正文进行重构与参数化
- 默认模板不包含邮箱签名
- 上半部分表格区域保留结构，优先填充标题与周报正文的“工作复盘与规划”内容

## API Design

### 保存邮箱配置

- 复用现有设置保存接口
- 前端提交邮箱配置字段，由后端写入 `settings`

### 创建草稿

- `POST /api/mail/drafts`

请求：

```json
{
  "reportId": "optional-report-id",
  "templateKey": "gancao-department-weekly-report",
  "subject": "2026年3月第4周 厚朴汤 部门工作周报",
  "report": {
    "records": [],
    "plans": [],
    "reflections": {}
  }
}
```

响应：

```json
{
  "success": true,
  "data": {
    "mailbox": "Drafts",
    "subject": "周报 - 2026年3月第4周"
  }
}
```

## Error Handling

- 配置不完整：提示用户先完善邮箱配置
- IMAP 登录失败：提示账号、端口或安全密码错误
- 草稿箱目录不可用：提示检查草稿箱文件夹名称
- 网络/连接超时：提示稍后重试
- 邮箱网页地址未配置：草稿仍可创建成功，但不自动跳转

## Security Considerations

- 安全密码只在后端使用，前端不参与 IMAP 直连
- 前端加载配置时默认不回显完整密码
- 后端日志不得输出密码明文

## Testing Strategy

- 单元测试：配置校验、草稿箱候选逻辑、请求参数校验
- 集成测试：创建草稿 API 的成功/失败响应
- 手动验证：使用真实阿里企业邮箱账号写入草稿箱
