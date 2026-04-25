import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Game from "./pages/Game";
import Player from "./pages/Player";
import Standings from "./pages/Standings";
import Predictions from "./pages/Predictions";
import Batters from "./pages/Batters";
import Pitchers from "./pages/Pitchers";
import Teams from "./pages/Teams";
import Team from "./pages/Team";
import CalendarPage from "./pages/CalendarPage";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/game/:id" element={<Game />} />
          <Route path="/player/:id" element={<Player />} />
          <Route path="/standings" element={<Standings />} />
          <Route path="/predictions" element={<Predictions />} />
          <Route path="/batters" element={<Batters />} />
          <Route path="/pitchers" element={<Pitchers />} />
          <Route path="/teams" element={<Teams />} />
          <Route path="/team/:id" element={<Team />} />
          <Route path="/calendar" element={<CalendarPage />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
