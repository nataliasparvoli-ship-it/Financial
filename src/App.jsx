import { useApp } from "./contexts/AppContext";
import OnboardingPage from "./pages/OnboardingPage";
import DashboardPage from "./pages/DashboardPage";

export default function App() {
  const { isOnboardingComplete } = useApp();
  return isOnboardingComplete ? <DashboardPage /> : <OnboardingPage />;
}
