function getEl(id) {
  return document.getElementById(id);
}

// ভারতীয় ফরম্যাটে তারিখ ও সময় দেখানোর ফাংশন (DD-MM-YYYY ও Time)
window.formatDateBR = function(dtStr) {
  if (!dtStr || dtStr === '-') return '-';
  var clean = String(dtStr).trim();
  if (clean === 'শুরু') return 'শুরু';
  var parts = clean.split('-');
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      return parts[2] + '-' + parts[1] + '-' + parts[0];
    }
    return clean;
  }
  return clean;
};

window.getCurrentTimeBR = function() {
  var d = new Date();
  var hours = d.getHours();
  var minutes = d.getMinutes();
  var ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; 
  minutes = minutes < 10 ? '0' + minutes : minutes;
  return hours + ':' + minutes + ' ' + ampm;
};

window.parseDateToTime = function(dtStr) {
  if (!dtStr) return 0;
  var clean = String(dtStr).trim();
  var t = new Date(clean).getTime();
  return isNaN(t) ? 0 : t;
};

window.getPaymentsArray = function(payments) {
  if (!payments) return [];
  if (Array.isArray(payments)) return payments;
  if (typeof payments === 'object') return Object.values(payments);
  return [];
};

window.switchTab = function(tab, btn) {
  var contents = document.querySelectorAll('.tab-content');
  for (var i = 0; i < contents.length; i++) {
    contents[i].style.display = 'none';
  }

  var navBtns = document.querySelectorAll('nav button');
  for (var j = 0; j < navBtns.length; j++) {
    navBtns[j].classList.remove('active');
  }

  var target = getEl('tab-' + tab);
  if (target) {
    target.style.display = 'block';
  }

  if (btn) {
    btn.classList.add('active');
  } else if (window.event && window.event.target) {
    window.event.target.classList.add('active');
  }
};

// স্থায়ী লগইন সিস্টেম
window.doLogin = function() {
  var u = (getEl('loginId') ? getEl('loginId').value : '').trim().toLowerCase();
  var p = (getEl('loginPass') ? getEl('loginPass').value : '').trim();

  if (u === 'nanda' && p === '1234') {
    localStorage.setItem('nanda_auth_status', 'logged_in');
    getEl('loginScreen').style.display = 'none';
    getEl('appBody').style.display = 'block';
    if (typeof window.listenAllData === 'function') {
      window.listenAllData();
    }
  } else {
    if (getEl('loginErr')) {
      getEl('loginErr').innerText = 'ভুল আইডি বা পাসওয়ার্ড! আইডি: nanda, পাসওয়ার্ড: 1234';
    }
  }
};

window.doLogout = function() {
  localStorage.removeItem('nanda_auth_status');
  location.reload();
};

window.onload = function() {
  var todayISO = new Date().toISOString().split('T')[0];
  var defaultDateIds = ['milkDate', 'saleDate', 'orderDate', 'expDate', 'brAiDate', 'hlthDate', 'ledgerPayDate', 'feedDate'];
  defaultDateIds.forEach(function(id) {
    if (getEl(id)) {
      getEl(id).value = todayISO;
    }
  });

  if (localStorage.getItem('nanda_auth_status') === 'logged_in') {
    if (getEl('loginScreen')) {
      getEl('loginScreen').style.display = 'none';
    }
    if (getEl('appBody')) {
      getEl('appBody').style.display = 'block';
    }
    if (typeof window.listenAllData === 'function') {
      window.listenAllData();
    }
  } else {
    if (getEl('loginScreen')) {
      getEl('loginScreen').style.display = 'flex';
    }
    if (getEl('appBody')) {
      getEl('appBody').style.display = 'none';
    }
  }
};

function autoCalcExpectedCalving() {
  var aiVal = getEl('brAiDate').value;
  if (aiVal) {
    var d = new Date(aiVal);
    d.setDate(d.getDate() + 280);
    getEl('brExpCalvingDate').value = d.toISOString().split('T')[0];
  }
}

var farmStore = {
  cattle: {}, breeding: {}, milk: {}, sales: {},
  customers: {}, orders: {}, expenses: {}, stock: {},
  semen: {}, health: {}, feed: {}
};
window.activeLedgerCustomerName = '';

function deleteRecord(path, id) {
  if (confirm('আপনি কি নিশ্চিতভাবে এই তথ্যটি মুছে ফেলতে চান?')) {
    if (db) db.ref(path).child(id).remove();
  }
}

window.printSpecificModal = function(target) {
  document.body.setAttribute('data-print', target);
  var origTitle = document.title;
  document.title = " ";
  window.print();
  setTimeout(function() {
    document.title = origTitle;
    document.body.removeAttribute('data-print');
  }, 1000);
};

function onSaleCustomerInput() {
  var val = (getEl('saleCustomer').value || '').trim().toLowerCase();
  if (!val) return;
  for (var k in farmStore.customers) {
    var c = farmStore.customers[k];
    if ((c.name || '').trim().toLowerCase() === val) {
      if (c.phone) getEl('salePhone').value = c.phone;
      if (c.area) getEl('saleArea').value = c.area;
      if (c.addr) getEl('saleAddr').value = c.addr;
      break;
    }
  }
}

function onOrderCustomerInput() {
  var val = (getEl('orderCustomer').value || '').trim().toLowerCase();
  if (!val) return;
  for (var k in farmStore.customers) {
    var c = farmStore.customers[k];
    if ((c.name || '').trim().toLowerCase() === val) {
      if (c.phone) getEl('orderPhone').value = c.phone;
      if (c.area) getEl('orderArea').value = c.area;
      break;
    }
  }
}

function checkAndGenerateDailyOrders() {
  if (!db) return;
  var todayISO = new Date().toISOString().split('T')[0];

  db.ref('customers').once('value', function(custSnap) {
    if (!custSnap.exists()) return;
    
    db.ref('orders').once('value', function(ordSnap) {
      var existingKeysToday = {};
      ordSnap.forEach(function(o) {
        var val = o.val();
        if (val && val.date === todayISO && val.customer) {
          var uniqueKey = val.date + '_' + val.customer.trim().toLowerCase();
          existingKeysToday[uniqueKey] = true;
        }
      });

      custSnap.forEach(function(c) {
        var cust = c.val();
        if (!cust || !cust.name) return;
        var cName = cust.name.trim();
        var demand = Number(cust.demand) || 0;
        if (demand <= 0) return;

        var uniqueKey = todayISO + '_' + cName.toLowerCase();
        if (!existingKeysToday[uniqueKey]) {
          var newOrder = {
            date: todayISO,
            customer: cName,
            phone: cust.phone || '',
            area: cust.area || '',
            items: demand + ' লিটার তরল দুধ',
            total: demand * 50,
            paid: 0,
            status: 'Pending'
          };
          db.ref('orders').push(newOrder);
        }
      });
    });
  });
}

function getCustomerLiveBalances() {
  var map = {};
  var now = new Date();
  var todayTime = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  for (var ck in farmStore.customers) {
    var cust = farmStore.customers[ck];
    if (!cust || !cust.name) continue;
    var cName = cust.name.trim();
    var cKey = cName.toLowerCase();
    var opDue = Number(cust.openingDue) || 0;

    if (!map[cKey]) {
      map[cKey] = {
        totalBilled: opDue,
        totalPaid: 0,
        currentDue: opDue,
        lastPaymentTime: 0,
        earliestBillTime: opDue > 0 ? todayTime : Infinity,
        phone: cust.phone || '',
        area: cust.area || '',
        addr: cust.addr || ''
      };
    }
  }

  for (var k in farmStore.sales) {
    var s = farmStore.sales[k];
    if (!s) continue;
    var cName = (s.name || '').trim();
    if (!cName) continue;
    var cKey = cName.toLowerCase();
    if (!map[cKey]) {
      map[cKey] = { totalBilled: 0, totalPaid: 0, currentDue: 0, lastPaymentTime: 0, earliestBillTime: Infinity, phone: '', area: '', addr: '' };
    }
    if (s.phone) map[cKey].phone = s.phone;
    if (s.area) map[cKey].area = s.area;
    if (s.addr) map[cKey].addr = s.addr;

    var bTot = Number(s.total) || 0;
    var bPaid = Number(s.paid) || 0;
    var billTime = parseDateToTime(s.date);

    if (bTot > 0) {
      map[cKey].totalBilled += bTot;
      if (billTime && billTime < map[cKey].earliestBillTime) {
        map[cKey].earliestBillTime = billTime;
      }
    }

    var pList = getPaymentsArray(s.payments);
    if (pList.length > 0) {
      var subsequentSum = 0;
      pList.forEach(function(p) {
        var pAmt = Number(p.amount) || 0;
        map[cKey].totalPaid += pAmt;
        subsequentSum += pAmt;
        if (pAmt > 0 && p.date) {
          var pTime = parseDateToTime(p.date);
          if (pTime > map[cKey].lastPaymentTime) {
            map[cKey].lastPaymentTime = pTime;
          }
        }
      });
      var initialPaid = Math.max(0, bPaid - subsequentSum);
      map[cKey].totalPaid += initialPaid;
      if (initialPaid > 0 && billTime && billTime > map[cKey].lastPaymentTime) {
        map[cKey].lastPaymentTime = billTime;
      }
    } else {
      map[cKey].totalPaid += bPaid;
      if (bPaid > 0 && billTime && billTime > map[cKey].lastPaymentTime) {
        map[cKey].lastPaymentTime = billTime;
      }
    }
  }

  for (var key in map) {
    var c = map[key];
    c.currentDue = Math.max(0, c.totalBilled - c.totalPaid);
    c.isOverdue35 = false;
    c.daysWithoutPayment = 0;

    if (c.currentDue > 0) {
      if (c.lastPaymentTime > 0) {
        var daysSincePayment = Math.floor((todayTime - c.lastPaymentTime) / (1000 * 3600 * 24));
        if (daysSincePayment >= 35) {
          c.isOverdue35 = true;
          c.daysWithoutPayment = daysSincePayment;
        }
      } else {
        if (c.earliestBillTime !== Infinity) {
          var daysSinceFirstBill = Math.floor((todayTime - c.earliestBillTime) / (1000 * 3600 * 24));
          if (daysSinceFirstBill >= 35) {
            c.isOverdue35 = true;
            c.daysWithoutPayment = daysSinceFirstBill;
          }
        }
      }
    }
  }
  return map;
}

