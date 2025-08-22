// client/src/components/FileUpload.jsx
import React, { useState, useMemo } from "react";
import axios from "axios";
import { CSVLink } from "react-csv";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000/api";
const ROWS_PER_PAGE = 50;

export default function FileUpload() {
  const [pdfFile, setPdfFile] = useState(null);
  const [excelFile, setExcelFile] = useState(null);
  const [matches, setMatches] = useState([]);
  const [stats, setStats] = useState(null);

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  const [mode, setMode] = useState("tokens");
  const [threshold, setThreshold] = useState(0.85);

  const [search, setSearch] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "date_published", dir: "desc" });
  const [expandedDates, setExpandedDates] = useState({});
  const [pagePerDate, setPagePerDate] = useState({});

  // ---------------- Submit Files ----------------
  async function handleSubmit(e) {
    e.preventDefault();
    if (!pdfFile || !excelFile) return setError("Upload both PDF & Excel files.");

    setError("");
    setLoading(true);
    setMatches([]);
    setStats(null);
    setExpandedDates({});
    setPagePerDate({});
    setProgress(0);

    const form = new FormData();
    form.append("pdfFile", pdfFile);
    form.append("excelFile", excelFile);

    try {
      const res = await axios.post(`${API_BASE}/match?mode=${mode}&threshold=${threshold}`, form, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 600000,
        onUploadProgress: (evt) => evt.total && setProgress((evt.loaded / evt.total) * 30),
        onDownloadProgress: (evt) => evt.total && setProgress(30 + (evt.loaded / evt.total) * 70),
      });

      setMatches(res.data.matchedRows || []);
      setStats(res.data);
      setPdfFile(null);
      setExcelFile(null);
      setProgress(100);
    } catch (err) {
      setError(err.response?.data?.error || "Error processing files");
    } finally {
      setLoading(false);
      setTimeout(() => setProgress(0), 1000);
    }
  }

  // ---------------- Clear DB ----------------
  async function handleClear() {
    if (!window.confirm("Clear ALL stored matches?")) return;
    try {
      await axios.post(`${API_BASE}/clear-records`);
      setMatches([]);
      setStats(null);
      setExpandedDates({});
      setPagePerDate({});
    } catch {
      setError("Failed to clear records.");
    }
  }

  // ---------------- Filter & Sort ----------------
  const filteredMatches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return matches;
    return matches.filter((r) =>
      ["court_station", "cause_no", "name_of_deceased", "status_at_gp", "volume_no", "date_published"]
        .some((f) => String(r[f] ?? "").toLowerCase().includes(q))
    );
  }, [matches, search]);

  const sortedMatches = useMemo(() => {
    if (!sortConfig.key) return filteredMatches;
    return [...filteredMatches].sort((a, b) => {
      const A = String(a[sortConfig.key] ?? "");
      const B = String(b[sortConfig.key] ?? "");
      return sortConfig.dir === "asc" ? A.localeCompare(B) : B.localeCompare(A);
    });
  }, [filteredMatches, sortConfig]);

  const groupedMatches = useMemo(() => {
    return sortedMatches.reduce((acc, rec) => {
      const date = rec.date_published || "Unknown Date";
      (acc[date] ||= []).push(rec);
      return acc;
    }, {});
  }, [sortedMatches]);

  function requestSort(key) {
    setSortConfig((prev) => ({
      key,
      dir: prev.key === key && prev.dir === "asc" ? "desc" : "asc",
    }));
  }

  // ---------------- Render Helpers ----------------
  function renderCell(value) {
    if (!value?.trim?.()) return <span className="text-red-500 italic">N/A</span>;
    if (!search) return value;
    const regex = new RegExp(`(${search})`, "gi");
    return <span dangerouslySetInnerHTML={{ __html: String(value).replace(regex, "<mark>$1</mark>") }} />;
  }

  function renderTable() {
    const dates = Object.keys(groupedMatches);
    if (!dates.length) return <p className="mt-4 text-gray-500 text-center">No matches found.</p>;

    return dates.map((date) => {
      const rows = groupedMatches[date];
      const page = pagePerDate[date] || 1;
      const totalPages = Math.ceil(rows.length / ROWS_PER_PAGE);
      const paged = rows.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

      return (
        <div key={date} className="mb-8 border rounded-lg shadow bg-white">
          <h4
            className="bg-gray-100 px-4 py-2 font-semibold cursor-pointer hover:bg-gray-200 rounded-t-lg"
            onClick={() => setExpandedDates((p) => ({ ...p, [date]: !p[date] }))}
          >
            {date} ({rows.length})
          </h4>
          {expandedDates[date] && (
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="min-w-full border text-sm">
                <thead className="sticky top-0 z-10 bg-blue-600 text-white">
                  <tr>
                    {[
                      { key: "id", label: "No.", sticky: true },
                      { key: "court_station", label: "Court Station" },
                      { key: "cause_no", label: "Cause No." },
                      { key: "name_of_deceased", label: "Name of Deceased" },
                      { key: "status_at_gp", label: "Status at G.P." },
                      { key: "volume_no", label: "Volume No." },
                      { key: "date_published", label: "Date Published" },
                    ].map((c) => (
                      <th
                        key={c.key}
                        onClick={() => requestSort(c.key)}
                        className={`px-3 py-2 border cursor-pointer text-left ${
                          c.sticky ? "sticky left-0 bg-blue-600 z-20" : ""
                        }`}
                      >
                        {c.label}{" "}
                        {sortConfig.key === c.key ? (sortConfig.dir === "asc" ? "▲" : "▼") : ""}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paged.map((r, i) => (
                    <tr key={r.id ?? `${date}-${i}`} className={i % 2 ? "bg-gray-50" : "bg-white"}>
                      <td className="px-3 py-2 border sticky left-0 bg-white font-medium">
                        {i + 1 + (page - 1) * ROWS_PER_PAGE}
                      </td>
                      <td className="px-3 py-2 border">{renderCell(r.court_station)}</td>
                      <td className="px-3 py-2 border">{renderCell(r.cause_no)}</td>
                      <td className="px-3 py-2 border">{renderCell(r.name_of_deceased)}</td>
                      <td className="px-3 py-2 border">{renderCell(r.status_at_gp)}</td>
                      <td className="px-3 py-2 border">{renderCell(r.volume_no)}</td>
                      <td className="px-3 py-2 border">{renderCell(r.date_published)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPagePerDate((p) => ({ ...p, [date]: page - 1 }))}
                    className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
                  >
                    Prev
                  </button>
                  {Array.from({ length: totalPages }, (_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setPagePerDate((p) => ({ ...p, [date]: idx + 1 }))}
                      className={`px-3 py-1 rounded ${
                        page === idx + 1 ? "bg-blue-600 text-white" : "bg-gray-100 hover:bg-gray-200"
                      }`}
                    >
                      {idx + 1}
                    </button>
                  ))}
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPagePerDate((p) => ({ ...p, [date]: page + 1 }))}
                    className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      );
    });
  }

  return (
    <div className="max-w-7xl mx-auto p-6 font-sans">
      <h2 className="text-3xl font-bold text-center mb-6">Gazette & Registry Matcher</h2>

      {/* Upload Form */}
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow space-y-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block font-medium mb-1">Gazette PDF</label>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Registry Excel</label>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setExcelFile(e.target.files?.[0] || null)}
              className="w-full border rounded px-3 py-2"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block font-medium mb-1">Matching Mode</label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="exact">Exact</option>
              <option value="tokens">Tokens</option>
              <option value="fuzzy">Fuzzy</option>
            </select>
          </div>
          <div>
            <label className="block font-medium mb-1">
              Threshold {mode === "fuzzy" ? `(${threshold.toFixed(2)})` : ""}
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
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Processing..." : "Start Matching"}
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="px-4 py-2 rounded border border-red-600 text-red-600 hover:bg-red-50"
            >
              Clear DB
            </button>
          </div>
        </div>

        {loading && (
          <div className="h-2 bg-gray-200 rounded overflow-hidden">
            <div className="bg-blue-600 h-2 transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}
        {stats && (
          <div className="bg-blue-50 p-3 rounded border border-blue-200 space-y-1 text-sm">
            <p>
              <b>Mode:</b> {stats.mode} <b>Threshold:</b> {stats.threshold}
            </p>
            <p>
              <b>Gazette:</b> {stats.totalGazette} <b>Excel:</b> {stats.totalExcel}
            </p>
            <p>
              <b>Matched:</b> {stats.matchedCount} <b>Inserted:</b> {stats.insertedCount}
            </p>
          </div>
        )}
        {error && <p className="bg-red-100 text-red-700 p-2 rounded">{error}</p>}
      </form>

      {/* Search + Export */}
      <div className="mt-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <input
          placeholder="Search matches..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full md:w-1/3 border rounded px-3 py-2"
        />
        {matches.length > 0 && (
          <CSVLink
            data={filteredMatches}
            filename={`matches_${Date.now()}.csv`}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Export CSV
          </CSVLink>
        )}
      </div>

      {/* Results Table */}
      {renderTable()}
    </div>
  );
}
