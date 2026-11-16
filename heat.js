var eHeatKey = null;

function editHeatRecord(k) {
  var d = farmStore.heat ? farmStore.heat[k] : null; if (!d) return; eHeatKey = k;
  getEl('heatCowTag').value = d.tag || '';
  getEl('heatDate').value = d.date || '';
  getEl('heatSigns').value = d.signs || 'Standing Heat';
  getEl('heatExpAiDate').value = d.expAiDate || '';
  getEl('heatNote').value = d.note || '';
  getEl('heatSubmitBtn').innerText = 'Update Heat Record';
  getEl('heatCancelBtn').style.display = 'inline-flex';
  switchTab('heat', document.querySelector('nav button:nth-last-child(4)'));
}

function cancelHeatEdit() {
  eHeatKey = null;
  ['heatCowTag','heatDate','heatExpAiDate','heatNote'].forEach(function(i){ if(getEl(i)) getEl(i).value=''; });
  getEl('heatSubmitBtn').innerText = 'Save Heat Record';
  getEl('heatCancelBtn').style.display = 'none';
}

function saveHeatRecord() {
  var tag = (getEl('heatCowTag').value || '').trim();
  var dt = getEl('heatDate').value;
  if (!tag || !dt) return alert('Tag ID এবং তারিখ দিন!');

  var data = {
    tag: tag,
    date: dt,
    signs: getEl('heatSigns').value,
    expAiDate: getEl('heatExpAiDate').value,
    note: getEl('heatNote').value
  };

  if (db) {
    if (eHeatKey) {
      db.ref('heat/' + eHeatKey).update(data);
    } else {
      db.ref('heat').push(data);
    }
  }
  cancelHeatEdit();
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
    body.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#777;">কোনো হিট রেকর্ড নেই।</td></tr>';
    return;
  }

  var html = '';
  list.forEach(function(item) {
    var k = item.key, d = item.data;
    html += '<tr>' +
      '<td><strong>' + (d.tag || '-') + '</strong></td>' +
      '<td>' + formatDateBR(d.date) + '</td>' +
      '<td><span class="badge badge-warning">' + (d.signs || '-') + '</span></td>' +
      '<td>' + formatDateBR(d.expAiDate) + '</td>' +
      '<td>' + (d.note || '-') + '</td>' +
      '<td>' +
        '<button class="action-btn btn-info" onclick="editHeatRecord(\'' + k + '\')">Edit</button>' +
        '<button class="action-btn btn-danger" onclick="deleteRecord(\'heat\',\'' + k + '\')">Delete</button>' +
      '</td>' +
    '</tr>';
  });
  body.innerHTML = html;
}
