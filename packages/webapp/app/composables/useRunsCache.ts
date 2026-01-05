import type { RunDetail, RunListResponse } from "../types/news";

type RunListCache = Record<string, RunListResponse>;
type RunDetailCache = Record<string, RunDetail>;

function listKey(page: number, pageSize: number) {
  return `${page}-${pageSize}`;
}

export function useRunsCache() {
  const listCache = useState<RunListCache>("runs-list-cache", () => ({}));
  const detailCache = useState<RunDetailCache>("run-detail-cache", () => ({}));

  function getList(page: number, pageSize: number) {
    return listCache.value[listKey(page, pageSize)];
  }

  function setList(page: number, pageSize: number, data: RunListResponse) {
    listCache.value[listKey(page, pageSize)] = data;
  }

  function getDetail(id: string) {
    return detailCache.value[id];
  }

  function setDetail(id: string, data: RunDetail) {
    detailCache.value[id] = data;
  }

  return {
    getList,
    setList,
    getDetail,
    setDetail,
  };
}
