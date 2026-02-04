// Reuse logic from bubble-chart-demo/script.js

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

// Mock Data
function generateData(count = 30) {
    const data = [];
    for (let i = 0; i < count; i++) {
        const item = {
            id: `实验-${i + 1}`,
            name: `实验组 ${i + 1}`
        };
        metrics.forEach(metric => {
            let value;
            const randomVariance = (min, max) => (Math.random() * (max - min) + min).toFixed(2);
            if (metric.type === 'percent') {
                value = randomVariance(-50, 150);
            } else {
                switch(metric.id) {
                    case 'budget': value = Math.floor(Math.random() * 499000 + 1000); break;
                    case 'lt_increment': value = Math.floor(Math.random() * 2500 - 500); break;
                    case 'gmv_increment': value = Math.floor(Math.random() * 100000); break;
                    default: value = randomVariance(0, 500);
                }
            }
            item[metric.id] = parseFloat(value);
        });
        data.push(item);
    }
    return data;
}

const rawData = generateData(30);
let myChart = null;
const state = {
    xAxis: 'lt_increment',
    yAxis: 'gmv_increment',
    size: 'budget',
    quadrant: 'mean',
    filters: []
};

function renderFilters() {
    const container = document.getElementById('filter-container');
    container.innerHTML = '';
    state.filters.forEach((filter, index) => {
        const row = document.createElement('div');
        row.className = 'flex gap-2 items-center';
        
        const metricSelect = document.createElement('select');
        metricSelect.className = 'input h-8';
        metrics.forEach(m => {
            const option = document.createElement('option');
            option.value = m.id;
            option.textContent = m.name;
            if (state.filters.some((f, i) => i !== index && f.metric === m.id)) option.disabled = true;
            metricSelect.appendChild(option);
        });
        metricSelect.value = filter.metric;
        metricSelect.onchange = (e) => { state.filters[index].metric = e.target.value; renderFilters(); };

        const opSelect = document.createElement('select');
        opSelect.className = 'input h-8 w-16';
        ['>', '=', '<'].forEach(op => {
            const option = document.createElement('option');
            option.value = op;
            option.textContent = op;
            opSelect.appendChild(option);
        });
        opSelect.value = filter.operator;
        opSelect.onchange = (e) => state.filters[index].operator = e.target.value;

        const input = document.createElement('input');
        input.type = 'number';
        input.className = 'input h-8 w-24';
        input.value = filter.value;
        input.oninput = (e) => state.filters[index].value = e.target.value;

        const delBtn = document.createElement('button');
        delBtn.className = 'btn-link text-lg';
        delBtn.innerHTML = '×';
        delBtn.onclick = () => { state.filters.splice(index, 1); renderFilters(); };

        row.appendChild(metricSelect);
        row.appendChild(opSelect);
        row.appendChild(input);
        row.appendChild(delBtn);
        container.appendChild(row);
    });

    const addBtn = document.getElementById('add-filter-btn');
    if (state.filters.length >= 3) {
        addBtn.disabled = true;
        addBtn.textContent = '最多3个';
    } else {
        addBtn.disabled = false;
        addBtn.textContent = '+ 添加条件';
    }
}

function initControls() {
    ['x-axis-metric', 'y-axis-metric', 'size-metric'].forEach(id => {
        const sel = document.getElementById(id);
        metrics.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.id;
            opt.textContent = m.name;
            sel.appendChild(opt);
        });
    });

    document.getElementById('x-axis-metric').value = state.xAxis;
    document.getElementById('y-axis-metric').value = state.yAxis;
    document.getElementById('size-metric').value = state.size;

    ['x-axis-metric', 'y-axis-metric', 'size-metric'].forEach(id => {
        document.getElementById(id).addEventListener('change', (e) => {
            if (id.includes('x')) state.xAxis = e.target.value;
            if (id.includes('y')) state.yAxis = e.target.value;
            if (id.includes('size')) state.size = e.target.value;
            updateChart();
        });
    });

    document.getElementById('add-filter-btn').addEventListener('click', () => {
        const used = state.filters.map(f => f.metric);
        const avail = metrics.find(m => !used.includes(m.id));
        if (avail) {
            state.filters.push({ metric: avail.id, operator: '>', value: '' });
            renderFilters();
        }
    });

    document.getElementById('query-btn').addEventListener('click', updateChart);
    document.getElementsByName('quadrant').forEach(r => {
        r.addEventListener('change', (e) => {
            state.quadrant = e.target.value;
            // updateChart(); // Wait for query btn? User said "Click query button to refresh" in PRD.
        });
    });
}

function filterData(data) {
    const active = state.filters.filter(f => f.value !== '');
    if (!active.length) return data;
    return data.filter(item => active.every(f => {
        const val = parseFloat(f.value);
        if (isNaN(val)) return true;
        if (f.operator === '>') return item[f.metric] > val;
        if (f.operator === '<') return item[f.metric] < val;
        return item[f.metric] === val;
    }));
}

function updateChart() {
    if (!myChart) myChart = echarts.init(document.getElementById('bubble-chart'));
    
    const filtered = filterData(rawData);
    const xM = metrics.find(m => m.id === state.xAxis);
    const yM = metrics.find(m => m.id === state.yAxis);
    const sM = metrics.find(m => m.id === state.size);

    const data = filtered.map(d => ({
        name: d.name,
        value: [d[state.xAxis], d[state.yAxis], d[state.size], d]
    }));

    const xVals = filtered.map(d => d[state.xAxis]);
    const yVals = filtered.map(d => d[state.yAxis]);
    
    const getStat = (arr, type) => {
        if (!arr.length) return 0;
        const sorted = [...arr].sort((a,b) => a-b);
        if (type === 'mean') return arr.reduce((a,b)=>a+b,0)/arr.length;
        if (type === 'median') return sorted[Math.floor(sorted.length/2)];
        if (type.startsWith('top')) {
            const p = parseInt(type.replace('top', ''));
            const idx = Math.floor(sorted.length * (1 - p/100));
            return sorted[idx];
        }
        return 0;
    };

    const xMark = getStat(xVals, state.quadrant);
    const yMark = getStat(yVals, state.quadrant);

    myChart.setOption({
        tooltip: {
            formatter: p => {
                const i = p.data.value[3];
                return `<b>${i.name}</b><br>${xM.name}: ${i[state.xAxis]}<br>${yM.name}: ${i[state.yAxis]}<br>${sM.name}: ${i[state.size]}`;
            }
        },
        grid: { left: '5%', right: '10%', top: '10%', bottom: '10%', containLabel: true },
        xAxis: { name: xM.name, splitLine: { lineStyle: { type: 'dashed' } } },
        yAxis: { name: yM.name, splitLine: { lineStyle: { type: 'dashed' } } },
        series: [{
            type: 'scatter',
            symbolSize: d => {
                const sVals = filtered.map(i => i[state.size]);
                const min = Math.min(...sVals), max = Math.max(...sVals);
                return 10 + (d[2] - min)/(max - min || 1) * 40;
            },
            data: data,
            itemStyle: { color: 'rgba(25, 102, 255, 0.6)', borderColor: '#1966FF' },
            markLine: {
                silent: true,
                lineStyle: { type: 'dashed', color: '#999' },
                data: [{ xAxis: xMark }, { yAxis: yMark }]
            }
        }]
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initControls();
    updateChart();
    window.onresize = () => myChart && myChart.resize();
});
