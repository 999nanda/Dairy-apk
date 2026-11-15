// ==========================================
// NANDA DAIRY & AGRO - ADVANCED DEWORMING REGISTER MODULE
// ==========================================

var eDewormKey = null;

// গরুর ট্যাগ সিলেক্ট করলে ওজন, প্রেগন্যান্সি স্ট্যাটাস এবং অটো ডোজ ক্যালকুলেট করা
function onDewormTagChange() {
  var tag = (getEl('dewormCowTag').value || '').trim();
  if (!tag) return;

  var cow = farmStore.cattle ? farmStore.cattle[tag] : null;
  var alertBox = getEl('dewormPregnancyAlertBox');
  if (!alertBox) {
    alertBox = document.createElement('div');
    alertBox.id = 'dewormPregnancyAlertBox';
    var formGrid = document.querySelector('#tab-deworm .form-grid');
    if (formGrid) formGrid.parentNode.insertBefore(alertBox, formGrid.nextSibling);
  }

  if (cow) {
    if (getEl('dewormWeight')) getEl('dewormWeight').value = cow.weight || '';
    
    // প্রেগন্যান্সি স্ট্যাটাস হাইলাইট ও ওয়ার্নিং
    if (cow.status === 'Pregnant' || (cow.status || '').toLowerCase() === 'pregnant') {
      alertBox.innerHTML = '<div style="background:#ffebee; color:#c62828; padding:10px; border-radius:8px; border:1px solid #ef9a9a; margin-bottom:12px; font-weight:bold;">⚠️ প্রেগন্যান্সি হাইলাইট অ্যালার্ট: এই গাভীটি গর্ভবতী (Pregnant)! অনুগ্রহ করে গর্ভকালীন নিরাপদ (Safe for Pregnant Cattle) কৃমিনাশক ব্যবহার করুন।</div>';
    } else {
      alertBox.innerHTML = '<div style="background:#e8f5e9; color:#2e7d32; padding:8px; border-radius:6px; margin-bottom:12px; font-size:12.5px;">✔ গাভীর স্বাস্থ্য স্বাভাবিক। সাধারণ কৃমিনাশক ব্যবহার উপযোগী।</div>';
    }

    autoCalcDewormDose();
  }
}

// অটো ডোজ ক্যালকুলেটর (অটো আসার পাশাপাশি ম্যানুয়াল এডিটের সুযোগসহ)
function autoCalcDewormDose() {
  var wt = parseFloat(getEl('dewormWeight').value) || 0;
  var formTypeSelect = getEl('dewormFormType');
  var formType = formTypeSelect ? formTypeSelect.value : 'Syrup';
  var doseField = getEl('dewormCalculatedDose');
  if (!doseField) return;

  // যদি ইউজার ম্যানুয়ালি কিছু লিখে থাকেন এবং ওজন পরিবর্তন না হয়, তবে ওভাররাইট না করে অটো সেট করা
  var calcResult = '';
  if (wt > 0) {
    if (formType === 'Syrup') {
      var ml = (wt / 10) * 5; // প্রতি ১০ কেজিতে ৫ মিলি স্ট্যান্ডার্ড ফর্মুলা
      calcResult = ml.toFixed(1) + ' mL (মিলি)';
    } else if (formType === 'Bolus / Tablet') {
      var tabs = Math.ceil(wt / 300); // প্রতি ৩০০ কেজিতে ১ ট্যাবলেট
      calcResult = tabs + ' Bolus / Tablet (টি)';
    } else {
      calcResult = (wt * 0.1).toFixed(1) + ' mL / Gram';
    }
  } else {
    calcResult = '';
  }
  doseField.value = calcResult;
  autoCalcNextDewormDate();
}

// পরবর্তী ডোজের নির্ধারিত তারিখ (Next Due Date) অটো সেট করা
function autoCalcNextDewormDate() {
  var dtVal = getEl('dewormDate').value;
  if (!dtVal) return;

  var d = new Date(dtVal);
  if (isNaN(d.getTime())) return;

  d.setDate(d.getDate() + 90); // স্ট্যান্ডার্ড ডিওয়ার্মিং গ্যাপ ৯০ দিন
  var nextDateInput = getEl('dewormNextDate');
  if (nextDateInput) {
    nextDateInput.value = d.toISOString().split('T')[0];
  }
}

