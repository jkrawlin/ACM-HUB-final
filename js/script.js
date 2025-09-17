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
function showAlert(message, type = 'success') {
    // Create alert element if it doesn't exist
    let alertElement = document.getElementById('custom-alert');
    if (!alertElement) {
        alertElement = document.createElement('div');
        alertElement.id = 'custom-alert';
        alertElement.className = 'fixed top-4 right-4 px-4 py-2 rounded-lg shadow-lg z-50 max-w-sm text-white';
        alertElement.style.display = 'none';
        document.body.appendChild(alertElement);
    }

    // Set message, color based on type, and show
    alertElement.textContent = message;
    alertElement.className = `fixed top-4 right-4 px-4 py-2 rounded-lg shadow-lg z-50 max-w-sm text-white ${
        type === 'error' ? 'bg-red-500' : type === 'warning' ? 'bg-yellow-500' : 'bg-green-500'
    }`;
    alertElement.style.display = 'block';

    // Auto-hide after 3 seconds
    setTimeout(() => {
        alertElement.style.display = 'none';
    }, 3000);
}

// Load all data from Firestore on app load
async function loadDataFromFirestore() {
    try {
        showAlert('Loading data from database...', 'info');
        
        // Load customers
        const customersSnapshot = await db.collection('customers').get();
        customers = customersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Load sales
        const salesSnapshot = await db.collection('sales').get();
        sales = salesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Load referrals from Firestore
        const referralsSnapshot = await db.collection('referrals').get();
        referrals = referralsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // If no referrals exist in database, generate them from customer data
        if (referrals.length === 0) {
            await updateReferralsFromData();
        }

        // Load affiliate codes
        const codesSnapshot = await db.collection('affiliateCodes').get();
        affiliateCodes = codesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Render tables
        renderCustomerTable(customers, currentCustomerPage);
        renderSalesTable(sales, currentSalesPage);
        renderReferralsTable(referrals);
        renderCodesTable();

        console.log('Data loaded from Firestore:', {
            customers: customers.length,
            sales: sales.length,
            referrals: referrals.length,
            affiliateCodes: affiliateCodes.length
        });

        showAlert('Data loaded successfully!', 'success');
    } catch (error) {
        console.error('Error loading data:', error);
        showAlert('Failed to load data from Firestore. Starting with empty collections.', 'error');
        // Initialize empty arrays - no fallback data
    }
}

// Save all data to Firestore (call on changes)
async function saveDataToFirestore() {
    try {
        // Save customers
        const batch = db.batch();
        customers.forEach(customer => {
            const docRef = db.collection('customers').doc(customer.id.toString());
            batch.set(docRef, customer);
        });

        // Save sales
        sales.forEach(sale => {
            const docRef = db.collection('sales').doc(sale.id.toString());
            batch.set(docRef, sale);
        });

        // Save affiliate codes
        affiliateCodes.forEach(code => {
            const docRef = db.collection('affiliateCodes').doc(code.id.toString());
            batch.set(docRef, code);
        });

        await batch.commit();
    } catch (error) {
        console.error('Error saving data:', error);
        showAlert('Failed to save data.', 'error');
    }
}

// Update referrals derived data and save to Firestore
async function updateReferralsFromData() {
    try {
        const newReferrals = customers.map(customer => {
            const customerSales = sales.filter(sale => sale.customerId === customer.id);
            const totalSalesAmount = customerSales.reduce((total, sale) => {
                const amount = parseFloat(sale.amount.replace('QR ', '')) || 0;
                return total + amount;
            }, 0);
            
            const totalCommissions = customerSales.reduce((total, sale) => {
                if (sale.commission) {
                    const commission = parseFloat(sale.commission.replace('QR ', '')) || 0;
                    return total + commission;
                }
                return total;
            }, 0);
            
            return {
                id: customer.id,
                referrer: customer.name,
                code: customer.affiliateCode || 'N/A',
                totalReferrals: customer.referredCustomers ? customer.referredCustomers.length : 0,
                referredCustomers: customer.referredCustomers || [],
                totalSales: `QR ${totalSalesAmount.toFixed(2)}`,
                commissionEarned: `QR ${(customer.accountBalance || 0).toFixed(2)}`,
                status: customer.accountBalance > 0 ? 'Pending' : 'N/A',
                updatedAt: new Date().toISOString()
            };
        }).filter(r => r.totalReferrals > 0);

        // Update local referrals array
        referrals = newReferrals;

        // Save to Firestore using batch operation
        if (newReferrals.length > 0) {
            const batch = db.batch();
            
            // Clear existing referrals first
            const existingReferralsSnapshot = await db.collection('referrals').get();
            existingReferralsSnapshot.forEach(doc => {
                batch.delete(doc.ref);
            });

            // Add new referrals
            newReferrals.forEach(referral => {
                const docRef = db.collection('referrals').doc(referral.id.toString());
                batch.set(docRef, referral);
            });

            await batch.commit();
            console.log('Referrals saved to Firestore successfully');
        }
    } catch (error) {
        console.error('Error updating referrals:', error);
        showAlert('Error updating referrals: ' + error.message, 'error');
    }
}

