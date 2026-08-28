import '@testing-library/jest-dom/vitest'

// jsdomはIntersectionObserverを実装していないため、無限スクロールを使うページ(TimelinePage)の
// テストが動くよう最小限のダミー実装を用意する。
class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
// @ts-expect-error jsdom環境にはIntersectionObserverが存在しないため補う
globalThis.IntersectionObserver = IntersectionObserverStub;
