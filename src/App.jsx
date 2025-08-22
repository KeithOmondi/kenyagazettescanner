import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import FileUpload from "./components/FileUpload";
import CourtReport from "./components/CourtReport";

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="max-w-5xl mx-auto bg-white shadow-lg rounded-lg p-6">
          {/* App Title */}
          <h1 className="text-2xl font-bold text-center mb-6">
            Gazette Name Matcher
          </h1>

          {/* Navigation */}
          <nav className="flex justify-center gap-6 mb-6">
            <Link
              to="/"
              className="text-blue-600 hover:underline font-medium"
            >
              Upload
            </Link>
            <Link
              to="/report"
              className="text-blue-600 hover:underline font-medium"
            >
              Report
            </Link>
          </nav>

          {/* Page Content */}
          <Routes>
            <Route path="/" element={<FileUpload />} />
            <Route path="/report" element={<CourtReport />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