// Sample Data removed - now using Firestore as the only data source
// No fallback data - application will start with empty collections if Firestore is empty

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
let customerSearchTerm = ''; // Customer search term variable

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

    // Add event listeners for customer action buttons
    attachCustomerButtonListeners();

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

    // Add event listeners for sales action buttons
    attachSalesButtonListeners();

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
        
        // Find customer assigned to this code
        const assignedCustomer = customers.find(c => c.affiliateCode === affiliateCode.code);
        
        // Highlight search matches
        let codeDisplay = affiliateCode.code;
        let statusDisplay = affiliateCode.status;
        
        if (searchTerm && searchTerm.length > 0) {
            const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
            codeDisplay = codeDisplay.replace(regex, '<mark class="bg-yellow-200 font-bold">$1</mark>');
            statusDisplay = statusDisplay.replace(regex, '<mark class="bg-yellow-200 font-bold">$1</mark>');
        }
        
        // Determine status color and info
        let statusClass = 'bg-gray-100 text-gray-800';
        let statusInfo = statusDisplay.charAt(0).toUpperCase() + statusDisplay.slice(1);
        
        if (affiliateCode.status === 'available') {
            statusClass = 'bg-green-100 text-green-800';
        } else if (affiliateCode.status === 'assigned' && assignedCustomer) {
            statusClass = 'bg-blue-100 text-blue-800';
            statusInfo = `Assigned to ${assignedCustomer.name}`;
        } else if (affiliateCode.status === 'assigned') {
            statusClass = 'bg-yellow-100 text-yellow-800';
            statusInfo = 'Assigned (customer not found)';
        }
        
        row.innerHTML = `
            <td class="py-3 px-4 border-b">${startIndex + index + 1}</td>
            <td class="py-3 px-4 border-b font-mono font-bold">${codeDisplay}</td>
            <td class="py-3 px-4 border-b">
                <span class="px-2 py-1 rounded-full text-xs ${statusClass}" title="${assignedCustomer ? `Assigned to: ${assignedCustomer.name} (${assignedCustomer.phone})` : statusInfo}">
                    ${statusInfo}
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
                    ${assignedCustomer ? 
                        `<button class="view-customer-btn text-purple-600 hover:text-purple-800 p-1 rounded hover:bg-purple-50 transition-colors" data-customer-id="${assignedCustomer.id}" aria-label="View customer details" title="View assigned customer: ${assignedCustomer.name}">
                            <i class="fas fa-user"></i>
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

    // Add event listeners for view customer buttons
    document.querySelectorAll('.view-customer-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const customerId = parseInt(e.currentTarget.getAttribute('data-customer-id'));
            const customer = customers.find(c => c.id === customerId);
            if (customer) {
                // Switch to customers tab and highlight the customer
                const customersTab = document.querySelector('[data-tab="customers"]');
                const customerTab = document.getElementById('customers');
                
                // Activate customers tab
                document.querySelectorAll('.tab-btn').forEach(btn => {
                    btn.classList.remove('active-tab');
                    btn.setAttribute('aria-selected', 'false');
                });
                customersTab.classList.add('active-tab');
                customersTab.setAttribute('aria-selected', 'true');
                
                document.querySelectorAll('.tab-content').forEach(content => {
                    content.classList.remove('active');
                });
                customerTab.classList.add('active');
                
                showAlert(`Viewing customer: ${customer.name} (${customer.affiliateCode})`);
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

// Updated loadDataFromFirestore function to use only Firestore data
async function loadDataFromFirestore() {
    try {
        // Load customers
        const customersSnapshot = await db.collection('customers').get();
        customers = customersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderCustomerTable();

        // Load sales
        const salesSnapshot = await db.collection('sales').get();
        sales = salesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderSalesTable();

        // Update referrals from customer data
        await updateReferralsFromData();
        renderReferralsTable();

        // Load affiliateCodes
        const codesSnapshot = await db.collection('affiliateCodes').get();
        affiliateCodes = codesSnapshot.docs.map(doc => {
            const code = { id: doc.id, ...doc.data() };
            // Ensure all codes have a creation date
            if (!code.createdAt) {
                code.createdAt = getTodayStr();
            }
            // Ensure usedInSales is an array
            if (!code.usedInSales) {
                code.usedInSales = [];
            }
            return code;
        });
        renderCodesTable();
        updateCodesCount();

        // Load commission rate
        const commissionDoc = await db.collection('settings').doc('commission').get();
        if (commissionDoc.exists) {
            commissionRate = commissionDoc.data().rate || 3;
        } else {
            commissionRate = 3;
            await db.collection('settings').doc('commission').set({ rate: commissionRate });
        }
        const commissionElement = document.getElementById('commission-rate');
        if (commissionElement) {
            commissionElement.value = commissionRate;
        }

        showAlert('Data loaded successfully!');
    } catch (error) {
        console.error('Error loading data:', error);
        showAlert('Error loading data: ' + error.message, 'error');
        // Initialize empty arrays on error - no sample data fallback
        customers = [];
        sales = [];
        affiliateCodes = [];
        referrals = [];
        renderCustomerTable();
        renderSalesTable();
        renderReferralsTable();
        renderCodesTable();
        updateCodesCount();
    }
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
        const customerTableBody = document.getElementById('customer-table-body');
        const salesTableBody = document.getElementById('sales-table-body');
        const referralsTableBody = document.getElementById('referrals-table-body');
        const codesTableBody = document.getElementById('codes-table-body');
        
        if (customerTableBody) customerTableBody.innerHTML = '<tr><td colspan="9" class="py-4 text-center text-gray-500">Login required</td></tr>';
        if (salesTableBody) salesTableBody.innerHTML = '<tr><td colspan="7" class="py-4 text-center text-gray-500">Login required</td></tr>';
        if (referralsTableBody) referralsTableBody.innerHTML = '<tr><td colspan="5" class="py-4 text-center text-gray-500">Login required</td></tr>';
        if (codesTableBody) codesTableBody.innerHTML = '<tr><td colspan="5" class="py-4 text-center text-gray-500">Login required</td></tr>';
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

    // Pagination event listeners for affiliate codes
    const firstPageBtn = document.getElementById('first-page');
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    const lastPageBtn = document.getElementById('last-page');

    if (firstPageBtn) {
        firstPageBtn.addEventListener('click', function() {
            currentPage = 1;
            renderCodesTable();
        });
    }

    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', function() {
            if (currentPage > 1) {
                currentPage--;
                renderCodesTable();
            }
        });
    }

    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', function() {
            const totalPages = Math.ceil(filteredCodes().length / codesPerPage);
            if (currentPage < totalPages) {
                currentPage++;
                renderCodesTable();
            }
        });
    }

    if (lastPageBtn) {
        lastPageBtn.addEventListener('click', function() {
            const totalPages = Math.ceil(filteredCodes().length / codesPerPage);
            currentPage = totalPages || 1;
            renderCodesTable();
        });
    }

    // Generate code buttons event listeners
    const generateSingleBtn = document.getElementById('generate-single-btn');
    const generateCodesBtn = document.getElementById('generate-codes-btn');
    const copyAllTodayBtn = document.getElementById('copy-all-today-btn');

    if (generateSingleBtn) {
        generateSingleBtn.addEventListener('click', function() {
            generateNewCode();
        });
    }

    if (generateCodesBtn) {
        generateCodesBtn.addEventListener('click', function() {
            generateMultipleCodes(100);
        });
    }

    if (copyAllTodayBtn) {
        copyAllTodayBtn.addEventListener('click', function() {
            copyAllTodayCodes();
        });
    }

    // Customer Search Functionality
    const customerSearchInput = document.getElementById('customer-search');
    let customerSearchTimeout;
    let customerSearchTerm = '';
    
    if (customerSearchInput) {
        customerSearchInput.addEventListener('input', function() {
            clearTimeout(customerSearchTimeout);
            customerSearchTimeout = setTimeout(() => {
                customerSearchTerm = this.value.trim();
                currentCustomerPage = 1; // Reset to first page when searching
                
                // Filter customers based on search term
                let filteredCustomers = customers;
                if (customerSearchTerm) {
                    const term = customerSearchTerm.toLowerCase();
                    filteredCustomers = customers.filter(customer => {
                        return (
                            // Search in name
                            customer.name.toLowerCase().includes(term) ||
                            // Search in email
                            (customer.email && customer.email.toLowerCase().includes(term)) ||
                            // Search in phone
                            customer.phone.includes(term) ||
                            // Search in QID
                            (customer.qid && customer.qid.toLowerCase().includes(term)) ||
                            // Search in vehicle plate
                            (customer.vehiclePlate && customer.vehiclePlate.toLowerCase().includes(term)) ||
                            // Search in affiliate code
                            (customer.affiliateCode && customer.affiliateCode.toLowerCase().includes(term))
                        );
                    });
                }
                
                renderCustomerTable(filteredCustomers, currentCustomerPage);
                
                // Visual feedback for search
                if (customerSearchTerm) {
                    this.classList.add('border-blue-500', 'bg-blue-50');
                } else {
                    this.classList.remove('border-blue-500', 'bg-blue-50');
                }
            }, 300); // 300ms delay for debouncing
        });
        
        // Clear search on Escape key
        customerSearchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                this.value = '';
                customerSearchTerm = '';
                currentCustomerPage = 1;
                this.classList.remove('border-blue-500', 'bg-blue-50');
                renderCustomerTable(customers, currentCustomerPage);
            }
        });
        
        // Update placeholder to show affiliate code search capability
        customerSearchInput.setAttribute('placeholder', 'Search by name, email, phone, QID, vehicle plate, affiliate code... (Press Esc to clear)');
        customerSearchInput.setAttribute('title', 'Search customers by: name, email, phone, QID, vehicle plate, or affiliate code');
    }

    // Main action buttons
    const newSaleBtn = document.getElementById('new-sale-btn');
    if (newSaleBtn) {
        newSaleBtn.addEventListener('click', function() {
            showModal('new-sale-modal');
        });
    }

    const addNewCustomerBtn = document.getElementById('add-new-customer-btn');
    if (addNewCustomerBtn) {
        addNewCustomerBtn.addEventListener('click', function() {
            showModal('add-customer-modal');
        });
    }

    const updateCommissionBtn = document.getElementById('update-commission-btn');
    if (updateCommissionBtn) {
        updateCommissionBtn.addEventListener('click', function() {
            const newRate = parseFloat(document.getElementById('commission-rate').value);
            if (newRate >= 0 && newRate <= 100) {
                commissionRate = newRate;
                saveDataToFirestore();
                showAlert('Commission rate updated successfully!');
            } else {
                showAlert('Please enter a valid commission rate (0-100)');
            }
        });
    }

    // Modal close buttons
    document.querySelectorAll('.modal-close, #cancel-edit-customer, #cancel-referred-customers, #cancel-new-sale, #cancel-edit-sale, #cancel-add-customer').forEach(button => {
        button.addEventListener('click', function() {
            const modal = this.closest('.modal-backdrop');
            if (modal) {
                hideModal(modal.id);
            }
        });
    });

    // Form submissions
    const editCustomerForm = document.getElementById('edit-customer-form');
    if (editCustomerForm) {
        editCustomerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveCustomerChanges();
        });
    }

    const addCustomerForm = document.getElementById('add-customer-form');
    if (addCustomerForm) {
        addCustomerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            e.stopPropagation();
            try {
                await addNewCustomer();
            } catch (error) {
                console.error('Error adding customer:', error);
                showAlert('Error adding customer. Please try again.', 'error');
            }
        });
    }

    // Also handle the submit button directly as a fallback
    const saveCustomerBtn = document.getElementById('save-add-customer');
    if (saveCustomerBtn) {
        saveCustomerBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            e.stopPropagation();
            try {
                await addNewCustomer();
            } catch (error) {
                console.error('Error adding customer:', error);
                showAlert('Error adding customer. Please try again.', 'error');
            }
        });
    }

    // Affiliate code assignment lookup functionality
    const lookupAffiliateCodeBtn = document.getElementById('lookup-affiliate-code-btn');
    const affiliateCodeInput = document.getElementById('add-customer-affiliate-code');
    
    if (lookupAffiliateCodeBtn && affiliateCodeInput) {
        // Manual lookup button
        lookupAffiliateCodeBtn.addEventListener('click', function() {
            const code = affiliateCodeInput.value.trim();
            lookupAffiliateCodeForAssignment(code);
        });
        
        // Real-time lookup as user types
        let affiliateCodeTimeout;
        affiliateCodeInput.addEventListener('input', function() {
            clearTimeout(affiliateCodeTimeout);
            const code = this.value.trim();
            
            if (code === '') {
                clearAffiliateCodeFeedback();
                return;
            }
            
            // Debounce the lookup to avoid too many calls
            affiliateCodeTimeout = setTimeout(() => {
                lookupAffiliateCodeForAssignment(code);
            }, 500);
        });
        
        // Clear feedback when input is cleared
        affiliateCodeInput.addEventListener('blur', function() {
            if (this.value.trim() === '') {
                clearAffiliateCodeFeedback();
            }
        });
        
        // Lookup on Enter key
        affiliateCodeInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                lookupAffiliateCodeForAssignment(this.value.trim());
            }
        });
    }

    const newSaleForm = document.getElementById('new-sale-form');
    if (newSaleForm) {
        newSaleForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            e.stopPropagation();
            try {
                await saveNewSale();
            } catch (error) {
                console.error('Error saving sale:', error);
                showAlert('Error saving sale. Please try again.', 'error');
            }
        });
    }

    // Also handle the save sale button directly as a fallback
    const saveNewSaleBtn = document.getElementById('save-new-sale');
    if (saveNewSaleBtn) {
        saveNewSaleBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            e.stopPropagation();
            try {
                await saveNewSale();
            } catch (error) {
                console.error('Error saving sale:', error);
                showAlert('Error saving sale. Please try again.', 'error');
            }
        });
    }

    const editSaleForm = document.getElementById('edit-sale-form');
    if (editSaleForm) {
        editSaleForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveEditedSale();
        });
    }

    // Customer type radio buttons in new sale modal
    const customerTypeRadios = document.querySelectorAll('input[name="customer-type"]');
    customerTypeRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            const existingCustomerDiv = document.getElementById('existing-customer');
            const newCustomerDiv = document.getElementById('new-customer');
            
            if (this.value === 'existing') {
                existingCustomerDiv.classList.remove('hidden');
                newCustomerDiv.classList.add('hidden');
            } else {
                existingCustomerDiv.classList.add('hidden');
                newCustomerDiv.classList.remove('hidden');
            }
        });
    });

    // Customer affiliate code lookup in new sale modal
    const saleCustomerCode = document.getElementById('sale-customer-code');
    if (saleCustomerCode) {
        saleCustomerCode.addEventListener('input', function() {
            const code = this.value.trim();
            const customerNameField = document.getElementById('sale-customer-name');
            const customerIdField = document.getElementById('sale-customer');
            const referralField = document.getElementById('sale-referral');
            
            if (code) {
                // Search for customer by affiliate code (case-insensitive partial match)
                const customer = customers.find(c => 
                    c.affiliateCode && c.affiliateCode.toLowerCase().includes(code.toLowerCase())
                );
                
                if (customer) {
                    // Auto-fill customer details
                    customerNameField.value = customer.name;
                    customerIdField.value = customer.id;
                    
                    // Auto-fill referral code if customer has a referrer
                    if (customer.referredBy && referralField) {
                        referralField.value = customer.referredBy;
                    } else if (referralField) {
                        referralField.value = '';
                    }
                    
                    // Visual feedback - success
                    this.classList.remove('border-red-500', 'bg-red-50');
                    this.classList.add('border-green-500', 'bg-green-50');
                    customerNameField.classList.remove('border-red-500', 'bg-red-50');
                    customerNameField.classList.add('border-green-500', 'bg-green-50');
                    
                    // Update placeholder to show found customer
                    customerNameField.placeholder = `Found: ${customer.name}`;
                    
                } else {
                    // Clear fields if no customer found
                    customerNameField.value = 'Customer not found';
                    customerIdField.value = '';
                    if (referralField) {
                        referralField.value = '';
                    }
                    
                    // Visual feedback - error
                    this.classList.remove('border-green-500', 'bg-green-50');
                    this.classList.add('border-red-500', 'bg-red-50');
                    customerNameField.classList.remove('border-green-500', 'bg-green-50');
                    customerNameField.classList.add('border-red-500', 'bg-red-50');
                    
                    // Update placeholder to show error
                    customerNameField.placeholder = 'Customer not found...';
                }
            } else {
                // Clear all fields when code is empty
                customerNameField.value = '';
                customerIdField.value = '';
                if (referralField) {
                    referralField.value = '';
                }
                
                // Reset visual feedback
                this.classList.remove('border-red-500', 'bg-red-50', 'border-green-500', 'bg-green-50');
                customerNameField.classList.remove('border-red-500', 'bg-red-50', 'border-green-500', 'bg-green-50');
                customerNameField.placeholder = 'Customer name will appear here...';
            }
        });
        
        // Clear visual feedback on focus
        saleCustomerCode.addEventListener('focus', function() {
            this.classList.remove('border-red-500', 'bg-red-50');
        });
    }

    // Sale referrer lookup functionality
    const lookupSaleReferrerBtn = document.getElementById('lookup-sale-referrer-btn');
    const saleReferrerInput = document.getElementById('sale-referral');
    
    if (lookupSaleReferrerBtn && saleReferrerInput) {
        // Manual lookup button
        lookupSaleReferrerBtn.addEventListener('click', function() {
            const code = saleReferrerInput.value.trim();
            lookupSaleReferrerByCode(code);
        });
        
        // Real-time lookup as user types
        let saleReferrerTimeout;
        saleReferrerInput.addEventListener('input', function() {
            clearTimeout(saleReferrerTimeout);
            const code = this.value.trim();
            
            if (code === '') {
                clearSaleReferrerFeedback();
                return;
            }
            
            // Debounce the lookup to avoid too many calls
            saleReferrerTimeout = setTimeout(() => {
                lookupSaleReferrerByCode(code);
            }, 500);
        });
        
        // Clear feedback when input is cleared
        saleReferrerInput.addEventListener('blur', function() {
            if (this.value.trim() === '') {
                clearSaleReferrerFeedback();
            }
        });
        
        // Lookup on Enter key
        saleReferrerInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                lookupSaleReferrerByCode(this.value.trim());
            }
        });
    }
});

