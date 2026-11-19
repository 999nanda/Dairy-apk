/* ==========================================================================
   Nanda Dairy & Agro - Enterprise Farm ERP (reports.js)
   📈 Reports মডিউল: ফিল্টার, ব্যালেন্স শিট, সিমেন স্ট্র, চার্ট, ROI ও এক্সপোর্ট
   ========================================================================== */

(function () {
  // Reports ফিল্টার স্টেট
  window.currentRepYear = window.currentRepYear || "";
  window.currentRepMonth = window.currentRepMonth || "ALL";
  window.specificRepDate = window.specificRepDate || "";

  // Chart.js ইনস্ট্যান্স রেফারেন্স
  window._repExpCatChartInst = window._repExpCatChartInst || null;
  window._repSalesItemChartInst = window._repSalesItemChartInst || null;
  window._reportFinanceChartInst = window._reportFinanceChartInst || null;

  /**
   * Reports বছর ড্রপডাউন ও ১২ মাসের ট্যাব ইনিশিয়ালাইজ করে
   */
  window.initReportFilters = function () {
    try {
      if (!window.currentRepYear) {
        window.currentRepYear = new Date().getFullYear().toString();
      }
      var ys = getEl("repFilterYear");
      if (ys && ys.options.length === 0) {
        var curY = new Date().getFullYear();
        for (var i = 0; i < 5; i++) {
          var y = (curY - i).toString();
          ys.options.add(new Option(y, y));
        }
        ys.value = window.currentRepYear;
      }
      renderReportMonthTabs();
    } catch (e) {
      console.log("initReportFilters error:", e);
    }
  };

  /**
   * ALL DATA ও Jan-Dec ট্যাব রেন্ডার করে
   */
  window.renderReportMonthTabs = function () {
    var tc = getEl("repMonthTabs");
    if (!tc) return;

    var months = [
      { val: "ALL", name: "ALL DATA" },
      { val: "01", name: "Jan" }, { val: "02", name: "Feb" }, { val: "03", name: "Mar" },
      { val: "04", name: "Apr" }, { val: "05", name: "May" }, { val: "06", name: "Jun" },
      { val: "07", name: "Jul" }, { val: "08", name: "Aug" }, { val: "09", name: "Sep" },
      { val: "10", name: "Oct" }, { val: "11", name: "Nov" }, { val: "12", name: "Dec" }
    ];

    tc.innerHTML = months.map(function (m) {
      var act = (m.val === window.currentRepMonth) && !window.specificRepDate;
      return '<button type="button" onclick="setReportMonth(\'' + m.val + '\')" style="padding:6px 14px; border:none; border-radius:20px; font-size:12px; font-weight:bold; cursor:pointer; background:' + (act ? "var(--primary)" : "#e0e0e0") + "; color:" + (act ? "white" : "#333") + '; min-width:60px;">' + m.name + "</button>";
    }).join("");
  };

  /**
   * নির্দিষ্ট মাস সিলেক্ট করে রিপোর্ট আপডেট করে
   */
  window.setReportMonth = function (mVal) {
    window.currentRepMonth = mVal;
    window.specificRepDate = "";
    if (getEl("repFilterDate")) getEl("repFilterDate").value = "";
    renderReportMonthTabs();
    renderReportsSummary();
  };

  /**
   * বছর বা নির্দিষ্ট তারিখ অনুযায়ী Reports ফিল্টার প্রয়োগ করে
   */
  window.applyReportFilter = function () {
    if (getEl("repFilterYear")) window.currentRepYear = getEl("repFilterYear").value;
    var d = getEl("repFilterDate") ? getEl("repFilterDate").value : "";
    if (d) {
      window.specificRepDate = d;
      var doj = new Date(d);
      if (!isNaN(doj.getTime())) {
        window.currentRepYear = doj.getFullYear().toString();
        window.currentRepMonth = ("0" + (doj.getMonth() + 1)).slice(-2);
        if (getEl("repFilterYear")) getEl("repFilterYear").value = window.currentRepYear;
      }
    } else {
      window.specificRepDate = "";
    }
    renderReportMonthTabs();
    renderReportsSummary();
  };

  /**
   * তারিখ ও ফিল্টার রিসেট করে ALL DATA-তে নিয়ে যায়
   */
  window.clearReportDateFilter = function () {
    if (getEl("repFilterDate")) getEl("repFilterDate").value = "";
    window.specificRepDate = "";
    window.currentRepMonth = "ALL";
    renderReportMonthTabs();
    renderReportsSummary();
  };

  /**
   * নির্বাচিত সময়কালের P&L, MoM তুলনা, ব্যালেন্স শিট, ব্যবহারযোগ্য সিমেন স্ট্র ও Cow-wise ROI হিসাব করে
   */
  window.getReportPeriodData = function () {
    if (!window.currentRepYear) initReportFilters();
    var yr = window.currentRepYear || new Date().getFullYear().toString();
    var mn = window.currentRepMonth || "ALL";
    var dt = window.specificRepDate || "";
    var isAll = (!dt && mn === "ALL");

    function matchDate(dStr) {
      if (!dStr) return isAll;
      if (dt) return dStr === dt;
      if (isAll) return true;
      return dStr.substring(0, 4) === yr && dStr.substring(5, 7) === mn;
    }

    var milkL = 0;
    var cowSet = {};
    for (var mk in farmStore.milk) {
      var m = farmStore.milk[mk];
      if (m && matchDate(m.date)) {
        milkL += Number(m.liters) || 0;
        if (m.cow) cowSet[m.cow.trim().toUpperCase()] = true;
      }
    }

    var salesTot = 0;
    var salesByItem = {};
    for (var sk in farmStore.sales) {
      var sl = farmStore.sales[sk];
      if (sl && !(sl.isPayment && Number(sl.total) === 0) && matchDate(sl.date)) {
        var t = Number(sl.total) || 0;
        salesTot += t;
        var it = sl.item || "Other";
        salesByItem[it] = (salesByItem[it] || 0) + t;
      }
    }

    var expTot = 0;
    var expByCat = {};
    for (var ek in farmStore.expenses) {
      var ex = farmStore.expenses[ek];
      if (ex && matchDate(ex.date)) {
        var a = Number(ex.amount) || 0;
        expTot += a;
        var cat = ex.category || "Other";
        expByCat[cat] = (expByCat[cat] || 0) + a;
      }
    }

    // Cow-wise ROI calculation
    var cowRoiMap = {};
    for (var ck in farmStore.cattle) {
      var cw = farmStore.cattle[ck];
      if (cw && cw.tag) {
        cowRoiMap[cw.tag.trim().toUpperCase()] = {
          tag: cw.tag.trim(),
          breed: cw.breed || "-",
          milkL: 0,
          feedCost: 0,
          medCost: 0
        };
      }
    }

    for (var mk2 in farmStore.milk) {
      var m2 = farmStore.milk[mk2];
      if (m2 && m2.cow && matchDate(m2.date)) {
        var tu = m2.cow.trim().toUpperCase();
        if (!cowRoiMap[tu]) cowRoiMap[tu] = { tag: m2.cow.trim(), breed: "-", milkL: 0, feedCost: 0, medCost: 0 };
        cowRoiMap[tu].milkL += Number(m2.liters) || 0;
      }
    }

    for (var fk in farmStore.feedRations) {
      var fr = farmStore.feedRations[fk];
      if (fr && fr.cowTag && matchDate(fr.date)) {
        var tu2 = fr.cowTag.trim().toUpperCase();
        if (!cowRoiMap[tu2]) cowRoiMap[tu2] = { tag: fr.cowTag.trim(), breed: "-", milkL: 0, feedCost: 0, medCost: 0 };
        cowRoiMap[tu2].feedCost += Number(fr.totalCost) || 0;
      }
    }

    var medSources = [
      { storeKey: "vaccine", dateField: "date", costField: "cost" },
      { storeKey: "deworm", dateField: "date", costField: "cost" },
      { storeKey: "breeding", dateField: "aiDate", costField: "aiCost" },
      { storeKey: "health", dateField: "date", costField: "cost" }
    ];

    medSources.forEach(function (src) {
      var bucket = farmStore[src.storeKey] || {};
      for (var itemKey in bucket) {
        var rec = bucket[itemKey];
        var tVal = rec && (rec.tag || rec.cowTag);
        if (rec && tVal && matchDate(rec[src.dateField])) {
          var tNorm = String(tVal).trim().toUpperCase();
          if (cowRoiMap[tNorm]) {
            cowRoiMap[tNorm].medCost += Number(rec[src.costField]) || 0;
          }
        }
      }
    });

    var cowRoiList = Object.values(cowRoiMap).map(function (c) {
      var inc = c.milkL * 50;
      return {
        tag: c.tag,
        breed: c.breed,
        milkL: c.milkL,
        income: inc,
        feedCost: c.feedCost,
        medCost: c.medCost,
        net: inc - (c.feedCost + c.medCost)
      };
    }).sort(function (a, b) {
      return b.net - a.net;
    });

    // Month-over-Month comparison
    var refY = parseInt(yr, 10) || new Date().getFullYear();
    var refM = (mn === "ALL") ? (new Date().getMonth() + 1) : (parseInt(mn, 10) || 1);
    var curPrefix = refY + "-" + ("0" + refM).slice(-2);
    var prevM = refM - 1;
    var prevY = refY;
    if (prevM === 0) {
      prevM = 12;
      prevY = refY - 1;
    }
    var prevPrefix = prevY + "-" + ("0" + prevM).slice(-2);

    function getMonthTotals(pfx) {
      var ml = 0, sl = 0, ex = 0;
      for (var k1 in farmStore.milk) {
        if (farmStore.milk[k1] && (farmStore.milk[k1].date || "").startsWith(pfx)) {
          ml += Number(farmStore.milk[k1].liters) || 0;
        }
      }
      for (var k2 in farmStore.sales) {
        if (farmStore.sales[k2] && !(farmStore.sales[k2].isPayment && Number(farmStore.sales[k2].total) === 0) && (farmStore.sales[k2].date || "").startsWith(pfx)) {
          sl += Number(farmStore.sales[k2].total) || 0;
        }
      }
      for (var k3 in farmStore.expenses) {
        if (farmStore.expenses[k3] && (farmStore.expenses[k3].date || "").startsWith(pfx)) {
          ex += Number(farmStore.expenses[k3].amount) || 0;
        }
      }
      return { milk: ml, sales: sl, profit: sl - ex };
    }

    var curMo = getMonthTotals(curPrefix);
    var prevMo = getMonthTotals(prevPrefix);

    // Farm Balance Sheet & Available Semen Straws
    var custBalances = typeof getCustomerLiveBalances === "function" ? getCustomerLiveBalances() : {};
    var custDueTot = 0;
    for (var cbk in custBalances) {
      custDueTot += Number(custBalances[cbk].currentDue) || 0;
    }

    var vendDueTot = 0;
    for (var ek2 in farmStore.expenses) {
      if (farmStore.expenses[ek2] && typeof getExpensePaidAndDue === "function") {
        vendDueTot += getExpensePaidAndDue(farmStore.expenses[ek2]).due;
      }
    }

    var stkVal = 0;
    for (var stkK in farmStore.stock) {
      var stO = farmStore.stock[stkK];
      if (stO) stkVal += (Number(stO.qty) || 0) * (Number(stO.unitCost) || 0);
    }

    var availSemenTot = 0, availConv = 0, availSexed = 0;
    for (var semK in farmStore.semen) {
      var smO = farmStore.semen[semK];
      if (smO) {
        var c = Math.max(0, Number(smO.count) || 0);
        stkVal += c * (Number(smO.cost) || 0);
        availSemenTot += c;
        if ((smO.type || "Conventional") === "Sexed Sorted") availSexed += c;
        else availConv += c;
      }
    }

    var cowCnt = Object.keys(cowSet).length || 1;
    return {
      label: dt ? formatDateBR(dt) : (isAll ? "ALL DATA" : (mn + "/" + yr)),
      milkL: milkL,
      avgPerCow: milkL / cowCnt,
      salesTot: salesTot,
      expTot: expTot,
      netProfit: salesTot - expTot,
      salesByItem: salesByItem,
      expByCat: expByCat,
      cowRoiList: cowRoiList,
      curMo: curMo,
      prevMo: prevMo,
      custDueTot: custDueTot,
      vendDueTot: vendDueTot,
      stkVal: stkVal,
      availSemenTot: availSemenTot,
      availConv: availConv,
      availSexed: availSexed
    };
  };

  function formatMomBadge(curVal, prevVal) {
    if (!prevVal) return '<span style="color:#777;">গত মাস: ০</span>';
    var diffPct = Math.round(((curVal - prevVal) / Math.abs(prevVal)) * 100);
    if (diffPct >= 0) return '<span style="color:#1b5e20; font-weight:600;">▲ ' + diffPct + "% (গত মাসের তুলনায়)</span>";
    return '<span style="color:#c62828; font-weight:600;">▼ ' + Math.abs(diffPct) + "% (গত মাসের তুলনায়)</span>";
  }

  /**
   * Reports ট্যাবের কার্ড, ব্যালেন্স শিট, চার্ট এবং ROI টেবিল আপডেট করে
   */
  window.renderReportsSummary = function () {
    try {
      var r = getReportPeriodData();
      if (getEl("rep-milk")) getEl("rep-milk").innerText = r.milkL.toFixed(1) + " L";
      if (getEl("rep-avg-cow")) getEl("rep-avg-cow").innerText = "গড়: " + r.avgPerCow.toFixed(1) + " L/গরু";
      if (getEl("rep-sales")) getEl("rep-sales").innerText = "₹ " + r.salesTot.toLocaleString();
      if (getEl("rep-expenses")) getEl("rep-expenses").innerText = "₹ " + r.expTot.toLocaleString();

      var pEl = getEl("rep-profit");
      if (pEl) {
        pEl.innerText = "₹ " + r.netProfit.toLocaleString();
        pEl.style.color = r.netProfit >= 0 ? "green" : "red";
      }

      if (getEl("rep-mom-milk")) getEl("rep-mom-milk").innerHTML = formatMomBadge(r.curMo.milk, r.prevMo.milk);
      if (getEl("rep-mom-sales")) getEl("rep-mom-sales").innerHTML = formatMomBadge(r.curMo.sales, r.prevMo.sales);
      if (getEl("rep-mom-profit")) getEl("rep-mom-profit").innerHTML = formatMomBadge(r.curMo.profit, r.prevMo.profit);

      var bsEl = getEl("repBalanceSheetGrid");
      if (bsEl) {
        bsEl.innerHTML =
          '<div style="background:#e8f5e9; padding:10px; border-radius:8px;"><small style="color:#555;">গ্রাহকের কাছে পাওনা (Receivable)</small><div style="font-size:16px; font-weight:bold; color:#1b5e20;">₹ ' + Math.round(r.custDueTot).toLocaleString() + "</div></div>" +
          '<div style="background:#ffebee; padding:10px; border-radius:8px;"><small style="color:#555;">দোকানদারের বাকি (Payable)</small><div style="font-size:16px; font-weight:bold; color:#c62828;">₹ ' + Math.round(r.vendDueTot).toLocaleString() + "</div></div>" +
          '<div style="background:#e3f2fd; padding:10px; border-radius:8px;"><small style="color:#555;">মোট স্টক ও সিমেন সম্পদ</small><div style="font-size:16px; font-weight:bold; color:#0288d1;">₹ ' + Math.round(r.stkVal).toLocaleString() + "</div></div>" +
          '<div style="background:#f3e5f5; padding:10px; border-radius:8px;"><small style="color:#555;">মোট ব্যবহারযোগ্য সিমেন স্ট্র</small><div style="font-size:16px; font-weight:bold; color:#7b1fa2;">' + r.availSemenTot + ' টি</div><small style="color:#555;">Conv: ' + r.availConv + " | Sexed: " + r.availSexed + "</small></div>";
      }

      var roiBody = getEl("reportCowRoiTableBody");
      if (roiBody) {
        if (r.cowRoiList.length === 0) {
          roiBody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#888;">কোনো গরুর ডাটা নেই।</td></tr>';
        } else {
          roiBody.innerHTML = r.cowRoiList.map(function (c, i) {
            return "<tr>" +
              "<td>" + (i + 1) + "</td>" +
              "<td><strong>🐄 " + c.tag + '</strong> <small style="color:#666;">(' + c.breed + ")</small></td>" +
              "<td><strong>" + c.milkL.toFixed(1) + " L</strong></td>" +
              '<td style="color:#0288d1;">₹ ' + Math.round(c.income).toLocaleString() + "</td>" +
              '<td style="color:#e65100;">₹ ' + Math.round(c.feedCost).toLocaleString() + "</td>" +
              '<td style="color:#c2185b;">₹ ' + Math.round(c.medCost).toLocaleString() + "</td>" +
              '<td style="font-weight:bold; color:' + (c.net >= 0 ? "#1b5e20" : "#c62828") + ';">₹ ' + Math.round(c.net).toLocaleString() + "</td>" +
            "</tr>";
          }).join("");
        }
      }

      if (typeof Chart !== "undefined") {
        var expCanvas = getEl("reportExpenseCatChart");
        if (expCanvas) {
          if (window._repExpCatChartInst) window._repExpCatChartInst.destroy();
          var eKeys = Object.keys(r.expByCat);
          window._repExpCatChartInst = new Chart(expCanvas.getContext("2d"), {
            type: "doughnut",
            data: {
              labels: eKeys.length ? eKeys : ["No Data"],
              datasets: [{
                data: eKeys.length ? eKeys.map(function (k) { return r.expByCat[k]; }) : [1],
                backgroundColor: ["#ef5350", "#ffa726", "#ab47bc", "#29b6f6", "#78909c"]
              }]
            },
            options: { responsive: true, maintainAspectRatio: false }
          });
        }

        var salCanvas = getEl("reportSalesItemChart");
        if (salCanvas) {
          if (window._repSalesItemChartInst) window._repSalesItemChartInst.destroy();
          var sKeys = Object.keys(r.salesByItem);
          window._repSalesItemChartInst = new Chart(salCanvas.getContext("2d"), {
            type: "doughnut",
            data: {
              labels: sKeys.length ? sKeys : ["No Data"],
              datasets: [{
                data: sKeys.length ? sKeys.map(function (k) { return r.salesByItem[k]; }) : [1],
                backgroundColor: ["#2e7d32", "#66bb6a", "#ffb300", "#0288d1", "#8d6e63"]
              }]
            },
            options: { responsive: true, maintainAspectRatio: false }
          });
        }
      }
    } catch (e) {
      console.log("renderReportsSummary error:", e);
    }
  };

  /**
   * প্রিন্টযোগ্য P&L স্টেটমেন্ট মোডাল দেখায়
   */
  window.showProfitLossStatement = function () {
    var r = getReportPeriodData();
    document.body.setAttribute("data-print", "invoice");
    getEl("invMainDocTitle").innerText = "লাভ-ক্ষতি ও পারফরম্যান্স রিপোর্ট / P&L STATEMENT (" + r.label + ")";

    var sRows = Object.keys(r.salesByItem).map(function (k) {
      return '<tr><td>' + k + '</td><td style="text-align:right;">₹ ' + r.salesByItem[k].toLocaleString() + "</td></tr>";
    }).join("") || '<tr><td colspan="2">কোনো বিক্রি নেই</td></tr>';

    var eRows = Object.keys(r.expByCat).map(function (k) {
      return '<tr><td>' + k + '</td><td style="text-align:right;">₹ ' + r.expByCat[k].toLocaleString() + "</td></tr>";
    }).join("") || '<tr><td colspan="2">কোনো খরচ নেই</td></tr>';

    getEl("invoiceDetails").innerHTML =
      '<div style="background:#f1f8e9; padding:10px; border-radius:8px; margin-bottom:12px;">' +
        "<strong>মোট দুধ উৎপাদন:</strong> " + r.milkL.toFixed(1) + " লিটার (গড়: " + r.avgPerCow.toFixed(1) + " L/গরু) | " +
        "<strong>গ্রাহক পাওনা:</strong> ₹ " + Math.round(r.custDueTot).toLocaleString() + " | <strong>দোকান বাকি:</strong> ₹ " + Math.round(r.vendDueTot).toLocaleString() +
      "</div>" +
      '<div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">' +
        '<div><strong>বিক্রি / আয় (Sales):</strong><table class="invoice-table" style="width:100%; min-width:unset; margin-top:6px;"><tbody>' + sRows + '</tbody><tfoot><tr style="background:#e8f5e9;"><th>মোট আয়</th><th style="text-align:right;">₹ ' + r.salesTot.toLocaleString() + "</th></tr></tfoot></table></div>" +
        '<div><strong>খরচ (Expenses):</strong><table class="invoice-table" style="width:100%; min-width:unset; margin-top:6px;"><tbody>' + eRows + '</tbody><tfoot><tr style="background:#ffebee;"><th>মোট খরচ</th><th style="text-align:right;">₹ ' + r.expTot.toLocaleString() + "</th></tr></tfoot></table></div>" +
      "</div>" +
      '<div style="text-align:right; margin-top:16px; font-size:17px; font-weight:bold; color:' + (r.netProfit >= 0 ? "#1b5e20" : "#c62828") + ';">নিট লাভ / ক্ষতি (Net Profit): ₹ ' + r.netProfit.toLocaleString() + "</div>";

    getEl("invoiceModal").style.display = "flex";
  };

  /**
   * CSV / Word / Text ফরম্যাটে Reports ডেটা এক্সপোর্ট করে
   */
  window.exportReports = function (format) {
    var r = getReportPeriodData();
    var exportData = [
      ["Farm P&L Report", r.label],
      ["Total Milk Produced", r.milkL.toFixed(1) + " L"],
      ["Avg Milk per Cow", r.avgPerCow.toFixed(1) + " L"],
      ["Total Sales Revenue", "Rs " + r.salesTot],
      ["Total Expenses", "Rs " + r.expTot],
      ["Net Profit / Loss", "Rs " + r.netProfit],
      ["Customer Receivable Due", "Rs " + Math.round(r.custDueTot)],
      ["Vendor Payable Due", "Rs " + Math.round(r.vendDueTot)],
      ["Stock & Semen Valuation", "Rs " + Math.round(r.stkVal)],
      ["Available Semen Straws", r.availSemenTot + " (Conv: " + r.availConv + " / Sexed: " + r.availSexed + ")"],
      ["---", "---"],
      ["Cow Tag", "Milk (L) / Est Income (Rs) / Feed Cost (Rs) / Med Cost (Rs) / Net Profit (Rs)"]
    ];

    r.cowRoiList.forEach(function (c) {
      exportData.push([
        c.tag + " (" + c.breed + ")",
        c.milkL.toFixed(1) + " L / Rs " + Math.round(c.income) + " / Rs " + Math.round(c.feedCost) + " / Rs " + Math.round(c.medCost) + " / Rs " + Math.round(c.net)
      ]);
    });

    var fileName = "Farm_Analytics_Report_" + r.label.replace(/[\/\s]/g, "_");
    if (format === "csv") {
      var csv = "data:text/csv;charset=utf-8,\uFEFF" + exportData.map(function (row) { return row.join(","); }).join("\r\n");
      var a = document.createElement("a");
      a.href = encodeURI(csv);
      a.download = fileName + ".csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else if (format === "txt") {
      var txt = "data:text/plain;charset=utf-8,\uFEFF" + exportData.map(function (row) { return row.join(" : "); }).join("\r\n");
      var aTxt = document.createElement("a");
      aTxt.href = encodeURI(txt);
      aTxt.download = fileName + ".txt";
      document.body.appendChild(aTxt);
      aTxt.click();
      document.body.removeChild(aTxt);
    } else if (format === "doc") {
      var h = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Farm Report</title></head><body><h2 style='color:#1b5e20;'>Nanda Dairy & Agro - Analytics & P&L Report (" + r.label + ")</h2><table border='1' style='border-collapse:collapse; width:100%; font-family:sans-serif; font-size:12px;'>";
      exportData.forEach(function (row, idx) {
        h += "<tr>" + row.map(function (cell) {
          return idx === 0 ? "<th style='padding:6px; background:#e8f5e9;'>" + cell + "</th>" : "<td style='padding:6px;'>" + cell + "</td>";
        }).join("") + "</tr>";
      });
      h += "</table></body></html>";
      var blob = new Blob(["\ufeff", h], { type: "application/msword" });
      var aDoc = document.createElement("a");
      aDoc.href = URL.createObjectURL(blob);
      aDoc.download = fileName + ".doc";
      document.body.appendChild(aDoc);
      aDoc.click();
      document.body.removeChild(aDoc);
    }
  };
})();
