<template>
  <div class="settings-view page-container">
    <!-- Toast 提示 -->
    <Transition name="fade">
      <div v-if="successMessage" class="toast-message" :class="{ error: isError }">
        <svg v-if="!isError" width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd"/>
        </svg>
        <svg v-else width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/>
        </svg>
        <span>{{ successMessage }}</span>
      </div>
    </Transition>

    <div class="page-header">
      <h1 class="page-header-title">设置</h1>
      <p class="page-header-subtitle">自定义项目、类型和偏好设置</p>
    </div>

    <div class="settings-tabs">
      <button
        v-for="tab in settingTabs"
        :key="tab.key"
        class="settings-tab"
        :class="{ active: activeTab === tab.key, editing: editingSection === tab.key }"
        @click="activeTab = tab.key"
      >
        <span>{{ tab.label }}</span>
        <span v-if="editingSection === tab.key" class="tab-dot"></span>
      </button>
    </div>

    <!-- 项目管理 -->
    <div v-show="activeTab === 'projects'" class="card setting-section">
      <div class="section-header">
        <h3>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" style="vertical-align: middle; margin-right: 8px;">
            <path d="M2 4a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V4zm2-1a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H4z"/>
          </svg>
          项目管理
        </h3>
        <div class="section-actions">
          <span v-if="isSectionEditing('projects')" class="status-badge info">编辑中</span>
          <button v-if="isSectionEditing('projects')" class="btn btn-primary btn-sm" @click="addProjectDraft">添加项目</button>
          <button v-else class="btn btn-secondary btn-sm" @click="beginSectionEdit('projects')" :disabled="hasActiveEditor">编辑</button>
        </div>
      </div>

      <template v-if="isSectionEditing('projects')">
        <div class="setting-list">
          <div v-for="project in projectDrafts" :key="project.id" class="setting-item">
            <input v-model="project.name" class="item-input" placeholder="项目名称" />
            <input v-model="project.keywordsText" class="item-input keywords" placeholder="识别关键词 (逗号分隔)" />
            <button class="btn-icon delete" @click="removeProjectDraft(project.id)">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/>
              </svg>
            </button>
          </div>
          <div v-if="projectDrafts.length === 0" class="empty-settings">暂无项目，可点击上方按钮新增</div>
        </div>
        <div class="section-edit-actions">
          <button class="btn btn-secondary" @click="cancelSectionEdit('projects')">取消</button>
          <button class="btn btn-primary" @click="saveProjectsSection">保存</button>
        </div>
      </template>

      <div v-else class="readonly-list">
        <div v-for="project in displayedProjects" :key="project.id" class="readonly-item">
          <div class="readonly-main">{{ project.name }}</div>
          <div class="readonly-meta">{{ formatKeywords(project.keywords) }}</div>
        </div>
        <button
          v-if="projects.length > settingPreviewLimit"
          class="btn btn-ghost btn-sm expand-btn"
          @click="showAllProjects = !showAllProjects"
        >
          {{ showAllProjects ? '收起' : `展开更多（${projects.length - settingPreviewLimit}条）` }}
        </button>
        <div v-if="projects.length === 0" class="empty-settings">暂无项目配置</div>
      </div>
    </div>

    <!-- 工作类型管理 -->
    <div v-show="activeTab === 'workTypes'" class="card setting-section">
      <div class="section-header">
        <h3>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" style="vertical-align: middle; margin-right: 8px;">
            <path fill-rule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/>
          </svg>
          工作类型
        </h3>
        <div class="section-actions">
          <span v-if="isSectionEditing('workTypes')" class="status-badge info">编辑中</span>
          <button v-if="isSectionEditing('workTypes')" class="btn btn-primary btn-sm" @click="addWorkTypeDraft">添加类型</button>
          <button v-else class="btn btn-secondary btn-sm" @click="beginSectionEdit('workTypes')" :disabled="hasActiveEditor">编辑</button>
        </div>
      </div>

      <template v-if="isSectionEditing('workTypes')">
        <div class="setting-list">
          <div v-for="type in workTypeDrafts" :key="type.id" class="setting-item">
            <input v-model="type.name" class="item-input" placeholder="类型名称" />
            <input v-model="type.keywordsText" class="item-input keywords" placeholder="识别关键词 (逗号分隔)" />
            <button class="btn-icon delete" @click="removeWorkTypeDraft(type.id)">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/>
              </svg>
            </button>
          </div>
          <div v-if="workTypeDrafts.length === 0" class="empty-settings">暂无工作类型，可点击上方按钮新增</div>
        </div>
        <div class="section-edit-actions">
          <button class="btn btn-secondary" @click="cancelSectionEdit('workTypes')">取消</button>
          <button class="btn btn-primary" @click="saveWorkTypesSection">保存</button>
        </div>
      </template>

      <div v-else class="readonly-list">
        <div v-for="type in displayedWorkTypes" :key="type.id" class="readonly-item">
          <div class="readonly-main">{{ type.name }}</div>
          <div class="readonly-meta">{{ formatKeywords(type.keywords) }}</div>
        </div>
        <button
          v-if="workTypes.length > settingPreviewLimit"
          class="btn btn-ghost btn-sm expand-btn"
          @click="showAllWorkTypes = !showAllWorkTypes"
        >
          {{ showAllWorkTypes ? '收起' : `展开更多（${workTypes.length - settingPreviewLimit}条）` }}
        </button>
        <div v-if="workTypes.length === 0" class="empty-settings">暂无工作类型配置</div>
      </div>
    </div>

    <!-- 钉钉配置 -->
    <div v-show="activeTab === 'dingtalk'" class="card setting-section">
      <div class="section-header">
        <h3>
          <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" style="vertical-align: middle; margin-right: 8px;">
            <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/>
          </svg>
          钉钉机器人配置
        </h3>
        <div class="section-actions">
          <span v-if="isSectionEditing('dingtalk')" class="status-badge info">编辑中</span>
          <button v-else class="btn btn-secondary btn-sm" @click="beginSectionEdit('dingtalk')" :disabled="hasActiveEditor">编辑</button>
        </div>
      </div>

      <template v-if="isSectionEditing('dingtalk')">
        <div class="dingtalk-config">
          <div class="input-group">
            <label>Webhook URL</label>
            <input
              v-model="dingtalkConfig.webhookUrl"
              type="text"
              placeholder="https://oapi.dingtalk.com/robot/send?access_token=YOUR_TOKEN"
              class="config-input"
            />
          </div>
          <div class="input-group">
            <label>加签密钥 (Secret，可选)</label>
            <input
              v-model="dingtalkConfig.secret"
              type="password"
              placeholder="SEC开头的密钥"
              class="config-input"
            />
          </div>
          <div class="section-inline-actions">
            <button class="btn btn-secondary" @click="testDingTalk" :disabled="isTesting">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" style="vertical-align: middle; margin-right: 6px;">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clip-rule="evenodd"/>
              </svg>
              {{ isTesting ? '测试中...' : '发送测试消息' }}
            </button>
            <button class="btn btn-secondary" @click="testDingTalkReminder" :disabled="isTestingReminder">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" style="vertical-align: middle; margin-right: 6px;">
                <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6z"/>
              </svg>
              {{ isTestingReminder ? '测试中...' : '发送测试提醒' }}
            </button>
          </div>
        </div>
        <div class="section-edit-actions">
          <button class="btn btn-secondary" @click="cancelSectionEdit('dingtalk')">取消</button>
          <button class="btn btn-primary" @click="saveDingtalkSection">保存</button>
        </div>
      </template>

      <div v-else class="readonly-grid">
        <div class="summary-item">
          <span class="summary-label">Webhook</span>
          <span class="summary-value">{{ dingtalk.webhookUrl ? maskSensitiveText(dingtalk.webhookUrl, 18) : '未配置' }}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">加签密钥</span>
          <span class="summary-value">{{ dingtalk.secret ? '已配置' : '未配置' }}</span>
        </div>
      </div>
    </div>

    <!-- 企业邮箱草稿箱配置 -->
    <div v-show="activeTab === 'mail'" class="card setting-section">
      <div class="section-header">
        <h3>
          <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" style="vertical-align: middle; margin-right: 8px;">
            <path d="M2.94 6.34A2 2 0 014.76 5h10.48a2 2 0 011.82 1.34L10 10.88 2.94 6.34z"/>
            <path d="M2 7.55v6.7A1.75 1.75 0 003.75 16h12.5A1.75 1.75 0 0018 14.25v-6.7l-7.37 4.73a1.25 1.25 0 01-1.26 0L2 7.55z"/>
          </svg>
          阿里企业邮箱草稿箱
        </h3>
        <div class="section-actions">
          <span v-if="isSectionEditing('mail')" class="status-badge info">编辑中</span>
          <button v-else class="btn btn-secondary btn-sm" @click="beginSectionEdit('mail')" :disabled="hasActiveEditor">编辑</button>
        </div>
      </div>

      <template v-if="isSectionEditing('mail')">
        <div class="dingtalk-config">
          <div class="input-group">
            <label>邮箱账号</label>
            <input
              v-model="mailConfig.account"
              type="text"
              placeholder="例如：name@gancao.com"
              class="config-input"
            />
          </div>
          <div class="input-row">
            <div class="input-group">
              <label>IMAP 服务器</label>
              <input
                v-model="mailConfig.imapHost"
                type="text"
                placeholder="imap.qiye.aliyun.com"
                class="config-input"
              />
            </div>
            <div class="input-group input-group-sm">
              <label>端口</label>
              <input
                v-model.number="mailConfig.imapPort"
                type="number"
                min="1"
                placeholder="993"
                class="config-input"
              />
            </div>
          </div>
          <div class="input-group">
            <label>安全密码</label>
            <input
              v-model="mailConfig.password"
              type="password"
              placeholder="输入三方客户端安全密码"
              class="config-input"
            />
          </div>
          <div class="input-row">
            <div class="input-group">
              <label>草稿箱文件夹</label>
              <input
                v-model="mailConfig.draftsMailbox"
                type="text"
                placeholder="Drafts 或 草稿箱"
                class="config-input"
              />
            </div>
            <div class="input-group">
              <label>邮箱网页地址</label>
              <input
                v-model="mailConfig.webmailUrl"
                type="text"
                placeholder="例如：https://mail.gancao.com/alimail/"
                class="config-input"
              />
            </div>
          </div>
          <div class="input-group">
            <label>默认收件人</label>
            <input
              v-model="mailConfig.defaultTo"
              type="text"
              placeholder="多个邮箱用英文逗号分隔"
              class="config-input"
            />
          </div>
          <div class="input-row">
            <div class="input-group">
              <label>默认抄送</label>
              <input
                v-model="mailConfig.defaultCc"
                type="text"
                placeholder="可选，多个邮箱用英文逗号分隔"
                class="config-input"
              />
            </div>
            <div class="input-group">
              <label>默认密送</label>
              <input
                v-model="mailConfig.defaultBcc"
                type="text"
                placeholder="可选，多个邮箱用英文逗号分隔"
                class="config-input"
              />
            </div>
          </div>
          <div class="schedule-hint">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" style="vertical-align: middle; margin-right: 4px;">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zm1 3a1 1 0 00-1 1v5a1 1 0 102 0v-5a1 1 0 00-1-1z" clip-rule="evenodd"/>
            </svg>
            <span>当前版本通过 IMAP 写入阿里邮箱草稿箱，系统不会主动拼接签名；是否显示签名取决于阿里邮箱侧。</span>
          </div>
        </div>
        <div class="section-edit-actions">
          <button class="btn btn-secondary" @click="cancelSectionEdit('mail')">取消</button>
          <button class="btn btn-primary" @click="saveMailSection">保存</button>
        </div>
      </template>

      <div v-else class="readonly-grid">
        <div class="summary-item">
          <span class="summary-label">邮箱账号</span>
          <span class="summary-value">{{ mail.account || '未配置' }}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">IMAP</span>
          <span class="summary-value">{{ mail.imapHost ? `${mail.imapHost}:${mail.imapPort}` : '未配置' }}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">草稿箱</span>
          <span class="summary-value">{{ mail.draftsMailbox || '未配置' }}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">默认收件人</span>
          <span class="summary-value">{{ mail.defaultTo || '未配置' }}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">邮箱网页</span>
          <span class="summary-value">{{ mail.webmailUrl || '未配置' }}</span>
        </div>
      </div>
    </div>

    <!-- 邮件模板与签名 -->
    <div v-show="activeTab === 'mailDesign'" class="card setting-section mail-design-section">
      <div class="section-header">
        <h3>
          <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" style="vertical-align: middle; margin-right: 8px;">
            <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V8.414A2 2 0 0017.414 7L13 2.586A2 2 0 0011.586 2H4zm7 1.414L15.586 9H12a1 1 0 01-1-1V4.414z"/>
          </svg>
          邮件模板与签名
        </h3>
        <div class="section-actions">
          <span v-if="isSectionEditing('mailDesign')" class="status-badge info">编辑中</span>
          <button v-else class="btn btn-secondary btn-sm" @click="beginSectionEdit('mailDesign')" :disabled="hasActiveEditor">编辑</button>
        </div>
      </div>

      <div class="mail-design-workbench" :class="{ editing: isSectionEditing('mailDesign') }">
        <div class="mail-preview-config">
          <template v-if="isSectionEditing('mailDesign')">
            <div class="mail-config-lines">
              <div class="module-block">
                <div class="module-block-title">模板管理</div>
                <div class="config-line">
                  <label class="config-line-label">默认模板</label>
                  <div class="config-line-control">
                    <select v-model="mailDesignTemplateKey" class="config-input">
                      <option v-for="template in mailTemplateOptions" :key="template.key" :value="template.key">
                        {{ template.name }}
                      </option>
                    </select>
                  </div>
                </div>
              <div class="template-list">
                <div
                  v-for="template in mailTemplateOptions"
                  :key="template.key"
                  class="template-card"
                  :class="{ active: mailDesignTemplateKey === template.key }"
                >
                  <div class="template-card-title">{{ template.name }}</div>
                </div>
              </div>
            </div>

              <div class="module-block">
                <div class="module-block-title">模板文案</div>
                <div class="config-line">
                  <label class="config-line-label">标题后缀</label>
                  <div class="config-line-control">
                    <input
                      v-model="mailTemplateConfig.titleSuffix"
                      type="text"
                      placeholder="例如：厚朴汤 部门工作周报"
                      class="config-input"
                    />
                  </div>
                </div>
                <div class="config-line">
                  <label class="config-line-label">红色副标题</label>
                  <div class="config-line-control">
                    <input
                      v-model="mailTemplateConfig.subtitle"
                      type="text"
                      placeholder="例如：降本增效、协同攻坚、高质量发展"
                      class="config-input"
                    />
                  </div>
                </div>
                <div class="config-line">
                  <label class="config-line-label">横幅文案</label>
                  <div class="config-line-control">
                    <input
                      v-model="mailTemplateConfig.bannerText"
                      type="text"
                      placeholder="例如：星光闪烁，助我前行"
                      class="config-input"
                    />
                  </div>
                </div>
              </div>

              <div class="module-block">
                <div class="module-block-title">签名配置</div>
                <div class="config-line">
                  <label class="config-line-label">启用签名</label>
                  <div class="config-line-control">
                    <label class="checkbox-row">
                      <input v-model="mailSignatureConfig.enabled" type="checkbox" />
                      <span>启用邮件签名</span>
                    </label>
                  </div>
                </div>
                <div class="config-line">
                  <label class="config-line-label">展示名</label>
                  <div class="config-line-control">
                    <input v-model="mailSignatureConfig.displayName" type="text" class="config-input" placeholder="龙角草" />
                  </div>
                </div>
                <div class="config-line">
                  <label class="config-line-label">真实姓名</label>
                  <div class="config-line-control">
                    <input v-model="mailSignatureConfig.realName" type="text" class="config-input" placeholder="高宁" />
                  </div>
                </div>
                <div class="config-line">
                  <label class="config-line-label">职位</label>
                  <div class="config-line-control">
                    <input v-model="mailSignatureConfig.jobTitle" type="text" class="config-input" placeholder="JAVA开发工程师" />
                  </div>
                </div>
                <div class="config-line">
                  <label class="config-line-label">手机</label>
                  <div class="config-line-control">
                    <input v-model="mailSignatureConfig.mobile" type="text" class="config-input" placeholder="18829223750" />
                  </div>
                </div>
                <div class="config-line">
                  <label class="config-line-label">传真</label>
                  <div class="config-line-control">
                    <input v-model="mailSignatureConfig.fax" type="text" class="config-input" placeholder="0571-8893-5068" />
                  </div>
                </div>
                <div class="config-line">
                  <label class="config-line-label">网址</label>
                  <div class="config-line-control">
                    <input v-model="mailSignatureConfig.website" type="text" class="config-input" placeholder="www.gancao.com" />
                  </div>
                </div>
                <div class="config-line">
                  <label class="config-line-label">公司</label>
                  <div class="config-line-control">
                    <input v-model="mailSignatureConfig.company" type="text" class="config-input" placeholder="杭州甘之草科技股份有限公司" />
                  </div>
                </div>
                <div class="config-line">
                  <label class="config-line-label">地址</label>
                  <div class="config-line-control">
                    <input v-model="mailSignatureConfig.address" type="text" class="config-input" placeholder="杭州市聚工路11号创伟科技园B幢10层" />
                  </div>
                </div>
              </div>
            </div>
            <div class="section-edit-actions">
              <button class="btn btn-secondary" @click="cancelSectionEdit('mailDesign')">取消</button>
              <button class="btn btn-primary" @click="saveMailDesignSection">保存</button>
            </div>
          </template>

          <div v-else class="mail-config-lines readonly">
            <div class="module-block">
              <div class="module-block-title">模板管理</div>
              <div class="config-line">
                <span class="config-line-label">默认模板</span>
                <div class="config-line-value highlight">{{ getMailTemplateName(mail.defaultTemplate) }}</div>
              </div>
              <div class="template-list">
                <div
                  v-for="template in mailTemplateOptions"
                  :key="template.key"
                  class="template-card"
                  :class="{ active: mail.defaultTemplate === template.key }"
                >
                  <div class="template-card-title">{{ template.name }}</div>
                </div>
              </div>
            </div>

            <div class="module-block">
              <div class="module-block-title">模板文案</div>
              <div class="config-line">
                <span class="config-line-label">标题后缀</span>
                <div class="config-line-value">{{ mailTemplate.titleSuffix }}</div>
              </div>
              <div class="config-line">
                <span class="config-line-label">红色副标题</span>
                <div class="config-line-value">{{ mailTemplate.subtitle }}</div>
              </div>
              <div class="config-line">
                <span class="config-line-label">横幅文案</span>
                <div class="config-line-value">{{ mailTemplate.bannerText }}</div>
              </div>
            </div>

            <div class="module-block">
              <div class="module-block-title">签名配置</div>
              <div class="config-line">
                <span class="config-line-label">签名状态</span>
                <div class="config-line-value">{{ mailSignature.enabled ? '已启用' : '已关闭' }}</div>
              </div>
              <div class="config-line">
                <span class="config-line-label">姓名 / 职位</span>
                <div class="config-line-value">{{ signatureSummary }}</div>
              </div>
              <div class="config-line">
                <span class="config-line-label">手机</span>
                <div class="config-line-value">{{ mailSignature.mobile || '未配置' }}</div>
              </div>
              <div class="config-line">
                <span class="config-line-label">传真</span>
                <div class="config-line-value">{{ mailSignature.fax || '未配置' }}</div>
              </div>
              <div class="config-line">
                <span class="config-line-label">网址</span>
                <div class="config-line-value">{{ mailSignature.website || '未配置' }}</div>
              </div>
              <div class="config-line">
                <span class="config-line-label">公司</span>
                <div class="config-line-value">{{ mailSignature.company || '未配置' }}</div>
              </div>
              <div class="config-line">
                <span class="config-line-label">地址</span>
                <div class="config-line-value">{{ mailSignature.address || '未配置' }}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="mail-preview-stage">
          <div class="mail-preview-panel">
          <div class="preview-header">
            <div>
              <div class="preview-title">完整邮件预览</div>
              <div class="preview-subtitle">{{ mailPreviewSubject || '正在生成预览主题...' }}</div>
            </div>
            <div class="preview-actions">
              <span v-if="isMailPreviewLoading" class="status-badge info">预览生成中</span>
              <button class="btn btn-secondary btn-sm" @click="openPreviewModal">
                放大预览
              </button>
            </div>
          </div>
          <div v-if="mailPreviewError" class="preview-error">{{ mailPreviewError }}</div>
          <div v-else class="mail-preview-paper">
            <iframe
              class="mail-preview-frame"
              :srcdoc="mailPreviewHtml"
              title="邮件模板与签名预览"
            ></iframe>
          </div>
        </div>
        </div>
      </div>
    </div>

    <!-- 定时推送 -->
    <div v-show="activeTab === 'scheduledTasks'" class="card setting-section">
      <div class="section-header">
        <h3>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" style="vertical-align: middle; margin-right: 8px;">
            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"/>
          </svg>
          定时任务配置
        </h3>
        <button class="btn btn-primary btn-sm" @click="showAddTaskModal = true" :disabled="!dingtalk.webhookUrl">
          添加任务
        </button>
      </div>

      <div v-if="!dingtalk.webhookUrl" class="dingtalk-warning">
        <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" style="vertical-align: middle; margin-right: 8px;">
          <path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/>
        </svg>
        请先配置钉钉 Webhook
      </div>

      <div class="scheduled-tasks">
        <div v-for="task in scheduledTasks" :key="task.id" class="task-item" :class="{ 'system-task': task.isSystemTask }">
          <div class="task-info" @click="!task.isSystemTask && editTask(task)" :class="{ 'system-task': task.isSystemTask }">
            <div class="task-type-badge" :class="task.type">
              {{ task.type === 'report' ? '周报' : task.type === 'reminder' ? '提醒' : '转换' }}
            </div>
            <div class="task-content">
              <div class="task-title">
                {{ task.name }}
                <span v-if="task.isSystemTask" class="system-badge">系统任务</span>
              </div>
              <div class="task-detail">{{ getTaskSchedule(task) }}</div>
            </div>
          </div>
          <div class="task-actions">
            <label class="toggle-switch">
              <input
                type="checkbox"
                :checked="task.enabled"
                @change="toggleTask(task.id, $event.target.checked)"
                :disabled="!dingtalk.webhookUrl || task.isSystemTask"
              />
              <span class="toggle-slider"></span>
            </label>
            <button
              class="btn-icon delete"
              @click="deleteTask(task.id)"
              :disabled="!dingtalk.webhookUrl || task.isSystemTask"
              :title="task.isSystemTask ? '系统任务无法删除' : '删除任务'"
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M8.25 7.638a.75.75 0 01.75-.75h1.5a.75.75 0 01.75.75v1.5a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v-1.5zm3.75 0a.75.75 0 01.75-.75h1.5a.75.75 0 01.75.75v1.5a.75.75 0 01-.75.75h-1.5a.75.75 0 01-.75-.75v-1.5z" clip-rule="evenodd"/>
                <path d="M5.5 4h9a.5.5 0 01.5.5v1h-10v-1a.5.5 0 01.5-.5zm-2 2h13v8.5a2.5 2.5 0 01-2.5 2.5h-6a2.5 2.5 0 01-2.5-2.5v-8.5zM7 7a1 1 0 012 0v6a1 1 0 11-2 0v-6zm4 0a1 1 0 012 0v6a1 1 0 11-2 0v-6z"/>
              </svg>
            </button>
          </div>
        </div>
        <div v-if="scheduledTasks.length === 0" class="empty-tasks">
          {{ dingtalk.webhookUrl ? '暂无定时任务，点击上方按钮添加' : '请先配置钉钉' }}
        </div>
      </div>
      <div class="task-hint">
        <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" style="vertical-align: middle; margin-right: 4px;">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zm1 3a1 1 0 00-1 1v5a1 1 0 102 0v-5a1 1 0 00-1-1z" clip-rule="evenodd"/>
        </svg>
        <span>点击任务卡片可编辑配置 · 定时任务由后端执行</span>
      </div>
    </div>

    <!-- 添加/编辑任务弹窗 -->
    <Transition name="scale">
      <div v-if="showAddTaskModal || editingTask" class="modal-overlay" @click="closeTaskModal">
        <div class="modal-content task-modal" @click.stop>
          <div class="modal-header">
            <h3>{{ editingTask ? '编辑定时任务' : '添加定时任务' }}</h3>
            <button class="close-btn" @click="closeTaskModal" aria-label="关闭">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"/>
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>任务名称</label>
              <input v-model="taskForm.name" type="text" class="form-input" placeholder="例如：每周五周报推送" />
            </div>
            <div class="form-group">
              <label>任务类型</label>
              <div class="radio-group">
                <label class="radio-option">
                  <input type="radio" v-model="taskForm.type" value="report" />
                  <span>
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" style="vertical-align: text-bottom; margin-right: 4px;">
                      <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/>
                    </svg>
                    周报推送
                  </span>
                </label>
                <label class="radio-option">
                  <input type="radio" v-model="taskForm.type" value="reminder" />
                  <span>
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" style="vertical-align: text-bottom; margin-right: 4px;">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
                    </svg>
                    填写提醒
                  </span>
                </label>
              </div>
            </div>
            <div class="form-group">
              <label>执行时间</label>
              <div class="time-inputs">
                <select v-model="taskForm.hour" class="form-input">
                  <option v-for="h in 24" :key="h-1" :value="h-1">{{ String(h-1).padStart(2, '0') }}时</option>
                </select>
                <select v-model="taskForm.minute" class="form-input">
                  <option v-for="m in 60" :key="m-1" :value="m-1">{{ String(m-1).padStart(2, '0') }}分</option>
                </select>
              </div>
              <div class="schedule-hint">
                <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" style="vertical-align: middle; margin-right: 4px;">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zm1 3a1 1 0 00-1 1v5a1 1 0 102 0v-5a1 1 0 00-1-1z" clip-rule="evenodd"/>
                </svg>
                <span v-if="taskForm.type === 'reminder'">工作日（考虑节假日）每天提醒</span>
                <span v-else>工作周最后一天自动推送</span>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="closeTaskModal">取消</button>
            <button class="btn btn-primary" @click="saveTask">保存</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 数据管理 -->
    <div v-show="activeTab === 'data'" class="card setting-section">
      <div class="section-header">
        <h3>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" style="vertical-align: middle; margin-right: 8px;">
            <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"/>
          </svg>
          数据管理
        </h3>
      </div>
      <div class="data-actions">
        <div class="action-row">
          <span>导出所有数据备份</span>
          <button class="btn btn-secondary" @click="handleExport">导出 JSON</button>
        </div>
        <div class="action-row">
          <span>导入数据备份</span>
          <label class="btn btn-secondary upload-btn">
            导入 JSON
            <input type="file" accept=".json" @change="handleImport" hidden />
          </label>
        </div>
        <div class="action-row danger">
          <span>重置所有设置</span>
          <button class="btn btn-ghost danger" @click="handleReset">重置默认</button>
        </div>
      </div>
    </div>

    <!-- 自定义弹窗 -->
    <ConfirmDialog
      v-model:show="dialogStore.confirmShow"
      :title="dialogStore.confirmTitle || '确认'"
      :message="dialogStore.confirmMessage"
      :details="dialogStore.confirmDetails"
      @confirm="dialogStore.confirmHandle(true)"
      @cancel="dialogStore.confirmHandle(false)"
    />

    <PromptDialog
      v-model:show="dialogStore.promptShow"
      :title="dialogStore.promptTitle || '输入'"
      :message="dialogStore.promptMessage"
      :placeholder="dialogStore.promptPlaceholder"
      @confirm="dialogStore.promptHandle"
      @cancel="dialogStore.promptHandle(null)"
    />

    <Transition name="scale">
      <div v-if="showPreviewModal" class="modal-overlay preview-modal-overlay" @click="closePreviewModal">
        <div class="modal-content preview-modal-content" @click.stop>
          <div class="modal-header preview-modal-header">
            <div>
              <h3>完整邮件大预览</h3>
              <div class="preview-subtitle">{{ mailPreviewSubject || '正在生成预览主题...' }}</div>
            </div>
            <div class="preview-actions">
              <button class="btn btn-secondary btn-sm" @click="refreshMailPreview">刷新</button>
              <button class="close-btn" @click="closePreviewModal" aria-label="关闭">×</button>
            </div>
          </div>
          <div class="preview-modal-body">
            <iframe
              class="preview-modal-frame"
              :srcdoc="mailPreviewHtml"
              title="完整邮件大预览"
            ></iframe>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useSettingsStore } from '../stores/settings'
