// 指标定义
const metrics = [
    { id: 'lt_increment', name: '日均商城主访 LT 增量', type: 'number', unit: '' },
    { id: 'gmv_increment', name: '日均商城 GMV 增量', type: 'number', unit: '' },
    { id: 'budget', name: '日均消耗预算', type: 'number', unit: '' },
    { id: 'lt_roi', name: 'LT-ROI', type: 'number', unit: '' },
    { id: 'lt_cac', name: 'LT-CAC', type: 'number', unit: '' },
    { id: 'gmv_roi', name: 'GMV-ROI', type: 'number', unit: '' },
    { id: 'gmv_ratio', name: '双端商城 GMV 兑换比', type: 'number', unit: '' },
    { id: 'visit_uplift', name: '人均商城有行为主访 +%', type: 'percent', unit: '%' },
    { id: 'gmv_uplift', name: '人均商城支付 GMV+%', type: 'percent', unit: '%' },
    { id: 'retention_7d', name: '7 日主动复访率', type: 'percent', unit: '%' }
];

// 生成伪造数据
function generateData(count = 30) {
    const data = [];
    for (let i = 0; i < count; i++) {
        const item = {
            id: `实验-${i + 1}`,
            name: `实验组 ${i + 1}`
        };
        
        metrics.forEach(metric => {
            let value;
            // 随机数生成辅助函数，增加方差
            const randomVariance = (min, max) => {
                const range = max - min;
                return (Math.random() * range + min).toFixed(2);
            };

            if (metric.type === 'percent') {
                value = randomVariance(-50, 150);
            } else {
                switch(metric.id) {
                    case 'budget': 
                        value = Math.floor(Math.random() * 499000 + 1000); 
                        break;
                    case 'lt_increment': 
                        value = Math.floor(Math.random() * 2500 - 500); 
                        break;
                    case 'gmv_increment':
                        value = Math.floor(Math.random() * 100000);
                        break;
                    case 'lt_roi':
                    case 'lt_cac':
                    case 'gmv_roi':
                        value = randomVariance(0.5, 20.0);
                        break;
                    case 'gmv_ratio':
                        value = randomVariance(0.1, 5.0);
                        break;
                    default: 
                        value = randomVariance(0, 500);
                }
            }
            item[metric.id] = parseFloat(value);
            
            // 随机生成显著性状态
            // 0: 不显著, 1: 10% (90%), 2: 5% (95%), 3: 3% (97%), 4: 1% (99%)
            const sigLevel = Math.floor(Math.random() * 5);
            let sigValue;
            switch(sigLevel) {
                case 0: sigValue = 'not_significant'; break;
                case 1: sigValue = '10%'; break; // 90% confidence
                case 2: sigValue = '5%'; break;  // 95% confidence
                case 3: sigValue = '3%'; break;  // 97% confidence
                case 4: sigValue = '1%'; break;  // 99% confidence
            }
            item[metric.id + '_sig'] = sigValue;
        });
        data.push(item);
    }
    return data;
}

const rawData = generateData(30);

// 初始化 ECharts 实例
let myChart = null;

// 当前配置状态
const state = {
    xAxis: 'lt_increment',
    yAxis: 'gmv_increment',
    size: 'budget',
    quadrant: 'mean',
    // 改为数组，支持多条件
    filters: [
        { metric: 'lt_increment', operator: '>', value: '' }
    ]
};

