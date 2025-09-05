let searchResults = [];
let currentFilter = 'all';

// 默认API地址
const DEFAULT_API_BASE = 'https://so.252035.xyz/api';
// const DEFAULT_API_BASE = 'http://129.151.148.117:8888/api';

// 当前会话使用的API地址，默认为默认地址
let currentApiBase = DEFAULT_API_BASE;

// 平台配置
const platforms = {
    baidu: { name: '百度网盘', class: 'platform-baidu' },
    aliyun: { name: '阿里云盘', class: 'platform-aliyun' },
    quark: { name: '夸克网盘', class: 'platform-quark' },
    tianyi: { name: '天翼云盘', class: 'platform-tianyi' },
    uc: { name: 'UC网盘', class: 'platform-uc' },
    mobile: { name: '移动云盘', class: 'platform-mobile' },
    '115': { name: '115网盘', class: 'platform-115' },
    pikpak: { name: 'PikPak', class: 'platform-pikpak' },
    xunlei: { name: '迅雷网盘', class: 'platform-xunlei' },
    '123': { name: '123网盘', class: 'platform-123' },
    magnet: { name: '磁力链接', class: 'platform-magnet' },
    ed2k: { name: 'eMule链接', class: 'platform-ed2k' }
};

// 全局函数需要挂载到window上，以便HTML中直接调用
window.toggleOptions = function() {
    const content = document.getElementById('optionsContent');
    const toggle = document.getElementById('optionsToggleText');

    if (content.style.display === 'flex') {
        content.style.display = 'none';
        toggle.textContent = '▼ 高级选项';
    } else {
        content.style.display = 'flex';
        toggle.textContent = '▲ 高级选项';
    }
};