import { useDialogStore } from '../stores/dialog'
import { exportAllData, getMailTemplates, importAllData, previewMailTemplate } from '../utils/api'
import { testDingTalkConfig } from '../utils/dingtalk'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import PromptDialog from '../components/PromptDialog.vue'

const settingsStore = useSettingsStore()
const { projects, workTypes, dingtalk, mail, mailTemplate, mailTemplateConfigs, mailSignature, scheduledTasks } = storeToRefs(settingsStore)

// 弹窗（使用全局 store）
const dialogStore = useDialogStore()

const SETTINGS_ACTIVE_TAB_KEY = 'weekly_report_settings_active_tab'
const settingPreviewLimit = 5
const settingTabs = [
  { key: 'projects', label: '项目管理' },
  { key: 'workTypes', label: '工作类型' },
  { key: 'dingtalk', label: '钉钉配置' },
  { key: 'mail', label: '邮箱草稿箱' },
  { key: 'mailDesign', label: '邮件模板与签名' },
  { key: 'scheduledTasks', label: '定时任务' },
  { key: 'data', label: '数据管理' }
]
const activeTab = ref('projects')

const editingSection = ref('')
const hasActiveEditor = computed(() => Boolean(editingSection.value))
const showAllProjects = ref(false)
const showAllWorkTypes = ref(false)