// Generate a single new affiliate code
async function generateNewCode() {
    try {
        const newCode = {
            id: Date.now(),
            code: generateRandomCode(),
            status: 'available',
            usedInSales: [],
            createdAt: getTodayStr()
        };
        
        // Save to Firestore
        await db.collection('affiliateCodes').doc(newCode.id.toString()).set(newCode);
        
        affiliateCodes.push(newCode);
        renderCodesTable();
        updateCodesCount();
        showAlert('New affiliate code generated successfully!');
    } catch (error) {
        console.error('Error generating code:', error);
        showAlert('Error generating affiliate code: ' + error.message, 'error');
    }
}

// Generate multiple affiliate codes
async function generateMultipleCodes(count) {
    try {
        const newCodes = [];
        const today = getTodayStr();
        const batch = db.batch();
        
        for (let i = 0; i < count; i++) {
            const newCode = {
                id: Date.now() + i, // Ensure unique IDs
                code: generateRandomCode(),
                status: 'available',
                usedInSales: [],
                createdAt: today
            };
            newCodes.push(newCode);
            
            // Add to batch
            const docRef = db.collection('affiliateCodes').doc(newCode.id.toString());
            batch.set(docRef, newCode);
        }
        
        // Commit batch
        await batch.commit();
        
        affiliateCodes.push(...newCodes);
        renderCodesTable();
        updateCodesCount();
        showAlert(`Generated ${count} new affiliate codes successfully!`);
    } catch (error) {
        console.error('Error generating multiple codes:', error);
        showAlert('Error generating affiliate codes: ' + error.message, 'error');
    }
}

