/**
 * @fileoverview Utilitário de memoização para seletores de domínio.
 *
 * MOTIVAÇÃO:
 *   Seletores como `selectAllocationByClass` percorrem todos os holdings
 *   e cashBalances para montar um array derivado. Chamar esses seletores
 *   em múltiplos componentes no mesmo render (ou em renders causados por
 *   changes não relacionados) seria desperdiçado.
 *
 *   Esta implementação é inspirada no padrão reselect, mas sem dependências.
 *   Usa comparação por referência (===) nos inputs — que é o comportamento
 *   correto para arrays imutáveis no WealthContext.
 *
 * USO:
 *   const selectAllocation = createSelector(
 *     [(s) => s.holdings, (s) => s.cashBalances],
 *     (holdings, cashBalances) => computeExpensively(holdings, cashBalances)
 *   );
 *
 *   // O resultado só é recomputado quando holdings ou cashBalances mudam (===)
 *   const allocation = selectAllocation(state);
 *
 * CACHE:
 *   Cada instância criada por `createSelector` tem seu próprio cache (1 slot).
 *   Cache de 1 slot é suficiente para aplicações single-instance.
 *   Para multi-instância (ex: múltiplos contextos em testes), criar instâncias separadas.
 *
 * ZUSTAND:
 *   Se o projeto migrar para Zustand, esses seletores se tornam automaticamente
 *   compatíveis com `useStore(selectAllocation)` — mesma assinatura.
 *
 * @module domain/selectors/createSelector
 */

/**
 * Cria um seletor memoizado com cache de 1 slot.
 *
 * @template TState
 * @template TResult
 * @param {Array<(state: TState) => unknown>} inputSelectors
 * @param {(...inputs: unknown[]) => TResult} resultFn
 * @returns {(state: TState) => TResult}
 */
export const createSelector = (inputSelectors, resultFn) => {
  let lastInputs = null;
  let lastResult = null;

  return (state) => {
    const inputs = inputSelectors.map((sel) => sel(state));

    if (
      lastInputs !== null &&
      inputs.length === lastInputs.length &&
      inputs.every((inp, i) => inp === lastInputs[i])
    ) {
      return lastResult;
    }

    lastInputs = inputs;
    lastResult = resultFn(...inputs);
    return lastResult;
  };
};

/**
 * Variante para seletores que recebem argumentos além do state.
 * Cria uma nova instância cacheada para cada combinação de args.
 * Cache limitado a `maxCacheSize` para evitar vazamento de memória.
 *
 * Útil para: selectTransactionsByMonth(state, year, month)
 *
 * @template TState
 * @template TResult
 * @param {Array<(state: TState) => unknown>} inputSelectors
 * @param {(...inputs: unknown[]) => TResult} resultFn
 * @param {{ maxCacheSize?: number }} [opts]
 * @returns {(state: TState, ...args: unknown[]) => TResult}
 */
export const createParametricSelector = (inputSelectors, resultFn, { maxCacheSize = 12 } = {}) => {
  /** @type {Map<string, { lastInputs: unknown[], lastResult: unknown }>} */
  const cache = new Map();

  return (state, ...args) => {
    const cacheKey = JSON.stringify(args);
    const inputs = inputSelectors.map((sel) => sel(state));

    const existing = cache.get(cacheKey);
    if (
      existing &&
      existing.lastInputs.length === inputs.length &&
      inputs.every((inp, i) => inp === existing.lastInputs[i])
    ) {
      return existing.lastResult;
    }

    const result = resultFn(...inputs, ...args);

    // LRU simples: se atingiu o limite, remove o mais antigo
    if (cache.size >= maxCacheSize) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }

    cache.set(cacheKey, { lastInputs: inputs, lastResult: result });
    return result;
  };
};
