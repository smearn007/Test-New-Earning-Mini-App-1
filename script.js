const firebaseConfig = {
    apiKey: "AIzaSyAXBG5RZJ2b38kknNKzmygXrzOoCTugLIE",
    authDomain: "new-tg-test.firebaseapp.com",
    projectId: "new-tg-test",
    storageBucket: "new-tg-test.firebasestorage.app",
    messagingSenderId: "1077123386154",
    appId: "1:1077123386154:web:dbbc89d5874127f60c6c53"
};
const BOT_USERNAME = "testnewearningminiapp1_bot"; 

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const tg = window.Telegram.WebApp;
tg.expand();

let uid, username, firstName, lastName, referrerId = null; 
if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
    const user = tg.initDataUnsafe.user;
    uid = user.id.toString();
    firstName = user.first_name;
    lastName = user.last_name || ''; 
    username = user.username || firstName;
    if (tg.initDataUnsafe.start_param) referrerId = tg.initDataUnsafe.start_param;
} else {
    uid = localStorage.getItem('test_uid');
    if(!uid) { uid = 'U'+Math.floor(Math.random()*99999); localStorage.setItem('test_uid', uid); }
    firstName = "Guest";
    lastName = ""; 
    username = "GuestUser";
}

const userFullName = (firstName + ' ' + lastName).trim();

document.getElementById('uidDisplay').innerText = uid;
document.getElementById('username').innerText = userFullName || firstName; 

const BOT_BASE_LINK = `https://t.me/${BOT_USERNAME}`; 
document.getElementById('refLink').innerText = `${BOT_BASE_LINK}?startapp=${uid}`;

// COOLDOWN VARIABLES
const COOLDOWN_DURATION = 60000; 
let adCooldownEndTime = 0; // Monetag
let adsgramCooldownEndTime = 0; // Adsgram
let onclickaCooldownEndTime = 0; // NEW: Onclicka
    
let monetagCooldownInterval = null; 
let adsgramCooldownInterval = null;
let onclickaCooldownInterval = null; // NEW: Onclicka Interval
let tournamentCountdownInterval = null; // MODIFIED: Tournament Interval

// STATE VARIABLES
let currentBalance = 0;
let adsWatchedToday = 0; // Monetag
let adsgramWatchedToday = 0; // Adsgram
let onclickaWatchedToday = 0; // NEW: Onclicka
let totalAdsWatched = 0; // ***THIS IS THE MAIN AGGREGATE COUNTER***
let referralCount = 0; 
let completedTasks = [];
let isBotVerified = false, verificationStep = 'join', isJoinButtonClicked = false;
const isEntryViaReferral = !!referrerId;

let activeReferralsData = [], completedReferralsData = [];
let activeRefPage = 1, completedRefPage = 1;
const pageSize = 20;

// NEW TOURNAMENT STATE VARIABLES
let isTournamentActive = false;
let hasJoinedTournament = false;
let tournamentEndTime = 0;
window.userTournamentRank = null;
window.hasClaimedPrize = false;
window.tournamentReferees = 0;

window.referredIdToClaim = null; 
window.rewardAmountToClaim = null; 
let showOnclicka = null; // NEW: Onclicka Show Function Reference


// Default Settings (UPDATED)
let settings = { 
    daily_limit: 20, reward_per_ad: 50, monetag_ad_code: '', 
    adsgram_daily_limit: 20, adsgram_reward: 50, adsgram_block_id: 'int-18699',
    // --- NEW ONCLICKA SETTINGS ---
    onclicka_daily_limit: 20, onclicka_reward: 50, onclicka_spot_id: '6101285',
    onclicka_card_title: 'Onclicka Ad Task', onclicka_card_desc: 'Earn +{{onclicka_reward}} Coins per ad', 
    onclicka_btn_text: 'Watch Onclicka Ad',
    // --- END NEW ONCLICKA SETTINGS ---
    min_withdraw: 100, ref_bonus: 100, daily_reward_amount: 100,
    min_ads_view_for_withdraw: 0, min_referrals_for_withdraw: 0, 
    home_section_title: 'Daily Task', missions_section_title: 'Social Missions', invite_section_title: 'Invite Friends', wallet_section_title: 'My Wallet',
    ad_card_title: 'Watch Video Ads', ad_card_desc: 'Earn +{{reward_per_ad}} Coins per ad', ad_btn_text: 'Watch Ad Now',
    ref_title: 'Refer & Earn', ref_desc: 'Share link & get bonus!',
    ref_ads_watch_requirement: 100, 
    initial_popup_title: 'Welcome!', initial_popup_desc: 'To access...', initial_popup_btn_text: 'Join', initial_popup_tip: '(Please join the bot and click Exit)', initial_popup_bot_link: BOT_BASE_LINK,
    initial_exit_desc: 'Exit Desc', initial_exit_btn_text: 'Exit', initial_popup_tip: '(Please join the bot and click Exit)', 
    ban_popup_title: 'Account Suspended', ban_popup_desc: 'You have been banned.', ban_btn_text: 'Contact Support', support_url: 'https://t.me/',
    unban_popup_title: 'Account Restored!', unban_popup_desc: 'You can use the app again.', unban_btn_text: 'Continue',
    ad_popup_title: 'Congratulations!', ad_popup_desc: 'Reward Earned.', daily_popup_title: 'Daily Bonus!', daily_popup_desc: 'Checked in.', mission_popup_title: 'Mission Complete!', mission_popup_desc: 'Reward Earned.',
    withdraw_title: 'Withdraw Funds', withdraw_desc: 'Min Withdraw 100', pay_methods: ['bKash'], request_withdraw_btn_text: 'Request Withdraw', 
    modal_claim_btn_text: 'OK', error_modal_btn_text: 'Close', withdraw_success_title: 'Success!', withdraw_success_desc: 'Request Submitted.', withdraw_success_btn_text: 'Done',          
    min_amt_err_title: 'Min Error', min_amt_err_desc: 'Min is {{min_withdraw}}', bal_err_title: 'Balance Error', bal_err_desc: 'Low Balance.',
    method_err_title: 'Method Error', method_err_desc: 'Select Method.', acc_num_err_title: 'Account Error', acc_num_err_desc: 'Enter Number.',
    min_ads_err_title: 'Ads Error', min_ads_err_desc: 'Watch more ads.', min_refs_err_title: 'Ref Error', min_refs_err_desc: 'Refer more users.', 
    // --- NEW TOURNAMENT SETTINGS (for client to load) ---
    topref_section_title: 'Leaderboard',
    is_tournament_active: false,
    tournament_duration_days: 7,
    tournament_start_time: 0, 
    tournament_end_time: 0, 
    tournament_title: 'Referrals Tournament',
    tournament_desc: 'Join the tournament to start counting your referrals for a chance to win a prize!',
    tournament_btn_text: 'Referrals Tournament',
    tournament_rules: 'The top referrers will share a prize pool...',
    tournament_prizes: {
        '1': 1000, '2': 750, '3': 500, '4-10': 400, '11-20': 300, '21-50': 200, '51-100': 100,
        '101-500': 50, '501-1000': 25, '1000+': 10
    },
    prize_popup_title: 'Congratulations!', 
    prize_popup_desc: 'You finished in rank {{rank_range}} and won {{prize_amount}} coins!', 
    prize_popup_btn_text: 'Collect Coins!',
    // --- END NEW TOURNAMENT SETTINGS ---
}; 
let adFunctionName = null, lastDailyClaimDate = null; 

const userRef = db.collection('users').doc(uid);

function updateUserActivity() {
    if (uid) { userRef.update({ last_activity: Date.now() }).catch(err => {}); }
}
updateUserActivity();

// Monetag SDK Loader
function loadMonetagSdk(adCode) {
    const head = document.getElementsByTagName('head')[0];
    let script = document.createElement('script');
    script.src = '//libtl.com/sdk.js'; script.setAttribute('data-zone', adCode.replace('show_', '')); script.setAttribute('data-sdk', adCode);
    head.appendChild(script);
}

// NEW: Onclicka SDK Loader
function loadOnclickaSdk(spotId) {
    if (showOnclicka) return; 
    if(window.initCdTma) {
        window.initCdTma({ id: spotId }).then(show => {
            showOnclicka = show;
            console.log("Onclicka SDK loaded successfully.");
            updateUI();
        }).catch(e => console.error("Onclicka SDK load failed:", e));
    } else {
        console.log("Onclicka SDK not initialized on window.initCdTma.");
    }
}

function populateWithdrawMethods(methodsArray) {
    const selectEl = document.getElementById('withdrawMethod');
    selectEl.innerHTML = '<option value="" disabled selected>Select Payment Method</option>'; 
    methodsArray.forEach(method => {
        const option = document.createElement('option'); option.value = method.replace(/\s/g, ''); option.innerText = method; selectEl.appendChild(option);
    });
}

function initApp() {
    document.getElementById('initialVerificationModal').style.display = 'none'; 
    if(document.getElementById('statusModal').style.display === 'none') {
        document.body.classList.remove('modal-active'); 
    }
    updateUI(); updateDailyRewardUI(); renderTasks(); 
    // Initial content loads based on active-section class in HTML
    if(document.getElementById('invite-section').classList.contains('active-section')) renderReferrals();
    if(document.getElementById('topref-section').classList.contains('active-section')) renderLeaderboard(); 
}

// --- TAB SWITCH LOGIC (UPDATED) ---
function switchAdTab(tab) {
    document.querySelectorAll('.ad-nav-item').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.ad-card-container').forEach(el => el.classList.remove('active'));
    
    document.getElementById('tab-' + tab).classList.add('active');
    document.getElementById('card-' + tab).classList.add('active');
    
    if (tab === 'onclicka' && settings.onclicka_spot_id && !showOnclicka) {
        loadOnclickaSdk(settings.onclicka_spot_id);
    }
}