function getMilkStatsByTag() {
  var stats = {};
  for (var k in farmStore.milk) {
    var m = farmStore.milk[k];
    var tagKey = (m.cow || '').trim().toUpperCase();
    if (!tagKey) continue;
    if (!stats[tagKey]) stats[tagKey] = { total: 0, daysSet: {} };
    stats[tagKey].total += (Number(m.liters) || 0);
    if (m.date) stats[tagKey].daysSet[m.date] = true;
  }
  var res = {};
  for (var t in stats) {
    res[t] = { total: stats[t].total, days: Object.keys(stats[t].daysSet).length };
  }
  return res;
}

function renderCattleTable() {
  var milkStats = getMilkStatsByTag();
  var list = [];
  for (var k in farmStore.cattle) list.push({ key: k, data: farmStore.cattle[k] });

  list.sort(function(a, b) {
    var tagA = (a.data.tag || '').toString();
    var tagB = (b.data.tag || '').toString();
    return tagA.localeCompare(tagB, undefined, { numeric: true, sensitivity: 'base' });
  });

  var dl = getEl('cattleTagList');
  if (dl) {
    var optHtml = '';
    list.forEach(function(item) {
      var t = (item.data.tag || '').trim();
      var b = (item.data.breed || '').trim();
      if (t) optHtml += '<option value="' + t + '">' + (b ? t + ' (' + b + ')' : t) + '</option>';
    });
    dl.innerHTML = optHtml;
  }

  var body = getEl('cattleTableBody'); 
  if (body) {
    body.innerHTML = '';
    list.forEach(function(item, index) {
      var d = item.data, k = item.key;
      var tagKey = (d.tag || '').trim().toUpperCase();
      var mInfo = milkStats[tagKey];
      var milkDisplay = '-';

      if (mInfo && mInfo.total > 0) {
        milkDisplay = '<strong style="color:var(--primary); font-size:13px;">' + mInfo.total.toFixed(1) + ' L</strong> <span style="color:#555; font-size:11px;">(' + mInfo.days + ' দিন)</span>';
      } else if (d.milkDay && d.milkDay > 0) {
        milkDisplay = d.milkDay + ' L/day';
      } else {
        milkDisplay = '<span style="color:#999;">০ L</span>';
      }

      body.innerHTML += '<tr>' +
        '<td><strong>' + (index + 1) + '</strong></td>' +
        '<td><strong>' + (d.tag || '-') + '</strong></td>' +
        '<td>' + (d.breed || '-') + '</td>' +
        '<td>' + (d.breedType || '-') + '</td>' +
        '<td>' + (d.generation || '-') + '</td>' +
        '<td>' + formatDateBR(d.dob) + '</td>' +
        '<td>' + (d.weight || 0) + ' kg</td>' +
        '<td>' + (d.lactation || 0) + '</td>' +
        '<td><span class="badge badge-success">' + (d.status || '-') + '</span></td>' +
        '<td>' + milkDisplay + '</td>' +
        '<td>' + (d.sire || '-') + '</td>' +
        '<td>' + formatDateBR(d.expCalving) + '</td>' +
        '<td>' +
          '<button class="action-btn btn-info" onclick="editCattle(\'' + k + '\')">Edit</button>' +
          '<button class="action-btn btn-danger" onclick="deleteRecord(\'cattle\',\'' + k + '\')">Delete</button>' +
        '</td>' +
      '</tr>';
    });
  }
  if (getEl('dash-cow-count')) getEl('dash-cow-count').innerText = list.length;
  renderBreedSummary();
}

window.toggleMilkDate = function(safeDt) {
  var row = getEl('milk-det-' + safeDt);
  var btn = getEl('milk-btn-' + safeDt);
  if (row) {
    if (row.style.display === 'none' || !row.style.display) {
      row.style.display = 'table-row';
      if (btn) btn.innerText = 'সংকুচিত করুন ▲';
    } else {
      row.style.display = 'none';
      if (btn) btn.innerText = 'বিস্তারিত দেখুন ▼';
    }
  }
};

function renderGroupedMilkTable() {
  var body = getEl('milkGroupTableBody');
  if (!body) return;

  var dateGroups = {};
  var totalMilkAll = 0;
  var todayISO = new Date().toISOString().split('T')[0];
  var todayBR = formatDateBR(todayISO);
  var todayTotal = 0;

  for (var k in farmStore.milk) {
    var m = farmStore.milk[k];
    var dt = formatDateBR(m.date) || 'Unknown';
    var lit = Number(m.liters) || 0;
    totalMilkAll += lit;
    if (m.date === todayISO || dt === todayBR) todayTotal += lit;

    if (!dateGroups[dt]) dateGroups[dt] = { date: dt, total: 0, cows: {}, items: [] };
    dateGroups[dt].total += lit;
    if (m.cow) dateGroups[dt].cows[m.cow.trim().toUpperCase()] = true;
    dateGroups[dt].items.push({ key: k, data: m });
  }

  if (getEl('dash-milk-today')) getEl('dash-milk-today').innerText = todayTotal.toFixed(1) + ' L';
  if (getEl('rep-milk')) getEl('rep-milk').innerText = totalMilkAll.toFixed(1);

  var sortedDates = Object.keys(dateGroups).sort(function(a, b) { return parseDateToTime(b) - parseDateToTime(a); });

  if (sortedDates.length === 0) {
    body.innerHTML = '';
    if (getEl('milkNoData')) getEl('milkNoData').style.display = 'block';
    return;
  }
  if (getEl('milkNoData')) getEl('milkNoData').style.display = 'none';

  var html = '';
  sortedDates.forEach(function(dt) {
    var group = dateGroups[dt];
    var safeDt = dt.replace(/[^a-zA-Z0-9]/g, '_');
    var cowCount = Object.keys(group.cows).length;

    html += '<tr style="background:#fff; cursor:pointer;" onclick="toggleMilkDate(\'' + safeDt + '\')">' +
      '<td><strong>📅 ' + dt + '</strong></td>' +
      '<td><strong style="color:var(--primary); font-size:14px;">' + group.total.toFixed(1) + ' L</strong></td>' +
      '<td><span class="badge badge-success">' + cowCount + ' টি গরু</span></td>' +
      '<td>' + group.items.length + ' টি এন্ট্রি</td>' +
      '<td><button class="action-btn btn-info" id="milk-btn-' + safeDt + '" onclick="event.stopPropagation(); toggleMilkDate(\'' + safeDt + '\')">বিস্তারিত দেখুন ▼</button></td>' +
    '</tr>';

    html += '<tr id="milk-det-' + safeDt + '" style="display:none; background:#f4fbf5;">' +
      '<td colspan="5" style="padding:12px 18px;">' +
        '<div style="background:white; border:1px solid #c8e6c9; border-radius:8px; padding:12px;">' +
          '<table style="width:100%; font-size:12px;">' +
            '<thead><tr style="background:#e8f5e9;"><th>গরুর ট্যাগ</th><th>সেশন</th><th>দুধ</th><th>অ্যাকশন</th></tr></thead>' +
            '<tbody>';

    group.items.forEach(function(item) {
      html += '<tr><td><strong>' + (item.data.cow || '-') + '</strong></td><td>' + (item.data.session || '-') + '</td><td><strong>' + (item.data.liters || 0) + ' L</strong></td><td><button class="action-btn btn-info" onclick="editMilk(\'' + item.key + '\')">Edit</button><button class="action-btn btn-danger" onclick="deleteRecord(\'milk\',\'' + item.key + '\')">Delete</button></td></tr>';
    });

    html += '</tbody></table></div></td></tr>';
  });
  body.innerHTML = html;
}

