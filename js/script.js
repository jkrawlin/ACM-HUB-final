// Firebase configuration - In production, these should come from environment variables
// For security, ensure Firestore rules restrict access to authenticated users only
const firebaseConfig = {
    apiKey: "AIzaSyDE5u5ex1lm1ME8JGenQUcs_pE5OW94Pg0", // Public API key (safe for client-side)
    authDomain: "acm-hub-cb8ea.firebaseapp.com",
    projectId: "acm-hub-cb8ea",
    storageBucket: "acm-hub-cb8ea.appspot.com",
    messagingSenderId: "944461301106",
    appId: "1:944461301106:web:d92f33bfdb5e6430fa89eb",
    measurementId: "G-6NP0VS3WBV"
};

// TODO: Add Firebase Security Rules:
// rules_version = '2';
// service cloud.firestore {
//   match /databases/{database}/documents {
//     match /{document=**} {
//       allow read, write: if request.auth != null;
//     }
//   }
// }

// Initialize Firebase (using compat mode to match your existing code style)
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();  // Firestore database instance
const auth = firebase.auth(); // Auth instance for login
const analytics = firebase.analytics();  // Analytics if you want to use it (optional)

// Move loadDataFromFirestore outside of DOMContentLoaded so it can be called from auth.onAuthStateChanged
function loadDataFromFirestore() {
    // Load customers
    db.collection('customers').get().then(snapshot => {
        customers = [];
        if (snapshot.empty) {
            customers = sampleCustomers; // Fallback to sample
            saveDataToFirestore(); // Seed sample data to Firestore
        } else {
            snapshot.forEach(doc => customers.push(doc.data()));
        }
        renderCustomerTable();
    }).catch(error => {
        showAlert('Error loading customers: ' + error.message);
        customers = sampleCustomers; // Fallback on error
        renderCustomerTable();
    });

    // Load sales
    db.collection('sales').get().then(snapshot => {
        sales = [];
        if (snapshot.empty) {
            sales = sampleSales;
            saveDataToFirestore();
        } else {
            snapshot.forEach(doc => sales.push(doc.data()));
        }
        renderSalesTable();
    }).catch(error => {
        showAlert('Error loading sales: ' + error.message);
        sales = sampleSales;
        renderSalesTable();
    });

    // Load referrals
    db.collection('referrals').get().then(snapshot => {
        referrals = [];
        if (snapshot.empty) {
            referrals = sampleReferrals;
            saveDataToFirestore();
        } else {
            snapshot.forEach(doc => referrals.push(doc.data()));
        }
        renderReferralsTable();
    }).catch(error => {
        showAlert('Error loading referrals: ' + error.message);
        referrals = sampleReferrals;
        renderReferralsTable();
    });

    // Load affiliateCodes
    db.collection('affiliateCodes').get().then(snapshot => {
        affiliateCodes = [];
        if (snapshot.empty) {
            affiliateCodes = []; // No sample for affiliateCodes, start empty
            saveDataToFirestore();
        } else {
            snapshot.forEach(doc => affiliateCodes.push(doc.data()));
        }
        renderCodesTable();
        updateCodesCount();
    }).catch(error => {
        showAlert('Error loading affiliate codes: ' + error.message);
        affiliateCodes = [];
        renderCodesTable();
        updateCodesCount();
    });

    // Load commission rate
    db.collection('settings').doc('commission').get().then(doc => {
        if (doc.exists) {
            commissionRate = doc.data().rate || 3;
        } else {
            commissionRate = 3;
            saveDataToFirestore();
        }
        document.getElementById('commission-rate').value = commissionRate;
    }).catch(error => {
        showAlert('Error loading commission rate: ' + error.message);
        commissionRate = 3;
        document.getElementById('commission-rate').value = commissionRate;
    });
}

// Input sanitization helper
function sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    return input.replace(/[<>]/g, '').trim();
}

// Phone number validation
function validatePhone(phone) {
    return /^\+?\d{8,12}$/.test(phone);
}

// Email validation
function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Modal helper functions
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        // Focus trap
        const focusableElements = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (focusableElements.length > 0) {
            focusableElements[0].focus();
        }
        setTimeout(() => modal.classList.add('show'), 10);
    }
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
        modal.setAttribute('aria-hidden', 'true');
        setTimeout(() => modal.classList.add('hidden'), 300);
    }
}

// Signup function
function signup() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    auth.createUserWithEmailAndPassword(email, password).then(user => showAlert('User created!')).catch(error => showAlert(error.message));
}

// Login function
function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    auth.signInWithEmailAndPassword(email, password).then(user => showAlert('Logged in!')).catch(error => showAlert(error.message));
}

// Logout function
function logout() {
    auth.signOut().then(() => showAlert('Logged out!')).catch(error => showAlert(error.message));
}

// Password Reset
function resetPassword() {
    const email = document.getElementById('email').value;
    if (email) {
        auth.sendPasswordResetEmail(email).then(() => showAlert('Reset link sent!')).catch(error => showAlert(error.message));
    } else {
        showAlert('Enter email for reset.');
    }
}

// Check login status and block data if not logged in
auth.onAuthStateChanged(user => {
    if (user) {
        showAlert('Logged in as ' + user.email);
        document.getElementById('login-page').style.display = 'none';
        document.getElementById('app-container').style.display = 'block';
        loadDataFromFirestore(); // Load data only if logged in
    } else {
        document.getElementById('login-page').style.display = 'flex';
        document.getElementById('app-container').style.display = 'none';
        // Clear tables or hide content
        document.getElementById('customer-table-body').innerHTML = '<tr><td colspan="9" class="py-4 text-center text-gray-500">Login required</td></tr>';
        document.getElementById('sales-table-body').innerHTML = '<tr><td colspan="7" class="py-4 text-center text-gray-500">Login required</td></tr>';
        document.getElementById('referrals-table-body').innerHTML = '<tr><td colspan="5" class="py-4 text-center text-gray-500">Login required</td></tr>';
        document.getElementById('codes-table-body').innerHTML = '<tr><td colspan="5" class="py-4 text-center text-gray-500">Login required</td></tr>';
    }
});