const displayedProjects = computed(() => {
  if (isSectionEditing('projects') || showAllProjects.value) {
    return projects.value
  }
  return projects.value.slice(0, settingPreviewLimit)
})

const displayedWorkTypes = computed(() => {
  if (isSectionEditing('workTypes') || showAllWorkTypes.value) {
    return workTypes.value
  }
  return workTypes.value.slice(0, settingPreviewLimit)
})

const isSectionEditing = (section) => editingSection.value === section

const createDraftId = () => `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const createSettingDraftItem = () => ({ id: createDraftId(), name: '', keywordsText: '' })
const cloneSettingItems = (items = []) => items.map(item => ({
  id: item.id,
  name: item.name || '',
  keywordsText: Array.isArray(item.keywords) ? item.keywords.join(', ') : ''
}))
const normalizeSettingItems = (items = []) => items.map(item => ({
  id: String(item.id || createDraftId()),
  name: String(item.name || '').trim(),
  keywords: String(item.keywordsText || '')
    .split(',')
    .map(keyword => keyword.trim())
    .filter(Boolean)
}))
const formatKeywords = (keywords = []) => {
  const text = Array.isArray(keywords)
    ? keywords.map(keyword => String(keyword).trim()).filter(Boolean).join('、')
    : ''
  return text || '未设置关键词'
}
const maskSensitiveText = (value, visiblePrefix = 10) => {
  if (!value) return '未配置'
  if (value.length <= visiblePrefix + 6) return value
  return `${value.slice(0, visiblePrefix)}...${value.slice(-6)}`
}
const getMailTemplateName = (templateKey) => {
  const template = mailTemplateOptions.value.find(item => item.key === templateKey)
  return template?.name || '未配置'
}

const projectDrafts = ref([])
const workTypeDrafts = ref([])
const dingtalkConfig = ref({ ...dingtalk.value })
const mailConfig = ref({ ...mail.value })
const mailTemplateConfig = ref({ ...mailTemplate.value })
const mailSignatureConfig = ref({ ...mailSignature.value })
const isTesting = ref(false)
const isTestingReminder = ref(false)
const mailTemplateOptions = ref([])
const mailPreviewHtml = ref('<html><body></body></html>')
const mailPreviewSubject = ref('')
const mailPreviewError = ref('')
const isMailPreviewLoading = ref(false)
const mailPreviewTimer = ref(null)
const showPreviewModal = ref(false)

const previewReportMock = {
  weekStart: new Date().toISOString(),
  records: [
    { content: '完成周报助手邮件模板设置与签名能力开发', project: '周报助手', workType: '需求开发' },
    { content: '联调阿里邮箱草稿预览与渲染逻辑', project: '周报助手', workType: '协同' }
  ],
  plans: [
    { content: '完成设置页体验细节优化', project: '周报助手', workType: '优化' },
    { content: '补充邮件模板与签名相关测试', project: '周报助手', workType: 'Bug修复' }
  ],
  reflections: {
    gains: '统一了模板预览和草稿生成链路，减少重复维护成本。',
    losses: '预览接口需要在设置页中做更好的加载态处理。'
  }
}
const mailDesignTemplateKey = ref(mail.value.defaultTemplate)
const resolveTemplateConfig = (templateKey) => {
  const configs = mailTemplateConfigs.value || {}
  return {
    titleSuffix: '厚朴汤 部门工作周报',
    subtitle: '降本增效、协同攻坚、高质量发展',
    bannerText: '星光闪烁，助我前行',
    ...(configs[templateKey] || {})
  }
}

const syncSectionDraft = (section) => {
  if (section === 'projects') {
    projectDrafts.value = cloneSettingItems(projects.value)
  } else if (section === 'workTypes') {
    workTypeDrafts.value = cloneSettingItems(workTypes.value)
  } else if (section === 'dingtalk') {
    dingtalkConfig.value = { ...dingtalk.value }
  } else if (section === 'mail') {
    mailConfig.value = { ...mail.value }
  } else if (section === 'mailTemplate') {
    mailTemplateConfig.value = { ...resolveTemplateConfig(mail.value.defaultTemplate) }
  } else if (section === 'mailSignature') {
    mailSignatureConfig.value = { ...mailSignature.value }
  } else if (section === 'mailDesign') {
    mailDesignTemplateKey.value = mail.value.defaultTemplate
    mailTemplateConfig.value = { ...resolveTemplateConfig(mail.value.defaultTemplate) }
    mailSignatureConfig.value = { ...mailSignature.value }
  }
}

const beginSectionEdit = (section) => {
  if (hasActiveEditor.value && editingSection.value !== section) {
    return
  }
  syncSectionDraft(section)
  editingSection.value = section
}

const cancelSectionEdit = (section) => {
  syncSectionDraft(section)
  if (editingSection.value === section) {
    editingSection.value = ''
  }
}

watch(projects, (newVal) => {
  if (!isSectionEditing('projects')) {
    projectDrafts.value = cloneSettingItems(newVal)
  }
}, { deep: true })

watch(projects, (newVal) => {
  if (newVal.length <= settingPreviewLimit) {
    showAllProjects.value = false
  }
}, { deep: true })

watch(workTypes, (newVal) => {
  if (!isSectionEditing('workTypes')) {
    workTypeDrafts.value = cloneSettingItems(newVal)
  }
}, { deep: true })

watch(workTypes, (newVal) => {
  if (newVal.length <= settingPreviewLimit) {
    showAllWorkTypes.value = false
  }
}, { deep: true })

watch(dingtalk, (newVal) => {
  if (!isSectionEditing('dingtalk')) {
    dingtalkConfig.value = { ...newVal }
  }
}, { deep: true })

watch(mail, (newVal) => {
  if (!isSectionEditing('mail')) {
    mailConfig.value = { ...newVal }
  }
  if (!isSectionEditing('mailDesign')) {
    mailDesignTemplateKey.value = newVal.defaultTemplate
  }
}, { deep: true })

watch(mailTemplate, (newVal) => {
  if (!isSectionEditing('mailTemplate') && !isSectionEditing('mailDesign')) {
    mailTemplateConfig.value = { ...newVal }
  }
}, { deep: true })

watch(mailSignature, (newVal) => {
  if (!isSectionEditing('mailSignature')) {
    mailSignatureConfig.value = { ...newVal }
  }
}, { deep: true })

watch(activeTab, (newVal) => {
  localStorage.setItem(SETTINGS_ACTIVE_TAB_KEY, newVal)
  if (newVal === 'mailDesign') {
    scheduleMailPreview()
  }
})

// 定时任务弹窗状态
const showAddTaskModal = ref(false)
const editingTask = ref(null)
const taskForm = ref({
  id: null,
  name: '',
  type: 'report',
  hour: 15,
  minute: 0,
  dayOfWeek: '5'
})

// Toast 状态
const successMessage = ref('')
const isError = ref(false)
const toastTimer = ref(null)

// 显示 Toast 提示
const showToast = (message, isErrorMessage = false) => {
  successMessage.value = message
  isError.value = isErrorMessage

  if (toastTimer.value) {
    clearTimeout(toastTimer.value)
  }

  toastTimer.value = setTimeout(() => {
    successMessage.value = ''
    isError.value = false
  }, 3000)
}

// 初始化
onMounted(async () => {
  const savedTab = localStorage.getItem(SETTINGS_ACTIVE_TAB_KEY)
  if (settingTabs.some(tab => tab.key === savedTab)) {
    activeTab.value = savedTab
  }

  // 重新从 API 获取设置数据，确保与后端同步
  await settingsStore.init()
  syncSectionDraft('projects')
  syncSectionDraft('workTypes')
  syncSectionDraft('dingtalk')
  syncSectionDraft('mail')
  syncSectionDraft('mailTemplate')
  syncSectionDraft('mailSignature')
  syncSectionDraft('mailDesign')
  await settingsStore.fetchScheduledTasks()
  try {
    const templates = await getMailTemplates()
    if (Array.isArray(templates) && templates.length > 0) {
      mailTemplateOptions.value = templates
      const matchedTemplate = templates.find(template => template.key === mail.value.defaultTemplate)
      mailDesignTemplateKey.value = matchedTemplate?.key || templates[0].key
    }
  } catch (error) {
    console.error('[SettingsView] 获取邮件模板列表失败:', error)
    mailTemplateOptions.value = [{ key: 'gancao-department-weekly-report', name: '厚朴汤部门周报模板' }]
  }
  scheduleMailPreview()
})

const validateNamedDrafts = (items, label) => {
  const hasEmptyName = items.some(item => !String(item.name || '').trim())
  if (hasEmptyName) {
    showToast(`请先填写完整的${label}名称，或删除空白项`, true)
    return false
  }
  return true
}

const saveProjectsSection = async () => {
  if (!validateNamedDrafts(projectDrafts.value, '项目')) return

  try {
    await settingsStore.setProjects(normalizeSettingItems(projectDrafts.value))
    editingSection.value = ''
    showToast('项目设置已保存')
  } catch (error) {
    showToast(`保存失败: ${error.message}`, true)
  }
}

const saveWorkTypesSection = async () => {
  if (!validateNamedDrafts(workTypeDrafts.value, '工作类型')) return

  try {
    await settingsStore.setWorkTypes(normalizeSettingItems(workTypeDrafts.value))
    editingSection.value = ''
    showToast('工作类型已保存')
  } catch (error) {
    showToast(`保存失败: ${error.message}`, true)
  }
}

const saveDingtalkSection = async () => {
  try {
    await settingsStore.updateDingtalk({ ...dingtalkConfig.value })
    editingSection.value = ''
    showToast('钉钉配置已保存')
  } catch (error) {
    showToast(`保存失败: ${error.message}`, true)
  }
}

const saveMailSection = async () => {
  try {
    await settingsStore.updateMail({ ...mailConfig.value })
    editingSection.value = ''
    showToast('企业邮箱配置已保存')
  } catch (error) {
    showToast(`保存失败: ${error.message}`, true)
  }
}

const saveMailDesignSection = async () => {
  try {
    await settingsStore.updateMail({ defaultTemplate: mailDesignTemplateKey.value })
    await settingsStore.updateMailTemplate({ templateKey: mailDesignTemplateKey.value, ...mailTemplateConfig.value })
    await settingsStore.updateMailSignature({ ...mailSignatureConfig.value })
    editingSection.value = ''
    showToast('邮件模板与签名已保存')
    scheduleMailPreview()
  } catch (error) {
    showToast(`保存失败: ${error.message}`, true)
  }
}

const saveMailTemplateSection = async () => {
  try {
    await settingsStore.updateMailTemplate({ templateKey: mailDesignTemplateKey.value, ...mailTemplateConfig.value })
    editingSection.value = ''
    showToast('邮件模板已保存')
    scheduleMailPreview()
  } catch (error) {
    showToast(`保存失败: ${error.message}`, true)
  }
}

const saveMailSignatureSection = async () => {
  try {
    await settingsStore.updateMailSignature({ ...mailSignatureConfig.value })
    editingSection.value = ''
    showToast('邮件签名已保存')
    scheduleMailPreview()
  } catch (error) {
    showToast(`保存失败: ${error.message}`, true)
  }
}

const addProjectDraft = () => {
  projectDrafts.value.push(createSettingDraftItem())
}

const removeProjectDraft = (id) => {
  projectDrafts.value = projectDrafts.value.filter(project => project.id !== id)
}

const addWorkTypeDraft = () => {
  workTypeDrafts.value.push(createSettingDraftItem())
}

const removeWorkTypeDraft = (id) => {
  workTypeDrafts.value = workTypeDrafts.value.filter(type => type.id !== id)
}

const testDingTalk = async () => {
  if (!dingtalkConfig.value.webhookUrl) {
    showToast('请先输入 Webhook URL', true)
    return
  }

  isTesting.value = true
  try {
    const result = await testDingTalkConfig(dingtalkConfig.value)
    if (result.success) {
      showToast('测试成功！请检查钉钉群是否收到测试消息。')
    } else {
      showToast(`测试失败: ${result.message}`, true)
    }
  } catch (error) {
    showToast(`测试失败: ${error.message}`, true)
  } finally {
    isTesting.value = false
  }
}

const testDingTalkReminder = async () => {
  if (!dingtalkConfig.value.webhookUrl) {
    showToast('请先输入 Webhook URL', true)
    return
  }

  isTestingReminder.value = true
  try {
    const response = await fetch('/api/dingtalk/test-reminder', {
      method: 'POST'
    })
    const result = await response.json()

    if (result.success) {
      showToast(result.message || '测试提醒已发送，请检查钉钉群')
    } else {
      showToast(result.error || '发送失败，请重试', true)
    }
  } catch (error) {
    showToast(`发送失败: ${error.message}`, true)
  } finally {
    isTestingReminder.value = false
  }
}

const buildPreviewSettingsOverride = () => ({
  mail_default_template: isSectionEditing('mailDesign')
    ? mailDesignTemplateKey.value
    : (isSectionEditing('mail') ? mailConfig.value.defaultTemplate : mail.value.defaultTemplate),
  mail_template_configs: JSON.stringify({
    ...(mailTemplateConfigs.value || {}),
    [isSectionEditing('mailDesign') ? mailDesignTemplateKey.value : mail.value.defaultTemplate]: (isSectionEditing('mailDesign') || isSectionEditing('mailTemplate'))
      ? { ...mailTemplateConfig.value }
      : { ...resolveTemplateConfig(mail.value.defaultTemplate) }
  }),
  mail_template_title_suffix: (isSectionEditing('mailDesign') || isSectionEditing('mailTemplate')) ? mailTemplateConfig.value.titleSuffix : mailTemplate.value.titleSuffix,
  mail_template_subtitle: (isSectionEditing('mailDesign') || isSectionEditing('mailTemplate')) ? mailTemplateConfig.value.subtitle : mailTemplate.value.subtitle,
  mail_template_banner_text: (isSectionEditing('mailDesign') || isSectionEditing('mailTemplate')) ? mailTemplateConfig.value.bannerText : mailTemplate.value.bannerText,
  mail_signature_enabled: (isSectionEditing('mailDesign') || isSectionEditing('mailSignature')) ? mailSignatureConfig.value.enabled : mailSignature.value.enabled,
  mail_signature_display_name: (isSectionEditing('mailDesign') || isSectionEditing('mailSignature')) ? mailSignatureConfig.value.displayName : mailSignature.value.displayName,
  mail_signature_real_name: (isSectionEditing('mailDesign') || isSectionEditing('mailSignature')) ? mailSignatureConfig.value.realName : mailSignature.value.realName,
  mail_signature_job_title: (isSectionEditing('mailDesign') || isSectionEditing('mailSignature')) ? mailSignatureConfig.value.jobTitle : mailSignature.value.jobTitle,
  mail_signature_mobile: (isSectionEditing('mailDesign') || isSectionEditing('mailSignature')) ? mailSignatureConfig.value.mobile : mailSignature.value.mobile,
  mail_signature_fax: (isSectionEditing('mailDesign') || isSectionEditing('mailSignature')) ? mailSignatureConfig.value.fax : mailSignature.value.fax,
  mail_signature_website: (isSectionEditing('mailDesign') || isSectionEditing('mailSignature')) ? mailSignatureConfig.value.website : mailSignature.value.website,
  mail_signature_company: (isSectionEditing('mailDesign') || isSectionEditing('mailSignature')) ? mailSignatureConfig.value.company : mailSignature.value.company,
  mail_signature_address: (isSectionEditing('mailDesign') || isSectionEditing('mailSignature')) ? mailSignatureConfig.value.address : mailSignature.value.address
})

const refreshMailPreview = async () => {
  if (activeTab.value !== 'mailDesign') {
    return
  }

  isMailPreviewLoading.value = true
  mailPreviewError.value = ''

  try {
    const result = await previewMailTemplate({
      templateKey: isSectionEditing('mailDesign') ? mailDesignTemplateKey.value : mail.value.defaultTemplate,
      report: previewReportMock,
      settingsOverride: buildPreviewSettingsOverride()
    })
    mailPreviewHtml.value = result.html || '<html><body></body></html>'
    mailPreviewSubject.value = result.subject || ''
  } catch (error) {
    mailPreviewError.value = `预览加载失败：${error.message}`
  } finally {
    isMailPreviewLoading.value = false
  }
}

const scheduleMailPreview = () => {
  if (mailPreviewTimer.value) {
    clearTimeout(mailPreviewTimer.value)
  }

  mailPreviewTimer.value = setTimeout(() => {
    refreshMailPreview()
  }, 250)
}

const openPreviewModal = () => {
  showPreviewModal.value = true
}

const closePreviewModal = () => {
  showPreviewModal.value = false
}

watch(mailTemplateConfig, () => {
  scheduleMailPreview()
}, { deep: true })

watch(mailSignatureConfig, () => {
  scheduleMailPreview()
}, { deep: true })

watch(mailConfig, () => {
  scheduleMailPreview()
}, { deep: true })

watch(mailDesignTemplateKey, () => {
  if (isSectionEditing('mailDesign')) {
    mailTemplateConfig.value = { ...resolveTemplateConfig(mailDesignTemplateKey.value) }
  }
  scheduleMailPreview()
})

// 定时推送管理
const toggleTask = async (id, enabled) => {
  const task = scheduledTasks.value.find(t => t.id === id)
  if (task?.isSystemTask) {
    showToast('系统任务无法修改', true)
    // 重新加载数据以恢复开关状态
    await settingsStore.fetchScheduledTasks()
    return
  }

  const success = await settingsStore.updateScheduledTask(id, enabled)
  if (success) {
    showToast(enabled ? '定时任务已启用' : '定时任务已禁用')
  } else {
    showToast('操作失败，请重试', true)
  }
}

const getTaskSchedule = (task) => {
  const time = `${String(task.hour).padStart(2, '0')}:${String(task.minute).padStart(2, '0')}`

  // 基于任务类型返回描述，不再解析 day_of_week
  if (task.type === 'reminder') {
    return `工作日（考虑节假日）每天 ${time}`
  } else if (task.type === 'report') {
    return `工作周最后一天 ${time}`
  } else if (task.type === 'convert') {
    return `新工作周开始时 ${time} 自动转换`
  } else {
    // 兜底：按 day_of_week 显示（兼容旧数据）
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    if (task.day_of_week === '*') {
      return `每天 ${time}`
    } else if (task.day_of_week.includes(',')) {
      const days = task.day_of_week.split(',').map(d => parseInt(d)).sort((a, b) => a - b)
      const dayNames = days.map(d => weekdays[d])
      return `${dayNames.join('、')} ${time}`
    } else {
      const dayIndex = parseInt(task.day_of_week)
      return `每周${weekdays[dayIndex]} ${time}`
    }
  }
}

const editTask = (task) => {
  if (task.isSystemTask) {
    showToast('系统任务无法编辑', true)
    return
  }

  editingTask.value = task
  taskForm.value = {
    id: task.id,
    name: task.name,
    type: task.type,
    hour: task.hour,
    minute: task.minute,
    dayOfWeek: task.day_of_week
  }
}

const closeTaskModal = () => {
  showAddTaskModal.value = false
  editingTask.value = null
  taskForm.value = {
    id: null,
    name: '',
    type: 'report',
    hour: 15,
    minute: 0,
    dayOfWeek: '5'
  }
}

const saveTask = async () => {
  // 验证表单
  if (!taskForm.value.name.trim()) {
    showToast('请输入任务名称', true)
    return
  }

  // 固定为每天运行，由后端运行时校验是否应该执行
  const finalTask = { ...taskForm.value }
  finalTask.dayOfWeek = '*'

  const success = await settingsStore.saveScheduledTask(finalTask)
  if (success) {
    showToast(editingTask.value ? '任务已更新' : '任务已添加')
    closeTaskModal()
  } else {
    showToast('保存失败，请重试', true)
  }
}

const deleteTask = async (id) => {
  const task = scheduledTasks.value.find(t => t.id === id)
  if (task?.isSystemTask) {
    showToast('系统任务无法删除', true)
    return
  }

  const confirmed = await dialogStore.confirm({
    message: '确定要删除这个定时任务吗？'
  })
  if (!confirmed) return

  const success = await settingsStore.deleteScheduledTask(id)
  if (success) {
    showToast('任务已删除')
  } else {
    showToast('删除失败，请重试', true)
  }
}

// 数据管理
const handleExport = async () => {
  const data = await exportAllData()
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `weekly_report_backup_${new Date().toISOString().split('T')[0]}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

