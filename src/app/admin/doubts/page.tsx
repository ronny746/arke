"use client";

import { useState, useEffect } from "react";
import { MessageSquare, CheckCircle, Clock, BarChart3, Search, X, Paperclip } from "lucide-react";

export default function AdminDoubtsPage() {
  const [stats, setStats] = useState<any>(null);
  const [doubts, setDoubts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBatch, setFilterBatch] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [selectedDoubt, setSelectedDoubt] = useState<any>(null);
  
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/v1/doubts/admin/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setStats(data.data.stats);
        setDoubts(data.data.doubts);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDoubts = doubts.filter((d: any) => {
    const matchesSearch = 
      d.question.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (d.studentId?.firstName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.studentId?.lastName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.teacherId?.firstName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.teacherId?.lastName || "").toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesBatch = filterBatch === "ALL" || d.batchId?._id === filterBatch;
    const matchesStatus = filterStatus === "ALL" || d.status === filterStatus;
    
    return matchesSearch && matchesBatch && matchesStatus;
  });

  const renderAttachment = (url: string, idx: number) => {
    const isAudio = url.match(/\.(mp3|wav|ogg|m4a|webm)$/i);
    const isVideo = url.match(/\.(mp4|mkv|mov)$/i);
    const isImage = url.match(/\.(jpeg|jpg|gif|png|webp)$/i);
    if (isAudio) return <audio key={idx} src={url} controls className="h-9 w-56 rounded-full border border-gray-200 shadow-sm" />;
    if (isVideo) return <div key={idx} className="rounded-xl overflow-hidden border border-gray-200 bg-black w-48 h-28"><video src={url} controls className="w-full h-full object-contain" /></div>;
    return (
      <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="block w-20 h-20 rounded-xl overflow-hidden border border-gray-200 hover:opacity-90 flex-shrink-0 bg-gray-50">
        {isImage ? <img src={url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Paperclip size={16} className="text-gray-400" /></div>}
      </a>
    );
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading doubts monitor...</div>;
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600">
          <BarChart3 size={20} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Doubts Monitor</h1>
          <p className="text-gray-500 text-xs">Overview of all student doubts, status, and resolution times across batches.</p>
        </div>
      </div>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 flex-shrink-0">
            <MessageSquare size={18} />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Total Doubts</p>
            <h2 className="text-2xl font-black text-gray-900">{stats?.total || 0}</h2>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 flex-shrink-0">
            <Clock size={18} />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Pending Resolution</p>
            <h2 className="text-2xl font-black text-gray-900">{stats?.pending || 0}</h2>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-500 flex-shrink-0">
            <CheckCircle size={18} />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Resolved Doubts</p>
            <h2 className="text-2xl font-black text-gray-900">{stats?.resolved || 0}</h2>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">
        {/* Sidebar: Batch Breakdown */}
        <div className="xl:col-span-1">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <h3 className="font-bold text-gray-900 text-sm mb-3">Doubts by Batch</h3>
            {!stats?.byBatch?.length ? (
              <p className="text-sm text-gray-400">No data available.</p>
            ) : (
              <div className="space-y-2">
                {stats?.byBatch?.map((b: any) => (
                  <div key={b.batchName} className="p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                    <p className="font-bold text-xs text-gray-800 truncate mb-1.5">{b.batchName} {b.batchSection ? `- ${b.batchSection}` : ''}</p>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500">Total: <span className="font-bold text-gray-900">{b.total}</span></span>
                      <div className="flex gap-1.5">
                        <span className="text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-md font-bold">{b.pending}</span>
                        <span className="text-green-600 bg-green-100 px-1.5 py-0.5 rounded-md font-bold">{b.resolved}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main List */}
        <div className="xl:col-span-3">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row gap-3 items-center justify-between">
              <h3 className="font-bold text-gray-900 text-sm">All Doubts Log</h3>
              <div className="flex flex-wrap gap-2 w-full md:w-auto">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  <input 
                    type="text" 
                    placeholder="Search query/names..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none w-52 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                  />
                </div>
                <select 
                  value={filterBatch} 
                  onChange={e => setFilterBatch(e.target.value)}
                  className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                >
                  <option value="ALL">All Batches</option>
                  {stats?.byBatch?.map((b: any) => (
                    <option key={b._id} value={b._id}>{b.batchName}</option>
                  ))}
                </select>
                <select 
                  value={filterStatus} 
                  onChange={e => setFilterStatus(e.target.value)}
                  className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                >
                  <option value="ALL">All Status</option>
                  <option value="PENDING">Pending</option>
                  <option value="RESOLVED">Resolved</option>
                </select>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs font-semibold">
                  <tr>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Assigned To</th>
                    <th className="px-4 py-3">Batch</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredDoubts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-gray-400 text-sm">No doubts found matching the criteria.</td>
                    </tr>
                  ) : (
                    filteredDoubts.map((d: any) => (
                      <tr key={d._id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center text-xs font-black text-blue-700 flex-shrink-0">
                              {d.studentId?.firstName?.charAt(0) || 'S'}
                            </div>
                            <span className="font-medium text-gray-800 text-xs">{d.studentId?.firstName} {d.studentId?.lastName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{d.teacherId?.firstName} {d.teacherId?.lastName || <span className="text-gray-400 italic">Unassigned</span>}</td>
                        <td className="px-4 py-3">
                          <span className="inline-block bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md text-xs font-medium">
                            {d.batchId?.name} {d.batchId?.section ? `- ${d.batchId.section}` : ''}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{new Date(d.createdAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          {d.status === 'RESOLVED' ? (
                            <span className="inline-flex items-center gap-1 text-green-600 font-bold text-xs">
                              <CheckCircle size={12} /> Resolved
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-amber-500 font-bold text-xs">
                              <Clock size={12} /> Pending
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setSelectedDoubt(d)}
                            className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs rounded-lg transition-colors border border-purple-200/60"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Doubt Detail Modal */}
      {selectedDoubt && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedDoubt(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center text-sm font-black text-blue-700">
                  {selectedDoubt.studentId?.firstName?.charAt(0) || 'S'}
                </div>
                <div>
                  <p className="font-bold text-gray-900">{selectedDoubt.studentId?.firstName} {selectedDoubt.studentId?.lastName}</p>
                  <p className="text-xs text-gray-500">{selectedDoubt.batchId?.name} {selectedDoubt.batchId?.section ? `• ${selectedDoubt.batchId.section}` : ''} · {new Date(selectedDoubt.createdAt).toLocaleDateString()} at {new Date(selectedDoubt.createdAt).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {selectedDoubt.status === 'RESOLVED' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200">
                    <CheckCircle size={12} /> Resolved
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    <Clock size={12} /> Pending
                  </span>
                )}
                <button
                  onClick={() => setSelectedDoubt(null)}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                >
                  <X size={16} className="text-gray-600" />
                </button>
              </div>
            </div>

            {/* Question */}
            <div className="p-6">
              <div className="mb-5">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Student's Question</h4>
                <div
                  className="text-gray-800 text-sm prose prose-sm max-w-none prose-p:my-1"
                  dangerouslySetInnerHTML={{ __html: selectedDoubt.question }}
                />
                {selectedDoubt.attachments?.length > 0 && (
                  <div className="flex flex-wrap items-center gap-3 mt-4">
                    {selectedDoubt.attachments.map((url: string, idx: number) => renderAttachment(url, idx))}
                  </div>
                )}
              </div>

              {/* Solution */}
              {selectedDoubt.status === 'RESOLVED' && (
                <div className="bg-gradient-to-br from-green-50/60 to-emerald-50/30 rounded-2xl p-5 border border-green-100">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-full bg-green-200 flex items-center justify-center text-xs font-black text-green-800">
                      {selectedDoubt.teacherId?.firstName?.charAt(0) || 'T'}
                    </div>
                    <span className="text-xs font-black text-green-800 uppercase tracking-wider">Solution by {selectedDoubt.teacherId?.firstName} {selectedDoubt.teacherId?.lastName}</span>
                  </div>
                  <div
                    className="text-green-900 text-sm prose prose-sm prose-green max-w-none prose-p:my-1"
                    dangerouslySetInnerHTML={{ __html: selectedDoubt.solution }}
                  />
                  {selectedDoubt.solutionAttachments?.length > 0 && (
                    <div className="flex flex-wrap items-center gap-3 mt-4">
                      {selectedDoubt.solutionAttachments.map((url: string, idx: number) => renderAttachment(url, idx))}
                    </div>
                  )}
                </div>
              )}

              {selectedDoubt.status === 'PENDING' && (
                <div className="bg-amber-50/60 rounded-2xl p-5 border border-amber-100 text-center">
                  <Clock size={24} className="text-amber-400 mx-auto mb-2" />
                  <p className="text-sm font-bold text-amber-700">Awaiting teacher response</p>
                  <p className="text-xs text-amber-600 mt-1">Assigned to {selectedDoubt.teacherId?.firstName || 'a teacher'}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
