import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export const generatePDF = (expenses, categories, date) => {
  const doc = new jsPDF();

  // ---------- Helper Functions ----------
  const formatINR = (amount) =>
    Number(amount || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const formattedDate = new Date(date).toLocaleDateString("en-IN", {
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

  // Group expenses by category
  const groupedExpenses = expenses.reduce((groups, expense) => {
    const categoryId = expense.categories?.id || expense.category_id || 'other';
    const categoryName = expense.categories?.name || expense.category_name || 'Other';
    const categoryIcon = expense.categories?.icon || '📝';
    
    if (!groups[categoryId]) {
      groups[categoryId] = {
        name: categoryName,
        icon: categoryIcon,
        items: [],
        total: 0
      };
    }
    
    groups[categoryId].items.push(expense);
    groups[categoryId].total += Number(expense.amount) || 0;
    return groups;
  }, {});

  let yPos = 60;
  let grandTotal = 0;
  let sectionCounter = 1;

  // ========== DYNAMIC CATEGORY SECTIONS ==========
  Object.values(groupedExpenses).forEach((category) => {
    // Category Header
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(41, 128, 185);
    doc.text(`${sectionCounter}. ${category.icon} ${category.name.toUpperCase()}`, 14, yPos);
    
    // Prepare table data for this category
    const tableData = category.items.map(item => {
      // Format custom fields as string
      let fieldsStr = '';
      if (item.fields && Object.keys(item.fields).length > 0) {
        fieldsStr = Object.entries(item.fields)
          .map(([key, val]) => `${key}: ${val}`)
          .join(' | ');
      }
      
      return [
        item.description || '-',
        `Rs. ${formatINR(item.amount)}`,
        fieldsStr
      ];
    });

    // Add table for this category
    autoTable(doc, {
      startY: yPos + 5,
      head: [['Description', 'Amount', 'Details']],
      body: tableData,
      foot: [[`${category.name} Total`, `Rs. ${formatINR(category.total)}`, '']],
      theme: "striped",
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
      columnStyles: { 
        1: { halign: "right" },
        2: { cellWidth: 70 }
      },
      margin: { left: 14, right: 14 },
    });

    yPos = doc.lastAutoTable.finalY + 15;
    grandTotal += category.total;
    sectionCounter++;
  });

  // ========== GRAND TOTAL SECTION ==========
  const pageHeight = doc.internal.pageSize.height;
  
  // Check if we need a new page
  if (yPos > pageHeight - 40) {
    doc.addPage();
    yPos = 20;
  }

  // Draw a light grey background box for the total
  doc.setFillColor(245, 245, 245);
  doc.rect(14, yPos, 182, 20, "F");
  
  // Draw a thick left border for accent
  doc.setFillColor(41, 128, 185);
  doc.rect(14, yPos, 2, 20, "F");

  // Grand Total Label
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("GRAND TOTAL", 22, yPos + 12);

  // Grand Total Amount
  doc.setTextColor(41, 128, 185);
  doc.setFontSize(16);
  doc.text(`Rs. ${formatINR(grandTotal)}`, 190, yPos + 12, { align: "right" });

  // ========== CATEGORY SUMMARY TABLE ==========
  yPos += 30;
  
  // Check if we need a new page for summary
  if (yPos > pageHeight - 40) {
    doc.addPage();
    yPos = 20;
  }

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(41, 128, 185);
  doc.text("CATEGORY SUMMARY", 14, yPos);

  const summaryData = Object.values(groupedExpenses).map(cat => [
    `${cat.icon} ${cat.name}`,
    `Rs. ${formatINR(cat.total)}`,
    `${cat.items.length} ${cat.items.length === 1 ? 'entry' : 'entries'}`
  ]);

  autoTable(doc, {
    startY: yPos + 5,
    head: [['Category', 'Total', 'Items']],
    body: summaryData,
    theme: "grid",
    headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    columnStyles: { 
      1: { halign: "right" },
      2: { halign: "center" }
    },
    margin: { left: 14, right: 14 },
  });

  yPos = doc.lastAutoTable.finalY + 15;

  // ========== FOOTER ==========
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