const handleImport = async (e) => {
  const file = e.target.files[0]
  if (!file) return

  try {
    const text = await file.text()
    const success = await importAllData(text)
    if (success) {
      showToast('导入成功！页面将刷新。')
      setTimeout(() => {
        location.reload()
      }, 1000)
    } else {
      showToast('导入失败，请检查文件格式。', true)
    }
  } catch (err) {
    console.error(err)
    showToast('读取文件失败', true)
  }
}

const handleReset = async () => {
  const confirmed = await dialogStore.confirm({
    message: '确定要重置所有设置吗？该操作不可恢复。'
  })
  if (confirmed) {
    await settingsStore.resetToDefault()
    editingSection.value = ''
    syncSectionDraft('projects')
    syncSectionDraft('workTypes')
    syncSectionDraft('dingtalk')
    syncSectionDraft('mail')
    syncSectionDraft('mailTemplate')
    syncSectionDraft('mailSignature')
    scheduleMailPreview()
    showToast('已重置为默认设置')
  }
}

const signatureSummary = computed(() => {
  const effective = isSectionEditing('mailSignature') ? mailSignatureConfig.value : mailSignature.value
  const name = [effective.displayName, effective.realName ? `（${effective.realName}）` : ''].join('')
  const title = effective.jobTitle ? ` / ${effective.jobTitle}` : ''
  return `${name}${title}`.trim() || '未配置'
})
</script>