function editDewormRecord(k) {
  var d = farmStore.deworm ? farmStore.deworm[k] : null; if (!d) return; eDewormKey = k;
  getEl('dewormCowTag').value = d.tag || '';
  getEl('dewormDate').value = d.date || '';
  if(getEl('dewormWeight')) getEl('dewormWeight').value = d.weight || '';
  getEl('dewormMedName').value = d.medName || '';
  if(getEl('dewormFormType')) getEl('dewormFormType').value = d.formType || 'Syrup';
  if(getEl('dewormCalculatedDose')) getEl('dewormCalculatedDose').value = d.dose || '';
  if(getEl('dewormNextDate')) getEl('dewormNextDate').value = d.nextDate || '';
  getEl('dewormCost').value = d.cost || '';
  getEl('dewormNote').value = d.note || '';

  getEl('dewormSubmitBtn').innerText = 'Update Deworming';
  getEl('dewormCancelBtn').style.display = 'inline-flex';
  switchTab('deworm', document.querySelector('nav button:nth-child(7)'));
  onDewormTagChange();
}

function cancelDewormEdit() {
  eDewormKey = null;
  ['dewormCowTag','dewormDate','dewormWeight','dewormMedName','dewormCalculatedDose','dewormNextDate','dewormCost','dewormNote'].forEach(function(id){ if(getEl(id)) getEl(id).value=''; });
  getEl('dewormSubmitBtn').innerText = 'Save Deworming Record';
  getEl('dewormCancelBtn').style.display = 'none';
  var alertBox = getEl('dewormPregnancyAlertBox'); if(alertBox) alertBox.innerHTML = '';
}

function saveDewormingRecord() {
  var tag = (getEl('dewormCowTag').value || '').trim();
  var dt = getEl('dewormDate').value;
  var medName = (getEl('dewormMedName').value || '').trim();
  if (!tag || !dt || !medName) return alert('Tag ID, তারিখ এবং ওষুধের নাম দিন!');

  var cost = parseFloat(getEl('dewormCost').value) || 0;
  var formTypeSelect = getEl('dewormFormType');

  var data = {
    tag: tag,
    date: dt,
    weight: parseFloat(getEl('dewormWeight').value) || 0,
    medName: medName,
    formType: formTypeSelect ? formTypeSelect.value : 'Syrup',
    dose: getEl('dewormCalculatedDose') ? getEl('dewormCalculatedDose').value : '',
    nextDate: getEl('dewormNextDate') ? getEl('dewormNextDate').value : '',
    cost: cost,
    note: getEl('dewormNote').value
  };

  if (db) {
    if (eDewormKey) {
      db.ref('deworm/' + eDewormKey).update(data);
    } else {
      db.ref('deworm').push(data);

      if (cost > 0) {
        db.ref('expenses').push({
          date: dt,
          category: 'Medicine & Health',
          title: 'Deworming Expense (' + medName + ') - Tag: ' + tag,
          amount: cost
        });
      }
    }
  }
  cancelDewormEdit();
  renderDewormTable();
}

function renderDewormTable() {
  var body = getEl('dewormTableBody');
  if (!body) return;
  var list = [];
  for (var k in farmStore.deworm) {
    list.push({ key: k, data: farmStore.deworm[k] });
  }
  list.sort(function(a, b) { return (b.data.date || '').localeCompare(a.data.date || ''); });

  var todayISO = new Date().toISOString().split('T')[0];

  if (list.length === 0) {
    body.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#777;">কোনো কৃমিনাশক রেকর্ড নেই।</td></tr>';
    return;
  }

  var html = '';
  list.forEach(function(item) {
    var k = item.key, d = item.data;
    var isUpcoming = d.nextDate && d.nextDate <= todayISO;
    var statusBadge = isUpcoming ? '<span class="badge badge-danger">Due Today / Overdue</span>' : '<span class="badge badge-success">Up to Date</span>';

    html += '<tr>' +
      '<td><strong>' + (d.tag || '-') + '</strong></td>' +
      '<td>' + formatDateBR(d.date) + '<br><small>ওজন: ' + (d.weight || 0) + ' kg</small></td>' +
      '<td>' + (d.medName || '-') + ' (' + (d.formType || 'Syrup') + ')<br><strong>মাত্রা: ' + (d.dose || '-') + '</strong></td>' +
      '<td style="color:red; font-weight:bold;">' + formatDateBR(d.nextDate) + '<br>' + statusBadge + '</td>' +
      '<td>₹ ' + (d.cost || 0) + '</td>' +
      '<td>' + (d.note || '-') + '</td>' +
      '<td>' +
        '<button class="action-btn btn-info" onclick="editDewormRecord(\'' + k + '\')">Edit</button>' +
        '<button class="action-btn btn-danger" onclick="deleteRecord(\'deworm\',\'' + k + '\')">Delete</button>' +
      '</td>' +
    '</tr>';
  });
  body.innerHTML = html;
}
