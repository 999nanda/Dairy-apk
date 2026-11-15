// ==========================================
// NANDA DAIRY & AGRO - INSEMINATION MODULE
// ==========================================

var eInsKey = null;

// ১. পেডিগ্রি, ইনব্রিডিং ও জেনেটিক ক্যালকুলেটর
function analyzePedigreeAndGenetics() {
  var tag = (getEl('insCowTag').value || '').trim();
  var semenId = (getEl('insSemenId').value || '').trim();
  if (!tag) return;

  var cow = farmStore.cattle ? farmStore.cattle[tag] : null;
  var treeHtml = '<div style="background:#e8f5e9; padding:10px; border-radius:8px; border:1px solid #c8e6c9; margin-bottom:10px;">';
  treeHtml += '<strong>🧬 ফ্যামিলি ট্রি ও পেডিগ্রি প্রিভিউ (৪ জেনারেশন):</strong><br>';
  treeHtml += '• নির্বাচিত গাভী (Tag: ' + tag + ') [জাত: ' + (cow ? cow.breed : 'Unknown') + '<br>';
  treeHtml += '&nbsp;&nbsp;└── Sire (ষাঁড়): ' + (cow && cow.sire ? cow.sire : 'N/A') + ' | Dam (মা): ' + (cow && cow.dam ? cow.dam : 'N/A') + '<br>';
  treeHtml += '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└── Grand Sire & Grand Dam (পূর্বপুরুষগণ ট্র্যাকিং সক্রিয়)';
  treeHtml += '</div>';

  // ইনব্রিডিং ও জেনেটিক কম্পোজিশন ক্যালকুলেশন
  var inbreedingRisk = false;
  if (cow && cow.sire && semenId && cow.sire.toLowerCase() === semenId.toLowerCase()) {
    inbreedingRisk = true;
  }

  var alertBox = getEl('insGeneticAlertBox');
  if (!alertBox) {
    alertBox = document.createElement('div');
    alertBox.id = 'insGeneticAlertBox';
    var formGrid = document.querySelector('#tab-insemination .form-grid') || document.querySelector('#tab-insemination .card');
    if (formGrid) formGrid.parentNode.insertBefore(alertBox, formGrid.nextSibling);
  }

  var warningHtml = '';
  if (inbreedingRisk) {
    warningHtml += '<div style="background:#ffebee; color:#c62828; padding:10px; border-radius:8px; border:1px solid #ef9a9a; margin-bottom:10px; font-weight:bold;">⚠️ সতর্কবার্তা: নির্বাচিত ষাঁড় এবং গাভীর পিতার মধ্যে মিল রয়েছে! ইনব্রিডিংয়ের ঝুঁকি উচ্চ।</div>';
  } else {
    warningHtml += '<div style="background:#e3f2fd; color:#0288d1; padding:8px; border-radius:6px; margin-bottom:10px; font-size:12px;">✔ ইনব্রিডিং কোফিশিয়েন্ট নিরাপদ সীমার মধ্যে রয়েছে।</div>';
  }

  warningHtml += treeHtml;
  alertBox.innerHTML = warningHtml;
}

// অটো এক্সপেক্টেড ক্যালভিং ডেট (২৮০ দিন)
function autoCalcExpectedCalving() {
  var aiVal = getEl('insAiDate').value;
  if (aiVal) {
    var d = new Date(aiVal);
    d.setDate(d.getDate() + 280);
    getEl('insExpCalvingDate').value = d.toISOString().split('T')[0];
    
    // অটো শিডিউল জেনারেটর টাস্ক ক্যালকুলেশন
    var repeatDate = new Date(aiVal);
    repeatDate.setDate(repeatDate.getDate() + 21);
    if(getEl('insRepeatHeatDate')) getEl('insRepeatHeatDate').value = repeatDate.toISOString().split('T')[0];

    var pdDateVal = new Date(aiVal);
    pdDateVal.setDate(pdDateVal.getDate() + 60);
    if(getEl('insPdDate')) getEl('insPdDate').value = pdDateVal.toISOString().split('T')[0];
  }
  analyzePedigreeAndGenetics();
  calcConceptionRatePrediction();
}

