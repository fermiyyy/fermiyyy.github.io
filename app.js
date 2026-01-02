// Telegram WebApp API
let tg;
let isTelegram = false;

// Check if running in Telegram
if (typeof window.Telegram !== 'undefined' && window.Telegram.WebApp) {
    tg = window.Telegram.WebApp;
    isTelegram = true;
    tg.ready();
    tg.expand();
    
    // Set theme colors
    tg.setHeaderColor('#FFFFFF');
    tg.setBackgroundColor('#FFFEF9');
    
    // Enable closing confirmation
    tg.enableClosingConfirmation();
    
    // Show main button if needed
    tg.MainButton.hide();
} else {
    // Fallback for testing outside Telegram
    tg = {
        ready: () => {},
        expand: () => {},
        showAlert: (msg) => alert(msg),
        showConfirm: (msg) => confirm(msg),
        openTelegramLink: (url) => window.open(url, '_blank'),
        initDataUnsafe: { user: { id: 123456789, first_name: 'Test User' } },
        BackButton: { onClick: () => {}, show: () => {}, hide: () => {} },
        MainButton: { show: () => {}, hide: () => {}, onClick: () => {}, setText: () => {} },
        setHeaderColor: () => {},
        setBackgroundColor: () => {},
        enableClosingConfirmation: () => {},
        sendData: () => {},
        openInvoice: () => {}
    };
    console.warn('Running outside Telegram - using fallback API');
}

// Application State
const state = {
    stars: parseInt(localStorage.getItem('stars') || '0'),
    completedTasks: JSON.parse(localStorage.getItem('completedTasks') || '[]'),
    receivedGifts: JSON.parse(localStorage.getItem('receivedGifts') || '[]'),
    subscriptions: JSON.parse(localStorage.getItem('subscriptions') || '[]'),
    promoOrders: JSON.parse(localStorage.getItem('promoOrders') || '[]'),
    taskProgress: parseInt(localStorage.getItem('taskProgress') || '0'),
    
    // Channels for subscription tasks
    // ВАЖНО: Замените на реальные каналы перед использованием
    channels: [
        { id: 1, name: 'Fermiy', username: '@fermiyxz', link: 'https://t.me/fermiyxz' },
        { id: 2, name: 'Crypto Updates', username: '@cryptoupdates', link: 'https://t.me/cryptoupdates' },
        { id: 3, name: 'Gaming Hub', username: '@gaminghub', link: 'https://t.me/gaminghub' },
        { id: 4, name: 'Design Daily', username: '@designdaily', link: 'https://t.me/designdaily' },
        { id: 5, name: 'Startup Stories', username: '@startupstories', link: 'https://t.me/startupstories' },
        { id: 6, name: 'AI Insights', username: '@aiinsights', link: 'https://t.me/aiinsights' }
    ],
    
    // Gifts available for purchase
    gifts: [
        { id: 1, name: 'сердце', emoji: '❤️', cost: 15, description: 'базовый подарок' },
        { id: 2, name: 'роза', emoji: '🌹', cost: 25, description: 'красивый подарок' },
        { id: 3, name: 'золото', emoji: '🏆', cost: 50, description: 'премиум подарок' },
        { id: 4, name: 'алмаз', emoji: '💎', cost: 100, description: 'люкс подарок' }
    ],
    
    // Subscription verification system
    subscriptionChecks: JSON.parse(localStorage.getItem('subscriptionChecks') || '{}')
};

// Required tasks to complete before getting gift
const REQUIRED_TASKS = 6;
const GIFT_REWARD = 15; // Stars given for completing all tasks
const SUBSCRIPTION_CHECK_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
const PROMO_COST_PER_SUB = 4.5; // Average cost per subscriber (4-5 stars)
const MIN_PROMO_SUBSCRIBERS = 10; // Minimum subscribers for promo order

