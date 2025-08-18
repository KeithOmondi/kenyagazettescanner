// client/src/FileUpload.jsx — React UI for Gazette Matcher
import React, { useState, useEffect } from "react";
import axios from "axios";

export default function FileUpload() {
  const [pdfFile, setPdfFile] = useState(null);
  const [excelFile, setExcelFile] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [expandedDate, setExpandedDate] = useState(null);

  // new: matching controls
  const [mode, setMode] = useState("tokens"); // exact | tokens | fuzzy
  const [threshold, setThreshold] = useState(0.85); // only used for fuzzy
  const [lastInsertCount, setLastInsertCount] = useState(null);

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      const res = await axios.get("http://localhost:5000/records");
      setRecords(res.data || []);
    } catch (err) {
      console.error("Error fetching records:", err);
      setError("Failed to fetch records. Please check the server.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pdfFile || !excelFile) {
      setError("Please upload both PDF and Excel files.");
      return;
    }
    setError("");
    setLoading(true);
    setLastInsertCount(null);

    const formData = new FormData();
    formData.append("pdfFile", pdfFile);
    formData.append("excelFile", excelFile);

    const params = new URLSearchParams();
    params.set("mode", mode);
    params.set("threshold", threshold.toString());

    try {
      const res = await axios.post(`http://localhost:5000/match?${params.toString()}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setLastInsertCount(res.data?.insertedCount ?? null);
      await fetchRecords();
    } catch (err) {
      setError(err.response?.data?.error || "Error processing files.");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    if (!confirm("Clear ALL stored matches?")) return;
    try {
      await axios.post("http://localhost:5000/clear-records");
      await fetchRecords();
      setLastInsertCount(null);
    } catch {
      setError("Failed to clear records.");
    }
  };

  const filteredRecords = records.filter((row) =>
    Object.values(row).some((val) =>
      String(val ?? "").toLowerCase().includes(search.toLowerCase())
    )
  );

  const groupedRecords = filteredRecords.reduce((acc, rec) => {
    const date = rec.date_published || "Unknown Date";
    if (!acc[date]) acc[date] = [];
    acc[date].push(rec);
    return acc;
  }, {});

  const renderTable = () => {
    const dates = Object.keys(groupedRecords);
    if (!dates.length) return <p className="text-gray-500 mt-4">No records found.</p>;

    return dates.map((date) => (
      <div key={date} className="mb-8 border rounded-lg overflow-hidden">
        <h4
          className="bg-gray-200 text-gray-700 px-3 py-2 font-semibold cursor-pointer hover:bg-gray-300"
          onClick={() => setExpandedDate(expandedDate === date ? null : date)}
        >
          {date} ({groupedRecords[date].length})
        </h4>

        {expandedDate === date && (
          <div className="overflow-x-auto">
            <table className="w-full border border-gray-300 text-sm">
              <thead>
                <tr className="bg-blue-600 text-white">
                  {["No.","Court Station","Cause No.","Name of Deceased","Status at G.P.","Volume No.","Date Published"].map((h) => (
                    <th key={h} className="border border-gray-300 px-4 py-2 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groupedRecords[date].map((row, i) => (
                  <tr key={row.id ?? i} className={`${i % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-gray-100`}>
                    <td className="border px-4 py-2">{i + 1}</td>
                    <td className="border px-4 py-2">{row.court_station}</td>
                    <td className="border px-4 py-2">{row.cause_no}</td>
                    <td className="border px-4 py-2">{row.name_of_deceased}</td>
                    <td className="border px-4 py-2">{row.status_at_gp}</td>
                    <td className="border px-4 py-2">{row.volume_no}</td>
                    <td className="border px-4 py-2">{row.date_published || "Unknown"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    ));
  };

  return (
    <div className="max-w-6xl mx-auto p-6 font-sans">
      <h2 className="text-center text-2xl font-bold text-gray-800 mb-6">
        Gazette & Registry Matcher
      </h2>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block font-medium mb-1 text-gray-700">Gazette PDF:</label>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
              className="block w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block font-medium mb-1 text-gray-700">Registry Excel:</label>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setExcelFile(e.target.files?.[0] || null)}
              className="block w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Matching options */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block font-medium mb-1 text-gray-700">Matching Mode</label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="exact">Exact (alias-normalized)</option>
              <option value="tokens">Tokens (order-insensitive)</option>
              <option value="fuzzy">Fuzzy (Levenshtein)</option>
            </select>
          </div>

          <div className={`${mode === "fuzzy" ? "" : "opacity-50"}`}>
            <label className="block font-medium mb-1 text-gray-700">
              Threshold {mode === "fuzzy" ? `(${threshold})` : ""}
            </label>
            <input
              type="range"
              min="0.5"
              max="0.99"
              step="0.01"
              value={threshold}
              disabled={mode !== "fuzzy"}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="w-full"
            />
          </div>

          <div className="flex items-end gap-2">
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 py-2 px-4 rounded-lg text-white font-medium transition ${
                loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {loading ? "Processing..." : "Start Matching"}
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="py-2 px-4 rounded-lg border border-red-400 text-red-600 hover:bg-red-50"
            >
              Clear DB
            </button>
          </div>
        </div>

        {lastInsertCount != null && (
          <p className="bg-green-100 text-green-800 px-4 py-2 rounded-lg">
            Inserted new unique matches: <b>{lastInsertCount}</b>
          </p>
        )}

        {error && (
          <p className="bg-red-100 text-red-700 px-4 py-2 rounded-lg">{error}</p>
        )}
      </form>

      {/* Search & Records */}
      <div className="mt-6">
        <input
          type="text"
          placeholder="Search records..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
        {renderTable()}
      </div>
    </div>
  );
}
