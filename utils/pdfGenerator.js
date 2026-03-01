import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export async function generatePDF(expenses, categories, date) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new jsPDF();

      // Simple amount formatting
      const formatAmount = (amount) => `Rs. ${Number(amount || 0).toFixed(2)}`;
      const formattedDate = new Date(date).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

      // ========== HEADER ==========
      doc.setFillColor(41, 128, 185);
      doc.rect(0, 0, 210, 30, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("DAILY EXPENSE REPORT", 105, 18, { align: "center" });

      // ========== DATE ==========
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(`Date: ${formattedDate}`, 14, 45);

      let yPos = 55;
      let grandTotal = 0;

      // ========== GROUP EXPENSES BY CATEGORY ==========
      const groupedExpenses = {};
      
      expenses.forEach(expense => {
        const categoryName = expense.categories?.name || 'Other';
        if (!groupedExpenses[categoryName]) {
          groupedExpenses[categoryName] = {
            items: [],
            total: 0
          };
        }
        groupedExpenses[categoryName].items.push(expense);
        groupedExpenses[categoryName].total += Number(expense.amount) || 0;
        grandTotal += Number(expense.amount) || 0;
      });

      // ========== EXPENSE TABLES BY CATEGORY ==========
      let categoryIndex = 1;
      
      for (const [categoryName, categoryData] of Object.entries(groupedExpenses)) {
        // Category Header
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(41, 128, 185);
        doc.text(`${categoryIndex}. ${categoryName}`, 14, yPos);
        yPos += 5;

        // Prepare table data
        const tableData = categoryData.items.map(item => [
          item.description || item.merchant || 'Transaction',
          formatAmount(item.amount)
        ]);

        // Add table for this category
        autoTable(doc, {
          startY: yPos,
          head: [['Description', 'Amount']],
          body: tableData,
          foot: [[`${categoryName} Total`, formatAmount(categoryData.total)]],
          theme: 'striped',
          headStyles: { fillColor: [41, 128, 185], textColor: 255 },
          footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
          columnStyles: {
            0: { cellWidth: 130 },
            1: { cellWidth: 40, halign: 'right' }
          },
          margin: { left: 14, right: 14 },
        });

        yPos = doc.lastAutoTable.finalY + 10;
        categoryIndex++;
      }

      // ========== GRAND TOTAL ==========
      const pageHeight = doc.internal.pageSize.height;
      
      if (yPos > pageHeight - 30) {
        doc.addPage();
        yPos = 20;
      }

      // Draw a light grey background box for the total
      doc.setFillColor(245, 245, 245);
      doc.rect(14, yPos, 182, 15, "F");

      // Grand Total Label
      doc.setTextColor(60, 60, 60);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("GRAND TOTAL", 22, yPos + 10);

      // Grand Total Amount
      doc.setTextColor(41, 128, 185);
      doc.setFontSize(16);
      doc.text(formatAmount(grandTotal), 190, yPos + 10, { align: "right" });

      // ========== FOOTER ==========
      const footerY = doc.internal.pageSize.height - 10;
      doc.setTextColor(150, 150, 150);
      doc.setFontSize(9);
      doc.setFont("helvetica", "italic");
      doc.text(
        "This is a computer-generated report.",
        105,
        footerY,
        { align: "center" }
      );

      // ========== SAVE PDF ==========
      const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
      doc.save(`Expense-Report-${new Date().toISOString().split('T')[0]}.pdf`);
      resolve(pdfBuffer);

    } catch (error) {
      console.error('PDF Generation Error:', error);
      reject(error);
    }
  });
}