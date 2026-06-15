<script setup lang="ts">
import { ref, onMounted } from 'vue'
import * as echarts from 'echarts'
import request from '../../api/request'

interface StatsCard {
  title: string
  value: number
  displayValue: number
  suffix: string
  icon: string
  color: string
}

const statsCards = ref<StatsCard[]>([
  { title: '下载总数', value: 0, displayValue: 0, suffix: '', icon: 'Download', color: '#409eff' },
  { title: '本周下载', value: 0, displayValue: 0, suffix: '', icon: 'Calendar', color: '#67c23a' },
  { title: '视频数量', value: 0, displayValue: 0, suffix: '', icon: 'VideoCamera', color: '#e6a23c' },
  { title: '图片数量', value: 0, displayValue: 0, suffix: '', icon: 'Picture', color: '#f56c6c' },
  { title: '成功率', value: 0, displayValue: 0, suffix: '%', icon: 'CircleCheck', color: '#909399' },
  { title: '总存储', value: 0, displayValue: 0, suffix: '', icon: 'Coin', color: '#9b59b6' },
])

const recentActivities = ref<{ id: number; title: string; source: string; status: string; created_at: string }[]>([])

// 系统概览
const sysStats = ref({
  userCount: 0,
  activeUserCount: 0,
  roleCount: 0,
  menuCount: 0,
})

// --- animated number ---
function animateValue(index: number, newValue: number, isFloat = false) {
  const card = statsCards.value[index]
  const oldValue = card.displayValue
  const duration = 800
  const startTime = Date.now()
  function tick() {
    const elapsed = Date.now() - startTime
    const progress = Math.min(elapsed / duration, 1)
    const eased = 1 - Math.pow(1 - progress, 3)
    card.displayValue = isFloat
      ? Math.round((oldValue + (newValue - oldValue) * eased) * 10) / 10
      : Math.round(oldValue + (newValue - oldValue) * eased)
    if (progress < 1) requestAnimationFrame(tick)
  }
  tick()
}

function formatStorage(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
}

// --- charts ---
const lineChartRef = ref<HTMLElement>()
const pieChartRef = ref<HTMLElement>()
const barChartRef = ref<HTMLElement>()
let lineChart: echarts.ECharts | null = null
let pieChart: echarts.ECharts | null = null
let barChart: echarts.ECharts | null = null

function initLineChart() {
  if (!lineChartRef.value) return
  lineChart = echarts.init(lineChartRef.value)
  lineChart.setOption({
    tooltip: { trigger: 'axis', formatter: '{b}<br/>下载量: {c}' },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '12%', containLabel: true },
    xAxis: { type: 'category', boundaryGap: false, data: [], axisLabel: { fontSize: 11 } },
    yAxis: { type: 'value', splitLine: { lineStyle: { type: 'dashed' } } },
    series: [{
      name: '下载量',
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      data: [],
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(64, 158, 255, 0.35)' },
          { offset: 1, color: 'rgba(64, 158, 255, 0.02)' },
        ]),
      },
      lineStyle: { width: 2.5 },
      animationDuration: 1000,
      animationEasing: 'cubicOut',
    }],
  })
}

function updateLineChart(trend: { day: string; count: number }[]) {
  if (!lineChart) return
  lineChart.setOption({
    xAxis: { data: trend.map(t => t.day) },
    series: [{ data: trend.map(t => t.count) }],
  })
}

const sourceNames: Record<string, string> = {
  pexels: 'Pexels', pixabay: 'Pixabay', ytdlp: 'YouTube', bilibili: 'Bilibili',
}

function initPieChart() {
  if (!pieChartRef.value) return
  pieChart = echarts.init(pieChartRef.value)
  pieChart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { orient: 'vertical', left: 'left', top: 'center' },
    color: ['#409eff', '#67c23a', '#e6a23c', '#f56c6c', '#909399', '#9b59b6'],
    series: [{
      name: '下载来源',
      type: 'pie',
      radius: ['42%', '70%'],
      center: ['55%', '50%'],
      avoidLabelOverlap: true,
      itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
      label: { show: true, formatter: '{b}\n{d}%' },
      emphasis: {
        itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0, 0, 0, 0.5)' },
      },
      data: [],
    }],
  })
}