// 渲染筛选条件列表
function renderFilters() {
    const container = document.getElementById('filter-container');
    container.innerHTML = '';

    state.filters.forEach((filter, index) => {
        const row = document.createElement('div');
        row.className = 'filter-row';

        // 1. 指标选择 Select
        const metricSelect = document.createElement('select');
        metricSelect.className = 'metric-select';
        metrics.forEach(m => {
            const option = document.createElement('option');
            option.value = m.id;
            option.textContent = m.name;
            
            // 互斥逻辑：如果其他 filter 已经选了这个指标，则禁用
            const isSelectedByOthers = state.filters.some((f, i) => i !== index && f.metric === m.id);
            if (isSelectedByOthers) {
                option.disabled = true;
                option.style.color = '#ccc';
            }
            
            metricSelect.appendChild(option);
        });
        metricSelect.value = filter.metric;
        metricSelect.addEventListener('change', (e) => {
            state.filters[index].metric = e.target.value;
            // 变更指标后重新渲染，更新互斥状态
            renderFilters(); 
        });

        // 2. 运算符 Select
        const opSelect = document.createElement('select');
        opSelect.className = 'operator-select';
        
        // 定义运算符选项
        const operators = [
            { value: '>', label: '>' },
            { value: '=', label: '=' },
            { value: '<', label: '<' },
            { value: 'significance', label: '显著性' }
        ];

        operators.forEach(op => {
            const option = document.createElement('option');
            option.value = op.value;
            option.textContent = op.label;
            opSelect.appendChild(option);
        });
        opSelect.value = filter.operator;
        
        // 3. 值输入控件容器 (可能是 input 也可能是 select)
        const valueContainer = document.createElement('div');
        valueContainer.className = 'value-container';
        // 保持和 input 类似的宽度
        valueContainer.style.width = '120px'; 

        // 辅助函数：根据 operator 渲染不同的值控件
        const renderValueControl = () => {
            valueContainer.innerHTML = ''; // 清空当前控件
            
            if (opSelect.value === 'significance') {
                // 渲染下拉框
                const select = document.createElement('select');
                select.className = 'value-input'; // 复用样式
                select.style.width = '100%';
                
                const options = [
                    { value: '1%', label: '1% (99%)' },
                    { value: '3%', label: '3% (97%)' },
                    { value: '5%', label: '5% (95%)' },
                    { value: '10%', label: '10% (90%)' },
                    { value: 'not_significant', label: '不显著' }
                ];

                // 添加默认空选项
                const defaultOption = document.createElement('option');
                defaultOption.value = '';
                defaultOption.textContent = '请选择';
                defaultOption.disabled = true;
                if (!filter.value) defaultOption.selected = true;
                select.appendChild(defaultOption);

                options.forEach(opt => {
                    const option = document.createElement('option');
                    option.value = opt.value;
                    option.textContent = opt.label;
                    if (filter.value === opt.value) option.selected = true;
                    select.appendChild(option);
                });

                select.addEventListener('change', (e) => {
                    state.filters[index].value = e.target.value;
                });
                valueContainer.appendChild(select);

            } else {
                // 渲染数字输入框
                const input = document.createElement('input');
                input.type = 'number';
                input.className = 'value-input';
                input.placeholder = '输入值';
                input.style.width = '100%';
                input.value = filter.value;
                input.addEventListener('input', (e) => {
                    state.filters[index].value = e.target.value;
                });
                valueContainer.appendChild(input);
            }
        };

        // 初始化渲染值控件
        renderValueControl();

        // 监听 operator 变化
        opSelect.addEventListener('change', (e) => {
            const newOperator = e.target.value;
            state.filters[index].operator = newOperator;
            // 切换 operator 时重置 value，避免类型不匹配
            state.filters[index].value = ''; 
            renderValueControl();
        });

        // 4. 删除按钮
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn-icon btn-delete';
        deleteBtn.innerHTML = '×'; // 或者使用 SVG 图标
        deleteBtn.title = '删除条件';
        deleteBtn.addEventListener('click', () => {
            removeFilter(index);
        });
        
        row.appendChild(metricSelect);
        row.appendChild(opSelect);
        row.appendChild(valueContainer);
        row.appendChild(deleteBtn);
        
        container.appendChild(row);
    });

    // 控制添加按钮状态
    const addBtn = document.getElementById('add-filter-btn');
    if (state.filters.length >= 3) {
        addBtn.disabled = true;
        addBtn.textContent = '最多添加 3 个条件';
    } else {
        addBtn.disabled = false;
        addBtn.textContent = '+ 添加筛选条件';
    }
}

// 添加筛选条件
function addFilter() {
    if (state.filters.length >= 3) return;

    // 寻找一个未被使用的指标作为默认值
    const usedMetrics = state.filters.map(f => f.metric);
    const availableMetric = metrics.find(m => !usedMetrics.includes(m.id));

    if (availableMetric) {
        state.filters.push({
            metric: availableMetric.id,
            operator: '>',
            value: ''
        });
        renderFilters();
    } else {
        alert('没有更多可选指标');
    }
}

// 删除筛选条件
function removeFilter(index) {
    state.filters.splice(index, 1);
    renderFilters();
}

