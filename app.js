/* ==========================================================================
   STATE MANAGEMENT & CONSTANTS
   ========================================================================== */
const DEFAULT_STATE = {
  auth: {
    loggedIn: false,
    username: ""
  },
  profile: {
    firstName: "Herminio",
    lastName: "Gonzalez",
    phone: "+1 (843) 256-3921",
    email: "hermy..2287@gmail.com"
  },
  accounts: {
    checking: 1300000.75,
    savings: 250000.00
  },
  card: {
    number: "4815 1623 4264 2287",
    expiry: "09/29",
    cvv: "828",
    locked: false,
    limit: 5000,
    pin: "1234",
    revealed: false
  },
  transactions: [
    {
      id: "TXN-827401928471",
      title: "Direct Deposit • Payroll",
      category: "payroll",
      date: getRelativeDateString(0, "11:32 AM"),
      rawDate: new Date().toISOString(),
      amount: 248920.50,
      type: "credit",
      balanceAfter: 1300000.75,
      account: "checking"
    },
    {
      id: "TXN-391827401928",
      title: "Transfer to Savings",
      category: "transfer",
      date: getRelativeDateString(1, "4:15 PM"),
      rawDate: new Date(Date.now() - 24*60*60*1000).toISOString(),
      amount: -50000.00,
      type: "debit",
      balanceAfter: 1051080.25,
      account: "checking"
    },
    {
      id: "TXN-102938475610",
      title: "ACH Deposit • Client Payment",
      category: "ach",
      date: "Jun 4 • 9:05 AM",
      rawDate: new Date("2026-06-04T08:05:00.000Z").toISOString(),
      amount: 85000.00,
      type: "credit",
      balanceAfter: 1101080.25,
      account: "checking"
    },
    {
      id: "TXN-582910293847",
      title: "Card Purchase • Amazon",
      category: "card",
      date: "Jun 3 • 2:22 PM",
      rawDate: new Date("2026-06-03T13:22:00.000Z").toISOString(),
      amount: -1299.99,
      type: "debit",
      balanceAfter: 1016080.25,
      account: "checking"
    }
  ],
  darkMode: false
};

let appState = {};
// Configurable delay for ACH clearance simulation (milliseconds)
const ACH_CLEAR_DELAY_MS = 3000;