// Generate a random affiliate code
function generateRandomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'AFF';
    for (let i = 0; i < 5; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Ensure uniqueness
    while (affiliateCodes.some(code => code.code === result)) {
        result = 'AFF';
        for (let i = 0; i < 5; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
    }
    
    return result;
}

// Copy all today's codes to clipboard
function copyAllTodayCodes() {
    const todayCodes = affiliateCodes.filter(code => code.createdAt === getTodayStr());
    
    if (todayCodes.length === 0) {
        showAlert('No codes generated today to copy.');
        return;
    }
    
    const codesList = todayCodes.map(code => code.code).join('\n');
    
    navigator.clipboard.writeText(codesList).then(() => {
        showAlert(`Copied ${todayCodes.length} codes generated today to clipboard!`);
    }).catch(() => {
        showAlert('Failed to copy codes to clipboard. Please try again.');
    });
}

// Clear all filters function (called from clear filters button in table)
function clearAllFilters() {
    searchTerm = '';
    filterDateRange = { from: '', to: '' };
    currentPage = 1;
    
    const searchInput = document.getElementById('search-codes');
    const filterFromInput = document.getElementById('filter-date-from');
    const filterToInput = document.getElementById('filter-date-to');
    
    if (searchInput) {
        searchInput.value = '';
        searchInput.classList.remove('border-blue-500', 'bg-blue-50');
    }
    if (filterFromInput) filterFromInput.value = '';
    if (filterToInput) filterToInput.value = '';
    
    renderCodesTable();
}

// Save data to Firestore (legacy function - updating to use new approach)
async function saveDataToFirestoreOld() {
    try {
        const batch = db.batch();
        
        // Save customers
        customers.forEach(customer => {
            const docRef = db.collection('customers').doc(customer.id.toString());
            batch.set(docRef, customer);
        });

        // Save sales
        sales.forEach(sale => {
            const docRef = db.collection('sales').doc(sale.id.toString());
            batch.set(docRef, sale);
        });

        // Save affiliate codes with proper structure
        affiliateCodes.forEach((code, index) => {
            const codeWithId = {
                id: code.id || (index + 1),
                ...code,
                createdAt: code.createdAt || getTodayStr() // Ensure all codes have a creation date
            };
            const docRef = db.collection('affiliateCodes').doc(codeWithId.id.toString());
            batch.set(docRef, codeWithId);
        });

        // Save commission rate
        const settingsRef = db.collection('settings').doc('commission');
        batch.set(settingsRef, { rate: commissionRate });

        await batch.commit();
    } catch (error) {
        console.error('Error saving data to Firestore:', error);
        showAlert('Error saving data: ' + error.message, 'error');
    }
}

// Customer button event listeners
function attachCustomerButtonListeners() {
    // Edit customer buttons
    document.querySelectorAll('.edit-customer-btn').forEach(button => {
        button.addEventListener('click', function() {
            const customerId = parseInt(this.getAttribute('data-customer-id'));
            const customer = customers.find(c => c.id === customerId);
            if (customer) {
                populateEditCustomerModal(customer);
                showModal('edit-customer-modal');
            }
        });
    });

    // Delete customer buttons
    document.querySelectorAll('.delete-customer-btn').forEach(button => {
        button.addEventListener('click', function() {
            const customerId = parseInt(this.getAttribute('data-customer-id'));
            if (confirm('Are you sure you want to delete this customer?')) {
                deleteCustomer(customerId);
            }
        });
    });

    // View referred customers buttons
    document.querySelectorAll('.view-referred-btn').forEach(button => {
        button.addEventListener('click', function() {
            const customerId = parseInt(this.getAttribute('data-customer-id'));
            const customer = customers.find(c => c.id === customerId);
            if (customer) {
                showReferredCustomers(customer);
            }
        });
    });
}

// Sales button event listeners
function attachSalesButtonListeners() {
    // Edit sale buttons
    document.querySelectorAll('.edit-sale-btn').forEach(button => {
        button.addEventListener('click', function() {
            const saleId = parseInt(this.getAttribute('data-sale-id'));
            const sale = sales.find(s => s.id === saleId);
            if (sale) {
                populateEditSaleModal(sale);
                showModal('edit-sale-modal');
            }
        });
    });

    // Delete sale buttons
    document.querySelectorAll('.delete-sale-btn').forEach(button => {
        button.addEventListener('click', function() {
            const saleId = parseInt(this.getAttribute('data-sale-id'));
            if (confirm('Are you sure you want to delete this sale?')) {
                deleteSale(saleId);
            }
        });
    });

    // Generate invoice buttons
    document.querySelectorAll('.generate-invoice-btn').forEach(button => {
        button.addEventListener('click', function() {
            const saleId = parseInt(this.getAttribute('data-sale-id'));
            generateInvoice(saleId);
        });
    });
}

// Customer-related functions
function populateEditCustomerModal(customer) {
    document.getElementById('edit-customer-id').value = customer.id;
    document.getElementById('edit-customer-name').value = customer.name || '';
    document.getElementById('edit-customer-email').value = customer.email || '';
    document.getElementById('edit-customer-phone').value = customer.phone || '';
    document.getElementById('edit-customer-qid').value = customer.qid || '';
    document.getElementById('edit-customer-vehicle-plate').value = customer.vehiclePlate || '';
    document.getElementById('edit-customer-affiliate-code').value = customer.affiliateCode || '';
    document.getElementById('edit-customer-balance').value = customer.accountBalance || 0;
    
    // Find and display the referrer's name (not the affiliate code)
    let referrerInfo = '';
    if (customer.referredBy) {
        const referrer = customers.find(c => c.affiliateCode === customer.referredBy);
        if (referrer) {
            referrerInfo = `${referrer.name} (${customer.referredBy})`;
        } else {
            referrerInfo = `Code: ${customer.referredBy} (Customer not found)`;
        }
    }
    document.getElementById('edit-customer-referredby').value = referrerInfo;
    document.getElementById('edit-customer-notes').value = customer.notes || '';
    
    // Populate referred customers select
    const referredSelect = document.getElementById('edit-customer-referreds');
    referredSelect.innerHTML = '';
    customers.forEach(c => {
        if (c.id !== customer.id) {
            const option = document.createElement('option');
            option.value = c.id;
            option.textContent = c.name;
            option.selected = customer.referredCustomers && customer.referredCustomers.includes(c.id);
            referredSelect.appendChild(option);
        }
    });
}

function deleteCustomer(customerId) {
    const customerIndex = customers.findIndex(c => c.id === customerId);
    if (customerIndex === -1) {
        showAlert('Customer not found!', 'error');
        return;
    }
    
    const customerToDelete = customers[customerIndex];
    const customerName = customerToDelete.name;
    
    // Show detailed confirmation with impact information
    const salesCount = sales.filter(s => s.customerId === customerId).length;
    const referredCount = customerToDelete.referredCustomers ? customerToDelete.referredCustomers.length : 0;
    const referrerName = customerToDelete.referredBy ? 
        customers.find(c => c.affiliateCode === customerToDelete.referredBy)?.name || 'Unknown' : null;
    
    let confirmMessage = `Are you sure you want to permanently delete customer "${customerName}"?\n\n`;
    confirmMessage += `This will:\n`;
    confirmMessage += `• Remove ${salesCount} sales records\n`;
    if (referredCount > 0) {
        confirmMessage += `• Remove referral links to ${referredCount} customers they referred\n`;
    }
    if (referrerName) {
        confirmMessage += `• Remove them from ${referrerName}'s referred customers list\n`;
    }
    confirmMessage += `• Free up their affiliate code "${customerToDelete.affiliateCode}"\n`;
    confirmMessage += `\nThis action cannot be undone!`;
    
    if (!confirm(confirmMessage)) {
        return;
    }
    
    try {
        // 1. Remove customer from customers array
        customers.splice(customerIndex, 1);
        
        // 2. Remove all sales records for this customer
        const salesToRemove = sales.filter(s => s.customerId === customerId);
        for (let i = sales.length - 1; i >= 0; i--) {
            if (sales[i].customerId === customerId) {
                sales.splice(i, 1);
            }
        }
        
        // 3. Remove customer from other customers' referredCustomers lists
        customers.forEach(customer => {
            if (customer.referredCustomers && customer.referredCustomers.includes(customerId)) {
                const index = customer.referredCustomers.indexOf(customerId);
                customer.referredCustomers.splice(index, 1);
            }
        });
        
        // 4. Update customers who were referred by this customer (remove their referredBy)
        customers.forEach(customer => {
            if (customer.referredBy === customerToDelete.affiliateCode) {
                customer.referredBy = null;
            }
        });
        
        // 5. Mark the affiliate code as available again
        const affiliateCodeIndex = affiliateCodes.findIndex(code => code.code === customerToDelete.affiliateCode);
        if (affiliateCodeIndex !== -1) {
            affiliateCodes[affiliateCodeIndex].status = 'available';
            // Clear usage history for this code
            affiliateCodes[affiliateCodeIndex].usedInSales = [];
        }
        
        // 6. Remove from referrals tracking table
        const referralIndex = referrals.findIndex(r => r.code === customerToDelete.affiliateCode);
        if (referralIndex !== -1) {
            referrals.splice(referralIndex, 1);
        }
        
        // 7. Update referral statistics for other customers who referred this customer
        if (customerToDelete.referredBy) {
            const referrerReferral = referrals.find(r => r.code === customerToDelete.referredBy);
            if (referrerReferral) {
                // Remove this customer from referred customers list
                const refIndex = referrerReferral.referredCustomers.indexOf(customerId);
                if (refIndex !== -1) {
                    referrerReferral.referredCustomers.splice(refIndex, 1);
                    referrerReferral.totalReferrals = referrerReferral.referredCustomers.length;
                }
            }
        }
        
        // Save all changes and update UI
        saveDataToFirestore();
        renderCustomerTable();
        renderSalesTable();
        renderCodesTable();
        renderReferralsTable();
        
        const deletionSummary = `Customer "${customerName}" deleted successfully!\n`;
        const details = `Removed: ${salesToRemove.length} sales, updated ${referredCount} referral relationships`;
        showAlert(deletionSummary + details, 'success');
        
    } catch (error) {
        console.error('Error deleting customer:', error);
        showAlert('Error occurred while deleting customer. Please try again.', 'error');
    }
}

function showReferredCustomers(customer) {
    const referredCustomersData = customers.filter(c => customer.referredCustomers.includes(c.id));
    const tableBody = document.getElementById('referred-customers-table-body');
    const countElement = document.getElementById('referred-customers-count');
    
    tableBody.innerHTML = '';
    
    if (referredCustomersData.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="py-4 text-center text-gray-500">No referred customers found</td></tr>';
    } else {
        referredCustomersData.forEach(refCustomer => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50';
            row.innerHTML = `
                <td class="py-3 px-4 text-sm">${refCustomer.name}</td>
                <td class="py-3 px-4 text-sm hidden md:table-cell">${refCustomer.email || 'N/A'}</td>
                <td class="py-3 px-4 text-sm">${refCustomer.phone}</td>
                <td class="py-3 px-4 text-sm hidden md:table-cell">${refCustomer.qid || 'N/A'}</td>
                <td class="py-3 px-4 text-sm">${refCustomer.vehiclePlate || 'N/A'}</td>
                <td class="py-3 px-4 text-sm">${refCustomer.affiliateCode || 'N/A'}</td>
            `;
            tableBody.appendChild(row);
        });
    }
    
    countElement.textContent = `${referredCustomersData.length} referred customers found`;
    showModal('referred-customers-modal');
}