// 初始化控件
function initControls() {
    // 1. 初始化 X/Y/Size 下拉框
    const selects = ['x-axis-metric', 'y-axis-metric', 'size-metric'];
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        // Clear existing options first
        select.innerHTML = '';
        metrics.forEach(metric => {
            const option = document.createElement('option');
            option.value = metric.id;
            option.textContent = metric.name;
            select.appendChild(option);
        });
    });

    // 设置默认值
    document.getElementById('x-axis-metric').value = state.xAxis;
    document.getElementById('y-axis-metric').value = state.yAxis;
    document.getElementById('size-metric').value = state.size;

    // 绑定 X/Y/Size 变更事件
    document.getElementById('x-axis-metric').addEventListener('change', (e) => {
        state.xAxis = e.target.value;
        updateChart();
    });
    document.getElementById('y-axis-metric').addEventListener('change', (e) => {
        state.yAxis = e.target.value;
        updateChart();
    });
    document.getElementById('size-metric').addEventListener('change', (e) => {
        state.size = e.target.value;
        updateChart();
    });

    // 2. 初始化动态筛选区域
    renderFilters();

    // 绑定添加按钮
    document.getElementById('add-filter-btn').addEventListener('click', addFilter);

    // 3. 绑定查询按钮
    document.getElementById('query-btn').addEventListener('click', () => {
        // 更新象限状态
        const quadrantRadios = document.getElementsByName('quadrant');
        for (const radio of quadrantRadios) {
            if (radio.checked) {
                state.quadrant = radio.value;
                break;
            }
        }
        updateChart();
    });

    // 4. 绑定象限切换
    const quadrantRadios = document.getElementsByName('quadrant');
    for (const radio of quadrantRadios) {
        radio.addEventListener('change', (e) => {
            if (e.target.checked) {
                state.quadrant = e.target.value;
            }
        });
    }
}

// 过滤数据 (支持多条件 AND)
function filterData(data) {
    // 过滤掉 value 为空的无效条件
    const activeFilters = state.filters.filter(f => f.value !== '' && f.value !== null);

    if (activeFilters.length === 0) return data;

    return data.filter(item => {
        // item 必须满足所有 activeFilters
        return activeFilters.every(filter => {
            const itemVal = item[filter.metric];
            const filterVal = parseFloat(filter.value);
            
            if (isNaN(filterVal)) return true; // 忽略无效数字

            switch (filter.operator) {
                case '>': return itemVal > filterVal;
                case '=': return itemVal === filterVal;
                case '<': return itemVal < filterVal;
                case 'significance':
                    // 获取该指标对应的显著性状态
                    const sigKey = filter.metric + '_sig';
                    const itemSig = item[sigKey];
                    // 如果选的是"不显著"，直接匹配
                    if (filter.value === 'not_significant') {
                        return itemSig === 'not_significant';
                    }
                    // 如果选的是某个置信度(如5%)，则要看业务逻辑
                    // 假设逻辑是：选10% -> 10%, 5%, 3%, 1% 都算 (p值越小越显著)
                    // 选5% -> 5%, 3%, 1% 算
                    // 选1% -> 只有 1% 算
                    const sigLevels = ['not_significant', '10%', '5%', '3%', '1%'];
                    const itemLevelIndex = sigLevels.indexOf(itemSig);
                    const filterLevelIndex = sigLevels.indexOf(filter.value);
                    
                    return itemLevelIndex >= filterLevelIndex;

                default: return true;
            }
        });
    });
}

