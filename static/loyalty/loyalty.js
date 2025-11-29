// --- public/loyalty/loyalty.js ---
// Main logic for the customer-facing loyalty application.

import { db, auth, functions } from './firebase-loyalty-config.js';

// DOM Elements
const loyaltyCardElement = document.getElementById('loyaltyCard');
const cardStatusMessage = document.getElementById('cardStatusMessage');
const stampDisplayGrid = document.getElementById('stampDisplayGrid');
const unclaimedRewardsSection = document.getElementById('unclaimedRewardsSection');
const unclaimedRewardsList = document.getElementById('unclaimedRewardsList');
const actionMessage = document.getElementById('actionMessage');
const logoutBtn = document.getElementById('logoutBtn');
const processingOverlay = document.getElementById('processing-overlay');
const overlayProcessingContent = document.getElementById('overlay-processing');
const overlaySuccessContent = document.getElementById('overlay-success');
const overlayErrorContent = document.getElementById('overlay-error');
const overlayErrorMessage = document.getElementById('overlay-error-message');
const streakDisplay = document.getElementById('streak-display');
const trophyCase = document.getElementById('trophy-case');

// Firebase Cloud Functions Callable
const addStampCallable = functions.httpsCallable('addStamp');

// State
let currentUser = null;
let loyaltyCardRef = null;
let unsubscribeLoyaltyCard = null;
let currentLoyaltyProgram = null;
let currentStampCount = 0;
const STREAK_GOAL = 7; // The number of days for a streak reward

// --- Utility Functions ---

function getRewardIcon(rewardId) {
    switch (rewardId) {
        case 'filletz_reward': return 'fa-drumstick-bite';
        case 'burger_reward': return 'fa-burger';
        case 'coffee_reward': return 'fa-mug-hot';
        default: return 'fa-gift';
    }
}

// --- UPDATED RENDERING FUNCTIONS ---

function renderStamps(currentStamps, totalStampsRequired, rewards) {
    stampDisplayGrid.innerHTML = '';
    const numStamps = totalStampsRequired || 10;

    for (let i = 0; i < numStamps; i++) {
        const stampCircle = document.createElement('div');
        stampCircle.classList.add('stamp-circle');
        const rewardAtThisPosition = rewards.find(r => r.threshold === (i + 1));
        if (i < currentStamps) {
            stampCircle.classList.add('filled');
        } else {
            if (rewardAtThisPosition) {
                const icon = getRewardIcon(rewardAtThisPosition.id);
                stampCircle.innerHTML = `<i class="fas ${icon} reward-icon"></i>`;
                stampCircle.setAttribute('title', `Reward at ${i + 1} stamps: ${rewardAtThisPosition.description}`);
            }
        }
        stampDisplayGrid.appendChild(stampCircle);
    }
    
    if (currentStamps >= totalStampsRequired) {
        cardStatusMessage.textContent = 'Card Complete! Redeem your reward!';
    } else {
        cardStatusMessage.textContent = `You have ${currentStamps} of ${numStamps} stamps!`;
    }
    cardStatusMessage.style.color = 'var(--red)';
}

function renderGamification(streak, completedCards) {
    // --- STREAK VISUALIZATION ---
    let streakDotsHtml = '';
    for (let i = 1; i <= STREAK_GOAL; i++) {
        streakDotsHtml += `<div class="streak-dot ${i <= streak ? 'active' : ''}"></div>`;
    }
    streakDisplay.innerHTML = `
        <i class="fas fa-fire-alt streak-icon"></i>
        <div class="streak-details">
            <span class="streak-label">${streak || 0} Day Streak</span>
            <div class="streak-progress-bar">${streakDotsHtml}</div>
        </div>
    `;
    
    // --- TROPHY VISUALIZATION ---
    trophyCase.innerHTML = `
        <i class="fas fa-trophy trophy-icon"></i>
        <div class="trophy-text">
            <span class="trophy-count">${completedCards || 0}</span>
            <span class="trophy-label">Cards Completed</span>
        </div>
    `;
}

async function fetchAndRenderTrophies() {
    const trophyList = document.getElementById('trophy-list');
    if (!trophyList) return;
    
    trophyList.innerHTML = '<li>Loading trophies...</li>';
    try {
        const trophySnapshot = await db.collection('completedLoyaltyCards')
            .where('userId', '==', currentUser.uid)
            .orderBy('completedAt', 'desc')
            .limit(5)
            .get();
        
        if (trophySnapshot.empty) {
            trophyList.innerHTML = '<li class="trophy-empty-state">No completed cards yet. Fill one up to earn a trophy!</li>';
            return;
        }

        trophyList.innerHTML = '';
        trophySnapshot.forEach(doc => {
            const trophy = doc.data();
            const date = trophy.completedAt.toDate().toLocaleDateString();
            const li = document.createElement('li');
            li.classList.add('trophy-card');
            li.innerHTML = `
                <i class="fas fa-trophy trophy-card-icon"></i>
                <div class="trophy-card-details">
                    <span class="trophy-card-title">${trophy.programName || 'Loyalty Card'}</span>
                    <span class="trophy-card-date">Completed on ${date}</span>
                </div>
            `;
            trophyList.appendChild(li);
        });
    } catch (error) {
        console.error("Error fetching trophies:", error);
        trophyList.innerHTML = '<li class="trophy-empty-state" style="color: var(--red);">Could not load trophy history.</li>';
    }
}