// Sales-related functions
function populateEditSaleModal(sale) {
    document.getElementById('edit-sale-id').value = sale.id;
    document.getElementById('edit-customer-name').value = sale.customer || '';
    document.getElementById('edit-customer-phone').value = sale.customerPhone || '';
    document.getElementById('edit-product-name').value = sale.services || '';
    document.getElementById('edit-sale-amount').value = parseFloat(sale.amount.replace('QR ', '')) || 0;
    document.getElementById('edit-affiliate-code').value = sale.referral || '';
    document.getElementById('edit-sale-date').value = sale.date || '';
    document.getElementById('edit-notes').value = sale.notes || '';
    document.getElementById('edit-sale-discount').value = sale.discount || 0;
    
    // Update total
    updateEditSaleTotal();
}

function deleteSale(saleId) {
    const index = sales.findIndex(s => s.id === saleId);
    if (index !== -1) {
        sales.splice(index, 1);
        saveDataToFirestore();
        renderSalesTable();
        showAlert('Sale deleted successfully!');
    }
}

function generateInvoice(saleId) {
    const sale = sales.find(s => s.id === saleId);
    if (sale) {
        showAlert(`Invoice generated for ${sale.customer} - ${sale.invoice}`);
        // Here you would implement actual invoice generation logic
    }
}

function updateEditSaleTotal() {
    const amount = parseFloat(document.getElementById('edit-sale-amount').value) || 0;
    const discount = parseFloat(document.getElementById('edit-sale-discount').value) || 0;
    const total = amount - discount;
    document.getElementById('edit-sale-total').textContent = total.toFixed(2);
}

