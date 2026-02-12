import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";

import Home from "./pages/Home";
import Therapists from "./pages/Therapists";
import Clients from "./pages/Clients";
import BookSession from "./pages/BookSession";

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/therapists" element={<Therapists />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/book" element={<BookSession />} />
      </Routes>
    </BrowserRouter>
  );
}
