<script setup lang="ts">
import { ref, onMounted } from 'vue'
import * as echarts from 'echarts'

// 统计卡片数据
const statsCards = ref([
  { title: '用户总数', value: 1280, icon: 'User', color: '#409eff' },
  { title: '今日访问', value: 356, icon: 'View', color: '#67c23a' },
  { title: '订单数量', value: 89, icon: 'ShoppingCart', color: '#e6a23c' },
  { title: '收入金额', value: '¥12,580', icon: 'Money', color: '#f56c6c' },
])

// 图表引用
const lineChartRef = ref<HTMLElement>()
const pieChartRef = ref<HTMLElement>()

onMounted(() => {
  initLineChart()
  initPieChart()
})

function initLineChart() {
  if (!lineChartRef.value) return

  const chart = echarts.init(lineChartRef.value)
  const option = {
    tooltip: {
      trigger: 'axis',
    },
    legend: {
      data: ['访问量', '注册量'],
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
    },
    yAxis: {
      type: 'value',
    },
    series: [
      {
        name: '访问量',
        type: 'line',
        smooth: true,
        data: [120, 132, 101, 134, 90, 230, 210],
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(64, 158, 255, 0.3)' },
            { offset: 1, color: 'rgba(64, 158, 255, 0.05)' },
          ]),
        },
      },
      {
        name: '注册量',
        type: 'line',
        smooth: true,
        data: [20, 32, 10, 34, 30, 50, 40],
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(103, 194, 58, 0.3)' },
            { offset: 1, color: 'rgba(103, 194, 58, 0.05)' },
          ]),
        },
      },
    ],
  }
  chart.setOption(option)

  // 响应式
  window.addEventListener('resize', () => chart.resize())
}

function initPieChart() {
  if (!pieChartRef.value) return

  const chart = echarts.init(pieChartRef.value)
  const option = {
    tooltip: {
      trigger: 'item',
    },
    legend: {
      orient: 'vertical',
      left: 'left',
    },
    series: [
      {
        name: '用户来源',
        type: 'pie',
        radius: '60%',
        center: ['50%', '50%'],
        data: [
          { value: 580, name: '直接访问' },
          { value: 484, name: '搜索引擎' },
          { value: 300, name: '社交媒体' },
          { value: 200, name: '广告推广' },
          { value: 150, name: '其他' },
        ],
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
      },
    ],
  }
  chart.setOption(option)

  // 响应式
  window.addEventListener('resize', () => chart.resize())
}
</script>

<template>
  <div class="dashboard">
    <!-- 统计卡片 -->
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

    <!-- 图表区域 -->
    <el-row :gutter="20" class="chart-row">
      <el-col :xs="24" :md="14">
        <el-card shadow="hover">
          <template #header>
            <span>访问趋势</span>
          </template>
          <div ref="lineChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
      <el-col :xs="24" :md="10">
        <el-card shadow="hover">
          <template #header>
            <span>用户来源</span>
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