// Form submission functions
async function saveCustomerChanges() {
    try {
        const customerId = parseInt(document.getElementById('edit-customer-id').value);
        const customerIndex = customers.findIndex(c => c.id === customerId);
        
        if (customerIndex !== -1) {
            const customer = customers[customerIndex];
            customer.name = sanitizeInput(document.getElementById('edit-customer-name').value);
            customer.email = sanitizeInput(document.getElementById('edit-customer-email').value);
            customer.phone = sanitizeInput(document.getElementById('edit-customer-phone').value);
            customer.qid = sanitizeInput(document.getElementById('edit-customer-qid').value);
            customer.vehiclePlate = sanitizeInput(document.getElementById('edit-customer-vehicle-plate').value);
            customer.affiliateCode = sanitizeInput(document.getElementById('edit-customer-affiliate-code').value);
            customer.accountBalance = parseFloat(document.getElementById('edit-customer-balance').value) || 0;
            customer.notes = sanitizeInput(document.getElementById('edit-customer-notes').value);
            
            // Update referred customers
            const referredSelect = document.getElementById('edit-customer-referreds');
            customer.referredCustomers = Array.from(referredSelect.selectedOptions).map(option => parseInt(option.value));
            
            // Save to Firestore
            await db.collection('customers').doc(customer.id.toString()).set(customer);
            
            renderCustomerTable();
            hideModal('edit-customer-modal');
            showAlert('Customer updated successfully!');
        }
    } catch (error) {
        console.error('Error saving customer changes:', error);
        showAlert('Error updating customer: ' + error.message, 'error');
    }
}