// Initialize app
function init() {
    updateUI();
    loadUserData();
    renderTasks();
    renderGifts();
    renderPromoOrders();
    checkSubscriptionStatus();
    
    // Update cost when subscribers count changes
    const subscribersInput = document.getElementById('subscribersCount');
    if (subscribersInput) {
        subscribersInput.addEventListener('input', updatePromoCost);
    }
    
    // Start periodic subscription checks
    setInterval(checkSubscriptionStatus, 60000); // Check every minute
    
    // Update task timers every minute
    setInterval(() => {
        if (document.getElementById('tasksScreen').classList.contains('active')) {
            renderTasks();
        }
    }, 60000);
}

// Load user data from Telegram
function loadUserData() {
    const userNameEl = document.getElementById('userName');
    const userIdEl = document.getElementById('userId');
    const userAvatarEl = document.getElementById('userAvatar');
    
    if (!userNameEl || !userIdEl || !userAvatarEl) return;
    
    if (tg.initDataUnsafe?.user) {
        const user = tg.initDataUnsafe.user;
        userNameEl.textContent = user.first_name || 'пользователь';
        if (user.last_name) {
            userNameEl.textContent += ' ' + user.last_name;
        }
        userIdEl.textContent = `ID: ${user.id}`;
        
        // Try to get avatar
        if (user.photo_url) {
            const img = document.createElement('img');
            img.src = user.photo_url;
            img.className = 'w-16 h-16 rounded-full border-4 border-black object-cover';
            img.alt = user.first_name || 'User';
            img.onerror = () => {
                userAvatarEl.textContent = '👤';
            };
            userAvatarEl.innerHTML = '';
            userAvatarEl.appendChild(img);
        } else {
            userAvatarEl.textContent = '👤';
        }
    } else {
        userNameEl.textContent = 'пользователь';
        userIdEl.textContent = 'ID: не доступен';
        userAvatarEl.textContent = '👤';
    }
}

// Update all UI elements
function updateUI() {
    const starsBalanceEl = document.getElementById('starsBalance');
    const mainBalanceEl = document.getElementById('mainBalance');
    const completedTasksEl = document.getElementById('completedTasks');
    const receivedGiftsEl = document.getElementById('receivedGifts');
    const activeSubscriptionsEl = document.getElementById('activeSubscriptions');
    
    if (starsBalanceEl) starsBalanceEl.textContent = state.stars;
    if (mainBalanceEl) mainBalanceEl.textContent = state.stars;
    if (completedTasksEl) completedTasksEl.textContent = state.completedTasks.length;
    if (receivedGiftsEl) receivedGiftsEl.textContent = state.receivedGifts.length;
    if (activeSubscriptionsEl) activeSubscriptionsEl.textContent = state.subscriptions.filter(s => s.status === 'active').length;
    
    const pendingEl = document.getElementById('pendingSubscriptions');
    if (pendingEl) {
        pendingEl.textContent = state.subscriptions.filter(s => s.status === 'pending').length;
    }
    
    // Update task progress
    const progress = state.completedTasks.length; // Use actual completed tasks
    const progressEl = document.getElementById('taskProgress');
    if (progressEl) {
        progressEl.textContent = `${progress}/${REQUIRED_TASKS}`;
    }
    const progressFill = document.getElementById('progressFill');
    if (progressFill) {
        const progressPercent = Math.min((progress / REQUIRED_TASKS) * 100, 100);
        progressFill.style.width = `${progressPercent}%`;
    }
}

// Show specific screen
function showScreen(screenId) {
    const targetScreen = document.getElementById(screenId);
    if (!targetScreen) {
        console.error(`Screen ${screenId} not found`);
        return;
    }
    
    // Hide all screens
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    // Show selected screen
    targetScreen.classList.add('active');
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Map screen IDs to nav items
    const navMap = {
        'mainScreen': 0,
        'tasksScreen': 1,
        'giftsScreen': 2,
        'profileScreen': 3
    };
    
    if (navMap[screenId] !== undefined) {
        const navItems = document.querySelectorAll('.nav-item');
        if (navItems[navMap[screenId]]) {
            navItems[navMap[screenId]].classList.add('active');
        }
    }
    
    // Show/hide back button
    if (isTelegram && tg.BackButton) {
        if (screenId === 'mainScreen') {
            tg.BackButton.hide();
        } else {
            tg.BackButton.show();
        }
    }
    
    // Refresh data when switching screens
    if (screenId === 'tasksScreen') {
        renderTasks();
    } else if (screenId === 'giftsScreen') {
        renderGifts();
    } else if (screenId === 'promoScreen') {
        renderPromoOrders();
    }
}