document.addEventListener('DOMContentLoaded', function() {
    // Tab Switching
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            tabBtns.forEach(b => {
                b.classList.remove('active-tab');
                b.setAttribute('aria-selected', 'false');
            });
            this.classList.add('active-tab');
            this.setAttribute('aria-selected', 'true');
            tabContents.forEach(content => {
                content.classList.toggle('active', content.id === tabId);
            });
        });
    });
    // Notifications Dropdown
    const notificationsBtn = document.getElementById('notifications-btn');
    const notificationsDropdown = document.getElementById('notifications-dropdown');
    notificationsBtn.addEventListener('click', function() {
        notificationsDropdown.classList.toggle('hidden');
    });
    document.addEventListener('click', function(e) {
        if (!notificationsBtn.contains(e.target) && !notificationsDropdown.contains(e.target)) {
            notificationsDropdown.classList.add('hidden');
        }
    });
    // Sample Data (as fallback if Firestore is empty)
    const sampleCustomers = [
        { id: 1, name: 'Ahmed Mohamed', email: 'ahmed@example.com', phone: '555123456', qid: '123456789012', vehiclePlate: 'ABC-1234', affiliateCode: 'AFF1234', referredBy: null, referredCustomers: [2, 3, 4], accountBalance: 120.00, notes: 'Loyal customer' },
        { id: 2, name: 'Fatima Ali', email: 'fatima@example.com', phone: '555987654', qid: '987654321098', vehiclePlate: 'XYZ-5678', affiliateCode: 'AFF5678', referredBy: 'AFF1234', referredCustomers: [], accountBalance: 50.00, notes: '' },
        { id: 3, name: 'Mohammed Hassan', email: 'mohammed@example.com', phone: '555456123', qid: '456123789045', vehiclePlate: 'DEF-9012', affiliateCode: 'AFF9012', referredBy: 'AFF1234', referredCustomers: [5], accountBalance: 280.00, notes: 'High spender' },
        { id: 4, name: 'Mariam Abdullah', email: 'mariam@example.com', phone: '555789456', qid: '789456123078', vehiclePlate: 'GHI-3456', affiliateCode: 'AFF3456', referredBy: 'AFF1234', referredCustomers: [], accountBalance: 90.00, notes: '' },
        { id: 5, name: 'Khalid Ibrahim', email: 'khalid@example.com', phone: '555321789', qid: '321789654032', vehiclePlate: 'JKL-7890', affiliateCode: 'AFF7890', referredBy: 'AFF9012', referredCustomers: [], accountBalance: 0.00, notes: '' }
    ];

    const sampleSales = [
        { id: 1, date: '2023-05-15', invoice: 'INV-001', customer: 'Ahmed Mohamed', customerId: 1, services: 'Oil Change, AC Service', servicesList: [{ name: 'Oil Change', price: 120, quantity: 1 }, { name: 'AC Service', price: 200, quantity: 1 }], amount: 'QR 320', referral: 'AFF7890', commission: 'QR 9.60', discount: 0 },
        { id: 2, date: '2023-05-16', invoice: 'INV-002', customer: 'Fatima Ali', customerId: 2, services: 'Tire Rotation, Brake Check', servicesList: [{ name: 'Tire Rotation', price: 150, quantity: 1 }, { name: 'Brake Check', price: 300, quantity: 1 }], amount: 'QR 450', referral: null, commission: null, discount: 0 },
        { id: 3, date: '2023-05-17', invoice: 'INV-003', customer: 'Mohammed Hassan', customerId: 3, services: 'Full Service', servicesList: [{ name: 'Full Service', price: 800, quantity: 1 }], amount: 'QR 800', referral: 'AFF1234', commission: 'QR 24.00', discount: 0 },
        { id: 4, date: '2023-05-18', invoice: 'INV-004', customer: 'Mariam Abdullah', customerId: 4, services: 'Wheel Alignment', servicesList: [{ name: 'Wheel Alignment', price: 150, quantity: 1 }], amount: 'QR 150', referral: null, commission: null, discount: 0 },
        { id: 5, date: '2023-05-19', invoice: 'INV-005', customer: 'Khalid Ibrahim', customerId: 5, services: 'Battery Replacement', servicesList: [{ name: 'Battery Replacement', price: 280, quantity: 1 }], amount: 'QR 280', referral: 'AFF3456', commission: 'QR 8.40', discount: 0 }
    ];

    const sampleReferrals = [
        { id: 1, referrer: 'Ahmed Mohamed', code: 'AFF1234', totalReferrals: 3, referredCustomers: [2, 3, 4], totalSales: 'QR 1400.00', commissionEarned: 'QR 42.00', status: 'Pending' },
        { id: 2, referrer: 'Fatima Ali', code: 'AFF5678', totalReferrals: 0, referredCustomers: [], totalSales: 'QR 450.00', commissionEarned: 'QR 0.00', status: 'N/A' },
        { id: 3, referrer: 'Mohammed Hassan', code: 'AFF9012', totalReferrals: 1, referredCustomers: [5], totalSales: 'QR 800.00', commissionEarned: 'QR 24.00', status: 'Paid' },
        { id: 4, referrer: 'Mariam Abdullah', code: 'AFF3456', totalReferrals: 0, referredCustomers: [], totalSales: 'QR 150.00', commissionEarned: 'QR 4.50', status: 'Pending' },
        { id: 5, referrer: 'Khalid Ibrahim', code: 'AFF7890', totalReferrals: 0, referredCustomers: [], totalSales: 'QR 280.00', commissionEarned: 'QR 0.00', status: 'N/A' }
    ];

    let customers = [];
    let sales = [];
    let referrals = [];
    let affiliateCodes = [];
    let commissionRate = 3;

    // Function to save all data to Firestore
    function saveDataToFirestore() {
        customers.forEach(customer => {
            db.collection('customers').doc(customer.id.toString()).set(customer)
                .then(() => console.log('Customer saved!'))
                .catch(error => showAlert('Error saving customer: ' + error.message));
        });
        sales.forEach(sale => {
            db.collection('sales').doc(sale.id.toString()).set(sale)
                .then(() => console.log('Sale saved!'))
                .catch(error => showAlert('Error saving sale: ' + error.message));
        });
        referrals.forEach(referral => {
            db.collection('referrals').doc(referral.id.toString()).set(referral)
                .then(() => console.log('Referral saved!'))
                .catch(error => showAlert('Error saving referral: ' + error.message));
        });
        affiliateCodes.forEach(code => {
            db.collection('affiliateCodes').doc(code.id.toString()).set(code)
                .then(() => console.log('Affiliate code saved!'))
                .catch(error => showAlert('Error saving affiliate code: ' + error.message));
        });
        // Save commission rate (as a single doc)
        db.collection('settings').doc('commission').set({ rate: commissionRate })
            .then(() => console.log('Commission rate saved!'))
            .catch(error => showAlert('Error saving commission rate: ' + error.message));
    }

    // Function to load all data from Firestore (with fallback to sample if empty)
    // loadDataFromFirestore is now defined globally above

    // Replace saveData with Firestore save
    function saveData() {
        saveDataToFirestore();
    }

    // Load data on start
    loadDataFromFirestore();

    // Optional Real-Time Sync (auto update when data changes in Firestore)
    db.collection('customers').onSnapshot(snapshot => {
        customers = snapshot.docs.map(doc => doc.data());
        renderCustomerTable();
    });
    db.collection('sales').onSnapshot(snapshot => {
        sales = snapshot.docs.map(doc => doc.data());
        renderSalesTable();
    });
    db.collection('referrals').onSnapshot(snapshot => {
        referrals = snapshot.docs.map(doc => doc.data());
        renderReferralsTable();
    });
    db.collection('affiliateCodes').onSnapshot(snapshot => {
        affiliateCodes = snapshot.docs.map(doc => doc.data());
        renderCodesTable();
        updateCodesCount();
    });
    db.collection('settings').doc('commission').onSnapshot(doc => {
        if (doc.exists) {
            commissionRate = doc.data().rate;
            document.getElementById('commission-rate').value = commissionRate;
        }
    });

    // Render Customer Table with Pagination and Sorting
    const customerTableBody = document.getElementById('customer-table-body');
    const referredCustomersModal = document.getElementById('referred-customers-modal');
    let currentCustomerPage = 1;
    const customersPerPage = 10;
    function renderCustomerTable(data = customers, page = 1) {
        const start = (page - 1) * customersPerPage;
        const end = start + customersPerPage;
        const paginatedData = data.slice(start, end);
        customerTableBody.innerHTML = '';
        if (paginatedData.length === 0) {
            customerTableBody.innerHTML = `<tr><td colspan="9" class="py-4 text-center text-gray-500">No customers found</td></tr>`;
            return;
        }
        paginatedData.forEach(customer => {
            const row = document.createElement('tr');
            row.className = 'table-row border-b';
            row.innerHTML = `
                <td class="py-3 px-4 text-sm text-gray-700">${customer.name}</td>
                <td class="py-3 px-4 text-sm text-gray-700 hidden md:table-cell">${customer.email || 'N/A'}</td>
                <td class="py-3 px-4 text-sm text-gray-700">${customer.phone}</td>
                <td class="py-3 px-4 text-sm text-gray-700 hidden md:table-cell">${customer.qid || 'N/A'}</td>
                <td class="py-3 px-4 text-sm text-gray-700">${customer.vehiclePlate || 'N/A'}</td>
                <td class="py-3 px-4 text-sm text-gray-700">${customer.affiliateCode || 'N/A'}</td>
                <td class="py-3 px-4 text-sm text-gray-700">${customer.accountBalance ? 'QR ' + customer.accountBalance.toFixed(2) : 'QR 0.00'}</td>
                <td class="py-3 px-4 text-sm">
                    <button class="view-referred-btn text-green-600 hover:text-green-800" data-customer-id="${customer.id}" aria-label="View Referred Customers">
                        View (${customer.referredCustomers.length})
                    </button>
                </td>
                <td class="py-3 px-4 text-sm">
                    <button class="edit-customer-btn text-blue-600 hover:text-blue-800 mr-2" data-customer-id="${customer.id}" aria-label="Edit Customer">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="delete-customer-btn text-red-600 hover:text-red-800" data-customer-id="${customer.id}" aria-label="Delete Customer">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            customerTableBody.appendChild(row);
        });
        document.getElementById('customer-count').textContent = `${data.length} customers found`;
        document.getElementById('customer-page-info').textContent = `Page ${page} of ${Math.ceil(data.length / customersPerPage)}`;
        document.getElementById('prev-customer-page').disabled = page === 1;
        document.getElementById('next-customer-page').disabled = end >= data.length;
        // Event Listeners for Actions
        document.querySelectorAll('.view-referred-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const customerId = parseInt(this.getAttribute('data-customer-id'));
                const customer = customers.find(c => c.id === customerId);
                const referredTableBody = document.getElementById('referred-customers-table-body');
                const referredCount = document.getElementById('referred-customers-count');
                referredTableBody.innerHTML = '';
                if (customer.referredCustomers.length === 0) {
                    referredTableBody.innerHTML = `<tr><td colspan="6" class="py-4 text-center text-gray-500">No referred customers found</td></tr>`;
                    referredCount.textContent = '0 referred customers found';
                } else {
                    customer.referredCustomers.forEach(refId => {
                        const referredCustomer = customers.find(c => c.id === refId);
                        if (referredCustomer) {
                            const row = document.createElement('tr');
                            row.className = 'border-b';
                            row.innerHTML = `
                                <td class="py-3 px-4 text-sm text-gray-700">${referredCustomer.name}</td>
                                <td class="py-3 px-4 text-sm text-gray-700 hidden md:table-cell">${referredCustomer.email || 'N/A'}</td>
                                <td class="py-3 px-4 text-sm text-gray-700">${referredCustomer.phone}</td>
                                <td class="py-3 px-4 text-sm text-gray-700 hidden md:table-cell">${referredCustomer.qid || 'N/A'}</td>
                                <td class="py-3 px-4 text-sm text-gray-700">${referredCustomer.vehiclePlate || 'N/A'}</td>
                                <td class="py-3 px-4 text-sm text-gray-700">${referredCustomer.affiliateCode || 'N/A'}</td>
                            `;
                            referredTableBody.appendChild(row);
                        }
                    });
                    referredCount.textContent = `${customer.referredCustomers.length} referred customers found`;
                }
                showModal('referred-customers-modal');
            });
        });
        document.querySelectorAll('.delete-customer-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const customerId = parseInt(this.getAttribute('data-customer-id'));
                const customer = customers.find(c => c.id === customerId);
                if (confirm(`Are you sure you want to delete ${customer.name}? This will also delete associated sales and unlink referrals.`)) {
                    // Delete associated sales and reverse commissions
                    const associatedSales = sales.filter(s => s.customerId === customerId);
                    associatedSales.forEach(sale => {
                        if (sale.referral && sale.commission) {
                            const commissionAmount = parseFloat(sale.commission.replace('QR ', ''));
                            const saleAmount = parseFloat(sale.amount.replace('QR ', ''));
                            if (!isNaN(commissionAmount) && !isNaN(saleAmount)) {
                                const referrerRef = referrals.find(r => r.code === sale.referral);
                                if (referrerRef) {
                                    referrerRef.totalSales = 'QR ' + (parseFloat(referrerRef.totalSales.replace('QR ', '')) - saleAmount + sale.discount).toFixed(2);
                                    referrerRef.commissionEarned = 'QR ' + (parseFloat(referrerRef.commissionEarned.replace('QR ', '')) - commissionAmount).toFixed(2);
                                }
                                const referrerCust = customers.find(c => c.affiliateCode === sale.referral);
                                if (referrerCust) {
                                    referrerCust.accountBalance -= commissionAmount;
                                }
                                
                                // Update affiliate code status
                                const usedCode = affiliateCodes.find(ac => ac.code === sale.referral);
                                if (usedCode && usedCode.usedInSales) {
                                    usedCode.usedInSales = usedCode.usedInSales.filter(invoice => invoice !== sale.invoice);
                                    if (usedCode.usedInSales.length === 0) {
                                        usedCode.status = 'assigned';
                                    }
                                }
                            }
                        }
                    });
                    sales = sales.filter(s => s.customerId !== customerId);
                    
                    // Return customer's affiliate code to available status
                    const customerCode = affiliateCodes.find(ac => ac.code === customer.affiliateCode);
                    if (customerCode) {
                        customerCode.status = 'available';
                        customerCode.usedInSales = [];
                    }
                    
                    // Unlink referrals
                    customers.forEach(c => {
                        if (c.referredBy === customer.affiliateCode) c.referredBy = null;
                        c.referredCustomers = c.referredCustomers.filter(id => id !== customerId);
                    });
                    // Delete customer and referral
                    customers = customers.filter(c => c.id !== customerId);
                    referrals = referrals.filter(r => r.id !== customerId);
                    saveData();
                    renderCustomerTable();
                    renderSalesTable();
                    renderReferralsTable();
                    renderCodesTable();
                    updateCodesCount();
                    showAlert(`Customer ${customer.name} deleted successfully.`);
                }
            });
        });
        document.querySelectorAll('.edit-customer-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const customerId = parseInt(this.getAttribute('data-customer-id'));
                const customer = customers.find(c => c.id === customerId);
                if (!customer) {
                    showAlert('Customer not found.');
                    return;
                }
                document.getElementById('edit-customer-id').value = customer.id;
                document.getElementById('edit-customer-name').value = customer.name;
                document.getElementById('edit-customer-email').value = customer.email || '';
                document.getElementById('edit-customer-phone').value = customer.phone;
                document.getElementById('edit-customer-qid').value = customer.qid || '';
                document.getElementById('edit-customer-vehicle-plate').value = customer.vehiclePlate || '';
                document.getElementById('edit-customer-affiliate-code').value = customer.affiliateCode || '';
                document.getElementById('edit-customer-balance').value = customer.accountBalance.toFixed(2);
                document.getElementById('edit-customer-notes').value = customer.notes || '';
                const referrer = customers.find(c => c.affiliateCode === customer.referredBy);
                document.getElementById('edit-customer-referredby').value = referrer ? referrer.name : 'N/A';
                const referredSelect = document.getElementById('edit-customer-referreds');
                referredSelect.innerHTML = '';
                let otherCustomers = customers.filter(c => c.id !== customerId);
                otherCustomers.sort((a, b) => a.name.localeCompare(b.name));
                otherCustomers.forEach(c => {
                    const option = document.createElement('option');
                    option.value = c.id;
                    option.textContent = `${c.name} (${c.affiliateCode})`;
                    if (customer.referredCustomers.includes(c.id)) option.selected = true;
                    referredSelect.appendChild(option);
                });
                // Enable/Disable Pay Out button based on balance
                const payoutBtn = document.getElementById('payout-btn');
                payoutBtn.disabled = customer.accountBalance <= 0;
                showModal('edit-customer-modal');
                document.getElementById('copy-affiliate-code').addEventListener('click', function() {
                    navigator.clipboard.writeText(document.getElementById('edit-customer-affiliate-code').value);
                    showAlert('Affiliate code copied to clipboard.');
                });
                // Pay Out Button Logic
                payoutBtn.addEventListener('click', async function() {
                    const oldBalance = parseFloat(document.getElementById('edit-customer-balance').value);
                    if (oldBalance <= 0) return;
                    if (confirm(`Confirm payout of QR ${oldBalance.toFixed(2)} to ${customer.name}? This will reset balance to 0 and send a WhatsApp notification.`)) {
                        // Reset balance
                        document.getElementById('edit-customer-balance').value = '0.00';
                        customer.accountBalance = 0;
                        
                        // Log payout history
                        if (!customer.payoutHistory) customer.payoutHistory = [];
                        customer.payoutHistory.push({
                            date: new Date().toISOString(),
                            amount: oldBalance,
                            method: 'manual',
                            status: 'completed'
                        });
                        
                        // Append to notes
                        const notesInput = document.getElementById('edit-customer-notes');
                        const payoutDate = new Date().toLocaleDateString();
                        const payoutTime = new Date().toLocaleTimeString();
                        notesInput.value += `\nPayout: QR ${oldBalance.toFixed(2)} on ${payoutDate} at ${payoutTime}`;
                        
                        // Update referral status to Paid if applicable
                        const refIndex = referrals.findIndex(r => r.code === customer.affiliateCode);
                        if (refIndex !== -1) referrals[refIndex].status = 'Paid';
                        saveData();
                        renderCustomerTable();
                        renderReferralsTable();
                        // Send WhatsApp
                        try {
                            const response = await fetch('http://localhost:3000/send-whatsapp', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    toPhone: customer.phone,
                                    commission: oldBalance.toFixed(2), // Reuse param or add 'message' if backend updated
                                    balance: '0.00'
                                })
                            });
                            if (!response.ok) throw new Error('Failed to send payout notification');
                            showAlert('Payout processed and notification sent.');
                        } catch (error) {
                            console.error('Error sending payout notification:', error);
                            showAlert('Payout processed, but notification failed. Network or server may be unavailable.');
                        }
                    }
                });
            });
        });
    }
    // Edit Customer Form Submit
    document.getElementById('edit-customer-form').addEventListener('submit', function(e) {
        e.preventDefault();
        const id = parseInt(document.getElementById('edit-customer-id').value);
        const name = document.getElementById('edit-customer-name').value.trim();
        const email = document.getElementById('edit-customer-email').value.trim() || null;
        const phone = document.getElementById('edit-customer-phone').value.trim();
        const qid = document.getElementById('edit-customer-qid').value.trim() || null;
        const vehiclePlate = document.getElementById('edit-customer-vehicle-plate').value.trim();
        const affiliateCode = document.getElementById('edit-customer-affiliate-code').value.trim();
        const accountBalance = parseFloat(document.getElementById('edit-customer-balance').value);
        const notes = document.getElementById('edit-customer-notes').value.trim() || '';
        const referredCustomers = Array.from(document.getElementById('edit-customer-referreds').selectedOptions).map(o => parseInt(o.value));
        if (!name || !phone || !vehiclePlate || !affiliateCode || isNaN(accountBalance) || accountBalance < 0) {
            showAlert('Please fill in all required fields and ensure a valid account balance.');
            return;
        }
        if (email && !/^\S+@\S+\.\S+$/.test(email)) {
            showAlert('Invalid email format.');
            return;
        }
        if (!/^\+?\d{8,12}$/.test(phone)) {
            showAlert('Phone number must be 8-12 digits (optional + prefix).');
            return;
        }
        if (customers.some(c => c.id !== id && c.affiliateCode === affiliateCode)) {
            showAlert('Affiliate code already exists.');
            return;
        }
        if (referredCustomers.includes(id)) {
            showAlert('Cannot refer self.');
            return;
        }
        const index = customers.findIndex(c => c.id === id);
        const oldAffiliateCode = customers[index].affiliateCode;
        const oldBalance = customers[index].accountBalance;
        customers[index] = { ...customers[index], name, email, phone, qid, vehiclePlate, affiliateCode, accountBalance, notes, referredCustomers };
        customers.forEach(c => {
            if (c.referredBy === oldAffiliateCode) c.referredBy = affiliateCode;
        });
        sales.forEach(s => {
            if (s.customerId === id) s.customer = name;
        });
        const refIndex = referrals.findIndex(r => r.code === oldAffiliateCode);
        if (refIndex !== -1) {
            referrals[refIndex].referrer = name;
            referrals[refIndex].code = affiliateCode;
            referrals[refIndex].totalReferrals = referredCustomers.length;
            referrals[refIndex].referredCustomers = referredCustomers.map(id => customers.find(c => c.id === id)?.code || '');
        }
        saveData();
        renderCustomerTable();
        renderSalesTable();
        renderReferralsTable();
        hideModal('edit-customer-modal');
        showAlert('Customer updated successfully.');
        if (accountBalance > oldBalance) {
            const difference = (accountBalance - oldBalance).toFixed(2);
            // Send notification (simulated)
            console.log(`Sent notification: Credited QR ${difference}. New balance: QR ${accountBalance.toFixed(2)}`);
        }
    });
    document.getElementById('cancel-edit-customer').addEventListener('click', () => hideModal('edit-customer-modal'));
    document.getElementById('close-edit-customer-modal').addEventListener('click', () => hideModal('edit-customer-modal'));
    // Customer Search
    const customerSearch = document.getElementById('customer-search');
    customerSearch.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const filteredCustomers = customers.filter(c =>
            Object.values(c).some(value =>
                value && value.toString().toLowerCase().includes(searchTerm)
            )
        );
        renderCustomerTable(filteredCustomers, 1);
    });

    // Sales Search
    const salesSearch = document.getElementById('sales-search');
    salesSearch.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const filteredSales = sales.filter(s =>
            Object.values(s).some(value =>
                value && value.toString().toLowerCase().includes(searchTerm)
            )
        );
        renderSalesTable(filteredSales, 1);
    });

    // Referrals Search  
    const referralsSearch = document.getElementById('referrals-search');
    referralsSearch.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const filteredReferrals = referrals.filter(r =>
            Object.values(r).some(value =>
                value && value.toString().toLowerCase().includes(searchTerm)
            )
        );
        renderReferralsTable(filteredReferrals);
    });
    // Table Sorting for Customers
    document.querySelectorAll('#customers th[data-sort]').forEach(th => {
        th.addEventListener('click', function() {
            const column = this.getAttribute('data-sort');
            const order = this.getAttribute('data-order') === 'asc' ? 'desc' : 'asc';
            this.setAttribute('data-order', order);
            customers.sort((a, b) => {
                let valA = a[column];
                let valB = b[column];
                if (column === 'accountBalance') {
                    valA = parseFloat(valA);
                    valB = parseFloat(valB);
                }
                if (typeof valA === 'string') {
                    return order === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
                } else {
                    return order === 'asc' ? valA - valB : valB - valA;
                }
            });
            renderCustomerTable(customers, currentCustomerPage);
        });
    });
    // Referred Customers Modal Close
    const closeReferredModal = document.getElementById('close-referred-customers-modal');
    const cancelReferred = document.getElementById('cancel-referred-customers');
    [closeReferredModal, cancelReferred].forEach(btn => {
        btn.addEventListener('click', () => hideModal('referred-customers-modal'));
    });
    // Render Sales Table with Pagination and Sorting
    const salesTableBody = document.getElementById('sales-table-body');
    let currentSalesPage = 1;
    const salesPerPage = 10;
    function renderSalesTable(data = sales, page = 1) {
        const start = (page - 1) * salesPerPage;
        const end = start + salesPerPage;
        const paginatedData = data.slice(start, end);
        salesTableBody.innerHTML = '';
        if (paginatedData.length === 0) {
            salesTableBody.innerHTML = `<tr><td colspan="7" class="py-4 text-center text-gray-500">No sales found</td></tr>`;
            return;
        }
        paginatedData.forEach(sale => {
            const row = document.createElement('tr');
            row.className = 'table-row border-b';
            row.innerHTML = `
                <td class="py-3 px-4 text-sm text-gray-700">${sale.date}</td>
                <td class="py-3 px-4 text-sm text-gray-700">${sale.invoice}</td>
                <td class="py-3 px-4 text-sm text-gray-700">${sale.customer}</td>
                <td class="py-3 px-4 text-sm text-gray-700">${sale.services}</td>
                <td class="py-3 px-4 text-sm text-gray-700">${sale.amount}</td>
                <td class="py-3 px-4 text-sm text-gray-700">${sale.referral || 'N/A'}</td>
                <td class="py-3 px-4 text-sm">
                    <button class="edit-sale-btn text-blue-600 hover:text-blue-800 mr-2" data-sale-id="${sale.id}" aria-label="Edit Sale">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="delete-sale-btn text-red-600 hover:text-red-800 mr-2" data-sale-id="${sale.id}" aria-label="Delete Sale">
                        <i class="fas fa-trash"></i>
                    </button>
                    <button class="generate-invoice-btn text-green-600 hover:text-green-800" data-sale-id="${sale.id}" aria-label="Generate Invoice">
                        <i class="fas fa-file-invoice"></i>
                    </button>
                </td>
            `;
            salesTableBody.appendChild(row);
        });
        document.getElementById('sales-count').textContent = `${data.length} sales found`;
        document.getElementById('sales-page-info').textContent = `Page ${page} of ${Math.ceil(data.length / salesPerPage)}`;
        document.getElementById('prev-sales-page').disabled = page === 1;
        document.getElementById('next-sales-page').disabled = end >= data.length;
        // Event Listeners for Actions
        document.querySelectorAll('.edit-sale-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const saleId = parseInt(this.getAttribute('data-sale-id'));
                const sale = sales.find(s => s.id === saleId);

                if (!sale) {
                    showAlert('Sale not found');
                    return;
                }

                // Populate edit sale modal
                document.getElementById('edit-sale-id').value = saleId;
                document.getElementById('edit-customer-name').value = sale.customer;
                document.getElementById('edit-customer-phone').value = customers.find(c => c.id === sale.customerId)?.phone || '';
                document.getElementById('edit-product-name').value = sale.servicesList?.[0]?.name || '';
                document.getElementById('edit-sale-amount').value = parseFloat(sale.amount.replace('QR ', ''));
                document.getElementById('edit-affiliate-code').value = sale.referral || '';
                document.getElementById('edit-sale-date').value = sale.date;
                document.getElementById('edit-notes').value = '';

                // Populate services
                const servicesContainer = document.getElementById('edit-sale-services-container');
                servicesContainer.innerHTML = '';

                if (sale.servicesList && sale.servicesList.length > 0) {
                    sale.servicesList.forEach(service => {
                        const serviceRow = document.createElement('div');
                        serviceRow.className = 'grid grid-cols-1 md:grid-cols-12 gap-4 service-row';
                        serviceRow.innerHTML = `
                            <div class="md:col-span-5">
                                <input type="text" name="service-name" value="${service.name}" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 form-input" placeholder="Service description">
                            </div>
                            <div class="md:col-span-3">
                                <input type="number" name="service-price" value="${service.price}" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 form-input" placeholder="Price">
                            </div>
                            <div class="md:col-span-3">
                                <input type="number" name="service-quantity" value="${service.quantity}" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 form-input" placeholder="Qty" value="1">
                            </div>
                            <div class="md:col-span-1 flex items-center justify-center">
                                <button type="button" class="remove-service-btn text-red-500 hover:text-red-700 transition-colors">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        `;
                        servicesContainer.appendChild(serviceRow);

                        // Add event listeners
                        serviceRow.querySelectorAll('input').forEach(input => input.addEventListener('input', calculateEditTotal));
                        serviceRow.querySelector('.remove-service-btn').addEventListener('click', function() {
                            serviceRow.remove();
                            calculateEditTotal();
                        });
                    });
                }

                // Set discount
                document.getElementById('edit-sale-discount').value = sale.discount || 0;

                // Calculate total
                calculateEditTotal();

                // Show modal
                showModal('edit-sale-modal');
            });
        });
        document.querySelectorAll('.delete-sale-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const saleId = parseInt(this.getAttribute('data-sale-id'));
                const sale = sales.find(s => s.id === saleId);
                if (confirm(`Are you sure you want to delete sale ${sale.invoice} for ${sale.customer}?`)) {
                    // Reverse commission if exists
                    if (sale.referral && sale.commission) {
                        const commissionAmount = parseFloat(sale.commission.replace('QR ', ''));
                        const saleAmount = parseFloat(sale.amount.replace('QR ', ''));
                        if (!isNaN(commissionAmount) && !isNaN(saleAmount)) {
                            const referrerRef = referrals.find(r => r.code === sale.referral);
                            if (referrerRef) {
                                referrerRef.totalSales = 'QR ' + (parseFloat(referrerRef.totalSales.replace('QR ', '')) - saleAmount + sale.discount).toFixed(2);
                                referrerRef.commissionEarned = 'QR ' + (parseFloat(referrerRef.commissionEarned.replace('QR ', '')) - commissionAmount).toFixed(2);
                            }
                            const referrerCust = customers.find(c => c.affiliateCode === sale.referral);
                            if (referrerCust) {
                                referrerCust.accountBalance -= commissionAmount;
                            }
                            
                            // Update affiliate code status
                            const usedCode = affiliateCodes.find(ac => ac.code === sale.referral);
                            if (usedCode && usedCode.usedInSales) {
                                usedCode.usedInSales = usedCode.usedInSales.filter(invoice => invoice !== sale.invoice);
                                if (usedCode.usedInSales.length === 0) {
                                    usedCode.status = 'assigned'; // Back to assigned, not available
                                }
                            }
                        }
                    }
                    
                    sales = sales.filter(s => s.customerId !== saleId);
                    saveData();
                    renderSalesTable();
                    renderReferralsTable();
                    renderCustomerTable();
                    renderCodesTable();
                    updateCodesCount();
                    showAlert(`Sale ${sale.invoice} deleted successfully.`);
                }
            });
        });
        document.querySelectorAll('.generate-invoice-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const saleId = parseInt(this.getAttribute('data-sale-id'));
                const sale = sales.find(s => s.id === saleId);
                generateInvoice(sale);
            });
        });
    }
    // Table Sorting for Sales
    document.querySelectorAll('#sales th[data-sort]').forEach(th => {
        th.addEventListener('click', function() {
            const column = this.getAttribute('data-sort');
            const order = this.getAttribute('data-order') === 'asc' ? 'desc' : 'asc';
            this.setAttribute('data-order', order);
            sales.sort((a, b) => {
                let valA = a[column];
                let valB = b[column];
                if (column === 'amount') {
                    valA = parseFloat(valA.replace('QR ', ''));
                    valB = parseFloat(valB.replace('QR ', ''));
                } else if (column === 'date') {
                    valA = new Date(valA);
                    valB = new Date(valB);
                }
                if (typeof valA === 'string') {
                    return order === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
                } else {
                    return order === 'asc' ? valA - valB : valB - valA;
                }
            });
            renderSalesTable(sales, currentSalesPage);
        });
    });
    // Init New Sale Modal Logic
    function initNewSaleModal() {
        const modalId = 'new-sale-modal';
        const form = document.getElementById('new-sale-form');
        const customerTypeRadios = form.querySelectorAll('[name="customer-type"]');
        const existingSection = document.getElementById('existing-customer');
        const newSection = document.getElementById('new-customer');
        const customerCodeInput = document.getElementById('sale-customer-code');
        const customerSelect = document.getElementById('sale-customer');
        const customerNameInput = document.getElementById('sale-customer-name');
        const referralInput = document.getElementById('sale-referral');
        const servicesContainer = document.getElementById('sale-services-container');
        const addServiceBtn = document.getElementById('add-service-btn');
        const discountInput = document.getElementById('sale-discount');
        const totalSpan = document.getElementById('sale-total');
        // Customer Type Toggle
        customerTypeRadios.forEach(radio => {
            radio.addEventListener('change', function() {
                const isExisting = this.value === 'existing';
                existingSection.classList.toggle('hidden', !isExisting);
                newSection.classList.toggle('hidden', isExisting);
                customerSelect.required = isExisting;
                document.getElementById('new-customer-name').required = !isExisting;
                document.getElementById('new-customer-phone').required = !isExisting;
                document.getElementById('new-customer-vehicle-plate').required = !isExisting;
            });
        });
        // Auto-detect customer from code (debounced)
        const debounce = (func, delay) => {
            let timeout;
            return (...args) => {
                clearTimeout(timeout);
                timeout = setTimeout(() => func(...args), delay);
            };
        };
        const searchCustomer = debounce(function() {
            const code = customerCodeInput.value.trim().toUpperCase();
            const customerType = form.querySelector('[name="customer-type"]:checked').value;
            
            customerCodeInput.classList.remove('input-success', 'input-error');
            if (code.length < 3) {
                if (customerType === 'existing') {
                    customerSelect.value = '';
                    customerNameInput.value = '';
                    referralInput.value = '';
                }
                return;
            }

            const matchingCustomer = customers.find(c => c.affiliateCode.toUpperCase() === code);
            
            if (customerType === 'existing') {
                // For existing customers, match their own affiliate code
                if (matchingCustomer) {
                    customerCodeInput.classList.add('input-success');
                    customerSelect.value = matchingCustomer.id;
                    customerNameInput.value = matchingCustomer.name;
                    referralInput.value = matchingCustomer.referredBy || '';
                } else {
                    customerCodeInput.classList.add('input-error');
                    customerSelect.value = '';
                    customerNameInput.value = '';
                    referralInput.value = '';
                }
            } else {
                // For new customers, check if code is valid as referral
                if (matchingCustomer) {
                    customerCodeInput.classList.add('input-success');
                    referralInput.value = code; // Use as referral code
                    // Show hint that this will be used as referral
                    const hint = document.getElementById('referral-hint') || (() => {
                        const div = document.createElement('div');
                        div.id = 'referral-hint';
                        div.className = 'text-sm text-green-600 mt-1';
                        customerCodeInput.parentNode.appendChild(div);
                        return div;
                    })();
                    hint.textContent = `Valid referral code - customer will be referred by ${matchingCustomer.name}`;
                } else {
                    // Check if it's a valid unused affiliate code
                    const unusedCode = affiliateCodes.find(ac => ac.code.toUpperCase() === code && ac.status === 'available');
                    if (unusedCode) {
                        customerCodeInput.classList.add('input-success');
                        referralInput.value = '';
                        const hint = document.getElementById('referral-hint');
                        if (hint) hint.textContent = 'Valid unused affiliate code - will be assigned to new customer';
                    } else {
                        customerCodeInput.classList.add('input-error');
                        referralInput.value = '';
                        const hint = document.getElementById('referral-hint');
                        if (hint) hint.textContent = 'Invalid or used affiliate code';
                    }
                }
            }
        }, 300);
        customerCodeInput.addEventListener('input', searchCustomer);
        // Dynamic Services
        function calculateTotal() {
            let subtotal = 0;
            servicesContainer.querySelectorAll('.service-row').forEach(div => {
                const price = parseFloat(div.querySelector('[name="service-price"]').value) || 0;
                const qty = parseInt(div.querySelector('[name="service-quantity"]').value) || 1;
                subtotal += price * qty;
            });
            const discount = parseFloat(discountInput.value) || 0;
            totalSpan.textContent = (subtotal - discount).toFixed(2);
        }
        servicesContainer.querySelectorAll('input').forEach(input => input.addEventListener('input', calculateTotal));
        servicesContainer.querySelectorAll('.remove-service-btn').forEach(btn => btn.addEventListener('click', function() {
            this.closest('.service-row').remove();
            calculateTotal();
        }));
        addServiceBtn.addEventListener('click', function() {
            const newDiv = document.createElement('div');
            newDiv.className = 'grid grid-cols-1 md:grid-cols-12 gap-4 service-row';
            newDiv.draggable = true;
            newDiv.innerHTML = `
                <div class="md:col-span-5">
                    <input type="text" name="service-name" placeholder="Service description" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 form-input" aria-label="Service Description">
                </div>
                <div class="md:col-span-3">
                    <input type="number" name="service-price" placeholder="Price" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 form-input" aria-label="Service Price">
                </div>
                <div class="md:col-span-3">
                    <input type="number" name="service-quantity" placeholder="Qty" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 form-input" value="1" aria-label="Service Quantity">
                </div>
                <div class="md:col-span-1 flex items-center justify-center">
                    <button type="button" class="remove-service-btn text-red-500 hover:text-red-700 transition-colors" aria-label="Remove Service">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            servicesContainer.appendChild(newDiv);
            newDiv.querySelectorAll('input').forEach(input => input.addEventListener('input', calculateTotal));
            newDiv.querySelector('.remove-service-btn').addEventListener('click', function() {
                newDiv.remove();
                calculateTotal();
            });
            // Simple drag/drop for reordering
            newDiv.addEventListener('dragstart', e => e.dataTransfer.setData('text/plain', ''));
            servicesContainer.addEventListener('dragover', e => e.preventDefault());
            servicesContainer.addEventListener('drop', e => {
                e.preventDefault();
                const dragged = document.querySelector('.dragging');
                if (dragged) {
                    servicesContainer.insertBefore(dragged, e.target.closest('.service-row'));
                    dragged.classList.remove('dragging');
                }
            });
            newDiv.addEventListener('dragstart', e => newDiv.classList.add('dragging'));
            newDiv.addEventListener('dragend', e => newDiv.classList.remove('dragging'));
        });
        discountInput.addEventListener('input', calculateTotal);
        // Form Submit
        form.addEventListener('submit', async function(e) {
            e.preventDefault();

            // Validation
            const customerType = form.querySelector('[name="customer-type"]:checked').value;
            const date = document.getElementById('sale-date').value.trim();
            const discount = parseFloat(discountInput.value) || 0;

            // Date validation
            if (!date) {
                showAlert('Please select a date.');
                return;
            }
            
            const saleDate = new Date(date);
            const today = new Date();
            const minDate = new Date();
            minDate.setFullYear(today.getFullYear() - 1); // Don't allow sales older than 1 year
            
            if (saleDate > today) {
                showAlert('Sale date cannot be in the future.');
                return;
            }
            
            if (saleDate < minDate) {
                showAlert('Sale date cannot be older than 1 year.');
                return;
            }

            // Discount validation
            if (discount < 0) {
                showAlert('Discount cannot be negative.');
                return;
            }

            // Collect services
            const serviceRows = servicesContainer.querySelectorAll('.service-row');
            const servicesList = [];
            let hasValidService = false;

            try {
                serviceRows.forEach(row => {
                    const name = row.querySelector('[name="service-name"]').value.trim();
                    const price = parseFloat(row.querySelector('[name="service-price"]').value) || 0;
                    const quantity = parseInt(row.querySelector('[name="service-quantity"]').value) || 1;

                    if (name && price > 0 && quantity > 0) {
                        // Additional validation for reasonable values
                        if (price > 10000) {
                            throw new Error(`Service price ${price} seems too high. Please verify.`);
                        }
                        if (quantity > 100) {
                            throw new Error(`Service quantity ${quantity} seems too high. Please verify.`);
                        }
                        servicesList.push({ name, price, quantity });
                        hasValidService = true;
                    }
                });
            } catch (error) {
                showAlert(error.message);
                return;
            }

            if (!hasValidService) {
                showAlert('Please add at least one valid service.');
                return;
            }

            let customerId;
            let customerName;
            let referralCode = referralInput.value.trim();

            if (customerType === 'existing') {
                customerId = parseInt(customerSelect.value);
                if (!customerId || !customerNameInput.value.trim()) {
                    showAlert('Please enter a valid customer affiliate code.');
                    return;
                }
                const customer = customers.find(c => c.id === customerId);
                customerName = customer.name;
            } else {
                // New customer
                const name = document.getElementById('new-customer-name').value.trim();
                const email = document.getElementById('new-customer-email').value.trim();
                const phone = document.getElementById('new-customer-phone').value.trim();
                const qid = document.getElementById('new-customer-qid').value.trim();
                const vehiclePlate = document.getElementById('new-customer-vehicle-plate').value.trim();

                if (!name || !phone || !vehiclePlate) {
                    showAlert('Please fill in required fields for new customer.');
                    return;
                }

                // Validate phone format
                if (!/^\+?\d{8,12}$/.test(phone)) {
                    showAlert('Phone number must be 8-12 digits (optional + prefix).');
                    return;
                }

                // Check for duplicate phone/vehicle
                if (customers.some(c => c.phone === phone)) {
                    showAlert('Customer with this phone number already exists.');
                    return;
                }
                if (customers.some(c => c.vehiclePlate === vehiclePlate)) {
                    showAlert('Customer with this vehicle plate already exists.');
                    return;
                }

                // Get available affiliate code
                const availableCode = affiliateCodes.find(code => code.status === 'available');
                if (!availableCode) {
                    showAlert('No affiliate codes available. Please generate some codes first.');
                    return;
                }

                // Create new customer
                customerId = Math.max(...customers.map(c => c.id), 0) + 1;
                customerName = name;

                // Determine affiliate code and referral
                let assignedAffiliateCode;
                let referredBy = referralCode;
                
                // Check if the entered code is a referral code or specific affiliate code
                const enteredCode = customerCodeInput.value.trim();
                if (enteredCode) {
                    const referrer = customers.find(c => c.affiliateCode === enteredCode);
                    if (referrer) {
                        // Use as referral code
                        referredBy = enteredCode;
                        assignedAffiliateCode = availableCode.code;
                    } else {
                        // Check if it's an unused affiliate code they want to use
                        const unusedCode = affiliateCodes.find(ac => ac.code === enteredCode && ac.status === 'available');
                        if (unusedCode) {
                            // Assign this specific code to the customer
                            assignedAffiliateCode = enteredCode;
                            // Update the code status
                            unusedCode.status = 'assigned';
                        } else {
                            // Invalid code, assign available one
                            assignedAffiliateCode = availableCode.code;
                        }
                    }
                } else {
                    // No code entered, assign available one
                    assignedAffiliateCode = availableCode.code;
                }

                const newCustomer = {
                    id: customerId,
                    name,
                    email: email || null,
                    phone,
                    qid: qid || null,
                    vehiclePlate,
                    affiliateCode: assignedAffiliateCode,
                    referredBy: referredBy || null,
                    referredCustomers: [],
                    accountBalance: 0.00,
                    notes: ''
                };

                customers.push(newCustomer);

                // Mark affiliate code as assigned (if not already done)
                const codeToMark = affiliateCodes.find(code => code.code === assignedAffiliateCode);
                if (codeToMark && codeToMark.status === 'available') {
                    codeToMark.status = 'assigned';
                }

                // If referred by someone, add to their referral list
                if (referredBy) {
                    const referrer = customers.find(c => c.affiliateCode === referredBy);
                    if (referrer) {
                        referrer.referredCustomers.push(customerId);
                        // Update referrals table
                        const referralEntry = referrals.find(r => r.code === referredBy);
                        if (referralEntry) {
                            referralEntry.totalReferrals += 1;
                            referralEntry.referredCustomers.push(customerId);
                        } else {
                            // Create new referral entry
                            referrals.push({
                                id: referrals.length + 1,
                                referrer: referrer.name,
                                code: referredBy,
                                totalReferrals: 1,
                                referredCustomers: [customerId],
                                totalSales: 'QR 0.00',
                                commissionEarned: 'QR 0.00',
                                status: 'Pending'
                            });
                        }
                    }
                }
            }

            // Calculate totals
            const subtotal = servicesList.reduce((sum, service) => sum + (service.price * service.quantity), 0);
            const total = subtotal - discount;

            if (total < 0) {
                showAlert('Total cannot be negative.');
                return;
            }

            // Generate invoice number
            const maxInvoiceNum = Math.max(...sales.map(s => parseInt(s.invoice.replace('INV-', '')) || 0), 0);
            const invoiceNum = `INV-${(maxInvoiceNum + 1).toString().padStart(3, '0')}`;

            // Check for duplicate invoice
            if (sales.some(s => s.invoice === invoiceNum)) {
                showAlert('Invoice number conflict detected. Regenerating...');
                // Try with timestamp suffix
                const timestamp = Date.now().toString().slice(-4);
                invoiceNum = `INV-${(maxInvoiceNum + 1).toString().padStart(3, '0')}-${timestamp}`;
                if (sales.some(s => s.invoice === invoiceNum)) {
                    showAlert('Unable to generate unique invoice number. Please try again.');
                    return;
                }
            }

            // Create sale
            const newSaleId = Math.max(...sales.map(s => s.id), 0) + 1;
            const servicesText = servicesList.map(s => s.name).join(', ');

            // Calculate commission if there's a referral
            let commission = null;
            if (referralCode) {
                const commissionAmount = total * (commissionRate / 100);
                commission = `QR ${commissionAmount.toFixed(2)}`;

                // Update referrer's account balance
                const referrer = customers.find(c => c.affiliateCode === referralCode);
                if (referrer) {
                    referrer.accountBalance += commissionAmount;

                    // Update referrals table
                    const referralEntry = referrals.find(r => r.code === referralCode);
                    if (referralEntry) {
                        const currentTotalSales = parseFloat(referralEntry.totalSales.replace('QR ', '')) || 0;
                        const currentCommission = parseFloat(referralEntry.commissionEarned.replace('QR ', '')) || 0;
                        referralEntry.totalSales = `QR ${(currentTotalSales + total).toFixed(2)}`;
                        referralEntry.commissionEarned = `QR ${(currentCommission + commissionAmount).toFixed(2)}`;
                        referralEntry.status = 'Pending';
                    }

                    // Mark affiliate code as used and add to usedInSales
                    const usedCode = affiliateCodes.find(code => code.code === referralCode);
                    if (usedCode) {
                        usedCode.status = 'used';
                        if (!usedCode.usedInSales) usedCode.usedInSales = [];
                        usedCode.usedInSales.push(invoiceNum);
                    }
                }
            }

            const newSale = {
                id: newSaleId,
                date,
                invoice: invoiceNum,
                customer: customerName,
                customerId,
                services: servicesText,
                servicesList,
                amount: `QR ${total.toFixed(2)}`,
                referral: referralCode || null,
                commission,
                discount
            };

            sales.push(newSale);

            // Save all data
            saveData();

            // Send notification if there's a referral
            if (referralCode && commission) {
                try {
                    const referrer = customers.find(c => c.affiliateCode === referralCode);
                    if (referrer) {
                        const response = await fetch('http://localhost:3000/send-whatsapp', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                toPhone: referrer.phone,
                                commission: commission.replace('QR ', ''),
                                balance: referrer.accountBalance.toFixed(2)
                            })
                        });

                        if (!response.ok) {
                            console.log('Failed to send referral notification');
                        }
                    }
                } catch (error) {
                    console.error('Error sending referral notification:', error);
                }
            }

            // Reset form
            form.reset();
            customerNameInput.value = '';
            document.getElementById('sale-date').value = new Date().toISOString().split('T')[0];
            totalSpan.textContent = '0.00';

            hideModal(modalId);
            renderSalesTable();
            renderCustomerTable();
            renderReferralsTable();
            renderCodesTable();
            updateCodesCount();
            showAlert('Sale saved successfully.');
        });
    }
    // Trigger New Sale Modal
    document.getElementById('new-sale-btn').addEventListener('click', function() {
        initNewSaleModal();
        showModal('new-sale-modal');
    });
    // Close New Sale Modal
    document.getElementById('close-new-sale-modal').addEventListener('click', () => hideModal('new-sale-modal'));
    document.getElementById('cancel-new-sale').addEventListener('click', () => hideModal('new-sale-modal'));

    // Close Edit Sale Modal
    document.getElementById('close-edit-sale-modal').addEventListener('click', () => hideModal('edit-sale-modal'));
    document.getElementById('cancel-edit-sale').addEventListener('click', () => hideModal('edit-sale-modal'));

    // Calculate total function (moved outside initEditSaleModal for global access)
    function calculateEditTotal() {
        const servicesContainer = document.getElementById('edit-sale-services-container');
        const discountInput = document.getElementById('edit-sale-discount');
        const totalSpan = document.getElementById('edit-sale-total');

        if (!servicesContainer || !discountInput || !totalSpan) return;

        let subtotal = 0;
        servicesContainer.querySelectorAll('.service-row').forEach(div => {
            const price = parseFloat(div.querySelector('[name="service-price"]').value) || 0;
            const qty = parseInt(div.querySelector('[name="service-quantity"]').value) || 1;
            subtotal += price * qty;
        });
        const discount = parseFloat(discountInput.value) || 0;
        totalSpan.textContent = (subtotal - discount).toFixed(2);
    }

    // Initialize Edit Sale Modal
    function initEditSaleModal() {
        const modalId = 'edit-sale-modal';
        const form = document.getElementById('edit-sale-form');
        const servicesContainer = document.getElementById('edit-sale-services-container');
        const addServiceBtn = document.getElementById('edit-add-service-btn');
        const discountInput = document.getElementById('edit-sale-discount');
        const totalSpan = document.getElementById('edit-sale-total');

        // Add service button functionality
        addServiceBtn.addEventListener('click', function() {
            const newDiv = document.createElement('div');
            newDiv.className = 'grid grid-cols-1 md:grid-cols-12 gap-4 service-row';
            newDiv.innerHTML = `
                <div class="md:col-span-5">
                    <input type="text" name="service-name" placeholder="Service description" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 form-input" aria-label="Service Description">
                </div>
                <div class="md:col-span-3">
                    <input type="number" name="service-price" placeholder="Price" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 form-input" aria-label="Service Price">
                </div>
                <div class="md:col-span-3">
                    <input type="number" name="service-quantity" placeholder="Qty" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 form-input" value="1" aria-label="Service Quantity">
                </div>
                <div class="md:col-span-1 flex items-center justify-center">
                    <button type="button" class="remove-service-btn text-red-500 hover:text-red-700 transition-colors" aria-label="Remove Service">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            servicesContainer.appendChild(newDiv);
            newDiv.querySelectorAll('input').forEach(input => input.addEventListener('input', calculateEditTotal));
            newDiv.querySelector('.remove-service-btn').addEventListener('click', function() {
                newDiv.remove();
                calculateEditTotal();
            });
        });

        // Discount input listener
        discountInput.addEventListener('input', calculateEditTotal);

        // Form submit handler
        form.addEventListener('submit', function(e) {
            e.preventDefault();

            const saleId = parseInt(document.getElementById('edit-sale-id').value);
            const customerName = document.getElementById('edit-customer-name').value.trim();
            const customerPhone = document.getElementById('edit-customer-phone').value.trim();
            const productName = document.getElementById('edit-product-name').value.trim();
            const saleAmount = parseFloat(document.getElementById('edit-sale-amount').value);
            const affiliateCode = document.getElementById('edit-affiliate-code').value.trim();
            const saleDate = document.getElementById('edit-sale-date').value;
            const discount = parseFloat(document.getElementById('edit-sale-discount').value) || 0;
            const notes = document.getElementById('edit-notes').value.trim();

            if (!customerName || !customerPhone || !productName || isNaN(saleAmount) || saleAmount <= 0 || !saleDate) {
                showAlert('Please fill in all required fields with valid values.');
                return;
            }

            // Find the sale to update
            const saleIndex = sales.findIndex(s => s.id === saleId);
            if (saleIndex === -1) {
                showAlert('Sale not found.');
                return;
            }

            const oldSale = sales[saleIndex];
            const oldAmount = parseFloat(oldSale.amount.replace('QR ', ''));
            const oldDiscount = oldSale.discount || 0;

            // Collect services
            const serviceRows = servicesContainer.querySelectorAll('.service-row');
            const servicesList = [];
            serviceRows.forEach(row => {
                const name = row.querySelector('[name="service-name"]').value.trim();
                const price = parseFloat(row.querySelector('[name="service-price"]').value) || 0;
                const quantity = parseInt(row.querySelector('[name="service-quantity"]').value) || 1;
                if (name && price > 0 && quantity > 0) {
                    servicesList.push({ name, price, quantity });
                }
            });

            if (servicesList.length === 0) {
                showAlert('Please add at least one valid service.');
                return;
            }

            const servicesText = servicesList.map(s => s.name).join(', ');
            const total = servicesList.reduce((sum, service) => sum + (service.price * service.quantity), 0) - discount;

            if (total < 0) {
                showAlert('Total cannot be negative.');
                return;
            }

            // Handle commission adjustments if referral changed
            let commission = null;
            if (affiliateCode) {
                const commissionAmount = total * (commissionRate / 100);
                commission = `QR ${commissionAmount.toFixed(2)}`;

                // If referral changed, adjust commissions
                if (oldSale.referral !== affiliateCode) {
                    // Reverse old commission if it existed
                    if (oldSale.referral && oldSale.commission) {
                        const oldCommissionAmount = parseFloat(oldSale.commission.replace('QR ', ''));
                        const referrer = customers.find(c => c.affiliateCode === oldSale.referral);
                        if (referrer) {
                            referrer.accountBalance -= oldCommissionAmount;
                            const refIndex = referrals.findIndex(r => r.code === oldSale.referral);
                            if (refIndex !== -1) {
                                referrals[refIndex].totalSales = `QR ${(parseFloat(referrals[refIndex].totalSales.replace('QR ', '')) - oldAmount + oldDiscount).toFixed(2)}`;
                                referrals[refIndex].commissionEarned = `QR ${(parseFloat(referrals[refIndex].commissionEarned.replace('QR ', '')) - oldCommissionAmount).toFixed(2)}`;
                            }
                        }
                    }

                    // Add new commission
                    const newReferrer = customers.find(c => c.affiliateCode === affiliateCode);
                    if (newReferrer) {
                        newReferrer.accountBalance += commissionAmount;
                        const refIndex = referrals.findIndex(r => r.code === affiliateCode);
                        if (refIndex !== -1) {
                            referrals[refIndex].totalSales = `QR ${(parseFloat(referrals[refIndex].totalSales.replace('QR ', '')) + total).toFixed(2)}`;
                            referrals[refIndex].commissionEarned = `QR ${(parseFloat(referrals[refIndex].commissionEarned.replace('QR ', '')) + commissionAmount).toFixed(2)}`;
                        }
                    }
                } else if (oldAmount !== total) {
                    // Same referral, but amount changed - adjust commission
                    const oldCommissionAmount = oldSale.commission ? parseFloat(oldSale.commission.replace('QR ', '')) : 0;
                    const commissionDiff = commissionAmount - oldCommissionAmount;

                    const referrer = customers.find(c => c.affiliateCode === affiliateCode);
                    if (referrer) {
                        referrer.accountBalance += commissionDiff;
                        const refIndex = referrals.findIndex(r => r.code === affiliateCode);
                        if (refIndex !== -1) {
                            const currentSales = parseFloat(referrals[refIndex].totalSales.replace('QR ', ''));
                            const currentCommission = parseFloat(referrals[refIndex].commissionEarned.replace('QR ', ''));
                            referrals[refIndex].totalSales = `QR ${(currentSales - oldAmount + oldDiscount + total - discount).toFixed(2)}`;
                            referrals[refIndex].commissionEarned = `QR ${(currentCommission - oldCommissionAmount + commissionAmount).toFixed(2)}`;
                        }
                    }
                }
            } else if (oldSale.referral && oldSale.commission) {
                // Referral removed - reverse commission
                const oldCommissionAmount = parseFloat(oldSale.commission.replace('QR ', ''));
                const referrer = customers.find(c => c.affiliateCode === oldSale.referral);
                if (referrer) {
                    referrer.accountBalance -= oldCommissionAmount;
                    const refIndex = referrals.findIndex(r => r.code === oldSale.referral);
                    if (refIndex !== -1) {
                        referrals[refIndex].totalSales = `QR ${(parseFloat(referrals[refIndex].totalSales.replace('QR ', '')) - oldAmount + oldDiscount).toFixed(2)}`;
                        referrals[refIndex].commissionEarned = `QR ${(parseFloat(referrals[refIndex].commissionEarned.replace('QR ', '')) - oldCommissionAmount).toFixed(2)}`;
                    }
                }
            }

            // Update the sale
            sales[saleIndex] = {
                ...oldSale,
                customer: customerName,
                services: servicesText,
                servicesList,
                amount: `QR ${total.toFixed(2)}`,
                referral: affiliateCode || null,
                commission,
                discount,
                date: saleDate
            };

            // Update customer info if changed
            if (oldSale.customerId) {
                const customer = customers.find(c => c.id === oldSale.customerId);
                if (customer) {
                    customer.name = customerName;
                    // Update phone if it changed
                    const phoneCustomer = customers.find(c => c.phone === customerPhone);
                    if (phoneCustomer && phoneCustomer.id !== oldSale.customerId) {
                        showAlert('Phone number already exists for another customer.');
                        return;
                    }
                    customer.phone = customerPhone;
                }
            }

            // Save data
            saveData();

            // Close modal and refresh
            hideModal(modalId);
            renderSalesTable();
            renderCustomerTable();
            renderReferralsTable();
            renderCodesTable();
            updateCodesCount();
            showAlert('Sale updated successfully.');
        });
    }

    // Initialize both modals early
    initNewSaleModal();
    initEditSaleModal();
    // Render Referrals Table with Status Dropdown
    const referralsTableBody = document.getElementById('referrals-table-body');
    referralsTableBody.addEventListener('change', function(event) {
        if (event.target.classList.contains('status-select')) {
            const referralId = parseInt(event.target.getAttribute('data-referral-id'));
            const newStatus = event.target.value;
            const referral = referrals.find(r => r.id === referralId);
            if (referral) {
                referral.status = newStatus;
                saveData();
                showAlert(`Status updated to ${newStatus} for ${referral.referrer}.`);
            }
        }
    });
    function renderReferralsTable(data = referrals) {
        referralsTableBody.innerHTML = '';
        if (data.length === 0) {
            referralsTableBody.innerHTML = `<tr><td colspan="5" class="py-4 text-center text-gray-500">No referrals found</td></tr>`;
            return;
        }
        data.forEach(referral => {
            const row = document.createElement('tr');
            row.className = 'table-row border-b';
            row.innerHTML = `
                <td class="py-3 px-4 text-sm text-gray-700">${referral.referrer}</td>
                <td class="py-3 px-4 text-sm text-gray-700">${referral.code}</td>
                <td class="py-3 px-4 text-sm text-gray-700">${referral.totalReferrals}</td>
                <td class="py-3 px-4 text-sm text-gray-700">${referral.totalSales}</td>
                <td class="py-3 px-4 text-sm text-gray-700">${referral.commissionEarned}</td>
            `;
            referralsTableBody.appendChild(row);
        });
    }
    // Commission Update
    document.getElementById('update-commission-btn').addEventListener('click', function() {
        commissionRate = parseFloat(document.getElementById('commission-rate').value) || 3;
        saveData(); // This will save to Firestore
        showAlert('Commission rate updated.');
    });
    // Simulated WhatsApp Notification
    function sendNotification(type, data) {
        console.log(`Simulated sending ${type} notification:`, data);
        showAlert(`Simulated ${type} notification sent. Check console for details.`);
    }
    // Invoice Generation
    function generateInvoice(sale) {
        const invoiceWindow = window.open('', '_blank');
        invoiceWindow.document.write(`
            <html>
            <head>
                <title>Invoice ${sale.invoice}</title>
                <style>
                    body { font-family: Arial, sans-serif; background-color: white; }
                    .invoice { margin: 20px; }
                    .header { text-align: center; }
                    .details { margin-top: 20px; }
                    .services { margin-top: 20px; }
                    .total { margin-top: 20px; font-weight: bold; }
                </style>
            </head>
            <body>
                <div class="invoice">
                    <div class="header">
                        <h1>Invoice ${sale.invoice}</h1>
                        <p>Date: ${sale.date}</p>
                    </div>
                    <div class="details">
                        <p>Customer: ${sale.customer}</p>
                        <p>Referral Code: ${sale.referral || 'N/A'}</p>
                    </div>
                    <div class="services">
                        <h2>Services</h2>
                        <ul>
                            ${sale.servicesList.map(s => `<li>${s.name} - QR ${s.price} x ${s.quantity}</li>`).join('')}
                        </ul>
                    </div>
                    <div class="total">
                        <p>Discount: QR ${sale.discount}</p>
                        <p>Total: ${sale.amount}</p>
                    </div>
                </div>
            </body>
            </html>
        `);
        invoiceWindow.document.close();
    }
    // Real-time data updates are handled by Firestore snapshots
    // No need for localStorage event listener since we're using Firestore
    // Initial Render (now called after load in loadDataFromFirestore)
    // Pagination Controls
    document.getElementById('prev-customer-page').addEventListener('click', () => {
        if (currentCustomerPage > 1) {
            currentCustomerPage--;
            renderCustomerTable(customers, currentCustomerPage);
        }
    });
    document.getElementById('next-customer-page').addEventListener('click', () => {
        if (currentCustomerPage < Math.ceil(customers.length / customersPerPage)) {
            currentCustomerPage++;
            renderCustomerTable(customers, currentCustomerPage);
        }
    });
    document.getElementById('prev-sales-page').addEventListener('click', () => {
        if (currentSalesPage > 1) {
            currentSalesPage--;
            renderSalesTable(sales, currentSalesPage);
        }
    });
    document.getElementById('next-sales-page').addEventListener('click', () => {
        if (currentSalesPage < Math.ceil(sales.length / salesPerPage)) {
            currentSalesPage++;
            renderSalesTable(sales, currentSalesPage);
        }
    });
    // Affiliate Codes Integration in Referral Program Tab
    const generateCodesBtn = document.getElementById('generate-codes-btn');
    const generateSingleBtn = document.getElementById('generate-single-btn');
    const codesTableBody = document.getElementById('codes-table-body');
    const codesCount = document.getElementById('codes-count');
    const searchCodesInput = document.getElementById('search-codes');
    const copyAllTodayBtn = document.getElementById('copy-all-today-btn');
    const filterDateFrom = document.getElementById('filter-date-from');
    const filterDateTo = document.getElementById('filter-date-to');
    const clearDateFilterBtn = document.getElementById('clear-date-filter-btn');
    let currentPage = 1;
    const codesPerPage = 10;
    // --- Helper: Get today's date string (YYYY-MM-DD) ---
    function getTodayStr() {
        const d = new Date();
        return d.toISOString().split('T')[0];
    }
    // --- Filtering State ---
    let filterDateRange = { from: getTodayStr(), to: getTodayStr() };
    // --- Generate Codes (unchanged, but ensure createdAt is set) ---
    generateCodesBtn.addEventListener('click', () => generateCodes(100));
    generateSingleBtn.addEventListener('click', () => generateCodes(1));
    function generateCodes(n) {
        const newCodes = [];
        const existingCodes = new Set(affiliateCodes.map(code => code.code));
        for (let i = 0; i < n; i++) {
            let code;
            do {
                code = 'AFF' + Math.random().toString(36).substring(2, 6).toUpperCase();
            } while (existingCodes.has(code));
            newCodes.push({
                id: affiliateCodes.length + newCodes.length + 1,
                code: code,
                status: 'available',
                createdAt: getTodayStr(),
                usedInSales: []
            });
            existingCodes.add(code);
        }
        affiliateCodes = [...affiliateCodes, ...newCodes];
        saveData(); // Save to Firestore
        // After generation, reset filter to today
        filterDateRange = { from: getTodayStr(), to: getTodayStr() };
        filterDateFrom.value = filterDateRange.from;
        filterDateTo.value = filterDateRange.to;
        renderCodesTable();
        updateCodesCount();
        showAlert(`Successfully generated ${n} new affiliate code${n > 1 ? 's' : ''}!`);
    }
    // --- Date Filtering Controls ---
    // Set default filter to today on load
    filterDateFrom.value = getTodayStr();
    filterDateTo.value = getTodayStr();
    // Listen for date changes
    filterDateFrom.addEventListener('change', function() {
        filterDateRange.from = filterDateFrom.value;
        renderCodesTable();
    });
    filterDateTo.addEventListener('change', function() {
        filterDateRange.to = filterDateTo.value;
        renderCodesTable();
    });
    clearDateFilterBtn.addEventListener('click', function() {
        filterDateRange = { from: getTodayStr(), to: getTodayStr() };
        filterDateFrom.value = filterDateRange.from;
        filterDateTo.value = filterDateRange.to;
        renderCodesTable();
    });
    // --- Copy All Today's Codes Button ---
    function updateCopyAllTodayBtn() {
        // Only enable if there are codes for today
        const todayCodes = affiliateCodes.filter(code => code.createdAt === getTodayStr());
        copyAllTodayBtn.disabled = todayCodes.length === 0;
        copyAllTodayBtn.setAttribute('aria-disabled', todayCodes.length === 0 ? 'true' : 'false');
        copyAllTodayBtn.title = todayCodes.length === 0 ? 'No codes generated today to copy.' : 'Copy all affiliate codes generated today';
    }
    copyAllTodayBtn.addEventListener('click', function() {
        const todayCodes = affiliateCodes.filter(code => code.createdAt === getTodayStr());
        if (todayCodes.length === 0) {
            showAlert('No codes generated today to copy.');
            return;
        }
        const codeList = todayCodes.map(c => c.code).join('\n');
        // Clipboard API
        navigator.clipboard.writeText(codeList).then(() => {
            // Visual feedback: change icon to checkmark
            const icon = copyAllTodayBtn.querySelector('i');
            const originalIcon = icon.className;
            icon.className = 'fas fa-check mr-2 text-green-500';
            showAlert("All today's codes copied to clipboard!");
            setTimeout(() => {
                icon.className = originalIcon; }, 2000);
        }).catch(() => {
            showAlert('Failed to copy codes. Try again or check browser permissions.');
        });
    });
    // --- Search Input ---
    searchCodesInput.addEventListener('input', () => {
        currentPage = 1;
        renderCodesTable();
    });
    // --- Pagination Controls (unchanged) ---
    document.getElementById('first-page').addEventListener('click', () => {
        currentPage = 1;
        renderCodesTable();
    });
    document.getElementById('prev-page').addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderCodesTable();
        }
    });
    document.getElementById('next-page').addEventListener('click', () => {
        if (currentPage < Math.ceil(filteredCodes().length / codesPerPage)) {
            currentPage++;
            renderCodesTable();
        }
    });
    document.getElementById('last-page').addEventListener('click', () => {
        const totalPages = Math.ceil(filteredCodes().length / codesPerPage);
        if (totalPages > 0) {
            currentPage = totalPages;
            renderCodesTable();
        }
    });
    // --- Filtering Logic ---
    function filteredCodes() {
        // Filter by date range
        let codes = affiliateCodes;
        if (filterDateRange.from && filterDateRange.to) {
            const fromDate = new Date(filterDateRange.from);
            const toDate = new Date(filterDateRange.to);
            codes = codes.filter(code => {
                const codeDate = new Date(code.createdAt);
                // Inclusive range
                return codeDate >= fromDate && codeDate <= toDate;
            });
        } else if (filterDateRange.from) {
            const fromDate = new Date(filterDateRange.from);
            codes = codes.filter(code => new Date(code.createdAt) >= fromDate);
        } else if (filterDateRange.to) {
            const toDate = new Date(filterDateRange.to);
            codes = codes.filter(code => new Date(code.createdAt) <= toDate);
        } else {
            // Default: today only
            codes = codes.filter(code => code.createdAt === getTodayStr());
        }
        // Keyword search
        const searchTerm = searchCodesInput.value.toLowerCase();
        if (searchTerm) {
            codes = codes.filter(code => code.code.toLowerCase().includes(searchTerm));
        }
        return codes;
    }
    // --- Render affiliate codes table with filtering and pagination ---
    function renderCodesTable() {
        const codes = filteredCodes();
        const startIndex = (currentPage - 1) * codesPerPage;
        const endIndex = startIndex + codesPerPage;
        const paginatedCodes = codes.slice(startIndex, endIndex);
        codesTableBody.innerHTML = '';
        updateCopyAllTodayBtn();
        if (paginatedCodes.length === 0) {
            codesTableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="py-4 text-center text-gray-500">
                        ${codes.length === 0
                            ? (filterDateRange.from !== getTodayStr() || filterDateRange.to !== getTodayStr()
                                ? 'No codes found for the selected date(s). Generate new ones or try another date.'
                                : 'No affiliate codes available. Generate some codes to get started.')
                            : 'No codes found matching your search'}
                    </td>
                </tr>
            `;
            updatePaginationControls(codes.length);
            return;
        }
        paginatedCodes.forEach((affiliateCode, index) => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-100';
            row.innerHTML = `
                <td class="py-3 px-4 border-b">${startIndex + index + 1}</td>
                <td class="py-3 px-4 border-b font-mono font-bold">${affiliateCode.code}</td>
                <td class="py-3 px-4 border-b">
                    <span class="px-2 py-1 rounded-full text-xs ${affiliateCode.status === 'available' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">
                        ${affiliateCode.status.charAt(0).toUpperCase() + affiliateCode.status.slice(1)}
                    </span>
                </td>
                <td class="py-3 px-4 border-b">${affiliateCode.usedInSales.length} sale(s)</td>
                <td class="py-3 px-4 border-b">
                    <button class="copy-code-btn text-primary hover:text-blue-700" data-code="${affiliateCode.code}" aria-label="Copy code ${affiliateCode.code}">
                        <i class="fas fa-copy"></i>
                    </button>
                </td>
            `;
            codesTableBody.appendChild(row);
        });
        // Add event listeners for copy buttons
        document.querySelectorAll('.copy-code-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const code = e.currentTarget.getAttribute('data-code');
                navigator.clipboard.writeText(code).then(() => {
                    // Show visual feedback
                    const icon = e.currentTarget.querySelector('i');
                    const originalIcon = icon.className;
                    icon.className = 'fas fa-check text-green-500';
                    setTimeout(() => {
                        icon.className = originalIcon;
                    }, 2000);
                });
            });
        });
    }
    // --- Update pagination controls (unchanged except for filteredCodes) ---
    function updatePaginationControls(totalCodes) {
        const totalPages = Math.ceil(totalCodes / codesPerPage);
        document.getElementById('first-page').disabled = currentPage === 1;
        document.getElementById('prev-page').disabled = currentPage === 1;
        document.getElementById('next-page').disabled = currentPage === totalPages || totalPages === 0;
        document.getElementById('last-page').disabled = currentPage === totalPages || totalPages === 0;
        document.getElementById('page-info').textContent =
            `Page ${totalPages === 0 ? 0 : currentPage} of ${totalPages}`;
    }
    // --- Update codes count display (unchanged) ---
    function updateCodesCount() {
        const availableCount = affiliateCodes.filter(code => code.status === 'available').length;
        codesCount.textContent = `${affiliateCodes.length} codes total (${availableCount} available)`;
    }
    // --- Initial render for affiliate codes ---
    renderCodesTable();
    updateCodesCount();
    
    // Initialize Affiliate Chart
    function initAffiliateChart() {
        const ctx = document.getElementById('affiliate-chart').getContext('2d');
        
        // Group affiliate code usage by date
        const usageByDate = {};
        affiliateCodes.forEach(code => {
            if (code.usedInSales && code.usedInSales.length > 0) {
                // For each sale that used this code, find the sale date
                code.usedInSales.forEach(saleInvoice => {
                    const sale = sales.find(s => s.invoice === saleInvoice);
                    if (sale) {
                        const date = sale.date;
                        usageByDate[date] = (usageByDate[date] || 0) + 1;
                    }
                });
            }
        });
        
        // Sort dates and prepare data for last 30 days
        const last30Days = [];
        const today = moment();
        for (let i = 29; i >= 0; i--) {
            const date = today.clone().subtract(i, 'days').format('YYYY-MM-DD');
            last30Days.push({
                date: date,
                count: usageByDate[date] || 0,
                label: today.clone().subtract(i, 'days').format('MMM DD')
            });
        }
        
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: last30Days.map(d => d.label),
                data: last30Days.map(d => d.count),
                datasets: [{
                    label: 'Affiliate Codes Used',
                    data: last30Days.map(d => d.count),
                    backgroundColor: 'rgba(59, 130, 246, 0.5)',
                    borderColor: 'rgba(59, 130, 246, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Affiliate Code Usage - Last 30 Days'
                    },
                    legend: {
                        display: false
                    }
                }
            }
        });
    }
    
    // Initialize chart after data loads
    setTimeout(() => {
        if (window.Chart) {
            initAffiliateChart();
        }
    }, 1000);
});