<style lang="scss" scoped>
@use '../assets/styles/variables.scss' as *;

// 页面容器样式（规范 #1）
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: $spacing-6;
  padding-top: $spacing-4;
  max-width: 100%;

  h1 {
    font-family: $font-family-heading;
    letter-spacing: -0.03em;
    line-height: 1.2;
    font-weight: 700;
  }

  .page-header-subtitle {
    letter-spacing: -0.01em;
    line-height: 1.5;
    margin-top: $spacing-2;
  }

  @media (min-width: $breakpoint-xl) {
    gap: $spacing-8;
  }
}

// Toast 提示
.toast-message {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: $spacing-2;
  padding: $spacing-3 $spacing-4;
  background: $accent-primary;
  color: white;
  border-radius: $radius-md;
  font-size: $font-size-sm;
  font-weight: $font-weight-medium;
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba($accent-primary, 0.3);
  z-index: $z-tooltip;

  &.error {
    background: $error;
    box-shadow: 0 4px 12px rgba($error, 0.3);
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity $transition-fast;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.settings-tabs {
  display: flex;
  gap: $spacing-2;
  margin-bottom: $spacing-6;
  padding-bottom: $spacing-2;
  overflow-x: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
}

.settings-tab {
  display: inline-flex;
  align-items: center;
  gap: $spacing-2;
  padding: $spacing-2 $spacing-4;
  border: 1px solid var(--border-color);
  border-radius: $radius-full;
  background: var(--bg-card);
  color: var(--text-secondary);
  white-space: nowrap;
  cursor: pointer;
  transition: all $transition-fast;

  &:hover {
    border-color: var(--border-color-hover);
    color: var(--text-primary);
  }

  &.active {
    background: rgba($accent-primary, 0.08);
    border-color: rgba($accent-primary, 0.35);
    color: $accent-primary;
  }

  &.editing {
    border-style: dashed;
  }
}

.tab-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: currentColor;
}

.setting-section {
  padding: $spacing-6;
  margin-bottom: $spacing-6;
}

.mail-design-section {
  overflow: visible;
  border-color: var(--border-color);
  background: var(--bg-card);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: $spacing-5;

  h3 {
    font-size: $font-size-lg;
    font-weight: $font-weight-semibold;
    color: var(--text-primary);
  }
}

.section-actions {
  display: flex;
  align-items: center;
  gap: $spacing-2;
  flex-wrap: wrap;
}

.setting-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-3;
}