// Format time remaining
function formatTimeRemaining(ms) {
    const days = Math.floor(ms / (24 * 60 * 60 * 1000));
    const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
    
    if (days > 0) {
        return `${days}д ${hours}ч`;
    } else if (hours > 0) {
        return `${hours}ч ${minutes}м`;
    } else {
        return `${minutes}м`;
    }
}

// Render tasks list
function renderTasks() {
    const tasksList = document.getElementById('tasksList');
    if (!tasksList) return;
    
    tasksList.innerHTML = '';
    
    state.channels.forEach((channel, index) => {
        const isCompleted = state.completedTasks.includes(channel.id);
        const subscription = state.subscriptions.find(s => s.channelId === channel.id);
        const canComplete = !isCompleted && (!subscription || subscription.status === 'active');
        
        const taskCard = document.createElement('div');
        taskCard.className = `task-card ${isCompleted ? 'completed' : ''}`;
        
        let statusBadge = '';
        let actionButton = '';
        let timeInfo = '';
        
        if (isCompleted) {
            statusBadge = '<span class="status-badge completed">✓ выполнено</span>';
        } else if (subscription && subscription.status === 'pending') {
            const timeRemaining = subscription.checkUntil - Date.now();
            if (timeRemaining > 0) {
                const timeStr = formatTimeRemaining(timeRemaining);
                statusBadge = '<span class="status-badge pending">⏳ проверка...</span>';
                timeInfo = `<div class="text-xs opacity-70 mt-2">осталось: ${timeStr}</div>`;
            } else {
                statusBadge = '<span class="status-badge pending">⏳ проверка...</span>';
                timeInfo = '<div class="text-xs opacity-70 mt-2">проверка завершается...</div>';
            }
            actionButton = '<button class="btn-secondary text-sm py-2 px-4" disabled>ожидайте проверки</button>';
        } else if (subscription && subscription.status === 'failed') {
            statusBadge = '<span class="status-badge failed">✗ отписка обнаружена</span>';
            actionButton = `<button onclick="subscribeToChannel(${channel.id})" class="btn-primary text-sm py-2 px-4">подписаться снова</button>`;
            timeInfo = '<div class="text-xs opacity-70 mt-2 text-red-600">нужно подписаться и подождать неделю</div>';
        } else {
            statusBadge = '<span class="status-badge pending">не выполнено</span>';
            actionButton = `<button onclick="subscribeToChannel(${channel.id})" class="btn-primary text-sm py-2 px-4">подписаться</button>`;
        }
        
        taskCard.innerHTML = `
            <div class="flex items-center justify-between mb-3">
                <div>
                    <h4 class="font-bold text-lg">${channel.name}</h4>
                    <p class="text-sm opacity-70">${channel.username}</p>
                </div>
                ${statusBadge}
            </div>
            ${timeInfo}
            <div class="flex items-center justify-between mt-3">
                <a href="${channel.link}" target="_blank" class="text-sm underline font-bold">открыть канал</a>
                ${actionButton}
            </div>
        `;
        
        tasksList.appendChild(taskCard);
    });
    
    // Show gift claim button if all tasks completed
    const allTasksCompleted = state.completedTasks.length >= REQUIRED_TASKS;
    const canReceive = canReceiveGifts();
    const hasFailedSubs = state.subscriptions.some(s => s.status === 'failed');
    
    if (allTasksCompleted && !state.receivedGifts.includes('heart')) {
        const giftCard = document.createElement('div');
        giftCard.className = 'card p-6 mt-6 text-center';
        
        if (!canReceive) {
            if (hasFailedSubs) {
                giftCard.innerHTML = `
                    <div class="text-6xl mb-4">⚠️</div>
                    <h3 class="text-2xl font-black lowercase mb-2">подарок недоступен</h3>
                    <p class="mb-4 text-sm opacity-70">обнаружены отписки от каналов. подпишитесь снова и подождите неделю для проверки.</p>
                    <div class="text-xs opacity-50 mt-2">не отписывайтесь в течение 7 дней!</div>
                `;
            } else {
                giftCard.innerHTML = `
                    <div class="text-6xl mb-4">⏳</div>
                    <h3 class="text-2xl font-black lowercase mb-2">ожидайте проверки</h3>
                    <p class="mb-4 text-sm opacity-70">все задания выполнены, но проверка подписок ещё не завершена.</p>
                `;
            }
        } else {
            giftCard.innerHTML = `
                <div class="text-6xl mb-4">❤️</div>
                <h3 class="text-2xl font-black lowercase mb-2">подарок готов!</h3>
                <p class="mb-4">вы выполнили все задания</p>
                <button onclick="claimGift('heart')" class="btn-primary py-4 px-8 text-lg">
                    получить подарок (${GIFT_REWARD} ⭐)
                </button>
            `;
        }
        
        tasksList.appendChild(giftCard);
    } else if (state.taskProgress > 0 && state.taskProgress < REQUIRED_TASKS) {
        // Show progress encouragement
        const progressCard = document.createElement('div');
        progressCard.className = 'card p-4 mt-6 text-center bg-[#FFFEF9]';
        const remaining = REQUIRED_TASKS - state.completedTasks.length;
        progressCard.innerHTML = `
            <div class="text-3xl mb-2">💪</div>
            <p class="font-bold">осталось заданий: ${remaining}</p>
            <p class="text-sm opacity-70 mt-2">продолжайте в том же духе!</p>
        `;
        tasksList.appendChild(progressCard);
    }
    
    updateUI();
    
    // Update timers every minute
    setTimeout(renderTasks, 60000);
}

