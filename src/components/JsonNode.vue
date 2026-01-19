<template>
  <div class="json-node" :style="{ '--depth': depth }">
    <!-- 对象 -->
    <template v-if="isObject">
      <div v-if="depth > 0" class="json-bracket">{</div>
      <template v-if="isExpanded">
        <div v-for="(value, key) in data" :key="key" class="json-item">
          <span class="json-key">"{{ key }}":</span>
          <JsonNode :data="value" :depth="depth + 1" />
          <span v-if="!isLast(key)" class="json-comma">,</span>
        </div>
      </template>
      <div v-else class="json-collapsed" @click="toggle">
        <span class="json-toggle">{{ isExpanded ? '▼' : '▶' }}</span>
        <span class="json-preview">... {{ keyCount }} 个键 ...</span>
      </div>
      <div v-if="depth > 0" class="json-bracket">}</div>
    </template>

    <!-- 数组 -->
    <template v-else-if="isArray">
      <div v-if="depth > 0" class="json-bracket">[</div>
      <template v-if="isExpanded">
        <div v-for="(item, index) in data" :key="index" class="json-item">
          <JsonNode :data="item" :depth="depth + 1" />
          <span v-if="index < data.length - 1" class="json-comma">,</span>
        </div>
      </template>
      <div v-else class="json-collapsed" @click="toggle">
        <span class="json-toggle">{{ isExpanded ? '▼' : '▶' }}</span>
        <span class="json-preview">... {{ data.length }} 项 ...</span>
      </div>
      <div v-if="depth > 0" class="json-bracket">]</div>
    </template>

    <!-- 字符串 -->
    <span v-else-if="isString" class="json-string">"{{ data }}"</span>

    <!-- 数字 -->
    <span v-else-if="isNumber" class="json-number">{{ data }}</span>

    <!-- 布尔值 -->
    <span v-else-if="isBoolean" class="json-boolean">{{ data }}</span>

    <!-- null -->
    <span v-else-if="isNull" class="json-null">null</span>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  data: [Object, Array, String, Number, Boolean, null],
  depth: {
    type: Number,
    default: 0
  }
})

const isExpanded = ref(true) // 默认全部展开

const isObject = computed(() => typeof props.data === 'object' && props.data !== null && !Array.isArray(props.data))
const isArray = computed(() => Array.isArray(props.data))
const isString = computed(() => typeof props.data === 'string')
const isNumber = computed(() => typeof props.data === 'number')
const isBoolean = computed(() => typeof props.data === 'boolean')
const isNull = computed(() => props.data === null)

const keyCount = computed(() => {
  return isObject.value ? Object.keys(props.data).length : 0
})

const toggle = () => {
  isExpanded.value = !isExpanded.value
}

const isLast = (key) => {
  if (!isObject.value) return true
  const keys = Object.keys(props.data)
  return keys[keys.length - 1] === key
}
</script>

<style lang="scss" scoped>
@use '../assets/styles/variables.scss' as *;

.json-node {
  display: inline;
}

.json-item {
  display: flex;
  align-items: flex-start;
  line-height: 1.5;

  // 嵌套层级缩进
  padding-left: calc(20px * (var(--depth, 0) + 1));

  .json-key {
    color: var(--text-primary);
    font-weight: $font-weight-semibold;
  }
}

.json-bracket {
  color: var(--text-primary);
  font-family: $font-family-mono;
}

.json-collapsed {
  display: inline-flex;
  align-items: center;
  gap: $spacing-2;
  padding: $spacing-1 $spacing-2;
  background: var(--bg-card);
  border-radius: $radius-sm;
  cursor: pointer;
  user-select: none;
  transition: background $transition-fast;

  &:hover {
    background: var(--bg-secondary);
  }
}

.json-toggle {
  color: var(--text-muted);
  font-size: $font-size-xs;
}

.json-preview {
  color: var(--text-secondary);
  font-size: $font-size-sm;
  font-family: $font-family-mono;
}

.json-string {
  color: $success;
  font-family: $font-family-mono;
}

.json-number {
  color: $info;
  font-family: $font-family-mono;
}

.json-boolean {
  color: $warning;
  font-family: $font-family-mono;
}

.json-null {
  color: var(--text-muted);
  font-family: $font-family-mono;
}

.json-comma {
  color: var(--text-secondary);
}
</style>
