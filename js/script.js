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

// Show alert function for user notifications
function showAlert(message) {
    // Create alert element if it doesn't exist
    let alertElement = document.getElementById('custom-alert');
    if (!alertElement) {
        alertElement = document.createElement('div');
        alertElement.id = 'custom-alert';
        alertElement.className = 'fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 max-w-sm';
        alertElement.style.display = 'none';
        document.body.appendChild(alertElement);
    }

    // Set message and show
    alertElement.textContent = message;
    alertElement.style.display = 'block';

    // Auto-hide after 3 seconds
    setTimeout(() => {
        alertElement.style.display = 'none';
    }, 3000);
}

// Sample Data (moved outside DOMContentLoaded so it's available globally)
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

// Global variables for table rendering
let customers = [];
let sales = [];
let referrals = [];
let affiliateCodes = [];
let commissionRate = 3;

// Global variables for pagination
let currentCustomerPage = 1;
let currentSalesPage = 1;
let currentPage = 1;
const customersPerPage = 10;
const salesPerPage = 10;
const codesPerPage = 10;

// Global variables for filtering
let filterDateRange = { from: '', to: '' };
let searchTerm = ''; // Add search term variable

// Render Customer Table with Pagination and Sorting
function renderCustomerTable(data = customers, page = 1) {
    const customerTableBody = document.getElementById('customer-table-body');
    if (!customerTableBody) return; // Guard clause for when DOM isn't ready

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

    // Update pagination info if elements exist
    const customerCount = document.getElementById('customer-count');
    const customerPageInfo = document.getElementById('customer-page-info');
    const prevCustomerPage = document.getElementById('prev-customer-page');
    const nextCustomerPage = document.getElementById('next-customer-page');

    if (customerCount) customerCount.textContent = `${data.length} customers found`;
    if (customerPageInfo) customerPageInfo.textContent = `Page ${page} of ${Math.ceil(data.length / customersPerPage)}`;
    if (prevCustomerPage) prevCustomerPage.disabled = page === 1;
    if (nextCustomerPage) nextCustomerPage.disabled = end >= data.length;
}

// Render Sales Table with Pagination and Sorting
function renderSalesTable(data = sales, page = 1) {
    const salesTableBody = document.getElementById('sales-table-body');
    if (!salesTableBody) return; // Guard clause for when DOM isn't ready

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

    // Update pagination info if elements exist
    const salesCount = document.getElementById('sales-count');
    const salesPageInfo = document.getElementById('sales-page-info');
    const prevSalesPage = document.getElementById('prev-sales-page');
    const nextSalesPage = document.getElementById('next-sales-page');

    if (salesCount) salesCount.textContent = `${data.length} sales found`;
    if (salesPageInfo) salesPageInfo.textContent = `Page ${page} of ${Math.ceil(data.length / salesPerPage)}`;
    if (prevSalesPage) prevSalesPage.disabled = page === 1;
    if (nextSalesPage) nextSalesPage.disabled = end >= data.length;
}

