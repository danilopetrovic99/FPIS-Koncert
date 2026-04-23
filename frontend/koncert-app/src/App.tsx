import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Book from './pages/Book';
import Confirmation from './pages/Confirmation';
import MyReservation from './pages/MyReservation';
import './App.css';

export default function App() {
  return (
    <div className="app-shell">
      <Header />
      <main className="main">
        <div className="container">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/book" element={<Book />} />
            <Route path="/confirmation" element={<Confirmation />} />
            <Route path="/my" element={<MyReservation />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </div>
      </main>
      <Footer />
    </div>
  );
}