// 更新图表
function updateChart() {
    if (!myChart) {
        myChart = echarts.init(document.getElementById('bubble-chart'));
        window.addEventListener('resize', () => myChart.resize());
    }

    const filteredData = filterData(rawData);
    
    const xMetric = metrics.find(m => m.id === state.xAxis);
    const yMetric = metrics.find(m => m.id === state.yAxis);
    const sizeMetric = metrics.find(m => m.id === state.size);

    // 转换数据为 ECharts 格式 [x, y, size, originalItem]
    const seriesData = filteredData.map(item => {
        return {
            name: item.name,
            value: [
                item[state.xAxis],
                item[state.yAxis],
                item[state.size],
                item // 存储原始数据以便 tooltip 使用
            ]
        };
    });

    // 计算气泡大小范围
    const sizeValues = filteredData.map(item => item[state.size]);
    const minSize = Math.min(...sizeValues);
    const maxSize = Math.max(...sizeValues);

    // 计算象限辅助线 (X轴和Y轴的分割线)
    let xMarkValue, yMarkValue;
    const xValues = filteredData.map(item => item[state.xAxis]);
    const yValues = filteredData.map(item => item[state.yAxis]);

    // 辅助计算函数
    const getMean = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    const getMedian = (arr) => {
        if (!arr.length) return 0;
        const sorted = [...arr].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    };
    const getTopPercentile = (arr, p) => {
        if (!arr.length) return 0;
        const sorted = [...arr].sort((a, b) => b - a); // 降序
        const index = Math.floor(sorted.length * (p / 100));
        return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
    };

    if (filteredData.length > 0) {
        switch (state.quadrant) {
            case 'mean':
                xMarkValue = getMean(xValues);
                yMarkValue = getMean(yValues);
                break;
            case 'median':
                xMarkValue = getMedian(xValues);
                yMarkValue = getMedian(yValues);
                break;
            case 'top10':
                xMarkValue = getTopPercentile(xValues, 10);
                yMarkValue = getTopPercentile(yValues, 10);
                break;
            case 'top20':
                xMarkValue = getTopPercentile(xValues, 20);
                yMarkValue = getTopPercentile(yValues, 20);
                break;
            default:
                xMarkValue = getMean(xValues);
                yMarkValue = getMean(yValues);
        }
    } else {
        xMarkValue = 0;
        yMarkValue = 0;
    }

    const option = {
        title: {
            text: '实验指标分布',
            left: 'center',
            top: 0
        },
        tooltip: {
            trigger: 'item',
            formatter: function (params) {
                const item = params.data.value[3];
                return `
                    <div style="font-weight:bold; margin-bottom: 4px;">${item.name}</div>
                    ${xMetric.name}: ${item[state.xAxis]}${xMetric.unit}<br/>
                    ${yMetric.name}: ${item[state.yAxis]}${yMetric.unit}<br/>
                    ${sizeMetric.name}: ${item[state.size]}${sizeMetric.unit}
                `;
            },
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderColor: '#eee',
            borderWidth: 1,
            textStyle: {
                color: '#333'
            }
        },
        grid: {
            left: '5%',
            right: '10%',
            top: '10%',
            bottom: '10%',
            containLabel: true
        },
        xAxis: {
            name: xMetric.name,
            nameLocation: 'middle',
            nameGap: 30,
            type: 'value',
            scale: true,
            axisLabel: {
                formatter: `{value}${xMetric.unit}`
            },
            splitLine: {
                lineStyle: {
                    type: 'dashed'
                }
            }
        },
        yAxis: {
            name: yMetric.name,
            nameLocation: 'middle',
            nameGap: 50,
            type: 'value',
            scale: true,
            axisLabel: {
                formatter: `{value}${yMetric.unit}`
            },
            splitLine: {
                lineStyle: {
                    type: 'dashed'
                }
            }
        },
        series: [
            {
                type: 'scatter',
                symbolSize: function (data) {
                    // 简单的线性映射，控制气泡大小在 10-60 之间
                    if (maxSize === minSize) return 30;
                    const size = 10 + (data[2] - minSize) / (maxSize - minSize) * 50;
                    return size;
                },
                data: seriesData,
                itemStyle: {
                    color: function(params) {
                        return 'rgba(24, 144, 255, 0.6)';
                    },
                    borderColor: '#1890ff',
                    borderWidth: 1
                },
                emphasis: {
                    focus: 'series',
                    itemStyle: {
                        color: 'rgba(24, 144, 255, 1)',
                        shadowBlur: 10,
                        shadowColor: 'rgba(0, 0, 0, 0.2)'
                    }
                },
                markLine: {
                    silent: true, // 不响应鼠标事件
                    lineStyle: {
                        color: '#999',
                        type: 'dashed'
                    },
                    data: [
                        { xAxis: xMarkValue, label: { formatter: 'X轴参考线' } },
                        { yAxis: yMarkValue, label: { formatter: 'Y轴参考线' } }
                    ]
                }
            }
        ]
    };

    myChart.setOption(option);
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    initControls();
    updateChart();
});
