# Change: 新增邮件模板与签名设置能力

## Why

当前系统虽然可以生成阿里邮箱草稿，但邮件模板固定、签名依赖邮箱网页端行为，导致预览不一致、草稿内容不完整，也无法在系统内直接维护模板与签名。

## What Changes

- 在设置页新增“邮件模板”“邮件签名”两个模块
- 模板支持预览，并允许编辑固定文案
- 签名支持结构化字段编辑与实时预览
- 邮件草稿改为由系统统一渲染完整 HTML，再写入阿里邮箱草稿箱
- 新增邮件模板预览接口，供设置页实时渲染
- 不开放模板与签名原始 HTML 源码编辑

## Impact

- Affected specs: `settings-management`, `mail-draft-generation`
- Affected code:
  - `src/views/SettingsView.vue`
  - `src/stores/settings.js`
  - `src/utils/api.js`
  - `server/api.js`
  - `server/mail-templates.js`