// Render Referrals Table
function renderReferralsTable(data = referrals) {
    const referralsTableBody = document.getElementById('referrals-table-body');
    if (!referralsTableBody) return; // Guard clause for when DOM isn't ready

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

// Render Codes Table
function renderCodesTable() {
    const codesTableBody = document.getElementById('codes-table-body');
    if (!codesTableBody) return; // Guard clause for when DOM isn't ready

    const codes = filteredCodes();
    const startIndex = (currentPage - 1) * codesPerPage;
    const endIndex = startIndex + codesPerPage;
    const paginatedCodes = codes.slice(startIndex, endIndex);
    codesTableBody.innerHTML = '';

    // Update copy button if it exists
    updateCopyAllTodayBtn();

    if (paginatedCodes.length === 0) {
        const isSearching = searchTerm && searchTerm.length > 0;
        const isFiltering = filterDateRange.from || filterDateRange.to;
        
        let message = '';
        if (isSearching && isFiltering) {
            message = `No codes found matching "${searchTerm}" within the selected date range.`;
        } else if (isSearching) {
            message = `No codes found matching "${searchTerm}". Try a different search term.`;
        } else if (isFiltering) {
            message = 'No codes found for the selected date range. Try adjusting the dates.';
        } else {
            message = 'No affiliate codes available. Generate some codes to get started.';
        }
        
        codesTableBody.innerHTML = `
            <tr>
                <td colspan="5" class="py-8 text-center text-gray-500">
                    <div class="flex flex-col items-center space-y-2">
                        <i class="fas fa-search text-gray-300 text-2xl mb-2"></i>
                        <p>${message}</p>
                        ${isSearching || isFiltering ? '<button onclick="clearAllFilters()" class="text-blue-600 hover:text-blue-800 text-sm mt-2"><i class="fas fa-times mr-1"></i> Clear all filters</button>' : ''}
                    </div>
                </td>
            </tr>
        `;
        updatePaginationControls(codes.length);
        updateCodesCount();
        return;
    }

    paginatedCodes.forEach((affiliateCode, index) => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-100 transition-colors';
        
        // Highlight search matches
        let codeDisplay = affiliateCode.code;
        let statusDisplay = affiliateCode.status;
        
        if (searchTerm && searchTerm.length > 0) {
            const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
            codeDisplay = codeDisplay.replace(regex, '<mark class="bg-yellow-200 font-bold">$1</mark>');
            statusDisplay = statusDisplay.replace(regex, '<mark class="bg-yellow-200 font-bold">$1</mark>');
        }
        
        row.innerHTML = `
            <td class="py-3 px-4 border-b">${startIndex + index + 1}</td>
            <td class="py-3 px-4 border-b font-mono font-bold">${codeDisplay}</td>
            <td class="py-3 px-4 border-b">
                <span class="px-2 py-1 rounded-full text-xs ${affiliateCode.status === 'available' ? 'bg-green-100 text-green-800' : affiliateCode.status === 'assigned' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}">
                    ${statusDisplay.charAt(0).toUpperCase() + statusDisplay.slice(1)}
                </span>
            </td>
            <td class="py-3 px-4 border-b">
                <span class="text-sm ${affiliateCode.usedInSales && affiliateCode.usedInSales.length > 0 ? 'text-blue-600 font-medium' : 'text-gray-500'}">
                    ${affiliateCode.usedInSales ? affiliateCode.usedInSales.length : 0} sale(s)
                </span>
            </td>
            <td class="py-3 px-4 border-b">
                <div class="flex items-center space-x-2">
                    <button class="copy-code-btn text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition-colors" data-code="${affiliateCode.code}" aria-label="Copy code ${affiliateCode.code}" title="Copy code to clipboard">
                        <i class="fas fa-copy"></i>
                    </button>
                    ${affiliateCode.usedInSales && affiliateCode.usedInSales.length > 0 ? 
                        `<button class="view-usage-btn text-green-600 hover:text-green-800 p-1 rounded hover:bg-green-50 transition-colors" data-code="${affiliateCode.code}" aria-label="View usage details" title="View usage details">
                            <i class="fas fa-eye"></i>
                        </button>` : ''}
                </div>
            </td>
        `;
        codesTableBody.appendChild(row);
    });

    // Update pagination controls and count
    updatePaginationControls(codes.length);
    updateCodesCount();

    // Add event listeners for action buttons
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
                
                // Show toast notification
                showAlert(`Code "${code}" copied to clipboard!`);
            }).catch(() => {
                showAlert('Failed to copy code. Please try again.');
            });
        });
    });

    // Add event listeners for view usage buttons
    document.querySelectorAll('.view-usage-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const code = e.currentTarget.getAttribute('data-code');
            const affiliateCode = affiliateCodes.find(c => c.code === code);
            if (affiliateCode && affiliateCode.usedInSales) {
                const usageDetails = affiliateCode.usedInSales.join(', ');
                showAlert(`Code "${code}" used in: ${usageDetails}`);
            }
        });
    });
}

// Helper functions for codes table
function getTodayStr() {
    const d = new Date();
    return d.toISOString().split('T')[0];
}

function filteredCodes() {
    // Start with all codes
    let codes = [...affiliateCodes];
    
    // First apply date filtering (if no specific date range, don't filter by date)
    if (filterDateRange.from || filterDateRange.to) {
        if (filterDateRange.from && filterDateRange.to) {
            const fromDate = new Date(filterDateRange.from);
            const toDate = new Date(filterDateRange.to);
            codes = codes.filter(code => {
                if (!code.createdAt) return true; // Include codes without creation date
                const codeDate = new Date(code.createdAt);
                return codeDate >= fromDate && codeDate <= toDate;
            });
        } else if (filterDateRange.from) {
            const fromDate = new Date(filterDateRange.from);
            codes = codes.filter(code => {
                if (!code.createdAt) return true;
                const codeDate = new Date(code.createdAt);
                return codeDate >= fromDate;
            });
        } else if (filterDateRange.to) {
            const toDate = new Date(filterDateRange.to);
            codes = codes.filter(code => {
                if (!code.createdAt) return true;
                const codeDate = new Date(code.createdAt);
                return codeDate <= toDate;
            });
        }
    }

    // Apply search term filtering
    if (searchTerm && searchTerm.length > 0) {
        const term = searchTerm.toLowerCase().trim();
        codes = codes.filter(code => {
            // Search in code
            if (code.code && code.code.toLowerCase().includes(term)) {
                return true;
            }
            
            // Search in status
            if (code.status && code.status.toLowerCase().includes(term)) {
                return true;
            }
            
            // Search in used sales invoices
            if (code.usedInSales && Array.isArray(code.usedInSales)) {
                for (let invoice of code.usedInSales) {
                    if (invoice && invoice.toLowerCase().includes(term)) {
                        return true;
                    }
                }
            }
            
            // Search by number of sales used
            if (code.usedInSales && code.usedInSales.length.toString().includes(term)) {
                return true;
            }
            
            return false;
        });
    }

    return codes;
}