// Subscribe to channel
function subscribeToChannel(channelId) {
    const channel = state.channels.find(c => c.id === channelId);
    if (!channel) {
        tg.showAlert('канал не найден!');
        return;
    }
    
    // Open channel in Telegram
    if (isTelegram) {
        tg.openTelegramLink(channel.link);
    } else {
        window.open(channel.link, '_blank');
    }
    
    // Add or update subscription
    const existingSub = state.subscriptions.find(s => s.channelId === channelId);
    const now = Date.now();
    
    if (!existingSub) {
        // New subscription
        state.subscriptions.push({
            channelId: channelId,
            status: 'pending',
            subscribedAt: now,
            checkUntil: now + SUBSCRIPTION_CHECK_DURATION
        });
        
        // Don't increment progress yet - wait for verification
        saveState();
        renderTasks();
        updateUI();
        
        // Show notification
        tg.showAlert('подписка зарегистрирована! проверка займёт 7 дней. не отписывайтесь!');
        
        // Send to backend
        if (isTelegram && tg.sendData) {
            tg.sendData(JSON.stringify({
                type: 'subscription_started',
                channelId: channelId,
                channelUsername: channel.username,
                timestamp: now
            }));
        }
    } else if (existingSub.status === 'failed') {
        // Resubscribe after failure - reset the check
        existingSub.status = 'pending';
        existingSub.subscribedAt = now;
        existingSub.checkUntil = now + SUBSCRIPTION_CHECK_DURATION;
        existingSub.failedAt = undefined;
        
        // Remove from completed if it was there
        const index = state.completedTasks.indexOf(channelId);
        if (index > -1) {
            state.completedTasks.splice(index, 1);
        }
        
        saveState();
        renderTasks();
        updateUI();
        
        tg.showAlert('подписка обновлена! проверка займёт 7 дней с начала. не отписывайтесь!');
        
        // Send to backend
        if (isTelegram && tg.sendData) {
            tg.sendData(JSON.stringify({
                type: 'subscription_restarted',
                channelId: channelId,
                channelUsername: channel.username,
                timestamp: now
            }));
        }
    } else {
        tg.showAlert('подписка уже зарегистрирована!');
    }
}

