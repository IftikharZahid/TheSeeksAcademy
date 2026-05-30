const dataWithBreakdown = {
  totalFee: 9000,
  paidAmount: 8925,
  pendingAmount: 75,
  months: ["May", "June"],
  month: "May, June",
  history: [
    { months: ["May"], amountPaid: 4500, date: "2026-05-28T05:00:14.028Z" },
    { amountPaid: 11500, date: "2026-05-28T05:52:13.634Z", months: ["April", "May", "June", "July"] },
    { amountPaid: 1500, date: "2026-05-28T05:52:46.186Z", months: ["April", "May", "June", "July"] },
    { months: ["May", "June"], date: "2026-05-28T06:02:32.217Z", amountPaid: 4500 },
    { months: ["May"], date: "2026-05-28T06:03:04.646Z", amountPaid: 150 },
    { amountPaid: 75, date: "2026-05-28T06:06:29.568Z", months: ["May"] }
  ],
  monthlyFees: {
    "May": { total: 4500, paid: 4500 },
    "June": { total: 4500, paid: 4425 }
  }
};

const dataLegacy = {
  totalFee: 9000,
  paidAmount: 9000,
  pendingAmount: 0,
  months: ["April", "May"],
  month: "April, May",
  history: []
};

// Simulation of FeeDetailScreen.tsx ledgerPayments logic
function generateLedger(data) {
  const registeredMonths = data.months || [];
  const computedTotalFee = data.totalFee;
  const numMonths = registeredMonths.length;
  const monthlyTotalFee = Math.round(computedTotalFee / numMonths);

  // Simple split flatMap parser simulation
  let parsedPayments = [];
  if (data.history && Array.isArray(data.history)) {
    parsedPayments = data.history.flatMap(h => {
      const ms = h.months || [];
      if (ms.length <= 1) return [{ amount: h.amountPaid, month: ms[0], date: h.date }];
      return ms.map(m => ({ amount: Math.round(h.amountPaid / ms.length), month: m, date: h.date }));
    });
  }

  const ledgerPayments = registeredMonths.map((m, idx) => {
    let paidForMonth = 0;
    let totalForMonth = monthlyTotalFee;
    let hasBreakdown = false;

    if (data.monthlyFees && typeof data.monthlyFees === 'object') {
      const matchedKey = Object.keys(data.monthlyFees).find(
        k => k.toLowerCase().trim() === m.toLowerCase().trim()
      );
      if (matchedKey) {
        const entry = data.monthlyFees[matchedKey];
        paidForMonth = typeof entry.paid === 'number' ? entry.paid : 0;
        totalForMonth = typeof entry.total === 'number' ? entry.total : monthlyTotalFee;
        hasBreakdown = true;
      }
    }

    if (!hasBreakdown) {
      const monthPayments = parsedPayments.filter(p => p.month && p.month.toLowerCase().trim() === m.toLowerCase().trim());
      paidForMonth = monthPayments.reduce((acc, p) => acc + p.amount, 0);
      totalForMonth = monthlyTotalFee;
    }

    const pendingForMonth = totalForMonth - paidForMonth > 0 ? totalForMonth - paidForMonth : 0;

    return {
      month: m,
      amount: paidForMonth,
      totalFee: totalForMonth,
      pending: pendingForMonth
    };
  });

  return ledgerPayments;
}

console.log("--- TEST 1: Data With Saved Breakdown (New System) ---");
const ledger1 = generateLedger(dataWithBreakdown);
console.log(JSON.stringify(ledger1, null, 2));

console.log("\n--- TEST 2: Legacy Data Fallback (Old System) ---");
const ledger2 = generateLedger(dataLegacy);
console.log(JSON.stringify(ledger2, null, 2));

// Assertions
if (ledger1[0].month === "May" && ledger1[0].amount === 4500 && ledger1[0].pending === 0) {
  console.log("\n✅ Assertion passed: May is correctly Paid 4500 and Pending 0!");
} else {
  console.error("\n❌ Assertion failed for May with breakdown!");
}

if (ledger1[1].month === "June" && ledger1[1].amount === 4425 && ledger1[1].pending === 75) {
  console.log("✅ Assertion passed: June is correctly Paid 4425 and Pending 75!");
} else {
  console.error("❌ Assertion failed for June with breakdown!");
}

if (ledger2[0].month === "April" && ledger2[0].amount === 0 && ledger2[0].pending === 4500) {
  console.log("✅ Assertion passed: Legacy April correctly fell back and shows Paid 0 (as history is empty)!");
}