window.handleSearch = async function(event) {
    event.preventDefault();

    const keyword = document.getElementById('searchInput').value.trim();
    if (!keyword) return;

    const searchBtn = document.getElementById('searchBtn');
    const resultsSection = document.getElementById('resultsSection');

    searchBtn.disabled = true;
    searchBtn.innerHTML = '<div class="loading">搜索中...</div>';

    try {
        const params = {
            kw: keyword,
            src: document.getElementById('sourceSelect').value,
            res: document.getElementById('resultType').value,
            conc: parseInt(document.getElementById('concurrency').value),
            refresh: document.getElementById('refreshCache').checked
        };

        // 使用当前API地址
        const response = await fetch(`${currentApiBase}/search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(params)
        });

        if (!response.ok) {
            throw new Error(`搜索失败: ${response.status}`);
        }

        const result = await response.json();

        if (result.code === 0 && result.data) {
            searchResults = result.data;
            displayResults(result.data);
            resultsSection.style.display = 'block';
        } else {
            throw new Error(result.message || '搜索失败');
        }

    } catch (error) {
        console.error('搜索错误:', error);
        showError(error.message);
    } finally {
        searchBtn.disabled = false;
        searchBtn.textContent = '搜索';
    }
};

function displayResults(data) {
    const resultsCount = document.getElementById('resultsCount');
    const filterTabs = document.getElementById('filterTabs');
    const platformIcons = document.getElementById('platformIcons');
    const resultsGrid = document.getElementById('resultsGrid');

    filterTabs.innerHTML = '';
    platformIcons.innerHTML = '';
    resultsGrid.innerHTML = '';

    resultsCount.textContent = `找到 ${data.total || 0} 个结果`;

    const allTab = document.createElement('div');
    allTab.className = 'filter-tab active';
    allTab.dataset.filter = 'all';
    allTab.textContent = `全部 (${data.total || 0})`;
    allTab.onclick = () => filterResults('all');
    filterTabs.appendChild(allTab);

    const availableTypes = Object.keys(data.merged_by_type || {});
    availableTypes.forEach(type => {
        const count = data.merged_by_type[type]?.length || 0;
        const tab = document.createElement('div');
        tab.className = 'filter-tab';
        tab.dataset.filter = type;
        tab.textContent = `${platforms[type]?.name || type} (${count})`;
        tab.onclick = () => filterResults(type);
        filterTabs.appendChild(tab);
    });

    availableTypes.forEach(type => {
        const icon = document.createElement('div');
        icon.className = `platform-icon ${platforms[type]?.class || ''}`;
        icon.textContent = platforms[type]?.name || type;
        platformIcons.appendChild(icon);
    });

    currentFilter = 'all';
    displayFilteredResults(data, 'all');
}

function filterResults(type) {
    currentFilter = type;
    document.querySelectorAll('.filter-tab').forEach(tab => tab.classList.remove('active'));
    const targetTab = document.querySelector(`[data-filter="${type}"]`);
    if (targetTab) {
        targetTab.classList.add('active');
    }
    displayFilteredResults(searchResults, type);
}

function displayFilteredResults(data, filterType) {
    const resultsGrid = document.getElementById('resultsGrid');
    resultsGrid.innerHTML = '';
    let results = [];

    if (filterType === 'all') {
        Object.keys(data.merged_by_type || {}).forEach(type => {
            const items = data.merged_by_type[type] || [];
            results.push(...items.map(item => ({ ...item, type })));
        });
    } else {
        const items = data.merged_by_type[filterType] || [];
        results = items.map(item => ({ ...item, type: filterType }));
    }

    if (results.length === 0) {
        resultsGrid.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                <h3>暂无结果</h3>
                <p>尝试使用不同的关键词或调整搜索条件</p>
            </div>`;
        return;
    }

    results.sort((a, b) => new Date(b.datetime || 0) - new Date(a.datetime || 0));
    results.forEach(result => {
        const card = createResultCard(result);
        resultsGrid.appendChild(card);
    });
}

function createResultCard(result) {
    const card = document.createElement('div');
    card.className = 'result-card';
    const platformInfo = platforms[result.type] || { name: result.type, class: '' };
    const timeStr = formatTime(result.datetime);
    const title = result.note || result.title || '未知资源';
    const content = result.content || '';
    const passwordHtml = result.password ? `<span class="result-password">密码: ${result.password}</span>` : '';
    const copyBtnHtml = `<button class="result-link ${platformInfo.class}" onclick="copyToClipboard(event, '${result.url}', '${result.password || ''}')">📋 复制链接</button>`;

    card.innerHTML = `
        <div class="result-header">
            <div class="result-title">${title}</div>
            <div class="result-time">${timeStr}</div>
        </div>
        <div class="result-content">
            <span class="platform-icon ${platformInfo.class}" style="display: inline-block; margin-right: 10px; margin-bottom: 10px;">${platformInfo.name}</span>
            ${content}
        </div>
        <div class="result-links">
            <a href="${result.url}" target="_blank" class="result-link ${platformInfo.class}">📁 打开链接</a>
            ${copyBtnHtml}
            ${passwordHtml}
        </div>`;
    return card;
}

function formatTime(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now - date;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return '今天';
    if (diffDays === 1) return '昨天';
    if (diffDays < 7) return `${diffDays}天前`;
    return date.toLocaleDateString('zh-CN');
}

function showError(message) {
    const resultsSection = document.getElementById('resultsSection');
    const resultsGrid = document.getElementById('resultsGrid');
    resultsGrid.innerHTML = `
        <div class="error-message">
            <h3>搜索出错</h3>
            <p>${message}</p>
            <p>请检查网络连接或稍后重试</p>
        </div>`;
    resultsSection.style.display = 'block';
}

window.copyToClipboard = function(event, url, password) {
    let textToCopy = url;
    if (password) {
        textToCopy += `\n密码: ${password}`;
    }
    navigator.clipboard.writeText(textToCopy).then(() => {
        const button = event.target.closest('button');
        const originalText = button.innerHTML;
        button.innerHTML = '✅ 已复制';
        button.style.background = '#52c41a';
        setTimeout(() => {
            button.innerHTML = originalText;
            button.style.background = '';
        }, 2000);
    }).catch(err => {
        console.error('复制失败:', err);
        alert('复制失败，请手动复制链接');
    });
};

// 检查 API 健康度的函数
async function checkApiHealth() {
    const apiWidget = document.getElementById('apiInfoWidget');
    const statusIndicator = apiWidget.querySelector('.status-indicator');

    statusIndicator.className = 'status-indicator loading';
    statusIndicator.textContent = '检查中...';

    try {
        const response = await fetch(`${currentApiBase}/health`, { method: 'GET' });
        if (response.ok) {
            statusIndicator.className = 'status-indicator online';
            statusIndicator.textContent = '在线';
            apiWidget.title = `API 健康，状态码: 200`;
        } else {
            statusIndicator.className = 'status-indicator offline';
            statusIndicator.textContent = '异常';
            apiWidget.title = `API 异常，状态码: ${response.status}`;
        }
    } catch (error) {
        statusIndicator.className = 'status-indicator offline';
        statusIndicator.textContent = '离线';
        apiWidget.title = `API 无法连接: ${error.message}`;
        console.error('API 健康检查失败:', error);
    }
}

// --- 新增/修改功能 ---

// 更新当前API地址并更新显示
function updateApiUrl(newUrl) {
    currentApiBase = newUrl;
    const displayElement = document.getElementById('currentApiDisplay');
    // 使用 innerHTML 来构建更丰富的显示效果
    displayElement.innerHTML = `
        <strong>API:</strong>
        <span class="api-url-text" title="${currentApiBase}">${currentApiBase}</span>
    `;
    // 更新API后立即检查其健康度
    checkApiHealth();
}

// 在页脚显示所有支持的平台
function displayPlatforms() {
    const platformContainer = document.getElementById('platformTagsContainer');
    platformContainer.innerHTML = ''; // 清空旧内容
    Object.values(platforms).forEach(platform => {
        const platformTag = document.createElement('span');
        platformTag.textContent = platform.name;
        platformContainer.appendChild(platformTag);
    });
}


// --- 初始化 ---
document.addEventListener('DOMContentLoaded', function() {
    // 初始化API显示
    updateApiUrl(DEFAULT_API_BASE);

    // 显示支持的平台列表
    displayPlatforms();

    // 设置自定义API按钮的点击事件
    const applyApiBtn = document.getElementById('applyApiBtn');
    const customApiInput = document.getElementById('customApiInput');

    applyApiBtn.addEventListener('click', () => {
        let newApiUrl = customApiInput.value.trim();
        if (!newApiUrl) {
            newApiUrl = DEFAULT_API_BASE;
            customApiInput.value = ''; // 清空输入框
        }
        if (newApiUrl.endsWith('/')) {
            newApiUrl = newApiUrl.slice(0, -1);
        }
        updateApiUrl(newApiUrl);
    });

    // 平台列表折叠逻辑
    const platformToggleBtn = document.getElementById('platformToggleBtn');
    const platformTagsContainer = document.getElementById('platformTagsContainer');

    platformToggleBtn.addEventListener('click', () => {
        const isVisible = platformTagsContainer.classList.toggle('visible');
        platformToggleBtn.textContent = isVisible ? '隐藏' : '显示';
    });

    // 定期检查API健康度
    setInterval(checkApiHealth, 30000);
});