// Check subscription status
function checkSubscriptionStatus() {
    const now = Date.now();
    let updated = false;
    
    state.subscriptions.forEach(sub => {
        if (sub.status === 'pending' && now >= sub.checkUntil) {
            // Simulate subscription check (in real app, this would be done via backend)
            // For demo, we'll randomly pass/fail, but in production this checks via Telegram API
            const isStillSubscribed = Math.random() > 0.2; // 80% success rate for demo
            
            if (isStillSubscribed) {
                sub.status = 'active';
                sub.verifiedAt = now;
                if (!state.completedTasks.includes(sub.channelId)) {
                    state.completedTasks.push(sub.channelId);
                    state.taskProgress = Math.min(state.taskProgress + 1, REQUIRED_TASKS);
                    updated = true;
                }
            } else {
                sub.status = 'failed';
                sub.failedAt = now;
                // Remove from completed if it was there
                const index = state.completedTasks.indexOf(sub.channelId);
                if (index > -1) {
                    state.completedTasks.splice(index, 1);
                    state.taskProgress = Math.max(0, state.taskProgress - 1);
                    updated = true;
                }
            }
        }
        
        // Check active subscriptions periodically (every 24 hours)
        if (sub.status === 'active' && sub.verifiedAt) {
            const daysSinceVerification = (now - sub.verifiedAt) / (24 * 60 * 60 * 1000);
            // Re-check every 7 days for active subscriptions
            if (daysSinceVerification >= 7 && !sub.lastCheck || (now - sub.lastCheck) >= (7 * 24 * 60 * 60 * 1000)) {
                // In production, check via Telegram API
                const isStillSubscribed = Math.random() > 0.1; // 90% success rate for active subs
                sub.lastCheck = now;
                
                if (!isStillSubscribed) {
                    sub.status = 'failed';
                    sub.failedAt = now;
                    const index = state.completedTasks.indexOf(sub.channelId);
                    if (index > -1) {
                        state.completedTasks.splice(index, 1);
                        state.taskProgress = Math.max(0, state.taskProgress - 1);
                        updated = true;
                    }
                }
            }
        }
    });
    
    if (updated) {
        saveState();
        renderTasks();
        updateUI();
    }
}

// Check if user can receive gifts (no failed subscriptions)
function canReceiveGifts() {
    const hasFailedSubs = state.subscriptions.some(s => s.status === 'failed');
    if (hasFailedSubs) {
        return false;
    }
    
    // Check if all active subscriptions are verified
    const activeSubs = state.subscriptions.filter(s => s.status === 'active');
    const allVerified = activeSubs.every(s => s.verifiedAt && (Date.now() - s.verifiedAt) >= SUBSCRIPTION_CHECK_DURATION);
    
    return allVerified || activeSubs.length === 0;
}

// Claim gift after completing tasks
function claimGift(giftType) {
    if (state.completedTasks.length < REQUIRED_TASKS) {
        tg.showAlert('выполните все задания сначала!');
        return;
    }
    
    if (state.receivedGifts.includes('heart')) {
        tg.showAlert('вы уже получили этот подарок!');
        return;
    }
    
    // Check if user can receive gifts (no failed subscriptions)
    if (!canReceiveGifts()) {
        const failedSubs = state.subscriptions.filter(s => s.status === 'failed');
        if (failedSubs.length > 0) {
            tg.showAlert('у вас есть отписки! подпишитесь снова и подождите неделю для проверки.');
        } else {
            tg.showAlert('дождитесь завершения проверки всех подписок (7 дней).');
        }
        return;
    }
    
    // Verify all tasks are actually completed
    if (state.completedTasks.length < REQUIRED_TASKS) {
        tg.showAlert('не все задания выполнены!');
        return;
    }
    
    // Add stars and mark gift as received
    state.stars += GIFT_REWARD;
    state.receivedGifts.push('heart');
    saveState();
    updateUI();
    renderTasks();
    
    tg.showAlert(`поздравляем! вы получили ${GIFT_REWARD} ⭐`);
    
    // Send confirmation to backend
    if (isTelegram && tg.sendData) {
        tg.sendData(JSON.stringify({
            type: 'gift_claimed',
            giftType: giftType,
            reward: GIFT_REWARD,
            timestamp: Date.now()
        }));
    }
}

