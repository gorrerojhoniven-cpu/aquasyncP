// --- ROLE & AUTHENTICATION MANAGEMENT ---
let activeRole = 'owner';
let isSignUpMode = false;
let loggedInRole = null;
let loggedInStaffId = null;  // Store staff ID when logged in via server
let loggedInStaffUsername = null;  // Store staff username for activity log display

const btnRoleOwner = document.getElementById('btn-role-owner');
const btnRoleStaff = document.getElementById('btn-role-staff');
const authLogo = document.getElementById('auth-logo');
const authTitle = document.getElementById('auth-title');
const authSubtitle = document.getElementById('auth-subtitle');
const btnAuthSubmit = document.getElementById('btn-auth-submit');
const btnToggleAuth = document.getElementById('btn-toggle-auth');
const authUsernameInput = document.getElementById('auth-username');
const authPasswordInput = document.getElementById('auth-password');
const authForm = document.getElementById('auth-form');
const authOverlay = document.getElementById('auth-overlay');
const btnLogout = document.getElementById('btn-logout');
const ownerDashboard = document.getElementById('owner-dashboard');
const staffDashboard = document.getElementById('staff-dashboard');
const authStatus = document.getElementById('auth-status');
const saveOwnerBtn = document.getElementById('btn-save-owner');
const ownerUndoBtn = document.getElementById('btn-owner-undo');
const ownerResetBtn = document.getElementById('btn-owner-reset');
const ownerActivityLog = document.getElementById('owner-activity-log');
const ownerMonitorStatus = document.getElementById('owner-monitor-status');
const toastContainer = document.getElementById('toast-container');
const confirmOrderBtn = document.querySelector('.confirm-btn');
const ownerSummaryDate = document.getElementById('owner-summary-date');
const btnRefreshSales = document.getElementById('btn-refresh-sales');
const dailySalesText = document.getElementById('daily-sales');
const monthlySalesText = document.getElementById('monthly-sales');
const yearlySalesText = document.getElementById('yearly-sales');
const summaryCountText = document.getElementById('summary-count');
const stagedActionText = document.getElementById('staged-action-text');
const stagedActionsList = document.getElementById('staged-actions-list');
const staffRevenueText = document.getElementById('staff-revenue');
const staffWaterText = document.getElementById('staff-water');
const staffContainersText = document.getElementById('staff-containers');
const staffBorrowedText = document.getElementById('staff-borrowed');
const btnSaveActivity = document.getElementById('btn-save-activity');
const btnReviewUndo = document.getElementById('btn-review-undo');
const ownerReviewTotal = document.getElementById('owner-review-total');
const ownerReviewList = document.getElementById('owner-review-list');
const ownerOrdersTableBody = document.getElementById('owner-orders-table-body');
const themeToggleBtn = document.getElementById('btn-theme-toggle');
const authThemeToggleBtn = document.getElementById('btn-theme-toggle-auth');
const themePreferenceKey = 'theme_preference';
const activeSessionKey = 'aquasync_active_session';
const activeOwnerSectionKey = 'aquasync_active_owner_section';
const rolloverMetaKey = 'dashboard-rollover-date';
const defaultDashboardValues = { revenue: 1200, water: 1232, containers: 65, borrowed: 112 };
let currentStagedAction = { label: 'No action', qty: 0, total: 0 };

function getStaffActionFromCard(card) {
    const qty = Number(card.querySelector('.action-qty')?.value) || 0;
    const label = card.querySelector('.action-label')?.innerText || 'Unknown action';
    const priceText = card.querySelector('.action-price')?.innerText || card.querySelector('.action-meta')?.innerText || '';
    const unitPrice = Number((priceText.match(/₱([0-9]+(?:\.[0-9]{1,2})?)/) || [0, '0'])[1]) || 0;
    return { label, qty, unitPrice, totalCash: qty * unitPrice };
}

function renderStagedActions() {
    if (!stagedActionsList || !stagedActionText) return;

    const actionCards = Array.from(document.querySelectorAll('.action-card'));
    const actions = actionCards
        .map((card, index) => ({ ...getStaffActionFromCard(card), index }))
        .filter((action) => action.qty > 0);

    if (!actions.length) {
        stagedActionText.innerText = 'No quantities selected yet.';
        stagedActionsList.innerHTML = '<div class="staged-empty">Set a quantity above to add it here.</div>';
        return;
    }

    const total = actions.reduce((sum, action) => sum + action.totalCash, 0);
    stagedActionText.innerText = `${actions.length} item${actions.length === 1 ? '' : 's'} selected · Total: ₱${total}`;
    stagedActionsList.innerHTML = actions.map((action) => `
        <div class="staged-action-row" data-card-index="${action.index}">
            <div class="staged-action-details">
                <strong>${action.label}</strong>
                <span>₱${action.unitPrice.toFixed(2)} each · Subtotal: ₱${action.totalCash.toFixed(2)}</span>
            </div>
            <label class="staged-quantity-label">Qty
                <input class="staged-quantity-input" type="number" min="0" value="${action.qty}" aria-label="Quantity for ${action.label}">
            </label>
            <button type="button" class="staged-remove-btn">Remove</button>
        </div>
    `).join('');

    stagedActionsList.querySelectorAll('.staged-action-row').forEach((row) => {
        const card = actionCards[Number(row.dataset.cardIndex)];
        const quantityInput = row.querySelector('.staged-quantity-input');
        quantityInput.addEventListener('input', () => {
            card.querySelector('.action-qty').value = Math.max(0, Number(quantityInput.value) || 0);
            renderStagedActions();
        });
        row.querySelector('.staged-remove-btn').addEventListener('click', () => {
            card.querySelector('.action-qty').value = '';
            renderStagedActions();
            showToast(`${getStaffActionFromCard(card).label} removed from the transaction.`, 'info');
        });
    });
}

const ownerAccountKey = 'owner_account';
const staffAccountKey = 'staff_account';
const ownerSeed = { username: 'owner', password: 'owner123' };
const staffSeed = { username: 'staff', password: 'staff123' };

function updateRoleSwitcherUI() {
    const isOwner = activeRole === 'owner';

    btnRoleOwner.classList.toggle('active', isOwner);
    btnRoleStaff.classList.toggle('active', !isOwner);

    if (authLogo) {
        authLogo.style.background = isOwner
            ? 'linear-gradient(135deg, #67e8f9, #818cf8)'
            : 'linear-gradient(135deg, #f9a8d4, #818cf8)';
    }

    if (btnAuthSubmit) {
        btnAuthSubmit.style.background = isOwner
            ? 'linear-gradient(135deg, #22d3ee, #818cf8)'
            : 'linear-gradient(135deg, #f472b6, #8b5cf6)';
    }
}

function checkAccountStatus() {
    updateRoleSwitcherUI();
    
    if (activeRole === 'staff') {
        // Staff accounts are created by owner only - never show signup
        isSignUpMode = false;
        authTitle.innerText = 'Staff Security Login';
        authSubtitle.innerText = 'Sign in to record transactions and view today\'s inventory.';
        btnAuthSubmit.innerText = 'Sign in as staff';
        btnToggleAuth.classList.add('hidden');  // Hide toggle button for staff
        authStatus.innerText = '';
        return;
    }
    
    // Owner account logic (unchanged)
    const accountKey = ownerAccountKey;
    const accountExists = localStorage.getItem(accountKey);

    if (!accountExists) {
        isSignUpMode = true;
        authTitle.innerText = 'Create owner account';
        authSubtitle.innerText = 'Set up the account used to manage your AquaSync business.';
        btnAuthSubmit.innerText = 'Create Account';
        btnToggleAuth.classList.add('hidden');
        authStatus.innerText = '';
    } else {
        isSignUpMode = false;
        authTitle.innerText = 'Owner sign in';
        authSubtitle.innerText = 'Sign in to manage sales, inventory, and staff activity.';
        btnAuthSubmit.innerText = 'Sign in as owner';
        btnToggleAuth.classList.remove('hidden');
        btnToggleAuth.innerText = 'Create Owner Account';
        authStatus.innerText = '';
    }
}

function setAuthMessage(message, type = 'success') {
    authStatus.innerText = message;
    authStatus.className = `auth-status ${type}`;
}

function showToast(message, type = 'info') {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('hide');
    }, 2400);

    toast.addEventListener('transitionend', () => {
        if (toast.parentElement) toast.parentElement.removeChild(toast);
    });
}

