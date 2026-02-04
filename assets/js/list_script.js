// Report Filter Logic
const reportFilters = [];
const reportFilterDims = {
    direction: { name: '策略方向', type: 'multi', options: ['UI交互', '推荐策略', '资源位', '活动运营'] },
    dept: { name: '二级部门', type: 'multi', options: ['商城产品部', '推荐算法部', '用户增长部', '平台治理部'] },
    rollout: { name: '是否推全', type: 'single', options: ['是', '否'] }
};

function renderReportFilters() {
    const container = document.getElementById('report-filter-container');
    container.innerHTML = '';
    
    reportFilters.forEach((filter, index) => {
        const row = document.createElement('div');
        row.className = 'flex gap-2 items-center';
        
        // Dimension Select
        const dimSelectWrapper = document.createElement('div');
        dimSelectWrapper.className = 'select-wrapper w-40';
        const dimSelect = document.createElement('select');
        dimSelect.className = 'input w-full';
        
        // Populate dimensions (exclude used ones except current)
        const placeholder = document.createElement('option');
        placeholder.text = '请选择维度';
        placeholder.value = '';
        placeholder.disabled = true;
        if (!filter.dim) placeholder.selected = true;
        dimSelect.appendChild(placeholder);

        Object.keys(reportFilterDims).forEach(key => {
            if (!reportFilters.some((f, i) => i !== index && f.dim === key)) {
                const opt = document.createElement('option');
                opt.value = key;
                opt.text = reportFilterDims[key].name;
                if (filter.dim === key) opt.selected = true;
                dimSelect.appendChild(opt);
            }
        });

        dimSelect.onchange = (e) => {
            reportFilters[index].dim = e.target.value;
            reportFilters[index].values = []; // Reset values on dim change
            renderReportFilters();
        };
        dimSelectWrapper.appendChild(dimSelect);
        
        // Value Input Area
        const valueContainer = document.createElement('div');
        valueContainer.className = 'flex-1';
        
        if (filter.dim) {
            const config = reportFilterDims[filter.dim];
            if (config.type === 'single') {
                const valSelect = document.createElement('select');
                valSelect.className = 'input w-full';
                config.options.forEach(opt => {
                    const o = document.createElement('option');
                    o.value = opt;
                    o.text = opt;
                    if (filter.values[0] === opt) o.selected = true;
                    valSelect.appendChild(o);
                });
                valSelect.onchange = (e) => { reportFilters[index].values = [e.target.value]; };
                if (!filter.values.length) reportFilters[index].values = [config.options[0]]; // Default first
                valueContainer.appendChild(valSelect);
            } else {
                // Multi-select simulation
                const multiWrapper = document.createElement('div');
                multiWrapper.className = 'input h-auto min-h-[32px] flex flex-wrap gap-2 p-1 items-center bg-white cursor-pointer relative';
                multiWrapper.style.minHeight = '32px';
                
                // Display selected tags
                filter.values.forEach(val => {
                    const tag = document.createElement('span');
                    tag.className = 'bg-blue-100 text-blue-600 px-2 py-0.5 rounded text-xs flex items-center gap-1';
                    tag.innerHTML = `${val} <span class="cursor-pointer hover:text-blue-800" onclick="removeFilterValue(${index}, '${val}', event)">×</span>`;
                    multiWrapper.appendChild(tag);
                });

                const placeholder = document.createElement('span');
                placeholder.className = 'text-gray-400 text-xs ml-1';
                if (filter.values.length === 0) placeholder.textContent = '点击选择...';
                multiWrapper.appendChild(placeholder);

                // Dropdown (hidden by default)
                const dropdown = document.createElement('div');
                dropdown.className = 'hidden absolute top-full left-0 w-full bg-white border border-gray-200 rounded shadow-lg z-10 max-h-40 overflow-y-auto mt-1';
                config.options.forEach(opt => {
                    if (!filter.values.includes(opt)) {
                        const item = document.createElement('div');
                        item.className = 'px-3 py-2 hover:bg-gray-50 text-xs cursor-pointer';
                        item.textContent = opt;
                        item.onclick = (e) => {
                            e.stopPropagation();
                            reportFilters[index].values.push(opt);
                            renderReportFilters();
                        };
                        dropdown.appendChild(item);
                    }
                });

                multiWrapper.onclick = (e) => {
                    if (e.target.tagName !== 'SPAN') { // Don't toggle if clicking remove tag
                         // Close other dropdowns
                        document.querySelectorAll('.multi-dropdown-active').forEach(el => {
                            if (el !== dropdown) el.classList.add('hidden');
                        });
                        dropdown.classList.toggle('hidden');
                        dropdown.classList.add('multi-dropdown-active');
                    }
                };

                // Close when clicking outside
                document.addEventListener('click', (e) => {
                    if (!multiWrapper.contains(e.target)) dropdown.classList.add('hidden');
                });

                valueContainer.appendChild(multiWrapper);
                valueContainer.appendChild(dropdown);
            }
        } else {
             const placeholder = document.createElement('div');
             placeholder.className = 'input w-full bg-gray-50 text-gray-400';
             placeholder.textContent = '请先选择筛选维度';
             valueContainer.appendChild(placeholder);
        }

        // Delete Button
        const delBtn = document.createElement('button');
        delBtn.className = 'btn-link text-secondary hover:text-red-500';
        delBtn.innerHTML = '<img src="assets/icons/close.png" width="10">';
        delBtn.onclick = () => { reportFilters.splice(index, 1); renderReportFilters(); };

        row.appendChild(dimSelectWrapper);
        row.appendChild(valueContainer);
        row.appendChild(delBtn);
        container.appendChild(row);
    });

    // Update Add Button State
    const addBtn = document.getElementById('add-report-filter-btn');
    if (reportFilters.length >= 3) {
        addBtn.disabled = true;
        addBtn.textContent = '已达上限 (3个)';
        addBtn.style.opacity = '0.5';
    } else {
        addBtn.disabled = false;
        addBtn.textContent = '+ 添加筛选条件';
        addBtn.style.opacity = '1';
    }
}