// Render gifts shop
function renderGifts() {
    const giftsList = document.getElementById('giftsList');
    if (!giftsList) return;
    
    giftsList.innerHTML = '';
    
    state.gifts.forEach(gift => {
        const canAfford = state.stars >= gift.cost;
        const alreadyReceived = state.receivedGifts.includes(gift.id);
        
        const giftCard = document.createElement('div');
        giftCard.className = `gift-card ${!canAfford ? 'disabled' : ''}`;
        
        giftCard.innerHTML = `
            <div class="text-6xl mb-3">${gift.emoji}</div>
            <h4 class="font-black text-lg lowercase mb-2">${gift.name}</h4>
            <p class="text-sm opacity-70 mb-3">${gift.description}</p>
            <div class="font-bold text-xl mb-4">${gift.cost} ⭐</div>
            ${alreadyReceived ? 
                '<div class="status-badge completed">получено</div>' :
                `<button onclick="purchaseGift(${gift.id})" class="btn-primary w-full py-3" ${!canAfford ? 'disabled' : ''}>
                    купить
                </button>`
            }
        `;
        
        giftsList.appendChild(giftCard);
    });
}

// Purchase gift with Telegram Stars
function purchaseGift(giftId) {
    const gift = state.gifts.find(g => g.id === giftId);
    if (!gift) return;
    
    if (state.receivedGifts.includes(giftId)) {
        tg.showAlert('вы уже получили этот подарок!');
        return;
    }
    
    // Check if user can receive gifts (no failed subscriptions)
    if (!canReceiveGifts()) {
        const failedSubs = state.subscriptions.filter(s => s.status === 'failed');
        if (failedSubs.length > 0) {
            tg.showAlert('у вас есть отписки! подпишитесь снова и подождите неделю для проверки.');
        } else {
            tg.showAlert('дождитесь завершения проверки всех подписок (7 дней).');
        }
        return;
    }
    
    // Use Telegram Stars API for payment
    if (isTelegram && tg.openInvoice) {
        // Create invoice for Telegram Stars
        const invoice = {
            title: `Подарок: ${gift.name}`,
            description: gift.description,
            currency: 'XTR', // Telegram Stars currency
            prices: [
                {
                    label: gift.name,
                    amount: gift.cost * 100 // Amount in smallest currency unit (cents)
                }
            ],
            payload: JSON.stringify({
                type: 'gift_purchase',
                giftId: giftId,
                userId: tg.initDataUnsafe?.user?.id
            }),
            provider_token: '', // Not needed for Stars
            provider_data: JSON.stringify({ giftId: giftId })
        };
        
        // Open invoice
        tg.openInvoice(invoice, (status) => {
            if (status === 'paid') {
                // Payment successful
                state.receivedGifts.push(giftId);
                saveState();
                updateUI();
                renderGifts();
                
                tg.showAlert(`поздравляем! вы получили ${gift.emoji} ${gift.name}!`);
                
                // Send confirmation to backend
                if (tg.sendData) {
                    tg.sendData(JSON.stringify({
                        type: 'gift_purchased',
                        giftId: giftId,
                        timestamp: Date.now()
                    }));
                }
            } else if (status === 'failed') {
                tg.showAlert('оплата не прошла. попробуйте снова.');
            } else if (status === 'cancelled') {
                // User cancelled, do nothing
            }
        });
    } else {
        // Fallback for testing or if Stars API not available
        if (state.stars < gift.cost) {
            tg.showAlert('недостаточно звёзд!');
            return;
        }
        
        // Deduct stars (demo mode)
        state.stars -= gift.cost;
        state.receivedGifts.push(giftId);
        saveState();
        updateUI();
        renderGifts();
        
        tg.showAlert(`поздравляем! вы получили ${gift.emoji} ${gift.name}!`);
    }
}