.setting-item {
  display: flex;
  gap: $spacing-3;
  align-items: center;

  .item-input {
    padding: $spacing-3;
    font-size: $font-size-sm;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: $radius-md;
    color: var(--text-primary);
    transition: all $transition-fast;

    &:focus {
      outline: none;
      border-color: $accent-primary;
      box-shadow: 0 0 0 3px $accent-light;
    }

    &.keywords {
      flex: 1;
    }
  }

  .btn-icon {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: 1px solid var(--border-color);
    border-radius: $radius-md;
    cursor: pointer;
    transition: all $transition-fast;
    color: var(--text-muted);
    flex-shrink: 0;

    &:hover {
      background: var(--bg-secondary);
      color: var(--text-primary);
    }

    &.delete:hover {
      background: rgba($error, 0.1);
      color: $error;
      border-color: rgba($error, 0.3);
    }
  }
}

.readonly-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-3;
}

.readonly-item {
  padding: $spacing-4;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: $radius-md;
}

.expand-btn {
  align-self: flex-start;
}

.readonly-main {
  font-size: $font-size-sm;
  font-weight: $font-weight-semibold;
  color: var(--text-primary);
}

.readonly-meta {
  margin-top: $spacing-2;
  font-size: $font-size-xs;
  color: var(--text-secondary);
  line-height: 1.6;
}

