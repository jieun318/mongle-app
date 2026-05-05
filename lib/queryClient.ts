import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 60 * 1000, // 1h
      gcTime: 24 * 60 * 60 * 1000, // 24h
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
