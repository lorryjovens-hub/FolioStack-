// 导航栏组件
function renderNavigation(currentPage) {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    const navHTML = `
        <div class="sidebar-header">
            <a href="landing.html" class="sidebar-logo">Folio<span>Stack</span></a>
        </div>
        <nav class="sidebar-nav">
            <div class="nav-section">
                <p class="nav-section-title">概览</p>
                <a href="dashboard.html" class="nav-item ${currentPage === 'dashboard' ? 'active' : ''}">
                    <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                    工作台
                </a>
                <a href="works.html" class="nav-item ${currentPage === 'works' ? 'active' : ''}">
                    <svg viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                    作品管理
                    <span class="nav-badge" id="worksCount">0</span>
                </a>
                <a href="analytics.html" class="nav-item ${currentPage === 'analytics' ? 'active' : ''}">
                    <svg viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                    数据分析
                </a>
            </div>
            <div class="nav-section">
                <p class="nav-section-title">创作</p>
                <a href="work-editor.html" class="nav-item ${currentPage === 'work-editor' ? 'active' : ''}">
                    <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    创建作品
                </a>
                <a href="import.html" class="nav-item ${currentPage === 'import' ? 'active' : ''}">
                    <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    导入作品
                </a>
                <a href="ai-generate.html" class="nav-item ${currentPage === 'ai-generate' ? 'active' : ''}">
                    <svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                    AI生成
                </a>
            </div>
            <div class="nav-section">
                <p class="nav-section-title">设置</p>
                <a href="profile.html" class="nav-item ${currentPage === 'profile' ? 'active' : ''}">
                    <svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    个人资料
                </a>
                <a href="settings.html" class="nav-item ${currentPage === 'settings' ? 'active' : ''}">
                    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                    系统设置
                </a>
            </div>
        </nav>
        <div class="sidebar-footer">
            <div class="user-card">
                <div class="user-avatar" id="userAvatar">L</div>
                <div class="user-info">
                    <p class="user-name" id="userName">Loading...</p>
                    <p class="user-email" id="userEmail">...</p>
                </div>
                <button class="logout-btn" id="logoutBtn" title="退出登录">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                </button>
            </div>
        </div>
    `;

    sidebar.innerHTML = navHTML;

    // 添加退出登录事件
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'landing.html';
        });
    }

    // 加载用户信息
    loadUserInfo();
}

// 加载用户信息
function loadUserInfo() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userNameEl = document.getElementById('userName');
    const userEmailEl = document.getElementById('userEmail');
    const userAvatarEl = document.getElementById('userAvatar');

    if (userNameEl) userNameEl.textContent = user.displayName || user.username || 'User';
    if (userEmailEl) userEmailEl.textContent = user.email || '';
    if (userAvatarEl) userAvatarEl.textContent = (user.displayName || user.username || 'U').charAt(0).toUpperCase();
}

// 自动检测当前页面并渲染导航
function initNavigation() {
    const path = window.location.pathname;
    let currentPage = 'dashboard';

    if (path.includes('works')) currentPage = 'works';
    else if (path.includes('analytics')) currentPage = 'analytics';
    else if (path.includes('work-editor')) currentPage = 'work-editor';
    else if (path.includes('import')) currentPage = 'import';
    else if (path.includes('ai-generate')) currentPage = 'ai-generate';
    else if (path.includes('profile')) currentPage = 'profile';
    else if (path.includes('settings')) currentPage = 'settings';
    else if (path.includes('dashboard')) currentPage = 'dashboard';

    renderNavigation(currentPage);
}

// 页面加载时自动初始化
document.addEventListener('DOMContentLoaded', initNavigation);