.readonly-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: $spacing-3;
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: $spacing-2;
  padding: $spacing-4;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: $radius-md;
}

.summary-label {
  font-size: $font-size-xs;
  color: var(--text-muted);
}

.summary-value {
  font-size: $font-size-sm;
  color: var(--text-primary);
  line-height: 1.6;
  word-break: break-all;
}

.empty-settings {
  text-align: center;
  padding: $spacing-6;
  border: 1px dashed var(--border-color);
  border-radius: $radius-md;
  color: var(--text-muted);
  font-size: $font-size-sm;
}

.section-inline-actions {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-3;
}

.section-edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: $spacing-3;
  margin-top: $spacing-4;
  padding-top: $spacing-4;
  border-top: 1px solid var(--divider-color);
}

.dingtalk-config {
  display: flex;
  flex-direction: column;
  gap: $spacing-4;

  .input-row {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: $spacing-4;
  }

  .input-group {
    display: flex;
    flex-direction: column;
    gap: $spacing-2;

    &.input-group-sm {
      max-width: 180px;
    }

    label {
      font-size: $font-size-sm;
      font-weight: $font-weight-medium;
      color: var(--text-secondary);
    }

    .config-input {
      padding: $spacing-3;
      font-size: $font-size-sm;
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: $radius-md;
      color: var(--text-primary);
      font-family: $font-family-mono;
      transition: all $transition-fast;

      &:focus {
        outline: none;
        border-color: $accent-primary;
        box-shadow: 0 0 0 3px $accent-light;
      }
    }
  }

  @media (max-width: $breakpoint-md) {
    .input-row {
      grid-template-columns: 1fr;
    }

    .input-group.input-group-sm {
      max-width: none;
    }
  }
}

// 状态徽章
.status-badge {
  padding: $spacing-1 $spacing-3;
  border-radius: $radius-full;
  font-size: $font-size-xs;
  font-weight: $font-weight-medium;

  &.success {
    background: $accent-light;
    color: $accent-primary;
  }

  &.error {
    background: rgba($error, 0.15);
    color: $error;
  }

  &.warning {
    background: rgba($warning, 0.15);
    color: $warning;
  }

  &.info {
    background: rgba($accent-primary, 0.1);
    color: $accent-primary;
  }
}

.task-hint {
  display: flex;
  align-items: center;
  gap: $spacing-2;
  padding: $spacing-3;
  margin-top: $spacing-4;
  background: rgba($accent-primary, 0.05);
  border-radius: $radius-md;
  color: var(--text-secondary);
  font-size: $font-size-xs;
}

.dingtalk-warning {
  display: flex;
  align-items: center;
  gap: $spacing-2;
  padding: $spacing-3;
  margin-bottom: $spacing-4;
  background: rgba($warning, 0.1);
  border-radius: $radius-md;
  color: $warning;
  font-size: $font-size-sm;
}

.scheduled-tasks {
  display: flex;
  flex-direction: column;
  gap: $spacing-3;
}

.task-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: $spacing-4;
  padding: $spacing-4;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: $radius-md;
  transition: all $transition-fast;

  // 系统任务样式
  &.system-task {
    background: rgba($accent-primary, 0.03);
    border-color: rgba($accent-primary, 0.2);

    .task-info {
      cursor: not-allowed;

      &:hover {
        background: transparent !important;
      }
    }
  }

  .task-info {
    flex: 1;
    display: flex;
    align-items: center;
    gap: $spacing-3;
    cursor: pointer;
    padding: $spacing-2;
    margin: -$spacing-2;
    border-radius: $radius-md;
    transition: background $transition-fast;

    &:hover:not(.system-task) {
      background: var(--bg-secondary);
    }

    .task-type-badge {
      padding: $spacing-1 $spacing-2;
      border-radius: $radius-sm;
      font-size: $font-size-xs;
      font-weight: $font-weight-medium;
      flex-shrink: 0;

      &.report {
        background: rgba($accent-primary, 0.1);
        color: $accent-primary;
      }

      &.reminder {
        background: rgba($warning, 0.1);
        color: $warning;
      }

      &.convert {
        background: rgba($info, 0.1);
        color: $info;
      }
    }

    .task-content {
      flex: 1;

      .task-title {
        font-size: $font-size-sm;
        font-weight: $font-weight-medium;
        color: var(--text-primary);
        margin-bottom: $spacing-1;
        display: flex;
        align-items: center;
        gap: $spacing-2;
      }

      .task-detail {
        font-size: $font-size-xs;
        color: var(--text-secondary);
      }
    }
  }

  .task-actions {
    display: flex;
    align-items: center;
    gap: $spacing-2;
  }
}

.system-badge {
  padding: $spacing-1 $spacing-2;
  background: rgba($accent-primary, 0.15);
  color: $accent-primary;
  border-radius: $radius-sm;
  font-size: $font-size-xs;
  font-weight: $font-weight-medium;
}

.empty-tasks {
  text-align: center;
  padding: $spacing-8;
  color: var(--text-muted);
  font-size: $font-size-sm;
}

// 切换开关
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;

  input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .toggle-slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-color);
    transition: $transition-normal;
    border-radius: $radius-full;

    &:before {
      position: absolute;
      content: "";
      height: 18px;
      width: 18px;
      left: 2px;
      bottom: 2px;
      background-color: var(--text-muted);
      transition: $transition-normal;
      border-radius: $radius-full;
    }
  }

  input:checked + .toggle-slider {
    background-color: $accent-primary;
    border-color: $accent-primary;

    &:before {
      transform: translateX(20px);
      background-color: white;
    }
  }

  &:hover .toggle-slider {
    border-color: var(--border-color-hover);
  }
}

.data-actions {
  display: flex;
  flex-direction: column;
  gap: $spacing-3;

  .action-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: $spacing-3 0;
    border-bottom: 1px solid var(--divider-color);
    font-size: $font-size-sm;
    color: var(--text-primary);

    &:last-child {
      border-bottom: none;
    }

    &.danger {
      color: $error;

      .btn {
        color: $error;

        &:hover {
          background: rgba($error, 0.1);
        }
      }
    }
  }
}

.upload-btn {
  cursor: pointer;
  margin: 0;
}

.mail-design-workbench {
  display: grid;
  grid-template-columns: minmax(300px, 360px) minmax(0, 1fr);
  gap: $spacing-5;
  align-items: start;
}

.mail-design-workbench.editing {
  .mail-preview-config {
    border-color: rgba($accent-primary, 0.2);
    box-shadow:
      0 20px 48px rgba(15, 23, 42, 0.06),
      0 0 0 1px rgba($accent-primary, 0.06);
  }

  .config-line {
    border-color: rgba($accent-primary, 0.16);
    background: linear-gradient(180deg, rgba($accent-primary, 0.035), rgba(255, 255, 255, 0.98));
  }
}

.mail-preview-config {
  display: flex;
  flex-direction: column;
  gap: $spacing-3;
  padding: $spacing-4;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 22px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.99), rgba(248, 250, 252, 0.96));
  box-shadow: 0 14px 36px rgba(15, 23, 42, 0.05);
  position: sticky;
  top: 20px;
}

.module-block {
  display: flex;
  flex-direction: column;
  gap: $spacing-2;
  padding: $spacing-3;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 16px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 1), rgba(248, 250, 252, 0.96));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

.module-block-title {
  font-size: $font-size-xs;
  font-weight: $font-weight-semibold;
  color: var(--text-primary);
  letter-spacing: 0.01em;
}

