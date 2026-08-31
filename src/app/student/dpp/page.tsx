"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Play, Clock, CheckCircle, Plus } from 'lucide-react';
import { PageHeader } from '@/components/layout/index.jsx';
import { Card } from '@/components/ui/index.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { studentAPI } from '@/api/index.js';
import toast from 'react-hot-toast';

export default function StudentDPP() {
  const router = useRouter();
  const [filters, setFilters] = useState([]);
  const [counts, setCounts] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Generator State
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedChapter, setSelectedChapter] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [numberOfQuestions, setNumberOfQuestions] = useState<number | ''>('');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [filtersRes, historyRes] = await Promise.all([
        studentAPI.getPracticeFilters(),
        studentAPI.getPracticeHistory({ sessionType: 'DPP' })
      ]);
      setFilters(filtersRes.data.data || []);
      setCounts(filtersRes.data.counts || []);
      setHistory(historyRes.data.data || []);
    } catch (error) {
      toast.error('Failed to load DPP data');
    } finally {
      setLoading(false);
    }
  };

  const activeSubjectObj = filters.find(f => f.subject === selectedSubject);
  const availableChapters = activeSubjectObj?.chapters || [];
  const activeChapterObj = availableChapters.find(c => c.chapter === selectedChapter);
  
  // If chapter is selected, show its topics. Else show all topics for subject.
  const availableTopics = selectedChapter 
    ? (activeChapterObj ? activeChapterObj.topics : [])
    : (activeSubjectObj ? activeSubjectObj.topics : []);

  // Calculate available questions based on selection
  const getAvailableQuestions = () => {
    let filtered = counts;
    if (selectedSubject) filtered = filtered.filter(c => c.subject === selectedSubject);
    if (selectedChapter) filtered = filtered.filter(c => c.chapter === selectedChapter);
    if (selectedTopic) filtered = filtered.filter(c => c.topic === selectedTopic);
    if (selectedDifficulty) filtered = filtered.filter(c => c.difficulty === selectedDifficulty);
    return filtered.reduce((sum, c) => sum + c.count, 0);
  };

  const availableCount = getAvailableQuestions();

  const handleGenerate = async () => {
    if (!numberOfQuestions || numberOfQuestions < 1 || numberOfQuestions > Math.min(30, availableCount)) {
      toast.error(`Number of questions must be between 1 and ${Math.min(30, availableCount)}`);
      return;
    }
    try {
      setGenerating(true);
      const res = await studentAPI.generatePracticeSession({
        sessionType: 'DPP',
        subject: selectedSubject,
        chapter: selectedChapter,
        topic: selectedTopic,
        difficulty: selectedDifficulty,
        numberOfQuestions
      });
      
      if (res.data.success) {
        toast.success('DPP Generated Successfully!');
        router.push(`/student/dpp/${res.data.data._id}/play`);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to generate DPP. Try broader criteria.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in p-6">
      <PageHeader
        title="Daily Practice Problems (DPP)"
        subtitle="Generate custom mini-tests for your self-study"
        breadcrumbs={['Home', 'DPP']}
      />

      {loading ? (
        <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>
      ) : (
        <div className="flex flex-col">
          
          {/* Generator Form */}
          <Card className="p-6 mb-8 border-primary-100 bg-gradient-to-br from-primary-50/30 to-white shadow-sm rounded-2xl">
            <h3 className="font-bold text-lg mb-4 text-gray-800 flex items-center"><Plus className="w-5 h-5 mr-2 text-primary-600"/> Generate New DPP</h3>
            <div className="flex flex-col md:flex-row md:items-end gap-4">
              
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Subject</label>
                <select 
                  className="w-full p-2.5 border border-gray-200 rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-primary-500 transition-all outline-none"
                  value={selectedSubject}
                  onChange={(e) => { setSelectedSubject(e.target.value); setSelectedChapter(''); setSelectedTopic(''); }}
                >
                  <option value="">Any Subject</option>
                  {filters.map(f => (
                    <option key={f.subject} value={f.subject}>{f.subject}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Chapter</label>
                <select 
                  className="w-full p-2.5 border border-gray-200 rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-primary-500 transition-all outline-none"
                  value={selectedChapter}
                  onChange={(e) => { setSelectedChapter(e.target.value); setSelectedTopic(''); }}
                  disabled={!selectedSubject || availableChapters.length === 0}
                >
                  <option value="">Any Chapter</option>
                  {availableChapters.map(c => (
                    <option key={c.chapter} value={c.chapter}>{c.chapter}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Topic</label>
                <select 
                  className="w-full p-2.5 border border-gray-200 rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-primary-500 transition-all outline-none"
                  value={selectedTopic}
                  onChange={(e) => setSelectedTopic(e.target.value)}
                  disabled={!selectedSubject || availableTopics.length === 0}
                >
                  <option value="">Any Topic</option>
                  {availableTopics.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Difficulty</label>
                <select 
                  className="w-full p-2.5 border border-gray-200 rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-primary-500 transition-all outline-none"
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(e.target.value)}
                >
                  <option value="">Any Difficulty</option>
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>

              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-700 mb-1 flex justify-between">
                  <span>Questions</span>
                  <span className="text-primary-600 text-xs font-bold">Max {Math.min(30, availableCount)}</span>
                </label>
                <input 
                  type="number" 
                  min="1" max={Math.min(30, availableCount)}
                  className="w-full p-2.5 border border-gray-200 rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-primary-500 transition-all outline-none"
                  value={numberOfQuestions}
                  placeholder="e.g. 10"
                  onChange={(e) => setNumberOfQuestions(parseInt(e.target.value) || '')}
                />
              </div>
              
              <div className="flex-shrink-0 w-full md:w-auto">
                <Button 
                  onClick={handleGenerate} 
                  disabled={generating || availableCount === 0}
                  className="w-full md:w-32 h-[46px] rounded-xl shadow-md hover:shadow-lg transition-all"
                >
                  {generating ? 'Generating...' : 'Start DPP'}
                </Button>
              </div>

            </div>
          </Card>

          {/* History List */}
          <div className="space-y-4">
            <h3 className="font-bold text-xl text-gray-900 border-b pb-2">Your DPP History</h3>
            
            {history.length === 0 ? (
              <div className="text-center p-12 bg-gray-50 rounded-2xl border border-gray-100 text-gray-500 shadow-sm">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Play className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-lg font-medium text-gray-700">You haven't generated any DPPs yet.</p>
                <p className="text-sm mt-1">Select your subjects above and start practicing!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {history.map(session => (
                  <Card key={session._id} className="p-5 hover:shadow-md transition-all hover:border-primary-300 rounded-2xl bg-white border border-gray-100">
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-bold text-gray-900 text-lg leading-tight">{session.title}</h4>
                      {session.status === 'COMPLETED' ? (
                        <span className="text-xs bg-success-50 text-success-700 px-3 py-1 rounded-full font-bold border border-success-200 shadow-sm">Completed</span>
                      ) : (
                        <span className="text-xs bg-warning-50 text-warning-700 px-3 py-1 rounded-full font-bold border border-warning-200 shadow-sm">In Progress</span>
                      )}
                    </div>
                    
                    <div className="text-sm text-gray-500 mb-5 space-y-2 bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <div className="flex justify-between">
                        <span className="font-medium">Total Questions:</span>
                        <span className="text-gray-900 font-bold">{session.totalQuestions}</span>
                      </div>
                      {session.filters?.topic && (
                        <div className="flex justify-between">
                          <span className="font-medium">Topic:</span>
                          <span className="text-gray-900 font-bold truncate max-w-[150px]" title={session.filters.topic}>{session.filters.topic}</span>
                        </div>
                      )}
                      {session.status === 'COMPLETED' && (
                        <div className="flex justify-between">
                          <span className="font-medium">Score:</span>
                          <span className="font-bold text-primary-600">{session.score} / {session.totalMarks}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-xs pt-1 border-t mt-1">
                        <span>Generated on:</span>
                        <span>{new Date(session.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                      </div>
                    </div>
                    
                    <Button 
                      variant={session.status === 'COMPLETED' ? 'outline' : 'primary'}
                      className="w-full text-sm font-semibold rounded-xl"
                      onClick={() => router.push(`/student/dpp/${session._id}/play`)}
                    >
                      {session.status === 'COMPLETED' ? 'View Results' : 'Resume DPP'}
                    </Button>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