function renderSalesTable() {
  var body = getEl('salesTableBody');
  if (!body) return;

  var custBalances = getCustomerLiveBalances();
  var searchQ = (getEl('saleSearchInput') ? getEl('saleSearchInput').value : '').trim().toLowerCase();
  var areaFilter = (getEl('saleAreaFilter') ? getEl('saleAreaFilter').value : '').trim().toLowerCase();

  var tS = 0;
  var uniqueAreas = {};
  var customerMap = {};

  for (var ck in farmStore.customers) {
    var cust = farmStore.customers[ck];
    if (!cust || !cust.name) continue;
    var rName = cust.name.trim();
    var cKey = rName.toLowerCase();
    customerMap[cKey] = {
      key: 'cust-' + ck,
      data: { name: rName, phone: cust.phone || '', area: cust.area || '', addr: cust.addr || '', item: '-', qty: 0, total: 0, paid: 0, date: '' },
      latestDate: '',
      latestTime: 0,
      customerName: rName
    };
  }

  for (var k in farmStore.sales) {
    var d = farmStore.sales[k];
    if (!d || (d.isPayment && Number(d.total) === 0)) continue;
    tS += Number(d.total) || 0;
    if (d.area) uniqueAreas[d.area.trim()] = true;

    var rawName = (d.name || '').trim();
    if (!rawName) continue;
    var cKey = rawName.toLowerCase();
    var saleTime = parseDateToTime(d.date);
    var fDateBR = formatDateBR(d.date);

    if (!customerMap[cKey] || saleTime >= customerMap[cKey].latestTime) {
      customerMap[cKey] = { key: k, data: d, latestDate: fDateBR, latestTime: saleTime, customerName: rawName };
    }
  }

  var list = [];
  for (var cKey in customerMap) {
    var cObj = customerMap[cKey];
    var d = cObj.data;
    var cBal = custBalances[cKey] || { currentDue: Number(d.due) || 0, isOverdue35: false, daysWithoutPayment: 0 };
    list.push({ key: cObj.key, data: d, customerName: cObj.customerName, lastProductDate: cObj.latestDate, liveCustomerDue: cBal.currentDue, isOverdue: cBal.isOverdue35, diffDays: cBal.daysWithoutPayment });
  }

  var totalLiveFarmDue = 0;
  for (var ck in custBalances) { totalLiveFarmDue += custBalances[ck].currentDue; }

  if (getEl('dash-total-sales')) getEl('dash-total-sales').innerText = '₹ ' + tS.toLocaleString();
  if (getEl('dash-total-due')) getEl('dash-total-due').innerText = '₹ ' + totalLiveFarmDue.toLocaleString();
  if (getEl('rep-sales')) getEl('rep-sales').innerText = '₹ ' + tS.toLocaleString();
  calcNet();

  var areaSelect = getEl('saleAreaFilter');
  if (areaSelect) {
    var currVal = areaSelect.value;
    var optH = '<option value="">সকল এলাকা</option>';
    Object.keys(uniqueAreas).sort().forEach(function(a) {
      optH += '<option value="' + a + '" ' + (currVal.toLowerCase() === a.toLowerCase() ? 'selected' : '') + '>' + a + '</option>';
    });
    areaSelect.innerHTML = optH;
  }

  var filtered = list.filter(function(item) {
    var d = item.data;
    var nameMatch = (item.customerName || d.name || '').toLowerCase().includes(searchQ);
    var phoneMatch = (d.phone || '').toLowerCase().includes(searchQ);
    return (!searchQ || nameMatch || phoneMatch) && (!areaFilter || (d.area || '').toLowerCase() === areaFilter);
  });

  filtered.sort(function(a, b) {
    if (a.isOverdue && !b.isOverdue) return -1;
    if (!a.isOverdue && b.isOverdue) return 1;
    return parseDateToTime(b.lastProductDate) - parseDateToTime(a.lastProductDate);
  });

  if (filtered.length === 0) {
    body.innerHTML = '';
    if (getEl('salesNoData')) getEl('salesNoData').style.display = 'block';
    return;
  }
  if (getEl('salesNoData')) getEl('salesNoData').style.display = 'none';

  var html = '';
  filtered.forEach(function(item) {
    var k = item.key, d = item.data, dueVal = item.liveCustomerDue;
    var rowStyle = item.isOverdue ? 'background:#fff3f3; border-left:5px solid #d32f2f;' : '';
    var dueBadge = item.isOverdue && dueVal > 0 ? '<span class="badge badge-danger">₹ ' + dueVal + ' (⚠️ ' + item.diffDays + ' দিন বাকি)</span>' : (dueVal > 0 ? '<strong style="color:red;">₹ ' + dueVal + '</strong>' : '<span class="badge badge-success">পরিশোধ</span>');

    var actionBtns = k.startsWith('cust-') ? 
      '<button class="action-btn" style="background:#455a64; color:white;" onclick="showCustomerLedger(\'' + encodeURIComponent(item.customerName) + '\')">খাতা</button>' :
      '<button class="action-btn" style="background:#455a64; color:white;" onclick="showCustomerLedger(\'' + encodeURIComponent(item.customerName) + '\')">খাতা</button>' +
      '<button class="action-btn btn-info" onclick="showInvoice(\'' + k + '\')">Invoice</button>' +
      '<button class="action-btn btn-warning" onclick="editSale(\'' + k + '\')">Edit</button>' +
      '<button class="action-btn btn-danger" onclick="deleteRecord(\'sales\',\'' + k + '\')">Delete</button>';

    html += '<tr style="' + rowStyle + '">' +
      '<td>' + (item.lastProductDate || '-') + '</td>' +
      '<td><a href="javascript:void(0)" onclick="showCustomerLedger(\'' + encodeURIComponent(item.customerName) + '\')" style="color:var(--primary); font-weight:bold; text-decoration:underline;">' + item.customerName + '</a>' + (d.phone ? '<br><small>📞 ' + d.phone + '</small>' : '') + (item.lastProductDate ? '<br><small style="color:#1b5e20; font-weight:600;">📅 শেষ: ' + item.lastProductDate + '</small>' : '') + '</td>' +
      '<td>' + (d.area ? '<span class="badge badge-warning">' + d.area + '</span><br>' : '') + (d.addr || '-') + '</td>' +
      '<td>' + (d.item && d.item !== '-' ? d.item + ' (' + (d.qty || 0) + ')' : '-') + '</td>' +
      '<td>₹ ' + (d.total || 0) + '</td>' +
      '<td style="color:green; font-weight:600;">₹ ' + (d.paid || 0) + '</td>' +
      '<td>' + dueBadge + '</td>' +
      '<td>' + actionBtns + '</td>' +
    '</tr>';
  });
  body.innerHTML = html;
}

function renderOrdersTable() {
  var body = getEl('ordersTableBody');
  if (!body) return;

  var searchQ = (getEl('orderSearchInput') ? getEl('orderSearchInput').value : '').trim().toLowerCase();
  var areaFilter = (getEl('orderAreaFilter') ? getEl('orderAreaFilter').value : '').trim().toLowerCase();

  var uniqueAreas = {};
  var customerMap = {};
  var pendingCount = 0;

  for (var k in farmStore.orders) {
    var d = farmStore.orders[k];
    if (!d || !d.customer) continue;
    
    if (d.status === 'Pending') {
      pendingCount++;
    }
    if (d.status !== 'Pending') continue;

    var rName = d.customer.trim();
    var cKey = rName.toLowerCase();

    var custPhone = d.phone || '';
    var custArea = d.area || '';
    for (var ck in farmStore.customers) {
      var cust = farmStore.customers[ck];
      if (cust && cust.name && cust.name.trim().toLowerCase() === cKey) {
        if (cust.phone) custPhone = cust.phone;
        if (cust.area) custArea = cust.area.trim();
        break;
      }
    }

    if (custArea) uniqueAreas[custArea] = true;

    if (!customerMap[cKey]) {
      customerMap[cKey] = {
        customerName: rName,
        phone: custPhone,
        area: custArea,
        orders: []
      };
    }
    customerMap[cKey].orders.push({ key: k, data: d });
  }

  if (getEl('dash-pending-orders')) getEl('dash-pending-orders').innerText = pendingCount;

  var areaSelect = getEl('orderAreaFilter');
  if (areaSelect) {
    var currVal = areaSelect.value;
    var optH = '<option value="">সকল এলাকা</option>';
    Object.keys(uniqueAreas).sort().forEach(function(a) {
      optH += '<option value="' + a + '" ' + (currVal.toLowerCase() === a.toLowerCase() ? 'selected' : '') + '>' + a + '</option>';
    });
    areaSelect.innerHTML = optH;
  }

  var list = [];
  for (var cKey in customerMap) {
    var cObj = customerMap[cKey];
    var latestDate = '';
    var latestTime = 0;
    cObj.orders.forEach(function(o) {
      var t = parseDateToTime(o.data.date);
      if (t >= latestTime) {
        latestTime = t;
        latestDate = formatDateBR(o.data.date);
      }
    });
    list.push({
      customerName: cObj.customerName,
      phone: cObj.phone,
      area: cObj.area,
      orders: cObj.orders,
      latestDate: latestDate,
      latestTime: latestTime
    });
  }

  var filtered = list.filter(function(item) {
    var nameMatch = item.customerName.toLowerCase().includes(searchQ);
    var phoneMatch = item.phone.toLowerCase().includes(searchQ);
    return (!searchQ || nameMatch || phoneMatch) && (!areaFilter || item.area.toLowerCase() === areaFilter.toLowerCase());
  });

  filtered.sort(function(a, b) { return b.latestTime - a.latestTime; });

  if (filtered.length === 0) {
    body.innerHTML = '';
    if (getEl('ordersNoData')) getEl('ordersNoData').style.display = 'block';
    return;
  }
  if (getEl('ordersNoData')) getEl('ordersNoData').style.display = 'none';

  var html = '';
  filtered.forEach(function(item) {
    var cName = item.customerName;
    var itemsSummary = [];
    var totalSum = 0;

    item.orders.forEach(function(o) {
      itemsSummary.push(o.data.items + ' (' + formatDateBR(o.data.date) + ')');
      totalSum += Number(o.data.total) || 0;
    });

    var rowStyle = 'background: #fff8f8; border-left: 4px solid #d32f2f;';
    var statusBadge = '<span class="badge badge-danger">Pending</span>';
    var firstKey = item.orders[0].key;

    html += '<tr style="' + rowStyle + '">' +
      '<td>' + (item.latestDate || '-') + '</td>' +
      '<td><a href="javascript:void(0)" onclick="showCustomerLedger(\'' + encodeURIComponent(cName) + '\')" style="color:var(--primary); font-weight:bold; text-decoration:underline;">' + cName + '</a>' + (item.phone ? '<br><small>📞 ' + item.phone + '</small>' : '') + '</td>' +
      '<td>' + (item.area ? '<span class="badge badge-warning">' + item.area + '</span>' : '-') + '</td>' +
      '<td>' + itemsSummary.join('<br>') + '<br><strong>মোট: ₹ ' + totalSum + '</strong></td>' +
      '<td>' + statusBadge + '</td>' +
      '<td>' +
        '<button class="action-btn" style="background:#455a64; color:white;" onclick="showCustomerLedger(\'' + encodeURIComponent(cName) + '\')">খাতা</button>' +
        '<button class="action-btn btn-info" onclick="editOrder(\'' + firstKey + '\')">Edit</button>' +
        '<button class="action-btn btn-danger" onclick="deleteRecord(\'orders\',\'' + firstKey + '\')">Delete</button>' +
      '</td>' +
    '</tr>';
  });
  body.innerHTML = html;
}

