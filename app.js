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
  var defaultDateIds = ['milkDate', 'saleDate', 'orderDate', 'expDate', 'brAiDate', 'hlthDate', 'ledgerPayDate', 'feedDate', 'rationDate'];
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
  semen: {}, health: {}, feedRations: {}, feed: {}
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
  var todayBR = formatDateBR(todayISO);

  db.ref('/').once('value', function(snap) {
    var allData = snap.val() || {};
    var existingOrders = allData.orders || {};
    var existingSales = allData.sales || {};
    var existingCustomers = allData.customers || {};
    var todayProcessedMap = {};

    Object.keys(existingOrders).forEach(function(k) {
      var o = existingOrders[k];
      if (o && o.customer) {
        var oDate = String(o.date || '').trim();
        if (oDate === todayISO || formatDateBR(oDate) === todayBR) {
          todayProcessedMap[o.customer.trim().toLowerCase()] = true;
        }
      }
    });

    Object.keys(existingSales).forEach(function(k) {
      var s = existingSales[k];
      if (s && s.name && !s.isPayment) {
        var sDate = String(s.date || '').trim();
        if (sDate === todayISO || formatDateBR(sDate) === todayBR) {
          todayProcessedMap[s.name.trim().toLowerCase()] = true;
        }
      }
    });

    Object.keys(existingCustomers).forEach(function(k) {
      var cust = existingCustomers[k];
      if (cust && cust.name && Number(cust.demand) > 0) {
        var cName = cust.name.trim();
        var cKey = cName.toLowerCase();

        if (!todayProcessedMap[cKey]) {
          var safeCustKey = cKey.replace(/[^a-z0-9\u0980-\u09FF]/g, '_');
          var deterministicOrderId = 'auto_' + todayISO + '_' + safeCustKey;

          if (!existingOrders[deterministicOrderId]) {
            var autoOrder = {
              date: todayISO,
              customer: cName,
              phone: cust.phone || '',
              area: cust.area || '',
              items: cust.demand + ' লিটার তরল দুধ',
              total: Number(cust.demand) * 50,
              paid: 0,
              status: 'Pending'
            };
            db.ref('orders/' + deterministicOrderId).set(autoOrder);
            todayProcessedMap[cKey] = true;
          }
        }
      }
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

// সেলস লেজার টেবিল রেন্ডারিং (তারিখ অনুযায়ী স্বতন্ত্র এন্ট্রি এবং একই দিনে একাধিক হলে 'বিস্তারিত দেখুন' সহ)
function renderSalesTable(salesData) {
  var body = getEl('salesTableBody');
  if (!body) return;

  var custBalances = getCustomerLiveBalances();
  var searchQ = (getEl('saleSearchInput') ? getEl('saleSearchInput').value : '').trim().toLowerCase();
  var areaFilter = (getEl('saleAreaFilter') ? getEl('saleAreaFilter').value : '').trim().toLowerCase();

  var tS = 0;
  var uniqueAreas = {};
  var dateCustomerMap = {};

  for (var k in farmStore.sales) {
    var s = farmStore.sales[k];
    if (!s || (s.isPayment && Number(s.total) === 0)) continue;
    tS += Number(s.total) || 0;
    if (s.area) uniqueAreas[s.area.trim()] = true;

    var rawName = (s.name || '').trim();
    if (!rawName) continue;
    var rawDate = (s.date || '').trim();
    var groupKey = rawDate + '_' + rawName.toLowerCase();

    if (!dateCustomerMap[groupKey]) {
      dateCustomerMap[groupKey] = {
        date: rawDate,
        name: rawName,
        phone: s.phone || '',
        area: s.area || s.addr || '',
        entries: [],
        latestTime: parseDateToTime(rawDate)
      };
    }
    dateCustomerMap[groupKey].entries.push({ key: k, sale: s });
  }

  var list = [];
  for (var gKey in dateCustomerMap) {
    var itemGroup = dateCustomerMap[gKey];
    var cKey = itemGroup.name.toLowerCase();
    
    var groupTotalQty = 0;
    var groupTotalAmount = 0;
    var groupTotalPaid = 0;
    
    itemGroup.entries.forEach(function(e) {
      groupTotalQty += parseFloat(e.sale.qty || e.sale.quantity || 1) || 1;
      groupTotalAmount += Number(e.sale.total) || 0;
      groupTotalPaid += Number(e.sale.paid) || 0;
    });

    var cBal = custBalances[cKey] || { currentDue: Math.max(0, groupTotalAmount - groupTotalPaid), isOverdue35: false, daysWithoutPayment: 0 };

    list.push({
      groupKey: gKey,
      date: itemGroup.date,
      name: itemGroup.name,
      phone: itemGroup.phone,
      area: itemGroup.area,
      entries: itemGroup.entries,
      totalQty: groupTotalQty,
      totalAmount: groupTotalAmount,
      totalPaid: groupTotalPaid,
      latestTime: itemGroup.latestTime,
      liveCustomerDue: cBal.currentDue,
      isOverdue: cBal.isOverdue35,
      diffDays: cBal.daysWithoutPayment
    });
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
    var nameMatch = item.name.toLowerCase().includes(searchQ);
    var phoneMatch = (item.phone || '').toLowerCase().includes(searchQ);
    return (!searchQ || nameMatch || phoneMatch) && (!areaFilter || (item.area || '').toLowerCase() === areaFilter);
  });

  filtered.sort(function(a, b) { return b.latestTime - a.latestTime; });

  if (filtered.length === 0) {
    body.innerHTML = '<tr><td colspan="8" style="text-align:center; color:#888;">কোনো বিক্রয় রেকর্ড নেই।</td></tr>';
    if (getEl('salesNoData')) getEl('salesNoData').style.display = 'block';
    return;
  }
  if (getEl('salesNoData')) getEl('salesNoData').style.display = 'none';

  var html = '';
  filtered.forEach(function(item, idx) {
    var dateBR = formatDateBR(item.date);
    var dueVal = Math.max(0, item.liveCustomerDue);
    var subTableId = 'sub_sales_' + idx;
    var hasMultiple = item.entries.length > 1;
    var rowStyle = item.isOverdue ? 'background:#fff3f3; border-left:5px solid #d32f2f;' : 'background:#fafafa; border-top:2px solid #e0e0e0;';
    var dueBadge = item.isOverdue && dueVal > 0 ? '<span class="badge badge-danger">₹ ' + dueVal + ' (⚠️ ' + item.diffDays + ' দিন)</span>' : (dueVal > 0 ? '<strong style="color:red;">₹ ' + dueVal + '</strong>' : '<span class="badge badge-success">পরিশোধ</span>');

    var singleKey = !hasMultiple ? item.entries[0].key : '';

    var actionBtns = '<button class="action-btn" style="background:#455a64; color:white; padding:4px 8px; font-size:11px;" onclick="showCustomerLedger(\'' + encodeURIComponent(item.name) + '\')">খাতা</button> ';
    
    if (singleKey) {
      actionBtns += '<button class="action-btn btn-info" style="padding:4px 8px; font-size:11px;" onclick="showInvoice(\'' + singleKey + '\')">Invoice</button> ' +
                    '<button class="action-btn btn-warning" style="padding:4px 8px; font-size:11px;" onclick="editSale(\'' + singleKey + '\')">Edit</button> ' +
                    '<button class="action-btn btn-danger" style="padding:4px 8px; font-size:11px;" onclick="deleteRecord(\'sales\',\'' + singleKey + '\')">Delete</button>';
    } else {
      actionBtns += '<button class="action-btn btn-info" style="padding:4px 8px; font-size:11px; opacity:0.6; cursor:not-allowed;" title="একাধিক এন্ট্রি থাকলে বিস্তারিত থেকে এডিট/ডিলিট করুন">Invoice</button> ' +
                    '<button class="action-btn btn-warning" style="padding:4px 8px; font-size:11px; opacity:0.6; cursor:not-allowed;" title="একাধিক এন্ট্রি থাকলে বিস্তারিত থেকে এডিট/ডিলিট করুন">Edit</button> ' +
                    '<button class="action-btn btn-danger" style="padding:4px 8px; font-size:11px; opacity:0.6; cursor:not-allowed;" title="একাধিক এন্ট্রি থাকলে বিস্তারিত থেকে এডিট/ডিলিট করুন">Delete</button>';
    }

    var productColContent = '';
    if (hasMultiple) {
      productColContent = '<span style="color:#1b5e20; font-weight:600;">মোট ' + item.entries.length + 'টি এন্ট্রি (' + item.totalQty + ' লিটার)</span><br>' +
                          '<a href="javascript:void(0)" onclick="toggleSubSales(\'' + subTableId + '\', this)" style="display:inline-block; margin-top:5px; padding:4px 10px; background:#e1f5fe; color:#0288d1; font-weight:bold; font-size:12px; border-radius:4px; text-decoration:none;">বিস্তারিত দেখুন ▼</a>';
    } else {
      var s = item.entries[0].sale;
      productColContent = (s.item || 'দুধ') + ' (' + (s.qty || 1) + ')';
    }

    html += '<tr style="' + rowStyle + '">' +
      '<td>' + dateBR + '</td>' +
      '<td><strong>' + item.name + '</strong>' + (item.phone ? '<br><small style="color:#666;">📞 ' + item.phone + '</small>' : '') + '</td>' +
      '<td>' + item.area + '</td>' +
      '<td>' + productColContent + '</td>' +
      '<td><strong>₹ ' + item.totalAmount + '</strong></td>' +
      '<td style="color:green;">₹ ' + item.totalPaid + '</td>' +
      '<td>' + dueBadge + '</td>' +
      '<td>' + actionBtns + '</td>' +
    '</tr>';

    if (hasMultiple) {
      html += '<tr id="' + subTableId + '" style="display:none; background:#f1f8e9;"><td colspan="8" style="padding:10px 15px;">' +
        '<div style="font-size:12px; font-weight:bold; color:#2e7d32; margin-bottom:8px;">📋 এই দিনের পৃথক এন্ট্রিগুলোর বিবরণ ও এডিট/ডিলিট অপশন:</div>' +
        '<div style="overflow-x:auto;"><table style="width:100%; font-size:12px; background:white; border:1px solid #c8e6c9; border-collapse:collapse;">' +
          '<tr style="background:#e8f5e9;"><th style="padding:6px; border:1px solid #c8e6c9;">বিবরণ</th><th style="padding:6px; border:1px solid #c8e6c9;">পরিমাণ</th><th style="padding:6px; border:1px solid #c8e6c9;">মোট দাম</th><th style="padding:6px; border:1px solid #c8e6c9;">পরিশোধ</th><th style="padding:6px; border:1px solid #c8e6c9;">কার্যক্রম</th></tr>';
      
      item.entries.forEach(function(itemObj) {
        var sItem = itemObj.sale;
        html += '<tr>' +
          '<td style="padding:6px; border:1px solid #c8e6c9;">' + (sItem.item || 'দুধ') + '</td>' +
          '<td style="padding:6px; border:1px solid #c8e6c9;">' + (sItem.qty || 1) + '</td>' +
          '<td style="padding:6px; border:1px solid #c8e6c9;">₹ ' + (Number(sItem.total) || 0) + '</td>' +
          '<td style="padding:6px; border:1px solid #c8e6c9; color:green;">₹ ' + (Number(sItem.paid) || 0) + '</td>' +
          '<td style="padding:6px; border:1px solid #c8e6c9; white-space:nowrap;">' +
            '<button class="action-btn" style="padding:2px 5px; font-size:10px;" onclick="showInvoice(\'' + itemObj.key + '\')">Invoice</button> ' +
            '<button class="action-btn btn-warning" style="padding:2px 5px; font-size:10px;" onclick="editSale(\'' + itemObj.key + '\')">Edit</button> ' +
            '<button class="action-btn btn-danger" style="padding:2px 5px; font-size:10px;" onclick="deleteRecord(\'sales\',\'' + itemObj.key + '\')">Delete</button>' +
          '</td>' +
        '</tr>';
      });

      html += '</table></div></td></tr>';
    }
  });

  body.innerHTML = html;
}

// ড্রপডাউন টগল করার ফাংশন (Expand/Collapse)
function toggleSubSales(subId, linkEl) {
  var row = document.getElementById(subId);
  if (!row) return;
  if (row.style.display === 'none') {
    row.style.display = 'table-row';
    linkEl.innerText = 'সংক্ষিপ্ত দেখুন ▲';
    linkEl.style.background = '#ffebee';
    linkEl.style.color = '#c62828';
  } else {
    row.style.display = 'none';
    linkEl.innerText = 'বিস্তারিত দেখুন ▼';
    linkEl.style.background = '#e1f5fe';
    linkEl.style.color = '#0288d1';
  }
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
        orders: [],
        latestTime: 0,
        latestDate: ''
      };
    }
    customerMap[cKey].orders.push({ key: k, data: d });
  }

  var list = [];
  for (var cKey in customerMap) {
    var cObj = customerMap[cKey];
    var latestTime = 0;
    var latestDate = '';

    cObj.orders.forEach(function(o) {
      var t = parseDateToTime(o.data.date);
      if (t > latestTime) {
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

  var areaSelect = getEl('orderAreaFilter');
  if (areaSelect) {
    var currVal = areaSelect.value;
    var optH = '<option value="">সকল এলাকা</option>';
    Object.keys(uniqueAreas).sort().forEach(function(a) {
      optH += '<option value="' + a + '" ' + (currVal.toLowerCase() === a.toLowerCase() ? 'selected' : '') + '>' + a + '</option>';
    });
    areaSelect.innerHTML = optH;
  }

  var filtered = list.filter(function(item) {
    var nameMatch = item.customerName.toLowerCase().includes(searchQ);
    var phoneMatch = (item.phone || '').toLowerCase().includes(searchQ);
    return (!searchQ || nameMatch || phoneMatch) && (!areaFilter || (item.area || '').toLowerCase() === areaFilter);
  });

  filtered.sort(function(a, b) { return b.latestTime - a.latestTime; });

  if (filtered.length === 0) {
    body.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#888;">কোনো পেন্ডিং অর্ডার নেই।</td></tr>';
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

  var subHeaderHtml = '<div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 2px solid #1b5e20; padding-bottom: 12px; margin-bottom: 15px;">' +
    '<div style="display:flex; align-items:center; gap:10px;">' +
      '<button class="action-btn btn-info" style="padding:8px 14px; font-size:14px;" onclick="closeLedger()">⬅ ফিরে যান (Back)</button>' +
      '<div><h2 style="margin:0; color:#1b5e20; font-size:20px; border:none; padding:0;">গ্রাহক খাতা ও লেনদেন বিবরণী</h2>' +
      '<p id="ledgerCustSub" style="font-size:13px; color:#555; margin:3px 0 0 0;">গ্রাহক: <strong>' + custName + '</strong> ' + (cPhone ? '| 📞 ' + cPhone : '') + '</p></div>' +
    '</div>' +
    '<span class="badge badge-success" style="font-size:13px; padding:6px 12px;">Nanda Dairy & Agro</span>' +
  '</div>';

  var modalArea = document.querySelector('#ledgerModal .ledger-card');
  if (modalArea) {
    modalArea.innerHTML = subHeaderHtml + 
      '<div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:10px; margin-bottom:15px; text-align:center;">' +
        '<div style="background:#e8f5e9; padding:12px; border-radius:8px;"><span style="font-size:12px; color:#555;">সর্বমোট কেনাকাটা</span><h3 id="ledgerTotalBill" style="color:#1b5e20; font-size:19px; margin-top:3px;">₹ ' + totalBillAmount.toLocaleString() + '</h3></div>' +
        '<div style="background:#e3f2fd; padding:12px; border-radius:8px;"><span style="font-size:12px; color:#555;">মোট পরিশোধ</span><h3 id="ledgerTotalPaid" style="color:#0288d1; font-size:19px; margin-top:3px;">₹ ' + totalPaidAmount.toLocaleString() + '</h3></div>' +
        '<div style="background:#ffebee; padding:12px; border-radius:8px;"><span style="font-size:12px; color:#555;">বর্তমান মোট বকেয়া</span><h3 id="ledgerTotalDue" style="color:#c62828; font-size:19px; margin-top:3px;">₹ ' + Math.max(0, totalBillAmount - totalPaidAmount).toLocaleString() + '</h3></div>' +
      '</div>' +
      '<div style="background:#f4fbf5; border:1px solid #c8e6c9; border-radius:8px; padding:14px; margin-bottom:15px;" class="no-print">' +
        '<strong style="color:#1b5e20; font-size:14px; display:block; margin-bottom:8px;">💳 বকেয়া টাকা জমা নিন</strong>' +
        '<div style="display:flex; flex-wrap:wrap; gap:10px; align-items:flex-end;">' +
          '<div style="flex:1; min-width:130px;"><label style="font-size:12px; font-weight:600;">তারিখ</label><input type="date" id="ledgerPayDate" value="' + (new Date().toISOString().split('T')[0]) + '" style="padding:8px; font-size:13px;"></div>' +
          '<div style="flex:1; min-width:130px;"><label style="font-size:12px; font-weight:600;">জমা (₹) *</label><input type="number" id="ledgerPayAmount" placeholder="টাকা" style="padding:8px; font-size:13px;"></div>' +
          '<div style="flex:1.5; min-width:160px;"><label style="font-size:12px; font-weight:600;">পদ্ধতি / নোট</label><input type="text" id="ledgerPayNote" placeholder="ক্যাশ / UPI" style="padding:8px; font-size:13px;"></div>' +
          '<div><button class="btn" style="padding:9px 18px; font-size:13px; height:39px;" onclick="saveCustomerPayment()">+ জমা সেভ করুন</button></div>' +
        '</div>' +
      '</div>' +
      '<div class="table-container" style="max-height:50vh; overflow-y:auto;">' +
        '<table style="width:100%; font-size:13px;">' +
          '<thead><tr style="background:#f1f5f2;"><th>তারিখ</th><th>বিবরণ</th><th>বিলের পরিমাণ</th><th>পরিশোধ (জমা)</th><th style="background:#fff3e0; color:#e65100;">লেনদেনের পর বাকি</th><th>ইনভয়েস</th></tr></thead>' +
          '<tbody id="ledgerTableBody"></tbody>' +
        '</table>' +
      '</div>' +
      '<div class="no-print" style="display:flex; gap:10px; margin-top:20px;">' +
        '<button class="btn btn-info" style="flex:1; padding:12px;" onclick="printSpecificModal(\'ledger\')">🖨️ প্রিন্ট করুন</button>' +
        '<button class="btn btn-danger" style="flex:1; padding:12px;" onclick="closeLedger()">✕ বন্ধ করুন</button>' +
      '</div>';
  }

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
        html += '<tr style="background:#f9fdfa;"><td>' + ev.date + '</td><td><strong style="color:#1b5e20;">' + ev.desc + '</strong></td><td>₹ 0</td><td style="color:green; font-weight:700;">₹ ' + ev.paid + '</td><td style="color:#e65100; font-weight:bold;">₹ ' + ev.cumDue + '</td><td>-</td></tr>';
      }
    });
    tbody.innerHTML = html;
  }
  getEl('ledgerModal').style.display = 'block';
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
  if (!d) {
    alert('দুঃখিত, এই বিক্রয়ের কোনো ডেটা পাওয়া যায়নি!');
    return;
  }
  
  document.body.setAttribute('data-print', 'invoice');
  var docTitleEl = getEl('invMainDocTitle');
  if (docTitleEl) docTitleEl.innerText = 'ইনভয়েস (ক্যাশ মেমো)';

  var liveDue = 0;
  var custBalances = getCustomerLiveBalances();
  var cKey = (d.name || '').trim().toLowerCase();
  if (custBalances[cKey]) {
    liveDue = custBalances[cKey].currentDue;
  } else {
    liveDue = Number(d.due) || 0;
  }

  var timeStr = getCurrentTimeBR();
  var formattedDate = formatDateBR(d.date);
  var safeKey = String(k).substring(1, 6).toUpperCase();

  var detailsEl = getEl('invoiceDetails');
  if (detailsEl) {
    detailsEl.innerHTML = '<div style="display:flex; justify-content:space-between; margin-bottom:12px;">' +
      '<div><strong>গ্রাহক:</strong> ' + (d.name || '-') + '<br>মোবাইল: ' + (d.phone || '-') + '<br>এলাকা: ' + (d.area || '-') + '</div>' +
      '<div style="text-align:right;">তারিখ: ' + formattedDate + ' | সময়: ' + timeStr + '<br>ইনভয়েস: #NDA-' + safeKey + '</div>' +
    '</div>' +
    '<table class="invoice-table" style="border:1px solid #ddd; width:100%; border-collapse:collapse; margin-top:10px;">' +
      '<thead><tr style="background:#e8f5e9;"><th style="padding:8px; border:1px solid #ddd;">পণ্য</th><th style="padding:8px; border:1px solid #ddd;">পরিমাণ</th><th style="padding:8px; border:1px solid #ddd;">দর</th><th style="text-align:right; padding:8px; border:1px solid #ddd;">মোট</th></tr></thead>' +
      '<tbody><tr>' +
        '<td style="padding:8px; border:1px solid #ddd;">' + (d.item || 'দুধ') + '</td>' +
        '<td style="padding:8px; border:1px solid #ddd;">' + (d.qty || 1) + '</td>' +
        '<td style="padding:8px; border:1px solid #ddd;">₹ ' + (d.rate || 0) + '</td>' +
        '<td style="text-align:right; padding:8px; border:1px solid #ddd; font-weight:bold;">₹ ' + (d.total || 0) + '</td>' +
      '</tr></tbody>' +
    '</table>' +
    '<div style="text-align:right; margin-top:12px; font-size:13.5px; line-height:1.6;">' +
      'চালান মূল্য: <strong>₹ ' + (d.total || 0) + '</strong><br>' +
      'নগদ পরিশোধ: <strong style="color:green;">₹ ' + (d.paid || 0) + '</strong><br>' +
      '<span style="color:red; font-weight:bold; font-size:14.5px;">সর্বশেষ মোট বকেয়া: ₹ ' + liveDue + '</span>' +
    '</div>';
  }

  var modal = getEl('invoiceModal');
  if (modal) {
    modal.style.display = 'flex';
  }
};

window.closeInvoice = function() {
  var modal = getEl('invoiceModal');
  if (modal) {
    modal.style.display = 'none';
  }
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
  var addr = '';

  for (var ck in farmStore.customers) {
    var cObj = farmStore.customers[ck];
    if (cObj && cObj.name && cObj.name.trim().toLowerCase() === cust.toLowerCase()) {
      if (!phone && cObj.phone) phone = cObj.phone;
      if (!area && cObj.area) area = cObj.area.trim();
      if (cObj.addr) addr = cObj.addr.trim();
      break;
    }
  }

  var orderData = {
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
    var currentOrderKey = eOrdKey;
    eOrdKey = null;

    if (currentOrderKey) {
      var prevOrder = farmStore.orders[currentOrderKey] || {};
      var wasAlreadyDelivered = (prevOrder.status === 'Delivered' || prevOrder.saleAdded === true);

      if (status === 'Delivered') {
        orderData.saleAdded = true;
        db.ref('orders/' + currentOrderKey).update(orderData);

        if (!wasAlreadyDelivered && total > 0) {
          db.ref('sales').push({ 
            date: deliveryDate, 
            name: cust, 
            phone: phone, 
            area: area, 
            addr: addr, 
            item: items, 
            qty: 1, 
            rate: total, 
            total: total, 
            paid: paid, 
            due: Math.max(0, total - paid), 
            payments: [],
            fromOrderKey: currentOrderKey
          });
        }
      } else {
        db.ref('orders/' + currentOrderKey).update(orderData);
      }
    } else {
      if (status === 'Delivered') {
        orderData.saleAdded = true;
        var newRef = db.ref('orders').push(orderData);
        if (total > 0) {
          db.ref('sales').push({ 
            date: deliveryDate, 
            name: cust, 
            phone: phone, 
            area: area, 
            addr: addr, 
            item: items, 
            qty: 1, 
            rate: total, 
            total: total, 
            paid: paid, 
            due: Math.max(0, total - paid), 
            payments: [],
            fromOrderKey: newRef.key
          });
        }
      } else {
        db.ref('orders').push(orderData);
      }
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

  db.ref('feedRations').on('value', function(snap) {
    farmStore.feedRations = {};
    snap.forEach(function(c) {
      farmStore.feedRations[c.key] = c.val();
    });
    renderRationTable();
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
    renderStockAutocomplete();
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

window.dologin = function() {
  var userIdEl = getEl('userId') || getEl('loginId');
  var passwordEl = getEl('password') || getEl('loginPass');
  
  var userId = userIdEl ? userIdEl.value.trim() : '';
  var password = passwordEl ? passwordEl.value.trim() : '';
  
  if ((userId.toLowerCase() === 'nanda' && password === '1234') || (userId && password)) {
    localStorage.setItem('nanda_auth_status', 'logged_in');
    var loginScreen = getEl('loginScreen');
    var appBody = getEl('appBody');
    
    if (loginScreen) loginScreen.style.display = 'none';
    if (appBody) appBody.style.display = 'block';
    
    if (typeof window.listenAllData === 'function') {
      window.listenAllData();
    }
    if (typeof renderSalesTable === 'function') {
      renderSalesTable();
    }
  } else {
    alert('দয়া করে সঠিক ইউজার আইডি এবং পাসওয়ার্ড দিন!');
  }
};

// গ্লোবাল ফলব্যাক বাইন্ডিং
document.addEventListener('DOMContentLoaded', function() {
  var loginBtn = document.querySelector('#loginScreen button') || document.querySelector('button[onclick*="dologin"]');
  if (loginBtn) {
    loginBtn.onclick = window.dologin;
  }
});