// --- Main Listener ---
async function startLoyaltyCardListener() {
    if (unsubscribeLoyaltyCard) unsubscribeLoyaltyCard();

    try {
        const programsSnapshot = await db.collection('loyaltyPrograms').where('isActive', '==', true).limit(1).get();
        if (programsSnapshot.empty) {
            return;
        }
        currentLoyaltyProgram = programsSnapshot.docs[0].data();
    } catch (error) {
        console.error("Error fetching loyalty programs:", error);
        return;
    }

    loyaltyCardRef = db.collection('loyaltyCards').doc(currentUser.uid);
    unsubscribeLoyaltyCard = loyaltyCardRef.onSnapshot(async (doc) => {
        let cardData = { currentStamps: 0, stamps: [], unlockedRewards: [], currentStreak: 0, completedCardCount: 0 };
        if (doc.exists) {
            cardData = doc.data();
            if (cardData.currentStamps > currentStampCount) {
                const stampsOnCard = stampDisplayGrid.querySelectorAll('.stamp-circle');
                const targetStampElement = stampsOnCard[currentStampCount];
                if(targetStampElement) targetStampElement.classList.add('stamp-success-animation');
            }
            currentStampCount = cardData.currentStamps || 0;
        }

        renderStamps(cardData.currentStamps, currentLoyaltyProgram.totalStampsRequired, currentLoyaltyProgram.rewards);
        renderGamification(cardData.currentStreak, cardData.completedCardCount);
        renderUnclaimedRewards(cardData.unlockedRewards);
        
    }, (error) => console.error("Error listening to loyalty card changes:", error));
    
    fetchAndRenderTrophies();
}

async function processStampAttempt(storeId, method) {
    overlayProcessingContent.style.display = 'block';
    overlaySuccessContent.style.display = 'none';
    overlayErrorContent.style.display = 'none';
    processingOverlay.classList.add('visible');

    try {
        await addStampCallable({ storeId, method });
        overlayProcessingContent.style.display = 'none';
        overlaySuccessContent.style.display = 'block';
    } catch (error) {
        console.error('Error adding stamp:', error);
        overlayProcessingContent.style.display = 'none';
        overlayErrorContent.style.display = 'block';
        overlayErrorMessage.textContent = error.message || 'Stamp Failed';
        loyaltyCardElement.classList.add('stamp-failure-animation');
        setTimeout(() => loyaltyCardElement.classList.remove('stamp-failure-animation'), 600);
    } finally {
        setTimeout(() => {
            processingOverlay.classList.remove('visible');
        }, 1500);
    }
}

function renderUnclaimedRewards(unlockedRewards) {
    unclaimedRewardsList.innerHTML = '';
    if (unlockedRewards && unlockedRewards.length > 0) {
        unclaimedRewardsSection.style.display = 'block';
        unlockedRewards.forEach(reward => {
            const rewardItem = document.createElement('div');
            rewardItem.classList.add('unclaimed-reward-item');
            rewardItem.innerHTML = `
                <p class="unclaimed-reward-message">🎉 ${reward.description} Unlocked!</p>
                <div class="reward-code-box">
                    <span class="reward-code">${reward.rewardCode}</span>
                    <button class="copy-button" data-code="${reward.rewardCode}"><i class="fas fa-copy"></i></button>
                </div>
            `;
            unclaimedRewardsList.appendChild(rewardItem);
        });
        document.querySelectorAll('.unclaimed-reward-item .copy-button').forEach(button => {
            button.addEventListener('click', (event) => {
                const codeToCopy = event.currentTarget.dataset.code;
                navigator.clipboard.writeText(codeToCopy).then(() => alert('Reward code copied!'));
            });
        });
    } else {
        unclaimedRewardsSection.style.display = 'none';
    }
}

// --- Event Handlers & Init ---
logoutBtn.addEventListener('click', () => auth.signOut().then(() => window.location.href = 'loyalty-login.html'));

document.addEventListener('DOMContentLoaded', () => {
    let stampAttempted = false;
    document.addEventListener('userAuthenticatedLoyalty', (event) => {
        currentUser = event.detail.user;
        startLoyaltyCardListener();

        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('action') && urlParams.get('action') === 'stamp' && !stampAttempted) {
            stampAttempted = true;
            const storeIdFromUrl = urlParams.get('storeId');
            setTimeout(() => {
                processStampAttempt(storeIdFromUrl, 'NFC_QR_Tap');
                history.replaceState({}, document.title, window.location.pathname);
            }, 500);
        }
    });
});