window.showCustomerLedger = function(encName) {
  var custName = decodeURIComponent(encName).trim();
  window.activeLedgerCustomerName = custName;
  document.body.setAttribute('data-print', 'ledger');
  
  var custLower = custName.toLowerCase();
  var cPhone = '', cArea = '', cAddr = '', opDue = 0;

  for (var ck in farmStore.customers) {
    var cust = farmStore.customers[ck];
    if (cust && cust.name && cust.name.trim().toLowerCase() === custLower) {
      cPhone = cust.phone || ''; cArea = cust.area || ''; cAddr = cust.addr || ''; opDue = Number(cust.openingDue) || 0;
      break;
    }
  }

  var events = [];
  var totalBillAmount = opDue, totalPaidAmount = 0;

  if (opDue > 0) {
    events.push({ date: 'শুরু', desc: 'প্রাথমিক বকেয়া', bill: opDue, paid: 0, netDiff: opDue, isOpening: true, timestamp: 0 });
  }

  for (var k in farmStore.sales) {
    var s = farmStore.sales[k];
    if (!s) continue;
    if ((s.name || '').trim().toLowerCase() === custLower) {
      if (s.phone && !cPhone) cPhone = s.phone;
      if (s.area && !cArea) cArea = s.area;
      if (s.addr && !cAddr) cAddr = s.addr;

      var bTot = Number(s.total) || 0;
      var bCurPaid = Number(s.paid) || 0;
      var pList = getPaymentsArray(s.payments);
      var subsequentSum = 0;
      pList.forEach(function(p) { subsequentSum += (Number(p.amount) || 0); });
      var initialPaid = Math.max(0, bCurPaid - subsequentSum);

      if (bTot > 0) {
        totalBillAmount += bTot; totalPaidAmount += initialPaid;
        events.push({ date: formatDateBR(s.date), desc: (s.item || 'পণ্য') + (s.qty ? ' (' + s.qty + ')' : ''), bill: bTot, paid: initialPaid, netDiff: bTot - initialPaid, isSale: true, saleKey: k, timestamp: parseDateToTime(s.date) });
      }

      pList.forEach(function(p, pIdx) {
        var pAmt = Number(p.amount) || 0; totalPaidAmount += pAmt;
        events.push({ date: formatDateBR(p.date || s.date), desc: '💳 বকেয়া জমা (' + (p.note || 'ক্যাশ') + ')', bill: 0, paid: pAmt, netDiff: -pAmt, isPayment: true, payObj: p, saleKey: k, timestamp: parseDateToTime(p.date || s.date) + (pIdx + 1) });
      });
    }
  }

  events.sort(function(a, b) { return a.timestamp - b.timestamp; });
  var runningBalance = 0;
  events.forEach(function(ev) { runningBalance += ev.netDiff; ev.cumDue = Math.max(0, runningBalance); });
  events.reverse();

  getEl('ledgerCustSub').innerHTML = 'গ্রাহক: <strong>' + custName + '</strong> ' + (cPhone ? '| 📞 ' + cPhone : '');
  getEl('ledgerTotalBill').innerText = '₹ ' + totalBillAmount.toLocaleString();
  getEl('ledgerTotalPaid').innerText = '₹ ' + totalPaidAmount.toLocaleString();
  getEl('ledgerTotalDue').innerText = '₹ ' + Math.max(0, totalBillAmount - totalPaidAmount).toLocaleString();

  if (getEl('ledgerPayDate')) getEl('ledgerPayDate').value = new Date().toISOString().split('T')[0];
  if (getEl('ledgerPayAmount')) getEl('ledgerPayAmount').value = '';
  if (getEl('ledgerPayNote')) getEl('ledgerPayNote').value = '';

  var tbody = getEl('ledgerTableBody');
  if (events.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#888;">কোনো রেকর্ড নেই।</td></tr>';
  } else {
    var html = '';
    events.forEach(function(ev) {
      if (ev.isOpening) {
        html += '<tr style="background:#fff9c4;"><td>' + ev.date + '</td><td><strong>' + ev.desc + '</strong></td><td>₹ ' + ev.bill + '</td><td>₹ 0</td><td style="color:#e65100; font-weight:bold;">₹ ' + ev.cumDue + '</td><td>-</td></tr>';
      } else if (ev.isSale) {
        html += '<tr><td>' + ev.date + '</td><td><strong>' + ev.desc + '</strong></td><td>₹ ' + ev.bill + '</td><td style="color:green; font-weight:600;">₹ ' + ev.paid + '</td><td style="color:#e65100; font-weight:bold;">₹ ' + ev.cumDue + '</td><td><button class="action-btn btn-info" onclick="showInvoice(\'' + ev.saleKey + '\')">📄 Invoice</button></td></tr>';
      } else {
        html += '<tr style="background:#f9fdfa;"><td>' + ev.date + '</td><td><strong style="color:#1b5e20;">' + ev.desc + '</strong></td><td>₹ 0</td><td style="color:green; font-weight:700;">₹ ' + ev.paid + '</td><td style="color:#e65100; font-weight:bold;">₹ ' + ev.cumDue + '</td><td><button class="action-btn btn-info" onclick="showPaymentInvoice(\'' + ev.date + '\', ' + ev.paid + ', \'' + (ev.payObj.note || 'ক্যাশ') + '\', \'' + custName + '\', \'' + cPhone + '\', \'' + cArea + '\', \'' + cAddr + '\', ' + ev.cumDue + ', \'' + (ev.payObj.id || '') + '\')">📄 Invoice</button></td></tr>';
      }
    });
    tbody.innerHTML = html;
  }
  getEl('ledgerModal').style.display = 'flex';
};

window.closeLedger = function() {
  getEl('ledgerModal').style.display = 'none';
  window.activeLedgerCustomerName = '';
  document.body.removeAttribute('data-print');
};

window.saveCustomerPayment = function() {
  var amt = parseFloat(getEl('ledgerPayAmount').value) || 0;
  if (amt <= 0) return alert('জমার পরিমাণ দিন!');
  var pDate = getEl('ledgerPayDate').value || new Date().toISOString().split('T')[0];
  var pNote = (getEl('ledgerPayNote').value || 'নগদ জমা').trim();
  var custName = window.activeLedgerCustomerName;

  var unpaidSales = [];
  for (var k in farmStore.sales) {
    var s = farmStore.sales[k];
    if (s && (s.name || '').trim().toLowerCase() === custName.toLowerCase() && Number(s.due) > 0) {
      unpaidSales.push({ key: k, data: s });
    }
  }
  unpaidSales.sort(function(a, b) { return (a.data.date || '').localeCompare(b.data.date || ''); });

  var paymentId = 'PAY-' + Date.now();
  var rem = amt;
  unpaidSales.forEach(function(item) {
    if (rem <= 0) return;
    var curDue = Number(item.data.due) || 0;
    var curPaid = Number(item.data.paid) || 0;
    var payAmount = Math.min(rem, curDue);
    rem -= payAmount;
    var pList = getPaymentsArray(item.data.payments);
    pList.push({ id: paymentId, date: pDate, amount: payAmount, note: pNote });
    if (db) db.ref('sales/' + item.key).update({ paid: curPaid + payAmount, due: curDue - payAmount, payments: pList });
  });

  if (rem > 0) {
    var advRecord = { date: pDate, name: custName, phone: '', area: '', addr: '', item: 'অগ্রিম জমা (' + pNote + ')', qty: 1, rate: 0, total: 0, paid: rem, due: 0, isPayment: true, payments: [{ id: paymentId, date: pDate, amount: rem, note: pNote }] };
    if (db) db.ref('sales').push(advRecord);
  }

  alert('পেমেন্ট সফলভাবে জমা হয়েছে!');
  getEl('ledgerPayAmount').value = ''; getEl('ledgerPayNote').value = '';
  setTimeout(function() { showCustomerLedger(encodeURIComponent(custName)); }, 300);
};