function addReportFilter() {
    if (reportFilters.length < 3) {
        reportFilters.push({ dim: '', values: [] });
        renderReportFilters();
    }
}

function removeFilterValue(filterIndex, value, event) {
    event.stopPropagation();
    const filter = reportFilters[filterIndex];
    filter.values = filter.values.filter(v => v !== value);
    renderReportFilters();
}

// Modal Logic
function openNewReportModal() {
    const modalOverlay = document.getElementById('newReportModal');
    modalOverlay.classList.add('open');
    // Trigger reflow to enable transition
    setTimeout(() => {
        modalOverlay.querySelector('.modal').style.right = '0';
    }, 10);
}

function closeNewReportModal() {
    const modalOverlay = document.getElementById('newReportModal');
    const modal = modalOverlay.querySelector('.modal');
    modal.style.right = '-960px';
    setTimeout(() => {
        modalOverlay.classList.remove('open');
    }, 300); // Wait for transition
}

// Drawer Logic
function openDrawer(title) {
    document.getElementById('drawerTitle').textContent = title;
    document.getElementById('strategyDrawer').classList.add('open');
    document.getElementById('drawerOverlay').classList.add('open');
    updateSelectionStatus();
}

function closeDrawer() {
    document.getElementById('strategyDrawer').classList.remove('open');
    document.getElementById('drawerOverlay').classList.remove('open');
}

function saveDrawer() {
    closeDrawer();
    alert('保存成功！');
}

// Bulk Edit Logic
function updateSelectionStatus() {
    const checkboxes = document.querySelectorAll('.row-checkbox');
    const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
    document.getElementById('selected-count').textContent = `已选 ${checkedCount} 项`;
    
    const bulkActions = document.getElementById('bulk-actions');
    if (checkedCount > 0) {
        bulkActions.classList.remove('hidden');
    } else {
        bulkActions.classList.add('hidden');
    }
}

function toggleAll(source) {
    const checkboxes = document.querySelectorAll('.row-checkbox');
    checkboxes.forEach(cb => cb.checked = source.checked);
    updateSelectionStatus();
}

function applyBulkEdit(type) {
    const checkboxes = document.querySelectorAll('.row-checkbox:checked');
    if (checkboxes.length === 0) return;

    let value = '';
    if (type === 'direction') value = prompt('请输入策略方向 (如: UI交互, 推荐策略):', 'UI交互');
    if (type === 'dept') value = prompt('请输入二级部门:', '商城产品部');
    if (type === 'bool') value = prompt('是否可推全 (是/否):', '是');

    if (value) {
        checkboxes.forEach(cb => {
            const row = cb.closest('tr');
            const cellIndex = type === 'direction' ? 2 : type === 'dept' ? 3 : 4;
            const cell = row.cells[cellIndex].querySelector('.editable-cell');
            cell.innerText = value;
            cell.className = 'editable-cell';
        });
    }
}

// Inline Edit Logic
function editCell(element, type) {
    if (element.querySelector('select') || element.querySelector('input')) return;

    const currentValue = element.innerText === '点击选择' || element.innerText === '点击输入' ? '' : element.innerText;
    let input = document.createElement('select');
    
    let options = [];
    if (type === 'direction') {
        options = ['UI交互', '推荐策略', '资源位', '活动运营'];
    } else if (type === 'bool') {
        options = ['是', '否'];
    } else if (type === 'dept') {
        options = ['商城产品部', '推荐算法部', '用户增长部', '平台治理部'];
    }

    options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt;
        option.text = opt;
        if (opt === currentValue) option.selected = true;
        input.appendChild(option);
    });

    input.className = 'inline-edit';
    
    // Save on blur or change
    const save = () => {
        const newValue = input.value;
        element.innerText = newValue || '点击选择';
        element.className = newValue ? 'editable-cell' : 'editable-cell empty';
    };

    input.onblur = save;
    input.onchange = save; // Auto save on select

    element.innerHTML = '';
    element.appendChild(input);
    input.focus();
}

// Global click to close modal if clicked outside (optional)
document.getElementById('newReportModal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeNewReportModal();
    }
});