function updatePieChart(sourceStats: Record<string, number>) {
  if (!pieChart) return
  const data = Object.entries(sourceStats).map(([key, value]) => ({
    value, name: sourceNames[key] || key,
  }))
  pieChart.setOption({ series: [{ data }] })
}

function initBarChart() {
  if (!barChartRef.value) return
  barChart = echarts.init(barChartRef.value)
  barChart.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '12%', containLabel: true },
    xAxis: { type: 'category', data: [], axisLabel: { fontSize: 11 } },
    yAxis: { type: 'value', splitLine: { lineStyle: { type: 'dashed' } } },
    series: [{
      type: 'bar',
      data: [],
      barWidth: '50%',
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#409eff' },
          { offset: 1, color: '#79bbff' },
        ]),
        borderRadius: [4, 4, 0, 0],
      },
      animationDuration: 1000,
    }],
  })
}

function updateBarChart(categoryStats: Record<string, number>) {
  if (!barChart) return
  const categories = Object.keys(categoryStats)
  const counts = Object.values(categoryStats)
  barChart.setOption({
    xAxis: { data: categories },
    series: [{ data: counts }],
  })
}

// --- status / source helpers ---
function getStatusTag(status: string) {
  const map: Record<string, string> = { pending: 'info', downloading: 'warning', completed: 'success', failed: 'danger', queued: '' }
  return map[status] || 'info'
}
function getStatusLabel(status: string) {
  const map: Record<string, string> = { pending: '待处理', downloading: '下载中', completed: '已完成', failed: '失败', queued: '排队中' }
  return map[status] || status
}
function getSourceTag(source: string) {
  const map: Record<string, string> = { pexels: '', pixabay: 'success', ytdlp: 'warning', bilibili: 'danger', other: 'info' }
  return map[source] || 'info'
}
function getSourceLabel(source: string) {
  const map: Record<string, string> = { pexels: 'Pexels', pixabay: 'Pixabay', ytdlp: 'YouTube', bilibili: 'Bilibili', other: '其他' }
  return map[source] || source
}
function getActivityType(status: string) {
  const map: Record<string, string> = { completed: 'success', failed: 'danger', downloading: 'warning', pending: 'info', queued: '' }
  return map[status] || ''
}

// --- fetch ---
async function fetchStats() {
  try {
    const res: any = await request.get('/dashboard/stats')
    if (res.success) {
      const d = res.data
      sysStats.value = {
        userCount: d.userCount || 0,
        activeUserCount: d.activeUserCount || 0,
        roleCount: d.roleCount || 0,
        menuCount: d.menuCount || 0,
      }
      animateValue(0, d.downloadCount)
      animateValue(1, d.weekCount)
      animateValue(2, d.videoCount)
      animateValue(3, d.imageCount)
      animateValue(4, d.successRate || 0, true)
      statsCards.value[5].value = d.totalFileSize || 0
      // storage needs special formatting — animate the raw bytes, display formatted
      const targetBytes = d.totalFileSize || 0
      const startTime = Date.now()
      const duration = 800
      function tickStorage() {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 3)
        statsCards.value[5].displayValue = Math.round(targetBytes * eased)
        if (progress < 1) requestAnimationFrame(tickStorage)
      }
      tickStorage()

      updateLineChart(d.trend || [])
      updatePieChart(d.sourceStats || {})
      updateBarChart(d.categoryStats || {})
    }
  } catch { /* handled by interceptor */ }
}

async function fetchRecentActivity() {
  try {
    const res: any = await request.get('/dashboard/recent-activity')
    if (res.success) recentActivities.value = res.data.activities || []
  } catch { /* ignore */ }
}

onMounted(() => {
  fetchStats()
  fetchRecentActivity()
  initLineChart()
  initPieChart()
  initBarChart()
  window.addEventListener('resize', () => {
    lineChart?.resize()
    pieChart?.resize()
    barChart?.resize()
  })
})
</script>