window.showPaymentInvoice = function(pDate, pAmt, pNote, custName, cPhone, cArea, cAddr, balAfter, pId) {
  document.body.setAttribute('data-print', 'invoice');
  getEl('invMainDocTitle').innerText = 'ইনভয়েস (পেমেন্ট বিল)';
  var timeStr = getCurrentTimeBR();
  getEl('invoiceDetails').innerHTML = '<div style="display:flex; justify-content:space-between; margin-bottom:12px;"><div><strong>গ্রাহক:</strong> ' + custName + '<br>মোবাইল: ' + cPhone + '</div><div style="text-align:right;">তারিখ: ' + pDate + ' | সময়: ' + timeStr + '<br>স্ট্যাটাস: <span style="color:green; font-weight:bold;">PAID</span></div></div><table class="invoice-table" style="border:1px solid #ddd; width:100%;"><thead><tr style="background:#e8f5e9;"><th>বিবরণ</th><th>পদ্ধতি</th><th style="text-align:right;">আদায়কৃত অর্থ</th></tr></thead><tbody><tr><td>বকেয়া জমা</td><td>' + pNote + '</td><td style="text-align:right; font-weight:bold; color:green;">₹ ' + pAmt + '</td></tr></tbody></table><div style="text-align:right; margin-top:10px;">বর্তমান বকেয়া: <strong>₹ ' + balAfter + '</strong></div>';
  getEl('invoiceModal').style.display = 'flex';
};

window.showInvoice = function(k) {
  var d = farmStore.sales[k];
  if (!d) return;
  document.body.setAttribute('data-print', 'invoice');
  getEl('invMainDocTitle').innerText = 'ইনভয়েস (ক্যাশ মেমো)';
  var liveDue = getCustomerLiveBalances()[(d.name || '').trim().toLowerCase()]?.currentDue || 0;
  var timeStr = getCurrentTimeBR();
  getEl('invoiceDetails').innerHTML = '<div style="display:flex; justify-content:space-between; margin-bottom:12px;"><div><strong>গ্রাহক:</strong> ' + d.name + '<br>মোবাইল: ' + (d.phone || '-') + '</div><div style="text-align:right;">তারিখ: ' + formatDateBR(d.date) + ' | সময়: ' + timeStr + '<br>ইনভয়েস: #NDA-' + k.substring(1, 6).toUpperCase() + '</div></div><table class="invoice-table" style="border:1px solid #ddd; width:100%;"><thead><tr style="background:#e8f5e9;"><th>পণ্য</th><th>পরিমাণ</th><th>দর</th><th style="text-align:right;">মোট</th></tr></thead><tbody><tr><td>' + d.item + '</td><td>' + d.qty + '</td><td>₹ ' + d.rate + '</td><td style="text-align:right; font-weight:bold;">₹ ' + d.total + '</td></tr></tbody></table><div style="text-align:right; margin-top:10px;">চালান মূল্য: ₹ ' + d.total + '<br>নগদ পরিশোধ: ₹ ' + d.paid + '<br><span style="color:red; font-weight:bold;">মোট বকেয়া: ₹ ' + liveDue + '</span></div>';
  getEl('invoiceModal').style.display = 'flex';
};

window.closeInvoice = function() {
  getEl('invoiceModal').style.display = 'none';
  document.body.removeAttribute('data-print');
};

var eCatKey = null;
function editCattle(k) {
  var d = farmStore.cattle[k]; if (!d) return; eCatKey = k;
  getEl('cowTag').value = d.tag || ''; getEl('cowBreed').value = d.breed || ''; getEl('cowBreedType').value = d.breedType || '';
  getEl('cowGeneration').value = d.generation || 'F1'; getEl('cowDob').value = d.dob || ''; getEl('cowWeight').value = d.weight || '';
  getEl('cowLactation').value = d.lactation || ''; getEl('cowStatus').value = d.status || 'Milking'; getEl('cowMilkDay').value = d.milkDay || '';
  getEl('cowSire').value = d.sire || ''; getEl('cowDam').value = d.dam || ''; getEl('cowExpCalving').value = d.expCalving || '';
  getEl('cowSubmitBtn').innerText = 'Update Cattle'; getEl('cowCancelBtn').style.display = 'inline-flex';
}
function cancelCattleEdit() {
  eCatKey = null; ['cowTag','cowBreed','cowBreedType','cowDob','cowWeight','cowLactation','cowMilkDay','cowSire','cowDam','cowExpCalving'].forEach(function(i){ getEl(i).value=''; });
  getEl('cowSubmitBtn').innerText = 'Save Cattle'; getEl('cowCancelBtn').style.display = 'none';
}
function saveCattle() {
  var tag = (getEl('cowTag').value || '').trim(); if (!tag) return alert('Tag ID দিন!');
  var data = { tag: tag, breed: getEl('cowBreed').value, breedType: getEl('cowBreedType').value, generation: getEl('cowGeneration').value, dob: getEl('cowDob').value, weight: parseFloat(getEl('cowWeight').value)||0, lactation: parseFloat(getEl('cowLactation').value)||0, status: getEl('cowStatus').value, milkDay: parseFloat(getEl('cowMilkDay').value)||0, sire: getEl('cowSire').value, dam: getEl('cowDam').value, expCalving: getEl('cowExpCalving').value };
  if (db) eCatKey ? db.ref('cattle/' + eCatKey).update(data) : db.ref('cattle').push(data);
  cancelCattleEdit();
}

var eBrKey = null;
function editBreeding(k) {
  var d = farmStore.breeding[k]; if (!d) return; eBrKey = k;
  getEl('brCowTag').value = d.tag || ''; getEl('brAiDate').value = d.aiDate || ''; getEl('brSemenId').value = d.semenId || '';
  getEl('brCompany').value = d.company || ''; getEl('brAiCost').value = d.aiCost || ''; getEl('brPdDate').value = d.pdDate || '';
  getEl('brStatus').value = d.status || 'Pending'; getEl('brExpCalvingDate').value = d.expCalvingDate || d.calvingDate || ''; getEl('brActCalvingDate').value = d.actCalvingDate || '';
  getEl('brSubmitBtn').innerText = 'Update Breeding'; getEl('brCancelBtn').style.display = 'inline-flex';
}
function cancelBreedingEdit() {
  eBrKey = null; ['brCowTag','brSemenId','brCompany','brAiCost','brPdDate','brExpCalvingDate','brActCalvingDate'].forEach(function(id){ if(getEl(id)) getEl(id).value=''; });
  getEl('brStatus').value = 'Pending'; getEl('brSubmitBtn').innerText = 'Save Breeding Record'; getEl('brCancelBtn').style.display = 'none';
}
function saveBreeding() {
  var tag = (getEl('brCowTag').value || '').trim(); if (!tag) return alert('Cattle ID দিন!');
  var data = { tag: tag, aiDate: getEl('brAiDate').value, semenId: getEl('brSemenId').value, company: getEl('brCompany').value, aiCost: parseFloat(getEl('brAiCost').value)||0, pdDate: getEl('brPdDate').value, status: getEl('brStatus').value, expCalvingDate: getEl('brExpCalvingDate').value, actCalvingDate: getEl('brActCalvingDate').value };
  if (db) eBrKey ? db.ref('breeding/' + eBrKey).update(data) : db.ref('breeding').push(data);
  cancelBreedingEdit();
}

var eMlkKey = null;
function editMilk(k) {
  var d = farmStore.milk[k]; if (!d) return; eMlkKey = k;
  getEl('milkDate').value = d.date || ''; getEl('milkCowTag').value = d.cow || ''; getEl('milkSession').value = d.session || 'Morning'; getEl('milkLiters').value = d.liters || '';
  getEl('milkSubmitBtn').innerText = 'Update Milk'; getEl('milkCancelBtn').style.display = 'inline-flex';
}
function cancelMilkEdit() {
  eMlkKey = null; getEl('milkCowTag').value = ''; getEl('milkLiters').value = '';
  getEl('milkSubmitBtn').innerText = 'Save Milk Record'; getEl('milkCancelBtn').style.display = 'none';
}
function saveMilk() {
  var lit = parseFloat(getEl('milkLiters').value) || 0; if (!lit) return alert('দুধের পরিমাণ দিন!');
  var cowTag = (getEl('milkCowTag').value || '').trim(); if (!cowTag) return alert('Tag ID দিন!');
  var data = { date: getEl('milkDate').value, cow: cowTag, session: getEl('milkSession').value, liters: lit };
  if (db) eMlkKey ? db.ref('milk/' + eMlkKey).update(data) : db.ref('milk').push(data);
  cancelMilkEdit();
}

