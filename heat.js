// ==========================================
// NANDA DAIRY & AGRO - ADVANCED HEAT REGISTER MODULE
// ==========================================

var eHeatKey = null;

function onHeatInputTypeChange() {
  var sel = getEl('heatAiCountSelect');
  var txt = getEl('heatAiCountInput');
  if (sel && txt) {
    if (sel.value === 'Custom') {
      txt.style.display = 'block';
      txt.focus();
    } else {
      txt.style.display = 'none';
      txt.value = sel.value;
    }
  }
}

// হিটের তারিখ ও সময় ইনপুট দেওয়ার সাথে সাথে অটো ক্যালকুলেট হওয়া
function autoCalcHeatSchedule() {
  var hDateVal = getEl('heatDate').value;
  if (!hDateVal) return;

  var d = new Date(hDateVal);
  if (isNaN(d.getTime())) return;

  // সেরা AI সময় (১৫ ঘণ্টা পর)
  var expAiTime = new Date(d.getTime() + (15 * 60 * 60 * 1000));
  var aiFormatted = expAiTime.toISOString().slice(0, 16);
  if (getEl('heatExpAiDate')) getEl('heatExpAiDate').value = aiFormatted;

  // পরবর্তী সম্ভাব্য হিট (২১ দিন বা ৫০৪ ঘণ্টা পর)
  var nextHeat = new Date(d.getTime() + (21 * 24 * 60 * 60 * 1000));
  var nextFormatted = nextHeat.toISOString().slice(0, 16);
  if (getEl('heatNextDate')) getEl('heatNextDate').value = nextFormatted;

  calcDaysGapAndRepeatWarning();
}

// আগের হিট থেকে দিনের ব্যবধান এবং রিপিট ব্রিডার চেক করা
function calcDaysGapAndRepeatWarning() {
  var tag = (getEl('heatCowTag').value || '').trim();
  var currHeatDate = getEl('heatDate').value;
  if (!tag || !currHeatDate) return;

  var prevHeatDate = null;
  var failCount = 0;

  for (var k in farmStore.heat) {
    var h = farmStore.heat[k];
    if (h && (h.tag || '').trim().toLowerCase() === tag.toLowerCase() && k !== eHeatKey) {
      if (!prevHeatDate || h.date > prevHeatDate) {
        prevHeatDate = h.date;
      }
      if (h.status === 'Repeat / Failed' || h.status === 'Pending AI') {
        failCount++;
      }
    }
  }

  var warnBox = getEl('heatRepeatWarningBox');
  if (!warnBox) {
    warnBox = document.createElement('div');
    warnBox.id = 'heatRepeatWarningBox';
    var formCard = document.querySelector('#tab-heat .card');
    if (formCard) formCard.insertBefore(warnBox, formCard.firstChild);
  }

  if (failCount >= 2) {
    warnBox.innerHTML = '<div style="background:#ffebee; color:#c62828; padding:10px; border-radius:8px; border:1px solid #ef9a9a; margin-bottom:12px; font-weight:bold;">🚨 রিপিট ব্রিডার সতর্কবার্তা (Repeat Breeder Warning): এই গাভীটি বারবার হিট ছড়াচ্ছে বা গর্ভধারণে ব্যর্থ হচ্ছে (ফেল কাউন্ট: ' + (failCount + 1) + ')। দ্রুত ভেটেরিনারি চিকিৎসকের পরামর্শ নিন!</div>';
  } else {
    warnBox.innerHTML = '';
  }
}

function editHeatRecord(k) {
  var d = farmStore.heat ? farmStore.heat[k] : null; if (!d) return; eHeatKey = k;
  getEl('heatCowTag').value = d.tag || '';
  getEl('heatDate').value = d.date || '';
  if(getEl('heatTimeSession')) getEl('heatTimeSession').value = d.timeSession || 'সকাল';
  if(getEl('heatIntensity')) getEl('heatIntensity').value = d.intensity || 'Moderate';
  
  var sel = getEl('heatAiCountSelect');
  var txt = getEl('heatAiCountInput');
  if (sel && txt) {
    if (d.aiCount === '1st Time' || d.aiCount === '2nd Time' || d.aiCount === '3rd Time') {
      sel.value = d.aiCount;
      txt.style.display = 'none';
      txt.value = d.aiCount;
    } else {
      sel.value = 'Custom';
      txt.style.display = 'block';
      txt.value = d.aiCount || '';
    }
  }

  getEl('heatSigns').value = d.signs || 'Standing Heat';
  getEl('heatExpAiDate').value = d.expAiDate || '';
  if(getEl('heatNextDate')) getEl('heatNextDate').value = d.nextDate || '';
  if(getEl('heatStatus')) getEl('heatStatus').value = d.status || 'Pending AI';
  if(getEl('heatDocName')) getEl('heatDocName').value = d.docName || '';
  if(getEl('heatDocPhone')) getEl('heatDocPhone').value = d.docPhone || '';
  if(getEl('heatBullInfo')) getEl('heatBullInfo').value = d.bullInfo || '';
  getEl('heatNote').value = d.note || '';

  getEl('heatSubmitBtn').innerText = 'Update Heat Record';
  getEl('heatCancelBtn').style.display = 'inline-flex';
  switchTab('heat', document.querySelector('nav button:nth-child(5)'));
  calcDaysGapAndRepeatWarning();
}