// Helper: Generate structured date labels relative to current date
function getRelativeDateString(daysAgo, timeStr) {
  if (daysAgo === 0) return `Today • ${timeStr}`;
  if (daysAgo === 1) return `Yesterday • ${timeStr}`;
  
  const d = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[d.getMonth()]} ${d.getDate()} • ${timeStr}`;
}

// Format number into USD currency structure
function formatUSD(value) {
  const isNegative = value < 0;
  const absValue = Math.abs(value);
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(absValue);
  return isNegative ? `-${formatted}` : formatted;
}

// Save/Load state functions
function saveStateToStorage() {
  localStorage.setItem('boa_clone_state_desktop', JSON.stringify(appState));
}

function loadStateFromStorage() {
  const saved = localStorage.getItem('boa_clone_state_desktop');
  if (saved) {
    try {
      appState = JSON.parse(saved);
    } catch (e) {
      appState = JSON.parse(JSON.stringify(DEFAULT_STATE));
    }
  } else {
    appState = JSON.parse(JSON.stringify(DEFAULT_STATE));
  }
}

/* ==========================================================================
   INITIALIZATION AND RENDERING
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  loadStateFromStorage();
  applyAuthState();
  applyTheme();
  renderAll();
  setupEventListeners();
  initCardPhysics();
});

// Sync authentication visibility with body classes
function applyAuthState() {
  if (appState.auth && appState.auth.loggedIn) {
    document.body.classList.remove('logged-out');
    document.body.classList.add('logged-in');
  } else {
    document.body.classList.remove('logged-in');
    document.body.classList.add('logged-out');
  }
}

// Apply theme class based on state
function applyTheme() {
  if (appState.darkMode) {
    document.body.classList.add('dark-theme');
    const darkModeBtn = document.getElementById('btn-toggle-dark-mode');
    if (darkModeBtn) darkModeBtn.textContent = "Light Mode";
  } else {
    document.body.classList.remove('dark-theme');
    const darkModeBtn = document.getElementById('btn-toggle-dark-mode');
    if (darkModeBtn) darkModeBtn.textContent = "Dark Mode";
  }
}

// Render dynamic state elements across views
function renderAll() {
  const { profile, accounts, card, transactions, auth } = appState;
  const initials = (profile.firstName[0] || "") + (profile.lastName[0] || "");
  const fullName = `${profile.firstName} ${profile.lastName}`;

  // Update Ribbon Authentication Name
  const ribUserName = document.getElementById('ribbon-username');
  if (ribUserName) ribUserName.textContent = fullName;

  // Update Greetings Header
  const welcomeName = document.getElementById('welcome-name');
  if (welcomeName) welcomeName.textContent = profile.firstName;

  // Update avatar and sideboards initials/names
  const avatarEl = document.getElementById('profile-avatar-letters');
  if (avatarEl) avatarEl.textContent = initials;
  
  const editAvatarEl = document.getElementById('profile-edit-avatar');
  if (editAvatarEl) editAvatarEl.textContent = initials;

  const displayNameEl = document.getElementById('profile-display-name');
  if (displayNameEl) displayNameEl.textContent = fullName;

  const displayPhoneEl = document.getElementById('profile-display-phone');
  if (displayPhoneEl) displayPhoneEl.textContent = profile.phone;

  const displayEmailEl = document.getElementById('profile-display-email');
  if (displayEmailEl) displayEmailEl.textContent = profile.email;

  // Update accounts dashboard balances
  const chAvail = document.getElementById('home-checking-avail');
  const chCurr = document.getElementById('home-checking-current');
  const svAvail = document.getElementById('home-savings-avail');
  const svCurr = document.getElementById('home-savings-current');

  if (chAvail) chAvail.textContent = formatUSD(accounts.checking);
  if (chCurr) chCurr.textContent = formatUSD(accounts.checking);
  if (svAvail) svAvail.textContent = formatUSD(accounts.savings);
  if (svCurr) svCurr.textContent = formatUSD(accounts.savings);

  // Calculate and update checking trend display (using payroll transaction as the trend indicator)
  const payrollTx = transactions.find(t => t.category === 'payroll');
  const trendAmount = payrollTx ? payrollTx.amount : 248920.50;
  const trendEl = document.getElementById('display-trend-amount');
  if (trendEl) trendEl.textContent = `+ ${formatUSD(trendAmount)}`;

  // Update sidebar card lock status
  const sidebarCardStatus = document.getElementById('sidebar-card-status');
  if (sidebarCardStatus) {
    sidebarCardStatus.textContent = card.locked ? "LOCKED" : "Active";
    sidebarCardStatus.className = card.locked ? "red-dot" : "";
    const dot = sidebarCardStatus.previousElementSibling;
    if (dot) {
      dot.className = card.locked ? "status-dot red-dot" : "status-dot green-dot";
    }
  }

  // Update profile inputs
  const fNameIn = document.getElementById('profile-first-name');
  const lNameIn = document.getElementById('profile-last-name');
  const phoneIn = document.getElementById('profile-phone');
  const emailIn = document.getElementById('profile-email');

  if (fNameIn) fNameIn.value = profile.firstName;
  if (lNameIn) lNameIn.value = profile.lastName;
  if (phoneIn) phoneIn.value = profile.phone;
  if (emailIn) emailIn.value = profile.email;

  // Update Transfer selector balance display details
  const checkingOption = document.querySelector('#transfer-from-select option[value="checking"]');
  const savingsOption = document.querySelector('#transfer-from-select option[value="savings"]');
  if (checkingOption) checkingOption.textContent = `Checking (•••• 2287) - ${formatUSD(accounts.checking)}`;
  if (savingsOption) savingsOption.textContent = `Savings (•••• 5821) - ${formatUSD(accounts.savings)}`;

  // Cards layout rendering
  const cardEl = document.getElementById('physical-card');
  const cardNumVal = document.getElementById('card-num-val');
  const cardCvvVal = document.getElementById('card-cvv-val');
  const cardHolderVal = document.getElementById('card-holder-val');
  const cardExpiryVal = document.getElementById('card-expiry-val');

  if (cardHolderVal) cardHolderVal.textContent = fullName.toUpperCase();
  if (cardExpiryVal) cardExpiryVal.textContent = card.expiry;

  if (cardNumVal && cardCvvVal) {
    if (card.revealed) {
      cardNumVal.textContent = card.number;
      cardCvvVal.textContent = card.cvv;
      document.getElementById('btn-reveal-card').textContent = "Hide credentials";
    } else {
      cardNumVal.textContent = "•••• •••• •••• " + card.number.split(' ').pop();
      cardCvvVal.textContent = "•••";
      document.getElementById('btn-reveal-card').textContent = "Reveal";
    }
  }

  // Card Freeze status
  const cardLockCheck = document.getElementById('card-lock-checkbox');
  if (cardLockCheck) cardLockCheck.checked = card.locked;
  if (cardEl) {
    if (card.locked) cardEl.classList.add('card-locked');
    else cardEl.classList.remove('card-locked');
  }

  // Card spend limit slider
  const limitRange = document.getElementById('card-limit-range');
  const limitVal = document.getElementById('card-limit-val');
  if (limitRange) limitRange.value = card.limit;
  if (limitVal) limitVal.textContent = formatUSD(card.limit);

  // Render recent activity transactions in the table view
  renderTransactionsTable(transactions);
}

// Render transactions into the main desktop portal table
function renderTransactionsTable(txs, filterText = '', filterCategory = '') {
  const tableBody = document.getElementById('transactions-table-body');
  if (!tableBody) return;

  tableBody.innerHTML = '';

  const filtered = txs.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(filterText.toLowerCase()) ||
                          formatUSD(t.amount).includes(filterText) ||
                          t.date.toLowerCase().includes(filterText.toLowerCase());
    const matchesCategory = filterCategory === '' || t.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  if (filtered.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 32px; color: var(--text-secondary);">
          No transactions match the filter criteria.
        </td>
      </tr>
    `;
    return;
  }

  filtered.forEach(tx => {
    const tr = document.createElement('tr');
    tr.className = 'account-row-link';
    tr.dataset.txnId = tx.id;

    let amtClass = 'amt-minus';
    let amtPrefix = '';
    if (tx.type === 'credit') {
      amtClass = 'amt-plus';
      amtPrefix = '+';
    } else if (tx.category === 'card' || tx.amount < 0) {
      amtClass = 'amt-debit';
    }

    const categoryLabels = {
      payroll: "Payroll Deposit",
      transfer: "Account Transfer",
      ach: "ACH & Electronic Transfer",
      card: "Card Purchase",
      check: "Deposit",
      cash: "Cash Deposit"
    };

    const methodIcons = {
      payroll: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"></circle><path d="M12 8v8"></path><path d="M8 12h8"></path></svg>`,
      ach: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h18"/><path d="M3 6h18"/></svg>`,
      check: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>`,
      cash: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/></svg>`,
      card: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"/></svg>`
    };

    const iconSvg = methodIcons[tx.category] || '';
    const statusText = tx.status === 'pending' ? 'Pending' : 'Completed';
    const statusClass = tx.status === 'pending' ? 'status-pending' : 'status-completed';

    tr.innerHTML = `
      <td>${tx.date}</td>
      <td style="font-weight: 700;"><span class="tx-icon" style="margin-right:8px;vertical-align:middle">${iconSvg}</span>${escapeHTML(tx.title)} <span class="tx-status ${statusClass}" style="margin-left:8px;font-weight:600;font-size:12px">${statusText}</span></td>
      <td><span class="cat-badge cat-${tx.category}">${categoryLabels[tx.category] || tx.category}</span></td>
      <td>${tx.account.charAt(0).toUpperCase() + tx.account.slice(1)} (•••• 2287)</td>
      <td class="text-right txn-amount-td ${amtClass}">${amtPrefix}${formatUSD(tx.amount)}</td>
      <td class="text-right bold-amount">${formatUSD(tx.balanceAfter)}</td>
    `;

    // Click handler to open receipt overlay modal
    tr.addEventListener('click', () => {
      showTransactionReceipt(tx);
    });

    tableBody.appendChild(tr);
  });
}