async function addNewCustomer() {
    try {
        // Validate required fields
        const name = sanitizeInput(document.getElementById('add-customer-name').value);
        const phone = sanitizeInput(document.getElementById('add-customer-phone').value);
        const vehiclePlate = sanitizeInput(document.getElementById('add-customer-vehicle-plate').value);
        
        if (!name || !phone || !vehiclePlate) {
            showAlert('Please fill in all required fields (Name, Phone, Vehicle Plate)', 'error');
            return;
        }
        
        // Check if customer with same phone or vehicle plate already exists
        const existingCustomer = customers.find(c => 
            c.phone === phone || c.vehiclePlate === vehiclePlate
        );
        
        if (existingCustomer) {
            if (existingCustomer.phone === phone) {
                showAlert('A customer with this phone number already exists', 'error');
            } else {
                showAlert('A customer with this vehicle plate already exists', 'error');
            }
            return;
        }
        
        // Generate unique affiliate code function
        const generateAffiliateCode = () => {
            let code;
            do {
                code = 'AFF' + Math.random().toString(36).substr(2, 6).toUpperCase();
            } while (customers.some(c => c.affiliateCode === code) || affiliateCodes.some(c => c.code === code));
            return code;
        };
    
        // Generate or assign affiliate code
        const assignedAffiliateCode = sanitizeInput(document.getElementById('add-customer-affiliate-code').value);
        let customerAffiliateCode;
        
        if (assignedAffiliateCode) {
            // Check if the assigned code is valid and available
            const affiliateCodeObj = affiliateCodes.find(c => c.code === assignedAffiliateCode);
            if (affiliateCodeObj && affiliateCodeObj.status === 'available') {
                customerAffiliateCode = assignedAffiliateCode;
                // Mark the code as assigned in the affiliate codes list
                affiliateCodeObj.status = 'assigned';
                await db.collection('affiliateCodes').doc(affiliateCodeObj.id.toString()).update({
                    status: 'assigned'
                });
                showAlert(`Assigned existing affiliate code: ${assignedAffiliateCode}`, 'success');
            } else if (affiliateCodeObj && affiliateCodeObj.status !== 'available') {
                showAlert(`Affiliate code "${assignedAffiliateCode}" is not available (Status: ${affiliateCodeObj.status}). Please choose a different code.`, 'error');
                return;
            } else {
                showAlert(`Affiliate code "${assignedAffiliateCode}" does not exist. Please choose a valid code from the affiliate codes section.`, 'error');
                return;
            }
        } else {
            // Generate new code only if no code was provided
            customerAffiliateCode = generateAffiliateCode();
            showAlert(`Generated new affiliate code: ${customerAffiliateCode}`, 'success');
        }
        
        // Create new customer object
        const newCustomer = {
            id: Date.now(),  // Use timestamp as ID for uniqueness
            name: name,
            email: sanitizeInput(document.getElementById('add-customer-email').value),
            phone: phone,
            qid: sanitizeInput(document.getElementById('add-customer-qid').value),
            vehiclePlate: vehiclePlate,
            affiliateCode: customerAffiliateCode,
            referredBy: null, // No referrer assignment during customer creation
            referredCustomers: [],
            accountBalance: 0,
            notes: sanitizeInput(document.getElementById('add-customer-notes').value),
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Save customer to Firestore
        await db.collection('customers').doc(newCustomer.id.toString()).set(newCustomer);
        
        // Add customer to local array
        customers.push(newCustomer);
    
        // Update UI
        renderCustomerTable();
        renderCodesTable(); // Re-render codes table to show updated status
        hideModal('add-customer-modal');
        
        // Clear form
        document.getElementById('add-customer-form').reset();
        clearAffiliateCodeFeedback();
        
        const successMessage = `Customer "${name}" added successfully! Affiliate code: ${newCustomer.affiliateCode}`;
        showAlert(successMessage);
        
    } catch (error) {
        console.error('Error in addNewCustomer:', error);
        showAlert('An error occurred while adding the customer. Please try again.', 'error');
    }
}

async function saveNewSale() {
    try {
        console.log('saveNewSale function called'); // Debug log
        
        const customerType = document.querySelector('input[name="customer-type"]:checked');
        if (!customerType) {
            showAlert('Please select a customer type.', 'error');
            return;
        }
        
        let customerId, customerName;
        
        if (customerType.value === 'existing') {
            const customerCodeInput = document.getElementById('sale-customer-code');
            const customerNameInput = document.getElementById('sale-customer-name');
            
            if (!customerCodeInput || !customerNameInput) {
                showAlert('Customer form elements not found.', 'error');
                return;
            }
            
            const customerCode = customerCodeInput.value.trim();
            customerName = customerNameInput.value.trim();
            
            if (!customerCode || !customerName || customerName === 'Customer not found') {
                showAlert('Please enter a valid customer affiliate code.', 'error');
                return;
            }
            
            // Find customer by affiliate code
            const customer = customers.find(c => 
                c.affiliateCode && c.affiliateCode.toLowerCase().includes(customerCode.toLowerCase())
            );
            
            if (!customer) {
                showAlert('Customer not found. Please check the affiliate code.', 'error');
                return;
            }
            
            customerId = customer.id;
            customerName = customer.name;
            
            // Auto-populate referral field if customer has a referrer
            const referralInput = document.getElementById('sale-referral');
            if (referralInput && customer.referredBy) {
                referralInput.value = customer.referredBy;
            }
        } else {
            // Create new customer
            const newCustomerName = document.getElementById('new-customer-name');
            const newCustomerPhone = document.getElementById('new-customer-phone');
            const newCustomerVehiclePlate = document.getElementById('new-customer-vehicle-plate');
            
            if (!newCustomerName || !newCustomerPhone || !newCustomerVehiclePlate) {
                showAlert('New customer form elements not found.', 'error');
                return;
            }
            
            const name = sanitizeInput(newCustomerName.value);
            const phone = sanitizeInput(newCustomerPhone.value);
            const vehiclePlate = sanitizeInput(newCustomerVehiclePlate.value);
            
            if (!name || !phone || !vehiclePlate) {
                showAlert('Please fill in all required fields for the new customer (Name, Phone, Vehicle Plate).', 'error');
                return;
            }
            
            // Handle referrer code validation (required for new customers)
            const referrerCode = sanitizeInput(document.getElementById('sale-referral').value);
            let validReferrerCode = null;
            
            if (!referrerCode) {
                showAlert('Referrer code is required for new customers. Please enter a valid referrer affiliate code.', 'error');
                return;
            }
            
            console.log('Looking for referrer code:', referrerCode);
            console.log('Available customers:', customers.map(c => ({ id: c.id, name: c.name, affiliateCode: c.affiliateCode })));
            
            // Find referrer by affiliate code
            const referrer = customers.find(c => 
                c.affiliateCode && c.affiliateCode.toLowerCase() === referrerCode.toLowerCase()
            );
            
            if (referrer) {
                validReferrerCode = referrer.affiliateCode;
                console.log('Found referrer:', referrer);
                showAlert(`New customer will be linked to referrer: ${referrer.name} (${referrer.affiliateCode})`, 'success');
            } else {
                console.log('Referrer not found. Searched for:', referrerCode);
                showAlert(`Referrer code "${referrerCode}" not found. Please enter a valid referrer affiliate code.`, 'error');
                return;
            }
            
            // Get the customer affiliate code from the existing input field
            const customerAffiliateCodeInput = sanitizeInput(document.getElementById('sale-customer-code').value);
            
            if (!customerAffiliateCodeInput) {
                showAlert('Please enter the customer affiliate code from their card.', 'error');
                return;
            }
            
            // Check if the affiliate code already exists
            const existingCustomer = customers.find(c => 
                c.affiliateCode && c.affiliateCode.toLowerCase() === customerAffiliateCodeInput.toLowerCase()
            );
            
            if (existingCustomer) {
                showAlert(`Affiliate code "${customerAffiliateCodeInput}" is already assigned to customer: ${existingCustomer.name}`, 'error');
                return;
            }
            
            // Check if it exists in affiliate codes pool
            const existingAffiliateCode = affiliateCodes.find(c => 
                c.code && c.code.toLowerCase() === customerAffiliateCodeInput.toLowerCase()
            );
            
            if (existingAffiliateCode && existingAffiliateCode.status !== 'available') {
                showAlert(`Affiliate code "${customerAffiliateCodeInput}" is already ${existingAffiliateCode.status}`, 'error');
                return;
            }
            
            // Mark the code as assigned if it exists in the pool
            if (existingAffiliateCode) {
                existingAffiliateCode.status = 'assigned';
                await db.collection('affiliateCodes').doc(existingAffiliateCode.id.toString()).update({
                    status: 'assigned'
                });
            }
            
            const newCustomer = {
                id: Date.now(),  // Use timestamp as ID for uniqueness
                name: name,
                email: sanitizeInput(document.getElementById('new-customer-email').value),
                phone: phone,
                qid: sanitizeInput(document.getElementById('new-customer-qid').value),
                vehiclePlate: vehiclePlate,
                affiliateCode: customerAffiliateCodeInput,
                referredBy: validReferrerCode,
                referredCustomers: [],
                accountBalance: 0,
                notes: '',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            // Save new customer to Firestore
            await db.collection('customers').doc(newCustomer.id.toString()).set(newCustomer);
            customers.push(newCustomer);
            
            // Update referrer's referred customers list
            if (validReferrerCode) {
                const referrer = customers.find(c => c.affiliateCode === validReferrerCode);
                if (referrer && !referrer.referredCustomers.includes(newCustomer.id)) {
                    referrer.referredCustomers.push(newCustomer.id);
                    await db.collection('customers').doc(referrer.id.toString()).update({
                        referredCustomers: firebase.firestore.FieldValue.arrayUnion(newCustomer.id)
                    });
                }
            }
            
            customerId = newCustomer.id;
            customerName = newCustomer.name;
        }
        
        // Validate required fields
        const saleDateInput = document.getElementById('sale-date');
        if (!saleDateInput || !saleDateInput.value) {
            showAlert('Please select a sale date.', 'error');
            return;
        }
        
        // Calculate sale total from service rows
        function calculateSaleTotal() {
            const serviceRows = document.querySelectorAll('#sale-services-container .service-row');
            let total = 0;
            
            serviceRows.forEach(row => {
                const priceInput = row.querySelector('input[name="service-price"]');
                const quantityInput = row.querySelector('input[name="service-quantity"]');
                
                if (priceInput && quantityInput) {
                    const price = parseFloat(priceInput.value) || 0;
                    const quantity = parseInt(quantityInput.value) || 0;
                    total += price * quantity;
                }
            });
            
            return total;
        }

        const saleTotal = calculateSaleTotal();
        const discount = parseFloat(document.getElementById('sale-discount').value) || 0;
        const finalTotal = saleTotal - discount;

        // Create new sale
        const newSale = {
            id: Date.now(),  // Use timestamp as ID for uniqueness
            date: saleDateInput.value,
            invoice: 'INV-' + Date.now().toString().slice(-3),
            customer: customerName,
            customerId: customerId,
            services: 'Service Details',  // From service rows
            servicesList: [],  // From service rows
            amount: `QR ${finalTotal.toFixed(2)}`,
            referral: sanitizeInput(document.getElementById('sale-referral').value) || null,
            commission: null,
            discount: discount,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()  // For triggering
        };

        // Save sale to Firestore (this will trigger the Cloud Function)
        await db.collection('sales').doc(newSale.id.toString()).set(newSale);

        // Update customer balance if referral (but let function handle for consistency)
        const currentCustomer = customers.find(c => c.id === customerId);
        console.log('Current customer:', currentCustomer);
        console.log('Current customer referredBy:', currentCustomer?.referredBy);
        
        if (currentCustomer && currentCustomer.referredBy && finalTotal > 0) {
            const commissionAmount = finalTotal * 0.03;
            console.log('Processing commission for referrer code:', currentCustomer.referredBy);
            
            // Find the referrer customer by affiliate code, not by ID
            const referrerCustomer = customers.find(c => c.affiliateCode === currentCustomer.referredBy);
            console.log('Found referrer customer:', referrerCustomer);
            
            if (referrerCustomer) {
                const referrerRef = db.collection('customers').doc(referrerCustomer.id.toString());
                console.log('Updating referrer document ID:', referrerCustomer.id.toString());
                
                await referrerRef.update({
                    accountBalance: firebase.firestore.FieldValue.increment(commissionAmount)
                });
                
                // Set commission in sale record
                newSale.commission = `QR ${commissionAmount.toFixed(2)}`;
                await db.collection('sales').doc(newSale.id.toString()).update({
                    commission: newSale.commission
                });
            } else {
                console.error('Referrer customer not found for affiliate code:', currentCustomer.referredBy);
                console.log('Available customers with affiliate codes:', customers.filter(c => c.affiliateCode).map(c => ({ id: c.id, name: c.name, affiliateCode: c.affiliateCode })));
            }
        }

        // Reload data and render
        await loadDataFromFirestore();
        hideModal('new-sale-modal');
        showAlert('New sale created and commission processed!');
        
        // Reset form
        document.getElementById('new-sale-form').reset();
        
    } catch (error) {
        console.error('Error saving sale:', error);
        showAlert('Error saving sale: ' + error.message, 'error');
    }
}

function saveEditedSale() {
    const saleId = parseInt(document.getElementById('edit-sale-id').value);
    const saleIndex = sales.findIndex(s => s.id === saleId);
    
    if (saleIndex !== -1) {
        const sale = sales[saleIndex];
        sale.customer = sanitizeInput(document.getElementById('edit-customer-name').value);
        sale.services = sanitizeInput(document.getElementById('edit-product-name').value);
        sale.amount = 'QR ' + (parseFloat(document.getElementById('edit-sale-amount').value) || 0).toFixed(2);
        sale.referral = sanitizeInput(document.getElementById('edit-affiliate-code').value) || null;
        sale.date = document.getElementById('edit-sale-date').value;
        sale.discount = parseFloat(document.getElementById('edit-sale-discount').value) || 0;
        sale.notes = sanitizeInput(document.getElementById('edit-notes').value);
        
        saveDataToFirestore();
        renderSalesTable();
        hideModal('edit-sale-modal');
        showAlert('Sale updated successfully!');
    }
}

function lookupCustomerByAffiliate() {
    const affiliateCode = document.getElementById('sale-customer').value.trim();
    
    if (!affiliateCode) {
        document.getElementById('sale-customer-name').value = '';
        return;
    }
    
    const customer = customers.find(c => c.affiliateCode && c.affiliateCode.toLowerCase() === affiliateCode.toLowerCase());
    
    if (customer) {
        document.getElementById('sale-customer-name').value = customer.name;
        document.getElementById('sale-customer').value = customer.id;
    } else {
        document.getElementById('sale-customer-name').value = 'Customer not found';
        document.getElementById('sale-customer').value = '';
    }
}

// Utility functions
function sanitizeInput(input) {
    if (typeof input !== 'string') return '';
    return input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').trim();
}

function showAlert(message, type = 'success') {
    // Create a simple alert div that auto-dismisses
    const alertDiv = document.createElement('div');
    alertDiv.className = `fixed top-4 right-4 p-4 rounded-lg text-white z-50 ${type === 'error' ? 'bg-red-500' : type === 'warning' ? 'bg-yellow-500' : 'bg-green-500'}`;
    alertDiv.textContent = message;
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.parentNode.removeChild(alertDiv);
        }
    }, 3000);
}