function getStoredTheme() {
    const stored = localStorage.getItem(themePreferenceKey);
    if (stored === 'light' || stored === 'dark') return stored;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function updateThemeButtonLabels(theme) {
    const label = theme === 'light' ? '🌙 Dark mode' : '☀️ Light mode';
    if (themeToggleBtn) themeToggleBtn.textContent = label;
    if (authThemeToggleBtn) authThemeToggleBtn.textContent = label;
}

function applyTheme(theme) {
    document.body.classList.toggle('theme-light', theme === 'light');
    document.body.classList.toggle('theme-dark', theme === 'dark');
    localStorage.setItem(themePreferenceKey, theme);
    updateThemeButtonLabels(theme);
}

function toggleTheme() {
    const current = document.body.classList.contains('theme-light') ? 'light' : 'dark';
    applyTheme(current === 'light' ? 'dark' : 'light');
}

function initializeTheme() {
    applyTheme(getStoredTheme());
}

function getTodayDate() {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${now.getFullYear()}-${month}-${day}`;
}

function getStoredDashboardValues() {
    return JSON.parse(localStorage.getItem('dashboard-values') || JSON.stringify(defaultDashboardValues));
}

function saveDashboardValues(values) {
    localStorage.setItem('dashboard-values', JSON.stringify(values));
}

function saveLatestOwnerUndoState(values) {
    localStorage.setItem('owner-history', JSON.stringify([values]));
}

async function loadSharedDashboardState(role = loggedInRole) {
    try {
        const response = await fetch('/api/dashboard-state');
        if (!response.ok) throw new Error('Unable to load shared dashboard state');
        const values = await response.json();
        saveDashboardValues(values);
        configureDashboardView(role);
        return values;
    } catch (error) {
        console.error('Shared dashboard state unavailable:', error);
        return getStoredDashboardValues();
    }
}

async function saveSharedDashboardState(values) {
    const response = await fetch('/api/dashboard-state', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
    });
    if (!response.ok) throw new Error('Unable to save shared dashboard state');
    const savedValues = await response.json();
    saveDashboardValues(savedValues);
    return savedValues;
}

function getLastRolloverDate() {
    return localStorage.getItem(rolloverMetaKey);
}

function setLastRolloverDate(dateStr) {
    localStorage.setItem(rolloverMetaKey, dateStr);
}

function getActivityLogTotal() {
    const logLines = JSON.parse(localStorage.getItem('staff-activity-log') || '[]');
    const amountRegex = /₱([0-9]+(?:\.[0-9]{1,2})?)/g;
    return logLines.reduce((total, line) => {
        let match;
        while ((match = amountRegex.exec(line)) !== null) {
            total += Number(match[1]);
        }
        return total;
    }, 0);
}

function saveDailySalesSummary(values, date, finalAmount) {
    const amountValue = typeof finalAmount === 'number' && finalAmount > 0 ? finalAmount : 0;
    if (amountValue <= 0) return;

    const entry = {
        date,
        amount: amountValue,
        water: Number(values.water) || 0,
        containers: Number(values.containers) || 0,
        borrowed: Number(values.borrowed) || 0,
        note: `Daily rollover sales history for ${date}`,
        createdAt: new Date().toISOString()
    };

    localStorage.setItem(
        'daily-sales-history',
        JSON.stringify([entry, ...(JSON.parse(localStorage.getItem('daily-sales-history') || '[]'))].slice(0, 30))
    );

    fetch('/api/daily-sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry)
    }).catch(() => {
        showToast('Daily sales summary saved locally.', 'info');
    });
}

function applyDailyRollover() {
    const today = getTodayDate();
    const lastDate = getLastRolloverDate();

    if (lastDate === today) return;

    if (lastDate) {
        const previousValues = JSON.parse(localStorage.getItem('dashboard-values') || JSON.stringify(defaultDashboardValues));
        const activityTotal = getActivityLogTotal();
        saveDailySalesSummary(previousValues, lastDate, activityTotal);
    }

    saveDashboardValues(defaultDashboardValues);
    setLastRolloverDate(today);

    if (ownerSummaryDate) {
        ownerSummaryDate.value = today;
    }

    if (loggedInRole === 'owner') {
        configureDashboardView('owner');
        fetchSalesSummary(today);
        showToast('Midnight rollover completed. Dashboard reset to baseline values.', 'success');
    }
}

function scheduleMidnightRollover() {
    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setHours(24, 0, 5, 0);
    const delay = nextMidnight.getTime() - now.getTime();

    setTimeout(() => {
        applyDailyRollover();
        scheduleMidnightRollover();
    }, delay);
}

function updateSalesSummaryUI(data) {
    dailySalesText.innerText = `₱${data.daily}`;
    monthlySalesText.innerText = `₱${data.monthly}`;
    yearlySalesText.innerText = `₱${data.yearly}`;
    summaryCountText.innerText = data.summary.count;
}

function applyLocalSalesSummaryFallback(date) {
    const history = JSON.parse(localStorage.getItem('daily-sales-history') || '[]');
    const dailyTotal = history
        .filter((entry) => entry.date === date)
        .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
    const monthlyTotal = history
        .filter((entry) => entry.date.startsWith(date.slice(0, 7)))
        .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
    const yearlyTotal = history
        .filter((entry) => entry.date.startsWith(date.slice(0, 4)))
        .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
    const totalCount = history.length;

    const summary = {
        daily: dailyTotal,
        monthly: monthlyTotal,
        yearly: yearlyTotal,
        summary: { count: totalCount }
    };

    updateSalesSummaryUI(summary);
}

async function fetchSalesSummary(date) {
    try {
        const response = await fetch(`/api/sales-summary?date=${date}`);
        if (!response.ok) throw new Error('Failed to load sales summary');
        const data = await response.json();
        updateSalesSummaryUI(data);
        showToast('Sales summary loaded.', 'success');
    } catch (error) {
        applyLocalSalesSummaryFallback(date);
        showToast('Unable to load sales summary from server. Loaded local summary instead.', 'warning');
    }
}

function saveCredentials(role, username, password) {
    if (role === 'owner') {
        localStorage.setItem(ownerAccountKey, JSON.stringify({ username, password }));
    }
    // Staff credentials are NOT stored locally - handled by server
}

async function authenticateUser(role, username, password) {
    if (role === 'owner') {
        // Owner authentication - local storage (original flow)
        const accountKey = ownerAccountKey;
        const storedAccount = localStorage.getItem(accountKey);

        if (!storedAccount) {
            if (username === ownerSeed.username && password === ownerSeed.password) {
                saveCredentials(role, username, password);
                return true;
            }
            return false;
        }

        const parsed = JSON.parse(storedAccount);
        return parsed.username === username && parsed.password === password;
    } else {
        // Staff authentication - via server API
        try {
            const response = await fetch('/api/staff/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            if (response.ok) {
                const data = await response.json();
                loggedInStaffId = data.id;
                loggedInStaffUsername = data.username;
                return true;
            }
            return false;
        } catch (error) {
            console.error('Staff authentication error:', error);
            return false;
        }
    }
}

function saveActiveSession(role, username, password) {
    sessionStorage.setItem(activeSessionKey, JSON.stringify({ role, username, password }));
}

function clearActiveSession() {
    sessionStorage.removeItem(activeSessionKey);
}

async function restoreActiveSession() {
    const storedSession = sessionStorage.getItem(activeSessionKey);
    if (!storedSession) return;

    try {
        const session = JSON.parse(storedSession);
        if (!session.role || !session.username || !session.password) {
            clearActiveSession();
            return;
        }

        if (await authenticateUser(session.role, session.username, session.password)) {
            showDashboard(session.role);
        } else {
            clearActiveSession();
        }
    } catch (error) {
        console.error('Unable to restore active session:', error);
        clearActiveSession();
    }
}

function showDashboard(role) {
    loggedInRole = role;
    document.getElementById('app-shell').classList.toggle('owner-session', role === 'owner');
    authOverlay.classList.add('hidden');
    btnLogout.classList.remove('hidden');
    const dashboardMenu = document.getElementById(role === 'owner' ? 'owner-dashboard-menu' : 'staff-dashboard-menu');
    const topbarActions = document.querySelector('.topbar-actions');
    if (dashboardMenu && topbarActions) {
        if (role === 'staff') {
            dashboardMenu.prepend(themeToggleBtn);
            dashboardMenu.appendChild(btnLogout);
            topbarActions.classList.add('hidden');
        } else {
            dashboardMenu.appendChild(topbarActions);
        }
    }
    ownerDashboard.classList.toggle('hidden', role !== 'owner');
    staffDashboard.classList.toggle('hidden', role !== 'staff');
    configureDashboardView(role);
    loadSharedDashboardState(role);
    if (role === 'owner') {
        switchOwnerSection(sessionStorage.getItem(activeOwnerSectionKey) || 'overview');
    }
    if (role === 'owner') {
        const date = ownerSummaryDate?.value || getTodayDate();
        fetchSalesSummary(date);
        fetchActivityLogs();
        renderReviewList();
        if (activityPollInterval) clearInterval(activityPollInterval);
        activityPollInterval = setInterval(fetchActivityLogs, 3000);
    }
}

function switchOwnerSection(sectionName) {
    sessionStorage.setItem(activeOwnerSectionKey, sectionName);
    const menuItems = document.querySelectorAll('.menu-item[data-owner-section]');
    const sections = document.querySelectorAll('[data-owner-section-content]');

    menuItems.forEach((item) => {
        item.classList.toggle('active', item.dataset.ownerSection === sectionName);
    });

    sections.forEach((section) => {
        section.classList.toggle('hidden', section.dataset.ownerSectionContent !== sectionName);
    });

    const ownerDashboardCard = document.getElementById('owner-dashboard');
    if (ownerDashboardCard) {
        ownerDashboardCard.classList.remove('mobile-menu-open');
        const toggleButton = document.getElementById('owner-menu-toggle');
        if (toggleButton) {
            toggleButton.setAttribute('aria-expanded', 'false');
        }
    }
}

const ownerMenuToggle = document.getElementById('owner-menu-toggle');
if (ownerMenuToggle) {
    ownerMenuToggle.addEventListener('click', () => {
        const ownerDashboardCard = document.getElementById('owner-dashboard');
        if (!ownerDashboardCard) return;
        const isOpen = ownerDashboardCard.classList.toggle('mobile-menu-open');
        ownerMenuToggle.setAttribute('aria-expanded', String(isOpen));
    });
}

document.querySelectorAll('.menu-item[data-owner-section]').forEach((item) => {
    item.addEventListener('click', () => {
        const sectionName = item.dataset.ownerSection;
        if (sectionName === 'staff') {
            document.getElementById('btn-manage-staff')?.click();
            return;
        }
        switchOwnerSection(sectionName);
    });
});

function hideDashboard() {
    loggedInRole = null;
    document.getElementById('app-shell').classList.remove('owner-session');
    const topbar = document.querySelector('.topbar');
    const topbarActions = document.querySelector('.topbar-actions');
    if (topbar && topbarActions) {
        topbarActions.classList.remove('hidden');
        topbarActions.append(themeToggleBtn, btnLogout);
        topbar.appendChild(topbarActions);
    }
    loggedInStaffId = null;
    loggedInStaffUsername = null;
    authOverlay.classList.remove('hidden');
    btnLogout.classList.add('hidden');
    ownerDashboard.classList.add('hidden');
    staffDashboard.classList.add('hidden');
    authUsernameInput.value = '';
    authPasswordInput.value = '';
    setAuthMessage('');
    if (activityPollInterval) {
        clearInterval(activityPollInterval);
        activityPollInterval = null;
    }
}

function configureDashboardView(role) {
    const ownerInputs = document.querySelectorAll('#owner-dashboard input[data-stat]');
    ownerInputs.forEach((input) => {
        input.disabled = role !== 'owner';
    });

    const currentValues = JSON.parse(localStorage.getItem('dashboard-values') || '{}');
    ownerInputs.forEach((input) => {
        const key = input.dataset.stat;
        if (currentValues[key] !== undefined) {
            input.value = currentValues[key];
        }
    });

    const staffValues = {
        revenue: currentValues.revenue || 0,
        water: currentValues.water || 0,
        containers: currentValues.containers || 0,
        borrowed: currentValues.borrowed || 0
    };

    if (staffRevenueText) staffRevenueText.innerText = `₱${staffValues.revenue}`;
    if (staffWaterText) staffWaterText.innerText = `${staffValues.water} L`;
    if (staffContainersText) staffContainersText.innerText = staffValues.containers;
    if (staffBorrowedText) staffBorrowedText.innerText = staffValues.borrowed;

    if (!loggedInRole || loggedInRole !== 'owner') {
        const logLines = JSON.parse(localStorage.getItem('staff-activity-log') || '[]');
        if (ownerActivityLog) ownerActivityLog.value = logLines.slice(0, 8).join('\n');
        if (ownerMonitorStatus) ownerMonitorStatus.innerText = getMonitorStatus(currentValues);
    }
    updateOwnerUndoState();
}


btnRoleOwner.addEventListener('click', () => {
    if (activeRole === 'owner') return;
    activeRole = 'owner';
    authUsernameInput.value = '';
    authPasswordInput.value = '';
    checkAccountStatus();
    showToast('Owner login selected.', 'info');
});

btnRoleStaff.addEventListener('click', () => {
    if (activeRole === 'staff') return;
    activeRole = 'staff';
    authUsernameInput.value = '';
    authPasswordInput.value = '';
    checkAccountStatus();
    showToast('Staff login selected.', 'info');
});

btnToggleAuth.addEventListener('click', () => {
    if (activeRole === 'owner') {
        localStorage.removeItem(ownerAccountKey);
    } else {
        localStorage.removeItem(staffAccountKey);
    }
    checkAccountStatus();
    setAuthMessage('Account cleared. Create a new one now.', 'success');
    showToast('Account state cleared for current role.', 'success');
});

if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', toggleTheme);
}

if (authThemeToggleBtn) {
    authThemeToggleBtn.addEventListener('click', toggleTheme);
}

authForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const username = authUsernameInput.value.trim();
    const password = authPasswordInput.value.trim();

    if (!username || !password) {
        setAuthMessage('Please enter both username and password.', 'error');
        showToast('Login requires username and password.', 'error');
        return;
    }

    if (isSignUpMode) {
        // Only owner can create account, not staff
        if (activeRole === 'owner') {
            saveCredentials(activeRole, username, password);
            setAuthMessage('Owner account created. You can now log in.', 'success');
            showToast('Account created successfully.', 'success');
            checkAccountStatus();
        } else {
            setAuthMessage('Staff accounts can only be created by the owner.', 'error');
            showToast('Contact owner to create staff account.', 'error');
        }
        return;
    }

    if (await authenticateUser(activeRole, username, password)) {
        saveActiveSession(activeRole, username, password);
        showDashboard(activeRole);
        setAuthMessage(`Welcome ${activeRole === 'owner' ? 'Owner' : 'Staff'} access granted.`, 'success');
        showToast('Login successful. Redirecting to dashboard.', 'success');
    } else {
        setAuthMessage('Invalid credentials for this role.', 'error');
        showToast('Login failed. Check your credentials.', 'error');
    }
});

btnLogout.addEventListener('click', () => {
    const confirmed = window.confirm('Do you want to log out now?');
    if (!confirmed) {
        showToast('Logout canceled.', 'info');
        return;
    }

    clearActiveSession();
    hideDashboard();
    showToast('Logged out successfully.', 'success');
});

saveOwnerBtn.addEventListener('click', async () => {
    const values = {};
    const inputs = Array.from(document.querySelectorAll('#owner-dashboard input[data-stat]'));
    const emptyField = inputs.find((input) => input.value === '' || input.value == null);

    if (emptyField) {
        setAuthMessage('Please fill in all owner dashboard values before saving.', 'error');
        showToast('Cannot save: one or more fields are empty.', 'error');
        return;
    }

    inputs.forEach((input) => {
        values[input.dataset.stat] = Number(input.value) || 0;
    });
    const currentValues = getStoredDashboardValues();
    if (JSON.stringify(currentValues) !== JSON.stringify(values)) {
        saveLatestOwnerUndoState(currentValues);
    }
    try {
        await saveSharedDashboardState(values);
        configureDashboardView('owner');
        setAuthMessage('Owner values saved for all devices.', 'success');
        showToast('Owner values have been saved for all devices.', 'success');
    } catch (error) {
        localStorage.setItem('dashboard-values', JSON.stringify(values));
        configureDashboardView('owner');
        setAuthMessage('Saved locally. Server is unavailable.', 'error');
        showToast('Server unavailable. Saved locally for now.', 'warning');
    }
});

function isAnyOwnerInventoryZero() {
    const values = JSON.parse(localStorage.getItem('dashboard-values') || '{}');
    return [values.revenue, values.water, values.containers, values.borrowed].some((value) => Number(value) === 0);
}

if (ownerSummaryDate) {
    ownerSummaryDate.value = getTodayDate();
}

if (btnRefreshSales) {
    btnRefreshSales.addEventListener('click', () => {
        const date = ownerSummaryDate?.value || getTodayDate();
        fetchSalesSummary(date);
    });
}

ownerResetBtn.addEventListener('click', async () => {
    const confirmed = window.confirm('Reset owner dashboard values to zero? This cannot be undone without undo.');
    if (!confirmed) {
        showToast('Reset canceled.', 'info');
        return;
    }

    const currentValues = JSON.parse(localStorage.getItem('dashboard-values') || '{}');
    saveLatestOwnerUndoState(currentValues);

    const resetValues = { revenue: 0, water: 0, containers: 0, borrowed: 0 };
    try {
        await saveSharedDashboardState(resetValues);
        configureDashboardView('owner');
        setAuthMessage('Owner dashboard reset for all devices.', 'success');
        showToast('Owner dashboard reset for all devices.', 'success');
    } catch (error) {
        saveDashboardValues(resetValues);
        configureDashboardView('owner');
        showToast('Server unavailable. Reset saved locally only.', 'warning');
    }
});

ownerUndoBtn.addEventListener('click', async () => {
    const history = JSON.parse(localStorage.getItem('owner-history') || '[]');
    if (!history.length) {
        setAuthMessage('Nothing to undo.', 'error');
        showToast('Nothing to undo at this time.', 'error');
        return;
    }

    const previousState = history[history.length - 1];
    localStorage.removeItem('owner-history');
    try {
        await saveSharedDashboardState(previousState);
        configureDashboardView('owner');
        setAuthMessage('Previous owner state restored for all devices.', 'success');
        showToast('Owner dashboard undo completed.', 'success');
    } catch (error) {
        saveDashboardValues(previousState);
        configureDashboardView('owner');
        showToast('Server unavailable. Undo saved locally only.', 'warning');
    }
});

function updateOwnerUndoState() {
    const history = JSON.parse(localStorage.getItem('owner-history') || '[]');
    ownerUndoBtn.disabled = history.length === 0;
}
function getMonitorStatus(values) {
    const logLines = JSON.parse(localStorage.getItem('staff-activity-log') || '[]');
    if (!logLines.length) {
        return 'Owner monitor is ready. Waiting for staff actions...';
    }

    const latest = logLines[0];
    return `Last staff action: ${latest}`;
}

function addStaffLogEntry(entry) {
    const logLines = JSON.parse(localStorage.getItem('staff-activity-log') || '[]');
    logLines.unshift(entry);
    if (logLines.length > 8) logLines.pop();
    localStorage.setItem('staff-activity-log', JSON.stringify(logLines));
}

function addSavedActivityReview(entry) {
    const reviews = JSON.parse(localStorage.getItem('owner-activity-reviews') || '[]');
    reviews.unshift(entry);
    localStorage.setItem('owner-activity-reviews', JSON.stringify(reviews.slice(0, 20)));
}

function formatCurrency(amount) {
    return `₱${Number(amount || 0).toFixed(2)}`;
}

function getSavedActivityReviews() {
    return JSON.parse(localStorage.getItem('owner-activity-reviews') || '[]');
}

function getReviewTotal(review) {
    if (typeof review.total === 'number' && !Number.isNaN(review.total)) {
        return review.total;
    }

    if (typeof review.details === 'string') {
        const amountRegex = /₱([0-9]+(?:\.[0-9]{1,2})?)/g;
        let total = 0;
        let match;
        while ((match = amountRegex.exec(review.details)) !== null) {
            total += Number(match[1]);
        }
        return total;
    }

    return 0;
}

function getSavedActivityReviewsTotal() {
    const reviews = getSavedActivityReviews();
    return reviews.reduce((sum, review) => sum + getReviewTotal(review), 0);
}

function parseActivityLogTotal(lines) {
    const amountRegex = /₱([0-9]+(?:\.[0-9]{1,2})?)/g;
    return lines.reduce((total, line) => {
        let match;
        while ((match = amountRegex.exec(line)) !== null) {
            total += Number(match[1]);
        }
        return total;
    }, 0);
}

let lastDeletedReview = null;

function removeSavedActivityReview(index) {
    const reviews = getSavedActivityReviews();
    if (index < 0 || index >= reviews.length) return;
    lastDeletedReview = { review: reviews[index], index };
    reviews.splice(index, 1);
    localStorage.setItem('owner-activity-reviews', JSON.stringify(reviews));
    renderReviewList();
    if (btnReviewUndo) btnReviewUndo.classList.remove('hidden');
    showToast('Saved activity entry deleted. You can undo it.', 'warning');
}

function undoLastDeletedReview() {
    if (!lastDeletedReview) {
        showToast('No deleted entry to restore.', 'info');
        return;
    }

    const reviews = getSavedActivityReviews();
    const restoreIndex = Math.min(lastDeletedReview.index, reviews.length);
    reviews.splice(restoreIndex, 0, lastDeletedReview.review);
    localStorage.setItem('owner-activity-reviews', JSON.stringify(reviews));
    lastDeletedReview = null;
    if (btnReviewUndo) btnReviewUndo.classList.add('hidden');
    renderReviewList();
    showToast('Deleted activity restored.', 'success');
}

function downloadSavedActivityReview(index) {
    const reviews = getSavedActivityReviews();
    if (index < 0 || index >= reviews.length) return;
    const review = reviews[index];
    const content = `Date: ${review.date}\nTotal: ${formatCurrency(getReviewTotal(review))}\n\n${review.details}`;
    const filename = `saved-activity-${review.date.replace(/[^0-9]/g, '_')}.txt`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    showToast('Saved activity downloaded.', 'success');
}

function parseReviewOrderRows(details = '') {
    const rows = [];
    const lines = String(details || '').split('\n').filter((line) => line.trim());

    lines.forEach((line) => {
        const match = line.match(/(?:\d{1,2}:\d{2}:\d{2}\s*[AP]M\s*[-–]\s*)?(.+?):\s*(.+?)\s*x(\d+)\s*\((?:₱)?([0-9]+(?:\.[0-9]{1,2})?)\)/i);
        if (!match) {
            const fallbackMatch = line.match(/(.+?):\s*(.+?)\s*(?:\(.*?\))?$/i);
            if (!fallbackMatch) return;
            rows.push({
                staffName: fallbackMatch[1]?.trim() || 'Staff',
                product: fallbackMatch[2]?.trim() || 'Order',
                quantity: 1,
                price: 0,
                total: 0
            });
            return;
        }

        const [, staffName, product, quantity, totalText] = match;
        const parsedQuantity = Number(quantity) || 0;
        const parsedTotal = Number(totalText) || 0;
        const unitPrice = parsedQuantity > 0 ? parsedTotal / parsedQuantity : parsedTotal;

        rows.push({
            staffName: (staffName || 'Staff').trim(),
            product: (product || 'Order').trim(),
            quantity: parsedQuantity,
            price: unitPrice,
            total: parsedTotal
        });
    });

    return rows;
}

function renderSavedOrdersTable(rows = [], reviewDate = '', reviewIndex = null) {
    const tableRows = rows.length
        ? rows.map((row) => `
            <tr>
                <td data-label="Date">${reviewDate || '—'}</td>
                <td data-label="Staff">${row.staffName || 'Staff'}</td>
                <td data-label="Product">${row.product || 'Order'}</td>
                <td data-label="Quantity">${Number(row.quantity) || 0}</td>
                <td data-label="Price">₱${Number(row.price || 0).toFixed(2)}</td>
                <td data-label="Total">₱${Number(row.total || 0).toFixed(2)}</td>
            </tr>
        `).join('')
        : '<tr><td colspan="6">No saved orders.</td></tr>';

    const actions = reviewIndex !== null
        ? `
            <div class="review-actions-inline">
                <button class="review-download-btn" data-index="${reviewIndex}" type="button">Download</button>
                <button class="review-delete-btn" data-index="${reviewIndex}" type="button">Delete</button>
            </div>
        `
        : '';

    return `
        <div class="review-item">
            <div class="review-item-header">
                <div>
                    <div class="review-date">${reviewDate || 'Date not available'}</div>
                    <div class="review-total-line">Total for entry: ${formatCurrency(rows.reduce((sum, row) => sum + Number(row.total || 0), 0))}</div>
                </div>
                ${actions}
            </div>
            <div class="orders-table-wrap">
                <table class="orders-table" aria-label="Saved order rows">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Staff Name</th>
                            <th>Product</th>
                            <th>Quantity</th>
                            <th>Price</th>
                            <th>Total Price</th>
                        </tr>
                    </thead>
                    <tbody>${tableRows}</tbody>
                </table>
            </div>
        </div>
    `;
}

function renderReviewList() {
    const reviews = getSavedActivityReviews();
    if (!ownerReviewList) return;
    if (!reviews.length) {
        ownerReviewList.innerHTML = '<div class="review-item empty">No saved activity yet.</div>';
        if (ownerReviewTotal) ownerReviewTotal.innerText = `Total saved amount: ${formatCurrency(0)}`;
        return;
    }

    const reviewHtml = reviews.map((review, index) => {
        const parsedRows = Array.isArray(review.rows) && review.rows.length ? review.rows : parseReviewOrderRows(review.details || '');
        return renderSavedOrdersTable(parsedRows, review.date, index);
    }).join('');

    ownerReviewList.innerHTML = reviewHtml;
    if (ownerReviewTotal) {
        ownerReviewTotal.innerText = `Total saved amount: ${formatCurrency(getSavedActivityReviewsTotal())}`;
    }
}

if (ownerReviewList) {
    ownerReviewList.addEventListener('click', (event) => {
        const deleteButton = event.target.closest('.review-delete-btn');
        if (deleteButton) {
            const index = Number(deleteButton.dataset.index);
            removeSavedActivityReview(index);
            return;
        }

        const downloadButton = event.target.closest('.review-download-btn');
        if (downloadButton) {
            const index = Number(downloadButton.dataset.index);
            downloadSavedActivityReview(index);
        }
    });
}

if (btnReviewUndo) {
    btnReviewUndo.addEventListener('click', undoLastDeletedReview);
}

function postActivityLog(activity) {
    // Use staff username if logged in as staff, otherwise use role
    const displayName = (loggedInRole === 'staff' && loggedInStaffUsername) ? loggedInStaffUsername : activity.role;
    addStaffLogEntry(`${new Date().toLocaleTimeString()} – ${displayName}: ${activity.action} x${activity.qty} (₱${activity.amount})${activity.note ? ' – ' + activity.note : ''}`);
    try {
        // Include staffId if logged in as staff
        const payload = { ...activity };
        if (loggedInRole === 'staff' && loggedInStaffId) {
            payload.staffId = loggedInStaffId;
        }
        
        return fetch('/api/activity', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }).then((response) => {
            if (!response.ok) throw new Error('Failed to save activity');
            return response.json();
        });
    } catch (e) {
        return Promise.reject(e);
    }
}

function simulateStaffAction(actionLabel, quantity, totalCash) {
    const currentValues = JSON.parse(localStorage.getItem('dashboard-values') || '{}');
    const previousState = { ...currentValues };
    saveLatestOwnerUndoState(previousState);

    currentValues.revenue = Number(currentValues.revenue || 0) + totalCash;
    currentValues.water = Math.max(0, Number(currentValues.water || 0) - quantity);
    currentValues.containers = Number(currentValues.containers || 0);
    currentValues.borrowed = Number(currentValues.borrowed || 0);

    if (actionLabel.toLowerCase().includes('new jug')) {
        currentValues.containers = Math.max(0, currentValues.containers - quantity);
    }
    if (actionLabel.toLowerCase().includes('dispatch')) {
        currentValues.borrowed = Number(currentValues.borrowed || 0) + quantity;
    }
    if (actionLabel.toLowerCase().includes('recover')) {
        currentValues.containers = Number(currentValues.containers || 0) + quantity;
        currentValues.borrowed = Math.max(0, Number(currentValues.borrowed || 0) - quantity);
    }

    localStorage.setItem('dashboard-values', JSON.stringify(currentValues));
}

const staffActionButtons = document.querySelectorAll('.action-set-btn');
staffActionButtons.forEach((button) => {
    button.addEventListener('click', () => {
        const card = button.closest('.action-card');
        const action = getStaffActionFromCard(card);
        const { label, qty, totalCash } = action;

        if (!qty) {
            setAuthMessage('Please enter a quantity for staff action.', 'error');
            showToast('Please enter a quantity before setting action.', 'error');
            return;
        }

        currentStagedAction = { label, qty, total: totalCash };
        renderStagedActions();
        showToast(`Action staged: ${label} x${qty}.`, 'success');
    });
});

if (confirmOrderBtn) {
    confirmOrderBtn.addEventListener('click', async () => {
        const confirmed = window.confirm('Confirm and save these staff actions to the monitor?');
        if (!confirmed) {
            showToast('Action confirmation canceled.', 'info');
            return;
        }

        const actionCards = document.querySelectorAll('.action-card');
        const actionsToProcess = [];

        actionCards.forEach((card) => {
            const qtyInput = card.querySelector('.action-qty');
            const qty = Number(qtyInput?.value) || 0;
            if (qty <= 0) return;

            const label = card.querySelector('.action-label').innerText;
            const priceText = card.querySelector('.action-price')?.innerText || card.querySelector('.action-meta')?.innerText || '';
            const unitPrice = Number((priceText.match(/₱([0-9]+(?:\.[0-9]{1,2})?)/) || [0, '0'])[1]) || 0;
            const totalCash = qty * unitPrice;
            actionsToProcess.push({ label, qty, totalCash });
        });

        if (!actionsToProcess.length) {
            showToast('Please enter quantities for staff actions before confirming.', 'error');
            return;
        }

        if (isAnyOwnerInventoryZero()) {
            setAuthMessage('Staff cannot save orders while an owner inventory value is zero.', 'error');
            showToast('Order blocked: owner inventory has zero values.', 'error');
            return;
        }

        try {
            let combinedTotal = 0;
            await Promise.all(actionsToProcess.map((action) => {
                combinedTotal += action.totalCash;
                return postActivityLog({ role: 'staff', action: action.label, qty: action.qty, amount: action.totalCash, note: 'Action confirmed' });
            }));

            saveLatestOwnerUndoState(getStoredDashboardValues());
            const stateResponse = await fetch('/api/dashboard-state/transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ actions: actionsToProcess })
            });
            if (!stateResponse.ok) throw new Error('Shared dashboard update failed');
            const sharedValues = await stateResponse.json();
            saveDashboardValues(sharedValues);

            currentStagedAction = { label: 'Multiple actions', qty: actionsToProcess.reduce((sum, action) => sum + action.qty, 0), total: combinedTotal };
            stagedActionText.innerText = '👉 Staged Action: Multiple actions confirmed';

            actionCards.forEach((card) => {
                const qtyInput = card.querySelector('.action-qty');
                if (qtyInput) qtyInput.value = '';
            });
            renderStagedActions();

            showToast('All staff actions confirmed and monitored.', 'success');
            setAuthMessage('Staff actions confirmed and visible on owner monitor.', 'success');

            const date = ownerSummaryDate?.value || getTodayDate();
            fetchSalesSummary(date);
            configureDashboardView(loggedInRole);
        } catch (error) {
            showToast('Failed to record activity.', 'error');
        }
    });
}

if (btnSaveActivity) {
    btnSaveActivity.addEventListener('click', async () => {
        // Use database records as the source of truth so saving also works after refresh or on another device.
        let pendingRows = [];
        try {
            const pendingResponse = await fetch('/api/activity?limit=100');
            if (pendingResponse.ok) pendingRows = await pendingResponse.json();
        } catch (error) {
            pendingRows = [];
        }

        let logLines = JSON.parse(localStorage.getItem('staff-activity-log') || '[]');
        if (!pendingRows.length && ownerActivityLog && ownerActivityLog.value.trim() !== '') {
            logLines = ownerActivityLog.value.split('\n').filter(line => line.trim() !== '');
        }

        if (!pendingRows.length && !logLines.length) {
            showToast('No activity to save.', 'info');
            return;
        }

        const totalAmountToSave = pendingRows.length
            ? pendingRows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0)
            : parseActivityLogTotal(logLines);

        // Save the exact database rows locally for the grouped saved-orders view.
        const structuredRows = pendingRows.length
            ? pendingRows.map((row) => {
                const quantity = Number(row.qty) || 0;
                const total = Number(row.amount) || 0;
                return {
                    staffName: row.staff_name || (row.role === 'staff' ? 'Staff' : row.role || 'Unknown'),
                    product: row.action || 'Order',
                    quantity,
                    price: quantity > 0 ? total / quantity : total,
                    total
                };
            })
            : logLines.flatMap((line) => {
            const parsed = parseReviewOrderRows(line);
            return parsed.length ? parsed.map((row) => ({
                ...row,
                total: Number(row.total || 0)
            })) : [{
                staffName: 'Staff',
                product: line,
                quantity: 1,
                price: 0,
                total: 0
            }];
            });

        const savedDetails = pendingRows.length
            ? pendingRows.map((row) => `${row.staff_name || 'Staff'}: ${row.action || 'Order'} x${Number(row.qty) || 0} (₱${Number(row.amount) || 0})`).join('\n')
            : logLines.join('\n');

        const entry = {
            date: new Date().toLocaleString(),
            details: savedDetails,
            rows: structuredRows,
            total: totalAmountToSave
        };
        addSavedActivityReview(entry);

        // 4. I-save sa database para ma-add sa Daily, Monthly, Yearly Sales at sa Graph
        if (totalAmountToSave > 0) {
            try {
                const response = await fetch('/api/sales-record', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        amount: totalAmountToSave,
                        note: 'Saved from Activity Log'
                    })
                });

                if (!response.ok) {
                    throw new Error('Failed to save sales record');
                }
                
                // I-refresh agad ang Daily, Monthly, at Yearly totals sa UI
                const date = ownerSummaryDate?.value || getTodayDate();
                await fetchSalesSummary(date);
                
                // I-refresh din ang Bar Graph kung nakakabit na
                if (typeof fetchAndInitSalesGraph === 'function') {
                    await fetchAndInitSalesGraph();
                }
            } catch (error) {
                console.error('Error saving to sales database:', error);
                showToast('Failed to save total to database.', 'error');
                return;
            }
        }

        // Keep the activity rows in the database as saved only after the sales save succeeded.
        const markSavedResponse = await fetch('/api/activity/mark-saved', { method: 'POST' });
        if (!markSavedResponse.ok) {
            showToast('Orders were saved, but their record status could not be updated.', 'warning');
        }

        // 5. LINISIN ANG SCREEN AT STORAGE SA FRONTEND
        localStorage.setItem('staff-activity-log', JSON.stringify([]));

        if (ownerActivityLog) {
            ownerActivityLog.value = ''; // Nililinis ang Simplified Activity Log box
        }

        if (ownerMonitorStatus) {
            ownerMonitorStatus.innerText = 'Owner monitor is ready. Waiting for staff actions...'; // Nililinis ang status sa ilalim
        }
        
        configureDashboardView(loggedInRole);
        renderReviewList();
        
        setAuthMessage('Activity log saved successfully!', 'success');
        showToast(`Activity log saved! ₱${totalAmountToSave.toFixed(2)} added to sales.`, 'success');
    });
}

// Activity log polling and rendering
let activityPollInterval = null;
let lastActivitySignature = '';

function renderOwnerOrdersTable(rows = []) {
    if (!ownerOrdersTableBody) return;

    if (!rows.length) {
        ownerOrdersTableBody.innerHTML = '<tr><td colspan="6">No recent orders yet.</td></tr>';
        return;
    }

    ownerOrdersTableBody.innerHTML = rows.map((row) => {
        const staffName = row.staff_name || (row.role === 'staff' ? 'Staff' : row.role || 'Unknown');
        const product = row.action || 'Unknown product';
        const qty = Number(row.qty) || 0;
        const total = Number(row.amount) || 0;
        const unitPrice = qty > 0 ? total / qty : total;

        return `
            <tr>
                <td>${row.created_at ? new Date(row.created_at.replace(' ', 'T')).toLocaleString() : '—'}</td>
                <td>${staffName}</td>
                <td>${product}</td>
                <td>${qty}</td>
                <td>₱${unitPrice.toFixed(2)}</td>
                <td>₱${total.toFixed(2)}</td>
            </tr>
        `;
    }).join('');
}

async function fetchActivityLogs() {
    try {
        const resp = await fetch(`/api/activity?limit=20`);
        if (!resp.ok) throw new Error('Failed to load activity logs');
        const rows = await resp.json();

        const activitySignature = rows.map((row) => `${row.created_at}|${row.staff_id}|${row.action}|${row.qty}|${row.amount}`).join('\n');
        if (activitySignature !== lastActivitySignature) {
            lastActivitySignature = activitySignature;
            renderOwnerOrdersTable(rows);
            if (ownerMonitorStatus) {
                const lastOrder = rows[0];
                if (lastOrder) {
                    const staffName = lastOrder.staff_name || 'Staff';
                    const product = lastOrder.action || 'Order';
                    const total = Number(lastOrder.amount) || 0;
                    ownerMonitorStatus.innerText = `Last order: ${staffName} • ${product} • ₱${total.toFixed(2)}`;
                } else {
                    ownerMonitorStatus.innerText = 'Owner monitor is ready. Waiting for staff actions...';
                }
            }
        }
    } catch (err) {
        const logLines = JSON.parse(localStorage.getItem('staff-activity-log') || '[]');
        if (!lastActivitySignature && ownerOrdersTableBody) {
            const fallbackRows = logLines.map((line) => ({
                role: 'staff',
                action: line.split('•')[1]?.trim() || 'Order',
                qty: 1,
                amount: 0,
                staff_name: 'Staff',
                created_at: new Date().toISOString()
            }));
            renderOwnerOrdersTable(fallbackRows);
        }
        if (!lastActivitySignature && ownerMonitorStatus) {
            ownerMonitorStatus.innerText = getMonitorStatus(JSON.parse(localStorage.getItem('dashboard-values') || '{}'));
        }
    }
}

async function initializeApp() {
    initializeTheme();
    applyDailyRollover();
    scheduleMidnightRollover();
    checkAccountStatus();
    const savedValues = JSON.parse(localStorage.getItem('dashboard-values') || '{}');
    if (Object.keys(savedValues).length) {
        configureDashboardView('owner');
    }
    await restoreActiveSession();
}

const showPasswordCheckbox = document.getElementById('chk-show-password');
if (showPasswordCheckbox) {
    showPasswordCheckbox.addEventListener('change', () => {
        authPasswordInput.type = showPasswordCheckbox.checked ? 'text' : 'password';
    });
}
const btnReviewAllLogs = document.getElementById('btn-review-all-logs');
const modalAllLogs = document.getElementById('modal-all-logs');
const btnCloseModal = document.getElementById('btn-close-modal');
const allLogsContent = document.getElementById('all-logs-content');
const savedLogsDate = document.getElementById('saved-logs-date');
const btnClearSavedLogsDate = document.getElementById('btn-clear-saved-logs-date');

async function loadAllSavedLogs() {
    if (!allLogsContent) return;
    allLogsContent.innerText = 'Loading saved logs from database...';

    try {
        const selectedDate = savedLogsDate?.value || '';
        const query = selectedDate ? `?date=${encodeURIComponent(selectedDate)}` : '';
        const resp = await fetch(`/api/activity/all-saved${query}`);
        if (!resp.ok) throw new Error('Failed to fetch saved logs');

        const rows = await resp.json();
        if (rows.length === 0) {
            allLogsContent.innerText = selectedDate
                ? `No saved logs found for ${selectedDate}.`
                : 'No saved logs found in database.';
            return;
        }

        const rowsHtml = rows.map((row) => {
            const time = new Date(row.created_at).toLocaleString();
            const staffName = row.staff_name ? row.staff_name : (row.role === 'staff' ? 'Staff' : row.role);
            const product = row.action || 'Order';
            const quantity = Number(row.qty) || 0;
            const price = Number(row.amount || 0) / (quantity || 1);
            const total = Number(row.amount || 0);

            return `
                <tr>
                    <td>${time}</td>
                    <td>${staffName}</td>
                    <td>${product}</td>
                    <td>${quantity}</td>
                    <td>₱${price.toFixed(2)}</td>
                    <td>₱${total.toFixed(2)}</td>
                </tr>
            `;
        }).join('');

        allLogsContent.innerHTML = `
            <div class="orders-table-wrap">
                <table class="orders-table" aria-label="All saved records table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Staff Name</th>
                            <th>Product</th>
                            <th>Quantity</th>
                            <th>Price</th>
                            <th>Total Price</th>
                        </tr>
                    </thead>
                    <tbody>${rowsHtml || '<tr><td colspan="6">No saved records.</td></tr>'}</tbody>
                </table>
            </div>
        `;
    } catch (error) {
        console.error(error);
        allLogsContent.innerText = 'Error loading logs from database.';
    }
}

if (btnReviewAllLogs && modalAllLogs) {
    btnReviewAllLogs.addEventListener('click', async () => {
        modalAllLogs.showModal();
        await loadAllSavedLogs();
    });
}

savedLogsDate?.addEventListener('change', loadAllSavedLogs);
btnClearSavedLogsDate?.addEventListener('click', () => {
    if (savedLogsDate) savedLogsDate.value = '';
    loadAllSavedLogs();
});

if (btnCloseModal && modalAllLogs) {
    btnCloseModal.addEventListener('click', () => {
        modalAllLogs.close();
    });
}
// Function para magdagdag ng linya sa Owner Activity Log
function addOwnerActivityLog(message) {
    const activityLog = document.getElementById('owner-activity-log');
    if (activityLog) {
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const newEntry = `[${time}] ⚠️ ${message}\n`;
        
        // Idadagdag ang bagong ulat sa pinakataas ng log
        activityLog.value = newEntry + activityLog.value;
    }
}

// Sa loob ng event listener ng Confirm / Save Order Button:
const confirmBtn = document.querySelector('.confirm-btn');

confirmBtn.addEventListener('click', () => {
    // Halimbawa ng pag-check kung zero ang inventory
    const isInventoryZero = true; // Palitan batay sa kasalukuyang condition check mo

    if (isInventoryZero) {
        const blockMessage = "Order blocked: owner inventory has zero values.";
        
        // 1. Ipakita ang toast notification sa screen
        showToast(blockMessage);

        // 2. Isulat sa Activity Log ng Owner Dashboard
        addOwnerActivityLog(`STAFF ALERT: ${blockMessage}`);
        
        return; // Itigil ang order process
    }

    // Tuloy ang pag-save ng order kung may laman ang inventory...
});

// ==================== STAFF MANAGEMENT (OWNER ONLY) ====================
const modalStaffManagement = document.getElementById('modal-staff-management');
const btnManageStaff = document.getElementById('btn-manage-staff');
const btnCloseStaffModal = document.getElementById('btn-close-staff-modal');
const btnCreateStaff = document.getElementById('btn-create-staff');
const staffCreateFullName = document.getElementById('staff-create-full-name');
const staffCreatePosition = document.getElementById('staff-create-position');
const staffCreatePhone = document.getElementById('staff-create-phone');
const staffCreateEmail = document.getElementById('staff-create-email');
const staffCreateAddress = document.getElementById('staff-create-address');
const staffCreateUsername = document.getElementById('staff-create-username');
const staffCreatePassword = document.getElementById('staff-create-password');
const staffCreateStatus = document.getElementById('staff-create-status');
const staffListContainer = document.getElementById('staff-list-container');
const staffEditPanel = document.getElementById('staff-edit-panel');
const staffEditId = document.getElementById('staff-edit-id');
const staffEditFullName = document.getElementById('staff-edit-full-name');
const staffEditPosition = document.getElementById('staff-edit-position');
const staffEditPhone = document.getElementById('staff-edit-phone');
const staffEditEmail = document.getElementById('staff-edit-email');
const staffEditAddress = document.getElementById('staff-edit-address');
const staffEditUsername = document.getElementById('staff-edit-username');
const staffEditPassword = document.getElementById('staff-edit-password');
const btnSaveStaffEdit = document.getElementById('btn-save-staff-edit');
const btnCancelStaffEdit = document.getElementById('btn-cancel-staff-edit');

if (btnManageStaff) {
    btnManageStaff.addEventListener('click', () => {
        modalStaffManagement.showModal();
        loadStaffList();
    });
}

if (btnCloseStaffModal) {
    btnCloseStaffModal.addEventListener('click', () => {
        modalStaffManagement.close();
    });
}

if (btnCreateStaff) {
    btnCreateStaff.addEventListener('click', async () => {
        const fullName = staffCreateFullName.value.trim();
        const position = staffCreatePosition.value.trim();
        const phone = staffCreatePhone.value.trim();
        const email = staffCreateEmail.value.trim();
        const address = staffCreateAddress.value.trim();
        const username = staffCreateUsername.value.trim();
        const password = staffCreatePassword.value.trim();

        if (!fullName || !position || !phone || !email || !address || !username || !password) {
            staffCreateStatus.innerText = 'Please complete all staff information fields.';
            staffCreateStatus.style.color = '#f87171';
            return;
        }

        try {
            const response = await fetch('/api/staff/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fullName, position, phone, email, address, username, password })
            });

            const data = await response.json();

            if (response.ok) {
                staffCreateStatus.innerText = `✓ Staff account created: ${username}`;
                staffCreateStatus.style.color = '#4ade80';
                staffCreateFullName.value = '';
                staffCreatePosition.value = '';
                staffCreatePhone.value = '';
                staffCreateEmail.value = '';
                staffCreateAddress.value = '';
                staffCreateUsername.value = '';
                staffCreatePassword.value = '';
                setTimeout(() => loadStaffList(), 500);
            } else {
                staffCreateStatus.innerText = `✗ ${data.error}`;
                staffCreateStatus.style.color = '#f87171';
            }
        } catch (error) {
            staffCreateStatus.innerText = `✗ Error: ${error.message}`;
            staffCreateStatus.style.color = '#f87171';
        }
    });
}

function resetStaffEditForm() {
    if (!staffEditPanel) return;
    staffEditPanel.hidden = true;
    if (staffEditId) staffEditId.value = '';
    if (staffEditFullName) staffEditFullName.value = '';
    if (staffEditPosition) staffEditPosition.value = '';
    if (staffEditPhone) staffEditPhone.value = '';
    if (staffEditEmail) staffEditEmail.value = '';
    if (staffEditAddress) staffEditAddress.value = '';
    if (staffEditUsername) staffEditUsername.value = '';
    if (staffEditPassword) staffEditPassword.value = '';
}

function openStaffEditForm(staff) {
    if (!staffEditPanel || !staffEditId || !staffEditFullName || !staffEditPosition || !staffEditPhone || !staffEditEmail || !staffEditAddress || !staffEditUsername) {
        return;
    }

    staffEditId.value = String(staff.id ?? '');
    staffEditFullName.value = staff.full_name || '';
    staffEditPosition.value = staff.position || '';
    staffEditPhone.value = staff.phone || '';
    staffEditEmail.value = staff.email || '';
    staffEditAddress.value = staff.address || '';
    staffEditUsername.value = staff.username || '';
    staffEditPassword.value = '';
    staffEditPanel.hidden = false;
}

async function loadStaffList() {
    try {
        const response = await fetch('/api/staff/list');
        const staff = await response.json();

        if (!staff || staff.length === 0) {
            staffListContainer.innerHTML = '<p style="color: #999; text-align: center;">No staff accounts yet.</p>';
            resetStaffEditForm();
            return;
        }

        staffListContainer.innerHTML = staff.map((s) => `
            <div style="background: #222; padding: 10px; margin-bottom: 8px; border-radius: 4px; display: flex; justify-content: space-between; align-items: center; gap: 12px;">
                <div>
                    <strong style="color: #38bdf8;">${s.full_name || 'Name not available'}</strong>
                    <div style="font-size: 0.85rem; color: #ddd;">${s.position || 'Position not available'} · ${s.phone || 'No phone'}</div>
                    <div style="font-size: 0.8rem; color: #999;">Username: ${s.username} · ${s.email || 'No email'} · Created: ${new Date(s.created_at).toLocaleDateString()}</div>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button class="staff-edit-btn secondary-btn" type="button" data-staff-id="${s.id}" style="padding: 4px 12px; font-size: 0.85rem;">Edit</button>
                    <button class="staff-delete-btn danger-btn" type="button" data-staff-id="${s.id}" style="padding: 4px 12px; font-size: 0.85rem;">Delete</button>
                </div>
            </div>
        `).join('');

        staffListContainer.querySelectorAll('.staff-edit-btn').forEach((button) => {
            button.addEventListener('click', () => {
                const selectedStaff = staff.find((entry) => String(entry.id) === String(button.dataset.staffId));
                if (selectedStaff) openStaffEditForm(selectedStaff);
            });
        });

        staffListContainer.querySelectorAll('.staff-delete-btn').forEach((button) => {
            button.addEventListener('click', () => {
                deleteStaffAccount(Number(button.dataset.staffId));
            });
        });
    } catch (error) {
        staffListContainer.innerHTML = `<p style="color: #f87171;">Error loading staff: ${error.message}</p>`;
    }
}

async function deleteStaffAccount(staffId) {
    if (!window.confirm('Are you sure you want to delete this staff account?')) {
        return;
    }

    try {
        const response = await fetch(`/api/staff/${staffId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showToast('Staff account deleted.', 'success');
            resetStaffEditForm();
            loadStaffList();
        } else {
            const data = await response.json();
            showToast(`Error: ${data.error}`, 'error');
        }
    } catch (error) {
        showToast(`Delete error: ${error.message}`, 'error');
    }
}