<template>
  <div class="dashboard">
    <!-- 统计卡片 -->
    <el-row :gutter="16" class="stats-row">
      <el-col :xs="12" :sm="8" :lg="4" v-for="card in statsCards" :key="card.title">
        <el-card shadow="hover" class="stats-card">
          <div class="stats-content">
            <div class="stats-info">
              <div class="stats-value">
                <template v-if="card.suffix === '%'">{{ card.displayValue }}%</template>
                <template v-else-if="card.title === '总存储'">{{ formatStorage(card.displayValue) }}</template>
                <template v-else>{{ card.displayValue }}</template>
              </div>
              <div class="stats-title">{{ card.title }}</div>
            </div>
            <el-icon :size="44" :color="card.color"><component :is="card.icon" /></el-icon>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 系统概览 -->
    <el-row :gutter="16" class="stats-row">
      <el-col :xs="12" :sm="6">
        <div class="sys-card sys-blue">
          <el-icon :size="24"><User /></el-icon>
          <div class="sys-info">
            <div class="sys-value">{{ sysStats.userCount }}</div>
            <div class="sys-label">用户总数</div>
          </div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="sys-card sys-green">
          <el-icon :size="24"><CircleCheck /></el-icon>
          <div class="sys-info">
            <div class="sys-value">{{ sysStats.activeUserCount }}</div>
            <div class="sys-label">活跃用户</div>
          </div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="sys-card sys-purple">
          <el-icon :size="24"><UserFilled /></el-icon>
          <div class="sys-info">
            <div class="sys-value">{{ sysStats.roleCount }}</div>
            <div class="sys-label">角色数量</div>
          </div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="sys-card sys-orange">
          <el-icon :size="24"><Menu /></el-icon>
          <div class="sys-info">
            <div class="sys-value">{{ sysStats.menuCount }}</div>
            <div class="sys-label">菜单数量</div>
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- 图表区 -->
    <el-row :gutter="20" class="chart-row">
      <el-col :xs="24" :md="14">
        <el-card shadow="hover">
          <template #header><span>下载趋势（近30天）</span></template>
          <div ref="lineChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
      <el-col :xs="24" :md="10">
        <el-card shadow="hover">
          <template #header><span>下载来源</span></template>
          <div ref="pieChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="chart-row">
      <el-col :xs="24" :md="14">
        <el-card shadow="hover">
          <template #header><span>分类分布</span></template>
          <div ref="barChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
      <el-col :xs="24" :md="10">
        <el-card shadow="hover">
          <template #header><span>最近动态</span></template>
          <el-timeline v-if="recentActivities.length > 0">
            <el-timeline-item
              v-for="a in recentActivities"
              :key="a.id"
              :timestamp="a.created_at"
              :type="getActivityType(a.status)"
              placement="top"
            >
              <div class="activity-content">
                <span class="activity-title">{{ a.title }}</span>
                <el-tag :type="getSourceTag(a.source)" size="small">{{ getSourceLabel(a.source) }}</el-tag>
                <el-tag :type="getStatusTag(a.status)" size="small">{{ getStatusLabel(a.status) }}</el-tag>
              </div>
            </el-timeline-item>
          </el-timeline>
          <el-empty v-else description="暂无动态" :image-size="80" />
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.dashboard { padding: 0; }
.stats-row { margin-bottom: 20px; }
.stats-card { margin-bottom: 12px; }
.stats-content {
  display: flex; align-items: center; justify-content: space-between;
}
.stats-value {
  font-size: 28px; font-weight: bold; color: var(--text-primary); margin-bottom: 8px;
}
.stats-title {
  font-size: 14px; color: var(--text-secondary);
}
.sys-card {
  display: flex; align-items: center; gap: 12px;
  padding: 16px 20px; border-radius: var(--radius-lg);
  background: var(--bg-card); border: 1px solid var(--border);
  margin-bottom: 16px; transition: transform 0.2s, box-shadow 0.2s;
}
.sys-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }

.sys-blue { border-left: 4px solid #4f46e5; }
.sys-blue .el-icon { color: #4f46e5; }
.sys-green { border-left: 4px solid #10b981; }
.sys-green .el-icon { color: #10b981; }
.sys-purple { border-left: 4px solid #7c3aed; }
.sys-purple .el-icon { color: #7c3aed; }
.sys-orange { border-left: 4px solid #f59e0b; }
.sys-orange .el-icon { color: #f59e0b; }

.sys-value {
  font-size: 22px; font-weight: 700; color: var(--text-primary); line-height: 1;
}
.sys-label {
  font-size: 12px; color: var(--text-secondary); margin-top: 2px;
}

.chart-row { margin-bottom: 20px; }
.chart-container { height: 350px; }
.activity-content {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
}
.activity-title {
  font-weight: 500; margin-right: 4px;
}
</style>