// Referrer lookup functions
function lookupReferrerByCode(code) {
    if (!code || code.trim() === '') {
        return clearReferrerFeedback();
    }
    
    const trimmedCode = code.trim();
    
    // First, try to find a customer with this affiliate code
    const customerReferrer = customers.find(c => 
        c.affiliateCode && (
            c.affiliateCode.toLowerCase() === trimmedCode.toLowerCase() ||
            c.affiliateCode.toLowerCase().includes(trimmedCode.toLowerCase())
        )
    );
    
    if (customerReferrer) {
        showReferrerFeedback('success', `Found customer: ${customerReferrer.name}`, customerReferrer.affiliateCode);
        return customerReferrer;
    }
    
    // Then, check if the code exists in the affiliate codes list
    const affiliateCodeExists = affiliateCodes.find(code => 
        code.code.toLowerCase() === trimmedCode.toLowerCase() ||
        code.code.toLowerCase().includes(trimmedCode.toLowerCase())
    );
    
    if (affiliateCodeExists) {
        showReferrerFeedback('warning', `Code exists: ${affiliateCodeExists.code}`, 'No customer assigned yet');
        return { affiliateCode: affiliateCodeExists.code, isDirectCode: true };
    }
    
    // Code not found
    showReferrerFeedback('error', 'Code not found', 'This affiliate code does not exist');
    return null;
}

function lookupAffiliateCodeForAssignment(code) {
    if (!code || code.trim() === '') {
        return clearAffiliateCodeFeedback();
    }
    
    const trimmedCode = code.trim().toUpperCase(); // Make search case-insensitive
    
    // Check if the code exists in the affiliate codes list
    const affiliateCodeExists = affiliateCodes.find(codeObj => 
        codeObj.code.toUpperCase() === trimmedCode
    );
    
    if (affiliateCodeExists) {
        if (affiliateCodeExists.status === 'available') {
            showAffiliateCodeFeedback('success', `✓ Available code: ${affiliateCodeExists.code}`, 'Ready to assign to customer');
            return affiliateCodeExists;
        } else {
            showAffiliateCodeFeedback('warning', `Code: ${affiliateCodeExists.code}`, `Status: ${affiliateCodeExists.status} (Not available)`);
            return affiliateCodeExists;
        }
    }
    
    // Check if a customer already has this code
    const customerWithCode = customers.find(c => 
        c.affiliateCode && c.affiliateCode.toUpperCase() === trimmedCode
    );
    
    if (customerWithCode) {
        showAffiliateCodeFeedback('error', 'Code already assigned', `Customer: ${customerWithCode.name}`);
        return null;
    }
    
    // Code not found in affiliate codes list
    showAffiliateCodeFeedback('error', 'Code not found', 'This code does not exist in the affiliate codes section');
    return null;
}

function showReferrerFeedback(type, status, details) {
    const feedbackDiv = document.getElementById('referrer-feedback');
    const statusSpan = document.getElementById('referrer-status');
    const nameSpan = document.getElementById('referrer-name');
    
    if (!feedbackDiv || !statusSpan || !nameSpan) return;
    
    feedbackDiv.classList.remove('hidden');
    statusSpan.textContent = status;
    nameSpan.textContent = details;
    
    // Apply styling based on type
    feedbackDiv.className = 'mt-2 text-sm';
    switch (type) {
        case 'success':
            statusSpan.className = 'font-medium text-green-600';
            nameSpan.className = 'text-green-500';
            break;
        case 'warning':
            statusSpan.className = 'font-medium text-yellow-600';
            nameSpan.className = 'text-yellow-500';
            break;
        case 'error':
            statusSpan.className = 'font-medium text-red-600';
            nameSpan.className = 'text-red-500';
            break;
        default:
            statusSpan.className = 'font-medium text-gray-600';
            nameSpan.className = 'text-gray-500';
    }
}

function clearReferrerFeedback() {
    const feedbackDiv = document.getElementById('referrer-feedback');
    if (feedbackDiv) {
        feedbackDiv.classList.add('hidden');
    }
}

// Sale referrer lookup functions
function lookupSaleReferrerByCode(code) {
    if (!code) {
        return clearSaleReferrerFeedback();
    }
    
    const customer = customers.find(c => 
        c.affiliateCode && c.affiliateCode.toLowerCase() === code.toLowerCase()
    );
    
    if (customer) {
        showSaleReferrerFeedback('success', '✓ Valid referrer:', customer.name);
    } else {
        showSaleReferrerFeedback('error', '✗ Referrer not found:', 'Please check the affiliate code');
    }
}

function showSaleReferrerFeedback(type, status, name) {
    const feedbackDiv = document.getElementById('sale-referrer-feedback');
    const statusSpan = document.getElementById('sale-referrer-status');
    const nameSpan = document.getElementById('sale-referrer-name');
    
    if (!feedbackDiv || !statusSpan || !nameSpan) return;
    
    feedbackDiv.classList.remove('hidden');
    statusSpan.textContent = status;
    nameSpan.textContent = name;
    
    // Apply styling based on type
    feedbackDiv.className = 'mt-2 text-sm';
    switch (type) {
        case 'success':
            feedbackDiv.classList.add('text-green-700');
            break;
        case 'error':
            feedbackDiv.classList.add('text-red-700');
            break;
        case 'warning':
            feedbackDiv.classList.add('text-yellow-700');
            break;
    }
}

function clearSaleReferrerFeedback() {
    const feedbackDiv = document.getElementById('sale-referrer-feedback');
    if (feedbackDiv) {
        feedbackDiv.classList.add('hidden');
    }
}

function showAffiliateCodeFeedback(type, status, details) {
    const feedbackDiv = document.getElementById('affiliate-code-feedback');
    const statusSpan = document.getElementById('affiliate-code-status');
    const detailsSpan = document.getElementById('affiliate-code-details');
    
    if (!feedbackDiv || !statusSpan || !detailsSpan) return;
    
    feedbackDiv.classList.remove('hidden');
    statusSpan.textContent = status;
    detailsSpan.textContent = details;
    
    // Apply styling based on type
    feedbackDiv.className = 'mt-2 text-sm';
    switch (type) {
        case 'success':
            statusSpan.className = 'font-medium text-green-600';
            detailsSpan.className = 'text-green-500';
            break;
        case 'warning':
            statusSpan.className = 'font-medium text-yellow-600';
            detailsSpan.className = 'text-yellow-500';
            break;
        case 'error':
            statusSpan.className = 'font-medium text-red-600';
            detailsSpan.className = 'text-red-500';
            break;
        default:
            statusSpan.className = 'font-medium text-gray-600';
            detailsSpan.className = 'text-gray-500';
    }
}

function clearAffiliateCodeFeedback() {
    const feedbackDiv = document.getElementById('affiliate-code-feedback');
    if (feedbackDiv) {
        feedbackDiv.classList.add('hidden');
    }
}