if (btnCancelStaffEdit) {
    btnCancelStaffEdit.addEventListener('click', resetStaffEditForm);
}

if (btnSaveStaffEdit) {
    btnSaveStaffEdit.addEventListener('click', async () => {
        const staffId = staffEditId.value.trim();
        const fullName = staffEditFullName.value.trim();
        const position = staffEditPosition.value.trim();
        const phone = staffEditPhone.value.trim();
        const email = staffEditEmail.value.trim();
        const address = staffEditAddress.value.trim();
        const username = staffEditUsername.value.trim();
        const password = staffEditPassword.value.trim();

        if (!staffId || !fullName || !position || !phone || !email || !address || !username) {
            showToast('Please complete all required staff fields.', 'error');
            return;
        }

        const payload = { fullName, position, phone, email, address, username };
        if (password) payload.password = password;

        try {
            const response = await fetch(`/api/staff/${staffId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Unable to update staff account');
            }

            showToast('Staff information updated.', 'success');
            resetStaffEditForm();
            loadStaffList();
        } catch (error) {
            showToast(`Update error: ${error.message}`, 'error');
        }
    });
}

// ==================== STAFF PROFILE (STAFF ONLY) ====================
const modalStaffProfile = document.getElementById('modal-staff-profile');
const btnStaffProfile = document.getElementById('btn-staff-profile');
const staffMenuToggle = document.getElementById('staff-menu-toggle');
const staffDashboardMenu = document.getElementById('staff-dashboard-menu');
const staffOrdersPanel = document.getElementById('staff-orders-panel');
const staffOrdersList = document.getElementById('staff-orders-list');
const btnRefreshStaffOrders = document.getElementById('btn-refresh-staff-orders');
const btnStaffSettings = document.getElementById('btn-staff-settings');
const btnCloseProfileModal = document.getElementById('btn-close-profile-modal');
const staffPhotoDisplay = document.getElementById('staff-photo-display');
const staffPhotoInput = document.getElementById('staff-photo-input');
const btnUploadPhoto = document.getElementById('btn-upload-photo');
const staffPhotoStatus = document.getElementById('staff-photo-status');
const staffOldPassword = document.getElementById('staff-old-password');
const staffNewPassword = document.getElementById('staff-new-password');
const staffConfirmPassword = document.getElementById('staff-confirm-password');
const btnChangePassword = document.getElementById('btn-change-password');
const staffPasswordStatus = document.getElementById('staff-password-status');

if (btnStaffProfile) {
    btnStaffProfile.addEventListener('click', () => {
        modalStaffProfile.showModal();
    });
}

if (staffMenuToggle && staffDashboardMenu) {
    staffMenuToggle.addEventListener('click', () => {
        const isOpen = staffDashboardMenu.classList.toggle('hidden') === false;
        staffMenuToggle.setAttribute('aria-expanded', String(isOpen));
    });
}

if (btnStaffSettings && modalStaffProfile) {
    btnStaffSettings.addEventListener('click', () => {
        modalStaffProfile.showModal();
        staffDashboardMenu?.classList.add('hidden');
        staffMenuToggle?.setAttribute('aria-expanded', 'false');
    });
}

async function loadStaffOrders() {
    if (!staffOrdersList || !loggedInStaffId) return;
    staffOrdersList.innerHTML = '<tr><td colspan="6">Loading orders...</td></tr>';
    try {
        const response = await fetch(`/api/activity/staff/${loggedInStaffId}`);
        if (!response.ok) throw new Error('Unable to load orders');
        const orders = await response.json();
        if (!orders.length) {
            staffOrdersList.innerHTML = '<tr><td colspan="6">No orders yet.</td></tr>';
            return;
        }
        staffOrdersList.innerHTML = orders.map((order) => {
            const quantity = Number(order.qty) || 0;
            const total = Number(order.amount) || 0;
            const date = order.created_at ? new Date(order.created_at.replace(' ', 'T')).toLocaleString() : '—';
            const unitPrice = quantity > 0 ? total / quantity : total;
            return `
            <tr>
                <td>${date}</td>
                <td>${loggedInStaffUsername || 'Staff'}</td>
                <td>${order.action || 'Order'}</td>
                <td>${quantity}</td>
                <td>₱${unitPrice.toFixed(2)}</td>
                <td>₱${total.toFixed(2)}</td>
            </tr>
        `;
        }).join('');
    } catch (error) {
        staffOrdersList.innerHTML = '<tr><td colspan="6">Unable to load orders right now.</td></tr>';
    }
}

document.querySelectorAll('[data-staff-action="orders"]').forEach((button) => {
    button.addEventListener('click', () => {
        staffDashboard?.classList.add('staff-orders-mode');
        staffOrdersPanel?.classList.remove('hidden');
        staffOrdersPanel?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        staffDashboardMenu?.classList.add('hidden');
        staffMenuToggle?.setAttribute('aria-expanded', 'false');
        loadStaffOrders();
    });
});

document.querySelectorAll('[data-staff-action="product-overview"]').forEach((button) => {
    button.addEventListener('click', () => {
        staffDashboard?.classList.remove('staff-orders-mode');
        staffOrdersPanel?.classList.add('hidden');
        staffDashboardMenu?.classList.add('hidden');
        staffMenuToggle?.setAttribute('aria-expanded', 'false');
        staffDashboard?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
});

if (btnRefreshStaffOrders) btnRefreshStaffOrders.addEventListener('click', loadStaffOrders);

if (btnCloseProfileModal) {
    btnCloseProfileModal.addEventListener('click', () => {
        modalStaffProfile.close();
    });
}

if (btnUploadPhoto) {
    btnUploadPhoto.addEventListener('click', async () => {
        const file = staffPhotoInput.files[0];
        if (!file) {
            staffPhotoStatus.innerText = 'Please select a photo first.';
            staffPhotoStatus.style.color = '#f87171';
            return;
        }

        // Validate file is an image
        if (!file.type.startsWith('image/')) {
            staffPhotoStatus.innerText = 'Please select a valid image file.';
            staffPhotoStatus.style.color = '#f87171';
            return;
        }

        staffPhotoStatus.innerText = '⏳ Uploading...';
        staffPhotoStatus.style.color = '#38bdf8';

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                // Create image element to load the image
                const img = new Image();
                img.onload = async () => {
                    // Compress image using canvas
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    
                    // Resize if image is too large (max 600px on longest side)
                    const maxSize = 600;
                    if (width > height) {
                        if (width > maxSize) {
                            height = Math.round((height * maxSize) / width);
                            width = maxSize;
                        }
                    } else {
                        if (height > maxSize) {
                            width = Math.round((width * maxSize) / height);
                            height = maxSize;
                        }
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // Convert to JPEG with compression
                    const compressedData = canvas.toDataURL('image/jpeg', 0.85);
                    const photoType = 'image/jpeg';

                    const response = await fetch(`/api/staff/${loggedInStaffId}/profile-photo`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ photoData: compressedData, photoType })
                    });

                    if (response.ok) {
                        staffPhotoStatus.innerText = '✓ Photo uploaded successfully!';
                        staffPhotoStatus.style.color = '#4ade80';
                        staffPhotoDisplay.innerHTML = `<img src="${compressedData}" style="width: 100%; height: 100%; object-fit: cover;">`;
                        staffPhotoInput.value = '';
                        setTimeout(() => { staffPhotoStatus.innerText = ''; }, 2000);
                    } else {
                        const data = await response.json().catch(() => ({ error: 'Upload failed' }));
                        staffPhotoStatus.innerText = `✗ ${data.error || 'Upload failed'}`;
                        staffPhotoStatus.style.color = '#f87171';
                    }
                };
                
                img.onerror = () => {
                    staffPhotoStatus.innerText = '✗ Failed to load image. Please select a valid image file.';
                    staffPhotoStatus.style.color = '#f87171';
                };
                
                img.src = e.target.result;
            } catch (error) {
                staffPhotoStatus.innerText = `✗ Error: ${error.message}`;
                staffPhotoStatus.style.color = '#f87171';
            }
        };
        
        reader.onerror = () => {
            staffPhotoStatus.innerText = '✗ Failed to read file.';
            staffPhotoStatus.style.color = '#f87171';
        };
        
        reader.readAsDataURL(file);
    });
}

if (btnChangePassword) {
    btnChangePassword.addEventListener('click', async () => {
        const oldPwd = staffOldPassword.value.trim();
        const newPwd = staffNewPassword.value.trim();
        const confirmPwd = staffConfirmPassword.value.trim();

        if (!oldPwd || !newPwd || !confirmPwd) {
            staffPasswordStatus.innerText = 'Please fill all password fields.';
            staffPasswordStatus.style.color = '#f87171';
            return;
        }

        if (newPwd !== confirmPwd) {
            staffPasswordStatus.innerText = 'New passwords do not match.';
            staffPasswordStatus.style.color = '#f87171';
            return;
        }

        try {
            const response = await fetch(`/api/staff/${loggedInStaffId}/change-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ oldPassword: oldPwd, newPassword: newPwd })
            });

            const data = await response.json();

            if (response.ok) {
                staffPasswordStatus.innerText = '✓ Password changed successfully!';
                staffPasswordStatus.style.color = '#4ade80';
                staffOldPassword.value = '';
                staffNewPassword.value = '';
                staffConfirmPassword.value = '';
            } else {
                staffPasswordStatus.innerText = `✗ ${data.error}`;
                staffPasswordStatus.style.color = '#f87171';
            }
        } catch (error) {
            staffPasswordStatus.innerText = `✗ Error: ${error.message}`;
            staffPasswordStatus.style.color = '#f87171';
        }
    });
}

async function loadStaffProfile() {
    try {
        const response = await fetch(`/api/staff/${loggedInStaffId}/profile`);
        const profile = await response.json();

        if (profile.photo_data) {
            staffPhotoDisplay.innerHTML = `<img src="${profile.photo_data}" style="width: 100%; height: 100%; object-fit: cover;">`;
        } else {
            staffPhotoDisplay.innerHTML = '📷';
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

initializeApp();