// Update promo order cost
function updatePromoCost() {
    const countInput = document.getElementById('subscribersCount');
    if (!countInput) return;
    
    const count = parseInt(countInput.value) || 0;
    const totalCost = Math.ceil(count * PROMO_COST_PER_SUB);
    const totalCostEl = document.getElementById('totalCost');
    if (totalCostEl) {
        totalCostEl.textContent = `${totalCost} ⭐`;
        
        // Visual feedback if insufficient stars
        if (totalCost > state.stars && count >= MIN_PROMO_SUBSCRIBERS) {
            totalCostEl.classList.add('text-red-600');
        } else {
            totalCostEl.classList.remove('text-red-600');
        }
    }
}

// Submit promo order
function submitPromoOrder() {
    const channelLinkInput = document.getElementById('channelLink');
    const subscribersCountInput = document.getElementById('subscribersCount');
    
    if (!channelLinkInput || !subscribersCountInput) {
        tg.showAlert('ошибка загрузки формы!');
        return;
    }
    
    const channelLink = channelLinkInput.value.trim();
    const subscribersCount = parseInt(subscribersCountInput.value);
    
    if (!channelLink) {
        tg.showAlert('введите ссылку на канал!');
        channelLinkInput.focus();
        return;
    }
    
    // Validate Telegram channel link
    const telegramLinkPattern = /^(https?:\/\/)?(t\.me|telegram\.me)\/[\w@]+/i;
    if (!telegramLinkPattern.test(channelLink)) {
        tg.showAlert('неверная ссылка на канал! используйте формат: https://t.me/channelname');
        channelLinkInput.focus();
        return;
    }
    
    if (isNaN(subscribersCount) || subscribersCount < MIN_PROMO_SUBSCRIBERS) {
        tg.showAlert(`минимальный заказ - ${MIN_PROMO_SUBSCRIBERS} подписчиков!`);
        subscribersCountInput.focus();
        return;
    }
    
    if (subscribersCount > 10000) {
        tg.showAlert('максимальный заказ - 10000 подписчиков!');
        subscribersCountInput.focus();
        return;
    }
    
    const totalCost = Math.ceil(subscribersCount * PROMO_COST_PER_SUB);
    
    // Use Telegram Stars API for payment
    if (isTelegram && tg.openInvoice) {
        const invoice = {
            title: `Пиар канала: ${subscribersCount} подписчиков`,
            description: `Продвижение канала ${channelLink}`,
            currency: 'XTR',
            prices: [
                {
                    label: `${subscribersCount} подписчиков`,
                    amount: totalCost * 100
                }
            ],
            payload: JSON.stringify({
                type: 'promo_order',
                channelLink: channelLink,
                subscribersCount: subscribersCount,
                cost: totalCost,
                userId: tg.initDataUnsafe?.user?.id
            }),
            provider_data: JSON.stringify({
                channelLink: channelLink,
                subscribersCount: subscribersCount
            })
        };
        
        tg.openInvoice(invoice, (status) => {
            if (status === 'paid') {
                // Payment successful
                const order = {
                    id: Date.now(),
                    channelLink: channelLink,
                    subscribersCount: subscribersCount,
                    cost: totalCost,
                    status: 'pending',
                    createdAt: Date.now()
                };
                
                state.promoOrders.push(order);
                saveState();
                updateUI();
                renderPromoOrders();
                
                // Clear form
                channelLinkInput.value = '';
                subscribersCountInput.value = '';
                document.getElementById('totalCost').textContent = '0 ⭐';
                
                tg.showAlert(`заказ создан! стоимость: ${totalCost} ⭐`);
                
                // Send to backend
                if (tg.sendData) {
                    tg.sendData(JSON.stringify({
                        type: 'promo_order_created',
                        order: order,
                        timestamp: Date.now()
                    }));
                }
            } else if (status === 'failed') {
                tg.showAlert('оплата не прошла. попробуйте снова.');
            }
        });
    } else {
        // Fallback for testing
        if (state.stars < totalCost) {
            tg.showAlert(`недостаточно звёзд! нужно ${totalCost} ⭐`);
            return;
        }
        
        // Create order
        const order = {
            id: Date.now(),
            channelLink: channelLink,
            subscribersCount: subscribersCount,
            cost: totalCost,
            status: 'pending',
            createdAt: Date.now()
        };
        
        // Deduct stars
        state.stars -= totalCost;
        state.promoOrders.push(order);
        saveState();
        updateUI();
        renderPromoOrders();
        
        // Clear form
        channelLinkInput.value = '';
        subscribersCountInput.value = '';
        document.getElementById('totalCost').textContent = '0 ⭐';
        
        tg.showAlert(`заказ создан! стоимость: ${totalCost} ⭐`);
    }
}