function cancelHeatEdit() {
  eHeatKey = null;
  ['heatCowTag','heatDate','heatExpAiDate','heatNextDate','heatDocName','heatDocPhone','heatBullInfo','heatNote','heatAiCountInput'].forEach(function(id){ if(getEl(id)) getEl(id).value=''; });
  if(getEl('heatAiCountSelect')) getEl('heatAiCountSelect').value = '1st Time';
  getEl('heatSubmitBtn').innerText = 'Save Heat Record';
  getEl('heatCancelBtn').style.display = 'none';
  var warnBox = getEl('heatRepeatWarningBox'); if(warnBox) warnBox.innerHTML = '';
}

function saveHeatRecord() {
  var tag = (getEl('heatCowTag').value || '').trim();
  var hDate = getEl('heatDate').value;
  if (!tag || !hDate) return alert('Cattle Tag ID এবং Heat Date দিন!');

  var aiCountVal = (getEl('heatAiCountSelect') && getEl('heatAiCountSelect').value === 'Custom') ? (getEl('heatAiCountInput').value || '1st Time') : (getEl('heatAiCountSelect') ? getEl('heatAiCountSelect').value : '1st Time');
  var statusVal = getEl('heatStatus') ? getEl('heatStatus').value : 'Pending AI';

  var data = {
    tag: tag,
    date: hDate,
    timeSession: getEl('heatTimeSession') ? getEl('heatTimeSession').value : 'সকাল',
    intensity: getEl('heatIntensity') ? getEl('heatIntensity').value : 'Moderate',
    aiCount: aiCountVal,
    signs: getEl('heatSigns').value,
    expAiDate: getEl('heatExpAiDate').value,
    nextDate: getEl('heatNextDate') ? getEl('heatNextDate').value : '',
    status: statusVal,
    docName: getEl('heatDocName') ? getEl('heatDocName').value : '',
    docPhone: getEl('heatDocPhone') ? getEl('heatDocPhone').value : '',
    bullInfo: getEl('heatBullInfo') ? getEl('heatBullInfo').value : '',
    note: getEl('heatNote').value
  };

  if (db) {
    if (eHeatKey) {
      db.ref('heat/' + eHeatKey).update(data);
    } else {
      db.ref('heat').push(data);
    }

    if (statusVal === 'Conceived / Pregnant') {
      db.ref('breeding').push({
        tag: tag,
        aiDate: hDate,
        semenId: data.bullInfo || 'Unknown Bull',
        company: 'Auto from Heat Register',
        aiCost: 0,
        pdDate: new Date(Date.now() + 60*24*60*60*1000).toISOString().split('T')[0],
        status: 'Pregnant',
        expCalvingDate: new Date(new Date(hDate).getTime() + 280*24*60*60*1000).toISOString().split('T')[0],
        actCalvingDate: ''
      });
      alert('অভিনন্দন! গাভীটি গর্ভবতী হিসেবে চিহ্নিত হওয়ায় রেকর্ডটি সরাসরি Breeding Management-এ শিফট করা হয়েছে।');
    }
  }

  cancelHeatEdit();
  renderHeatTable();
}

function renderHeatTable() {
  var body = getEl('heatTableBody');
  if (!body) return;
  var list = [];
  for (var k in farmStore.heat) {
    list.push({ key: k, data: farmStore.heat[k] });
  }
  list.sort(function(a, b) { return (b.data.date || '').localeCompare(a.data.date || ''); });

  if (list.length === 0) {
    body.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#777;">কোনো হিট রেকর্ড নেই।</td></tr>';
    return;
  }

  var html = '';
  list.forEach(function(item) {
    var k = item.key, d = item.data;
    var badgeClass = d.status === 'Conceived / Pregnant' ? 'badge-success' : (d.status === 'Repeat / Failed' ? 'badge-danger' : 'badge-warning');
    
    var daysGapTxt = '-';
    var prevDate = null;
    for (var otherK in farmStore.heat) {
      var other = farmStore.heat[otherK];
      if (other && (other.tag || '').trim().toLowerCase() === (d.tag || '').trim().toLowerCase() && other.date < d.date) {
        if (!prevDate || other.date > prevDate) prevDate = other.date;
      }
    }
    if (prevDate) {
      var diffTime = new Date(d.date) - new Date(prevDate);
      var diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      daysGapTxt = diffDays + ' দিন';
    }

    html += '<tr>' +
      '<td><strong>' + (d.tag || '-') + '</strong></td>' +
      '<td>' + (d.date ? d.date.replace('T', ' সময়: ') : '-') + ' (' + (d.timeSession || 'সকাল') + ')<br><small style="color:#555;">তীব্রতা: ' + (d.intensity || 'Moderate') + '</small></td>' +
      '<td>' + (d.aiCount || '1st Time') + '</td>' +
      '<td style="font-weight:bold; color:#1b5e20;">' + daysGapTxt + '</td>' +
      '<td><span class="badge ' + badgeClass + '">' + (d.status || 'Pending AI') + '</span><br><small>বুল: ' + (d.bullInfo || '-') + '</small></td>' +
      '<td style="color:red; font-weight:bold;">' + (d.nextDate ? d.nextDate.replace('T', ' সময়: ') : '-') + '</td>' +
      '<td>' +
        '<button class="action-btn btn-info" onclick="editHeatRecord(\'' + k + '\')">Edit</button>' +
        '<button class="action-btn btn-danger" onclick="deleteRecord(\'heat\',\'' + k + '\')">Delete</button>' +
      '</td>' +
    '</tr>';
  });
  body.innerHTML = html;
}
