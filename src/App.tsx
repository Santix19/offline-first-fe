import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router";
import { router } from "./app/router";
import { ScrollProvider } from "./motion/scroll";
import { ToastProvider } from "./components/ui/Toast";
import { ApiError } from "./api/http";

// A 4xx is the server's answer (forbidden, not found, bad session), not an outage: retrying it only
// keeps the "Despertando el servidor" notice on screen. Network errors and 5xx retry twice.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) =>
        !(error instanceof ApiError && error.status >= 400 && error.status < 500) && failureCount < 2,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ScrollProvider router={router}>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </ScrollProvider>
    </QueryClientProvider>
  );
}