var eSaleKey = null;
function calcSale() {
  var q = parseFloat(getEl('saleQty').value) || 0, r = parseFloat(getEl('saleRate').value) || 0, t = q * r;
  getEl('saleTotal').value = t; getEl('saleDue').value = t - (parseFloat(getEl('salePaid').value) || 0);
}
function editSale(k) {
  var d = farmStore.sales[k]; if (!d) return; eSaleKey = k;
  getEl('saleDate').value = d.date || ''; getEl('saleCustomer').value = d.name || ''; getEl('salePhone').value = d.phone || '';
  getEl('saleArea').value = d.area || ''; getEl('saleAddr').value = d.addr || ''; getEl('saleItem').value = d.item || 'Liquid Milk';
  getEl('saleQty').value = d.qty || ''; getEl('saleRate').value = d.rate || ''; getEl('saleTotal').value = d.total || '';
  getEl('salePaid').value = d.paid || ''; getEl('saleDue').value = d.due || '';
  getEl('saleSubmitBtn').innerText = 'Update Sale'; getEl('saleCancelBtn').style.display = 'inline-flex';
}
function cancelSaleEdit() {
  eSaleKey = null; ['saleCustomer','salePhone','saleArea','saleAddr','saleQty','saleRate','saleTotal','salePaid','saleDue'].forEach(function(i){ getEl(i).value=''; });
  getEl('saleSubmitBtn').innerText = 'Save Sale'; getEl('saleCancelBtn').style.display = 'none';
}
function saveSale() {
  var name = (getEl('saleCustomer').value || '').trim(); if (!name) return alert('Customer Name দিন!');
  var data = { date: getEl('saleDate').value, name: name, phone: (getEl('salePhone').value || '').trim(), area: (getEl('saleArea').value || '').trim(), addr: (getEl('saleAddr').value || '').trim(), item: getEl('saleItem').value, qty: parseFloat(getEl('saleQty').value)||0, rate: parseFloat(getEl('saleRate').value)||0, total: parseFloat(getEl('saleTotal').value)||0, paid: parseFloat(getEl('salePaid').value)||0, due: parseFloat(getEl('saleDue').value)||0, payments: [] };
  if (db) eSaleKey ? db.ref('sales/' + eSaleKey).update(data) : db.ref('sales').push(data);
  cancelSaleEdit();
}

var eCustKey = null;
function editCustomer(k) {
  var d = farmStore.customers[k]; if (!d) return; eCustKey = k;
  getEl('custName').value = d.name || ''; getEl('custPhone').value = d.phone || ''; getEl('custArea').value = d.area || '';
  getEl('custAddress').value = d.addr || ''; getEl('custDailyDemand').value = d.demand || '';
  if (getEl('custOpeningDue')) getEl('custOpeningDue').value = d.openingDue || 0;
  if (getEl('custType')) getEl('custType').value = d.type || 'Regular Retailer';
  if (getEl('custShift')) getEl('custShift').value = d.shift || 'Morning';
  getEl('custSubmitBtn').innerText = 'Update Customer'; getEl('custCancelBtn').style.display = 'inline-flex';
}
function cancelCustomerEdit() {
  eCustKey = null; ['custName','custPhone','custArea','custAddress','custDailyDemand','custOpeningDue'].forEach(function(i){ if(getEl(i)) getEl(i).value=''; });
  getEl('custSubmitBtn').innerText = 'Save Customer'; getEl('custCancelBtn').style.display = 'none';
}
function saveCustomer() {
  var name = (getEl('custName').value || '').trim(); if (!name) return alert('নাম দিন!');
  var data = { name: name, phone: (getEl('custPhone').value || '').trim(), area: (getEl('custArea').value || '').trim(), addr: (getEl('custAddress').value || '').trim(), demand: parseFloat(getEl('custDailyDemand').value)||0, openingDue: parseFloat(getEl('custOpeningDue')?.value)||0, type: getEl('custType')?.value||'Regular Retailer', shift: getEl('custShift')?.value||'Morning' };
  if (db) eCustKey ? db.ref('customers/' + eCustKey).update(data) : db.ref('customers').push(data);
  cancelCustomerEdit();
}

var eOrdKey = null;
function editOrder(k) {
  var d = farmStore.orders[k]; if (!d) return; eOrdKey = k;
  getEl('orderDate').value = d.date || ''; getEl('orderCustomer').value = d.customer || ''; getEl('orderPhone').value = d.phone || '';
  getEl('orderArea').value = d.area || ''; getEl('orderItems').value = d.items || ''; getEl('orderTotal').value = d.total || '';
  getEl('orderPaid').value = d.paid || ''; getEl('orderStatus').value = d.status || 'Pending';
  getEl('orderSubmitBtn').innerText = 'Update Order'; getEl('orderCancelBtn').style.display = 'inline-flex';
  getEl('orderCustomer').scrollIntoView({ behavior: 'smooth' });
}
function cancelOrderEdit() {
  eOrdKey = null; ['orderCustomer','orderPhone','orderArea','orderItems','orderTotal','orderPaid'].forEach(function(i){ if(getEl(i)) getEl(i).value=''; });
  getEl('orderStatus').value = 'Pending'; getEl('orderSubmitBtn').innerText = 'Save Order'; getEl('orderCancelBtn').style.display = 'none';
}
function saveOrder() {
  var cust = (getEl('orderCustomer').value || '').trim(); 
  var items = (getEl('orderItems').value || '').trim();
  if (!cust || !items) return alert('নাম ও বিবরণ দিন!');
  
  var status = getEl('orderStatus').value; 
  var total = parseFloat(getEl('orderTotal').value) || 0; 
  var paid = parseFloat(getEl('orderPaid').value) || 0;
  var deliveryDate = getEl('orderDate').value;
  var phone = (getEl('orderPhone') ? getEl('orderPhone').value : '').trim();
  var area = (getEl('orderArea') ? getEl('orderArea').value : '').trim();

  for (var ck in farmStore.customers) {
    var cObj = farmStore.customers[ck];
    if (cObj && cObj.name && cObj.name.trim().toLowerCase() === cust.toLowerCase()) {
      if (!phone && cObj.phone) phone = cObj.phone;
      if (!area && cObj.area) area = cObj.area.trim();
      break;
    }
  }

  var data = { 
    date: deliveryDate, 
    customer: cust, 
    phone: phone, 
    area: area, 
    items: items, 
    total: total, 
    paid: paid, 
    status: status 
  };

  if (db) {
    if (eOrdKey) {
      db.ref('orders/' + eOrdKey).remove();
    }
    if (status === 'Delivered') {
      if (total > 0) {
        db.ref('sales').push({ 
          date: deliveryDate, 
          name: cust, 
          phone: phone, 
          area: area, 
          addr: '', 
          item: items, 
          qty: 1, 
          rate: total, 
          total: total, 
          paid: paid, 
          due: Math.max(0, total - paid), 
          payments: [] 
        });
      }
    } else {
      db.ref('orders').push(data);
    }
  }
  cancelOrderEdit();
}

var eFeedKey = null;
function editFeed(k) {
  var d = farmStore.feed[k]; if (!d) return; eFeedKey = k;
  getEl('feedDate').value = d.date || '';
  getEl('feedType').value = d.type || 'Cattle Feed / Pellets';
  getEl('feedQty').value = d.qty || '';
  getEl('feedCost').value = d.cost || '';
  getEl('feedNote').value = d.note || '';
  getEl('feedSubmitBtn').innerText = 'Update Feed';
  getEl('feedCancelBtn').style.display = 'inline-flex';
  getEl('feedDate').scrollIntoView({ behavior: 'smooth' });
}
function cancelFeedEdit() {
  eFeedKey = null;
  ['feedQty','feedCost','feedNote'].forEach(function(i){ if(getEl(i)) getEl(i).value=''; });
  getEl('feedSubmitBtn').innerText = 'Save Feed Record';
  getEl('feedCancelBtn').style.display = 'none';
}
function saveFeed() {
  var dt = getEl('feedDate').value;
  var type = getEl('feedType').value;
  var qty = (getEl('feedQty').value || '').trim();
  var cost = parseFloat(getEl('feedCost').value) || 0;
  var note = (getEl('feedNote').value || '').trim();

  if (!dt || !qty || cost <= 0) return alert('তারিখ, পরিমাণ ও মোট খরচ দিন!');

  var data = { date: dt, type: type, qty: qty, cost: cost, note: note };
  if (db) {
    if (eFeedKey) {
      db.ref('feed/' + eFeedKey).update(data);
    } else {
      db.ref('feed').push(data);
    }
  }
  cancelFeedEdit();
}

