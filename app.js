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
const staffRevenueText = document.getElementById('staff-revenue');
const staffWaterText = document.getElementById('staff-water');
const staffContainersText = document.getElementById('staff-containers');
const staffBorrowedText = document.getElementById('staff-borrowed');
const btnSaveActivity = document.getElementById('btn-save-activity');
const btnReviewUndo = document.getElementById('btn-review-undo');
const ownerReviewTotal = document.getElementById('owner-review-total');
const ownerReviewList = document.getElementById('owner-review-list');
const themeToggleBtn = document.getElementById('btn-theme-toggle');
const authThemeToggleBtn = document.getElementById('btn-theme-toggle-auth');
const themePreferenceKey = 'theme_preference';
const rolloverMetaKey = 'dashboard-rollover-date';
const defaultDashboardValues = { revenue: 1200, water: 1232, containers: 65, borrowed: 112 };
let currentStagedAction = { label: 'No action', qty: 0, total: 0 };

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
        authSubtitle.innerText = 'Enter your credentials to access your AquaSync staff shift portal.';
        btnAuthSubmit.innerText = 'Access Staff Portal';
        btnToggleAuth.classList.add('hidden');  // Hide toggle button for staff
        authStatus.innerText = '';
        return;
    }
    
    // Owner account logic (unchanged)
    const accountKey = ownerAccountKey;
    const accountExists = localStorage.getItem(accountKey);

    if (!accountExists) {
        isSignUpMode = true;
        authTitle.innerText = 'Register Owner Account';
        authSubtitle.innerText = 'No account found. Setup your owner profile credentials.';
        btnAuthSubmit.innerText = 'Create Account';
        btnToggleAuth.classList.add('hidden');
        authStatus.innerText = '';
    } else {
        isSignUpMode = false;
        authTitle.innerText = 'Owner Security Login';
        authSubtitle.innerText = 'Please log in to access your AquaSync system terminal.';
        btnAuthSubmit.innerText = 'Access System Terminal';
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

function showDashboard(role) {
    loggedInRole = role;
    authOverlay.classList.add('hidden');
    btnLogout.classList.remove('hidden');
    ownerDashboard.classList.toggle('hidden', role !== 'owner');
    staffDashboard.classList.toggle('hidden', role !== 'staff');
    configureDashboardView(role);
    if (role === 'owner') {
        const date = ownerSummaryDate?.value || getTodayDate();
        fetchSalesSummary(date);
        fetchActivityLogs();
        renderReviewList();
        if (activityPollInterval) clearInterval(activityPollInterval);
        activityPollInterval = setInterval(fetchActivityLogs, 3000);
    }
}

function hideDashboard() {
    loggedInRole = null;
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

    const logLines = JSON.parse(localStorage.getItem('staff-activity-log') || '[]');
    ownerActivityLog.value = logLines.slice(0, 8).join('\n');
    ownerMonitorStatus.innerText = getMonitorStatus(currentValues);
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

    hideDashboard();
    showToast('Logged out successfully.', 'success');
});