.mail-preview-config .module-block:first-child {
  .module-block-title {
    font-size: 11px;
    color: var(--text-muted);
  }

  .config-line-label {
    font-size: 11px;
  }
}

.mail-config-lines {
  display: flex;
  flex-direction: column;
  gap: $spacing-3;
}

.config-line {
  display: grid;
  grid-template-columns: 90px minmax(0, 1fr);
  gap: $spacing-2;
  align-items: start;
  padding: $spacing-2 $spacing-3;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 12px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 252, 0.9));
  transition: all $transition-fast;
}

.config-line-label {
  font-size: $font-size-xs;
  font-weight: $font-weight-medium;
  color: var(--text-secondary);
  line-height: 1.5;
  padding-top: 10px;
}

.config-line-control {
  min-width: 0;
}

.config-line-value {
  min-height: 40px;
  display: flex;
  align-items: center;
  padding: $spacing-2 $spacing-3;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 10px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.92));
  color: var(--text-primary);
  line-height: 1.6;
  word-break: break-all;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.92);
}

.config-line-value.highlight {
  font-weight: $font-weight-medium;
}

.template-list {
  display: grid;
  gap: $spacing-2;
}

.template-card {
  padding: $spacing-2 $spacing-3;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 12px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.94));
  transition: all $transition-fast;

  &.active {
    border-color: $accent-primary;
    box-shadow: 0 0 0 2px rgba($accent-primary, 0.1), 0 12px 28px rgba($accent-primary, 0.08);
    transform: translateY(-1px);
  }
}

.mail-preview-config .module-block:first-child .template-card {
  padding: 8px 10px;
  border-radius: 10px;
}

.mail-config-lines.readonly {
  .module-block {
    background: linear-gradient(180deg, rgba(255, 255, 255, 1), rgba(248, 250, 252, 0.98));
  }

  .config-line {
    background: linear-gradient(180deg, rgba(250, 252, 255, 0.98), rgba(244, 247, 251, 0.96));
    border-color: rgba(148, 163, 184, 0.16);
  }

  .config-line-value {
    background: rgba(255, 255, 255, 0.78);
  }

  .module-block:first-child {
    .config-line {
      padding: 0;
      border: 0;
      background: transparent;
    }

    .config-line-label {
      padding-top: 8px;
    }

    .config-line-value {
      min-height: 34px;
      padding: 6px 10px;
      border-radius: 10px;
      font-size: 12px;
    }
  }
}

.template-card-title {
  font-size: $font-size-xs;
  font-weight: $font-weight-semibold;
  color: var(--text-primary);
}

.mail-preview-config .module-block:first-child .template-card-title {
  font-size: 12px;
  font-weight: $font-weight-medium;
}

.mail-preview-panel {
  min-height: 820px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 32px;
  overflow: hidden;
  background: linear-gradient(180deg, rgba(241, 245, 249, 0.92), rgba(226, 232, 240, 0.78));
  box-shadow: 0 30px 80px rgba(15, 23, 42, 0.12);
}

.mail-preview-stage {
  display: flex;
  flex-direction: column;
  gap: $spacing-4;
  min-width: 0;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: $spacing-3;
  padding: $spacing-3 $spacing-4;
  border-bottom: 1px solid rgba($accent-primary, 0.1);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(248, 250, 252, 0.84));
}

.preview-actions {
  display: flex;
  align-items: center;
  gap: $spacing-2;
}

.preview-title {
  font-size: $font-size-sm;
  font-weight: $font-weight-semibold;
  color: var(--text-primary);
}

.preview-subtitle {
  margin-top: 2px;
  font-size: 11px;
  color: var(--text-secondary);
  word-break: break-all;
}

.preview-error {
  margin: $spacing-4;
  padding: $spacing-3 $spacing-4;
  border-radius: $radius-md;
  background: rgba($error, 0.08);
  color: $error;
  font-size: $font-size-sm;
}

.mail-preview-paper {
  margin: $spacing-3;
  padding: 16px;
  border-radius: 20px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.96));
  box-shadow:
    0 12px 28px rgba(15, 23, 42, 0.05),
    inset 0 0 0 1px rgba(148, 163, 184, 0.18);
}

.mail-preview-frame {
  display: block;
  width: 100%;
  min-height: 920px;
  border: 0;
  background: #fff;
  border-radius: 16px;
}

.mail-preview-config :deep(.config-input),
.mail-preview-config .config-input {
  width: 100%;
  min-height: 40px;
  padding: 10px 12px;
  border: 1.5px solid rgba($accent-primary, 0.28);
  border-radius: 10px;
  background: linear-gradient(180deg, #ffffff, rgba(248, 250, 252, 0.98));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.94),
    0 1px 2px rgba(15, 23, 42, 0.04);
  color: var(--text-primary);
  font-size: $font-size-sm;
  transition: all $transition-fast;

  &::placeholder {
    color: var(--text-muted);
  }

  &:hover {
    border-color: rgba($accent-primary, 0.44);
    background: #fff;
  }

  &:focus {
    border-color: rgba($accent-primary, 0.72);
    background: #fff;
    box-shadow:
      0 0 0 4px rgba($accent-primary, 0.12),
      0 10px 24px rgba($accent-primary, 0.08);
  }
}

.preview-modal-overlay {
  padding: 24px;
  background: rgba(15, 23, 42, 0.58);
  backdrop-filter: blur(10px);
}

.preview-modal-content {
  width: min(1500px, calc(100vw - 48px));
  max-width: none;
  height: calc(100vh - 48px);
  border-radius: 28px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.preview-modal-header {
  flex-shrink: 0;
}

.preview-modal-body {
  flex: 1;
  min-height: 0;
  background: #e5e7eb;
}

.preview-modal-frame {
  width: 100%;
  height: 100%;
  border: 0;
  background: #fff;
}

.checkbox-row {
  display: inline-flex;
  align-items: center;
  gap: $spacing-2;
  min-height: 40px;
  font-size: $font-size-sm;
  color: var(--text-primary);

  input {
    width: 15px;
    height: 15px;
  }
}

// ========================================
// 任务弹窗样式
// ========================================

.task-modal {
  max-width: 480px;

  .modal-body {
    display: flex;
    flex-direction: column;
    gap: $spacing-4;
  }
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: $spacing-2;

  label {
    font-size: $font-size-sm;
    font-weight: $font-weight-medium;
    color: var(--text-secondary);
  }
}

.form-input {
  padding: $spacing-3;
  font-size: $font-size-sm;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: $radius-md;
  color: var(--text-primary);
  transition: all $transition-fast;

  &:focus {
    outline: none;
    border-color: $accent-primary;
    box-shadow: 0 0 0 3px $accent-light;
  }
}

.radio-group {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-2;
}

.radio-option {
  display: inline-flex;
  align-items: center;
  gap: $spacing-2;
  padding: $spacing-2 $spacing-3;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: $radius-md;
  cursor: pointer;
  transition: all $transition-fast;

  input[type="radio"] {
    cursor: pointer;
  }

  span {
    font-size: $font-size-sm;
    color: var(--text-secondary);
  }

  &:hover {
    border-color: var(--border-color-hover);
  }

  input[type="radio"]:checked + span {
    color: $accent-primary;
    font-weight: $font-weight-medium;
  }
}

.time-inputs {
  display: flex;
  gap: $spacing-3;

  .form-input {
    flex: 1;
  }
}

.schedule-hint {
  display: flex;
  align-items: center;
  gap: $spacing-2;
  margin-top: $spacing-2;
  padding: $spacing-2 $spacing-3;
  background: rgba($accent-primary, 0.05);
  border-radius: $radius-sm;
  color: var(--text-secondary);
  font-size: $font-size-xs;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: $spacing-3;
  padding: $spacing-5 $spacing-6;
  border-top: 1px solid var(--border-color);
}

.scale-enter-active,
.scale-leave-active {
  transition: all $transition-normal;
}

.scale-enter-from,
.scale-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

// 响应式
@media (max-width: $breakpoint-md) {
  .page-header {
    flex-direction: column;
    gap: $spacing-4;
  }

  .setting-section {
    padding: $spacing-4;
  }

  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: $spacing-3;
  }

  .section-actions {
    width: 100%;
  }

  .setting-item {
    flex-wrap: wrap;

    .keywords {
      width: 100%;
    }
  }

  .readonly-grid {
    grid-template-columns: 1fr;
  }

  .section-edit-actions {
    width: 100%;
    justify-content: stretch;

    .btn {
      flex: 1;
    }
  }

  .task-item {
    flex-direction: column;
    align-items: flex-start;
  }

  .mail-design-workbench {
    grid-template-columns: 1fr;
  }

  .mail-preview-config {
    position: static;
  }

  .config-line {
    grid-template-columns: 1fr;
    gap: $spacing-2;
  }

  .config-line-label {
    padding-top: 0;
  }

  .mail-preview-panel {
    min-height: 640px;
  }

  .mail-preview-frame {
    min-height: 580px;
  }

  .preview-modal-overlay {
    padding: 12px;
  }

  .preview-modal-content {
    width: calc(100vw - 24px);
    height: calc(100vh - 24px);
  }
}
</style>