function renderFeedTable() {
  var body = getEl('feedTableBody');
  if (!body) return;
  var list = [];
  for (var k in farmStore.feed) {
    list.push({ key: k, data: farmStore.feed[k] });
  }
  list.sort(function(a, b) {
    return (b.data.date || '').localeCompare(a.data.date || '');
  });

  if (list.length === 0) {
    body.innerHTML = '';
    if (getEl('feedNoData')) getEl('feedNoData').style.display = 'block';
    return;
  }
  if (getEl('feedNoData')) getEl('feedNoData').style.display = 'none';

  var html = '';
  list.forEach(function(item) {
    var k = item.key, d = item.data;
    html += '<tr>' +
      '<td>' + formatDateBR(d.date) + '</td>' +
      '<td><strong>' + (d.type || '-') + '</strong></td>' +
      '<td>' + (d.qty || '-') + '</td>' +
      '<td style="color:var(--danger); font-weight:600;">₹ ' + (d.cost || 0) + '</td>' +
      '<td>' + (d.note || '-') + '</td>' +
      '<td>' +
        '<button class="action-btn btn-info" onclick="editFeed(\'' + k + '\')">Edit</button>' +
        '<button class="action-btn btn-danger" onclick="deleteRecord(\'feed\',\'' + k + '\')">Delete</button>' +
      '</td>' +
    '</tr>';
  });
  body.innerHTML = html;
}

window.toggleExpenseDate = function(safeDt) {
  var row = getEl('exp-det-' + safeDt); var btn = getEl('exp-btn-' + safeDt);
  if (row) {
    if (row.style.display === 'none' || !row.style.display) { row.style.display = 'table-row'; if(btn) btn.innerText = 'সংকুচিত করুন ▲'; }
    else { row.style.display = 'none'; if(btn) btn.innerText = 'বিস্তারিত দেখুন ▼'; }
  }
};

var eExpKey = null;
function editExpense(k) {
  var d = farmStore.expenses[k]; if (!d) return; eExpKey = k;
  getEl('expDate').value = d.date || ''; getEl('expCategory').value = d.category || 'Other';
  getEl('expTitle').value = d.title || ''; getEl('expAmount').value = d.amount || '';
  getEl('expSubmitBtn').innerText = 'Update Expense'; getEl('expCancelBtn').style.display = 'inline-flex';
}
function cancelExpenseEdit() {
  eExpKey = null; getEl('expTitle').value = ''; getEl('expAmount').value = '';
  getEl('expSubmitBtn').innerText = 'Save Expense'; getEl('expCancelBtn').style.display = 'none';
}
function saveExpense() {
  var title = (getEl('expTitle').value || '').trim(), amt = parseFloat(getEl('expAmount').value)||0, dt = getEl('expDate').value;
  if (!title || !amt || !dt) return alert('সকল তথ্য দিন!');
  var data = { date: dt, category: getEl('expCategory').value, title: title, amount: amt };
  if (db) eExpKey ? db.ref('expenses/' + eExpKey).update(data) : db.ref('expenses').push(data);
  cancelExpenseEdit();
}

function renderGroupedExpenseTable() {
  var body = getEl('expenseGroupTableBody'); if (!body) return;
  var dateGroups = {}, totalExpAll = 0;
  for (var k in farmStore.expenses) {
    var e = farmStore.expenses[k]; if (!e) continue;
    var dtBR = formatDateBR(e.date) || 'Unknown', amt = Number(e.amount) || 0;
    totalExpAll += amt;
    if (!dateGroups[dtBR]) dateGroups[dtBR] = { date: dtBR, total: 0, items: [] };
    dateGroups[dtBR].total += amt;
    dateGroups[dtBR].items.push({ key: k, data: e });
  }
  if (getEl('dash-total-exp')) getEl('dash-total-exp').innerText = '₹ ' + totalExpAll.toLocaleString();
  if (getEl('rep-expenses')) getEl('rep-expenses').innerText = '₹ ' + totalExpAll.toLocaleString();
  calcNet();

  var sortedDates = Object.keys(dateGroups).sort(function(a, b) { return parseDateToTime(b) - parseDateToTime(a); });
  if (sortedDates.length === 0) { body.innerHTML = ''; if(getEl('expenseNoData')) getEl('expenseNoData').style.display = 'block'; return; }
  if(getEl('expenseNoData')) getEl('expenseNoData').style.display = 'none';

  var html = '';
  sortedDates.forEach(function(dt) {
    var group = dateGroups[dt], safeDt = dt.replace(/[^a-zA-Z0-9]/g, '_');
    html += '<tr style="background:#fff; cursor:pointer;" onclick="toggleExpenseDate(\'' + safeDt + '\')"><td><strong>📅 ' + dt + '</strong></td><td><strong style="color:var(--danger);">₹ ' + group.total.toLocaleString() + '</strong></td><td>' + group.items.length + ' টি এন্ট্রি</td><td><button class="action-btn btn-info" id="exp-btn-' + safeDt + '" onclick="event.stopPropagation(); toggleExpenseDate(\'' + safeDt + '\')">বিস্তারিত দেখুন ▼</button></td></tr>';
    html += '<tr id="exp-det-' + safeDt + '" style="display:none; background:#fff8f8;"><td colspan="4" style="padding:12px;"><div style="background:white; border:1px solid #ffcdd2; border-radius:8px; padding:12px;"><table style="width:100%; font-size:12px;"><thead><tr style="background:#ffebee;"><th>খাত</th><th>বিবরণ</th><th>টাকা</th><th>অ্যাকশন</th></tr></thead><tbody>';
    group.items.forEach(function(item) {
      html += '<tr><td>' + (item.data.category || '-') + '</td><td><strong>' + (item.data.title || '-') + '</strong></td><td><strong style="color:var(--danger);">₹ ' + (item.data.amount || 0) + '</strong></td><td><button class="action-btn btn-info" onclick="editExpense(\'' + item.key + '\')">Edit</button><button class="action-btn btn-danger" onclick="deleteRecord(\'expenses\',\'' + item.key + '\')">Delete</button></td></tr>';
    });
    html += '</tbody></table></div></td></tr>';
  });
  body.innerHTML = html;
}

var eStkKey = null;
function editStock(k) {
  var d = farmStore.stock[k]; if (!d) return; eStkKey = k;
  getEl('stkName').value = d.name || ''; getEl('stkQty').value = d.qty || ''; getEl('stkUnit').value = d.unit || 'kg'; getEl('stkAlert').value = d.alertLevel || '';
  getEl('stkSubmitBtn').innerText = 'Update Stock'; getEl('stkCancelBtn').style.display = 'inline-flex';
}
function cancelStockEdit() {
  eStkKey = null; getEl('stkName').value = ''; getEl('stkQty').value = ''; getEl('stkAlert').value = '';
  getEl('stkSubmitBtn').innerText = 'Save Stock'; getEl('stkCancelBtn').style.display = 'none';
}
function saveStock() {
  var name = (getEl('stkName').value || '').trim(); if (!name) return alert('নাম দিন!');
  var data = { name: name, qty: parseFloat(getEl('stkQty').value)||0, unit: getEl('stkUnit').value, alertLevel: parseFloat(getEl('stkAlert').value)||0 };
  if (db) eStkKey ? db.ref('stock/' + eStkKey).update(data) : db.ref('stock').push(data);
  cancelStockEdit();
}

var eSemKey = null;
function editSemen(k) {
  var d = farmStore.semen[k]; if (!d) return; eSemKey = k;
  getEl('semBatch').value = d.batch || ''; getEl('semBreed').value = d.breed || ''; getEl('semSource').value = d.source || ''; getEl('semCount').value = d.count || '';
  getEl('semSubmitBtn').innerText = 'Update Semen'; getEl('semCancelBtn').style.display = 'inline-flex';
}
function cancelSemenEdit() {
  eSemKey = null; ['semBatch','semBreed','semSource','semCount'].forEach(function(i){ getEl(i).value=''; });
  getEl('semSubmitBtn').innerText = 'Save Semen Stock'; getEl('semCancelBtn').style.display = 'none';
}
function saveSemen() {
  var b = (getEl('semBatch').value || '').trim(); if (!b) return alert('Batch দিন!');
  var data = { batch: b, breed: getEl('semBreed').value, source: getEl('semSource').value, count: parseFloat(getEl('semCount').value)||0 };
  if (db) eSemKey ? db.ref('semen/' + eSemKey).update(data) : db.ref('semen').push(data);
  cancelSemenEdit();
}

var eHlthKey = null;
function editHealth(k) {
  var d = farmStore.health[k]; if (!d) return; eHlthKey = k;
  getEl('hlthDate').value = d.date || ''; getEl('hlthCowTag').value = d.cowTag || ''; getEl('hlthType').value = d.type || 'Vaccination';
  getEl('hlthDesc').value = d.desc || ''; getEl('hlthNextDate').value = d.nextDate || '';
  getEl('hlthSubmitBtn').innerText = 'Update Health'; getEl('hlthCancelBtn').style.display = 'inline-flex';
}
function cancelHealthEdit() {
  eHlthKey = null; ['hlthCowTag','hlthDesc','hlthNextDate'].forEach(function(i){ getEl(i).value=''; });
  getEl('hlthSubmitBtn').innerText = 'Save Health Record'; getEl('hlthCancelBtn').style.display = 'none';
}
function saveHealth() {
  var tag = (getEl('hlthCowTag').value || '').trim(); if (!tag) return alert('Tag দিন!');
  var data = { date: getEl('hlthDate').value, cowTag: tag, type: getEl('hlthType').value, desc: getEl('hlthDesc').value, nextDate: getEl('hlthNextDate').value };
  if (db) eHlthKey ? db.ref('health/' + eHlthKey).update(data) : db.ref('health').push(data);
  cancelHealthEdit();
}

