import { useState } from "react";

export const usePagination = (initialPage = 1, initialLimit = 50) => {
  const [page, setPage] = useState(initialPage);
  const [limit] = useState(initialLimit);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const loadMore = async (loadFunction) => {
    if (!hasMore || isLoading) return;

    setIsLoading(true);
    try {
      const data = await loadFunction(page + 1, limit);

      if (data && data.length < limit) {
        setHasMore(false);
      }

      setPage(page + 1);
    } catch (error) {
      console.error("Pagination error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setPage(initialPage);
    setHasMore(true);
    setIsLoading(false);
  };

  return {
    page,
    limit,
    hasMore,
    isLoading,
    loadMore,
    reset,
  };
};
