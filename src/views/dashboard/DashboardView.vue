<script setup lang="ts">
import { ref, onMounted } from 'vue'
import * as echarts from 'echarts'
import request from '../../api/request'

const statsCards = ref([
  { title: '下载总数', value: 0, icon: 'Download', color: '#409eff' },
  { title: '本周下载', value: 0, icon: 'Calendar', color: '#67c23a' },
  { title: '视频数量', value: 0, icon: 'VideoCamera', color: '#e6a23c' },
  { title: '图片数量', value: 0, icon: 'Picture', color: '#f56c6c' },
])

const lineChartRef = ref<HTMLElement>()
const pieChartRef = ref<HTMLElement>()
let lineChart: echarts.ECharts | null = null
let pieChart: echarts.ECharts | null = null

onMounted(() => {
  fetchStats()
  initLineChart()
  initPieChart()
  window.addEventListener('resize', () => {
    lineChart?.resize()
    pieChart?.resize()
  })
})

async function fetchStats() {
  try {
    const res: any = await request.get('/dashboard/stats')
    if (res.success) {
      const d = res.data
      statsCards.value[0].value = d.downloadCount
      statsCards.value[1].value = d.weekCount
      statsCards.value[2].value = d.videoCount
      statsCards.value[3].value = d.imageCount

      updateLineChart(d.trend)
      updatePieChart(d.sourceStats)
    }
  } catch {
    // error handled by interceptor
  }
}

function initLineChart() {
  if (!lineChartRef.value) return
  lineChart = echarts.init(lineChartRef.value)
  lineChart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['下载量'] },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', boundaryGap: false, data: [] },
    yAxis: { type: 'value' },
    series: [{
      name: '下载量',
      type: 'line',
      smooth: true,
      data: [],
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(64, 158, 255, 0.3)' },
          { offset: 1, color: 'rgba(64, 158, 255, 0.05)' },
        ]),
      },
    }],
  })
}

function updateLineChart(trend: { day: string; count: number }[]) {
  if (!lineChart) return
  const days = trend.map(t => t.day.slice(5))
  const counts = trend.map(t => t.count)
  lineChart.setOption({
    xAxis: { data: days },
    series: [{ data: counts }],
  })
}

function initPieChart() {
  if (!pieChartRef.value) return
  pieChart = echarts.init(pieChartRef.value)
  pieChart.setOption({
    tooltip: { trigger: 'item' },
    legend: { orient: 'vertical', left: 'left' },
    series: [{
      name: '下载来源',
      type: 'pie',
      radius: '60%',
      center: ['50%', '50%'],
      data: [],
      emphasis: {
        itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0, 0, 0, 0.5)' },
      },
    }],
  })
}

const sourceNames: Record<string, string> = {
  pexels: 'Pexels',
  pixabay: 'Pixabay',
  ytdlp: 'YouTube',
  bilibili: 'Bilibili',
}

function updatePieChart(sourceStats: Record<string, number>) {
  if (!pieChart) return
  const data = Object.entries(sourceStats).map(([key, value]) => ({
    value,
    name: sourceNames[key] || key,
  }))
  pieChart.setOption({
    series: [{ data }],
  })
}
</script>

<template>
  <div class="dashboard">
    <el-row :gutter="20" class="stats-row">
      <el-col :xs="12" :sm="6" v-for="card in statsCards" :key="card.title">
        <el-card shadow="hover" class="stats-card">
          <div class="stats-content">
            <div class="stats-info">
              <div class="stats-value">{{ card.value }}</div>
              <div class="stats-title">{{ card.title }}</div>
            </div>
            <el-icon :size="48" :color="card.color">
              <component :is="card.icon" />
            </el-icon>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="chart-row">
      <el-col :xs="24" :md="14">
        <el-card shadow="hover">
          <template #header>
            <span>下载趋势（近7天）</span>
          </template>
          <div ref="lineChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
      <el-col :xs="24" :md="10">
        <el-card shadow="hover">
          <template #header>
            <span>下载来源</span>
          </template>
          <div ref="pieChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.dashboard {
  padding: 0;
}

.stats-row {
  margin-bottom: 20px;
}

.stats-card {
  margin-bottom: 12px;
}

.stats-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.stats-value {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 8px;
}

.stats-title {
  font-size: 14px;
  color: #909399;
}

.chart-row {
  margin-bottom: 20px;
}

.chart-container {
  height: 350px;
}
</style>