// --- SETTINGS LISTENER (UPDATED) ---
const setRef = db.collection('settings').doc('global');
setRef.onSnapshot(doc => {
    if (doc.exists) {
        const d = doc.data();
        Object.assign(settings, d); 
        
        // NEW: Load Tournament Settings
        isTournamentActive = d.is_tournament_active || false;
        tournamentEndTime = d.tournament_end_time || 0;
        document.getElementById('toprefSectionTitle').innerText = settings.topref_section_title;


        // Monetag Settings Update
        document.getElementById('limitDisplay').innerText = settings.daily_limit;
        document.getElementById('adCardTitle').innerText = settings.ad_card_title;
        let adDescText = settings.ad_card_desc.replace('{{reward_per_ad}}', settings.reward_per_ad);
        document.getElementById('adCardDesc').innerHTML = adDescText.replace(`${settings.reward_per_ad}`, `<span id="rewardAmountDisplay">${settings.reward_per_ad}</span>`);
        document.getElementById('watchAdBtn').innerHTML = `${settings.ad_btn_text} <i class="fas fa-play-circle"></i>`;

        // Adsgram Settings Update
        document.getElementById('adsgramLimitDisplay').innerText = settings.adsgram_daily_limit;
        let adsgramDescText = settings.adsgram_card_desc.replace('{{adsgram_reward}}', settings.adsgram_reward);
        document.getElementById('adsgramCardDesc').innerHTML = adsgramDescText.replace(`${settings.adsgram_reward}`, `<span id="adsgramRewardDisplay">${settings.adsgram_reward}</span>`);
        document.getElementById('adsgramCardTitle').innerText = settings.adsgram_card_title;
        document.getElementById('watchAdsgramBtn').innerHTML = `${settings.adsgram_btn_text} <i class="fas fa-play-circle"></i>`;
        
        // NEW: Onclicka Settings Update
        document.getElementById('onclickaLimitDisplay').innerText = settings.onclicka_daily_limit;
        let onclickaDescText = settings.onclicka_card_desc.replace('{{onclicka_reward}}', settings.onclicka_reward);
        document.getElementById('onclickaCardDesc').innerHTML = onclickaDescText.replace(`${settings.onclicka_reward}`, `<span id="onclickaRewardDisplay">${settings.onclicka_reward}</span>`);
        document.getElementById('onclickaCardTitle').innerText = settings.onclicka_card_title;
        document.getElementById('watchOnclickaBtn').innerHTML = `${settings.onclicka_btn_text} <i class="fas fa-play-circle"></i>`;

        // General
        document.getElementById('dailyRewardAmountDisplay').innerText = `Reward: +${settings.daily_reward_amount} Coins`; 
        document.getElementById('homeSectionTitle').innerText = settings.home_section_title;
        document.getElementById('missionsSectionTitle').innerText = settings.missions_section_title;
        document.getElementById('inviteSectionTitle').innerText = settings.invite_section_title;
        document.getElementById('walletSectionTitle').innerText = settings.wallet_section_title;
        document.getElementById('refTitle').innerText = settings.ref_title;
        document.getElementById('refDesc').innerText = settings.ref_desc;
        document.getElementById('withdrawTitle').innerText = settings.withdraw_title;
        document.getElementById('withdrawDesc').innerHTML = settings.withdraw_desc.replace('{{min_withdraw}}', settings.min_withdraw);
        document.getElementById('requestWithdrawBtn').innerText = settings.request_withdraw_btn_text; 
        populateWithdrawMethods(settings.pay_methods);

        if (settings.monetag_ad_code && !adFunctionName) {
            adFunctionName = settings.monetag_ad_code;
            setTimeout(() => loadMonetagSdk(adFunctionName), 500); 
        }
        if (settings.onclicka_spot_id) {
            loadOnclickaSdk(settings.onclicka_spot_id);
        }
        if(document.getElementById('initialVerificationModal').style.display === 'flex') updateVerificationModalUI(isBotVerified, verificationStep);
        
        // Update UI to reflect new settings limits and tournament state
        updateUI(); 
        if(document.getElementById('topref-section').classList.contains('active-section')) renderLeaderboard();
    }
});