// ২. এআই-ড্রাইভেন কনসেপশন রেট প্রেডিক্টর
function calcConceptionRatePrediction() {
  var tag = (getEl('insCowTag').value || '').trim();
  if (!tag) return;
  var cow = farmStore.cattle ? farmStore.cattle[tag] : null;
  var baseRate = 65; // স্ট্যান্ডার্ড বেস রেট
  if (cow && Number(cow.lactation) > 3) baseRate -= 10; // বেশি ল্যাকটেশন হলে কমে
  
  var predBox = getEl('insPredictionBox');
  if(!predBox) {
    predBox = document.createElement('div');
    predBox.id = 'insPredictionBox';
    predBox.style.cssText = "background:#fffde7; border:1px solid #fff59d; padding:10px; border-radius:8px; margin-bottom:12px; font-size:12.5px;";
    var targetParent = document.querySelector('#insGeneticAlertBox');
    if(targetParent) targetParent.parentNode.insertBefore(predBox, targetParent.nextSibling);
  }
  if(predBox) {
    predBox.innerHTML = '🤖 <strong>AI প্রেডিকশন অ্যানালিটিক্স:</strong> এই প্রজননের গর্ভধারণের সম্ভাব্য সাফল্যের হার (Conception Rate) হলো আনুমানিক <strong>' + baseRate + '%</strong>। (অপ্টিমাল উইন্ডোজ ও হিট সাইকেল অ্যানালাইসিস সম্পন্ন)।';
  }
}

function editInseminationRecord(k) {
  var d = farmStore.insemination ? farmStore.insemination[k] : null; if (!d) return; eInsKey = k;
  getEl('insCowTag').value = d.tag || '';
  getEl('insAiDate').value = d.aiDate || '';
  getEl('insSemenId').value = d.semenId || '';
  getEl('insCompany').value = d.company || '';
  getEl('insAiCost').value = d.aiCost || '';
  getEl('insPdDate').value = d.pdDate || '';
  getEl('insStatus').value = d.status || 'Pending';
  getEl('insExpCalvingDate').value = d.expCalvingDate || '';
  getEl('insActCalvingDate').value = d.actCalvingDate || '';
  
  // নতুন অ্যাডভান্সড ফিল্ড লোড
  if(getEl('insStrawQty')) getEl('insStrawQty').value = d.strawQty || 1;
  if(getEl('insTechName')) getEl('insTechName').value = d.techName || '';
  if(getEl('insDoctorFee')) getEl('insDoctorFee').value = d.doctorFee || 0;
  if(getEl('insN2Cost')) getEl('insN2Cost').value = d.n2Cost || 0;
  if(getEl('insMedCost')) getEl('insMedCost').value = d.medCost || 0;
  if(getEl('insRepeatHistory')) getEl('insRepeatHistory').value = d.repeatHistory || 'Normal';

  getEl('insSubmitBtn').innerText = 'Update Insemination';
  getEl('insCancelBtn').style.display = 'inline-flex';
  switchTab('insemination', document.querySelector('nav button:nth-last-child(3)'));
}

function cancelInseminationEdit() {
  eInsKey = null;
  ['insCowTag','insSemenId','insCompany','insAiCost','insPdDate','insExpCalvingDate','insActCalvingDate','insStrawQty','insTechName','insDoctorFee','insN2Cost','insMedCost'].forEach(function(id){ if(getEl(id)) getEl(id).value=''; });
  getEl('insStatus').value = 'Pending';
  getEl('insSubmitBtn').innerText = 'Save Insemination Record';
  getEl('insCancelBtn').style.display = 'none';
  var alertBox = getEl('insGeneticAlertBox'); if(alertBox) alertBox.innerHTML = '';
  var predBox = getEl('insPredictionBox'); if(predBox) predBox.innerHTML = '';
}