// Utility: Prevent XSS
function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

/* ==========================================================================
   EVENT HANDLERS & ROUTING
   ========================================================================== */
function setupEventListeners() {
  
  /* LOGIN FORM HANDLER */
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const usernameInput = document.getElementById('login-username').value.trim();
      const passwordInput = document.getElementById('login-password').value;
      const errMsgEl = document.getElementById('login-err-msg');

      if (!usernameInput || !passwordInput) {
        errMsgEl.textContent = "Please fill in all authorization fields.";
        errMsgEl.style.display = 'block';
        return;
      }

      // Simulation check: Let user log in with correct details. E.g. herminio or any name.
      triggerProcessingOverlay("Verifying Online Credentials", "Securing connection to Bank of America auth nodes...", 1200, () => {
        appState.auth.loggedIn = true;
        
        // Capitalize entered username to display as first name if it is not default 'herminio'
        const lowerName = usernameInput.toLowerCase();
        if (lowerName !== 'herminio') {
          appState.profile.firstName = usernameInput.charAt(0).toUpperCase() + usernameInput.slice(1);
          appState.profile.lastName = "User";
        } else {
          appState.profile.firstName = "Herminio";
          appState.profile.lastName = "Gonzalez";
        }

        appState.auth.username = usernameInput;
        saveStateToStorage();
        applyAuthState();
        renderAll();
        switchView('home');
        showToast("Signed in securely as Online Banking User.");
        
        // Clear login form fields
        loginForm.reset();
        errMsgEl.style.display = 'none';
      });
    });
  }

  /* LOGOUT BUTTON HANDLER */
  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      triggerProcessingOverlay("Terminating Online Session", "Closing secure credentials window...", 1000, () => {
        appState.auth.loggedIn = false;
        appState.auth.username = "";
        saveStateToStorage();
        applyAuthState();
        showToast("Logged out successfully.");
      });
    });
  }

  /* PORTAL NAV TABS SWITCHER */
  const navItems = document.querySelectorAll('.portal-nav-menu .nav-menu-item');
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetView = item.dataset.view;
      switchView(targetView);
    });
  });

  /* QUICK ACTIONS DASHBOARD ROUTING */
  const actionBtns = document.querySelectorAll('.quick-action-card');
  actionBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.target;
      if (target) {
        switchView(target);
      }
    });
  });

  /* DYNAMIC TRANSACTIONS SEARCH FILTERS */
  const searchInput = document.getElementById('transaction-search-desktop');
  const categorySelect = document.getElementById('filter-category-select');
  const clearFiltersBtn = document.getElementById('btn-clear-filters');

  if (searchInput && categorySelect) {
    const handleFiltersChange = () => {
      renderTransactionsTable(appState.transactions, searchInput.value, categorySelect.value);
    };

    searchInput.addEventListener('input', handleFiltersChange);
    categorySelect.addEventListener('change', handleFiltersChange);

    if (clearFiltersBtn) {
      clearFiltersBtn.addEventListener('click', () => {
        searchInput.value = '';
        categorySelect.value = '';
        renderTransactionsTable(appState.transactions);
        showToast("Transaction list filters cleared.");
      });
    }
  }

  /* DASHBOARD ACCOUNTS ROWS CLICK ROUTING */
  const checkingRow = document.querySelector('.account-row-link[data-account="checking"]');
  const savingsRow = document.querySelector('.account-row-link[data-account="savings"]');

  if (checkingRow) {
    checkingRow.addEventListener('click', () => {
      switchView('transactions');
      if (categorySelect) {
        categorySelect.value = '';
        categorySelect.dispatchEvent(new Event('change'));
      }
    });
  }
  if (savingsRow) {
    savingsRow.addEventListener('click', () => {
      switchView('transactions');
      if (searchInput) {
        searchInput.value = 'Savings';
        searchInput.dispatchEvent(new Event('input'));
      }
    });
  }

  /* FORM ACTION: Transfer Submit */
  const transferForm = document.getElementById('transfer-form');
  if (transferForm) {
    transferForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (appState.card.locked) {
        showToast("Operation Denied: Account Card is Locked.");
        return;
      }

      const fromAcc = document.getElementById('transfer-from-select').value;
      const toAcc = document.getElementById('transfer-to-select').value;
      const amount = parseFloat(document.getElementById('transfer-amount').value);
      const memo = document.getElementById('transfer-memo').value;

      let toName = "";
      if (toAcc === 'savings') toName = "Savings Account";
      else if (toAcc === 'checking') toName = "Checking Account";
      else if (toAcc === 'external-hg') toName = "Herminio Gonzalez (Personal Checking)";
      else if (toAcc === 'custom') {
        toName = document.getElementById('custom-recipient-name').value || "External Recipient";
      }

      // Validations
      const fromBalance = appState.accounts[fromAcc];
      if (amount <= 0) {
        showInputError('transfer-amount', "Please enter a valid positive amount");
        return;
      }
      if (amount > fromBalance) {
        showInputError('transfer-amount', `Insufficient funds. Available: ${formatUSD(fromBalance)}`);
        return;
      }
      if (fromAcc === toAcc) {
        showInputError('transfer-amount', "Source and destination accounts must be different");
        return;
      }

      clearInputError('transfer-amount');

      triggerProcessingOverlay("Authorizing Transfer", "Communicating securely with bank transaction node...", 1600, () => {
        // Execute math balance adjustments
        appState.accounts[fromAcc] -= amount;
        if (toAcc === 'savings' || toAcc === 'checking') {
          appState.accounts[toAcc] += amount;
        }

        // Add to transactions log
        const newTx = {
          id: `TXN-${Math.floor(100000000000 + Math.random() * 900000000000)}`,
          title: `Transfer to ${toName}`,
          category: "transfer",
          date: getRelativeDateString(0, getCurrentTimeFormatted()),
          rawDate: new Date().toISOString(),
          amount: -amount,
          type: "debit",
          balanceAfter: appState.accounts.checking,
          account: fromAcc
        };

        appState.transactions.unshift(newTx);
        saveStateToStorage();
        renderAll();
        switchView('home');
        showToast(`Transferred ${formatUSD(amount)} successfully!`);

        transferForm.reset();
        document.getElementById('custom-recipient-group').classList.add('hidden-field');
      });
    });

    document.getElementById('transfer-to-select').addEventListener('change', (e) => {
      const customGroup = document.getElementById('custom-recipient-group');
      if (e.target.value === 'custom') {
        customGroup.classList.remove('hidden-field');
        document.getElementById('custom-recipient-name').setAttribute('required', 'true');
      } else {
        customGroup.classList.add('hidden-field');
        document.getElementById('custom-recipient-name').removeAttribute('required');
      }
    });
  }

  /* FORM ACTION: Deposit Submit */
  const depositForm = document.getElementById('deposit-form');
  if (depositForm) {
    depositForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const targetAcc = document.getElementById('deposit-to-select').value;
      const amount = parseFloat(document.getElementById('deposit-amount').value);
      const method = (document.getElementById('deposit-method-select') || {}).value || 'check';

      if (amount <= 0) {
        showToast("Please enter a valid deposit amount.");
        return;
      }

      if (method === 'check') {
        // existing simulated check flow
        let currentStep = 0;
        const steps = [
          { title: "Uploading Scans", desc: "Sending check digital images to security server..." },
          { title: "AI Image Verification", desc: "Matching routing digits and check value lines..." },
          { title: "Signatures Verification", desc: "Checking backing endorsements endorsement status..." },
          { title: "Finalizing Credits", desc: "Clearing check logs and updating account balance..." }
        ];

        const overlay = document.getElementById('global-processing-overlay');
        const titleEl = document.getElementById('processing-title');
        const descEl = document.getElementById('processing-desc');

        overlay.classList.add('active');

        function runNextStep() {
          if (currentStep < steps.length) {
            titleEl.textContent = steps[currentStep].title;
            descEl.textContent = steps[currentStep].desc;
            currentStep++;
            setTimeout(runNextStep, 800);
          } else {
            overlay.classList.remove('active');
            appState.accounts[targetAcc] += amount;

            const newTx = {
              id: `TXN-${Math.floor(100000000000 + Math.random() * 900000000000)}`,
              title: "Deposit",
              category: "check",
              date: getRelativeDateString(0, getCurrentTimeFormatted()),
              rawDate: new Date().toISOString(),
              amount: amount,
              type: "credit",
              status: 'completed',
              balanceAfter: appState.accounts[targetAcc],
              account: targetAcc
            };

            appState.transactions.unshift(newTx);
            saveStateToStorage();
            renderAll();
            switchView('home');
            showToast(`Deposit of ${formatUSD(amount)} has been cleared.`);

            depositForm.reset();
            resetCheckUploadBoxes();
          }
        }
        runNextStep();
      } else if (method === 'ach') {
        // ACH: create a pending transaction, simulate clearance after a short delay
        const now = new Date();
        const availDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // +3 days
        const availStr = availDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

        const pendingTx = {
          id: `TXN-${Math.floor(100000000000 + Math.random() * 900000000000)}`,
          title: "ACH Deposit",
          category: "ach",
          date: getRelativeDateString(0, getCurrentTimeFormatted()),
          rawDate: new Date().toISOString(),
          amount: amount,
          type: "credit",
          status: 'pending',
          availableDate: availStr,
          balanceAfter: appState.accounts[targetAcc],
          account: targetAcc
        };

        appState.transactions.unshift(pendingTx);
        saveStateToStorage();
        renderAll();
        switchView('home');
        showToast(`ACH deposit of ${formatUSD(amount)} is pending and will be available on ${availStr}.`);

        // Simulate clearance after a short timeout (e.g., 3s -> 3 days in real world)
        setTimeout(() => {
          appState.accounts[targetAcc] += amount;
          // find tx and mark complete
          const tx = appState.transactions.find(t => t.id === pendingTx.id);
          if (tx) {
            tx.status = 'completed';
            tx.balanceAfter = appState.accounts[targetAcc];
          }
          saveStateToStorage();
          renderAll();
          showToast(`ACH deposit of ${formatUSD(amount)} has cleared.`);
        }, ACH_CLEAR_DELAY_MS);

        depositForm.reset();
      } else {
        // Cash deposit: immediate credit
        triggerProcessingOverlay('Processing Cash Deposit', 'Finalizing in-branch cash deposit...', 800, () => {
          appState.accounts[targetAcc] += amount;

          const newTx = {
            id: `TXN-${Math.floor(100000000000 + Math.random() * 900000000000)}`,
            title: "Cash Deposit",
            category: "cash",
            date: getRelativeDateString(0, getCurrentTimeFormatted()),
            rawDate: new Date().toISOString(),
            amount: amount,
            type: "credit",
            status: 'completed',
            balanceAfter: appState.accounts[targetAcc],
            account: targetAcc
          };

          appState.transactions.unshift(newTx);
          saveStateToStorage();
          renderAll();
          switchView('home');
          showToast(`Cash deposit of ${formatUSD(amount)} completed.`);

          depositForm.reset();
        });
      }
    });

    setupCheckUploadListeners();
  }

  /* CARD INTERACTIVITY: Reveal Credentials */
  const revealBtn = document.getElementById('btn-reveal-card');
  if (revealBtn) {
    revealBtn.addEventListener('click', () => {
      appState.card.revealed = !appState.card.revealed;
      renderAll();
    });
  }

  /* CARD INTERACTIVITY: Lock Card Checkbox */
  const cardLockCheck = document.getElementById('card-lock-checkbox');
  if (cardLockCheck) {
    cardLockCheck.addEventListener('change', (e) => {
      appState.card.locked = e.target.checked;
      saveStateToStorage();
      renderAll();
      if (appState.card.locked) {
        showToast("Card frozen successfully. All payments are blocked.");
      } else {
        showToast("Card unfrozen successfully.");
      }
    });
  }

  /* CARD INTERACTIVITY: Spending Limit Slider */
  const limitRange = document.getElementById('card-limit-range');
  if (limitRange) {
    limitRange.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      document.getElementById('card-limit-val').textContent = formatUSD(val);
    });

    limitRange.addEventListener('change', (e) => {
      appState.card.limit = parseInt(e.target.value);
      saveStateToStorage();
      showToast(`Daily credit spend limit updated to ${formatUSD(appState.card.limit)}`);
    });
  }

  /* CARD INTERACTIVITY: Save PIN */
  const changePinBtn = document.getElementById('btn-change-pin');
  if (changePinBtn) {
    changePinBtn.addEventListener('click', () => {
      const pinNew = document.getElementById('pin-new').value;
      const pinConf = document.getElementById('pin-confirm').value;
      const msgEl = document.getElementById('pin-status-message');

      if (pinNew.length !== 4 || pinConf.length !== 4 || isNaN(pinNew) || isNaN(pinConf)) {
        msgEl.textContent = "Error: PIN must be exactly 4 digits.";
        msgEl.style.color = "var(--danger)";
        return;
      }

      if (pinNew !== pinConf) {
        msgEl.textContent = "Error: Passcodes do not match.";
        msgEl.style.color = "var(--danger)";
        return;
      }

      appState.card.pin = pinNew;
      saveStateToStorage();
      msgEl.textContent = "Passcode PIN changed successfully!";
      msgEl.style.color = "var(--success)";

      document.getElementById('pin-new').value = '';
      document.getElementById('pin-confirm').value = '';
      setTimeout(() => { msgEl.textContent = ''; }, 3000);
    });
  }

  /* PROFILE SETTINGS: Save Contact Form */
  const profileForm = document.getElementById('profile-form');
  if (profileForm) {
    profileForm.addEventListener('submit', (e) => {
      e.preventDefault();
      appState.profile.firstName = document.getElementById('profile-first-name').value;
      appState.profile.lastName = document.getElementById('profile-last-name').value;
      appState.profile.phone = document.getElementById('profile-phone').value;
      appState.profile.email = document.getElementById('profile-email').value;

      saveStateToStorage();
      renderAll();
      showToast("Profile contact info saved successfully.");
      switchView('home');
    });
  }

  /* PROFILE SETTINGS: Toggle Theme */
  const themeBtn = document.getElementById('btn-toggle-dark-mode');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      appState.darkMode = !appState.darkMode;
      saveStateToStorage();
      applyTheme();
      showToast(`Theme changed to ${appState.darkMode ? 'Dark' : 'Light'} Mode.`);
    });
  }

  /* MODAL RECEIPT CLOSE */
  const closeReceiptBtn = document.getElementById('btn-close-receipt');
  if (closeReceiptBtn) {
    closeReceiptBtn.addEventListener('click', hideReceiptModal);
  }
  
  const receiptOverlay = document.getElementById('receipt-modal-overlay');
  if (receiptOverlay) {
    receiptOverlay.addEventListener('click', (e) => {
      if (e.target.id === 'receipt-modal-overlay') hideReceiptModal();
    });
  }

  const printReceiptBtn = document.getElementById('btn-print-receipt');
  if (printReceiptBtn) {
    printReceiptBtn.addEventListener('click', () => {
      alert("Transferring receipt layout to printer nodes...");
    });
  }
}