// --- USER LISTENER (UPDATED) ---
userRef.onSnapshot(doc => {
    if (doc.exists) {
        const d = doc.data();
        currentBalance = d.balance || 0;
        completedTasks = d.completed_tasks || [];
        lastDailyClaimDate = d.last_daily_claim_date || null; 
        totalAdsWatched = d.total_ads_watched || 0; 
        referralCount = d.referral_count || 0; 
        isBotVerified = d.is_verified_bot_joined || false; 
        
        // NEW: Load Tournament User State
        hasJoinedTournament = d.has_joined_tournament || false;
        window.tournamentReferees = d.tournament_referral_count || 0;
        const tournamentData = d.tournament_data || {};
        window.userTournamentRank = tournamentData.rank || null;
        window.hasClaimedPrize = tournamentData.claimed_prize || false;

        // Get independent cooldowns
        adCooldownEndTime = d.ad_cooldown_end_time || 0; 
        adsgramCooldownEndTime = d.adsgram_cooldown_end_time || 0;
        onclickaCooldownEndTime = d.onclicka_cooldown_end_time || 0; // NEW: Onclicka Cooldown

        const balEl = document.getElementById('balance');
        if (balEl.innerHTML.includes('spinner') || document.getElementById('rewardModal').style.display === 'none') {
            balEl.innerText = currentBalance;
        }
        
        document.getElementById('ref-count').innerText = d.referral_count || 0;
        document.getElementById('ref-earned').innerText = d.referral_earnings || 0;

        const today = new Date().toDateString();
        if (d.last_ad_date !== today) {
            adsWatchedToday = 0;
            adsgramWatchedToday = 0;
            onclickaWatchedToday = 0; // NEW: Reset Onclicka counter
            userRef.update({ ads_watched: 0, adsgram_ads_watched: 0, onclicka_ads_watched: 0, last_ad_date: today }); // NEW: Update DB reset
        } else {
            adsWatchedToday = d.ads_watched || 0;
            adsgramWatchedToday = d.adsgram_ads_watched || 0;
            onclickaWatchedToday = d.onclicka_ads_watched || 0; // NEW: Load Onclicka counter
        }
        
        if (d.is_banned === true) showBanPopup();
        else if (d.is_banned === false && d.seen_unban_popup === false) showUnbanPopup();
        else {
            if(document.getElementById('statusModal').style.display !== 'none') {
                document.getElementById('statusModal').style.display = 'none';
                document.body.classList.remove('modal-active');
            }
            
            // NEW: Check for prize claim first if tournament is over.
            const now = Date.now();
            if (!isTournamentActive && tournamentEndTime && now > tournamentEndTime && window.userTournamentRank !== null && !window.hasClaimedPrize) {
                checkAndShowPrizeModal();
            } else if (isBotVerified) {
                 initApp();
            } else if (!isBotVerified && isEntryViaReferral) {
                showInitialVerificationModal(verificationStep); 
            } else if (!isBotVerified && !isEntryViaReferral) {
                userRef.set({ is_verified_bot_joined: true, last_activity: Date.now() }, { merge: true }).then(() => {
                    isBotVerified = true; initApp();
                }).catch(err => showInitialVerificationModal('join'));
            } else if (document.getElementById('initialVerificationModal').style.display !== 'flex') {
                initApp();
            }
        }
    } else {
        let newUser = {
            balance: 0, ads_watched: 0, adsgram_ads_watched: 0, onclicka_ads_watched: 0, total_ads_watched: 0, referral_count: 0, referral_earnings: 0, // NEW: Onclicka Field
            completed_tasks: [], last_ad_date: new Date().toDateString(), 
            username: username, full_name: userFullName, 
            is_verified_bot_joined: !isEntryViaReferral, last_daily_claim_date: null, 
            is_banned: false, seen_unban_popup: true, 
            created_at: firebase.firestore.FieldValue.serverTimestamp(),
            last_activity: Date.now(), 
            ad_cooldown_end_time: 0, 
            adsgram_cooldown_end_time: 0,
            onclicka_cooldown_end_time: 0, // NEW: Onclicka Cooldown Field
            tournament_referral_count: 0, // NEW: Tournament referral counter
            has_joined_tournament: false, // NEW: User participation flag
            tournament_data: { rank: null, claimed_prize: false }, // NEW: Prize tracking
        };
        if (referrerId && referrerId !== uid) {
            newUser.referred_by = referrerId;
            db.collection('users').doc(referrerId).update({ referral_count: firebase.firestore.FieldValue.increment(1) });
            
            // NEW: Tournament Referral Increment (Client-side attempt)
            db.collection('settings').doc('global').get().then(settingsDoc => {
                const s = settingsDoc.data();
                if (s.is_tournament_active) {
                    db.collection('users').doc(referrerId).get().then(referrerDoc => {
                        const r = referrerDoc.data();
                        if (r && r.has_joined_tournament) {
                             db.collection('users').doc(referrerId).update({ 
                                tournament_referral_count: firebase.firestore.FieldValue.increment(1)
                            });
                        }
                    });
                }
            }).catch(e => console.error("Could not check tournament status for new referral: ", e));
            // END NEW

            db.collection('users').doc(referrerId).collection('referred_users').doc(uid).set({
                referred_uid: uid, referred_username: userFullName, referred_total_ads_watched: 0, 
                is_claimed: false, claimed_at: null, created_at: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        userRef.set(newUser).then(() => { if (isEntryViaReferral) showInitialVerificationModal('join'); else initApp(); });
        document.getElementById('balance').innerText = 0;
    }
});

// --- BAN / UNBAN (No Change) ---
function showBanPopup() {
    const modal = document.getElementById('statusModal'); document.body.classList.add('modal-active');
    document.getElementById('statusIconContainer').innerHTML = `<i class="fas fa-ban ban-icon-anim"></i>`;
    document.getElementById('statusTitle').innerText = settings.ban_popup_title; document.getElementById('statusTitle').style.color = '#e74c3c';
    document.getElementById('statusDesc').innerText = settings.ban_popup_desc;
    const btn = document.getElementById('statusBtn'); btn.innerText = settings.ban_btn_text; btn.style.background = '#e74c3c';
    btn.onclick = function() { tg.openTelegramLink(settings.support_url); }; modal.style.display = 'flex';
}
function showUnbanPopup() {
    const modal = document.getElementById('statusModal'); document.body.classList.add('modal-active');
    document.getElementById('statusIconContainer').innerHTML = `<i class="fas fa-check-circle unban-icon-anim"></i>`;
    document.getElementById('statusTitle').innerText = settings.unban_popup_title; document.getElementById('statusTitle').style.color = '#2ecc71';
    document.getElementById('statusDesc').innerText = settings.unban_popup_desc;
    const btn = document.getElementById('statusBtn'); btn.innerText = settings.unban_btn_text; btn.style.background = '#2ecc71';
    btn.onclick = function() { userRef.update({ seen_unban_popup: true, last_activity: Date.now() }).then(() => { modal.style.display = 'none'; document.body.classList.remove('modal-active'); }); };
    modal.style.display = 'flex';
}

// --- VERIFICATION (No Change) ---
function updateVerificationModalUI(isVerified, state) {
    const joinBtn = document.getElementById('joinBotBtn');
    joinBtn.classList.remove('disabled'); joinBtn.disabled = false; joinBtn.style.background = '#0088cc'; document.getElementById('verificationTip').style.display = 'block';
    if (state === 'join') {
        document.getElementById('initialModalTitle').innerText = settings.initial_popup_title; 
        document.getElementById('initialModalDesc').innerText = settings.initial_popup_desc;
        joinBtn.innerHTML = `${settings.initial_popup_btn_text} <i class="fab fa-telegram-plane"></i>`;
        document.getElementById('initialModalIconContainer').innerHTML = '<i class="fas fa-robot" style="font-size:3rem; color:#764ba2; margin-bottom:15px; animation:bounce 2s infinite;"></i>';
        joinBtn.onclick = handleVerificationButtonClick; verificationStep = 'join'; 
    }
}
function showInitialVerificationModal(state) {
    if (isBotVerified) { initApp(); return; }
    document.body.classList.add('modal-active'); updateVerificationModalUI(isBotVerified, 'join');
    document.getElementById('initialVerificationModal').style.display = 'flex';
}
function handleVerificationButtonClick() {
    const joinBtn = document.getElementById('joinBotBtn');
    if (!isJoinButtonClicked) {
        const botLink = settings.initial_popup_bot_link.trim() || BOT_BASE_LINK; tg.openTelegramLink(botLink.replace(/\/$/, ''));
        joinBtn.innerHTML = `${settings.initial_exit_btn_text} <i class="fas fa-times-circle"></i>`; joinBtn.style.background = '#e74c3c'; 
        document.getElementById('initialModalDesc').innerText = settings.initial_exit_desc; document.getElementById('verificationTip').innerText = settings.initial_exit_tip; 
        isJoinButtonClicked = true;
    } else { tg.close(); }
}

// --- INDEPENDENT COOLDOWN TIMERS (No Change in logic) ---

function startAdCooldownTimer(endTime) {
    if (monetagCooldownInterval) clearInterval(monetagCooldownInterval); 
    const btn = document.getElementById('watchAdBtn');
    btn.classList.add('disabled'); btn.onclick = 'void(0)';

    monetagCooldownInterval = setInterval(() => {
        const now = Date.now();
        const remaining = endTime - now; 
        if (remaining <= 0) {
            clearInterval(monetagCooldownInterval); monetagCooldownInterval = null;
            btn.classList.remove('disabled'); btn.onclick = startAdFlow; btn.innerHTML = `${settings.ad_btn_text} <i class="fas fa-play-circle"></i>`; document.getElementById('adCard').classList.remove('disabled-card');
            userRef.update({ ad_cooldown_end_time: 0 }); updateUI(); return;
        }
        const seconds = Math.floor(remaining / 1000); const display = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
        btn.innerHTML = `<i class="fas fa-hourglass-half"></i> Wait: ${display}`;
    }, 1000);
}

function startAdsgramCooldownTimer(endTime) {
    if (adsgramCooldownInterval) clearInterval(adsgramCooldownInterval); 
    const btn = document.getElementById('watchAdsgramBtn');
    btn.classList.add('disabled'); btn.onclick = 'void(0)';

    adsgramCooldownInterval = setInterval(() => {
        const now = Date.now();
        const remaining = endTime - now; 
        if (remaining <= 0) {
            clearInterval(adsgramCooldownInterval); adsgramCooldownInterval = null;
            btn.classList.remove('disabled'); btn.onclick = startAdsgramFlow; btn.innerHTML = `${settings.adsgram_btn_text} <i class="fas fa-play-circle"></i>`; document.getElementById('adsgramCard').classList.remove('disabled-card');
            userRef.update({ adsgram_cooldown_end_time: 0 }); updateUI(); return;
        }
        const seconds = Math.floor(remaining / 1000); const display = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
        btn.innerHTML = `<i class="fas fa-hourglass-half"></i> Wait: ${display}`;
    }, 1000);
}

function startOnclickaCooldownTimer(endTime) {
    if (onclickaCooldownInterval) clearInterval(onclickaCooldownInterval); 
    const btn = document.getElementById('watchOnclickaBtn');
    btn.classList.add('disabled'); btn.onclick = 'void(0)';

    onclickaCooldownInterval = setInterval(() => {
        const now = Date.now();
        const remaining = endTime - now; 
        if (remaining <= 0) {
            clearInterval(onclickaCooldownInterval); onclickaCooldownInterval = null;
            btn.classList.remove('disabled'); btn.onclick = startOnclickaFlow; btn.innerHTML = `${settings.onclicka_btn_text} <i class="fas fa-play-circle"></i>`; document.getElementById('onclickaCard').classList.remove('disabled-card');
            userRef.update({ onclicka_cooldown_end_time: 0 }); updateUI(); return;
        }
        const seconds = Math.floor(remaining / 1000); const display = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
        btn.innerHTML = `<i class="fas fa-hourglass-half"></i> Wait: ${display}`;
    }, 1000);
}


function updateUI() {
    if (!isBotVerified && isEntryViaReferral) return; 
    const now = Date.now();

    // Monetag Check (No Change)
    const mBtn = document.getElementById('watchAdBtn'), mCard = document.getElementById('adCard');
    const isOnCooldown = now < adCooldownEndTime;
    document.getElementById('adCount').innerText = adsWatchedToday;
    document.getElementById('dailyProgressBar').style.width = ((adsWatchedToday / settings.daily_limit) * 100) + '%';
    if (isOnCooldown) {
        mBtn.classList.add('disabled'); mCard.classList.add('disabled-card');
        document.getElementById('completedMsg').style.display = 'none';
        startAdCooldownTimer(adCooldownEndTime);
    } else if (adsWatchedToday >= settings.daily_limit) {
        mBtn.classList.add('disabled'); mBtn.innerText = 'Limit Reached'; document.getElementById('completedMsg').style.display = 'block'; mCard.classList.add('disabled-card');
    } else {
        mBtn.classList.remove('disabled'); document.getElementById('completedMsg').style.display = 'none'; mCard.classList.remove('disabled-card');
        mBtn.onclick = startAdFlow; mBtn.innerHTML = `${settings.ad_btn_text} <i class="fas fa-play-circle"></i>`;
    }

    // Adsgram Check (No Change)
    const aBtn = document.getElementById('watchAdsgramBtn'), aCard = document.getElementById('adsgramCard');
    const isAdsgramOnCooldown = now < adsgramCooldownEndTime;
    document.getElementById('adsgramCount').innerText = adsgramWatchedToday;
    document.getElementById('adsgramProgressBar').style.width = ((adsWatchedToday / settings.adsgram_daily_limit) * 100) + '%';
    if (isAdsgramOnCooldown) {
        aBtn.classList.add('disabled'); aCard.classList.add('disabled-card');
        document.getElementById('adsgramCompletedMsg').style.display = 'none';
        startAdsgramCooldownTimer(adsgramCooldownEndTime);
    } else if (adsgramWatchedToday >= settings.adsgram_daily_limit) {
        aBtn.classList.add('disabled'); aBtn.innerText = 'Limit Reached'; document.getElementById('adsgramCompletedMsg').style.display = 'block'; aCard.classList.add('disabled-card');
    } else {
        aBtn.classList.remove('disabled'); document.getElementById('adsgramCompletedMsg').style.display = 'none'; aCard.classList.remove('disabled-card');
        aBtn.onclick = startAdsgramFlow; aBtn.innerHTML = `${settings.adsgram_btn_text} <i class="fas fa-play-circle"></i>`;
    }

    // NEW: Onclicka Check (No Change)
    const oBtn = document.getElementById('watchOnclickaBtn'), oCard = document.getElementById('onclickaCard');
    const isOnClickaOnCooldown = now < onclickaCooldownEndTime;
    
    document.getElementById('onclickaCount').innerText = onclickaWatchedToday;
    document.getElementById('onclickaProgressBar').style.width = ((onclickaWatchedToday / settings.onclicka_daily_limit) * 100) + '%';

    if (!showOnclicka) { 
        oBtn.classList.add('disabled'); oBtn.innerText = 'Initializing Ad...'; oCard.classList.add('disabled-card');
    } else if (isOnClickaOnCooldown) {
        oBtn.classList.add('disabled'); oCard.classList.add('disabled-card');
        document.getElementById('onclickaCompletedMsg').style.display = 'none';
        startOnclickaCooldownTimer(onclickaCooldownEndTime);
    } else if (onclickaWatchedToday >= settings.onclicka_daily_limit) {
        oBtn.classList.add('disabled'); oBtn.innerText = 'Limit Reached'; document.getElementById('onclickaCompletedMsg').style.display = 'block'; oCard.classList.add('disabled-card');
    } else {
        oBtn.classList.remove('disabled'); document.getElementById('onclickaCompletedMsg').style.display = 'none'; oCard.classList.remove('disabled-card');
        oBtn.onclick = startOnclickaFlow; oBtn.innerHTML = `${settings.onclicka_btn_text} <i class="fas fa-play-circle"></i>`;
    }
}

function updateDailyRewardUI() {
    if (!isBotVerified && isEntryViaReferral) return;
    const btn = document.getElementById('dailyClaimBtn'); const today = new Date().toDateString(); if (!btn) return; 
    if (lastDailyClaimDate === today) { btn.classList.remove('btn-start', 'btn-claim-task'); btn.classList.add('btn-done'); btn.innerText = 'Claimed'; btn.onclick = 'void(0)'; } 
    else { btn.classList.remove('btn-done'); btn.classList.add('btn-start'); btn.innerText = 'Claim'; btn.onclick = claimDailyReward; btn.disabled = false; }
}
function claimDailyReward() {
    if (!isBotVerified && isEntryViaReferral) return;
    const today = new Date().toDateString();
    if (lastDailyClaimDate === today) { showErrorModal('Already Claimed!', 'You have already claimed your daily reward today.', 'exclamation-triangle'); updateDailyRewardUI(); return; }
    document.getElementById('dailyClaimBtn').disabled = true; window.dailyClaimButtonRef = document.getElementById('dailyClaimBtn'); 
    showRewardModal('daily', settings.daily_reward_amount, null); 
}

// --- TASKS (No Change) ---
function renderTasks() {
    if (!isBotVerified && isEntryViaReferral) return;
    const activeContainer = document.getElementById('taskListContainer'); const completedContainer = document.getElementById('completedListContainer'); const completedTitle = document.getElementById('completedMissionsTitle');
    db.collection('tasks').where('active', '==', true).onSnapshot(snapshot => {
        let tasks = []; snapshot.forEach(doc => tasks.push({id: doc.id, ...doc.data()})); tasks.sort((a,b) => b.created_at - a.created_at);
        let activeHtml = '', completedHtml = '';
        tasks.forEach(task => {
            const isCompleted = completedTasks.includes(task.id);
            let iconClass = task.type === 'telegram' ? 'fab fa-telegram-plane' : (task.type === 'youtube' ? 'fab fa-youtube' : 'fas fa-globe');
            let btnClass = isCompleted ? 'btn-done' : 'btn-start', btnText = isCompleted ? 'Completed' : 'Start', btnAction = isCompleted ? 'void(0)' : `startTask('${task.id}', '${task.link}', ${task.reward})`;
            const cardHtml = `<div class="task-card"><div class="task-left"><div class="task-icon"><i class="${iconClass}"></i></div><div class="task-info"><h4>${task.title}</h4><p>Reward: +${task.reward} Coins</p></div></div><button id="btn-${task.id}" class="task-btn ${btnClass}" onclick="${btnAction}">${btnText}</button></div>`;
            if (isCompleted) completedHtml += cardHtml; else activeHtml += cardHtml;
        });
        activeContainer.innerHTML = activeHtml || '<div style="text-align:center; padding: 40px; color: #999;"><i class="fas fa-box-open fa-2x"></i><p>No active missions.</p></div>';
        completedContainer.innerHTML = completedHtml; completedTitle.style.display = completedHtml ? 'block' : 'none';
    });
}
function startTask(id, link, reward) {
    if (!isBotVerified && isEntryViaReferral) return;
    window.open(link, '_blank'); const btn = document.getElementById(`btn-${id}`);
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; btn.disabled = true; btn.classList.add('btn-done'); 
    setTimeout(() => { if (completedTasks.includes(id)) { btn.innerHTML = 'Completed'; return; } btn.innerHTML = 'Claim'; btn.className = 'task-btn btn-claim-task'; btn.disabled = false; btn.onclick = function() { showRewardModal('mission', reward, id); btn.innerHTML = 'Completed'; btn.className = 'task-btn btn-done'; btn.disabled = true; }; }, 5000); 
}

// --- ADS LOGIC (No Change) ---
function startAdFlow() { // Monetag
    const now = Date.now(); if (now < adCooldownEndTime) { updateUI(); showErrorModal('Hold On!', 'Please wait for the cooldown timer.', 'clock'); return; }
    if (!isBotVerified && isEntryViaReferral) return; if (adsWatchedToday >= settings.daily_limit) return;
    const adFunc = window[adFunctionName]; if (!adFunc || typeof adFunc !== 'function') { showErrorModal('Error', 'Ad function is not ready.', 'exclamation-circle'); return; }
    document.getElementById('adOverlay').style.display = 'flex'; 
    document.getElementById('watchAdBtn').classList.add('disabled'); 
    document.getElementById('watchAdBtn').innerHTML = 'Loading...'; 

    adFunc().then(() => { 
        document.getElementById('adOverlay').style.display = 'none'; 
        openAdModal('monetag'); 
    }).catch((e) => { 
        document.getElementById('adOverlay').style.display = 'none'; 
        document.getElementById('watchAdBtn').classList.remove('disabled'); 
        document.getElementById('watchAdBtn').innerHTML = `${settings.ad_btn_text} <i class="fas fa-play-circle"></i>`; 
        showErrorModal('Ad Failed', 'Ad not completed.', 'times-circle'); 
    });
}

function startAdsgramFlow() { // Adsgram
    const now = Date.now(); if (now < adsgramCooldownEndTime) { updateUI(); showErrorModal('Hold On!', 'Please wait for the cooldown timer.', 'clock'); return; }
    if (!isBotVerified && isEntryViaReferral) return; if (adsgramWatchedToday >= settings.adsgram_daily_limit) return;
    const blockId = settings.adsgram_block_id || "int-18699"; if (!window.Adsgram) { showErrorModal('Error', 'Adsgram SDK not loaded.', 'exclamation-circle'); return; }
    const AdController = window.Adsgram.init({ blockId: blockId });
    document.getElementById('adOverlay').style.display = 'flex'; 
    document.getElementById('watchAdsgramBtn').classList.add('disabled'); 
    document.getElementById('watchAdsgramBtn').innerHTML = 'Loading...'; 

    AdController.show().then((result) => { 
        document.getElementById('adOverlay').style.display = 'none'; 
        openAdModal('adsgram'); 
    }).catch((result) => { 
        document.getElementById('adOverlay').style.display = 'none'; 
        document.getElementById('watchAdsgramBtn').classList.remove('disabled'); 
        document.getElementById('watchAdsgramBtn').innerHTML = `${settings.adsgram_btn_text} <i class="fas fa-play-circle"></i>`; 
        console.log("Adsgram Error:", result); 
        showErrorModal('Ad Failed', 'Ad not completed or skipped.', 'times-circle'); 
    });
}

// NEW: Onclicka Ad Flow (No Change)
function startOnclickaFlow() {
    const now = Date.now(); if (now < onclickaCooldownEndTime) { updateUI(); showErrorModal('Hold On!', 'Please wait for the cooldown timer.', 'clock'); return; }
    if (!isBotVerified && isEntryViaReferral) return; 
    if (onclickaWatchedToday >= settings.onclicka_daily_limit) return;
    
    if (!showOnclicka || typeof showOnclicka !== 'function') {
        showErrorModal('Error', 'Onclicka Ad function is not ready or failed to initialize. Try again.', 'exclamation-circle'); 
        loadOnclickaSdk(settings.onclicka_spot_id); 
        return;
    }

    document.getElementById('adOverlay').style.display = 'flex'; 
    document.getElementById('watchOnclickaBtn').classList.add('disabled'); 
    document.getElementById('watchOnclickaBtn').innerHTML = 'Loading...'; 

    showOnclicka().then(() => { 
        document.getElementById('adOverlay').style.display = 'none'; 
        openAdModal('onclicka'); 
    }).catch((e) => { 
        document.getElementById('adOverlay').style.display = 'none'; 
        document.getElementById('watchOnclickaBtn').classList.remove('disabled'); 
        document.getElementById('watchOnclickaBtn').innerHTML = `${settings.onclicka_btn_text} <i class="fas fa-play-circle"></i>`; 
        console.error("Onclicka Ad Failed:", e); 
        showErrorModal('Ad Failed', 'Ad not completed or skipped.', 'times-circle'); 
    });
}

function openAdModal(provider) {
    const btnId = (provider === 'adsgram') ? 'watchAdsgramBtn' : (provider === 'onclicka') ? 'watchOnclickaBtn' : 'watchAdBtn';
    const btn = document.getElementById(btnId);
    
    btn.classList.add('disabled'); 
    btn.innerHTML = 'Waiting...'; 

    const reward = (provider === 'adsgram') ? settings.adsgram_reward : (provider === 'onclicka') ? settings.onclicka_reward : settings.reward_per_ad;
    showRewardModal('ad', reward, null, provider); 
}

// UPDATED: executeAdRewardTransaction (No Change)
function executeAdRewardTransaction(amount, provider) {
    const now = new Date(); 
    const todayDateKey = now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');
    const ref = db.collection('users').doc(uid).collection('daily_ads_views').doc(todayDateKey);

    db.runTransaction(async t => { 
        const dailyDoc = await t.get(ref);
        const userDoc = await t.get(db.collection('users').doc(uid));
        if (!userDoc.exists) throw "User not found.";
        
        const newDailyCount = (dailyDoc.exists ? dailyDoc.data().count : 0) + 1;
        const dailyData = {
            count: newDailyCount, last_reward: amount, last_provider: provider, updated_at: Date.now(), 
            created_at: dailyDoc.exists ? dailyDoc.data().created_at : Date.now()
        };
        t.set(ref, dailyData, {merge: true}); 

        const currentTotalAds = (userDoc.data().total_ads_watched || 0) + 1;
        if (userDoc.data().referred_by) {
            const referrerUid = userDoc.data().referred_by;
            t.update(db.collection('users').doc(referrerUid).collection('referred_users').doc(uid), { referred_total_ads_watched: currentTotalAds });
        }
        
        let updateData = {
            balance: firebase.firestore.FieldValue.increment(amount), 
            total_ads_watched: firebase.firestore.FieldValue.increment(1), // <--- **This is the main aggregator (one place)**
            last_activity: Date.now()
        };
        
        // Handle Independent Cooldowns & Counters (Starts Cooldown after collection)
        if (provider === 'adsgram') {
            updateData.adsgram_ads_watched = firebase.firestore.FieldValue.increment(1);
            updateData.adsgram_cooldown_end_time = Date.now() + COOLDOWN_DURATION;
        } else if (provider === 'onclicka') { 
            updateData.onclicka_ads_watched = firebase.firestore.FieldValue.increment(1);
            updateData.onclicka_cooldown_end_time = Date.now() + COOLDOWN_DURATION;
        } else { // 'monetag' (default)
            updateData.ads_watched = firebase.firestore.FieldValue.increment(1);
            updateData.ad_cooldown_end_time = Date.now() + COOLDOWN_DURATION;
        }

        t.update(db.collection('users').doc(uid), updateData);
    }).then(() => {
        // Update local cooldown variable immediately for UI responsiveness
        if (provider === 'adsgram') adsgramCooldownEndTime = Date.now() + COOLDOWN_DURATION;
        else if (provider === 'onclicka') onclickaCooldownEndTime = Date.now() + COOLDOWN_DURATION; 
        else adCooldownEndTime = Date.now() + COOLDOWN_DURATION;
        updateUI();
    }).catch(err => console.error("Ad log failed: ", err));
}

function showCustomSuccessModal(title, desc, iconName) {
    const modal = document.getElementById('rewardModal');
    document.getElementById('modalIconContainer').innerHTML = `<div class="reward-icon-success"><i class="fas fa-${iconName}" style="color:white;font-size:3rem;"></i></div>`;
    document.getElementById('popupAmount').style.display = 'none';
    modal.querySelector('.reward-title').innerText = title || settings.withdraw_success_title;
    modal.querySelector('.reward-desc').innerHTML = desc || settings.withdraw_success_desc; 
    modal.style.display = 'flex';
    document.getElementById('modalClaimBtn').innerText = settings.withdraw_success_btn_text; 
    document.getElementById('modalClaimBtn').onclick = () => modal.style.display = 'none';
}

function showErrorModal(title, desc, iconName) {
    const modal = document.getElementById('rewardModal');
    document.getElementById('modalIconContainer').innerHTML = `<div class="reward-icon-error"><i class="fas fa-${iconName}" style="color:white;font-size:3rem;"></i></div>`;
    document.getElementById('popupAmount').style.display = 'none';
    modal.querySelector('.reward-title').innerText = title; modal.querySelector('.reward-desc').innerHTML = desc; modal.style.display = 'flex';
    document.getElementById('modalClaimBtn').innerText = settings.error_modal_btn_text; document.getElementById('modalClaimBtn').onclick = () => modal.style.display = 'none';
}

function showRewardModal(type, amount, id, provider = null) {
    if (!isBotVerified && isEntryViaReferral) return;
    let title = 'Reward!', desc = 'Processed.';
    document.getElementById('modalIconContainer').innerHTML = '<img src="https://cdn-icons-png.flaticon.com/512/1292/1292744.png" class="reward-coin" id="defaultRewardIcon">';
    document.getElementById('popupAmount').style.display = 'block';

    if (type === 'ad') { title = settings.ad_popup_title; desc = settings.ad_popup_desc; }
    else if (type === 'daily') { title = settings.daily_popup_title; desc = settings.daily_popup_desc; }
    else if (type === 'mission') { title = settings.mission_popup_title; desc = settings.mission_popup_desc; }
    else if (type === 'referral') { title = 'Referral Bonus!'; desc = 'You are about to claim your referral bonus.'; } 

    document.getElementById('popupAmount').innerText = '+' + amount + ' Coins';
    const modal = document.getElementById('rewardModal');
    modal.querySelector('.reward-title').innerText = title; modal.querySelector('.reward-desc').innerText = desc; 
    modal.style.display = 'flex';
    const btn = document.getElementById('modalClaimBtn');
    btn.onclick = null; btn.innerText = settings.modal_claim_btn_text; 
    
    btn.onclick = function() {
        modal.style.display = 'none';
        
        // Fixed Flying Animation
        const coin = document.createElement('img'); coin.src = 'https://cdn-icons-png.flaticon.com/512/1292/1292744.png'; coin.className = 'fly-coin';
        const c = { x: window.innerWidth/2, y: window.innerHeight/2 }; coin.style.left = `${c.x-17.5}px`; coin.style.top = `${c.y-17.5}px`; document.body.appendChild(coin);
        const t = document.getElementById('mainCoinIcon').getBoundingClientRect();
        setTimeout(() => { coin.style.left = t.left+'px'; coin.style.top = t.top+'px'; coin.style.opacity = '0.5'; coin.style.transform = 'scale(0.5)'; }, 50);
        setTimeout(() => coin.remove(), 800);
        
        // Perform DB updates HERE to avoid double counting
        // Animate balance visually (the listener will catch the actual DB update)
        let newBalance = currentBalance + amount; 
        animateBalance(currentBalance, newBalance);

        if (type === 'ad') { 
            executeAdRewardTransaction(amount, provider); // Starts the cooldown timer here and updates total_ads_watched
        }
        else if (type === 'mission') { 
            userRef.update({ balance: firebase.firestore.FieldValue.increment(amount), completed_tasks: firebase.firestore.FieldValue.arrayUnion(id), last_activity: Date.now() });
        }
        else if (type === 'daily') {
            const today = new Date().toDateString();
            userRef.update({ balance: firebase.firestore.FieldValue.increment(amount), last_daily_claim_date: today, last_activity: Date.now() }).then(() => {
                if(window.dailyClaimButtonRef) { window.dailyClaimButtonRef.innerHTML = 'Claimed'; window.dailyClaimButtonRef.className = 'task-btn btn-done'; window.dailyClaimButtonRef.disabled = true; lastDailyClaimDate = today; delete window.dailyClaimButtonRef; }
            });
        } 
        else if (type === 'referral') { 
            processReferralClaimTransaction(window.referredIdToClaim, window.rewardAmountToClaim);
        }
    };
}

function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    const date = (typeof timestamp === 'number') ? new Date(timestamp) : timestamp.toDate();
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

async function processReferralClaimTransaction(referredUid, amount) {
     const btn = document.getElementById(`ref-btn-${referredUid}`);
    const refUserRef = db.collection('users').doc(uid).collection('referred_users').doc(referredUid);
    try {
        await db.runTransaction(async t => {
            const userDoc = await t.get(userRef); const refDoc = await t.get(refUserRef);
            if (!userDoc.exists || !refDoc.exists) throw "User or Referral record not found.";
            if (refDoc.data().is_claimed) throw "Bonus already claimed.";
            if ((refDoc.data().referred_total_ads_watched || 0) < settings.ref_ads_watch_requirement) throw "Req not met.";
            t.update(userRef, { balance: firebase.firestore.FieldValue.increment(amount), referral_earnings: firebase.firestore.FieldValue.increment(amount), last_activity: Date.now() });
            t.update(refUserRef, { is_claimed: true, claimed_at: Date.now() });
            return amount; 
        });
    } catch (error) {
        console.error("Referral Claim Failed: ", error);
        const errMsg = (typeof error === 'string') ? error : "An unexpected error occurred.";
        if (btn && errMsg !== "Bonus already claimed.") { btn.innerHTML = 'Claim'; btn.classList.remove('btn-done'); btn.classList.add('btn-claim-task'); btn.disabled = false; }
        showErrorModal('Claim Failed', errMsg, 'exclamation-triangle');
    }
    window.referredIdToClaim = null; window.rewardAmountToClaim = null; 
}

async function claimReferralBonus(referredUid, amount) {
    if (!isBotVerified && isEntryViaReferral) return;
    const btn = document.getElementById(`ref-btn-${referredUid}`); btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; btn.disabled = true;
    const refDoc = await db.collection('users').doc(uid).collection('referred_users').doc(referredUid).get();
    if (!refDoc.exists || refDoc.data().is_claimed || (refDoc.data().referred_total_ads_watched || 0) < settings.ref_ads_watch_requirement) {
         btn.innerHTML = 'Pending'; btn.classList.remove('btn-claim-task'); btn.classList.add('btn-done'); btn.disabled = true;
         showErrorModal('Requirement Not Met', 'Your referral has not yet viewed enough ads.', 'hand-point-up'); return; 
    }
    window.referredIdToClaim = referredUid; window.rewardAmountToClaim = amount; showRewardModal('referral', amount, referredUid); 
}

function renderReferrals(page = 1) {
    if (!isBotVerified && isEntryViaReferral) return;
    const loading = document.getElementById('activeRefLoading'); loading.style.display = 'block';
    db.collection('users').doc(uid).collection('referred_users').onSnapshot(async snapshot => {
        loading.style.display = 'none'; const referrals = []; const reqs = [];
        snapshot.forEach(doc => {
            const d = doc.data();
            reqs.push(db.collection('users').doc(d.referred_uid).get().then(refUserDoc => {
                const userName = d.referred_username || (refUserDoc.exists ? (refUserDoc.data().full_name || 'User') : 'User'); 
                const totalAds = refUserDoc.exists ? (refUserDoc.data().total_ads_watched || 0) : (d.referred_total_ads_watched || 0);
                referrals.push({ ...d, id: doc.id, referred_username: userName, referred_total_ads_watched: totalAds });
            }).catch(() => { referrals.push({ ...d, id: doc.id, referred_total_ads_watched: d.referred_total_ads_watched || 0 }); }));
        });
        await Promise.all(reqs);
        activeReferralsData = referrals.filter(r => !r.is_claimed); completedReferralsData = referrals.filter(r => r.is_claimed);
        activeReferralsData.sort((a, b) => (b.referred_total_ads_watched || 0) - (a.referred_total_ads_watched || 0));
        completedReferralsData.sort((a, b) => (b.claimed_at || 0) - (a.claimed_at || 0));
        activeRefPage = page; completedRefPage = 1; 
        updateReferralList(activeReferralsData, activeRefPage, 'active'); updateReferralList(completedReferralsData, completedRefPage, 'completed');
    });
}

function updateReferralList(data, page, type) {
    const container = document.getElementById(`${type}ReferralListContainer`); const titleEl = document.getElementById(`${type}ReferralsTitle`); const paginationEl = document.getElementById(`${type}ReferralPagination`);
    const start = (page - 1) * pageSize; const end = start + pageSize; const paginatedData = data.slice(start, end); const totalPages = Math.ceil(data.length / pageSize); const refReq = settings.ref_ads_watch_requirement || 100;
    titleEl.style.display = data.length > 0 ? 'block' : 'none';
    if (data.length === 0) { container.innerHTML = ''; paginationEl.style.display = 'none'; return; }
    let html = '';
    paginatedData.forEach(r => {
        const adsWatched = r.referred_total_ads_watched || 0; const cappedAdsWatched = Math.min(adsWatched, refReq); const isReadyToClaim = adsWatched >= refReq; const progressText = `${cappedAdsWatched}/${refReq}`; const progressColor = isReadyToClaim ? '#4caf50' : '#ff9800';
        let btnClass = 'btn-done', btnText = 'Pending', btnAction = 'void(0)', btnDisabled = true, buttonStyle = 'opacity: 0.8;';
        if (r.is_claimed) { btnText = 'Claimed'; btnClass = 'btn-done'; btnDisabled = true; buttonStyle = 'opacity: 1;'; } 
        else if (isReadyToClaim) { btnText = 'Claim'; btnClass = 'btn-claim-task'; btnAction = `claimReferralBonus('${r.id}', ${settings.ref_bonus})`; btnDisabled = false; buttonStyle = 'animation: pulse 1s infinite;'; }
        const joinDate = formatDate(r.created_at); 
        html += `<div class="task-card ref-list-card" id="ref-card-${r.id}"><div class="task-left"><div class="task-icon" style="width: 40px; height: 40px; border-radius: 10px; font-size: 1rem;"><i class="fas fa-user-check"></i></div><div class="ref-user-info"><h4>${r.referred_username}</h4><p>UID: ${r.referred_uid.substring(0, 4)}...${r.referred_uid.slice(-4)}</p><p class="ref-join-date">Joined: ${joinDate}</p></div></div><div class="ref-actions"><div class="ref-summary-right"><div class="ref-reward-amount">+${settings.ref_bonus} Coins</div><div class="ref-progress-text" style="color: ${progressColor};">${progressText} Ads</div></div><button id="ref-btn-${r.id}" class="task-btn ${btnClass}" onclick="${btnAction}" ${btnDisabled ? 'disabled' : ''} style="${buttonStyle}">${btnText}</button></div></div>`;
    });
    container.innerHTML = html;
    paginationEl.innerHTML = '';
    if (totalPages > 1) {
        const prevBtn = `<button class="page-btn" onclick="changeRefPage('${type}', ${page - 1})" ${page === 1 ? 'disabled' : ''}><i class="fas fa-chevron-left"></i></button>`;
        const nextBtn = `<button class="page-btn" onclick="changeRefPage('${type}', ${page + 1})" ${page === totalPages ? 'disabled' : ''}><i class="fas fa-chevron-right"></i></button>`;
        let pageNumbers = ''; for (let i = 1; i <= totalPages; i++) { pageNumbers += `<button class="page-btn ${i === page ? 'active' : ''}" onclick="changeRefPage('${type}', ${i})">${i}</button>`; }
        paginationEl.innerHTML = prevBtn + pageNumbers + nextBtn; paginationEl.style.display = 'flex';
    } else { paginationEl.style.display = 'none'; }
}
function changeRefPage(type, newPage) { if (type === 'active') { activeRefPage = newPage; updateReferralList(activeReferralsData, activeRefPage, 'active'); } else if (type === 'completed') { completedRefPage = newPage; updateReferralList(completedReferralsData, completedRefPage, 'completed'); } }
function toggleAccountInput() { const method = document.getElementById('withdrawMethod').value; document.getElementById('accountNumber').style.display = (method && method !== "") ? 'block' : 'none'; }

function requestWithdraw() {
    if (!isBotVerified && isEntryViaReferral) return;
    const method = document.getElementById('withdrawMethod').value, accNum = document.getElementById('accountNumber').value.trim();
    const amount = parseInt(document.getElementById('withdrawAmount').value), minWithdraw = settings.min_withdraw; 
    if (totalAdsWatched < settings.min_ads_view_for_withdraw) return showErrorModal(settings.min_ads_err_title, settings.min_ads_err_desc.replace('{{min_ads_view}}', settings.min_ads_view_for_withdraw), 'video');
    if (referralCount < settings.min_referrals_for_withdraw) return showErrorModal(settings.min_refs_err_title, settings.min_refs_err_desc.replace('{{min_referrals}}', settings.min_referrals_for_withdraw), 'user-plus');
    if (isNaN(amount) || amount <= 0) return showErrorModal(settings.min_amt_err_title, settings.min_amt_err_desc.replace('{{min_withdraw}}', minWithdraw), 'ban');
    if (amount < minWithdraw) return showErrorModal(settings.min_amt_err_title, settings.min_amt_err_desc.replace('{{min_withdraw}}', minWithdraw), 'hand-point-up');
    if (amount > currentBalance) return showErrorModal(settings.bal_err_title, settings.bal_err_desc, 'wallet');
    if (!method) return showErrorModal(settings.method_err_title, settings.method_err_desc, 'credit-card');
    if (!accNum) return showErrorModal(settings.acc_num_err_title, settings.acc_num_err_desc, 'user-circle');
    document.getElementById('balance').innerHTML = '<div class="spinner"></div>';
    userRef.update({ balance: firebase.firestore.FieldValue.increment(-amount), last_activity: Date.now() }).then(() => {
        db.collection('withdrawals').add({ user_id: uid, username: username, method: method, account_number: accNum, amount: amount, status: 'pending', date: Date.now() })
        .then(() => { showCustomSuccessModal(settings.withdraw_success_title, settings.withdraw_success_desc, 'check-circle'); document.getElementById('withdrawAmount').value = ''; document.getElementById('accountNumber').value = ''; document.getElementById('withdrawMethod').value = ''; document.getElementById('accountNumber').style.display = 'none'; });
    }).catch(err => { showErrorModal("Transaction Error", "Error deducting balance.", 'exclamation-triangle'); document.getElementById('balance').innerText = currentBalance; });
}

function hideHistoryModal() { document.getElementById('historyModal').style.display = 'none'; }
function showHistoryModal(type) {
     if (!uid) return; const modal = document.getElementById('historyModal'); const titleEl = document.querySelector('#historyModal .reward-title'), iconContainer = document.getElementById('historyModalIconContainer'); document.getElementById('historyListContainer').innerHTML = `<div style="text-align:center; padding: 30px; color: #999;"><div class="spinner spinner-dark"></div><p style="margin-top:10px;">Loading...</p></div>`;
    if (type === 'withdrawal') { titleEl.innerText = 'Withdraw History'; iconContainer.innerHTML = '<i class="fas fa-wallet fa-2x" style="color: #764ba2; margin-bottom: 15px;"></i>'; fetchWithdrawalHistory(); } 
    modal.style.display = 'flex'; updateUserActivity(); 
}
function showAdsHistoryModal() {
    if (!uid) return; const modal = document.getElementById('historyModal'); document.getElementById('historyListContainer').innerHTML = `<div style="text-align:center; padding: 30px; color: #999;"><div class="spinner spinner-dark"></div><p style="margin-top:10px;">Loading...</p></div>`; document.querySelector('#historyModal .reward-title').innerText = 'Ads View History'; document.getElementById('historyModalIconContainer').innerHTML = '<i class="fas fa-video fa-2x" style="color: #764ba2; margin-bottom: 15px;"></i>'; modal.style.display = 'flex'; fetchAdsHistory(); updateUserActivity(); 
}
function fetchWithdrawalHistory() {
    if (!uid) return; db.collection('withdrawals').where('user_id', '==', uid).orderBy('date', 'desc').onSnapshot(snapshot => {
        let html = ''; if (snapshot.empty) html = `<div style="text-align:center; padding: 30px; color: #999;"><i class="fas fa-box-open fa-2x"></i><p>No withdrawal history found.</p></div>`;
        else snapshot.forEach(doc => { const item = doc.data(); const date = item.date ? new Date(item.date).toLocaleDateString() : 'N/A'; html += `<div class="history-item" style="align-items: flex-start;"><div class="item-details"><h4 style="margin-bottom: 8px; font-size: 1rem; color: #764ba2;">${item.amount} Coins</h4><div style="font-size: 0.85rem; color: #444; line-height: 1.6;"><strong>UID:</strong> ${item.user_id}<br><strong>Method:</strong> ${item.method}<br><strong>Account:</strong> ${item.account_number || 'N/A'}<br><span style="font-size: 0.75rem; color: #888;">Date: ${date}</span></div></div><span class="item-status status-${item.status}" style="margin-top: 5px;">${item.status.charAt(0).toUpperCase() + item.status.slice(1)}</span></div>`; });
        document.getElementById('historyListContainer').innerHTML = html;
    });
}
function fetchAdsHistory() {
    if (!uid) return; db.collection('users').doc(uid).collection('daily_ads_views').orderBy('updated_at', 'desc').onSnapshot(snapshot => {
        let html = ''; const minRequired = settings.min_ads_view_for_withdraw || 0; const isMet = totalAdsWatched >= minRequired; const statusClass = isMet ? 'ads-status-ok' : 'ads-status-pending'; const statusText = isMet ? 'Requirement Met!' : `Needed for Withdraw: ${minRequired} Ads`; const bgColor = isMet ? '#2ecc71' : '#e74c3c'; 
        html += `<div class="ads-history-summary"><div class="item-details" style="text-align: left;"><h4 style="color:#764ba2; margin:0;">Total Lifetime Ads:</h4><p class="${statusClass}" style="margin:0; font-weight:600;">${statusText}</p></div><span class="item-status" style="background:${bgColor}; font-size:1rem; padding: 6px 12px; color: white;">${totalAdsWatched}</span></div>`;
        if (snapshot.empty) html += `<div style="text-align:center; padding: 30px; color: #999;"><i class="fas fa-box-open fa-2x"></i><p>No ads view history found.</p></div>`; 
        else snapshot.forEach(doc => { 
            const item = doc.data(); 
            const dateKey = doc.id; 
            const parts = dateKey.split('-'); 
            const displayDate = new Date(parts[0], parts[1]-1, parts[2]).toLocaleDateString(); 
            // UPDATED: Provider Check
            let providerName = 'Monetag/Network 1';
            if(item.last_provider === 'adsgram') providerName = 'Adsgram';
            else if(item.last_provider === 'onclicka') providerName = 'Onclicka Ads';

            html += `<div class="history-item"><div class="item-details"><h4 style="font-size: 0.95rem;">${item.count} Ads Viewed (Daily)</h4><p style="color: #764ba2; font-weight: 600;">Last Network: ${providerName}</p><p style="font-size:0.75rem; color: #888;">Date: ${displayDate}</p></div><span class="item-status status-paid">Viewed</span></div>`; 
        });
        document.getElementById('historyListContainer').innerHTML = html;
    });
}

// --- NEW: LEADERBOARD & TOURNAMENT LOGIC ---

// MODIFIED: handleTournamentButtonClick to show join modal if not joined
function handleTournamentButtonClick() {
    if (!isTournamentActive) {
        showErrorModal('Tournament Inactive', 'The Referrals Tournament is currently inactive. Please check back later.', 'trophy');
    } else if (!hasJoinedTournament) {
        // Show join modal if active but not joined
        showJoinTournamentModal();
    } else {
        // Show list modal if active and joined
        showTournamentListModal();
    }
}

function showTournamentListModal() {
    if (!isTournamentActive) return;

    document.getElementById('tournListModalTitle').innerText = settings.tournament_title + ' (Top 100)';
    document.getElementById('tournamentListModal').style.display = 'flex';
    document.body.classList.add('modal-active');
    
    // Update Join Button visibility (Should be hidden if joined)
    const joinBtn = document.getElementById('listModalJoinBtn');
    joinBtn.style.display = hasJoinedTournament ? 'none' : 'block';
    
    // Clear previous summary
    document.getElementById('currentUserTournamentSummary').style.display = 'none';
    document.getElementById('currentUserTournamentSummary').innerHTML = '';


    // Start countdown inside modal
    startTournamentCountdown(tournamentEndTime, 'tournListTimerDisplay');

    // Fetch list inside modal
    fetchTournamentLeaderboard(document.getElementById('tournamentLeaderboardList'), true);
}

function hideTournamentListModal() {
    document.getElementById('tournamentListModal').style.display = 'none';
    document.body.classList.remove('modal-active');
}

function showJoinTournamentModal(fromList = false) {
    if (hasJoinedTournament) { 
        if(fromList) hideTournamentListModal();
        return; 
    }
    
    // Update join modal content (in case of settings update)
    document.getElementById('joinModalTitle').innerText = settings.tournament_title;
    document.getElementById('joinModalDesc').innerText = settings.tournament_desc;
    
    document.getElementById('joinTournamentModal').style.display = 'flex';
    document.body.classList.add('modal-active');
    if(fromList) hideTournamentListModal(); // Hide list if coming from there
}

function hideJoinTournamentModal() {
    document.getElementById('joinTournamentModal').style.display = 'none';
    document.body.classList.remove('modal-active');
}

function renderLeaderboard() {
    if (!isBotVerified && isEntryViaReferral) return;

    const container = document.getElementById('topReferralListContainer');
    const titleEl = document.getElementById('leaderboardTitle');
    const descEl = document.getElementById('leaderboardDesc');
    const tourneyUI = document.getElementById('tournament-ui-container'); // Now inside the card
    const now = Date.now();

    // 1. Check Tournament Status & Update UI (Moved inside the card)
    if (isTournamentActive && now < tournamentEndTime) {
        tourneyUI.style.display = 'block';
        document.getElementById('referralTournamentBtn').innerHTML = `<i class="fas fa-trophy"></i> ${settings.tournament_btn_text}`;
        startTournamentCountdown(tournamentEndTime, 'tournamentTimerDisplay');
    } else {
        tourneyUI.style.display = 'none';
        if (tournamentCountdownInterval) clearInterval(tournamentCountdownInterval);
    }
    
    // 2. Always render the Main Lifetime Leaderboard (Original logic)
    titleEl.innerText = 'Top 100 Referrers (Lifetime)';
    descEl.innerText = 'The list of the top 100 users with the most *lifetime* referrals. The list updates in real-time.';
    
    container.innerHTML = `<div style="text-align:center; padding: 40px; color: #999;"><div class="spinner spinner-dark"></div><p style="margin-top:10px;">Loading Lifetime Leaderboard...</p></div>`;
    
    // Fetch and display Lifetime Leaderboard
    db.collection('users').orderBy('referral_count', 'desc').limit(100).onSnapshot(snapshot => {
         let html = '';
         const filteredUsers = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(data => (data.referral_count || 0) > 0); 

        if (filteredUsers.length === 0) {
            html = `<div style="text-align:center; padding: 40px; color: #999;"><i class="fas fa-box-open fa-2x"></i><p>No referrers yet.</p></div>`;
        } else {
             filteredUsers.forEach((data, index) => {
                  const rank = index + 1;
                  const fullName = data.full_name || data.username || 'Unknown User'; 
                  const referralCount = data.referral_count || 0;
                  
                  let rankBadgeHtml = ''; let rankText = rank; let badgeClass = 'rank-other';
                  if (rank === 1) { rankBadgeHtml = `<i class="fas fa-crown"></i>`; badgeClass = 'rank-1'; rankText = ''; } 
                  else if (rank === 2) { rankBadgeHtml = `<i class="fas fa-star"></i>`; badgeClass = 'rank-2'; rankText = ''; } 
                  else if (rank === 3) { rankBadgeHtml = `<i class="fas fa-medal"></i>`; badgeClass = 'rank-3'; rankText = ''; }
                  
                  html += `
                    <div class="top-ref-item">
                        <div class="ref-rank-badge ${badgeClass}">${rankBadgeHtml || rankText}</div>
                        <div class="ref-info"><h4>${fullName}</h4><p>Total Referrals: ${referralCount}</p></div>
                        <div class="ref-count-pill">${referralCount}</div>
                    </div>`;
             });
        }
        container.innerHTML = html;
    });
}


function fetchTournamentLeaderboard(container, isModal = false) {
    if (!isTournamentActive) return;

    container.innerHTML = `<div style="text-align:center; padding: 40px; color: #999;"><div class="spinner spinner-dark"></div><p style="margin-top:10px;">Loading Tournament Leaderboard...</p></div>`;
    
    // Clear the current user summary container initially
    const currentUserSummaryEl = document.getElementById('currentUserTournamentSummary');
    if(isModal && currentUserSummaryEl) {
        currentUserSummaryEl.style.display = 'none';
        currentUserSummaryEl.innerHTML = '';
    }

    // Query for participating users only
    db.collection('users')
        .where('has_joined_tournament', '==', true)
        .orderBy('tournament_referral_count', 'desc')
        .limit(100) // Show top 100 in the list as requested
        .onSnapshot(snapshot => {
            let html = '';
            let currentUserData = null;
            const participatingUsers = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(data => (data.tournament_referral_count || 0) >= 0); 

            // 1. Find Current User and set the Rank
            participatingUsers.forEach((data, index) => {
                if (data.id === uid) {
                    currentUserData = {...data, rank: index + 1};
                }
            });

            // 2. Render Current User Summary (if in Modal and Joined)
            if (isModal && hasJoinedTournament && currentUserData) {
                const rankText = currentUserData.rank;
                const refCount = currentUserData.tournament_referral_count || 0;
                
                // Construct the summary HTML for the dedicated section
                currentUserSummaryEl.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div style="display:flex; align-items:center;">
                            <span class="ref-rank-badge rank-other" style="min-width: 30px; height: 30px; font-size: 0.9rem; background: #667eea; color: white; margin-right: 10px; border-radius: 8px; box-shadow:none;">${rankText}</span>
                            <span>${userFullName} (You)</span>
                        </div>
                        <div class="ref-count-pill" style="background:#3498db; font-size: 0.9rem; min-width: 80px;">${refCount} Referrals</div>
                    </div>
                `;
                currentUserSummaryEl.style.display = 'block';
            }


            if (participatingUsers.length === 0) {
                html = `<div style="text-align:center; padding: 40px; color: #999;"><i class="fas fa-box-open fa-2x"></i><p>No users have joined the tournament yet.</p></div>`;
            } else {
                 participatingUsers.forEach((data, index) => {
                      const rank = index + 1;
                      const fullName = data.full_name || data.username || 'Unknown User'; 
                      // Only show tournament-specific count
                      const referralCount = data.tournament_referral_count || 0; 
                      
                      let rankBadgeHtml = ''; let rankText = rank; let badgeClass = 'rank-other';
                      if (rank === 1) { rankBadgeHtml = `<i class="fas fa-crown"></i>`; badgeClass = 'rank-1'; rankText = ''; } 
                      else if (rank === 2) { rankBadgeHtml = `<i class="fas fa-star"></i>`; badgeClass = 'rank-2'; rankText = ''; } 
                      else if (rank === 3) { rankBadgeHtml = `<i class="fas fa-medal"></i>`; badgeClass = 'rank-3'; rankText = ''; }
                      
                      const isCurrentUser = data.id === uid;
                      // Highlight logic is now only for the list items, but we prioritize the summary bar
                      const itemClass = isCurrentUser && !isModal ? 'top-ref-item active-user-highlight' : 'top-ref-item'; // Only highlight in the main list, not in modal if summary is present.
                      
                      // Custom rendering for the modal list as requested
                      const rankContainerHtml = isModal && rank > 3 ? 
                            `<div class="ref-rank-badge rank-other" style="background:#f0f2f5; color:#777; font-size:1rem; box-shadow:none; border-radius: 8px; min-width: 40px; height: 40px;">${rank}</div>` : 
                            `<div class="ref-rank-badge ${badgeClass}">${rankBadgeHtml || rankText}</div>`;


                      html += `
                        <div class="${itemClass}">
                            ${rankContainerHtml}
                            <div class="ref-info"><h4>${fullName}${isCurrentUser ? ' (You)' : ''}</h4><p>Tournament Referrals: ${referralCount}</p></div>
                            <div class="ref-count-pill" style="background:#3498db;">${referralCount}</div>
                        </div>`;
                 });
            }
            container.innerHTML = html;
        });
}


// MODIFIED: startTournamentCountdown to update every 1 second
function startTournamentCountdown(endTime, displayId) {
    if (tournamentCountdownInterval) clearInterval(tournamentCountdownInterval); 
    const displayEl = document.getElementById(displayId);

    // Initial call to set the display immediately
    updateCountdownDisplay(endTime, displayEl);

    tournamentCountdownInterval = setInterval(() => {
        updateCountdownDisplay(endTime, displayEl);
    }, 1000); // Updated to 1000ms (1 second)
}

// MODIFIED: updateCountdownDisplay to include seconds
function updateCountdownDisplay(endTime, displayEl) {
    const now = Date.now();
    const remaining = endTime - now; 
    
    if (remaining <= 0) {
        clearInterval(tournamentCountdownInterval);
        isTournamentActive = false;
        document.getElementById('tournament-ui-container').style.display = 'none';
        // Hide the timer in the modal if it's open
        const modalCountdown = document.getElementById('tournListModalCountdown');
        if(modalCountdown) modalCountdown.style.display = 'none';
        
        // The logic to finalize ranks and set prizes is expected to run on the server (admin panel action).
        // We just trigger a re-render/check for the client.
        checkAndShowPrizeModal();
        renderLeaderboard(); 
        return;
    }

    const totalSeconds = Math.floor(remaining / 1000); // Use totalSeconds for accurate calculation
    const days = Math.floor(totalSeconds / (3600 * 24));
    const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60; // NEW: Calculate remaining seconds

    const display = `${days}D ${String(hours).padStart(2, '0')}H ${String(minutes).padStart(2, '0')}M ${String(seconds).padStart(2, '0')}S`; // NEW: Added Seconds
    displayEl.innerHTML = display;
}


function joinTournament() {
    if(hasJoinedTournament) return;
    document.getElementById('joinTournamentBtn').disabled = true;
    document.getElementById('joinTournamentBtn').innerHTML = '<i class="fas fa-spinner fa-spin"></i> Joining...';

    userRef.update({
        has_joined_tournament: true,
        tournament_referral_count: 0 
    }).then(() => {
        hasJoinedTournament = true;
        hideJoinTournamentModal();
        Toast.fire({ icon: 'success', title: 'Tournament Joined! Good Luck!' });
        renderLeaderboard();
    }).catch(err => {
        Toast.fire({ icon: 'error', title: 'Failed to join: ' + err.message });
        document.getElementById('joinTournamentBtn').disabled = false;
        document.getElementById('joinTournamentBtn').innerHTML = 'Join Tournament!';
    });
}

function showRulesModal() {
    document.getElementById('tournamentRulesContent').innerHTML = settings.tournament_rules || 'No rules available yet.';
    document.getElementById('rulesModal').style.display = 'flex';
}
function hideRulesModal() {
    document.getElementById('rulesModal').style.display = 'none';
}

// --- PRIZE COLLECTION LOGIC ---

function getPrizeAmount(rank, prizeTiers) {
    if (rank === 1) return prizeTiers['1'] || 0;
    if (rank === 2) return prizeTiers['2'] || 0;
    if (rank === 3) return prizeTiers['3'] || 0;
    if (rank >= 4 && rank <= 10) return prizeTiers['4-10'] || 0;
    if (rank >= 11 && rank <= 20) return prizeTiers['11-20'] || 0;
    if (rank >= 21 && rank <= 50) return prizeTiers['21-50'] || 0;
    if (rank >= 51 && rank <= 100) return prizeTiers['51-100'] || 0;
    if (rank >= 101 && rank <= 500) return prizeTiers['101-500'] || 0;
    if (rank >= 501 && rank <= 1000) return prizeTiers['501-1000'] || 0;
    if (rank > 1000) return prizeTiers['1000+'] || 0;
    return 0;
}

function getRankRange(rank) {
    if (rank === 1) return '1';
    if (rank === 2) return '2';
    if (rank === 3) return '3';
    if (rank >= 4 && rank <= 10) return '4-10';
    if (rank >= 11 && rank <= 20) return '11-20';
    if (rank >= 21 && rank <= 50) return '21-50';
    if (rank >= 51 && rank <= 100) return '51-100';
    if (rank >= 101 && rank <= 500) return '101-500';
    if (rank >= 501 && rank <= 1000) return '501-1000';
    if (rank > 1000) return '1000+';
    return 'unranked';
}

function checkAndShowPrizeModal() {
    // The prize collection is triggered if the tournament is over (inactive), 
    // the user has a finalized rank (set by admin), and they haven't claimed the prize.
    if (window.userTournamentRank === null || window.hasClaimedPrize || isTournamentActive) return; 
    
    // Unblock screen
    if(document.getElementById('statusModal').style.display !== 'none') {
        document.getElementById('statusModal').style.display = 'none';
    }
    document.body.classList.add('modal-active');
    
    const rank = window.userTournamentRank;
    const prizeAmount = getPrizeAmount(rank, settings.tournament_prizes);
    
    // Check if prize amount is > 0. If rank is set, but prize is 0 (e.g., outside defined tiers), mark claimed.
    if (prizeAmount <= 0) {
        // Did not rank for a prize or prize amount is 0. Mark as claimed to prevent re-popup.
        userRef.update({ 'tournament_data.claimed_prize': true });
        document.body.classList.remove('modal-active');
        return;
    }

    const rankRange = getRankRange(rank);
    
    document.getElementById('prizeModalTitle').innerText = settings.prize_popup_title;
    let desc = settings.prize_popup_desc.replace('{{rank_range}}', rankRange);
    desc = desc.replace('{{prize_amount}}', prizeAmount);
    document.getElementById('prizeModalDesc').innerText = desc;
    document.getElementById('prizePopupAmount').innerText = `+${prizeAmount} Coins`;
    document.getElementById('prizeCollectBtn').innerText = settings.prize_popup_btn_text;

    document.getElementById('prizeCollectBtn').onclick = () => claimTournamentPrize(prizeAmount);
    document.getElementById('prizeCollectModal').style.display = 'flex';
}

function claimTournamentPrize(amount) {
    document.getElementById('prizeCollectBtn').disabled = true;
    document.getElementById('prizeCollectBtn').innerHTML = '<i class="fas fa-spinner fa-spin"></i> Collecting...';
    
    let newBalance = currentBalance + amount; 
    animateBalance(currentBalance, newBalance);

    userRef.update({
        balance: firebase.firestore.FieldValue.increment(amount),
        'tournament_data.claimed_prize': true,
        last_activity: Date.now()
    }).then(() => {
        window.hasClaimedPrize = true;
        document.getElementById('prizeCollectModal').style.display = 'none';
        document.body.classList.remove('modal-active');
        Toast.fire({ icon: 'success', title: `Collected ${amount} Coins!` });
    }).catch(err => {
        console.error("Prize claim failed:", err);
        Toast.fire({ icon: 'error', title: 'Collection failed: ' + err.message });
        document.getElementById('prizeCollectBtn').disabled = false;
        document.getElementById('prizeCollectBtn').innerHTML = settings.prize_popup_btn_text;
    });
}

// --- END NEW: LEADERBOARD & TOURNAMENT LOGIC ---


function switchTab(id, el) {
    if (!isBotVerified && isEntryViaReferral) return; 
    
    // Deactivate all sections and nav items
    document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active-section')); 
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active')); 
    
    // Activate the target section and nav item
    document.getElementById(id+'-section').classList.add('active-section'); 
    
    // Find the correct nav item to activate (handling click events)
    // In this revised simple setup, 'el' is the clicked div.
    el.classList.add('active');
    
    window.scrollTo(0,0); 
    updateUserActivity(); 

    // Render content for the newly activated section
    if (id === 'invite') { 
        activeRefPage = 1; completedRefPage = 1; renderReferrals(activeRefPage); 
    } else if (id === 'topref') { 
        renderLeaderboard(); 
    } else if (id === 'tasks') {
        renderTasks();
    }
}

// Initial tab setting: Set 'home' as active on load
document.addEventListener('DOMContentLoaded', () => {
    // 1. Deactivate all sections and set 'home-section' as active
    document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active-section'));
    document.getElementById('home-section').classList.add('active-section');

    // 2. Deactivate all nav-items and set the 'home' nav-item as active
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    const homeNavItem = document.querySelector(`.bottom-nav .nav-item[onclick*="'home'"]`);
    if (homeNavItem) {
        homeNavItem.classList.add('active');
    }
});


function copyLink(btn) { navigator.clipboard.writeText(document.getElementById('refLink').innerText).then(() => { let old = btn.innerHTML; btn.innerHTML = '<i class="fas fa-check"></i> Copied!'; btn.style.background = '#4caf50'; setTimeout(() => { btn.innerHTML = old; btn.style.background = '#333'; }, 1000); }); }
function animateBalance(start, end) { let current = start, step = Math.ceil((end - start) / 10); const timer = setInterval(() => { current += step; if (current >= end) { current = end; clearInterval(timer); } document.getElementById('balance').innerText = current; }, 30); }