// Render promo orders
function renderPromoOrders() {
    const myOrders = document.getElementById('myOrders');
    if (!myOrders) return;
    
    if (state.promoOrders.length === 0) {
        myOrders.innerHTML = '<p class="text-sm opacity-70 text-center py-4">у вас пока нет заказов</p>';
        return;
    }
    
    myOrders.innerHTML = '';
    
    state.promoOrders.slice().reverse().forEach(order => {
        const orderCard = document.createElement('div');
        orderCard.className = 'card p-4 mb-3';
        
        let statusBadge = '';
        if (order.status === 'pending') {
            statusBadge = '<span class="status-badge pending">в обработке</span>';
        } else if (order.status === 'completed') {
            statusBadge = '<span class="status-badge completed">выполнено</span>';
        } else {
            statusBadge = '<span class="status-badge failed">отменено</span>';
        }
        
        orderCard.innerHTML = `
            <div class="flex justify-between items-start mb-2">
                <div>
                    <div class="font-bold">${order.subscribersCount} подписчиков</div>
                    <div class="text-sm opacity-70 break-all">${order.channelLink}</div>
                </div>
                ${statusBadge}
            </div>
            <div class="flex justify-between items-center mt-3">
                <span class="text-sm">стоимость: <span class="font-bold">${order.cost} ⭐</span></span>
                <span class="text-xs opacity-70">${new Date(order.createdAt).toLocaleDateString('ru-RU')}</span>
            </div>
        `;
        
        myOrders.appendChild(orderCard);
    });
}

// Save state to localStorage
function saveState() {
    localStorage.setItem('stars', state.stars.toString());
    localStorage.setItem('completedTasks', JSON.stringify(state.completedTasks));
    localStorage.setItem('receivedGifts', JSON.stringify(state.receivedGifts));
    localStorage.setItem('subscriptions', JSON.stringify(state.subscriptions));
    localStorage.setItem('promoOrders', JSON.stringify(state.promoOrders));
    localStorage.setItem('taskProgress', state.taskProgress.toString());
    localStorage.setItem('subscriptionChecks', JSON.stringify(state.subscriptionChecks));
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Small delay to ensure Telegram API is loaded
    setTimeout(init, 100);
});

// Handle back button
if (isTelegram && tg.BackButton) {
    tg.BackButton.onClick(() => {
        const currentScreen = document.querySelector('.screen.active');
        if (currentScreen && currentScreen.id !== 'mainScreen') {
            showScreen('mainScreen');
        } else {
            tg.close();
        }
    });
}

// Handle viewport changes for mobile
let viewportHeight = window.innerHeight;
window.addEventListener('resize', () => {
    const newHeight = window.innerHeight;
    if (Math.abs(newHeight - viewportHeight) > 50) {
        // Likely keyboard opened/closed
        viewportHeight = newHeight;
        // Force reflow
        document.body.style.height = `${newHeight}px`;
    }
});

// Prevent zoom on double tap (iOS)
let lastTouchEnd = 0;
document.addEventListener('touchend', (event) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
        event.preventDefault();
    }
    lastTouchEnd = now;
}, false);

// Make functions globally available
window.showScreen = showScreen;
window.subscribeToChannel = subscribeToChannel;
window.claimGift = claimGift;
window.purchaseGift = purchaseGift;
window.submitPromoOrder = submitPromoOrder;