function updateCopyAllTodayBtn() {
    const copyAllTodayBtn = document.getElementById('copy-all-today-btn');
    if (!copyAllTodayBtn) return;

    // Only enable if there are codes for today
    const todayCodes = affiliateCodes.filter(code => code.createdAt === getTodayStr());
    copyAllTodayBtn.disabled = todayCodes.length === 0;
    copyAllTodayBtn.setAttribute('aria-disabled', todayCodes.length === 0 ? 'true' : 'false');
    copyAllTodayBtn.title = todayCodes.length === 0 ? 'No codes generated today to copy.' : 'Copy all affiliate codes generated today';
}

function updatePaginationControls(totalCodes) {
    const totalPages = Math.ceil(totalCodes / codesPerPage);
    const firstPage = document.getElementById('first-page');
    const prevPage = document.getElementById('prev-page');
    const nextPage = document.getElementById('next-page');
    const lastPage = document.getElementById('last-page');
    const pageInfo = document.getElementById('page-info');

    if (firstPage) firstPage.disabled = currentPage === 1;
    if (prevPage) prevPage.disabled = currentPage === 1;
    if (nextPage) nextPage.disabled = currentPage === totalPages || totalPages === 0;
    if (lastPage) lastPage.disabled = currentPage === totalPages || totalPages === 0;
    if (pageInfo) pageInfo.textContent = `Page ${totalPages === 0 ? 0 : currentPage} of ${totalPages}`;
}

function updateCodesCount() {
    const codesCount = document.getElementById('codes-count');
    if (!codesCount) return;

    const filteredCodesList = filteredCodes();
    const availableCount = filteredCodesList.filter(code => code.status === 'available').length;
    const totalFiltered = filteredCodesList.length;
    const totalAll = affiliateCodes.length;

    if (searchTerm || filterDateRange.from || filterDateRange.to) {
        codesCount.textContent = `${totalFiltered} codes found (${availableCount} available) - filtered from ${totalAll} total`;
    } else {
        codesCount.textContent = `${totalAll} codes total (${availableCount} available)`;
    }
}

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

    // Affiliate Codes Search and Filtering
    const searchCodesInput = document.getElementById('search-codes');
    const filterDateFrom = document.getElementById('filter-date-from');
    const filterDateTo = document.getElementById('filter-date-to');
    const clearDateFilterBtn = document.getElementById('clear-date-filter-btn');
    
    // Initialize filter dates to show all codes by default
    filterDateRange = { from: '', to: '' };
    
    // Search input with debouncing for better performance
    let searchTimeout;
    if (searchCodesInput) {
        searchCodesInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                searchTerm = this.value.trim();
                currentPage = 1; // Reset to first page when searching
                renderCodesTable();
                
                // Visual feedback for search
                if (searchTerm) {
                    this.classList.add('border-blue-500', 'bg-blue-50');
                } else {
                    this.classList.remove('border-blue-500', 'bg-blue-50');
                }
            }, 300); // 300ms delay for debouncing
        });
        
        // Clear search on Escape key
        searchCodesInput.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                this.value = '';
                searchTerm = '';
                currentPage = 1;
                this.classList.remove('border-blue-500', 'bg-blue-50');
                renderCodesTable();
            }
        });
    }

    // Date filter controls
    if (filterDateFrom) {
        filterDateFrom.addEventListener('change', function() {
            filterDateRange.from = this.value;
            currentPage = 1;
            renderCodesTable();
        });
    }

    if (filterDateTo) {
        filterDateTo.addEventListener('change', function() {
            filterDateRange.to = this.value;
            currentPage = 1;
            renderCodesTable();
        });
    }

    if (clearDateFilterBtn) {
        clearDateFilterBtn.addEventListener('click', function() {
            filterDateRange = { from: '', to: '' };
            if (filterDateFrom) filterDateFrom.value = '';
            if (filterDateTo) filterDateTo.value = '';
            currentPage = 1;
            renderCodesTable();
        });
    }

    // Add search shortcuts and help
    if (searchCodesInput) {
        searchCodesInput.setAttribute('placeholder', 'Search codes, status, invoices... (Press Esc to clear)');
        searchCodesInput.setAttribute('title', 'Search by: code name, status (available/used), invoice numbers, or number of sales used');
    }
});