saveOwnerBtn.addEventListener('click', () => {
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
    localStorage.setItem('dashboard-values', JSON.stringify(values));
    configureDashboardView('owner');
    setAuthMessage('Owner values saved.', 'success');
    showToast('Owner values have been saved.', 'success');
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

ownerResetBtn.addEventListener('click', () => {
    const confirmed = window.confirm('Reset owner dashboard values to zero? This cannot be undone without undo.');
    if (!confirmed) {
        showToast('Reset canceled.', 'info');
        return;
    }

    const currentValues = JSON.parse(localStorage.getItem('dashboard-values') || '{}');
    const history = JSON.parse(localStorage.getItem('owner-history') || '[]');
    history.push(currentValues);
    localStorage.setItem('owner-history', JSON.stringify(history.slice(-10)));

    const resetValues = { revenue: 0, water: 0, containers: 0, borrowed: 0 };
    localStorage.setItem('dashboard-values', JSON.stringify(resetValues));
    configureDashboardView('owner');
    setAuthMessage('Owner dashboard reset to zero.', 'success');
    showToast('Owner dashboard reset to zero.', 'success');
});

ownerUndoBtn.addEventListener('click', () => {
    const history = JSON.parse(localStorage.getItem('owner-history') || '[]');
    if (!history.length) {
        setAuthMessage('Nothing to undo.', 'error');
        showToast('Nothing to undo at this time.', 'error');
        return;
    }

    const previousState = history.pop();
    localStorage.setItem('owner-history', JSON.stringify(history));
    localStorage.setItem('dashboard-values', JSON.stringify(previousState));
    configureDashboardView('owner');
    setAuthMessage('Previous owner state restored.', 'success');
    showToast('Owner dashboard undo completed.', 'success');
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

function renderReviewList() {
    const reviews = getSavedActivityReviews();
    if (!ownerReviewList) return;
    if (!reviews.length) {
        ownerReviewList.innerHTML = '<div class="review-item empty">No saved activity yet.</div>';
        if (ownerReviewTotal) ownerReviewTotal.innerText = `Total saved amount: ${formatCurrency(0)}`;
        return;
    }

    const reviewHtml = reviews.map((review, index) => {
        return `
            <div class="review-item">
                <div class="review-item-header">
                    <div>
                        <div class="review-date">${review.date}</div>
                        <div class="review-total-line">Total for entry: ${formatCurrency(getReviewTotal(review))}</div>
                    </div>
                    <div class="review-actions-inline">
                        <button class="review-download-btn" data-index="${index}" type="button">Download</button>
                        <button class="review-delete-btn" data-index="${index}" type="button">Delete</button>
                    </div>
                </div>
                <div class="review-details">${review.details.replace(/\n/g, '<br>')}</div>
            </div>
        `;
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
        
        fetch('/api/activity', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }).catch(() => {});
    } catch (e) {
        // ignore failures
    }
}

function simulateStaffAction(actionLabel, quantity, totalCash) {
    const currentValues = JSON.parse(localStorage.getItem('dashboard-values') || '{}');
    const previousState = { ...currentValues };
    const history = JSON.parse(localStorage.getItem('owner-history') || '[]');
    history.push(previousState);
    localStorage.setItem('owner-history', JSON.stringify(history.slice(-10)));

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
        const qtyInput = card.querySelector('.action-qty');
        const qty = Number(qtyInput.value) || 0;
        const label = card.querySelector('.action-label').innerText;
        const priceText = card.querySelector('.action-price')?.innerText || card.querySelector('.action-meta')?.innerText || '';
        const unitPrice = Number((priceText.match(/₱([0-9]+(?:\.[0-9]{1,2})?)/) || [0, '0'])[1]) || 0;
        const totalCash = qty * unitPrice;

        if (!qty) {
            setAuthMessage('Please enter a quantity for staff action.', 'error');
            showToast('Please enter a quantity before setting action.', 'error');
            return;
        }

        currentStagedAction = { label, qty, total: totalCash };
        const paymentText = totalCash > 0 ? `Customer pays ₱${totalCash}` : 'No customer payment required';
        stagedActionText.innerText = `👉 Staged Action: ${qty} ${label}(s) (${paymentText})`;
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
            actionsToProcess.forEach((action) => {
                combinedTotal += action.totalCash;
                postActivityLog({ role: 'staff', action: action.label, qty: action.qty, amount: action.totalCash, note: 'Action confirmed (not saved to sales DB)' });
                simulateStaffAction(action.label, action.qty, action.totalCash);
            });

            currentStagedAction = { label: 'Multiple actions', qty: actionsToProcess.reduce((sum, action) => sum + action.qty, 0), total: combinedTotal };
            stagedActionText.innerText = '👉 Staged Action: Multiple actions confirmed';

            actionCards.forEach((card) => {
                const qtyInput = card.querySelector('.action-qty');
                if (qtyInput) qtyInput.value = '';
            });

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
        // 1. Kukunin ang logs mula sa localStorage o sa ownerActivityLog textarea
        let logLines = JSON.parse(localStorage.getItem('staff-activity-log') || '[]');
        
        if (logLines.length === 0 && ownerActivityLog && ownerActivityLog.value.trim() !== '') {
            logLines = ownerActivityLog.value.split('\n').filter(line => line.trim() !== '');
        }

        if (logLines.length === 0) {
            showToast('No activity to save.', 'info');
            return;
        }

        // 2. Kunin ang total price mula sa mga logs
        const totalAmountToSave = parseActivityLogTotal(logLines);

        // 3. I-save muna sa local reviews list (History sa UI)
        const entry = {
            date: new Date().toLocaleString(),
            details: logLines.join('\n'),
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
                
                // MARKAHAN ANG LOGS NA "SAVED" NA SA DB (HINDI SILA MABUBURA SA DB, PERO HINDI NA ULIT LALABAS SA TEXTAREA)
                await fetch('/api/activity/mark-saved', { method: 'POST' }).catch(() => {});

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
            }
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

async function fetchActivityLogs() {
    try {
        const resp = await fetch(`/api/activity?limit=20`);
        if (!resp.ok) throw new Error('Failed to load activity logs');
        const rows = await resp.json();
        
        // Lilikha ng lines gamit lang ang mga HINDI pa nai-save (is_saved = 0)
        // Include staff name if available
        const lines = rows.map(r => {
            const staffName = r.staff_name ? r.staff_name : (r.role === 'staff' ? 'Staff' : r.role);
            return `${new Date(r.created_at).toLocaleTimeString()} – ${staffName}: ${r.action} x${r.qty} (₱${r.amount})${r.note ? ' – ' + r.note : ''}`;
        });
        
        // Kung wala nang unsaved activity, magiging bakante ang textarea
        if (ownerActivityLog) {
            ownerActivityLog.value = lines.length ? lines.join('\n') : '';
        }
        if (ownerMonitorStatus) {
            ownerMonitorStatus.innerText = lines.length ? `Last action: ${lines[0]}` : 'Owner monitor is ready. Waiting for staff actions...';
        }
    } catch (err) {
        // fallback to local log if server not reachable
        const logLines = JSON.parse(localStorage.getItem('staff-activity-log') || '[]');
        if (ownerActivityLog) ownerActivityLog.value = logLines.length ? logLines.slice(0, 8).join('\n') : '';
        if (ownerMonitorStatus) ownerMonitorStatus.innerText = getMonitorStatus(JSON.parse(localStorage.getItem('dashboard-values') || '{}'));
    }
}

function initializeApp() {
    initializeTheme();
    applyDailyRollover();
    scheduleMidnightRollover();
    checkAccountStatus();
    const savedValues = JSON.parse(localStorage.getItem('dashboard-values') || '{}');
    if (Object.keys(savedValues).length) {
        configureDashboardView('owner');
    }
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

if (btnReviewAllLogs && modalAllLogs) {
    btnReviewAllLogs.addEventListener('click', async () => {
        modalAllLogs.showModal();
        allLogsContent.innerText = 'Loading saved logs from database...';

        try {
            const resp = await fetch('/api/activity/all-saved');
            if (!resp.ok) throw new Error('Failed to fetch saved logs');
            
            const rows = await resp.json();
            
            if (rows.length === 0) {
                allLogsContent.innerText = 'No saved logs found in database.';
                return;
            }

            const formattedLogs = rows.map(r => {
                const time = new Date(r.created_at).toLocaleString();
                const staffName = r.staff_name ? r.staff_name : (r.role === 'staff' ? 'Staff' : r.role);
                return `[${time}] ${staffName}: ${r.action} x${r.qty} (₱${r.amount})${r.note ? ' - ' + r.note : ''}`;
            }).join('\n');

            allLogsContent.innerText = formattedLogs;
        } catch (err) {
            console.error(err);
            allLogsContent.innerText = 'Error loading logs from database.';
        }
    });
}

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
const staffCreateUsername = document.getElementById('staff-create-username');
const staffCreatePassword = document.getElementById('staff-create-password');
const staffCreateStatus = document.getElementById('staff-create-status');
const staffListContainer = document.getElementById('staff-list-container');

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
        const username = staffCreateUsername.value.trim();
        const password = staffCreatePassword.value.trim();

        if (!username || !password) {
            staffCreateStatus.innerText = 'Please enter username and password.';
            staffCreateStatus.style.color = '#f87171';
            return;
        }

        try {
            const response = await fetch('/api/staff/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok) {
                staffCreateStatus.innerText = `✓ Staff account created: ${username}`;
                staffCreateStatus.style.color = '#4ade80';
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

async function loadStaffList() {
    try {
        const response = await fetch('/api/staff/list');
        const staff = await response.json();

        if (!staff || staff.length === 0) {
            staffListContainer.innerHTML = '<p style="color: #999; text-align: center;">No staff accounts yet.</p>';
            return;
        }

        staffListContainer.innerHTML = staff.map(s => `
            <div style="background: #222; padding: 10px; margin-bottom: 8px; border-radius: 4px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <strong style="color: #38bdf8;">${s.username}</strong>
                    <div style="font-size: 0.8rem; color: #999;">Created: ${new Date(s.created_at).toLocaleDateString()}</div>
                </div>
                <button onclick="deleteStaffAccount(${s.id})" class="danger-btn" type="button" style="padding: 4px 12px; font-size: 0.85rem;">Delete</button>
            </div>
        `).join('');
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
            loadStaffList();
        } else {
            const data = await response.json();
            showToast(`Error: ${data.error}`, 'error');
        }
    } catch (error) {
        showToast(`Delete error: ${error.message}`, 'error');
    }
}

// ==================== STAFF PROFILE (STAFF ONLY) ====================
const modalStaffProfile = document.getElementById('modal-staff-profile');
const btnStaffProfile = document.getElementById('btn-staff-profile');
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
        loadStaffProfile();
    });
}

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