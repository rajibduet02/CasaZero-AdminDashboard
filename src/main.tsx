
  import { createRoot } from "react-dom/client";
  import { BrowserRouter } from "react-router-dom";
  import { ErrorBoundary } from "./components/ErrorBoundary.tsx";
  import App from "./App.tsx";
  import "./index.css";

  const basename = (import.meta.env.BASE_URL || "/").replace(/\/$/, "") || "/";

  createRoot(document.getElementById("root")!).render(
    <ErrorBoundary>
      <BrowserRouter basename={basename === "/" ? undefined : basename}>
        <App />
      </BrowserRouter>
    </ErrorBoundary>,
  );