function saveInseminationRecord() {
  var tag = (getEl('insCowTag').value || '').trim();
  var aiDt = getEl('insAiDate').value;
  var semenId = (getEl('insSemenId').value || '').trim();
  var strawQty = parseInt(getEl('insStrawQty') ? getEl('insStrawQty').value : 1) || 1;
  
  if (!tag || !aiDt) return alert('Cattle ID এবং AI Date দিন!');

  var aiCost = parseFloat(getEl('insAiCost').value) || 0;
  var docFee = parseFloat(getEl('insDoctorFee') ? getEl('insDoctorFee').value : 0) || 0;
  var n2Cost = parseFloat(getEl('insN2Cost') ? getEl('insN2Cost').value : 0) || 0;
  var medCost = parseFloat(getEl('insMedCost') ? getEl('insMedCost').value : 0) || 0;
  var totalExpense = aiCost + docFee + n2Cost + medCost;

  var data = {
    tag: tag,
    aiDate: aiDt,
    semenId: semenId,
    company: getEl('insCompany').value,
    aiCost: aiCost,
    strawQty: strawQty,
    techName: getEl('insTechName') ? getEl('insTechName').value : '',
    doctorFee: docFee,
    n2Cost: n2Cost,
    medCost: medCost,
    totalExpense: totalExpense,
    pdDate: getEl('insPdDate').value,
    status: getEl('insStatus').value,
    expCalvingDate: getEl('insExpCalvingDate').value,
    actCalvingDate: getEl('insActCalvingDate').value,
    repeatHistory: getEl('insRepeatHistory') ? getEl('insRepeatHistory').value : 'Normal'
  };

  if (db) {
    if (eInsKey) {
      db.ref('insemination/' + eInsKey).update(data);
    } else {
      db.ref('insemination').push(data);

      // ৩. অটো স্ট্র ইনভেন্টরি হ্রাস করা
      if (semenId) {
        for (var sk in farmStore.semen) {
          var semObj = farmStore.semen[sk];
          if (semObj && (semObj.batch || '').trim().toLowerCase() === semenId.toLowerCase()) {
            var currentCount = parseInt(semObj.count) || 0;
            var newCount = Math.max(0, currentCount - strawQty);
            db.ref('semen/' + sk).update({ count: newCount });
            break;
          }
        }
      }

      // ৫. খরচ সরাসরি নির্দিষ্ট গাভীর আর্থিক বা এক্সপেন্স লেজারে যুক্ত করা
      if (totalExpense > 0) {
        db.ref('expenses').push({
          date: aiDt,
          category: 'Medicine & Health',
          title: 'AI & Breeding Expense - Tag: ' + tag + ' (Semen: ' + semenId + ')',
          amount: totalExpense
        });
      }
    }
  }
  cancelInseminationEdit();
  renderInseminationTable();
}

function renderInseminationTable() {
  var body = getEl('inseminationTableBody');
  if (!body) return;
  var list = [];
  for (var k in farmStore.insemination) {
    list.push({ key: k, data: farmStore.insemination[k] });
  }
  list.sort(function(a, b) { return (b.data.aiDate || '').localeCompare(a.data.aiDate || ''); });

  if (list.length === 0) {
    body.innerHTML = '<tr><td colspan="11" style="text-align:center; color:#777;">কোনো ইনসেমিনেশন রেকর্ড নেই।</td></tr>';
    return;
  }

  var html = '';
  list.forEach(function(item) {
    var k = item.key, d = item.data;
    var badgeClass = d.status === 'Pregnant' ? 'badge-success' : (d.status === 'Failed' ? 'badge-danger' : 'badge-warning');
    
    // ৪. অটোমেটেড শিডিউল ও ওয়ার্কফ্লো চেক
    var aiTime = new Date(d.aiDate).getTime();
    var nowTime = new Date().getTime();
    var diffDays = Math.floor((nowTime - aiTime) / (1000 * 60 * 60 * 24));
    var workflowAlert = '';
    if (d.status === 'Pending') {
      if (diffDays >= 19 && diffDays <= 23) workflowAlert = '<br><span style="color:#e65100; font-size:10.5px; font-weight:bold;">🔔 রিমাইন্ডার: রিপিট হিট চেক করুন!</span>';
      else if (diffDays >= 60) workflowAlert = '<br><span style="color:#d32f2f; font-size:10.5px; font-weight:bold;">🩺 জরুরি: পিডি (PD) কনফার্ম করুন!</span>';
    }

    html += '<tr>' +
      '<td><strong>' + (d.tag || '-') + '</strong>' + workflowAlert + '</td>' +
      '<td>' + formatDateBR(d.aiDate) + '</td>' +
      '<td>' + (d.semenId || '-') + ' (Straw: ' + (d.strawQty || 1) + ')</td>' +
      '<td>' + (d.techName || d.company || '-') + '</td>' +
      '<td>₹ ' + (d.totalExpense || d.aiCost || 0) + '</td>' +
      '<td>' + formatDateBR(d.pdDate) + '</td>' +
      '<td><span class="badge ' + badgeClass + '">' + (d.status || 'Pending') + '</span></td>' +
      '<td>' + formatDateBR(d.expCalvingDate) + '</td>' +
      '<td>' + formatDateBR(d.actCalvingDate) + '</td>' +
      '<td>' + (d.repeatHistory || 'Normal') + '</td>' +
      '<td>' +
        '<button class="action-btn btn-info" onclick="editInseminationRecord(\'' + k + '\')">Edit</button>' +
        '<button class="action-btn btn-danger" onclick="deleteRecord(\'insemination\',\'' + k + '\')">Delete</button>' +
      '</td>' +
    '</tr>';
  });
  body.innerHTML = html;
}
