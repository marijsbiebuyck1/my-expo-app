import { API_URL } from "@/constants/api";
import useSWR from "swr";
import fetcher from "./_fetcher";

export default function useMessages() {
  const { data, error, isLoading } = useSWR(`${API_URL}/messages`, fetcher);

  return {
    data,
    isLoading,
    // expose a boolean for easier checks + the raw error for debugging
    isError: Boolean(error),
    error,
  };
}
