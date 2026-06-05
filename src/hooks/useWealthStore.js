/**
 * @fileoverview Hook de acesso conveniente ao WealthContext.
 *
 * Re-exporta useWealth com um nome mais descritivo para uso nos hooks de bridge.
 * Também re-exporta os seletores mais usados para conveniência.
 *
 * @module hooks/useWealthStore
 */

export { useWealth as useWealthStore } from "../contexts/WealthContext.jsx";

// Re-exporta seletores para uso direto nos componentes e hooks
export {
  selectTotalNetWorth,
  selectAllocationByClass,
  selectInstitutionExposure,
  selectLiquidAssets,
  selectInvestmentHoldings,
  selectHoldingsByAssetClass,
  selectHoldingsByInstitution,
  selectPortfolioHistory,
  selectPrimaryGoal,
  selectGoalProgress,
  selectTransactionsByMonth,
  selectPassiveIncomeByMonth,
  selectMigrationWarnings,
  selectLegacyImportedData,
  selectWealthInsights,
} from "../domain/selectors/wealth.js";