function downloadBackup() {
  if (!db) return alert('ডাটাবেস নেই!');
  db.ref('/').once('value', function(snap) {
    var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(snap.val(), null, 2));
    var a = document.createElement('a'); a.setAttribute("href", dataStr); a.setAttribute("download", "Nanda_Dairy_Backup.json"); a.click();
  });
}

function renderBreedSummary() {
  var summaryEl = getEl('breedSummaryBadges'); if (!summaryEl) return;
  var counts = {};
  for (var k in farmStore.cattle) {
    var c = farmStore.cattle[k]; var key = (c.breed || 'Jersey').trim() + ' : ' + (c.generation || 'F1').trim();
    counts[key] = (counts[key] || 0) + 1;
  }
  var keys = Object.keys(counts);
  if (keys.length === 0) { summaryEl.innerHTML = '<span style="font-size:12px; color:#777;">কোনো ক্যাটল নেই।</span>'; return; }
  var html = '';
  keys.forEach(function(k) { html += '<span style="background:#e8f5e9; color:#1b5e20; border:1px solid #c8e6c9; padding:6px 14px; border-radius:20px; font-size:12px; font-weight:700;">' + k + ' : ' + counts[k] + '</span>'; });
  summaryEl.innerHTML = html;
}

window.listenAllData = function() {
  if (!db) return;
  checkAndGenerateDailyOrders();

  db.ref('cattle').on('value', function(snap) { farmStore.cattle = {}; snap.forEach(function(c){ farmStore.cattle[c.key] = c.val(); }); renderCattleTable(); });
  db.ref('milk').on('value', function(snap) { farmStore.milk = {}; snap.forEach(function(c){ farmStore.milk[c.key] = c.val(); }); renderGroupedMilkTable(); renderCattleTable(); });
  db.ref('breeding').on('value', function(snap) {
    farmStore.breeding = {}; var body = getEl('breedingTableBody'); if (body) body.innerHTML = ''; var count = 0;
    snap.forEach(function(c) {
      count++; var d = c.val(), k = c.key; farmStore.breeding[k] = d;
      var badgeClass = d.status === 'Pregnant' ? 'badge-success' : (d.status === 'Failed' ? 'badge-danger' : 'badge-warning');
      if (body) body.innerHTML += '<tr><td><strong>' + (d.tag || '-') + '</strong></td><td>' + formatDateBR(d.aiDate) + '</td><td>' + (d.semenId || '-') + '</td><td>' + (d.company || '-') + '</td><td>₹ ' + (d.aiCost || 0) + '</td><td>' + formatDateBR(d.pdDate) + '</td><td><span class="badge ' + badgeClass + '">' + (d.status || 'Pending') + '</span></td><td>' + formatDateBR(d.expCalvingDate || d.calvingDate) + '</td><td>' + formatDateBR(d.actCalvingDate) + '</td><td><button class="action-btn btn-info" onclick="editBreeding(\'' + k + '\')">Edit</button><button class="action-btn btn-danger" onclick="deleteRecord(\'breeding\',\'' + k + '\')">Delete</button></td></tr>';
    });
    if (getEl('breedingNoData')) getEl('breedingNoData').style.display = count === 0 ? 'block' : 'none';
  });

  db.ref('sales').on('value', function(snap) {
    farmStore.sales = {}; snap.forEach(function(c){ farmStore.sales[c.key] = c.val(); });
    renderSalesTable();
    if (window.activeLedgerCustomerName) showCustomerLedger(encodeURIComponent(window.activeLedgerCustomerName));
  });

  db.ref('customers').on('value', function(snap) {
    farmStore.customers = {}; var body = getEl('customerTableBody'); if (body) body.innerHTML = '';
    var nameOpt = '', areaOpt = '', areaSet = {};
    snap.forEach(function(c) {
      var d = c.val(), k = c.key; farmStore.customers[k] = d;
      if (d.name) nameOpt += '<option value="' + d.name + '">' + (d.phone ? d.name + ' (' + d.phone + ')' : d.name) + '</option>';
      if (d.area && !areaSet[d.area]) { areaSet[d.area] = true; areaOpt += '<option value="' + d.area + '">'; }
      if (body) body.innerHTML += '<tr><td><strong>' + (d.name || '-') + '</strong></td><td>' + (d.phone || '-') + '</td><td>' + (d.area ? '<span class="badge badge-warning">' + d.area + '</span>' : '-') + '</td><td>' + (d.addr || '-') + '</td><td>' + (d.demand || 0) + ' L</td><td>₹ ' + (d.openingDue || 0) + '</td><td><span style="font-size:11px; background:#e3f2fd; padding:2px 6px;">' + (d.type || 'Retail') + '</span> / <span style="font-size:11px; color:#1b5e20;">' + (d.shift || 'Morning') + '</span></td><td><button class="action-btn btn-info" onclick="editCustomer(\'' + k + '\')">Edit</button><button class="action-btn btn-danger" onclick="deleteRecord(\'customers\',\'' + k + '\')">Delete</button></td></tr>';
    });
    if (getEl('customerNameList')) getEl('customerNameList').innerHTML = nameOpt;
    if (getEl('customerAreaList')) getEl('customerAreaList').innerHTML = areaOpt;
    renderSalesTable();
    renderOrdersTable();
  });

  db.ref('orders').on('value', function(snap) {
    farmStore.orders = {};
    snap.forEach(function(c) {
      farmStore.orders[c.key] = c.val();
    });
    renderOrdersTable();
  });

  db.ref('feed').on('value', function(snap) {
    farmStore.feed = {};
    snap.forEach(function(c) {
      farmStore.feed[c.key] = c.val();
    });
    renderFeedTable();
  });

  db.ref('expenses').on('value', function(snap) {
    farmStore.expenses = {}; snap.forEach(function(c){ farmStore.expenses[c.key] = c.val(); });
    renderGroupedExpenseTable();
  });

  db.ref('stock').on('value', function(snap) {
    farmStore.stock = {}; var body = getEl('stockTableBody'); if (body) body.innerHTML = '';
    snap.forEach(function(c) {
      var d = c.val(), k = c.key; farmStore.stock[k] = d;
      var isLow = Number(d.qty) <= Number(d.alertLevel);
      if (body) body.innerHTML += '<tr><td><strong>' + (d.name || '-') + '</strong></td><td style="color:' + (isLow ? 'red' : 'inherit') + ';font-weight:bold;">' + (d.qty || 0) + '</td><td>' + (d.unit || '-') + '</td><td>' + (d.alertLevel || 0) + '</td><td><button class="action-btn btn-info" onclick="editStock(\'' + k + '\')">Edit</button><button class="action-btn btn-danger" onclick="deleteRecord(\'stock\',\'' + k + '\')">Delete</button></td></tr>';
    });
  });

  db.ref('semen').on('value', function(snap) {
    farmStore.semen = {}; var body = getEl('semenTableBody'); if (body) body.innerHTML = '';
    snap.forEach(function(c) {
      var d = c.val(), k = c.key; farmStore.semen[k] = d;
      if (body) body.innerHTML += '<tr><td><strong>' + (d.batch || '-') + '</strong></td><td>' + (d.breed || '-') + '</td><td>' + (d.source || '-') + '</td><td><strong>' + (d.count || 0) + ' Straws</strong></td><td><button class="action-btn btn-info" onclick="editSemen(\'' + k + '\')">Edit</button><button class="action-btn btn-danger" onclick="deleteRecord(\'semen\',\'' + k + '\')">Delete</button></td></tr>';
    });
  });

  db.ref('health').on('value', function(snap) {
    farmStore.health = {}; var body = getEl('healthTableBody'); if (body) body.innerHTML = '';
    snap.forEach(function(c) {
      var d = c.val(), k = c.key; farmStore.health[k] = d;
      if (body) body.innerHTML += '<tr><td>' + formatDateBR(d.date) + '</td><td><strong>' + (d.cowTag || '-') + '</strong></td><td>' + (d.type || '-') + '</td><td>' + (d.desc || '-') + '</td><td>' + formatDateBR(d.nextDate) + '</td><td><button class="action-btn btn-info" onclick="editHealth(\'' + k + '\')">Edit</button><button class="action-btn btn-danger" onclick="deleteRecord(\'health\',\'' + k + '\')">Delete</button></td></tr>';
    });
  });
};

function calcNet() {
  var s = parseFloat((getEl('rep-sales') ? getEl('rep-sales').innerText : '0').replace(/[^0-9.-]+/g, "")) || 0;
  var e = parseFloat((getEl('rep-expenses') ? getEl('rep-expenses').innerText : '0').replace(/[^0-9.-]+/g, "")) || 0;
  var net = s - e;
  var pEl = getEl('rep-profit');
  if (pEl) {
    pEl.innerText = '₹ ' + net.toLocaleString();
    pEl.style.color = net >= 0 ? 'green' : 'red';
  }
}