// Router to slide/fade portal active section views
function switchView(viewName) {
  const views = document.querySelectorAll('.portal-main-content .portal-view');
  const navTabs = document.querySelectorAll('.portal-nav-menu .nav-menu-item');

  // Update navbar items active indicators
  navTabs.forEach(tab => {
    if (tab.dataset.view === viewName) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });

  const currentActive = document.querySelector('.portal-main-content .portal-view.active');
  const targetView = document.getElementById(`view-${viewName}`);

  if (!targetView) return;

  if (currentActive && currentActive.id !== `view-${viewName}`) {
    currentActive.style.opacity = '0';
    currentActive.style.transform = 'translateY(10px)';
    
    setTimeout(() => {
      currentActive.classList.remove('active');
      targetView.classList.add('active');
      
      targetView.offsetWidth; // Force reflow
      
      targetView.style.opacity = '1';
      targetView.style.transform = 'translateY(0)';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 200);
  } else if (!currentActive) {
    targetView.classList.add('active');
    targetView.style.opacity = '1';
    targetView.style.transform = 'translateY(0)';
  }
}

/* ==========================================================================
   INTERACTIVE RECEIPT MODAL & NOTIFICATIONS
   ========================================================================== */

// Helper to get present HH:MM AM/PM structure
function getCurrentTimeFormatted() {
  const now = new Date();
  let hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${ampm}`;
}

// Show validation field error messages
function showInputError(inputId, msg) {
  const el = document.getElementById(`${inputId}-error`);
  if (el) el.textContent = msg;
}

function clearInputError(inputId) {
  const el = document.getElementById(`${inputId}-error`);
  if (el) el.textContent = '';
}

// Display receipt detailed overlay
function showTransactionReceipt(tx) {
  const overlay = document.getElementById('receipt-modal-overlay');
  const iconBox = document.getElementById('receipt-icon-box');
  
  if (!overlay || !iconBox) return;

  // Set Icon matching list style
  let iconBgClass = 'transfer-bg';
  let iconSvg = '';
  if (tx.category === 'payroll' || tx.type === 'credit') {
    iconBgClass = 'deposit-bg';
    iconSvg = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>`;
  } else if (tx.category === 'card') {
    iconBgClass = 'pay-bg';
    iconSvg = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="2" y="5" width="20" height="14" rx="2" ry="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>`;
  } else {
    iconBgClass = 'transfer-bg';
    iconSvg = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>`;
  }

  iconBox.className = `receipt-icon-wrapper ${iconBgClass}`;
  iconBox.innerHTML = iconSvg;

  // Set amounts
  const amountPrefix = tx.type === 'credit' ? '+' : '';
  const amountVal = document.getElementById('receipt-amount-val');
  if (amountVal) {
    amountVal.textContent = `${amountPrefix}${formatUSD(tx.amount)}`;
    amountVal.className = `receipt-amount ${tx.type === 'credit' ? 'amt-plus' : 'amt-debit'}`;
  }

  // Populate data
  document.getElementById('receipt-title').textContent = tx.title;
  document.getElementById('receipt-date-val').textContent = tx.date;
  document.getElementById('receipt-id-val').textContent = tx.id;
  document.getElementById('receipt-account-val').textContent = `${tx.account.charAt(0).toUpperCase() + tx.account.slice(1)} Account (•••• 2287)`;
  document.getElementById('receipt-balance-val').textContent = formatUSD(tx.balanceAfter);

  // Status badge (pending/completed) and availability
  const statusBadge = document.querySelector('.receipt-badge');
  if (statusBadge) {
    if (tx.status === 'pending') {
      const availText = tx.availableDate ? ` · Available ${tx.availableDate}` : '';
      statusBadge.textContent = `Pending${availText}`;
      statusBadge.className = 'receipt-badge status-pending';
    } else {
      statusBadge.textContent = 'Completed';
      statusBadge.className = 'receipt-badge status-completed';
    }
  }

  overlay.style.display = 'flex';
  setTimeout(() => { overlay.classList.add('active'); }, 10);
}

function hideReceiptModal() {
  const overlay = document.getElementById('receipt-modal-overlay');
  if (overlay) {
    overlay.classList.remove('active');
    setTimeout(() => { overlay.style.display = 'none'; }, 300);
  }
}

// Processing spinner screen controller
function triggerProcessingOverlay(title, desc, duration, onComplete) {
  const overlay = document.getElementById('global-processing-overlay');
  const titleEl = document.getElementById('processing-title');
  const descEl = document.getElementById('processing-desc');

  if (!overlay) return;

  if (titleEl) titleEl.textContent = title;
  if (descEl) descEl.textContent = desc;

  overlay.classList.add('active');
  setTimeout(() => {
    overlay.classList.remove('active');
    if (onComplete) onComplete();
  }, duration);
}

// Custom Toast notification banner
let toastTimeout;
function showToast(msg) {
  const toast = document.getElementById('global-toast');
  const msgVal = document.getElementById('toast-message-val');
  
  if (!toast || !msgVal) return;

  msgVal.textContent = msg;

  clearTimeout(toastTimeout);
  toast.classList.add('active');

  toastTimeout = setTimeout(() => {
    toast.classList.remove('active');
  }, 3000);
}

/* ==========================================================================
   UI MOCK SIMULATORS
   ========================================================================== */

// Check Drag/Drop file input events
function setupCheckUploadListeners() {
  const frontInput = document.getElementById('check-front-input');
  const backInput = document.getElementById('check-back-input');

  if (frontInput) frontInput.addEventListener('change', (e) => handleCheckUpload(e, 'front'));
  if (backInput) backInput.addEventListener('change', (e) => handleCheckUpload(e, 'back'));

  // Canvas clicks simulate capture if inputs empty
  const frontBox = document.getElementById('check-front-box');
  const backBox = document.getElementById('check-back-box');

  if (frontBox) {
    frontBox.addEventListener('click', (e) => {
      if (e.target.type !== 'file') simulateCheckImage('front');
    });
  }
  if (backBox) {
    backBox.addEventListener('click', (e) => {
      if (e.target.type !== 'file') simulateCheckImage('back');
    });
  }
}

function handleCheckUpload(e, face) {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(event) {
      const box = document.getElementById(`check-${face}-box`);
      const preview = box.querySelector('.upload-preview');
      const placeholder = box.querySelector('.upload-placeholder');

      preview.style.backgroundImage = `url(${event.target.result})`;
      preview.classList.remove('hidden');
      placeholder.classList.add('hidden');
    };
    reader.readAsDataURL(file);
  }
}

// Draw a mock Canvas representation of check to simulate scanning visual feedback
function simulateCheckImage(face) {
  const box = document.getElementById(`check-${face}-box`);
  if (!box) return;

  const preview = box.querySelector('.upload-preview');
  const placeholder = box.querySelector('.upload-placeholder');

  const canvas = document.createElement('canvas');
  canvas.width = 300;
  canvas.height = 120;
  const ctx = canvas.getContext('2d');

  // Check background
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 300, 120);
  
  // Security borders
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, 292, 112);

  // Micro print check details
  ctx.fillStyle = '#64748b';
  ctx.font = '10px monospace';
  ctx.fillText("BANK OF AMERICA SECURITY CHECK", 14, 24);
  
  ctx.font = '8px Courier New';
  ctx.fillText("Memo: Mobile Deposit", 14, 100);
  ctx.fillText("⑆123456789⑆ 987654321⑈ 2287", 60, 100);

  if (face === 'front') {
    // Check Value fields
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText("Herminio Gonzalez", 14, 45);
    
    ctx.font = '14px sans-serif';
    ctx.fillText("$  [ Amount Entered ]", 170, 45);

    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(14, 75);
    ctx.lineTo(286, 75);
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.font = 'italic 10px sans-serif';
    ctx.fillText("Authorized Signature", 180, 88);
  } else {
    // Endorsement line
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(40, 20);
    ctx.lineTo(40, 100);
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.font = '9px sans-serif';
    
    // Rotate text vertical
    ctx.save();
    ctx.translate(32, 60);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("ENDORSE HERE", -35, 0);
    ctx.restore();

    ctx.font = 'italic 11px Courier New';
    ctx.fillStyle = '#1e3a8a';
    ctx.save();
    ctx.translate(52, 60);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("Herminio Gonzalez", -45, 0);
    ctx.fillText("For Mobile Deposit Only", -55, 12);
    ctx.restore();
  }

  // Set as background
  preview.style.backgroundImage = `url(${canvas.toDataURL()})`;
  preview.classList.remove('hidden');
  placeholder.classList.add('hidden');
  showToast(`Simulated check ${face} image upload.`);
}

function resetCheckUploadBoxes() {
  ['front', 'back'].forEach(face => {
    const box = document.getElementById(`check-${face}-box`);
    if (box) {
      box.querySelector('.upload-preview').classList.add('hidden');
      box.querySelector('.upload-placeholder').classList.remove('hidden');
    }
  });
}

// 3D Credit Card Mouse Hover Physics
function initCardPhysics() {
  const card = document.getElementById('physical-card');
  const wrapper = document.querySelector('.card-3d-wrapper');

  if (!card || !wrapper) return;

  wrapper.addEventListener('mousemove', (e) => {
    if (appState.card.locked) return; // Disable hover tilts if card is frozen

    const rect = wrapper.getBoundingClientRect();
    const x = e.clientX - rect.left; // x position within wrapper
    const y = e.clientY - rect.top;  // y position within wrapper

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateY = ((x - centerX) / centerX) * 16;
    const rotateX = ((centerY - y) / centerY) * 16;

    card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
  });

  wrapper.addEventListener('mouseleave', () => {
    card.style.transform = 'rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
  });
}
