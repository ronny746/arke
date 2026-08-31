"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { adminAPI } from '@/api/index.js';
import { PageHeader } from '@/components/layout/index.jsx';
import { Card } from '@/components/ui/index.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { Folder, FolderOpen, FileText, ChevronRight, Upload, Plus, Trash2, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

export default function QuestionBanks() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  
  const [subjects, setSubjects] = useState([]);
  const [hierarchy, setHierarchy] = useState([]);
  const [topicQuestions, setTopicQuestions] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  
  const [activeTab, setActiveTab] = useState('SUBJECT_FOLDERS'); // 'SUBJECT_FOLDERS' | 'FULL_PAPERS'
  const [fullPapers, setFullPapers] = useState([]);
  const [loadingFullPapers, setLoadingFullPapers] = useState(false);

  const [fullPaperPath, setFullPaperPath] = useState([]); // Level 0: [], Level 1: [paperId], Level 2: [paperId, subjectName]
  const [fullPaperData, setFullPaperData] = useState(null);
  
  // path can be: 
  // [] (Root / Subjects)
  // [{ type: 'SUBJECT', id: 'sId', name: 'Physics', ref: subjectNode }]
  // [{ type: 'SUBJECT', ... }, { type: 'CHAPTER', id: 'cId', name: 'Kinematics', ref: chapterNode }]
  // [{ type: 'SUBJECT', ... }, { type: 'CHAPTER', ... }, { type: 'TOPIC', id: 'tId', name: 'Velocity', ref: topicNode }]
  const [path, setPath] = useState([]);

  useEffect(() => {
    fetchData();
    fetchFullPapers();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [catRes, hierRes] = await Promise.all([
        adminAPI.getQuestionCategories(),
        adminAPI.getQuestionBankHierarchy()
      ]);
      setSubjects(catRes.data?.data || []);
      setHierarchy(hierRes.data?.data || []);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchFullPapers = async () => {
    try {
      setLoadingFullPapers(true);
      const res = await adminAPI.getQuestionBanks({ type: 'FULL_PAPER' });
      setFullPapers(res.data?.data || []);
    } catch (error) {
      toast.error('Failed to load full papers');
    } finally {
      setLoadingFullPapers(false);
    }
  };

  const handleFullPaperClick = async (paper) => {
    try {
      const res = await adminAPI.getQuestionBankById(paper._id);
      const data = res.data?.data;
      if (data) {
        setFullPaperData(data);
        setFullPaperPath([paper]); // Level 1
      }
    } catch (err) {
      toast.error('Failed to load full paper details');
    }
  };

  const handleCreateSubject = async () => {
    const name = window.prompt("Enter new Subject name:");
    if (!name) return;
    try {
      await adminAPI.createQuestionCategory({ name });
      toast.success("Subject created!");
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create subject");
    }
  };

  const handleCreateFullPaper = async () => {
    const name = window.prompt("Enter new Full Paper name (e.g. JEE Mock Test 1):");
    if (!name) return;
    try {
      await adminAPI.createQuestionBank({ title: name, bankType: 'FULL_PAPER', description: '', questions: [] });
      toast.success("Full Paper Folder created!");
      fetchFullPapers();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create full paper");
    }
  };

  const handleDeleteSubject = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this Subject? This might leave orphaned questions.")) return;
    try {
      await adminAPI.deleteQuestionCategory(id);
      toast.success("Subject deleted!");
      fetchData();
    } catch (err) {
      toast.error("Failed to delete");
    }
  };

  const navigateTo = (levelData) => {
    setPath([...path, levelData]);
  };

  useEffect(() => {
    if (path.length === 3) { // Inside a topic
      fetchTopicQuestions();
    }
  }, [path]);

  const fetchTopicQuestions = async () => {
    if (path.length !== 3) return;
    try {
      setLoadingQuestions(true);
      const res = await adminAPI.getQuestionsByHierarchy({
        subject: path[0].id,
        chapter: path[1].id,
        topic: path[2].id
      });
      setTopicQuestions(res.data?.data || []);
    } catch (err) {
      toast.error('Failed to load questions');
    } finally {
      setLoadingQuestions(false);
    }
  };

  const goBack = () => {
    setPath(path.slice(0, -1));
  };

  const navigateToCrumb = (index) => {
    setPath(path.slice(0, index + 1));
  };

  // View Renderers
  const renderRoot = () => {
    // Merge subjects from API with hierarchy stats
    const displaySubjects = subjects.map(sub => {
      const hNode = hierarchy.find(h => h._id === sub._id);
      return {
        ...sub,
        count: hNode ? hNode.count : 0,
        difficulties: hNode ? hNode.difficulties : { Easy: 0, Medium: 0, Hard: 0 },
        hNode
      };
    });

    return (
      <div className="space-y-6">
        {fullPaperPath.length === 0 && (
          <div className="flex bg-gray-100 p-1 rounded-lg w-fit mb-6">
            <button
              className={`px-6 py-2 rounded-md font-medium text-sm transition-all ${
                activeTab === 'SUBJECT_FOLDERS'
                  ? 'bg-white shadow text-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('SUBJECT_FOLDERS')}
            >
              Subject Folders
            </button>
            <button
              className={`px-6 py-2 rounded-md font-medium text-sm transition-all ${
                activeTab === 'FULL_PAPERS'
                  ? 'bg-white shadow text-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('FULL_PAPERS')}
            >
              Full Papers
            </button>
          </div>
        )}

        {activeTab === 'SUBJECT_FOLDERS' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {displaySubjects.map(sub => (
              <Card 
                key={sub._id} 
                className={`p-4 cursor-pointer hover:shadow-md transition-all group border-l-4 ${sub.count === 0 ? 'border-l-gray-300 opacity-70' : 'border-l-primary-500'}`}
                onClick={() => navigateTo({ type: 'SUBJECT', id: sub._id, name: sub.name, ref: sub.hNode })}
              >
                <div className="flex justify-between items-start mb-2">
                  <Folder className={`w-8 h-8 ${sub.count === 0 ? 'text-gray-400' : 'text-primary-500'}`} />
                  <button 
                    onClick={(e) => handleDeleteSubject(e, sub._id)}
                    className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete empty/unwanted folder"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <h3 className="font-bold text-lg text-gray-800 line-clamp-1">{sub.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{sub.count} Questions</p>
                {sub.count > 0 && (
                  <div className="flex gap-2 mt-3 text-xs font-semibold">
                    {sub.difficulties.Easy > 0 && <span className="text-success-600 bg-success-50 px-2 py-0.5 rounded">E: {sub.difficulties.Easy}</span>}
                    {sub.difficulties.Medium > 0 && <span className="text-warning-600 bg-warning-50 px-2 py-0.5 rounded">M: {sub.difficulties.Medium}</span>}
                    {sub.difficulties.Hard > 0 && <span className="text-error-600 bg-error-50 px-2 py-0.5 rounded">H: {sub.difficulties.Hard}</span>}
                  </div>
                )}
              </Card>
            ))}
            <div 
              onClick={handleCreateSubject}
              className="border-2 border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-primary-600 hover:border-primary-300 cursor-pointer transition-colors min-h-[120px]"
            >
              <Plus className="w-8 h-8 mb-2" />
              <span className="font-medium">Create Subject Folder</span>
            </div>
          </div>
        ) : (
          renderFullPapersTab()
        )}
      </div>
    );
  };

  const renderFullPapersTab = () => {
    if (fullPaperPath.length === 0) {
      return (
        <div className="space-y-4">
          {loadingFullPapers ? (
            <p className="text-gray-500">Loading full papers...</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {fullPapers.map(paper => (
                <Card 
                  key={paper._id} 
                  className="p-4 border-l-4 border-l-blue-500 relative group cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleFullPaperClick(paper)}
                >
                  <button 
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (!window.confirm("Are you sure you want to delete this Full Paper? This will remove all its questions.")) return;
                      try {
                        await adminAPI.deleteQuestionBank(paper._id);
                        toast.success("Full Paper deleted!");
                        fetchFullPapers();
                      } catch (err) {
                        toast.error("Failed to delete paper");
                      }
                    }}
                    className="absolute top-4 right-4 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="flex items-center space-x-2 mb-2">
                    <Folder className="w-6 h-6 text-blue-500" />
                    <h3 className="font-bold text-lg text-gray-800 pr-6 truncate">{paper.title}</h3>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">{paper.totalQuestions} Questions</p>
                  <p className="text-sm text-gray-500 mt-1">{paper.totalMarks} Total Marks</p>
                  <p className="text-xs text-gray-400 mt-3">Uploaded on: {new Date(paper.createdAt).toLocaleDateString()}</p>
                </Card>
              ))}
              <div 
                onClick={handleCreateFullPaper}
                className="border-2 border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-blue-600 hover:border-blue-300 cursor-pointer transition-colors min-h-[120px]"
              >
                <Plus className="w-8 h-8 mb-2" />
                <span className="font-medium">Create Full Paper Folder</span>
              </div>
            </div>
          )}
        </div>
      );
    }

    if (fullPaperPath.length === 1 && fullPaperData) {
      // Level 1: List subjects in the full paper
      const questions = fullPaperData.questions || [];
      const subjectsMap = {};
      questions.forEach(q => {
        const sName = q.subjectName || 'General';
        if (!subjectsMap[sName]) subjectsMap[sName] = { name: sName, count: 0, marks: 0 };
        subjectsMap[sName].count += 1;
        subjectsMap[sName].marks += Number(q.marks) || 0;
      });
      const paperSubjects = Object.values(subjectsMap);

      return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {paperSubjects.map((sub: any) => (
              <Card 
                key={sub.name} 
                className="p-4 cursor-pointer hover:shadow-md transition-all border-l-4 border-l-blue-400"
                onClick={() => setFullPaperPath([fullPaperPath[0], sub.name])}
              >
                <Folder className="w-8 h-8 text-blue-400 mb-2" />
                <h3 className="font-bold text-lg text-gray-800 line-clamp-1">{sub.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{sub.count} Questions</p>
                <p className="text-sm text-gray-500">{sub.marks} Marks</p>
              </Card>
            ))}
          </div>
        </div>
      );
    }

    if (fullPaperPath.length === 2 && fullPaperData) {
      // Level 2: List questions for the subject
      const subjectName = fullPaperPath[1];
      const questions = (fullPaperData.questions || []).filter(q => (q.subjectName || 'General') === subjectName);

      return (
        <div className="space-y-4">
          <div className="grid gap-4">
            {questions.map((q, idx) => (
              <Card key={idx} className="p-4 flex flex-col space-y-3 relative group">
                <div className="flex justify-between items-start">
                  <div className="flex gap-2">
                    <span className="font-bold text-gray-700 w-8">Q{idx + 1}.</span>
                    <div className="text-gray-900 font-medium overflow-x-auto" dangerouslySetInnerHTML={{ __html: q.questionText }} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs pl-10">
                  <span className="px-2.5 py-0.5 rounded-full bg-primary-50 text-primary-700 border border-primary-100 font-medium">
                    Topic: {q.topic?.name || q.topicName || 'General'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-gray-50 text-gray-700 border border-gray-200 font-medium">
                    Marks: {q.marks || 0} | Neg: {q.negativeMarks || 0}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full border font-medium ${
                    (q.difficulty || 'Medium') === 'Easy' ? 'bg-success-50 text-success-700 border-success-100' :
                    (q.difficulty || 'Medium') === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                    'bg-rose-50 text-rose-700 border-rose-100'
                  }`}>
                    Difficulty: {q.difficulty || 'Medium'}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-10 mt-3">
                  {q.options?.map((opt, oIdx) => (
                    <div key={oIdx} className={`p-3 rounded-lg border ${opt.isCorrect ? 'bg-success-50 border-success-200' : 'bg-white border-gray-200'}`}>
                      <div className="flex items-center">
                        <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold mr-3 ${opt.isCorrect ? 'bg-success-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                          {String.fromCharCode(65 + oIdx)}
                        </span>
                        <div className="overflow-x-auto" dangerouslySetInnerHTML={{ __html: opt.text }} />
                      </div>
                    </div>
                  ))}
                </div>
                
                {q.explanation && (
                  <div className="ml-10 mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                    <p className="text-sm font-semibold text-blue-900 mb-1">Explanation:</p>
                    <div className="text-sm text-blue-800" dangerouslySetInnerHTML={{ __html: q.explanation }} />
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      );
    }

    return null;
  };


  const renderChapters = (subjectNode) => {
    if (!subjectNode || !subjectNode.chapters || subjectNode.chapters.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500">
          <FolderOpen className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p>No chapters found in this subject.</p>
          <p className="text-sm">Click "Upload Questions" to import a document.</p>
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {subjectNode.chapters.map(ch => (
          <Card 
            key={ch._id} 
            className="p-4 cursor-pointer hover:shadow-md transition-all border-l-4 border-l-blue-400"
            onClick={() => navigateTo({ type: 'CHAPTER', id: ch._id, name: ch.name, ref: ch })}
          >
            <Folder className="w-8 h-8 text-blue-400 mb-2" />
            <h3 className="font-bold text-gray-800 line-clamp-1">{ch.name}</h3>
            <p className="text-sm text-gray-500 mt-1">{ch.count} Questions</p>
            {ch.count > 0 && (
              <div className="flex gap-2 mt-3 text-xs font-semibold">
                {ch.difficulties.Easy > 0 && <span className="text-success-600 bg-success-50 px-2 py-0.5 rounded">E: {ch.difficulties.Easy}</span>}
                {ch.difficulties.Medium > 0 && <span className="text-warning-600 bg-warning-50 px-2 py-0.5 rounded">M: {ch.difficulties.Medium}</span>}
                {ch.difficulties.Hard > 0 && <span className="text-error-600 bg-error-50 px-2 py-0.5 rounded">H: {ch.difficulties.Hard}</span>}
              </div>
            )}
          </Card>
        ))}
      </div>
    );
  };

  const renderTopics = (chapterNode) => {
    if (!chapterNode || !chapterNode.topics || chapterNode.topics.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500">
          <FolderOpen className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p>No topics found in this chapter.</p>
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {chapterNode.topics.map(t => (
          <Card 
            key={t._id} 
            className="p-4 cursor-pointer hover:shadow-md transition-all border-l-4 border-l-purple-400"
            onClick={() => navigateTo({ type: 'TOPIC', id: t._id, name: t.name, ref: t })}
          >
            <Folder className="w-8 h-8 text-purple-400 mb-2" />
            <h3 className="font-bold text-gray-800 line-clamp-1">{t.name}</h3>
            <p className="text-sm text-gray-500 mt-1">{t.count} Questions</p>
            {t.count > 0 && (
              <div className="flex gap-2 mt-3 text-xs font-semibold">
                {t.difficulties.Easy > 0 && <span className="text-success-600 bg-success-50 px-2 py-0.5 rounded">E: {t.difficulties.Easy}</span>}
                {t.difficulties.Medium > 0 && <span className="text-warning-600 bg-warning-50 px-2 py-0.5 rounded">M: {t.difficulties.Medium}</span>}
                {t.difficulties.Hard > 0 && <span className="text-error-600 bg-error-50 px-2 py-0.5 rounded">H: {t.difficulties.Hard}</span>}
              </div>
            )}
          </Card>
        ))}
      </div>
    );
  };

  const renderQuestions = (topicId) => {
    if (loadingQuestions) {
      return (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      );
    }

    if (topicQuestions.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500">
          <FileText className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p>No questions found in this topic.</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {topicQuestions.map((q, idx) => (
          <Card key={q._id || idx} className="p-4 border border-gray-100 hover:shadow-sm transition-shadow">
            <div className="flex justify-between items-start mb-2">
              <span className="font-semibold text-gray-500 text-sm">Q{idx + 1}.</span>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded font-semibold ${
                  q.difficulty === 'Easy' ? 'bg-success-50 text-success-600' :
                  q.difficulty === 'Hard' ? 'bg-error-50 text-error-600' :
                  'bg-warning-50 text-warning-600'
                }`}>
                  {q.difficulty}
                </span>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded font-semibold">
                  {q.marks} Marks
                </span>
              </div>
            </div>
            
            <div className="text-gray-800 font-medium mb-4" dangerouslySetInnerHTML={{ __html: q.questionText }} />
            
            <div className="space-y-2 pl-6">
              {q.options?.map((opt, oIdx) => (
                <div key={oIdx} className={`p-2 rounded border ${opt.isCorrect ? 'border-success-500 bg-success-50 text-success-800 font-medium' : 'border-gray-200 text-gray-600'}`}>
                  <div dangerouslySetInnerHTML={{ __html: opt.text }} />
                </div>
              ))}
            </div>

            {q.explanation && (
              <div className="mt-4 p-3 bg-blue-50 text-blue-800 text-sm rounded border border-blue-100">
                <strong>Solution:</strong>
                <div dangerouslySetInnerHTML={{ __html: q.explanation }} className="mt-1" />
              </div>
            )}
          </Card>
        ))}
      </div>
    );
  };

  const currentLevel = path.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Question Banks"
        description="Organize questions by Subject, Chapter, and Topic."
        actions={
          <div className="flex gap-2">
            <a href="/sample-template.docx" download>
              <Button variant="secondary" icon={FileText}>Sample Format</Button>
            </a>
            {activeTab === 'SUBJECT_FOLDERS' && currentLevel > 0 && (
              <Button 
                icon={Upload} 
                onClick={() => router.push(`/admin/question-banks/create?subjectId=${path[0].id}`)}
              >
                Upload Questions Here
              </Button>
            )}

            {activeTab === 'FULL_PAPERS' && fullPaperPath.length > 0 && (
              <Button 
                icon={Upload} 
                onClick={() => router.push(`/admin/question-banks/${fullPaperPath[0]._id}/edit?tab=FULL_PAPERS`)}
              >
                Upload Questions Here
              </Button>
            )}
          </div>
        }
      />

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        {/* Breadcrumbs */}
        <div className="flex items-center text-sm mb-6 pb-4 border-b">
          {activeTab === 'SUBJECT_FOLDERS' ? (
            <>
              <button 
                onClick={() => setPath([])}
                className={`flex items-center ${currentLevel === 0 ? 'font-bold text-primary-700' : 'text-gray-500 hover:text-primary-600'}`}
              >
                Subjects
              </button>
              
              {path.map((crumb, idx) => (
                <div key={crumb.id} className="flex items-center">
                  <ChevronRight className="w-4 h-4 mx-2 text-gray-400" />
                  <button 
                    onClick={() => navigateToCrumb(idx)}
                    className={`${idx === path.length - 1 ? 'font-bold text-primary-700' : 'text-gray-500 hover:text-primary-600'}`}
                  >
                    {crumb.name}
                  </button>
                </div>
              ))}
            </>
          ) : (
            <>
              <button 
                onClick={() => setFullPaperPath([])}
                className={`flex items-center ${fullPaperPath.length === 0 ? 'font-bold text-primary-700' : 'text-gray-500 hover:text-primary-600'}`}
              >
                Full Papers
              </button>
              
              {fullPaperPath.map((crumb, idx) => (
                <div key={idx} className="flex items-center">
                  <ChevronRight className="w-4 h-4 mx-2 text-gray-400" />
                  <button 
                    onClick={() => setFullPaperPath(fullPaperPath.slice(0, idx + 1))}
                    className={`${idx === fullPaperPath.length - 1 ? 'font-bold text-primary-700' : 'text-gray-500 hover:text-primary-600'}`}
                  >
                    {idx === 0 ? crumb.title : crumb}
                  </button>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Content Renderers */}
        {loading ? (
          <div className="py-12 text-center text-gray-500">Loading folders...</div>
        ) : (
          <div className="min-h-[400px]">
            {currentLevel === 0 && renderRoot()}
            {currentLevel === 1 && renderChapters(path[0].ref)}
            {currentLevel === 2 && renderTopics(path[1].ref)}
            {currentLevel === 3 && renderQuestions(path[2].id)}
          </div>
        )}
      </div>
    </div>
  );
}
