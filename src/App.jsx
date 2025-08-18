import React from "react";
import FileUpload from "./components/FileUpload";

function App() {
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-6">
        <h1 className="text-2xl font-bold text-center mb-6">
          Gazette Name Matcher
        </h1>
        <FileUpload />
      </div>
    </div>
  );
}

export default App;
