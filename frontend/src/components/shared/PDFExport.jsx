import { FileDown } from 'lucide-react'

export default function PDFExport({ trustData }) {
  const handleExport = async () => {
    try {
      const html2canvas = (await import('html2canvas')).default
      const { jsPDF } = await import('jspdf')

      const content = document.getElementById('dashboard-content')
      if (!content) return

      const canvas = await html2canvas(content, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      })

      const pdf = new jsPDF('p', 'mm', 'a4')
      const imgWidth = 190
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      pdf.setFontSize(18)
      pdf.text(`${trustData?.trust_name || 'Trust'} — A&E Report`, 10, 15)
      pdf.setFontSize(10)
      pdf.text(`Generated: ${new Date().toLocaleDateString('en-GB')}`, 10, 22)

      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 10, 30, imgWidth, Math.min(imgHeight, 250))
      pdf.save(`${trustData?.trust_code || 'trust'}_ae_report.pdf`)
    } catch {
      alert('Could not generate PDF. Please try again.')
    }
  }

  return (
    <button
      onClick={handleExport}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-text-secondary dark:text-gray-400 hover:text-primary dark:hover:text-primary-light border border-gray-200 dark:border-gray-600 rounded-md hover:border-primary dark:hover:border-primary-light transition-colors"
    >
      <FileDown size={14} />
      Export PDF
    </button>
  )
}
