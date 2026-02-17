import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export const generatePDF = (expenses) => {
  const doc = new jsPDF();

  // ---------- Helper Functions ----------
  const formatINR = (amount) =>
    Number(amount || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const formattedDate = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // ========== HEADER ==========
  // Deep Blue Header
  doc.setFillColor(41, 128, 185);
  doc.rect(0, 0, 210, 35, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("DAILY EXPENSE REPORT", 105, 18, { align: "center" });
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Generated via Expense Tracker App", 105, 25, { align: "center" });

  // ========== METADATA ==========
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("REPORT DATE:", 14, 48);
  doc.setFont("helvetica", "normal");
  doc.text(`${formattedDate}`, 45, 48);

  // ========== FOOD SECTION ==========
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(41, 128, 185);
  doc.text("1. FOOD & CATERING", 14, 60);

  const breakfast = Number(expenses.food?.breakfast) || 0;
  const lunch = Number(expenses.food?.lunch) || 0;
  const snacks = Number(expenses.food?.snacks) || 0;
  const dinner = Number(expenses.food?.dinner) || 0;
  const foodTotal = breakfast + lunch + snacks + dinner;

  autoTable(doc, {
    startY: 65,
    head: [["Category", "Amount (INR)"]],
    body: [
      ["Breakfast", `Rs. ${formatINR(breakfast)}`],
      ["Lunch", `Rs. ${formatINR(lunch)}`],
      ["Snacks", `Rs. ${formatINR(snacks)}`],
      ["Dinner", `Rs. ${formatINR(dinner)}`],
    ],
    theme: "striped",
    headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    columnStyles: { 1: { halign: "right" } },
    margin: { left: 14, right: 14 },
  });

  // ========== PETROL SECTION ==========
  let finalY = doc.lastAutoTable.finalY + 12;
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("2. TRAVEL & FUEL", 14, finalY);

  const petrol = Number(expenses.petrol) || 0;

  autoTable(doc, {
    startY: finalY + 5,
    head: [["Category", "Amount (INR)"]],
    body: [["Petrol/Fuel", `Rs. ${formatINR(petrol)}`]],
    theme: "striped",
    headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    columnStyles: { 1: { halign: "right" } },
    margin: { left: 14, right: 14 },
  });

  // ========== EXTRA EXPENSES SECTION ==========
  finalY = doc.lastAutoTable.finalY + 12;
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("3. ADDITIONAL EXPENSES", 14, finalY);

  let extraTotal = 0;
  const extraData = [];

  if (expenses.extra && expenses.extra.length > 0) {
    expenses.extra.forEach((item) => {
      const amount = Number(item.amount) || 0;
      extraTotal += amount;
      extraData.push([item.reason || "General", `Rs. ${formatINR(amount)}`]);
    });
  } else {
    extraData.push(["No additional entries", "Rs. 0.00"]);
  }

  autoTable(doc, {
    startY: finalY + 5,
    head: [["Description", "Amount (INR)"]],
    body: extraData,
    theme: "striped",
    headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    columnStyles: { 1: { halign: "right" } },
    margin: { left: 14, right: 14 },
  });

  // ========== GRAND TOTAL SECTION (MODERN LOOK) ==========
  finalY = doc.lastAutoTable.finalY + 15;
  const grandTotal = foodTotal + petrol + extraTotal;

  // Draw a light grey background box for the total
  doc.setFillColor(245, 245, 245);
  doc.rect(14, finalY, 182, 20, "F");
  
  // Draw a thick left border for accent
  doc.setFillColor(41, 128, 185);
  doc.rect(14, finalY, 2, 20, "F");

  // Grand Total Label - Dark Grey for readability
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("GRAND TOTAL", 22, finalY + 12);

  // Grand Total Amount - Blue and Large
  doc.setTextColor(41, 128, 185);
  doc.setFontSize(16);
  doc.text(`Rs. ${formatINR(grandTotal)}`, 190, finalY + 12, {
    align: "right",
  });

  // ========== FOOTER ==========
  const pageHeight = doc.internal.pageSize.height;
  doc.setTextColor(150);
  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.text(
    "This is a computer-generated report.",
    105,
    pageHeight - 15,
    { align: "center" }
  );
  doc.text(
    `Timestamp: ${new Date().toLocaleString()}`,
    105,
    pageHeight - 10,
    { align: "center" }
  );

  // ========== SAVE ==========
  const today = new Date().toISOString().split("T")[0];
  doc.save(`Expense-Report-${today}.pdf`);
};