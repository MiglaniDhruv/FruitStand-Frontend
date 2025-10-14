// Export the main Excel generator service
export { ExcelGenerator, excelGenerator } from './excel-generator';

// Export template rendering functions for potential direct use
export { 
  renderTurnoverReportTemplate,
  renderProfitLossReportTemplate,
  renderCommissionReportTemplate,
  renderShortfallReportTemplate,
  renderExpensesSummaryTemplate,
  renderVendorsListTemplate,
  renderRetailersListTemplate
} from './excel-templates';

// Export relevant TypeScript types for report data structures
export type {
  TurnoverReportData,
  ProfitLossReportData,
  CommissionReportData,
  ShortfallReportData,
  ExpensesSummaryData,
  VendorsListData,
  RetailersListData
} from '@shared/schema';

// Default export is the service instance
export { excelGenerator as default } from './excel-generator';